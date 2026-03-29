'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useCompare } from '@/context/CompareContext';
import type { CompareItem } from '@/context/CompareContext';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  ArrowLeft,
  X,
  Star,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  Layers,
} from 'lucide-react';

type ContentBlock = { type: 'paragraph' | 'list'; content: string | string[] };

interface CompareProductDetail {
  rating: number;
  totalReviews: number;
  description: string;
  contentBlocks?: ContentBlock[];
}

function CompareProductDescription({
  description,
  contentBlocks,
  loading,
}: {
  description: string;
  contentBlocks?: ContentBlock[];
  loading: boolean;
}) {
  const [showFull, setShowFull] = useState(false);
  const long = description.length > 200;

  let body: ReactNode = null;
  if (!loading) {
    if (!description.trim()) {
      body = <p className="text-xs text-gray-500">ไม่มีรายละเอียดสินค้า</p>;
    } else if (!showFull && long) {
      body = <p className="text-sm text-gray-700 leading-relaxed">{description.slice(0, 200)}…</p>;
    } else if (contentBlocks && contentBlocks.length > 0) {
      body = (
        <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
          {contentBlocks.map((block, index) =>
            block.type === 'paragraph' ? (
              <p key={index}>{block.content as string}</p>
            ) : (
              <ul key={index} className="list-disc list-inside space-y-1 pl-1">
                {(block.content as string[]).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )
          )}
        </div>
      );
    } else {
      body = <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>;
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-gray-800 mb-2">รายละเอียดสินค้า</p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-pink-600">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          กำลังโหลดรายละเอียด…
        </div>
      ) : (
        <>
          {body}
          {long && description.trim() && (
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-pink-200/90 bg-gradient-to-r from-pink-50 to-rose-50/80 px-4 py-2 text-sm font-medium text-pink-600 shadow-sm shadow-pink-100/50 transition-all duration-200 hover:border-pink-300 hover:from-pink-100 hover:to-rose-100/90 hover:text-pink-700 hover:shadow-md hover:shadow-pink-100 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
            >
              {showFull ? (
                <>
                  <ChevronUp className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  ซ่อนรายละเอียด
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  ดูรายละเอียดเพิ่มเติม
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const [details, setDetails] = useState<Record<string, CompareProductDetail>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (compareItems.length === 0) {
      setDetails({});
      return;
    }
    const load = async () => {
      setDetailsLoading(true);
      const results = await Promise.all(
        compareItems.map(async (item) => {
          try {
            const res = await fetch(`/api/products/${item.id}`);
            if (res.ok) {
              const data = await res.json();
              const p = data.product;
              return {
                id: item.id,
                rating: p?.rating ?? 0,
                totalReviews: p?.totalReviews ?? 0,
                description: typeof p?.description === 'string' ? p.description : '',
                contentBlocks: p?.contentBlocks as ContentBlock[] | undefined,
              };
            }
          } catch {
            // ignore
          }
          return {
            id: item.id,
            rating: 0,
            totalReviews: 0,
            description: '',
          };
        })
      );
      const map: Record<string, CompareProductDetail> = {};
      results.forEach((r) => {
        map[r.id] = {
          rating: r.rating,
          totalReviews: r.totalReviews,
          description: r.description,
          contentBlocks: r.contentBlocks,
        };
      });
      setDetails(map);
      setDetailsLoading(false);
    };
    load();
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
                const d = details[item.id];
                const rating = d?.rating ?? 0;
                const totalReviews = d?.totalReviews ?? 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-pink-100/60 rounded-2xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(236,72,153,0.12)] hover:shadow-[0_8px_32px_-6px_rgba(236,72,153,0.18)] transition-all duration-300 ring-1 ring-pink-50/60"
                  >
                    <div className="flex gap-4 p-4 sm:p-5 bg-gradient-to-br from-slate-50/90 via-white to-pink-50/20">
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => removeFromCompare(item.id)}
                          className="absolute -top-1.5 -right-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 shadow-md transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                          aria-label="ลบออกจากรายการเปรียบเทียบ"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Link href={`/products/${item.id}`} className="block">
                          <div className="h-28 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 shadow-inner ring-2 ring-white transition-transform duration-300 hover:ring-pink-100 hover:shadow-md sm:h-[7.25rem] sm:w-[7.25rem]">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML =
                                      '<div class="flex h-full items-center justify-center text-gray-400 text-xs">ไม่มีรูป</div>';
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-gray-400 text-xs">
                                ไม่มีรูป
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <Link href={`/products/${item.id}`} className="group block">
                          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-gray-900 line-clamp-3 transition-colors group-hover:text-pink-600 sm:text-base">
                            {item.name}
                          </h3>
                        </Link>

                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                          <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-lg font-bold text-transparent tabular-nums sm:text-xl">
                            {item.price}
                          </span>
                          <span className="text-xs font-medium text-gray-400 sm:text-sm">บาท</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {item.sku ? (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                              <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                              <span className="truncate">
                                <span className="text-slate-400">SKU</span> · {item.sku}
                              </span>
                            </span>
                          ) : null}
                          {getCategoryName(item) !== '-' ? (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50/90 px-3 py-1 text-[11px] font-medium text-pink-800 shadow-sm">
                              <Layers className="h-3.5 w-3.5 shrink-0 text-pink-400" aria-hidden />
                              <span className="truncate">{getCategoryName(item)}</span>
                            </span>
                          ) : null}
                        </div>

                        <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-amber-100/90 bg-gradient-to-r from-amber-50/95 to-orange-50/50 px-3 py-2 shadow-sm">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i <= Math.floor(rating)
                                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_1px_rgba(251,191,36,0.5)]'
                                    : 'text-amber-200/80'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-gray-800">
                            {rating > 0 ? rating.toFixed(1) : '—'}
                          </span>
                          {totalReviews > 0 ? (
                            <span className="text-xs font-medium text-gray-500">
                              · {totalReviews} รีวิว
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <CompareProductDescription
                      key={item.id}
                      description={d?.description ?? ''}
                      contentBlocks={d?.contentBlocks}
                      loading={detailsLoading}
                    />
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
