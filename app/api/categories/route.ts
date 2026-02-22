import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Get all categories with their subcategories and product counts
    const query = `
      SELECT 
        c.categoryid,
        c.categorynameth,
        c.categorynameen,
        sc.subcategoryid,
        sc.subcategorynameth,
        sc.subcategorynameen,
        COUNT(DISTINCT CASE WHEN pv.isactive = true THEN p.productid END) as product_count
      FROM categories c
      LEFT JOIN subcategories sc ON c.categoryid = sc.categoryid
      LEFT JOIN products p ON sc.subcategoryid = p.subcategoryid
      LEFT JOIN productvariants pv ON p.productid = pv.productid
      GROUP BY c.categoryid, c.categorynameth, c.categorynameen, sc.subcategoryid, sc.subcategorynameth, sc.subcategorynameen
      ORDER BY c.categoryid, sc.subcategoryid
    `;

    const result = await pool.query(query);

    // Group subcategories by category
    const categoriesMap = new Map();

    result.rows.forEach((row) => {
      const categoryId = row.categoryid;
      
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          nameTH: row.categorynameth,
          nameEN: row.categorynameen,
          subCategories: [],
        });
      }

      if (row.subcategoryid) {
        const category = categoriesMap.get(categoryId);
        category.subCategories.push({
          id: row.subcategoryid,
          nameTH: row.subcategorynameth,
          nameEN: row.subcategorynameen,
          productCount: parseInt(row.product_count || '0', 10),
        });
      }
    });

    const categories = Array.from(categoriesMap.values());

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch categories',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

