import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

// Map DB orderstatus to frontend status
function mapOrderStatus(dbStatus: string): 'ordered' | 'shipping' | 'delivered' | 'cancelled' {
  switch (dbStatus?.toLowerCase()) {
    case 'shipped':
    case 'in_transit':
      return 'shipping';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'ordered'; // pending, confirmed
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email?.trim()) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const result = await pool.query(
      `SELECT 
        oi.orderitemid,
        o.orderid,
        o.orderdate,
        o.orderstatus,
        oi.quantityordered,
        oi.unitprice,
        oi.totalprice,
        p.productid,
        p.productnameth,
        p.productnameen,
        c.categorynameth,
        pv.sku
       FROM orders o
       JOIN order_items oi ON o.orderid = oi.orderid
       JOIN inventories i ON oi.inventoryid = i.inventoryid
       JOIN productvariants pv ON i.variantid = pv.variantid
       JOIN products p ON pv.productid = p.productid
       LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
       LEFT JOIN categories c ON sc.categoryid = c.categoryid
       JOIN customers cust ON o.customerid = cust.customerid
       WHERE cust.email = $1
       ORDER BY o.orderdate DESC, oi.orderitemid ASC`,
      [email.trim().toLowerCase()]
    );

    const orders = result.rows.map((row: {
      orderitemid: number;
      orderid: number;
      orderdate: string;
      orderstatus: string;
      quantityordered: number;
      unitprice: string;
      totalprice: string;
      productid: number;
      productnameth: string;
      productnameen: string;
      categorynameth: string | null;
      sku: string;
    }) => ({
      id: row.orderitemid.toString(),
      orderId: row.orderid.toString(),
      productId: row.productid.toString(),
      productName: row.productnameth || row.productnameen || '',
      category: row.categorynameth || '',
      image: getProductImageUrl(row.sku),
      variant: row.sku,
      quantity: row.quantityordered,
      price: parseFloat(row.totalprice) || parseFloat(row.unitprice) * row.quantityordered,
      status: mapOrderStatus(row.orderstatus),
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ orders: [] }, { status: 200 });
  }
}
