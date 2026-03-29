import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// สร้างรหัส 6 หลัก ประกอบด้วยตัวเลข 0-9 และตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ A-Z (คล้าย OTP)
function generateReferenceCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const email = body.email || request.nextUrl.searchParams.get('email');

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

    // ตรวจสอบ ownership และดึง order + reference code + payment deadline
    const orderRes = await pool.query(
      `SELECT o.orderid,
              o.notes AS reference_code,
              p.payment_deadline_at
       FROM orders o
       JOIN customers c ON o.customerid = c.customerid
       LEFT JOIN LATERAL (
         SELECT payment_deadline_at
         FROM payments
         WHERE orderid = o.orderid
         ORDER BY paymentid DESC
         LIMIT 1
       ) p ON TRUE
       WHERE o.orderid = $1
         AND c.email = $2
         AND c.isactive = true`,
      [orderIdNum, email.trim().toLowerCase()]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบคำสั่งซื้อหรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const row = orderRes.rows[0] as {
      reference_code: string | null;
      payment_deadline_at: string | null;
    };

    const existing = (row.reference_code || '').trim();
    const isValidShopRef = /^[0-9A-Z]{6}$/.test(existing);
    let referenceCode = existing;

    // ถ้ายังไม่มีรหัสอ้างอิงร้าน (6 หลัก) ให้สร้างใหม่ — notes อื่นที่ไม่ใช่รูปแบบนี้จะถูกแทนที่
    if (!isValidShopRef) {
      referenceCode = generateReferenceCode();
      await pool.query(
        `UPDATE orders
         SET notes = $1,
             updateddate = CURRENT_TIMESTAMP
         WHERE orderid = $2`,
        [referenceCode, orderIdNum]
      );
    }

    // ถ้ายังไม่เคยตั้ง payment_deadline_at ให้ตั้งครั้งแรกเท่านั้น
    if (!row.payment_deadline_at) {
      try {
        await pool.query(
          `UPDATE payments
           SET payment_deadline_at = CURRENT_TIMESTAMP + INTERVAL '30 minutes',
               updateddate = CURRENT_TIMESTAMP
           WHERE orderid = $1
             AND paymentstatus = 'pending'
             AND payment_deadline_at IS NULL`,
          [orderIdNum]
        );
      } catch {
        // payment_deadline_at column อาจยังไม่มี - รัน migration: schemas/add_payment_deadline.sql
      }
    }

    return NextResponse.json({ referenceCode, orderId: orderIdNum.toString() });
  } catch (error) {
    console.error('Reference code generation error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างรหัสอ้างอิง' },
      { status: 500 }
    );
  }
}
