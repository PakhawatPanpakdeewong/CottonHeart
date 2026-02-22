import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

// Map Thai gender values to database values
const GENDER_MAP: Record<string, string | null> = {
  'ชาย': 'male',
  'หญิง': 'female',
  'ไม่ต้องการระบุ': null,
};

// Password validation: 10-16 chars, English/special chars, at least 1 digit
function validatePassword(password: string): boolean {
  if (password.length < 10 || password.length > 16) return false;
  if (!/\d/.test(password)) return false;
  if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password)) return false;
  return true;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      email,
      phone,
      password,
      confirmPassword,
    } = body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim() || !dateOfBirth || !email?.trim() || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลล์ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Validate password
    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมี 10-16 ตัวอักษร ใช้ภาษาอังกฤษหรืออักขระพิเศษ และต้องมีตัวเลขอย่างน้อย 1 ตัว' },
        { status: 400 }
      );
    }

    // Validate password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบรหัสผ่านใหม่' },
        { status: 400 }
      );
    }

    // Map gender (optional)
    const dbGender = gender ? GENDER_MAP[gender] ?? null : null;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into Customers table
    // PostgreSQL converts unquoted identifiers to lowercase
    const query = `
      INSERT INTO customers (
        firstname,
        lastname,
        email,
        passwordhash,
        phonenumber,
        gender,
        dateofbirth
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING customerid, firstname, lastname, email, registrationdate
    `;

    const values = [
      firstName.trim(),
      lastName.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      phone?.trim() || null,
      dbGender,
      dateOfBirth || null,
    ];

    const result = await pool.query(query, values);
    const customer = result.rows[0];

    return NextResponse.json(
      {
        message: 'ลงทะเบียนสำเร็จ',
        customer: {
          id: customer.customerid,
          firstName: customer.firstname,
          lastName: customer.lastname,
          email: customer.email,
          registrationDate: customer.registrationdate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Handle unique constraint violation (duplicate email)
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json(
        { error: 'อีเมลล์นี้ถูกใช้งานแล้ว กรุณาใช้อีเมลล์อื่น' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
