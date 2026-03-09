'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { CreditCard, Smartphone, FileCheck } from 'lucide-react';

// เดิมเคย import รูปจาก '@/components/Pic/S__11124767.jpg' แต่ไฟล์รูปไม่อยู่ในโปรเจกต์แล้ว
// เลยเปลี่ยนมาใช้ path ไปยังโฟลเดอร์ public แทน
const KPlusQrImage = '/images/S__11124767.jpg';

const SHIPPING_COST = 50;

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  image: string | null;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetail {
  orderId: string;
  totalAmount: number;
  shippingCost: number;
  subtotal: number;
  items: OrderItem[];
}

// ข้อมูลบัญชีธนาคาร (ตัวอย่าง - แก้ไขตามข้อมูลจริง)
const BANK_ACCOUNTS = {
  kasikorn: {
    name: 'ธนาคารกสิกรไทย',
    logo: '🏦',
    accountNumber: 'xxx-x-x4450-x',
    accountNameTh: 'น.ส. ปณาลี จุกสีดา',
    accountNameEn: 'Ms.Panalee Juksida',
  },
};

function PaymentPageInner() {
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
      router.push(`/login?returnUrl=${encodeURIComponent(`/checkout/payment${orderId ? `?orderId=${orderId}` : ''}`)}`);
    }
  }, [isAuthenticated, isLoading, router, orderId]);

  useEffect(() => {
    if (!isAuthenticated || !user || !orderId) {
      if (orderId) {
        setLoading(true);
      } else {
        setLoading(false);
        setError('ไม่พบหมายเลขออร์เดอร์');
      }
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
          totalAmount: o.totalAmount ?? o.subtotal + (o.shippingCost ?? SHIPPING_COST),
          shippingCost: o.shippingCost ?? SHIPPING_COST,
          subtotal: o.subtotal ?? o.items?.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0) ?? 0,
          items: o.items ?? [],
        });
      })
      .catch((err) => setError(err.message || 'เกิดข้อผิดพลาด'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, orderId, email]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);

  // เตือนเมื่อผู้ใช้พยายามปิดแท็บ / รีเฟรช / ใช้ปุ่มย้อนกลับของเบราว์เซอร์
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // ถ้ากำลังยกเลิกหรือ submit อยู่แล้ว ไม่ต้องเตือนซ้ำ
      if (isSubmitting || isCancelling) return;
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting, isCancelling]);

  const requestLeavePage = (href: string) => {
    if (isSubmitting || isCancelling) return;
    setPendingLeaveHref(href);
  };

  const confirmLeavePage = () => {
    if (!pendingLeaveHref) return;
    const target = pendingLeaveHref;
    setPendingLeaveHref(null);
    router.push(target);
  };

  const cancelLeaveRequest = () => {
    setPendingLeaveHref(null);
  };

  const handleContinue = async () => {
    if (!orderId || !email) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/reference-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      router.push(`/checkout/payment/confirm?orderId=${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ปุ่มย้อนกลับ (ยกเลิกคำสั่งซื้อ) ถูกตัดออกตามความต้องการของผู้ใช้

  // เลขที่อ้างอิง (reference id) สำหรับแสดงในหน้าจอเท่านั้น
  const qrReferenceId = orderId ? `${orderId.padStart(15, '0')}` : '004999058470542';

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
          <p className="text-gray-600 mb-6">ไม่พบหมายเลขออร์เดอร์ กรุณาเริ่มต้นจากการสั่งซื้อใหม่</p>
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
          <div className="text-center text-gray-500 py-12">กำลังโหลดข้อมูลการชำระเงิน...</div>
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

  const totalProduct = order.subtotal;
  const totalPay = order.totalAmount;

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      {/* Page Title and Breadcrumbs */}
      <div className="max-w-md mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ข้อมูลการชำระเงิน</h1>
        <div className="text-sm text-gray-500 mb-4">
          <button
            type="button"
            onClick={() => requestLeavePage('/')}
            className="hover:text-gray-700 text-gray-500"
          >
            ร้านค้า
          </button>
          <span className="mx-2">/</span>
          <span>วิธีการชำระเงิน</span>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pb-32">
        {/* Payment Method Selection */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">เลือกวิธีการชำระเงิน</h2>
          <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-pink-500 bg-pink-50">
            <Smartphone className="w-5 h-5 text-pink-500 flex-shrink-0" />
            <span className="font-medium text-gray-900">โอนเงินผ่านแอปธนาคาร / สแกน QR</span>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ยอดรวมค่าสินค้า</span>
              <span className="text-gray-900 font-medium">฿ {totalProduct.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ค่าจัดส่ง (ขั้นต้น)</span>
              <span className="text-gray-900 font-medium">฿ {order.shippingCost.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="text-base font-semibold text-gray-900">ยอดที่ต้องชำระ</span>
              <span className="text-lg font-bold text-pink-500">฿ {totalPay.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Instructions - Bank Transfer / QR */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">คำแนะนำในการชำระเงิน</h2>
          <p className="text-sm text-gray-600 mb-4">
            โปรดทำการชำระเงินตามวิธีการที่ท่านได้เลือกไว้ โดยทำตามขั้นตอนการชำระเงินให้เสร็จสิ้นภายใน{' '}
            <span className="text-red-500 font-semibold">30 นาที</span> ดังนี้
          </p>

          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            โอนเงินผ่านแอปธนาคาร
          </p>
          <p className="text-xs text-gray-500 mb-4">โอนผ่านเพียงแค่ 1 ช่องทางเท่านั้น</p>

          {/* Kasikornbank + QR */}
          <div className="border border-gray-200 rounded-lg p-3 mb-4 overflow-hidden">
            <p className="text-sm font-medium text-gray-700 mb-2">{BANK_ACCOUNTS.kasikorn.name}</p>
            <div className="bg-[#1e3a5f] rounded-lg p-3 mb-2">
              <p className="text-white text-xs font-medium mb-1">THAI QR PAYMENT</p>
              <p className="text-white/80 text-xs">Prompt Pay</p>
              <div className="flex items-center justify-center py-3">
                <img
                  src={KPlusQrImage}
                  alt="QR Code สำหรับชำระเงิน (K+ PromptPay)"
                  className="w-64 max-w-full h-auto bg-white rounded"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-1">สแกน QR เพื่อโอนเข้าบัญชี</p>
            <p className="text-sm text-gray-700">ชื่อ: {BANK_ACCOUNTS.kasikorn.accountNameTh}</p>
            <p className="text-sm text-gray-700">บัญชี: {BANK_ACCOUNTS.kasikorn.accountNumber}</p>
            <p className="text-xs text-gray-500 mt-2">K+ Accepts all banks | รับเงินได้จากทุกธนาคาร</p>
          </div>

          <div className="space-y-1 text-xs text-red-600">
            <p>* เลือกโอนเข้าบัญชีของร้านแค่ 1 ช่องทาง แล้วโปรดตรวจสอบ ยอดการชำระและชื่อบัญชีร้านว่าตรงกันหรือไม่</p>
            <p>* ทางร้านจะไม่รับผิดชอบหากโอนไปยังบัญชีอื่นๆ หรือถ้ายอดที่โอนมาไม่ครบ โปรดติดต่อแอดมินที่ช่องทางไลน์</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting || isCancelling}
            className="w-full py-3.5 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? 'กำลังสร้างรหัสอ้างอิง...' : 'ดำเนินการต่อ'}
          </button>
        </div>

        {/* Next Step Preview */}
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">ขั้นตอนถัดไป</h2>
          <div className="flex gap-3 p-3 bg-white border border-pink-200 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">ยืนยันการโอนชำระ</p>
              <p className="text-sm text-gray-600">รับรายการสั่งซื้อและรับรหัสยืนยัน</p>
            </div>
          </div>
        </div>

        {/* Leave-page confirmation banner */}
        {pendingLeaveHref && (
          <div className="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-amber-300 shadow-lg">
            <div className="max-w-md mx-auto px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">
                การสั่งซื้อยังดำเนินการไม่เสร็จสิ้น คุณต้องการยกเลิกขั้นตอนการชำระเงินนี้หรือไม่?
              </p>
              <p className="text-xs text-amber-700">
                ถ้ากดยืนยัน ระบบจะไม่สร้างรหัสยืนยันการชำระเงินให้กับออร์เดอร์นี้
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelLeaveRequest}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  อยู่ในหน้านี้ต่อ
                </button>
                <button
                  type="button"
                  onClick={confirmLeavePage}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600"
                >
                  ยกเลิกการสั่งซื้อและออกจากหน้า
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
          <div className="text-gray-500">กำลังโหลด...</div>
        </div>
      }
    >
      <PaymentPageInner />
    </Suspense>
  );
}
