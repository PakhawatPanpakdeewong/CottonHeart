'use client';

import Link from 'next/link';
import Header from '@/components/Header';

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />
      <main className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ข้อมูลการชำระเงิน</h1>
        <p className="text-gray-600 mb-6">
          หน้านี้จะแสดงตัวเลือกการชำระเงิน (กำลังพัฒนา)
        </p>
        <Link
          href="/checkout/delivery"
          className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
        >
          ย้อนกลับ
        </Link>
      </main>
    </div>
  );
}
