import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/**
 * Get multiple image URLs for a product SKU - ส่ง URL ทันทีโดยไม่ตรวจสอบ R2 (เร็ว)
 * Pattern: {SKU}-1.{ext}, {SKU}-2.{ext}, ... - ส่งหลายนามสกุลให้ frontend ลองโหลด
 */
function getProductImageUrls(sku: string | null | undefined, maxImages: number = 6): string[][] {
  if (!sku) return [];
  const publicBase = process.env.R2_PUBLIC_BASE;
  if (!publicBase) return [];
  const baseSku = sku.trim();
  const slots: string[][] = [];
  for (let i = 1; i <= maxImages; i++) {
    slots.push(IMAGE_EXTENSIONS.map((ext) => `${publicBase}/${baseSku}-${i}.${ext}`));
  }
  return slots;
}

/** ชื่อตารางเชื่อม variant ↔ attributevalue — กำหนดใน DB_VARIANT_ATTRIBUTE_TABLE ได้ (เฉพาะ a-z 0-9 _) */
function variantAttributeJoinTableName(): string {
  const raw = process.env.DB_VARIANT_ATTRIBUTE_TABLE || 'variantattributevalues';
  const safe = raw.replace(/[^a-zA-Z0-9_]/g, '');
  return safe || 'variantattributevalues';
}

