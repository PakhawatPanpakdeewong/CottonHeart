import pool from '@/lib/db';

/**
 * ยกเลิกออเดอร์ที่เกิน 30 นาทีแล้วยังไม่ชำระเงิน
 * - orderstatus -> cancelled
 * - paymentstatus -> failed
 * - คืนสต็อก: reservedquantity → availablequantity
 */
export async function expireOverduePayments(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const expiredRes = await client.query(
      `SELECT p.orderid
       FROM payments p
       JOIN orders o ON o.orderid = p.orderid
       WHERE p.paymentstatus = 'pending'
         AND p.payment_deadline_at IS NOT NULL
         AND p.payment_deadline_at < CURRENT_TIMESTAMP
         AND o.orderstatus != 'cancelled'`
    );

    for (const row of expiredRes.rows) {
      const orderId = row.orderid;

      // คืนสต็อก: reservedquantity → availablequantity (จ่ายไม่สำเร็จ = คืนของที่จอง)
      await client.query(
        `UPDATE inventories i
         SET reservedquantity = reservedquantity - oi.quantityordered,
             availablequantity = availablequantity + oi.quantityordered,
             updateddate = CURRENT_TIMESTAMP
         FROM order_items oi
         WHERE oi.inventoryid = i.inventoryid AND oi.orderid = $1`,
        [orderId]
      );

      await client.query(
        `UPDATE orders SET orderstatus = 'cancelled', updateddate = CURRENT_TIMESTAMP WHERE orderid = $1`,
        [orderId]
      );

      await client.query(
        `UPDATE payments SET paymentstatus = 'failed', updateddate = CURRENT_TIMESTAMP WHERE orderid = $1`,
        [orderId]
      );
    }

    await client.query('COMMIT');
    return expiredRes.rows.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
