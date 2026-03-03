import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const SHIPPING_COST = 50;

interface CartItemInput {
  id: string; // product id
  sku?: string | null;
  variantId?: number;
  quantity: number;
  price: number;
}

interface CheckoutBody {
  email: string;
  fullName: string;
  phone: string;
  addressId?: number;
  addressLine1?: string;
  subDistrict?: string;
  postalCode?: string;
  province?: string;
  items: CartItemInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutBody = await request.json();
    const {
      email,
      fullName,
      phone,
      addressId,
      addressLine1,
      subDistrict,
      postalCode,
      province,
      items,
    } = body;

    if (!email?.trim() || !fullName?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วน' },
        { status: 400 }
      );
    }

    let shippingAddressText: string;
    if (addressId) {
      const addrRes = await pool.query(
        `SELECT addressline1, city, state, zipcode FROM addresses 
         WHERE addressid = $1 AND customerid = (SELECT customerid FROM customers WHERE email = $2 AND isactive = true)`,
        [addressId, email.trim().toLowerCase()]
      );
      if (addrRes.rows.length === 0) {
        return NextResponse.json({ error: 'ไม่พบที่อยู่ที่เลือก กรุณาเลือกที่อยู่ใหม่' }, { status: 400 });
      }
      const a = addrRes.rows[0];
      shippingAddressText = `${a.addressline1 || ''}, ${a.city || ''}, ${a.zipcode || ''}, ${a.state || ''}`;
    } else if (addressLine1?.trim() && subDistrict?.trim() && postalCode?.trim() && province?.trim()) {
      shippingAddressText = `${addressLine1.trim()}, ${subDistrict.trim()}, ${postalCode.trim()}, ${province.trim()}`;
    } else {
      return NextResponse.json(
        { error: 'กรุณากรอกที่อยู่การจัดส่งให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (!items?.length) {
      return NextResponse.json(
        { error: 'ไม่มีรายการสินค้าในตะกร้า' },
        { status: 400 }
      );
    }

    // 1. Get customer (outside transaction)
    const customerRes = await pool.query(
      'SELECT customerid FROM customers WHERE email = $1 AND isactive = true',
      [email.trim().toLowerCase()]
    );
    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า กรุณาเข้าสู่ระบบใหม่' }, { status: 400 });
    }
    const customerId = customerRes.rows[0].customerid;

    // 2. Address - insert เฉพาะเมื่อใช้ที่อยู่ใหม่ (ไม่มี addressId)
    if (!addressId && addressLine1?.trim() && subDistrict?.trim() && postalCode?.trim() && province?.trim()) {
      try {
        await pool.query(
          `INSERT INTO addresses (addresstype, addressline1, addressline2, city, state, zipcode, isdefault, customerid)
           VALUES ('shipping', $1, $2, $3, $4, $5, false, $6)`,
          [addressLine1.trim(), subDistrict.trim(), subDistrict.trim(), province.trim(), postalCode.trim(), customerId]
        );
      } catch {
        // ข้ามถ้า addresses ยังไม่มีคอลัมน์ customerid
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 3. Order - create
      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const totalAmount = subtotal + SHIPPING_COST;

      const orderRes = await client.query(
        `INSERT INTO orders (customerid, totalamount, shippingaddress, orderstatus)
         VALUES ($1, $2, $3, 'pending')
         RETURNING orderid`,
        [customerId, totalAmount, shippingAddressText]
      );
      const orderId = orderRes.rows[0].orderid;

      // 4. Order items + 6. Update inventories
      for (const item of items) {
        const productId = parseInt(item.id, 10);
        if (isNaN(productId)) continue;

        // Get variant: by sku or first variant of product
        let variantRes;
        if (item.sku?.trim()) {
          variantRes = await client.query(
            'SELECT variantid, price FROM productvariants WHERE productid = $1 AND sku = $2 AND isactive = true',
            [productId, item.sku.trim()]
          );
        }
        if (!variantRes || variantRes.rows.length === 0) {
          variantRes = await client.query(
            'SELECT variantid, price FROM productvariants WHERE productid = $1 AND isactive = true ORDER BY price ASC LIMIT 1',
            [productId]
          );
        }

        if (variantRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: `ไม่พบ variant สำหรับสินค้า ID ${productId} หรือสินค้ารายการนี้ปิดใช้งานแล้ว` },
            { status: 400 }
          );
        }

        const variantId = variantRes.rows[0].variantid;
        const unitPrice = item.price;
        const qty = Math.max(1, Math.floor(item.quantity));

        // Get inventory for variant (เฉพาะ variant ที่เปิดใช้งานเท่านั้น - ไม่รับคำสั่งซื้อ variant ปิดใช้งานแม้มีของในคลัง)
        let invRes = await client.query(
          `SELECT i.inventoryid, i.availablequantity
           FROM inventories i
           JOIN productvariants pv ON i.variantid = pv.variantid AND pv.isactive = true
           WHERE i.variantid = $1 AND i.availablequantity >= $2
           ORDER BY i.availablequantity DESC LIMIT 1`,
          [variantId, qty]
        );

        if (invRes.rows.length === 0) {
          invRes = await client.query(
            `SELECT i.inventoryid, i.availablequantity
             FROM inventories i
             JOIN productvariants pv ON i.variantid = pv.variantid AND pv.isactive = true
             WHERE i.variantid = $1 LIMIT 1`,
            [variantId]
          );
        }

        if (invRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: `สินค้าไม่เพียงพอในคลังหรือสินค้ารายการนี้ปิดใช้งานแล้ว (product ${productId})` },
            { status: 400 }
          );
        }

        const inv = invRes.rows[0];

        const inventoryId = inv.inventoryid;

        // Insert order_item (รวม totalprice เผื่อ DB ไม่มี GENERATED column)
        const totalPrice = qty * unitPrice;
        await client.query(
          `INSERT INTO order_items (orderid, inventoryid, quantityordered, unitprice, totalprice)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, inventoryId, qty, unitPrice, totalPrice]
        );

        // Update inventory: availablequantity → reservedquantity (สั่งซื้อ = จองสินค้า)
        await client.query(
          `UPDATE inventories
           SET availablequantity = availablequantity - $1,
               reservedquantity = reservedquantity + $1,
               updateddate = CURRENT_TIMESTAMP
           WHERE inventoryid = $2`,
          [qty, inventoryId]
        );
      }

      // 5. Payment - create (pending)
      await client.query(
        `INSERT INTO payments (orderid, paymentamount, paymentmethod, paymentstatus)
         VALUES ($1, $2, 'bank_transfer', 'pending')`,
        [orderId, totalAmount]
      );

      // 2 (cont). Shipments - create
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + 3);
      await client.query(
        `INSERT INTO shipments (orderid, shippingcarrier, deliverystatus, shippingcost, estimatedshipsdate)
         VALUES ($1, 'Thai Post EMS', 'pending', $2, $3)`,
        [orderId, SHIPPING_COST, estDate]
      );

      // Update customer last order date
      await client.query(
        'UPDATE customers SET lastorderdate = CURRENT_TIMESTAMP WHERE customerid = $1',
        [customerId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        orderId,
        message: 'บันทึกคำสั่งซื้อสำเร็จ',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
