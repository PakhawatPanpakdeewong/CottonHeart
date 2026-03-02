import pool from '@/lib/db';
import type { PoolClient } from 'pg';

/**
 * เมื่อลูกค้าจ่ายเงินสำเร็จ: reservedquantity หายไป, stockquantity ลดลง
 * เรียกใช้เมื่ออัปเดต paymentstatus เป็น 'completed'
 * @param orderId - orderid
 * @param client - ถ้าระบุ จะใช้ client เดิม (อยู่ใน transaction) ไม่ commit/release เอง
 */
export async function confirmPaymentSuccess(
  orderId: number,
  client?: PoolClient
): Promise<void> {
  const ownClient = !client;
  const c = client ?? (await pool.connect());

  try {
    if (ownClient) await c.query('BEGIN');

    // reserved ลด (สินค้าที่จองถูกขายแล้ว), stock ลด (สินค้าออกจากคลัง)
    await c.query(
      `UPDATE inventories i
       SET reservedquantity = reservedquantity - oi.quantityordered,
           stockquantity = stockquantity - oi.quantityordered,
           updateddate = CURRENT_TIMESTAMP
       FROM order_items oi
       WHERE oi.inventoryid = i.inventoryid AND oi.orderid = $1`,
      [orderId]
    );

    if (ownClient) await c.query('COMMIT');
  } catch (err) {
    if (ownClient) await c.query('ROLLBACK');
    throw err;
  } finally {
    if (ownClient) c.release();
  }
}
