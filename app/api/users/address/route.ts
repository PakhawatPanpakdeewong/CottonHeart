import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email?.trim()) {
      return NextResponse.json({ address: null }, { status: 200 });
    }

    // Get customer by email
    const customerResult = await pool.query(
      'SELECT customerid FROM customers WHERE email = $1 AND isactive = true',
      [email.trim().toLowerCase()]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ address: null }, { status: 200 });
    }

    const customerId = customerResult.rows[0].customerid;

    // Try to get address - Addresses table may have CustomerID (added via migration)
    // Map: AddressLine1, City (แขวง/ตำบล), State (จังหวัด), ZipCode
    try {
      const addressResult = await pool.query(
        `SELECT addressline1, addressline2, city, state, zipcode 
         FROM addresses 
         WHERE customerid = $1 AND addresstype = 'shipping' 
         ORDER BY isdefault DESC, createddate DESC 
         LIMIT 1`,
        [customerId]
      );

      if (addressResult.rows.length === 0) {
        return NextResponse.json({ address: null }, { status: 200 });
      }

      const row = addressResult.rows[0];
      // Map: AddressLine1, City (แขวง/ตำบล), State (จังหวัด), ZipCode
      const address = {
        addressLine1: row.addressline1 || '',
        subDistrict: row.city || row.addressline2 || '',
        postalCode: row.zipcode || '',
        province: row.state || '',
      };

      return NextResponse.json({ address });
    } catch {
      // ตาราง addresses ยังไม่มีคอลัมน์ customerid - return null (รัน migration ก่อน)
      return NextResponse.json({ address: null }, { status: 200 });
    }
  } catch (error) {
    console.error('Address fetch error:', error);
    return NextResponse.json({ address: null }, { status: 200 });
  }
}
