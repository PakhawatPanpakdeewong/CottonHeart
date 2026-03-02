import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุอีเมลล์' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT firstname, lastname, phonenumber, gender, dateofbirth, email 
       FROM customers 
       WHERE email = $1 AND isactive = true`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ fullName: null, phone: null }, { status: 200 });
    }

    const row = result.rows[0];
    const fullName = [row.firstname, row.lastname].filter(Boolean).join(' ').trim() || null;
    const phone = row.phonenumber || null;
    const gender = row.gender || null;
    const dateOfBirth = row.dateofbirth ? new Date(row.dateofbirth).toISOString().slice(0, 10) : null;
    const emailVal = row.email || null;

    return NextResponse.json({
      fullName,
      phone,
      firstName: row.firstname || '',
      lastName: row.lastname || '',
      gender,
      dateOfBirth,
      email: emailVal,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, phone } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุอีเมลล์' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE customers 
       SET firstname = COALESCE($2, firstname),
           lastname = COALESCE($3, lastname),
           phonenumber = COALESCE($4, phonenumber)
       WHERE email = $1 AND isactive = true
       RETURNING customerid`,
      [
        email.trim().toLowerCase(),
        firstName?.trim() || null,
        lastName?.trim() || null,
        phone?.trim() || null,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}
