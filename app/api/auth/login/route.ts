import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail?.trim() || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลล์และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const input = usernameOrEmail.trim().toLowerCase();

    // Look up customer by email (ต้องใช้อีเมลล์เพื่อให้ checkout หาลูกค้าได้ถูกต้อง)
    const result = await pool.query(
      `SELECT customerid, firstname, lastname, email, passwordhash
       FROM customers
       WHERE LOWER(email) = $1 AND isactive = true`,
      [input]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'อีเมลล์หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    const customer = result.rows[0];
    const isValid = await bcrypt.compare(password, customer.passwordhash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'อีเมลล์หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: customer.customerid,
        username: customer.email,
        email: customer.email,
        firstName: customer.firstname,
        lastName: customer.lastname,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
