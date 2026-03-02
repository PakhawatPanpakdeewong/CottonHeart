import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { confirmPaymentSuccess } from '@/lib/confirm-payment';

/**
 * ยืนยันการชำระเงินสำเร็จ (สำหรับแอดมิน)
 * - paymentstatus -> completed
 * - orderstatus -> confirmed
 * - อัปเดต inventory: reserved ลด, stock ลด
 *
 * TODO: เพิ่มการตรวจสอบสิทธิ์แอดมิน
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const orderIdNum = parseInt(orderId, 10);

    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'หมายเลขออเดอร์ไม่ถูกต้อง' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const payRes = await client.query(
        `SELECT paymentid, paymentstatus FROM payments WHERE orderid = $1 ORDER BY paymentid DESC LIMIT 1`,
        [orderIdNum]
      );

      if (payRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'ไม่พบข้อมูลการชำระเงิน' }, { status: 404 });
      }

      const pay = payRes.rows[0];
      if (pay.paymentstatus !== 'pending') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `สถานะการชำระเงินเป็น ${pay.paymentstatus} แล้ว ไม่สามารถยืนยันซ้ำได้` },
          { status: 400 }
        );
      }

      await confirmPaymentSuccess(orderIdNum, client);

      await client.query(
        `UPDATE payments SET paymentstatus = 'completed', paymentdate = CURRENT_TIMESTAMP, updateddate = CURRENT_TIMESTAMP WHERE orderid = $1`,
        [orderIdNum]
      );

      await client.query(
        `UPDATE orders SET orderstatus = 'confirmed', updateddate = CURRENT_TIMESTAMP WHERE orderid = $1`,
        [orderIdNum]
      );

      await client.query('COMMIT');

      return NextResponse.json({ success: true, message: 'ยืนยันการชำระเงินสำเร็จ' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน' },
      { status: 500 }
    );
  }
}
