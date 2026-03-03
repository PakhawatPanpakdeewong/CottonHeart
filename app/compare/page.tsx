'use client';

import { useState, useEffect } from 'react';
import { useCompare } from '@/context/CompareContext';
import type { CompareItem } from '@/context/CompareContext';
import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, X, Star } from 'lucide-react';

interface ProductRating {
  rating: number;
  totalReviews: number;
}

export default function ComparePage() {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const [ratings, setRatings] = useState<Record<string, ProductRating>>({});

  useEffect(() => {
    if (compareItems.length === 0) return;
    const fetchRatings = async () => {
      const results = await Promise.all(
        compareItems.map(async (item) => {
          try {
            const res = await fetch(`/api/products/${item.id}`);
            if (res.ok) {
              const data = await res.json();
              return {
                id: item.id,
                rating: data.product?.rating ?? 0,
                totalReviews: data.product?.totalReviews ?? 0,
              };
            }
          } catch {
            // ignore
          }
          return { id: item.id, rating: 0, totalReviews: 0 };
        })
      );
      const map: Record<string, ProductRating> = {};
      results.forEach((r) => {
        map[r.id] = { rating: r.rating, totalReviews: r.totalReviews };
      });
      setRatings(map);
    };
    fetchRatings();
  }, [compareItems]);

  const getCategoryName = (item: CompareItem) => {
    if (typeof item.subCategory === 'object' && item.subCategory?.nameTH) return item.subCategory.nameTH;
    if (typeof item.category === 'object' && item.category?.nameTH) return item.category.nameTH;
    return typeof item.category === 'string' ? item.category : '-';
  };

  return (
    <div className="min-h-screen bg-[#fcfafc] pb-8">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4 bg-white">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href="/search"
            className="flex items-center gap-1 text-pink-500 hover:text-pink-600 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">ย้อนกลับ</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">เปรียบเทียบสินค้า</h1>
        </div>

        {compareItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">ยังไม่มีสินค้าในรายการเปรียบเทียบ</p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm font-medium"
            >
              ไปค้นหาสินค้า
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{compareItems.length} สินค้า</p>
              <button
                onClick={clearCompare}
                className="text-sm text-pink-500 hover:text-pink-600"
              >
                ล้างทั้งหมด
              </button>
            </div>

            {/* Comparison Cards - แสดงเป็น card แต่ละอัน */}
            <div className="space-y-4">
              {compareItems.map((item) => {
                const r = ratings[item.id];
                const rating = r?.rating ?? 0;
                const totalReviews = r?.totalReviews ?? 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => removeFromCompare(item.id)}
                          className="absolute -top-1 -right-1 z-10 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                          aria-label="ลบออกจากรายการเปรียบเทียบ"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Link href={`/products/${item.id}`}>
                          <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML =
                                      '<div class="text-gray-400 text-xs">ไม่มีรูป</div>';
                                  }
                                }}
                              />
                            ) : (
                              <div className="text-gray-400 text-xs">ไม่มีรูป</div>
                            )}
                          </div>
                        </Link>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.id}`}>
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 hover:text-pink-500">
                            {item.name}
                          </h3>
                        </Link>
                        <p className="text-base font-bold text-pink-500 mb-1">
                          {item.price} บาท
                        </p>
                        {item.sku && (
                          <p className="text-xs text-gray-500 mb-1">SKU: {item.sku}</p>
                        )}
                        <p className="text-xs text-gray-500 mb-2">
                          หมวดหมู่: {getCategoryName(item)}
                        </p>
                        {/* คะแนนรีวิว */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i <= Math.floor(rating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {rating > 0 ? rating.toFixed(1) : '-'}
                          </span>
                          {totalReviews > 0 && (
                            <span className="text-xs text-gray-500">
                              ({totalReviews} รีวิว)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
