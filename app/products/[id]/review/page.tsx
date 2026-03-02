'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { Star } from 'lucide-react';

interface ProductVariant {
  id: number;
  sku: string;
  price: number;
}

interface ProductInfo {
  id: string;
  name: string;
  category: string | null;
  image: string | null;
  variants: ProductVariant[];
}

const RATING_HINTS: Record<number, string> = {
  1: 'แย่มาก ไม่พอใจ',
  2: 'แย่ ไม่ค่อยดี',
  3: 'พอใช้ ปานกลาง',
  4: 'ดี พอใจ',
  5: 'ดีเยี่ยม! ประทับใจมาก',
};

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/120x120/E8E8E8/999999?text=ไม่มีรูป';

export default function WriteReviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params?.id as string;
  const orderId = searchParams?.get('orderId') || '';
  const variantId = searchParams?.get('variantId') || '';

  const { user, isAuthenticated, isLoading } = useAuth();
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [textError, setTextError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const variant = product?.variants?.find(
    (v) => v.id.toString() === variantId || v.id === parseInt(variantId, 10)
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(
        `/login?returnUrl=${encodeURIComponent(`/products/${productId}/review?orderId=${orderId}&variantId=${variantId}`)}`
      );
    }
  }, [isAuthenticated, isLoading, router, productId, orderId, variantId]);

  useEffect(() => {
    if (!productId) return;

    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setProduct(null);
          return;
        }
        const p = data.product || data;
        setProduct({
          id: p.id || productId,
          name: p.name || '',
          category: p.category || null,
          image: p.image || p.images?.[0] || null,
          variants: p.variants || [],
        });
      })
      .catch(() => setProduct(null));
  }, [productId]);

  const validate = useCallback(() => {
    let ok = true;
    if (!rating || rating < 1 || rating > 5) {
      setRatingError('กรุณาให้คะแนนสินค้า');
      ok = false;
    } else {
      setRatingError('');
    }
    const text = reviewText.trim();
    if (text.length < 10) {
      setTextError('กรุณากรอกรีวิวอย่างน้อย 10 ตัวอักษร');
      ok = false;
    } else if (text.length > 1000) {
      setTextError('รายละเอียดต้องไม่เกิน 1000 ตัวอักษร');
      ok = false;
    } else {
      setTextError('');
    }
    return ok;
  }, [rating, reviewText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    const email = user?.username?.includes('@') ? user.username : user?.email || user?.username;
    if (!email) {
      setSubmitError('กรุณาเข้าสู่ระบบ');
      return;
    }

    if (!variantId) {
      setSubmitError('ไม่พบข้อมูลตัวเลือกสินค้า กรุณากลับไปที่หน้ารายการสั่งซื้อ');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          productId,
          variantId,
          orderId: orderId || undefined,
          rating,
          reviewText: reviewText.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'เกิดข้อผิดพลาด');
        setSubmitting(false);
        return;
      }

      router.push('/profile/reviews?tab=done');
    } catch {
      setSubmitError('เกิดข้อผิดพลาดในการส่งรีวิว');
      setSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

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
        {product && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg bg-pink-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {(product.image || variant) ? (
                  <img
                    src={product.image || PLACEHOLDER_IMAGE}
                    alt={product.name}
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
                <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                <h2 className="font-bold text-gray-900 mb-1">{product.name}</h2>
                {variant && (
                  <p className="text-sm text-gray-600 mb-2">ประเภท: {variant.sku}</p>
                )}
                <p className="font-bold text-gray-900">
                  ฿ {variant ? variant.price.toFixed(2) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {!product && !variantId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              ไม่พบข้อมูลสินค้า กรุณากลับไปที่หน้ารายการสั่งซื้อและกดปุ่ม "รีวิว" อีกครั้ง
            </p>
            <Link
              href="/profile"
              className="inline-block mt-2 text-pink-500 font-medium hover:text-pink-600"
            >
              กลับไปโปรไฟล์
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <label className="block text-base font-semibold text-gray-900 mb-3">
              ให้คะแนนสินค้า*
            </label>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i)}
                    onMouseEnter={() => {}}
                    className="p-0.5 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-lg font-bold text-gray-900">{rating}/5</span>
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600">{RATING_HINTS[rating]}</p>
            )}
            {ratingError && <p className="text-sm text-red-500 mt-1">{ratingError}</p>}
          </div>

          {/* Review Text */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <label className="block text-base font-semibold text-gray-900 mb-3">
              รายละเอียดรีวิว*
            </label>
            <p className="text-xs text-gray-500 mb-2">
              กรุณาแบ่งปันประสบการณ์การใช้งานสินค้า เช่น คุณภาพ การใช้งาน ข้อดี-ข้อเสีย
            </p>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="รีวิวของคุณ..."
              rows={6}
              maxLength={1000}
              className={`w-full px-4 py-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                textError ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${textError ? 'text-red-500' : 'text-gray-500'}`}>
                {textError}
              </span>
              <span
                className={`text-xs ${
                  reviewText.length >= 1000 ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                {reviewText.length}/1000
              </span>
            </div>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Submit */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'กำลังบันทึก...' : 'เสร็จสิ้น'}
            </button>
            <Link
              href="/profile/reviews"
              className="block w-full py-3 px-4 border border-gray-300 rounded-lg text-center font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
