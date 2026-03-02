import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const searchQuery = searchParams.get('q') || ''; // Search by name or SKU
    const categoryId = searchParams.get('category'); // Category ID
    const subCategoryId = searchParams.get('subcategory'); // SubCategory ID
    const minPrice = searchParams.get('minPrice'); // Minimum price
    const maxPrice = searchParams.get('maxPrice'); // Maximum price
    const sort = searchParams.get('sort') || ''; // sort=new = เรียงตามวันที่เพิ่มล่าสุด
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Build the query dynamically
    // ค้นเฉพาะชื่อ TH/EN, แสดงเฉพาะ isActive=true และ stock > 0
    let query = `
      SELECT DISTINCT ON (p.productid)
        p.productid,
        p.productnameth,
        p.productnameen,
        p.description,
        p.createddate,
        p.updateddate,
        p.subcategoryid,
        c.categoryid,
        c.categorynameth,
        c.categorynameen,
        sc.subcategorynameth,
        sc.subcategorynameen,
        b.brandnameth,
        b.brandnameen,
        pv.variantid,
        pv.sku,
        pv.price,
        pv.isactive
      FROM products p
      LEFT JOIN brands b ON p.brandid = b.brandid
      LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
      LEFT JOIN categories c ON sc.categoryid = c.categoryid
      INNER JOIN productvariants pv ON p.productid = pv.productid AND pv.isactive = true
      INNER JOIN (
        SELECT variantid
        FROM inventories
        GROUP BY variantid
        HAVING SUM(availablequantity) > 0
      ) inv ON pv.variantid = inv.variantid
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Search by product name (Thai or English only)
    if (searchQuery) {
      query += ` AND (
        LOWER(p.productnameth) LIKE LOWER($${paramIndex}) OR
        LOWER(p.productnameen) LIKE LOWER($${paramIndex})
      )`;
      queryParams.push(`%${searchQuery}%`);
      paramIndex++;
    }

    // Filter by category
    if (categoryId) {
      query += ` AND c.categoryid = $${paramIndex}`;
      queryParams.push(categoryId);
      paramIndex++;
    }

    // Filter by subcategory
    if (subCategoryId) {
      query += ` AND sc.subcategoryid = $${paramIndex}`;
      queryParams.push(subCategoryId);
      paramIndex++;
    }

    // Filter by price range
    if (minPrice) {
      query += ` AND pv.price >= $${paramIndex}`;
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      query += ` AND pv.price <= $${paramIndex}`;
      queryParams.push(maxPrice);
      paramIndex++;
    }

    // Order by product ID and price (for DISTINCT ON)
    query += ` ORDER BY p.productid, pv.price ASC NULLS LAST`;

    // Get total count for pagination (before adding sort wrapper)
    const countQuery = query.replace(
      /SELECT DISTINCT ON \(p\.productid\).*?FROM/s,
      'SELECT COUNT(DISTINCT p.productid) FROM'
    ).replace(/ORDER BY.*$/, '');

    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    // When sort=new: wrap in subquery to order by created date (newest first)
    if (sort === 'new') {
      query = `SELECT * FROM (${query}) AS sub ORDER BY createddate DESC NULLS LAST`;
    }

    // Add limit and offset
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    console.log('Executing search query with params:', { searchQuery, categoryId, subCategoryId, minPrice, maxPrice, page, limit });
    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} products`);

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
        category: {
          id: row.categoryid,
          nameTH: row.categorynameth,
          nameEN: row.categorynameen,
        },
        subCategory: {
          id: row.subcategoryid,
          nameTH: row.subcategorynameth,
          nameEN: row.subcategorynameen,
        },
        variantId: row.variantid,
        isActive: row.isactive,
        createdAt: row.createddate,
      };
    });

    return NextResponse.json(
      {
        products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error searching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: 'Failed to search products',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}

