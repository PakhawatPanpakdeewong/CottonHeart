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

    // ตรวจสอบ ownership และดึง order
    const orderRes = await pool.query(
      `SELECT o.orderid FROM orders o
       JOIN customers c ON o.customerid = c.customerid
       WHERE o.orderid = $1 AND c.email = $2 AND c.isactive = true`,
      [orderIdNum, email.trim().toLowerCase()]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบคำสั่งซื้อหรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const referenceCode = generateReferenceCode();

    await pool.query(
      `UPDATE orders SET notes = $1, updateddate = CURRENT_TIMESTAMP WHERE orderid = $2`,
      [referenceCode, orderIdNum]
    );

    return NextResponse.json({ referenceCode, orderId: orderIdNum.toString() });
  } catch (error) {
    console.error('Reference code generation error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างรหัสอ้างอิง' },
      { status: 500 }
    );
  }
}
