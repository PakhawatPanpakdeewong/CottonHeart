import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

export async function GET() {
  try {
    // สินค้าที่เข้าร่วมรายการส่วนลด - อ้างอิงจากตาราง Discounts (variantid เชื่อมกับ ProductVariants)
    // กรองเฉพาะ discount ที่ active และอยู่ในช่วงเวลา StartDate - EndDate
    const query = `
      SELECT
        p.productid,
        p.productnameth,
        p.productnameen,
        sc.subcategorynameth,
        sc.subcategorynameen,
        pv.variantid,
        pv.sku,
        pv.price,
        d.discounttype,
        d.discountvalue,
        d.discountcode,
        d.maximumdiscountamount
      FROM discounts d
      INNER JOIN productvariants pv ON d.variantid = pv.variantid AND pv.isactive = true
      INNER JOIN products p ON pv.productid = p.productid
      INNER JOIN (
        SELECT variantid
        FROM inventories
        GROUP BY variantid
        HAVING SUM(availablequantity) > 0
      ) inv ON pv.variantid = inv.variantid
      LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
      WHERE d.variantid IS NOT NULL
        AND d.isactive = true
        AND d.startdate <= CURRENT_TIMESTAMP
        AND d.enddate >= CURRENT_TIMESTAMP
        AND (d.usagelimit IS NULL OR d.usedcount < d.usagelimit)
      ORDER BY p.productid
      LIMIT 20
    `;

    const result = await pool.query(query);

    const products = result.rows.map((row) => {
      const price = parseFloat(row.price);
      let discountedPrice = price;
      let discountPercent: number | null = null;
      let discountLabel = '';

      if (row.discounttype === 'percentage') {
        const pct = parseFloat(row.discountvalue);
        discountPercent = pct;
        discountedPrice = price * (1 - pct / 100);
        discountLabel = `ลด ${pct}%`;
      } else if (row.discounttype === 'fixed_amount') {
        const fixed = parseFloat(row.discountvalue);
        discountedPrice = Math.max(0, price - fixed);
        const pct = price > 0 ? Math.round((fixed / price) * 100) : 0;
        discountPercent = pct;
        discountLabel = `ลด ${fixed} บาท`;
      }

      // ใช้ MaximumDiscountAmount ถ้ามี (สำหรับ percentage)
      if (row.discounttype === 'percentage' && row.maximumdiscountamount) {
        const maxDiscount = parseFloat(row.maximumdiscountamount);
        const currentDiscount = price - discountedPrice;
        if (currentDiscount > maxDiscount) {
          discountedPrice = price - maxDiscount;
          discountPercent = price > 0 ? Math.round((maxDiscount / price) * 100) : 0;
        }
      }

      const imageUrl = getProductImageUrl(row.sku);

      return {
        id: row.productid.toString(),
        name: row.productnameth || row.productnameen,
        nameEN: row.productnameen,
        price: discountedPrice.toFixed(2),
        originalPrice: price.toFixed(2),
        discountPercent,
        discountLabel,
        discountCode: row.discountcode,
        image: imageUrl,
        category: row.subcategorynameth || row.subcategorynameen,
        sku: row.sku,
      };
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching discounted products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch discounted products', details: errorMessage },
      { status: 500 }
    );
  }
}
