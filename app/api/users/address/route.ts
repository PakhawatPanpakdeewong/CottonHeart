import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

function mapAddressRow(row: Record<string, unknown>) {
  return {
    id: row.addressid,
    addressLine1: row.addressline1 || '',
    subDistrict: row.city || row.addressline2 || '',
    postalCode: row.zipcode || '',
    province: row.state || '',
    isDefault: row.isdefault || false,
  };
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email?.trim()) {
      return NextResponse.json({ address: null, addresses: [] }, { status: 200 });
    }

    const customerResult = await pool.query(
      'SELECT customerid FROM customers WHERE email = $1 AND isactive = true',
      [email.trim().toLowerCase()]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ address: null, addresses: [] }, { status: 200 });
    }

    const customerId = customerResult.rows[0].customerid;

    try {
      const addressResult = await pool.query(
        `SELECT addressid, addressline1, addressline2, city, state, zipcode, isdefault 
         FROM addresses 
         WHERE customerid = $1 AND addresstype = 'shipping' 
         ORDER BY isdefault DESC, createddate DESC`,
        [customerId]
      );

      if (addressResult.rows.length === 0) {
        return NextResponse.json({ address: null, addresses: [] }, { status: 200 });
      }

      const addresses = addressResult.rows.map((r) => mapAddressRow(r));
      const primary = addresses[0];

      return NextResponse.json({
        address: primary ? {
          addressLine1: primary.addressLine1,
          subDistrict: primary.subDistrict,
          postalCode: primary.postalCode,
          province: primary.province,
        } : null,
        addresses,
      });
    } catch {
      return NextResponse.json({ address: null, addresses: [] }, { status: 200 });
    }
  } catch (error) {
    console.error('Address fetch error:', error);
    return NextResponse.json({ address: null, addresses: [] }, { status: 200 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, addressId, addressLine1, subDistrict, postalCode, province, isDefault } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุอีเมลล์' }, { status: 400 });
    }
    if (!addressId) {
      return NextResponse.json({ error: 'กรุณาระบุที่อยู่ที่ต้องการแก้ไข' }, { status: 400 });
    }

    const customerResult = await pool.query(
      'SELECT customerid FROM customers WHERE email = $1 AND isactive = true',
      [email.trim().toLowerCase()]
    );
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 404 });
    }
    const customerId = customerResult.rows[0].customerid;

    await pool.query(
      `UPDATE addresses 
       SET addressline1 = COALESCE($2, addressline1),
           city = COALESCE($3, city),
           state = COALESCE($4, state),
           zipcode = COALESCE($5, zipcode),
           isdefault = COALESCE($6, isdefault),
           updateddate = CURRENT_TIMESTAMP
       WHERE addressid = $1 AND customerid = $7 AND addresstype = 'shipping'`,
      [
        addressId,
        addressLine1?.trim() || null,
        subDistrict?.trim() || null,
        province?.trim() || null,
        postalCode?.trim() || null,
        isDefault ?? null,
        customerId,
      ]
    );

    if (isDefault) {
      await pool.query(
        `UPDATE addresses SET isdefault = false 
         WHERE customerid = $1 AND addresstype = 'shipping' AND addressid != $2`,
        [customerId, addressId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Address update error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, addressLine1, subDistrict, postalCode, province, isDefault } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุอีเมลล์' }, { status: 400 });
    }
    if (!addressLine1?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกที่อยู่' }, { status: 400 });
    }
    if (!subDistrict?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกแขวง/ตำบล' }, { status: 400 });
    }
    if (!postalCode?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสไปรษณีย์' }, { status: 400 });
    }
    if (!province?.trim()) {
      return NextResponse.json({ error: 'กรุณาเลือกจังหวัด' }, { status: 400 });
    }

    const customerResult = await pool.query(
      'SELECT customerid FROM customers WHERE email = $1 AND isactive = true',
      [email.trim().toLowerCase()]
    );
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 404 });
    }
    const customerId = customerResult.rows[0].customerid;

    // ไม่จำกัดจำนวนที่อยู่ - 1 account สามารถมีที่อยู่การจัดส่งได้หลายที่

    const result = await pool.query(
      `INSERT INTO addresses (customerid, addresstype, addressline1, city, state, zipcode, isdefault)
       VALUES ($1, 'shipping', $2, $3, $4, $5, $6)
       RETURNING addressid`,
      [
        customerId,
        addressLine1.trim(),
        subDistrict.trim(),
        province.trim(),
        postalCode.trim(),
        !!isDefault,
      ]
    );

    return NextResponse.json({ success: true, addressId: result.rows[0].addressid });
  } catch (error) {
    console.error('Address create error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}
