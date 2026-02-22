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

    const product = {
      id: row.productid.toString(),
      name: row.productnameth || row.productnameen,
      nameEN: row.productnameen,
      description: row.description || '',
      category: row.subcategorynameth || row.subcategorynameen,
      subcategoryId: row.subcategoryid,
      brand: row.brandnameth || row.brandnameen,
      price: variants.length > 0 ? parseFloat(variants[0].price) : 0,
      originalPrice: null as number | null,
      discountPercent: null as number | null,
      image: imageUrl,
      images: imageSlots.length > 0 ? imageSlots.map((slot) => slot[0]) : (imageUrl ? [imageUrl] : []),
      imageSlots: imageSlots.length > 0 ? imageSlots : undefined,
      specifications,
      contentBlocks,
      variants: variants.map((v: { variantid: number; sku: string; price: string }) => ({
        id: v.variantid,
        sku: v.sku,
        price: parseFloat(v.price),
      })),
      availableStock,
      shippingDays: 3,
      rating: 5.0,
      soldCount: 0,
      reviews: [] as { id: string; user: string; rating: number; comment: string; date: string }[],
      totalReviews: 0,
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
