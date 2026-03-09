'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function OrderCancelPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string | undefined;
  const { user, isAuthenticated, isLoading } = useAuth();

  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && orderId) {
      router.push(
        `/login?returnUrl=${encodeURIComponent(`/orders/${orderId}/cancel`)}`
      );
    }
  }, [isAuthenticated, isLoading, router, orderId]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-12">
          <p className="text-gray-600 mb-6">
            ไม่พบหมายเลขออร์เดอร์ กรุณากลับไปที่หน้าประวัติการสั่งซื้อ
          </p>
          <Link
            href="/profile"
            className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
          >
            กลับไปโปรไฟล์
          </Link>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !confirmCancel) return;

    const email =
      user?.username?.includes('@') === true
        ? user?.username
        : user?.email || user?.username || '';

    if (!email) {
      setError('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          cancellationReason: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถยกเลิกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง');
      }

      setSuccessMessage('ส่งคำขอยกเลิกคำสั่งซื้อเรียบร้อยแล้ว');
      // ไปหน้ารายละเอียดออร์เดอร์หลังจากยกเลิกสำเร็จ
      setTimeout(() => {
        router.push(`/orders/${orderId}`);
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถยกเลิกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      <main className="max-w-md mx-auto px-4 py-8 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ยกเลิกคำสั่งซื้อ
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          เลขที่คำสั่งซื้อ <span className="font-semibold">#{orderId}</span>
        </p>

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            เหตุผลในการยกเลิก
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            โปรดระบุเหตุผลที่คุณต้องการยกเลิกคำสั่งซื้อ เพื่อให้ร้านค้าปรับปรุงการให้บริการ
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                เหตุผลในการยกเลิก (ไม่บังคับ)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                placeholder="เช่น เปลี่ยนใจ, ใส่ที่อยู่ผิด, ต้องการแก้ไขสินค้า ฯลฯ"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {successMessage && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                {successMessage}
              </p>
            )}

            <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">โปรดยืนยันก่อนยกเลิกคำสั่งซื้อ</p>
              <p>
                ถ้ากดยืนยัน ระบบจะส่งคำขอยกเลิกคำสั่งซื้อและคืนสต็อกจากการจองสินค้า ออร์เดอร์นี้จะไม่สามารถนำกลับมาใช้งานได้อีก
              </p>
            </div>

            <label className="mt-2 flex items-start gap-2 text-xs text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmCancel}
                onChange={(e) => setConfirmCancel(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
              />
              <span>
                ฉันเข้าใจและต้องการยกเลิกคำสั่งซื้อนี้ รวมถึงคืนสินค้าที่จองไว้กลับเข้าสต็อก
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/orders/${orderId}`)}
                className="flex-1 py-2.5 border-2 border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                กลับไปหน้ารายละเอียด
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !confirmCancel}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการยกเลิกออร์เดอร์'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

