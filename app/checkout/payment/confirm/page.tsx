'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { CheckCircle, MessageCircle, ExternalLink, ChevronUp, Check } from 'lucide-react';

const SHIPPING_COST = 50;

// รูป Set B - ขั้นตอนการยืนยันการโอนใน Line Chat
// ใช้ไฟล์รูปที่วางไว้ในโฟลเดอร์ public root
// เช่น public/B2.png จะเข้าถึงได้ผ่าน path '/B2.png'
const B2Img = '/B2.png';
const B3Img = '/B3.png';
const B4Img = '/B4.png';
const B5Img = '/B5.png';

// รูป Set F - ขั้นตอนการยืนยันการโอนใน Facebook Chat (public/F1.png, public/F2.png)
const F1Img = '/F1.png';
const F2Img = '/F2.png';

interface OrderDetail {
  orderId: string;
  totalAmount: number;
  referenceCode: string | null;
  shippingAddress?: string;
  recipientName?: string;
  paymentDeadlineAt?: string | null;
}

const LINE_URL = 'https://line.me/R/ti/p/@040gdsbn';
const MESSENGER_URL = 'https://www.facebook.com/people/KiddyCare/61577838044872/';

function PaymentConfirmPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { user, isAuthenticated, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ min: number; sec: number } | null>(null);
  const [expired, setExpired] = useState(false);

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
          paymentDeadlineAt: o.paymentDeadlineAt || null,
        });
      })
      .catch((err) => setError(err.message || 'เกิดข้อผิดพลาด'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, orderId, email]);

  // Countdown timer - สูงสุด 30 นาที นับถอยหลัง
  useEffect(() => {
    if (!order?.paymentDeadlineAt) return;
    const deadline = new Date(order.paymentDeadlineAt).getTime();
    const MAX_SECONDS = 30 * 60; // 30 นาที
    const tick = () => {
      const now = Date.now();
      let diff = Math.floor((deadline - now) / 1000);
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ min: 0, sec: 0 });
        return;
      }
      // จำกัดสูงสุด 30 นาที (แก้ปัญหา timezone ที่อาจทำให้แสดงผิด)
      diff = Math.min(diff, MAX_SECONDS);
      setTimeLeft({ min: Math.floor(diff / 60), sec: diff % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order?.paymentDeadlineAt]);

  // เตือนเมื่อผู้ใช้พยายามปิดแท็บ / รีเฟรช / ใช้ปุ่มย้อนกลับของเบราว์เซอร์
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
          {(order.paymentDeadlineAt && (timeLeft != null || expired)) && (
            <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800">
                เหลือเวลาชำระเงิน:{' '}
                <span className="font-mono font-bold">
                  {expired ? (
                    <span className="text-red-600">หมดเวลา</span>
                  ) : timeLeft ? (
                    `${timeLeft.min} นาที ${timeLeft.sec} วินาที`
                  ) : (
                    '—'
                  )}
                </span>
              </p>
              {expired && (
                <p className="text-xs text-red-600 mt-1">
                  ออเดอร์อาจถูกยกเลิกอัตโนมัติ กรุณาติดต่อแอดมินหากต้องการชำระเงิน
                </p>
              )}
            </div>
          )}
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
            href="/profile"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition-colors"
          >
            <Check className="w-5 h-5" />
            เสร็จสิ้น
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
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={B2Img} alt="ขั้นตอน 1-2 - เลือกเมนูเพิ่มหลักฐานการชำระเงิน" className="w-full h-auto" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 3</p>
              <p className="text-sm text-gray-600 mb-2">ส่งเลขยืนยันการโอนชำระ (รหัส 6 หลักด้านบน) ในช่องแชท</p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={B3Img} alt="ขั้นตอน 3 - ส่งเลขยืนยันการโอน" className="w-full h-auto" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 4</p>
              <p className="text-sm text-gray-600 mb-2">จากนั้นให้ส่งรูปหลักฐานการโอนหรือสลิปในช่องแชท</p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={B4Img} alt="ขั้นตอน 4 - ส่งสลิปการโอน" className="w-full h-auto" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 5</p>
              <p className="text-sm text-gray-600 mb-2">ระบบจะทำการตรวจสอบข้อมูลไม่เกิน 5 นาทีและจะทำการตอบกลับสถานะการชำระอีกครั้ง</p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={B5Img} alt="ขั้นตอน 5 - ยืนยันการชำระ" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Facebook Chat Tutorial - ขั้นตอนการยืนยันการโอนชำระใน Facebook Chat */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            ขั้นตอนการยืนยันการโอนชำระใน Facebook Chat
          </h2>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 1</p>
              <p className="text-sm text-gray-600 mb-2">
                เปิดแชท Facebook Messenger ของร้าน พิมพ์คำว่า "แนบสลิป" ระบบจะแจ้งให้กรอกเลขยืนยันการโอนชำระ เมื่อจากนั้นส่งเลขยืนยันการโอนชำระ (รหัส 6 หลักด้านบน) ในช่องแชท
              </p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={F1Img} alt="ขั้นตอน 1 - ส่งเลขยืนยันการโอนใน Facebook Chat" className="w-full h-auto" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">ขั้นตอนที่ 2</p>
              <p className="text-sm text-gray-600 mb-2">
                ต่อมาให้ส่งรูปหลักฐานการโอนหรือสลิปในช่องแชท ร้านจะตรวจสอบและตอบกลับสถานะการชำระ
              </p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={F2Img} alt="ขั้นตอน 2 - ส่งสลิปการโอนใน Facebook Chat" className="w-full h-auto" />
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

export default function PaymentConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
          <div className="text-gray-500">กำลังโหลด...</div>
        </div>
      }
    >
      <PaymentConfirmPageInner />
    </Suspense>
  );
}
