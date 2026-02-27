'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { CheckCircle, MessageCircle, ExternalLink, ChevronUp } from 'lucide-react';

const SHIPPING_COST = 50;

// รูป Set B - ขั้นตอนการยืนยันการโอนใน Line Chat
import B3Img from '@/components/Pic/B3.png';
import B4Img from '@/components/Pic/B4.png';
import B5Img from '@/components/Pic/B5.png';

interface OrderDetail {
  orderId: string;
  totalAmount: number;
  referenceCode: string | null;
  shippingAddress?: string;
  recipientName?: string;
}

const LINE_URL = 'https://line.me/R/ti/p/@cottonheart';
const MESSENGER_URL = 'https://m.me/cottonheart';

export default function PaymentConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { user, isAuthenticated, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const email = useMemo(() => {
    if (!user) return '';
    return user.username?.includes('@') ? user.username : user.email || user.username || '';
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/checkout/payment/confirm${orderId ? `?orderId=${orderId}` : ''}`)}`);
    }
  }, [isAuthenticated, isLoading, router, orderId]);

  useEffect(() => {
    if (!isAuthenticated || !user || !orderId) {
      if (orderId) setLoading(true);
      else setError('ไม่พบหมายเลขออร์เดอร์');
      return;
    }
    if (!email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/users/orders/${orderId}?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || 'โหลดไม่สำเร็จ')));
        return res.json();
      })
      .then((data) => {
        const o = data.order;
        setOrder({
          orderId: o.orderId,
          totalAmount: parseFloat(o.totalAmount) || 0,
          referenceCode: o.referenceCode || null,
          shippingAddress: o.shippingAddress,
          recipientName: o.recipientName,
        });
      })
      .catch((err) => setError(err.message || 'เกิดข้อผิดพลาด'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, orderId, email]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-12">
          <p className="text-gray-600 mb-6">ไม่พบหมายเลขออร์เดอร์ กรุณาเริ่มต้นจากหน้าการชำระเงิน</p>
          <Link
            href="/checkproduct"
            className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
          >
            ไปช้อปปิ้ง
          </Link>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-6 pb-24">
          <div className="text-center text-gray-500 py-12">กำลังโหลดข้อมูล...</div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-6 pb-24">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">{error || 'ไม่พบคำสั่งซื้อ'}</p>
            <Link
              href="/profile"
              className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
            >
              กลับไปโปรไฟล์
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // กรณียังไม่มีรหัสอ้างอิง (user เข้ามาตรงๆ ไม่ผ่าน payment 1)
  if (!order.referenceCode) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-6 pb-24">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">กรุณาเริ่มต้นจากหน้าการชำระเงินและกดดำเนินการต่อเพื่อสร้างรหัสอ้างอิง</p>
            <Link
              href={`/checkout/payment?orderId=${orderId}`}
              className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
            >
              ไปหน้าการชำระเงิน
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const refDigits = order.referenceCode.split('');

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      {/* Page Title */}
      <div className="max-w-md mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ข้อมูลการชำระเงิน</h1>
        <div className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">ร้านค้า</Link>
          <span className="mx-2">/</span>
          <span>วิธีการชำระเงิน</span>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pb-32">
        {/* Confirm Transfer Section */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">ยืนยันการโอนชำระ</h2>
              <p className="text-sm text-gray-600 mt-1">
                ส่งหลักฐานการชำระเงินโดยการแจ้งเลขต่อไปนี้
              </p>
            </div>
          </div>

          {/* 6-digit reference code boxes */}
          <div className="flex justify-center gap-2 mb-4">
            {refDigits.map((char, i) => (
              <div
                key={i}
                className="w-12 h-14 rounded-lg bg-green-500 flex items-center justify-center text-white text-xl font-bold"
              >
                {char}
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 mb-3">
            โปรดจำตัวเลขเหล่านี้เพื่อใช้ในการยืนยันออร์เดอร์ โดยเมื่อโอนชำระเสร็จสิ้นให้ส่งสลิปการโอนในเว็บไซต์หรือแชทของร้านค้า
          </p>
          <p className="text-xs text-red-500 font-medium">
            *ต้องส่งหลักฐานการชำระเงินภายใน 30 นาที ถ้าทำไม่เสร็จสิ้นกรุณาติดต่อแอดมิน
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-green-500 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            ไปที่ Line Chat
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-blue-400 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            ไปที่ Messenger Chat
            <ExternalLink className="w-4 h-4" />
          </a>
          <Link
            href={`/orders/${orderId}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition-colors"
          >
            เพิ่มหลักฐานการชำระเงินบนเว็บไซต์
          </Link>
        </div>

        {/* Line Chat Tutorial - ขั้นตอนการยืนยันการโอนชำระใน Line Chat */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            ขั้นตอนการยืนยันการโอนชำระใน Line Chat
          </h2>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 1-2</p>
              <p className="text-sm text-gray-600 mb-2">เข้าไปที่หน้าแชทของร้าน คลิกเมนู และกดเพิ่มหลักฐานการชำระเงิน</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 3</p>
              <p className="text-sm text-gray-600 mb-2">ส่งเลขยืนยันการโอนชำระ (รหัส 6 หลักด้านบน) ในช่องแชท</p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={B3Img.src} alt="ขั้นตอน 3 - ส่งเลขยืนยันการโอน" className="w-full h-auto" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 4</p>
              <p className="text-sm text-gray-600 mb-2">จากนั้นให้ส่งรูปหลักฐานการโอนหรือสลิปในช่องแชท</p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={B4Img.src} alt="ขั้นตอน 4 - ส่งสลิปการโอน" className="w-full h-auto" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 5</p>
              <p className="text-sm text-gray-600 mb-2">ระบบจะทำการตรวจสอบข้อมูลไม่เกิน 5 นาทีและจะทำการตอบกลับสถานะการชำระอีกครั้ง</p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={B5Img.src} alt="ขั้นตอน 5 - ยืนยันการชำระ" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          <ChevronUp className="w-4 h-4" />
          กลับสู่ด้านบน
        </button>
      </main>
    </div>
  );
}
