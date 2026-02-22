import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

export async function GET() {
  try {
    // Test connection first
    await pool.query('SELECT 1');
    
    // Query to get products with their variants, brands, and subcategories
    // We'll get the first active variant for each product (lowest price or first available)
    // Note: PostgreSQL converts unquoted identifiers to lowercase
    const query = `
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
      LIMIT 20
    `;

    console.log('Executing query to fetch products...');
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} products`);
    
    const products = result.rows.map((row) => {
      // Get image URL based on SKU pattern
      // If SKU is "062-CAR-PLN-850", it will look for "062-CAR-PLN-850-1.jpg"
      // If multiple variants exist (-1, -2, -3), always use -1
      const imageUrl = getProductImageUrl(row.sku);
      
      return {
        id: row.productid.toString(),
        name: row.productnameth || row.productnameen,
        nameEN: row.productnameen,
        description: row.description,
        price: row.price ? parseFloat(row.price).toFixed(2) : '0.00',
        sku: row.sku,
        image: imageUrl, // Add image URL
        brand: row.brandnameth || row.brandnameen,
        category: row.subcategorynameth || row.subcategorynameen,
        variantId: row.variantid,
        isActive: row.isactive,
        createdAt: row.createddate,
      };
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products', 
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    );
  }
}

