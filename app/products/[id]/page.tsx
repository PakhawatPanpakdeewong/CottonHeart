'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Product type from API
interface Product {
  id: string;
  name: string;
  category: string | null;
  subcategoryId?: number | null;
  description: string;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  rating: number;
  soldCount: number;
  availableStock?: number;
  images: string[];
  image?: string;
  imageSlots?: string[][];
  specifications: string[];
  contentBlocks?: { type: 'paragraph' | 'list'; content: string | string[] }[];
  shippingDays: number;
  reviews: { id: string; user: string; rating: number; comment: string; date: string }[];
  totalReviews: number;
  similarProducts: { id: string; name: string; price: number; image: string | null }[];
  variants?: {
    id: number;
    sku: string;
    price: number;
    attributeValues?: {
      attributeId: number;
      nameTH: string;
      nameEN?: string | null;
      valueTH: string;
      valueEN?: string | null;
      valueCode: string;
    }[];
  }[];
}

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const StarIcon = ({ filled = true }: { filled?: boolean }) => (
  <svg className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const BoxIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    className="w-5 h-5"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 2}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

// Placeholder for when no images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400/E8E8E8/999999?text=ไม่มีรูปภาพ';

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function formatThaiDate(d: Date) {
  return {
    day: d.getDate(),
    month: THAI_MONTHS[d.getMonth()],
    yearBE: d.getFullYear() + 543,
  };
}

