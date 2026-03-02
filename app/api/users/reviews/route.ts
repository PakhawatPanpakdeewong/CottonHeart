import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email?.trim()) {
      return NextResponse.json({ productsToReview: [], reviews: [] }, { status: 200 });
    }

    const result = await pool.query(
      `SELECT cust.customerid FROM customers cust
       WHERE cust.email = $1 AND cust.isactive = true`,
      [email.trim().toLowerCase()]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ productsToReview: [], reviews: [] }, { status: 200 });
    }
    const customerId = result.rows[0].customerid;

    // Products delivered but not yet reviewed (unique by productid, variantid per order item)
    const toReviewRes = await pool.query(
      `SELECT DISTINCT ON (p.productid, pv.variantid)
        o.orderid,
        oi.orderitemid,
        p.productid,
        p.productnameth,
        p.productnameen,
        c.categorynameth,
        pv.sku,
        pv.variantid,
        pv.price
       FROM orders o
       JOIN order_items oi ON o.orderid = oi.orderid
       JOIN inventories i ON oi.inventoryid = i.inventoryid
       JOIN productvariants pv ON i.variantid = pv.variantid
       JOIN products p ON pv.productid = p.productid
       LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
       LEFT JOIN categories c ON sc.categoryid = c.categoryid
       LEFT JOIN LATERAL (
         SELECT deliverystatus FROM shipments
         WHERE orderid = o.orderid ORDER BY shipmentid DESC LIMIT 1
       ) ship ON true
       WHERE o.customerid = $1
         AND (ship.deliverystatus = 'delivered' OR o.orderstatus = 'delivered')
         AND NOT EXISTS (
           SELECT 1 FROM reviews r
           WHERE r.productid = p.productid AND r.variantid = pv.variantid AND r.customerid = $1
         )
       ORDER BY p.productid, pv.variantid, o.orderdate DESC`,
      [customerId]
    );

    const productsToReview = toReviewRes.rows.map((row: {
      orderid: number;
      orderitemid: number;
      productid: number;
      productnameth: string;
      productnameen: string;
      categorynameth: string | null;
      sku: string;
      variantid: number;
      price: string;
    }) => ({
      orderId: row.orderid.toString(),
      orderItemId: row.orderitemid.toString(),
      productId: row.productid.toString(),
      productName: row.productnameth || row.productnameen || '',
      category: row.categorynameth || '',
      image: getProductImageUrl(row.sku),
      variant: row.sku,
      variantId: row.variantid.toString(),
      price: parseFloat(row.price) || 0,
    }));

    // Reviews already written by user (orderid from order_items if column exists)
    const reviewsRes = await pool.query(
      `SELECT r.reviewid, r.productid, r.variantid, r.rating, r.reviewtext, r.reviewdate,
              p.productnameth, p.productnameen,
              c.categorynameth, pv.sku, pv.price,
              (SELECT o.orderid FROM order_items oi
               JOIN inventories i ON oi.inventoryid = i.inventoryid
               JOIN orders o ON oi.orderid = o.orderid
               WHERE i.variantid = r.variantid AND o.customerid = r.customerid
               ORDER BY o.orderdate DESC LIMIT 1) AS orderid
       FROM reviews r
       JOIN products p ON r.productid = p.productid
       JOIN productvariants pv ON r.variantid = pv.variantid
       LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
       LEFT JOIN categories c ON sc.categoryid = c.categoryid
       WHERE r.customerid = $1
       ORDER BY r.reviewdate DESC`,
      [customerId]
    );

    const reviews = reviewsRes.rows.map((row: {
      reviewid: number;
      productid: number;
      variantid: number;
      rating: number;
      reviewtext: string | null;
      reviewdate: string;
      orderid: number | null;
      productnameth: string;
      productnameen: string;
      categorynameth: string | null;
      sku: string;
      price: string;
    }) => ({
      id: row.reviewid.toString(),
      productId: row.productid.toString(),
      variantId: row.variantid.toString(),
      rating: row.rating,
      reviewText: row.reviewtext || '',
      reviewDate: row.reviewdate,
      orderId: row.orderid?.toString() || null,
      productName: row.productnameth || row.productnameen || '',
      category: row.categorynameth || '',
      image: getProductImageUrl(row.sku),
      variant: row.sku,
      price: parseFloat(row.price) || 0,
    }));

    return NextResponse.json({ productsToReview, reviews });
  } catch (error) {
    console.error('Users reviews fetch error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลรีวิว' },
      { status: 500 }
    );
  }
}
