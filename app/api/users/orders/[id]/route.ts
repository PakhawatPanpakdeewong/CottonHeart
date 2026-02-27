import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

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
      return 'ordered';
  }
}

function mapPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash_on_delivery: 'เงินสด',
    bank_transfer: 'โอนเงิน',
    credit_card: 'บัตรเครดิต',
    debit_card: 'บัตรเดบิต',
    digital_wallet: 'กระเป๋าเงินดิจิทัล',
  };
  return map[method?.toLowerCase()] || method || '—';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const email = request.nextUrl.searchParams.get('email');

    if (!orderId || !email?.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุหมายเลขออเดอร์และอีเมลล์' },
        { status: 400 }
      );
    }

    const orderIdNum = parseInt(orderId, 10);
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'หมายเลขออเดอร์ไม่ถูกต้อง' }, { status: 400 });
    }

    // 1. Get order + customer (verify ownership)
    const orderRes = await pool.query(
      `SELECT o.orderid, o.orderdate, o.totalamount, o.orderstatus, o.shippingaddress, o.notes,
              c.customerid, c.firstname, c.lastname, c.phonenumber
       FROM orders o
       JOIN customers c ON o.customerid = c.customerid
       WHERE o.orderid = $1 AND c.email = $2 AND c.isactive = true`,
      [orderIdNum, email.trim().toLowerCase()]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบคำสั่งซื้อหรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const orderRow = orderRes.rows[0];
    const fullName = [orderRow.firstname, orderRow.lastname].filter(Boolean).join(' ').trim() || '—';

    // 2. Order items
    const itemsRes = await pool.query(
      `SELECT oi.orderitemid, oi.quantityordered, oi.unitprice, oi.totalprice,
              p.productid, p.productnameth, p.productnameen,
              c.categorynameth, pv.sku
       FROM order_items oi
       JOIN inventories i ON oi.inventoryid = i.inventoryid
       JOIN productvariants pv ON i.variantid = pv.variantid
       JOIN products p ON pv.productid = p.productid
       LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
       LEFT JOIN categories c ON sc.categoryid = c.categoryid
       WHERE oi.orderid = $1
       ORDER BY oi.orderitemid ASC`,
      [orderIdNum]
    );

    const items = itemsRes.rows.map((row: {
      orderitemid: number;
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
      productId: row.productid.toString(),
      productName: row.productnameth || row.productnameen || '',
      category: row.categorynameth || '',
      image: getProductImageUrl(row.sku),
      variant: row.sku,
      quantity: row.quantityordered,
      unitPrice: parseFloat(row.unitprice),
      totalPrice: parseFloat(row.totalprice) || parseFloat(row.unitprice) * row.quantityordered,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

    // 3. Shipment (shipping cost, tracking)
    const shipRes = await pool.query(
      `SELECT trackingnumber, shippingcarrier, deliverystatus, shippingcost
       FROM shipments
       WHERE orderid = $1
       ORDER BY shipmentid DESC
       LIMIT 1`,
      [orderIdNum]
    );
    const ship = shipRes.rows[0] || {};
    const shippingCost = parseFloat(ship.shippingcost) || 50;

    // 4. Payment (payments table: paymentid, orderid, paymentdate, paymentamount, paymentmethod, paymentstatus, trackingnumber, createddate, updateddate, paidamount)
    const payRes = await pool.query(
      `SELECT paymentamount, paymentmethod, paymentdate, trackingnumber, paymentstatus
       FROM payments
       WHERE orderid = $1
       ORDER BY paymentid DESC
       LIMIT 1`,
      [orderIdNum]
    );
    const pay = payRes.rows[0] || {};

    const order = {
      orderId: orderRow.orderid.toString(),
      orderDate: orderRow.orderdate,
      orderStatus: mapOrderStatus(orderRow.orderstatus),
      totalAmount: parseFloat(orderRow.totalamount),
      shippingAddress: orderRow.shippingaddress || '—',
      referenceCode: orderRow.notes || null,
      recipientName: fullName,
      recipientPhone: orderRow.phonenumber || '—',
      trackingNumber: ship.trackingnumber || null,
      shippingCarrier: ship.shippingcarrier || null,
      shippingCost,
      items,
      subtotal,
      paymentMethod: mapPaymentMethod(pay.paymentmethod),
      paymentAmount: pay.paymentamount ? parseFloat(pay.paymentamount) : null,
      paymentDate: pay.paymentdate || null,
      paymentTransactionId: pay.trackingnumber || null,
      paymentStatus: pay.paymentstatus || null,
    };

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order detail fetch error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดรายละเอียดคำสั่งซื้อ' },
      { status: 500 }
    );
  }
}
