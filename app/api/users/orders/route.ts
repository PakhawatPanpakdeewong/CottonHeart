import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

// Map DB orderstatus to frontend status
function mapOrderStatus(dbStatus: string): 'ordered' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled' {
  switch (dbStatus?.toLowerCase()) {
    case 'confirmed':
      return 'confirmed';
    case 'shipped':
    case 'in_transit':
      return 'shipping';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'ordered'; // pending
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
        o.totalamount,
        oi.quantityordered,
        oi.unitprice,
        oi.totalprice,
        p.productid,
        p.productnameth,
        p.productnameen,
        c.categorynameth,
        pv.sku,
        pv.variantid,
        pay.paymentamount,
        pay.paymentstatus,
        pay.payment_deadline_at,
        ship.deliverystatus AS shipment_deliverystatus
       FROM orders o
       JOIN order_items oi ON o.orderid = oi.orderid
       JOIN inventories i ON oi.inventoryid = i.inventoryid
       JOIN productvariants pv ON i.variantid = pv.variantid
       JOIN products p ON pv.productid = p.productid
       LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
       LEFT JOIN categories c ON sc.categoryid = c.categoryid
       LEFT JOIN LATERAL (
         SELECT paymentamount, paymentstatus, payment_deadline_at
         FROM payments
         WHERE orderid = o.orderid
         ORDER BY paymentid DESC
         LIMIT 1
       ) pay ON true
       LEFT JOIN LATERAL (
         SELECT deliverystatus
         FROM shipments
         WHERE orderid = o.orderid
         ORDER BY shipmentid DESC
         LIMIT 1
       ) ship ON true
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
      totalamount: string;
      quantityordered: number;
      unitprice: string;
      totalprice: string;
      productid: number;
      productnameth: string;
      productnameen: string;
      categorynameth: string | null;
      sku: string;
      variantid: number;
      paymentamount: string | null;
      paymentstatus: string | null;
      payment_deadline_at: string | null;
      shipment_deliverystatus: string | null;
    }) => {
      // ถ้า deliverystatus ใน shipments เป็น 'delivered' ให้แสดงเป็นจัดส่งสำเร็จ
      const effectiveStatus =
        row.shipment_deliverystatus?.toLowerCase() === 'delivered'
          ? 'delivered'
          : mapOrderStatus(row.orderstatus);
      return {
        id: row.orderitemid.toString(),
        orderId: row.orderid.toString(),
        orderDate: row.orderdate,
        productId: row.productid.toString(),
        productName: row.productnameth || row.productnameen || '',
        category: row.categorynameth || '',
        image: getProductImageUrl(row.sku),
        variant: row.sku,
        variantId: row.variantid?.toString(),
        quantity: row.quantityordered,
        unitPrice: parseFloat(row.unitprice) || 0,
        price: parseFloat(row.totalprice) || parseFloat(row.unitprice) * row.quantityordered,
        status: effectiveStatus,
        totalAmount: parseFloat(row.totalamount) || 0,
        paymentAmount: row.paymentamount ? parseFloat(row.paymentamount) : null,
        paymentStatus: row.paymentstatus || null,
        paymentDeadlineAt: row.payment_deadline_at || null,
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ orders: [] }, { status: 200 });
  }
}
