import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

export async function GET() {
  try {
    // Test connection first
    await pool.query('SELECT 1');
    
    // Query to get new products added in the current month
    // Ordered by createddate DESC (newest first)
    // Note: PostgreSQL converts unquoted identifiers to lowercase
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
        pv.variantid,
        pv.sku,
        pv.price,
        pv.isactive
      FROM products p
      LEFT JOIN brands b ON p.brandid = b.brandid
      LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
      LEFT JOIN LATERAL (
        SELECT variantid, sku, price, isactive
        FROM productvariants
        WHERE productid = p.productid AND isactive = true
        ORDER BY price ASC NULLS LAST
        LIMIT 1
      ) pv ON true
      WHERE DATE_TRUNC('month', p.createddate) = DATE_TRUNC('month', CURRENT_DATE)
        AND pv.variantid IS NOT NULL
        AND pv.isactive = true
      ORDER BY p.createddate DESC
      LIMIT 20
    `;

    console.log('Executing query to fetch new products...');
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} new products`);
    
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
    console.error('Error fetching new products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch new products', 
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    );
  }
}

