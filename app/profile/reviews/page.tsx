'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { ChevronRight, Star } from 'lucide-react';

interface ProductToReview {
  orderId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  category: string;
  image: string | null;
  variant: string;
  variantId: string;
  price: number;
}

interface Review {
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

type TabKey = 'all' | 'pending' | 'done';

const RATING_LABELS: Record<number, string> = {
  1: 'แย่มาก',
  2: 'แย่',
  3: 'พอใช้',
  4: 'ดี',
  5: 'ยอดเยี่ยม',
};

function formatReviewDate(isoDate: string): string {
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

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/80x80/E8E8E8/999999?text=ไม่มีรูป';

function ProfileReviewsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') as TabKey | null;
  const { user, isAuthenticated, isLoading } = useAuth();
  const [tab, setTab] = useState<TabKey>(tabParam && ['all', 'pending', 'done'].includes(tabParam) ? tabParam : 'all');
  const [productsToReview, setProductsToReview] = useState<ProductToReview[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent('/profile/reviews')}`);
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (tabParam && ['all', 'pending', 'done'].includes(tabParam)) {
      setTab(tabParam as TabKey);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const email = user.username?.includes('@') ? user.username : user.email || user.username;
    if (!email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/users/reviews?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        setProductsToReview(data.productsToReview || []);
        setReviews(data.reviews || []);
      })
      .catch(() => {
        setProductsToReview([]);
        setReviews([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'รายการทั้งหมด' },
    { key: 'pending', label: 'ที่ต้องให้คะแนน' },
    { key: 'done', label: 'รีวิวเสร็จสิ้น' },
  ];

  const allItems = [
    ...productsToReview.map((p) => ({ type: 'pending' as const, product: p, review: null })),
    ...reviews.map((r) => ({ type: 'done' as const, product: null, review: r })),
  ];

  const filteredItems =
    tab === 'all'
      ? allItems
      : tab === 'pending'
        ? allItems.filter((x) => x.type === 'pending')
        : allItems.filter((x) => x.type === 'done');

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
          <ChevronRight className="w-4 h-4" />
          <Link href="/profile" className="hover:text-pink-500">โปรไฟล์ผู้ใช้งาน</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-700 font-medium">การรีวิว</span>
        </nav>

        <h1 className="text-xl font-bold text-gray-900 mb-4">การรีวิวสินค้า</h1>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'text-pink-500 border-b-2 border-pink-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            {tab === 'all' && (
              <>
                <p className="text-gray-600 mb-2">คุณยังไม่มีสินค้าที่ต้องรีวิว</p>
                <p className="text-sm text-gray-500 mb-4">
                  เมื่อคุณซื้อสินค้าและได้รับสินค้าแล้ว คุณสามารถมารีวิวสินค้าได้ที่นี่
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
                >
                  เริ่มช้อปปิ้ง
                </Link>
              </>
            )}
            {tab === 'pending' && (
              <p className="text-gray-600">ยินดีด้วย! คุณรีวิวสินค้าครบทุกรายการแล้ว</p>
            )}
            {tab === 'done' && (
              <p className="text-gray-600">คุณยังไม่มีรีวิว</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              if (item.type === 'pending' && item.product) {
                const p = item.product;
                return (
                  <div
                    key={`pending-${p.productId}-${p.variantId}`}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.productName}
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
                        <p className="text-xs text-gray-500 mb-1">{p.category}</p>
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                          {p.productName}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1">ประเภท: {p.variant}</p>
                        <p className="font-bold text-gray-900">฿ {p.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/products/${p.productId}/review?orderId=${p.orderId}&variantId=${p.variantId}`}
                        className="inline-flex items-center px-3 py-1.5 border border-pink-500 rounded-lg text-xs font-medium text-pink-500 bg-white hover:bg-pink-50"
                      >
                        ให้คะแนนสินค้าและรีวิว
                      </Link>
                    </div>
                  </div>
                );
              }
              if (item.type === 'done' && item.review) {
                const r = item.review;
                return (
                  <div
                    key={`done-${r.id}`}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {r.image ? (
                          <img
                            src={r.image}
                            alt={r.productName}
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
                        <p className="text-xs text-gray-500 mb-1">{r.category}</p>
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                          {r.productName}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1">ประเภท: {r.variant}</p>
                        <p className="font-bold text-gray-900">฿ {r.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-green-500 text-green-500 bg-green-50">
                        รีวิวแล้ว
                      </span>
                      <span className="text-sm text-gray-600">
                        {r.rating} ⭐ {RATING_LABELS[r.rating] || ''}
                      </span>
                      <Link
                        href={`/profile/reviews/${r.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        ดูการรีวิวของฉัน
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      รีวิววันที่ {formatReviewDate(r.reviewDate)}
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProfileReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
          <div className="text-gray-500">กำลังโหลด...</div>
        </div>
      }
    >
      <ProfileReviewsPageInner />
    </Suspense>
  );
}
