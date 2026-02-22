import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุอีเมลล์' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT firstname, lastname, phonenumber 
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

    return NextResponse.json({ fullName, phone });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' },
      { status: 500 }
    );
  }
}
