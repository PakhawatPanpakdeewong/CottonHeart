import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 24;

export async function GET(request: NextRequest) {
  try {
    await pool.query('SELECT 1');

    const limitParam = request.nextUrl.searchParams.get('limit');
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_LIMIT);
      }
    }

    const query = `
      SELECT * FROM (
        SELECT DISTINCT ON (p.productid)
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
          pv.variantid,
          pv.sku,
          pv.price,
          pv.isactive
        FROM products p
        LEFT JOIN brands b ON p.brandid = b.brandid
        LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
        INNER JOIN productvariants pv ON p.productid = pv.productid AND pv.isactive = true
        ORDER BY p.productid, pv.price ASC NULLS LAST
      ) AS distinct_products
      ORDER BY RANDOM()
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    const products = result.rows.map((row) => {
      const imageUrl = getProductImageUrl(row.sku);
      return {
        id: row.productid.toString(),
        name: row.productnameth || row.productnameen,
        nameEN: row.productnameen,
        description: row.description,
        price: row.price ? parseFloat(row.price).toFixed(2) : '0.00',
        sku: row.sku,
        image: imageUrl,
        brand: row.brandnameth || row.brandnameen,
        category: row.subcategorynameth || row.subcategorynameen,
        variantId: row.variantid,
        isActive: row.isactive,
        createdAt: row.createddate,
      };
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching random products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch random products',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
