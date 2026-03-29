import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductImageUrl } from '@/lib/image-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;
    const email = request.nextUrl.searchParams.get('email');

    if (!reviewId || !email?.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสรีวิวและอีเมล' },
        { status: 400 }
      );
    }

    const reviewIdNum = parseInt(reviewId, 10);
    if (isNaN(reviewIdNum)) {
      return NextResponse.json({ error: 'รหัสรีวิวไม่ถูกต้อง' }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT r.reviewid, r.productid, r.variantid, r.rating, r.reviewtext, r.reviewdate,
              p.productnameth, p.productnameen,
              c.categorynameth, pv.sku, pv.price,
              (SELECT o.orderid FROM order_items oi
               JOIN inventories i ON oi.inventoryid = i.inventoryid
               JOIN orders o ON oi.orderid = o.orderid
               WHERE i.variantid = r.variantid AND o.customerid = r.customerid
               ORDER BY o.orderdate DESC LIMIT 1) AS orderid
       FROM reviews r
       JOIN products p ON r.productid = p.productid
       JOIN productvariants pv ON r.variantid = pv.variantid
       LEFT JOIN subcategories sc ON p.subcategoryid = sc.subcategoryid
       LEFT JOIN categories c ON sc.categoryid = c.categoryid
       JOIN customers cust ON r.customerid = cust.customerid
       WHERE r.reviewid = $1 AND cust.email = $2`,
      [reviewIdNum, email.trim().toLowerCase()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรีวิวหรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const row = res.rows[0];
    const review = {
      id: row.reviewid.toString(),
      productId: row.productid.toString(),
      variantId: row.variantid.toString(),
      rating: row.rating,
      reviewText: row.reviewtext || '',
      reviewDate: row.reviewdate,
      orderId: row.orderid?.toString() || null,
      productName: row.productnameth || row.productnameen || '',
      category: row.categorynameth || '',
      image: getProductImageUrl(row.sku),
      variant: row.sku,
      price: parseFloat(row.price) || 0,
    };

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Get review error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดรีวิว' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;
    const body = await request.json();
    const { email, rating, reviewText } = body;

    if (!reviewId || !email?.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสรีวิวและอีเมล' },
        { status: 400 }
      );
    }

    const reviewIdNum = parseInt(reviewId, 10);
    if (isNaN(reviewIdNum)) {
      return NextResponse.json({ error: 'รหัสรีวิวไม่ถูกต้อง' }, { status: 400 });
    }

    const custRes = await pool.query(
      `SELECT customerid FROM customers WHERE email = $1 AND isactive = true`,
      [email.trim().toLowerCase()]
    );
    if (custRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }
    const customerId = custRes.rows[0].customerid;

    const ratingNum = rating != null ? parseInt(String(rating), 10) : null;
    if (ratingNum != null && (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
      return NextResponse.json(
        { error: 'คะแนนต้องอยู่ระหว่าง 1-5' },
        { status: 400 }
      );
    }

    const text = reviewText != null ? String(reviewText).trim() : null;
    if (text != null && text.length < 10) {
      return NextResponse.json(
        { error: 'กรุณากรอกรายละเอียดรีวิวอย่างน้อย 10 ตัวอักษร' },
        { status: 400 }
      );
    }
    if (text != null && text.length > 1000) {
      return NextResponse.json(
        { error: 'รายละเอียดรีวิวต้องไม่เกิน 1000 ตัวอักษร' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (ratingNum != null) {
      updates.push(`rating = $${idx++}`);
      values.push(ratingNum);
    }
    if (text != null) {
      updates.push(`reviewtext = $${idx++}`);
      values.push(text);
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะแก้ไข' }, { status: 400 });
    }
    // แก้ไขแล้วต้องให้แอดมินอนุมัติใหม่ (หน้าสินค้าแสดงเฉพาะ isapproved = true)
    updates.push('isapproved = FALSE');
    updates.push('reviewdate = NOW()');
    values.push(reviewIdNum, customerId);
    const whereIdx = idx;
    const whereIdx2 = idx + 1;

    await pool.query(
      `UPDATE reviews SET ${updates.join(', ')} WHERE reviewid = $${whereIdx} AND customerid = $${whereIdx2}`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'แก้ไขรีวิวสำเร็จ',
    });
  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขรีวิว' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;
    const email = request.nextUrl.searchParams.get('email');

    if (!reviewId || !email?.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสรีวิวและอีเมล' },
        { status: 400 }
      );
    }

    const reviewIdNum = parseInt(reviewId, 10);
    if (isNaN(reviewIdNum)) {
      return NextResponse.json({ error: 'รหัสรีวิวไม่ถูกต้อง' }, { status: 400 });
    }

    const custRes = await pool.query(
      `SELECT customerid FROM customers WHERE email = $1 AND isactive = true`,
      [email.trim().toLowerCase()]
    );
    if (custRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }
    const customerId = custRes.rows[0].customerid;

    const delRes = await pool.query(
      `DELETE FROM reviews WHERE reviewid = $1 AND customerid = $2 RETURNING reviewid`,
      [reviewIdNum, customerId]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรีวิวหรือไม่มีสิทธิ์ลบ' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'ลบรีวิวสำเร็จ',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบรีวิว' },
      { status: 500 }
    );
  }
}