/** ช่วงวันที่จัดส่งประมาณ: เริ่มจาก (วันนี้ + days) ถึง +2 วันติดปฏิทิน (ไม่บวกเลขวันตรงๆ เพื่อไม่ให้เกินวันในเดือน) */
const getDeliveryDate = (days: number) => {
  const n = Math.max(1, Math.floor(days));
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() + n);
  const to = new Date(from);
  to.setDate(from.getDate() + 2);

  const a = formatThaiDate(from);
  const b = formatThaiDate(to);

  if (a.month === b.month && a.yearBE === b.yearBE) {
    return `${a.day}-${b.day} ${a.month} ${a.yearBE}`;
  }
  if (a.yearBE === b.yearBE) {
    return `${a.day} ${a.month} – ${b.day} ${b.month} ${a.yearBE}`;
  }
  return `${a.day} ${a.month} ${a.yearBE} – ${b.day} ${b.month} ${b.yearBE}`;
};

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const { addToCart, getTotalItems, cartItems } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [imagesReady, setImagesReady] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('ไม่พบสินค้านี้');
          } else {
            setError('เกิดข้อผิดพลาดในการโหลดสินค้า');
          }
          setProduct(null);
          return;
        }
        const data = await response.json();
        setProduct(data.product);
        setSelectedImageIndex(0);
        setResolvedImages([]);
        setImagesReady(false);
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการโหลดสินค้า');
        setProduct(null);
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    setShowAllReviews(false);
  }, [productId]);

  const totalItems = getTotalItems();
  const deliveryDate = product ? getDeliveryDate(product.shippingDays) : '';
  const validDisplayImages = resolvedImages.map((url, i) => ({ url, originalIndex: i }));

  // ตรวจสอบรูปทั้งหมดก่อน แล้วค่อยแสดง
  useEffect(() => {
    if (!product) return;
    const slots: string[][] = product.imageSlots?.length
      ? product.imageSlots
      : product.images?.length
        ? product.images.map((u: string) => [u])
        : [];

    if (slots.length === 0) {
      setResolvedImages(product.images?.length ? product.images : []);
      setImagesReady(true);
      return;
    }

    const resolveSlot = (slot: string[]): Promise<string | null> => {
      return new Promise((resolve) => {
        let idx = 0;
        const tryNext = () => {
          if (idx >= slot.length) {
            resolve(null);
            return;
          }
          const img = new Image();
          img.onload = () => resolve(slot[idx]);
          img.onerror = () => {
            idx++;
            tryNext();
          };
          img.src = slot[idx];
        };
        tryNext();
      });
    };

    Promise.all(slots.map(resolveSlot)).then((results) => {
      setResolvedImages(results.filter((u): u is string => u !== null));
      setImagesReady(true);
    });
  }, [product]);

  useEffect(() => {
    if (validDisplayImages.length > 0 && selectedImageIndex >= validDisplayImages.length) {
      setSelectedImageIndex(0);
    }
  }, [validDisplayImages.length, selectedImageIndex]);

  const currentInCart = cartItems.find((i) => i.id === product?.id)?.quantity ?? 0;
  const availableStock = product?.availableStock ?? 0;
  const canAddMore = availableStock > currentInCart;
  const isOutOfStock = availableStock <= 0;

  const handleAddToCart = () => {
    if (!product) return;
    if (isOutOfStock) return;
    if (!canAddMore) return;
    const resolvedUrl = validDisplayImages[0]?.url && validDisplayImages[0].url !== PLACEHOLDER_IMAGE
      ? validDisplayImages[0].url
      : (product.images?.[0] && product.images[0] !== PLACEHOLDER_IMAGE
        ? product.images[0]
        : (product.image && product.image !== PLACEHOLDER_IMAGE ? product.image : null));
    const firstVariant = product.variants?.[0];
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice ?? undefined,
      image: resolvedUrl,
      category: product.category ?? null,
      sku: firstVariant?.sku,
      variantId: firstVariant?.id,
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const displayedReviews = useMemo(() => {
    const reviews = product?.reviews ?? [];
    if (showAllReviews) return reviews;
    return reviews.slice(0, 3);
  }, [product?.reviews, showAllReviews]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfafc] pb-8">
        <Header />
        <main className="max-w-md mx-auto">
          <div className="h-80 bg-[#fcfafc] rounded-b-3xl animate-pulse" />
          <div className="mt-4 mx-4 bg-white rounded-2xl rounded-b-xl shadow-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-100 rounded w-1/2 mb-6" />
            <div className="h-20 bg-gray-100 rounded mb-4" />
            <div className="h-24 bg-gray-100 rounded" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#fcfafc] pb-8">
        <Header />
        <main className="max-w-md mx-auto px-4 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeftIcon />
            <span className="text-sm">ย้อนกลับ</span>
          </button>
          <div className="text-center py-16">
            <p className="text-gray-600 mb-4">{error || 'ไม่พบสินค้า'}</p>
            <button
              onClick={() => router.push('/products')}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
            >
              ดูสินค้าทั้งหมด
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfafc] pb-8">
      <Header />

      <main className="max-w-md mx-auto">
        {/* Top Section - Image Area */}
        <div className="relative bg-[#fcfafc] rounded-b-3xl overflow-hidden pt-16">
          <div className="aspect-square max-h-80 mx-auto flex items-center justify-center">
            {!imagesReady ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 animate-pulse rounded-lg" />
            ) : validDisplayImages.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-gray-200">
                <svg className="w-24 h-24 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            ) : (
              <img
                src={validDisplayImages[selectedImageIndex].url}
                alt={product.name}
                className="w-full h-full object-contain rounded-2xl"
              />
            )}
          </div>

          {/* Overlay Buttons */}
          <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-center">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeftIcon />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || !canAddMore}
                className={`flex items-center justify-center gap-2 rounded-full border pl-3 pr-3.5 py-2 shrink-0 text-xs sm:text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 whitespace-nowrap ${
                  isOutOfStock || !canAddMore
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500'
                    : 'border-pink-200/90 bg-gradient-to-r from-pink-50 via-rose-50/80 to-pink-50 text-pink-600 hover:border-pink-300 hover:from-pink-100 hover:to-rose-100 hover:text-pink-700 hover:shadow-md'
                }`}
                aria-label={isOutOfStock ? 'สินค้าหมด' : 'เพิ่มเข้าตะกร้า'}
                title={isOutOfStock ? 'สินค้าหมด' : canAddMore ? 'เพิ่มเข้าตะกร้า' : 'จำนวนในคลังไม่เพียงพอ'}
              >
                <svg className="h-4 w-4 shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                เพิ่มเข้าตะกร้า
              </button>
              <button
                onClick={() => {
                  if (product) {
                    toggleFavorite({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: validDisplayImages[0]?.url && validDisplayImages[0].url !== PLACEHOLDER_IMAGE ? validDisplayImages[0].url : null,
                      category: product.category,
                    });
                  }
                }}
                className={`w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center ${
                  isFavorite(product?.id ?? '') ? 'text-pink-500' : 'text-gray-700'
                } hover:bg-gray-50`}
              >
                <HeartIcon filled={isFavorite(product?.id ?? '')} />
              </button>
            </div>
          </div>

          {/* Pagination Dots */}
          {imagesReady && validDisplayImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {validDisplayImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    selectedImageIndex === index ? 'bg-gray-800' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* White Content Card */}
        <div className="relative mt-4 mx-4 bg-white rounded-2xl rounded-b-xl shadow-[0_4px_20px_-4px_rgba(244,114,182,0.25)] overflow-hidden">
          <div className="p-6">
            {/* Title & Category */}
            <h1 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h1>
            {product.category && (
              <div className="flex items-center gap-1.5 text-gray-600 text-sm mb-6">
                <BoxIcon />
                <span>{product.category}</span>
              </div>
            )}

            {/* Photos Section - แสดงเมื่อตรวจสอบรูปครบแล้ว */}
            {imagesReady && validDisplayImages.length > 1 && (
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-900 mb-3">รูปภาพ</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {validDisplayImages.map(({ url }, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        selectedImageIndex === index ? 'border-gray-800' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Details Section */}
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">รายละเอียด</h2>
              {product.description ? (
                <div className="text-sm text-gray-700 leading-relaxed">
                  {showFullDescription || product.description.length <= 200 ? (
                    product.contentBlocks && product.contentBlocks.length > 0 ? (
                      <div className="space-y-2">
                        {product.contentBlocks.map((block, index) =>
                          block.type === 'paragraph' ? (
                            <p key={index}>{block.content as string}</p>
                          ) : (
                            <ul key={index} className="list-disc list-inside space-y-1 pl-1">
                              {(block.content as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{product.description}</p>
                    )
                  ) : (
                    <p>{product.description.slice(0, 200)}...</p>
                  )}
                  {product.description.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-600 transition-colors hover:text-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 rounded-sm"
                    >
                      {showFullDescription ? (
                        <>
                          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                          ซ่อนรายละเอียด
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                          ดูรายละเอียดเพิ่มเติม
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">ไม่มีรายละเอียดสินค้า</p>
              )}
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-1.5 text-sm text-gray-600">
                <p>ขายแล้ว {product.soldCount} ชิ้น</p>
                <p>
                  จัดส่งภายใน {product.shippingDays} วัน (ประมาณ {deliveryDate})
                </p>
              </div>
            </div>

            {/* Price & Stock */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">ราคาสินค้า</p>
              <div className="flex items-baseline gap-2 flex-wrap">
                {product.originalPrice != null && product.originalPrice > product.price && (
                  <>
                    <p className="text-lg text-gray-500 line-through">
                      {product.originalPrice.toFixed(2)} บาท
                    </p>
                    {product.discountPercent != null && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-sm font-semibold rounded">
                        ลด {product.discountPercent}%
                      </span>
                    )}
                  </>
                )}
                <p className="text-2xl font-bold text-gray-900">
                  {product.price.toFixed(2)} บาท
                </p>
              </div>
              {isOutOfStock ? (
                <p className="text-sm text-red-500 mt-2 font-medium">สินค้าหมด</p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">คงเหลือ {availableStock} ชิ้น</p>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] ring-1 ring-pink-50/50">
          <div className="border-b border-gray-100 bg-gradient-to-br from-white via-pink-50/20 to-rose-50/10 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-gray-900">รีวิวจากลูกค้า</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {product.totalReviews} รีวิวที่แสดงผ่านการอนุมัติ
                </p>
              </div>
              <div
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-100/90 bg-gradient-to-br from-amber-50 to-orange-50/60 px-3 py-2 shadow-sm"
                aria-label={`คะแนนเฉลี่ย ${product.rating.toFixed(1)} จาก 5`}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} filled={i < Math.floor(product.rating)} />
                  ))}
                </div>
                <span className="text-base font-bold tabular-nums text-gray-900">
                  {product.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            {(product.reviews?.length ?? 0) > 0 ? (
              <>
                <div className="space-y-3">
                  {displayedReviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-gray-100/80 bg-gray-50/30 p-3.5 transition-colors hover:bg-gray-50/60 sm:p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon key={i} filled={i < review.rating} />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-gray-600">{review.user}</span>
                        {review.date ? (
                          <span className="text-xs text-gray-400">
                            ·{' '}
                            {new Date(review.date).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-gray-800">{review.comment}</p>
                    </article>
                  ))}
                </div>

                {product.reviews.length > 3 ? (
                  <div className="mt-4 flex justify-center border-t border-gray-100 pt-4">
                    {!showAllReviews ? (
                      <button
                        type="button"
                        onClick={() => setShowAllReviews(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink-600 transition-colors hover:text-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 rounded-sm"
                      >
                        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                        ดูรีวิวเพิ่มเติม
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAllReviews(false)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink-600 transition-colors hover:text-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 rounded-sm"
                      >
                        <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                        ซ่อนรีวิว
                      </button>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 py-10 text-center">
                <p className="text-sm text-gray-500">ยังไม่มีรีวิว</p>
              </div>
            )}

            {isAuthenticated && (
              <div className="mt-5 rounded-xl border border-pink-100/60 bg-pink-50/25 px-4 py-3.5">
                <Link
                  href="/profile/reviews"
                  className="text-sm font-semibold text-pink-600 transition-colors hover:text-pink-700"
                >
                  {product.totalReviews > 0 ? 'เขียนรีวิวสินค้า' : 'เป็นคนแรกที่รีวิวสินค้านี้'}
                </Link>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  ซื้อสินค้าแล้วรีวิวได้ที่ <span className="font-medium text-gray-700">การรีวิว</span> ในโปรไฟล์
                </p>
              </div>
            )}
          </div>
        </div>

        {/* สินค้าที่คล้ายกัน - section ท้ายสุด */}
        {product.similarProducts && product.similarProducts.length > 0 && (
          <div className="mx-4 mt-4 mb-8 px-4 py-4 bg-white rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">สินค้าที่คล้ายกัน</h2>
              <Link href={product.subcategoryId ? `/search?subcategory=${product.subcategoryId}` : '/search'} className="text-sm text-pink-500 hover:text-pink-600 font-medium">
                ดูเพิ่มเติม
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {product.similarProducts.map((similarProduct) => (
                <Link
                  key={similarProduct.id}
                  href={`/products/${similarProduct.id}`}
                  className="block bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col hover:border-pink-200 transition-colors"
                >
                  <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                    {similarProduct.image ? (
                      <img
                        src={similarProduct.image}
                        alt={similarProduct.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="text-gray-400 text-sm">ไม่มีรูปภาพ</div>';
                          }
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">ไม่มีรูปภาพ</span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{similarProduct.name}</h3>
                  <p className="text-lg font-bold text-gray-900 mt-auto">{similarProduct.price.toFixed(2)} บาท</p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 z-10 w-11 h-11 bg-white border-2 border-pink-500 text-pink-500 rounded-full shadow-lg flex items-center justify-center hover:bg-pink-50 transition-colors"
          aria-label="เลื่อนกลับขึ้นด้านบน"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <p className="text-sm font-medium">เพิ่มลงตะกร้าสำเร็จ</p>
        </div>
      )}
    </div>
  );
}

