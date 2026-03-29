import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * GET /api/brands
 * ไม่มี category → คืน []
 * ?category=id [&subcategory=id] → แบรนด์ในประเภทนั้น (รวม brandid ที่ชื่อซ้ำเป็นแถวเดียว)
 */
export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get('category');
    const subCategoryId = request.nextUrl.searchParams.get('subcategory');

    if (!categoryId || !/^\d+$/.test(categoryId)) {
      return NextResponse.json({ brands: [] }, { status: 200 });
    }

    const catId = parseInt(categoryId, 10);
    const params: number[] = [catId];
    let subClause = '';

    if (subCategoryId && /^\d+$/.test(subCategoryId)) {
      subClause = ` AND sc.subcategoryid = $2`;
      params.push(parseInt(subCategoryId, 10));
    }

    const result = await pool.query(
      `
      WITH hits AS (
        SELECT DISTINCT b.brandid, b.brandnameth, b.brandnameen
        FROM brands b
        INNER JOIN products p ON p.brandid = b.brandid
        INNER JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
        INNER JOIN categories c ON sc.categoryid = c.categoryid
        INNER JOIN productvariants pv ON p.productid = pv.productid AND pv.isactive = true
        INNER JOIN (
          SELECT variantid
          FROM inventories
          GROUP BY variantid
          HAVING SUM(availablequantity) > 0
        ) inv ON pv.variantid = inv.variantid
        WHERE b.brandid IS NOT NULL
          AND c.categoryid = $1
          ${subClause}
      )
      SELECT
        array_agg(h.brandid ORDER BY h.brandid) AS brandids,
        MAX(h.brandnameth) AS brandnameth,
        MAX(h.brandnameen) AS brandnameen
      FROM hits h
      GROUP BY
        CASE
          WHEN NULLIF(TRIM(COALESCE(h.brandnameth, '')), '') IS NOT NULL
            OR NULLIF(TRIM(COALESCE(h.brandnameen, '')), '') IS NOT NULL
          THEN LOWER(
            TRIM(
              COALESCE(
                NULLIF(TRIM(h.brandnameth), ''),
                NULLIF(TRIM(h.brandnameen), '')
              )
            )
          )
          ELSE 'id-' || h.brandid::text
        END
      ORDER BY MAX(h.brandnameth) NULLS LAST, MAX(h.brandnameen) NULLS LAST
    `,
      params
    );

    const toIdArray = (raw: unknown): number[] => {
      if (Array.isArray(raw)) return raw.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
      if (raw == null) return [];
      if (typeof raw === 'string') {
        return raw
          .replace(/[{}]/g, '')
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n));
      }
      const n = Number(raw);
      return Number.isNaN(n) ? [] : [n];
    };

    const brands = result.rows.map((row) => ({
      ids: toIdArray(row.brandids),
      nameTH: row.brandnameth || row.brandnameen || '',
      nameEN: row.brandnameen,
    })).filter((b) => b.ids.length > 0);

    return NextResponse.json({ brands }, { status: 200 });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