type VariantAttrRow = {
  attributeId: number;
  nameTH: string;
  nameEN: string | null;
  valueTH: string;
  valueEN: string | null;
  valueCode: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // Fetch product with all variants, brand, and subcategory
    const query = `
      SELECT 
        p.productid,
        p.productnameth,
        p.productnameen,
        p.description,
        p.createddate,
        p.updateddate,
        b.brandnameth,
        b.brandnameen,
        sc.subcategorynameth,
        sc.subcategorynameen,
        sc.subcategoryid,
        c.categoryid,
        c.categorynameth,
        c.categorynameen
      FROM products p
      LEFT JOIN brands b ON p.brandid = b.brandid
      LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
      LEFT JOIN categories c ON sc.categoryid = c.categoryid
      WHERE p.productid = $1
    `;

    const productResult = await pool.query(query, [productId]);

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const row = productResult.rows[0];

    // Fetch all active variants for this product
    const variantsQuery = `
      SELECT variantid, sku, price, isactive
      FROM productvariants
      WHERE productid = $1 AND isactive = true
      ORDER BY price ASC
    `;
    const variantsResult = await pool.query(variantsQuery, [productId]);
    const variants = variantsResult.rows;

    // Fetch active discounts for variants (discounts.variantid)
    const variantIds = variants.map((v: { variantid: number }) => v.variantid);

    // คุณสมบัติจาก attributevalues + attributes ผ่านตารางเชื่อม (เช่น variantattributevalues)
    const variantAttrsByVariantId: Record<number, VariantAttrRow[]> = {};
    if (variantIds.length > 0) {
      const joinTable = variantAttributeJoinTableName();
      try {
        const attrSql = `
          SELECT DISTINCT ON (vav.variantid, a.attributeid)
            vav.variantid,
            a.attributeid,
            a.attributenameth,
            a.attributenameen,
            av.attributevalueth,
            av.attributevalueen,
            av.attributevaluecode
          FROM ${joinTable} vav
          INNER JOIN attributevalues av ON av.attributevalueid = vav.attributevalueid
          INNER JOIN attributes a ON a.attributeid = av.attributeid
          WHERE vav.variantid = ANY($1::int[])
          ORDER BY vav.variantid, a.attributeid, av.attributevalueid
        `;
        const attrResult = await pool.query(attrSql, [variantIds]);
        for (const r of attrResult.rows as {
          variantid: number;
          attributeid: number;
          attributenameth: string | null;
          attributenameen: string | null;
          attributevalueth: string | null;
          attributevalueen: string | null;
          attributevaluecode: string | null;
        }[]) {
          const vid = r.variantid;
          if (!variantAttrsByVariantId[vid]) variantAttrsByVariantId[vid] = [];
          variantAttrsByVariantId[vid].push({
            attributeId: r.attributeid,
            nameTH: (r.attributenameth ?? '').trim() || `คุณสมบัติ #${r.attributeid}`,
            nameEN: r.attributenameen?.trim() || null,
            valueTH: (r.attributevalueth ?? '').trim(),
            valueEN: r.attributevalueen?.trim() || null,
            valueCode: (r.attributevaluecode ?? '').trim(),
          });
        }
      } catch (attrErr) {
        console.error(
          'Product variant attributes (attributevalues join) query failed — ตรวจสอบตารางเชื่อมและคอลัมน์ attributes:',
          attrErr
        );
      }
    }
    let variantDiscounts: Record<number, { discountId: number; discountType: string; discountValue: number; maximumDiscountAmount: number | null }> = {};
    if (variantIds.length > 0) {
      const discountRes = await pool.query(
        `SELECT discountid, variantid, discounttype, discountvalue, maximumdiscountamount
         FROM discounts
         WHERE variantid = ANY($1)
           AND isactive = true
           AND startdate <= CURRENT_TIMESTAMP
           AND enddate >= CURRENT_TIMESTAMP
           AND (usagelimit IS NULL OR usedcount < usagelimit)`,
        [variantIds]
      );
      discountRes.rows.forEach((r: { variantid: number; discountid: number; discounttype: string; discountvalue: string; maximumdiscountamount: string | null }) => {
        variantDiscounts[r.variantid] = {
          discountId: r.discountid,
          discountType: r.discounttype,
          discountValue: parseFloat(r.discountvalue),
          maximumDiscountAmount: r.maximumdiscountamount ? parseFloat(r.maximumdiscountamount) : null,
        };
      });
    }

    // Sum available stock across all variants
    let availableStock = 0;
    if (variants.length > 0) {
      const variantIds = variants.map((v: { variantid: number }) => v.variantid);
      const stockResult = await pool.query(
        `SELECT COALESCE(SUM(availablequantity), 0)::int as total
         FROM inventories WHERE variantid = ANY($1)`,
        [variantIds]
      );
      availableStock = parseInt(stockResult.rows[0]?.total || '0', 10);
    }

    // Sold count: sum of QuantityOrdered from orders with completed payment
    const soldCountResult = await pool.query(
      `SELECT COALESCE(SUM(oi.quantityordered), 0)::int as sold_count
       FROM order_items oi
       JOIN inventories inv ON oi.inventoryid = inv.inventoryid
       JOIN productvariants pv ON inv.variantid = pv.variantid
       WHERE pv.productid = $1
         AND oi.orderid IN (SELECT orderid FROM payments WHERE paymentstatus = 'completed')`,
      [productId]
    );
    const soldCount = parseInt(soldCountResult.rows[0]?.sold_count || '0', 10);

    // Use first variant's SKU for images (lowest price variant)
    const primarySku = variants.length > 0 ? variants[0].sku : null;
    const imageUrl = getProductImageUrl(primarySku);
    const imageSlots = getProductImageUrls(primarySku, 6);

    // Parse description into structured content: intro, bullet list, main description
    // Format: intro text, bullet items (• or -), then main paragraph(s)
    const descriptionText = row.description || '';
    const specifications: string[] = [];
    const contentBlocks: { type: 'paragraph' | 'list'; content: string | string[] }[] = [];
    let mainDescription = '';

    if (descriptionText) {
      const lines = descriptionText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      const bulletPattern = /^[•\-*]\s*/;
      let currentParagraph: string[] = [];
      let bulletGroup: string[] = [];

      for (const line of lines) {
        if (bulletPattern.test(line)) {
          if (currentParagraph.length > 0) {
            contentBlocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
            currentParagraph = [];
          }
          bulletGroup.push(line.replace(bulletPattern, '').trim());
        } else {
          if (bulletGroup.length > 0) {
            contentBlocks.push({ type: 'list', content: bulletGroup });
            specifications.push(...bulletGroup);
            bulletGroup = [];
          }
          currentParagraph.push(line);
        }
      }
      if (bulletGroup.length > 0) {
        contentBlocks.push({ type: 'list', content: bulletGroup });
        specifications.push(...bulletGroup);
      }
      if (currentParagraph.length > 0) {
        contentBlocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
      }
      // If no structure found, treat whole description as one paragraph
      if (contentBlocks.length === 0 && descriptionText) {
        contentBlocks.push({ type: 'paragraph', content: descriptionText });
      }
      mainDescription = descriptionText;
    }

    // Fetch approved reviews only (isapproved = true) for display; rating is calculated from approved
    const reviewsQuery = `
      SELECT r.reviewid, r.rating, r.reviewtext, r.reviewdate,
             COALESCE(LEFT(c.firstname, 1) || '***', 'ลูกค้า') as displayname
      FROM reviews r
      JOIN customers c ON r.customerid = c.customerid
      WHERE r.productid = $1 AND r.isapproved = true
      ORDER BY r.reviewdate DESC
    `;
    const reviewsResult = await pool.query(reviewsQuery, [productId]);
    const reviews = reviewsResult.rows.map((r: {
      reviewid: number;
      rating: number;
      reviewtext: string | null;
      reviewdate: string;
      displayname: string;
    }) => ({
      id: r.reviewid.toString(),
      user: r.displayname || 'ลูกค้า',
      rating: r.rating,
      comment: r.reviewtext || '',
      date: r.reviewdate,
    }));
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews
      : 5.0;

    // Fetch similar products (same subcategory, exclude current, limit 4)
    const subCategoryId = row.subcategoryid;
    let similarProducts: { id: string; name: string; price: number; image: string | null }[] = [];
    if (subCategoryId) {
      const similarQuery = `
        SELECT DISTINCT ON (p.productid)
          p.productid,
          p.productnameth,
          p.productnameen,
          pv.sku,
          pv.price
        FROM products p
        INNER JOIN productvariants pv ON p.productid = pv.productid AND pv.isactive = true
        WHERE p.subcategoryid = $1 AND p.productid != $2
        ORDER BY p.productid, pv.price ASC
        LIMIT 4
      `;
      const similarResult = await pool.query(similarQuery, [subCategoryId, productId]);
      similarProducts = similarResult.rows.map((r: { productid: number; productnameth: string; productnameen: string; sku: string; price: string }) => ({
        id: r.productid.toString(),
        name: r.productnameth || r.productnameen,
        price: parseFloat(r.price),
        image: getProductImageUrl(r.sku),
      }));
    }

    // คำนวณราคาและส่วนลดสำหรับ variant แรก (default)
    const firstVariant = variants[0];
    let price = variants.length > 0 ? parseFloat(firstVariant.price) : 0;
    let originalPrice: number | null = null;
    let discountPercent: number | null = null;
    let discountId: number | null = null;

    if (firstVariant && variantDiscounts[firstVariant.variantid]) {
      const d = variantDiscounts[firstVariant.variantid];
      discountId = d.discountId;
      originalPrice = price;
      if (d.discountType === 'percentage') {
        discountPercent = d.discountValue;
        price = price * (1 - d.discountValue / 100);
        if (d.maximumDiscountAmount && (originalPrice - price) > d.maximumDiscountAmount) {
          price = originalPrice - d.maximumDiscountAmount;
          discountPercent = originalPrice > 0 ? Math.round((d.maximumDiscountAmount / originalPrice) * 100) : 0;
        }
      } else if (d.discountType === 'fixed_amount') {
        price = Math.max(0, price - d.discountValue);
        discountPercent = originalPrice > 0 ? Math.round((d.discountValue / originalPrice) * 100) : 0;
      }
    }

    const product = {
      id: row.productid.toString(),
      name: row.productnameth || row.productnameen,
      nameEN: row.productnameen,
      description: row.description || '',
      category: row.subcategorynameth || row.subcategorynameen,
      subcategoryId: row.subcategoryid,
      brand: row.brandnameth || row.brandnameen,
      price,
      originalPrice,
      discountPercent,
      discountId,
      image: imageUrl,
      images: imageSlots.length > 0 ? imageSlots.map((slot) => slot[0]) : (imageUrl ? [imageUrl] : []),
      imageSlots: imageSlots.length > 0 ? imageSlots : undefined,
      specifications,
      contentBlocks,
      variants: variants.map((v: { variantid: number; sku: string; price: string }) => {
        let vPrice = parseFloat(v.price);
        let vOriginal: number | null = null;
        let vDiscountPct: number | null = null;
        let vDiscountId: number | null = null;
        if (variantDiscounts[v.variantid]) {
          const d = variantDiscounts[v.variantid];
          vDiscountId = d.discountId;
          vOriginal = vPrice;
          if (d.discountType === 'percentage') {
            vDiscountPct = d.discountValue;
            vPrice = vPrice * (1 - d.discountValue / 100);
            if (d.maximumDiscountAmount && (vOriginal - vPrice) > d.maximumDiscountAmount) {
              vPrice = vOriginal - d.maximumDiscountAmount;
              vDiscountPct = vOriginal > 0 ? Math.round((d.maximumDiscountAmount / vOriginal) * 100) : 0;
            }
          } else if (d.discountType === 'fixed_amount') {
            vPrice = Math.max(0, vPrice - d.discountValue);
            vDiscountPct = vOriginal > 0 ? Math.round((d.discountValue / vOriginal) * 100) : 0;
          }
        }
        return {
          id: v.variantid,
          sku: v.sku,
          price: vPrice,
          originalPrice: vOriginal,
          discountPercent: vDiscountPct,
          discountId: vDiscountId,
          attributeValues: variantAttrsByVariantId[v.variantid] ?? [],
        };
      }),
      availableStock,
      shippingDays: 3,
      rating: Math.round(avgRating * 10) / 10,
      soldCount,
      reviews,
      totalReviews,
      similarProducts,
    };

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}
