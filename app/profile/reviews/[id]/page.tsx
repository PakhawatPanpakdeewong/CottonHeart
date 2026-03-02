'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { Star } from 'lucide-react';

interface ReviewDetail {
  id: string;
  productId: string;
  variantId: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
  orderId: string | null;
  productName: string;
  category: string;
  image: string | null;
  variant: string;
  price: number;
}

const RATING_LABELS: Record<number, string> = {
  1: 'แย่มาก',
  2: 'แย่',
  3: 'พอใช้',
  4: 'ดี',
  5: 'ยอดเยี่ยม',
};

function formatBuddhistDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const buddhistYear = d.getFullYear() + 543;
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return `${day} ${month} ${buddhistYear} เวลา ${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')} น.`;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/120x120/E8E8E8/999999?text=ไม่มีรูป';

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = params?.id as string;
  const { user, isAuthenticated, isLoading } = useAuth();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/profile/reviews/${reviewId}`)}`);
    }
  }, [isAuthenticated, isLoading, router, reviewId]);

  useEffect(() => {
    if (!isAuthenticated || !user || !reviewId) return;

    const email = user.username?.includes('@') ? user.username : user.email || user.username;
    if (!email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/reviews/${reviewId}?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || 'โหลดไม่สำเร็จ')));
        return res.json();
      })
      .then((data) => setReview(data.review))
      .catch((err) => setError(err.message || 'เกิดข้อผิดพลาด'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, reviewId]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-6 pb-24">
          <div className="text-center text-gray-500 py-12">กำลังโหลดรีวิว...</div>
        </main>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-6 pb-24">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">{error || 'ไม่พบรีวิว'}</p>
            <Link
              href="/profile/reviews"
              className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
            >
              กลับไปการรีวิว
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const ratingLabel = RATING_LABELS[review.rating] || '';

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-pink-500">ร้านค้า</Link>
          <span className="text-gray-400">/</span>
          <Link href="/profile" className="hover:text-pink-500">โปรไฟล์ผู้ใช้งาน</Link>
          <span className="text-gray-400">/</span>
          <Link href="/profile/reviews" className="hover:text-pink-500">การรีวิว</Link>
        </nav>

        <h1 className="text-xl font-bold text-gray-900 mb-4">การรีวิวสินค้า</h1>

        {/* Product Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg bg-pink-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {review.image ? (
                <img
                  src={review.image}
                  alt={review.productName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                  }}
                />
              ) : (
                <span className="text-xs text-gray-400">ไม่มีรูป</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">{review.category}</p>
              <h2 className="font-bold text-gray-900 mb-1">{review.productName}</h2>
              <p className="text-sm text-gray-600 mb-2">ประเภท: {review.variant}</p>
              <p className="font-bold text-gray-900">฿ {review.price.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Rating Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">คะแนนสินค้า</h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${i <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-gray-900">{review.rating}/5</span>
          </div>
          <div className="mt-3 px-3 py-2 border border-pink-200 rounded-lg bg-white">
            <span className="text-sm text-gray-600">สินค้าชนิดนี้อยู่ในระดับ </span>
            <span className="text-sm font-bold text-pink-500">{ratingLabel}</span>
          </div>
        </div>

        {/* Review Text */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">รีวิวของคุณ</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.reviewText}</p>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">รายละเอียด</h2>
          <div className="space-y-2 text-sm">
            {review.orderId && (
              <p className="text-gray-700">
                <span className="text-gray-500">หมายเลขออร์เดอร์:</span> {review.orderId}
              </p>
            )}
            <p className="text-gray-700">
              <span className="text-gray-500">รีวิววันที่</span>{' '}
              {formatBuddhistDateTime(review.reviewDate)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href="/profile/reviews"
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-center font-medium text-pink-500 bg-white hover:bg-gray-50 transition-colors"
          >
            ย้อนกลับ
          </Link>
          <Link
            href={`/products/${review.productId}`}
            className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg text-center font-medium hover:bg-pink-600 transition-colors"
          >
            เพิ่มเข้าตะกร้าอีกครั้ง
          </Link>
        </div>
      </main>
    </div>
  );
}
