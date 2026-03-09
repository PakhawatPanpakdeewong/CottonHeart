import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * ยกเลิกออร์เดอร์ที่ยังไม่ชำระเงิน (rollback)
 * - ตรวจสอบสิทธิ์จากอีเมลลูกค้า
 * - orderstatus ต้องยังไม่เป็น cancelled / confirmed / delivered
 * - paymentstatus (ถ้ามี) ต้องเป็น pending เท่านั้น
 * - คืนสต็อก: reservedquantity → availablequantity
 * - อัปเดต orders.orderstatus -> cancelled
 * - อัปเดต payments.paymentstatus -> failed
 * - บันทึกคำขอยกเลิกลงตาราง cancellation (สถานะเริ่มต้น pending)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const email =
      body.email || request.nextUrl.searchParams.get('email') || '';
    const cancellationReason: string | null =
      typeof body.cancellationReason === 'string' && body.cancellationReason.trim()
        ? body.cancellationReason.trim()
        : null;

    if (!id || !email.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุหมายเลขออเดอร์และอีเมลล์' },
        { status: 400 }
      );
    }

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'หมายเลขออเดอร์ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const emailLower = email.trim().toLowerCase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // ตรวจสอบว่ามีคำขอยกเลิกอยู่แล้วหรือไม่
      const existingCancelRes = await client.query(
        `SELECT cancellationid
         FROM cancellation
         WHERE orderid = $1
         ORDER BY cancellationid DESC
         LIMIT 1`,
        [orderId]
      );

      if (existingCancelRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'มีคำขอยกเลิกสำหรับออร์เดอร์นี้อยู่แล้ว' },
          { status: 400 }
        );
      }

      // ตรวจสอบสิทธิ์และสถานะออร์เดอร์ปัจจุบัน
      const statusRes = await client.query(
        `SELECT o.orderstatus,
                (SELECT paymentstatus
                 FROM payments
                 WHERE orderid = o.orderid
                 ORDER BY paymentid DESC
                 LIMIT 1) AS paymentstatus
         FROM orders o
         JOIN customers c ON o.customerid = c.customerid
         WHERE o.orderid = $1
           AND c.email = $2
           AND c.isactive = true
         FOR UPDATE`,
        [orderId, emailLower]
      );

      if (statusRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'ไม่พบคำสั่งซื้อหรือไม่มีสิทธิ์เข้าถึง' },
          { status: 404 }
        );
      }

      const row = statusRes.rows[0] as {
        orderstatus: string;
        paymentstatus: string | null;
      };
      const currentStatus = row.orderstatus?.toLowerCase();
      const currentPayStatus = row.paymentstatus?.toLowerCase() || null;

      // อนุญาตยกเลิกเฉพาะออร์เดอร์ที่ยังไม่ถูกยืนยัน / ส่งของ / ยกเลิกไปแล้ว
      if (currentStatus === 'cancelled') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'ออร์เดอร์นี้ถูกยกเลิกไปแล้ว' },
          { status: 400 }
        );
      }

      if (
        currentStatus === 'confirmed' ||
        currentStatus === 'shipped' ||
        currentStatus === 'in_transit' ||
        currentStatus === 'delivered'
      ) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'ไม่สามารถยกเลิกออร์เดอร์ที่ได้รับการยืนยันหรือจัดส่งแล้วได้' },
          { status: 400 }
        );
      }

      if (currentPayStatus && currentPayStatus !== 'pending') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'ไม่สามารถยกเลิกออร์เดอร์ที่มีสถานะการชำระเงินไม่ใช่รอยืนยันได้' },
          { status: 400 }
        );
      }

      // บันทึกคำขอยกเลิกลงตาราง cancellation
      await client.query(
        `INSERT INTO cancellation (orderid, cancellationreason, cancellationstatus)
         VALUES ($1, $2, 'pending')`,
        [orderId, cancellationReason]
      );

      // คืนสต็อก: reservedquantity → availablequantity
      await client.query(
        `UPDATE inventories i
         SET reservedquantity = reservedquantity - oi.quantityordered,
             availablequantity = availablequantity + oi.quantityordered,
             updateddate = CURRENT_TIMESTAMP
         FROM order_items oi
         WHERE oi.inventoryid = i.inventoryid
           AND oi.orderid = $1`,
        [orderId]
      );

      // อัปเดตสถานะออร์เดอร์
      await client.query(
        `UPDATE orders
         SET orderstatus = 'cancelled',
             updateddate = CURRENT_TIMESTAMP
         WHERE orderid = $1`,
        [orderId]
      );

      // อัปเดตสถานะการชำระเงิน (ถ้ามี)
      await client.query(
        `UPDATE payments
         SET paymentstatus = 'failed',
             updateddate = CURRENT_TIMESTAMP
         WHERE orderid = $1`,
        [orderId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'ยกเลิกออร์เดอร์และคืนสต็อกเรียบร้อยแล้ว',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ' },
      { status: 500 }
    );
  }
}

