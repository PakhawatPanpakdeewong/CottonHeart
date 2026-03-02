import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, productId, variantId, rating, reviewText } = body;

    if (!email?.trim() || !productId || !variantId || !rating) {
      return NextResponse.json(
        { error: 'กรุณาระบุอีเมล สินค้า ตัวเลือกสินค้า และคะแนน' },
        { status: 400 }
      );
    }

    const ratingNum = parseInt(String(rating), 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'คะแนนต้องอยู่ระหว่าง 1-5' },
        { status: 400 }
      );
    }

    const productIdNum = parseInt(String(productId), 10);
    const variantIdNum = parseInt(String(variantId), 10);
    if (isNaN(productIdNum) || isNaN(variantIdNum)) {
      return NextResponse.json({ error: 'รหัสสินค้าไม่ถูกต้อง' }, { status: 400 });
    }

    const text = typeof reviewText === 'string' ? reviewText.trim() : '';
    if (text.length < 10) {
      return NextResponse.json(
        { error: 'กรุณากรอกรายละเอียดรีวิวอย่างน้อย 10 ตัวอักษร' },
        { status: 400 }
      );
    }
    if (text.length > 1000) {
      return NextResponse.json(
        { error: 'รายละเอียดรีวิวต้องไม่เกิน 1000 ตัวอักษร' },
        { status: 400 }
      );
    }

    const custRes = await pool.query(
      `SELECT customerid FROM customers WHERE email = $1 AND isactive = true`,
      [email.trim().toLowerCase()]
    );
    if (custRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }
    const customerId = custRes.rows[0].customerid;

    // Check if already reviewed
    const existing = await pool.query(
      `SELECT reviewid FROM reviews WHERE productid = $1 AND variantid = $2 AND customerid = $3`,
      [productIdNum, variantIdNum, customerId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'คุณได้รีวิวสินค้านี้แล้ว' },
        { status: 400 }
      );
    }

    // Note: orderid column is optional (add via schemas/add_review_orderid.sql if needed)
    const insertRes = await pool.query(
      `INSERT INTO reviews (productid, variantid, customerid, rating, reviewtext) VALUES ($1, $2, $3, $4, $5) RETURNING reviewid`,
      [productIdNum, variantIdNum, customerId, ratingNum, text]
    );
    const reviewId = insertRes.rows[0].reviewid;

    return NextResponse.json({
      success: true,
      reviewId: reviewId.toString(),
      message: 'บันทึกรีวิวสำเร็จ',
    });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกรีวิว' },
      { status: 500 }
    );
  }
}
