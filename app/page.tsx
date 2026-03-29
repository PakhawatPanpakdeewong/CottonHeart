'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  Heart,
  Baby,
  Package,
  UtensilsCrossed,
  LayoutGrid,
  Sparkles,
  Shirt,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';

// Product Card Component
interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  image?: string | null;
  category?: string | null;
  discountLabel?: string;
  /** แสดงว่าเป็นราคาต่อหน่วย (ไม่ใช่ยอดรวมจากออเดอร์) */
  pricePerUnit?: boolean;
}

const ProductCard = ({
  id,
  name,
  price,
  originalPrice,
  image,
  category,
  discountLabel,
  pricePerUnit,
}: ProductCardProps) => (
  <Link
    href={`/products/${id}`}
    className="block bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col hover:border-pink-200 transition-colors relative"
  >
    {discountLabel && (
      <span className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
        {discountLabel}
      </span>
    )}
    <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
      {image ? (
        <img
          src={image}
          alt={name}
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
        <div className="text-gray-400 text-sm">ไม่มีรูปภาพ</div>
      )}
    </div>
    {category && (
      <p className="text-xs text-gray-500 mb-1">{category}</p>
    )}
    <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{name}</h3>
    <div className="mt-auto">
      {originalPrice && (
        <p className="text-xs text-gray-500 line-through mb-1">จากราคา {originalPrice}</p>
      )}
      {pricePerUnit && (
        <p className="text-xs text-gray-500 mb-0.5">ราคาต่อหน่วย</p>
      )}
      <p className="text-lg font-bold text-gray-900">{price} บาท</p>
    </div>
  </Link>
);

// Section Header Component
interface SectionHeaderProps {
  title: string;
  linkText: string;
  linkHref?: string;
}

const SectionHeader = ({ title, linkText, linkHref }: SectionHeaderProps) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    {linkHref ? (
      <Link href={linkHref} className="text-sm text-pink-500 hover:text-pink-600">
        {linkText}
      </Link>
    ) : (
      <button className="text-sm text-pink-500 hover:text-pink-600">{linkText}</button>
    )}
  </div>
);

interface Product {
  id: string;
  name: string;
  nameEN: string;
  description: string | null;
  price: string;
  sku: string | null;
  image: string | null;
  brand: string | null;
  category: string | null;
  variantId: number | null;
  isActive: boolean | null;
  createdAt: string;
}

interface Category {
  id: number;
  nameTH: string;
  nameEN: string;
  subCategories: Array<{ id: number; nameTH: string; nameEN: string; productCount?: number }>;
}

const CATEGORY_STYLES = [
  { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', icon: 'text-blue-600', Icon: Package },
  { bg: 'bg-green-50', hover: 'hover:bg-green-100', icon: 'text-green-600', Icon: Baby },
  { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', icon: 'text-yellow-700', Icon: Sparkles },
  { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', icon: 'text-amber-700', Icon: Heart },
  { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', icon: 'text-pink-600', Icon: UtensilsCrossed },
  { bg: 'bg-slate-50', hover: 'hover:bg-slate-100', icon: 'text-slate-600', Icon: LayoutGrid },
];

const getCategoryStyle = (category: Category, index: number) => {
  const name = category.nameTH || '';

  // อุปกรณ์ป้อนอาหาร -> โทนสีเทา
  if (name.includes('อุปกรณ์ป้อนอาหาร')) {
    return { bg: 'bg-gray-50', hover: 'hover:bg-gray-100', icon: 'text-gray-600', Icon: UtensilsCrossed };
  }

  // การให้นม / ปั๊มนม
  if (name.includes('ให้นม') || name.includes('ปั๊มนม')) {
    return { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', icon: 'text-pink-600', Icon: Baby };
  }

  // ของเล่น / เสริมพัฒนาการ
  if (name.includes('ของเล่น') || name.includes('พัฒนาการ')) {
    return { bg: 'bg-green-50', hover: 'hover:bg-green-100', icon: 'text-green-600', Icon: LayoutGrid };
  }

  // เสื้อผ้า
  if (name.includes('เสื้อผ้า')) {
    return { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', icon: 'text-yellow-700', Icon: Shirt };
  }

  // ผ้าอ้อม / ผลิตภัณฑ์สำหรับผ้าอ้อม
  if (name.includes('ผ้าอ้อม')) {
    return { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', icon: 'text-purple-600', Icon: Package };
  }

  // ทำความสะอาด / ดูแลความสะอาด
  if (name.includes('ทำความสะอาด') || name.includes('สะอาด')) {
    return { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', icon: 'text-indigo-600', Icon: Sparkles };
  }

  // อาหาร / อาหารเสริม / ป้อนอาหาร
  if (name.includes('อาหาร') || name.includes('ป้อน')) {
    return { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', icon: 'text-amber-700', Icon: UtensilsCrossed };
  }

  // หมวดดูแลทั่วไป/อื่น ๆ
  if (name.includes('ดูแล') || name.includes('อุปกรณ์')) {
    return { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', icon: 'text-pink-600', Icon: Heart };
  }

  // Fallback: ใช้ลำดับเดิมหมุนตาม index
  return CATEGORY_STYLES[index % CATEGORY_STYLES.length];
};

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [generalProducts, setGeneralProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previouslyOrderedProducts, setPreviouslyOrderedProducts] = useState<
    { id: string; name: string; price: number; image: string | null; category: string }[]
  >([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [loadingOrdered, setLoadingOrdered] = useState(false);
  const [discountedProducts, setDiscountedProducts] = useState<
    { id: string; name: string; price: string; originalPrice: string; image: string | null; category: string | null; discountLabel: string }[]
  >([]);
  const [loadingDiscounted, setLoadingDiscounted] = useState(true);
  const [errorRecommended, setErrorRecommended] = useState<string | null>(null);
  const [errorNew, setErrorNew] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const { getTotalItems } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { favorites } = useFavorites();
  const totalItems = getTotalItems();
  const [favoritesPageIndex, setFavoritesPageIndex] = useState(0);

  const CARDS_PER_PAGE = 2;
  const maxFavoritesPage = Math.max(0, Math.ceil(favorites.length / CARDS_PER_PAGE) - 1);
  const displayedFavorites = favorites.slice(
    favoritesPageIndex * CARDS_PER_PAGE,
    favoritesPageIndex * CARDS_PER_PAGE + CARDS_PER_PAGE
  );

  const goFavoritesPage = (direction: 'left' | 'right') => {
    setFavoritesPageIndex((prev) => {
      if (direction === 'left') return Math.max(0, prev - 1);
      return Math.min(maxFavoritesPage, prev + 1);
    });
  };

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(favorites.length / CARDS_PER_PAGE) - 1);
    setFavoritesPageIndex((prev) => Math.min(prev, maxPage));
  }, [favorites.length, maxFavoritesPage]);

  // Fetch new products (added this month)
  useEffect(() => {
    const fetchNewProducts = async () => {
      try {
        setLoadingNew(true);
        const response = await fetch('/api/products/new');
        if (!response.ok) {
          throw new Error('Failed to fetch new products');
        }
        const data = await response.json();
        setNewProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching new products:', err);
        setErrorNew(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดสินค้าใหม่');
      } finally {
        setLoadingNew(false);
      }
    };

    fetchNewProducts();
  }, []);

  // Fetch discounted products (สินค้าที่เข้าร่วมรายการส่วนลด)
  useEffect(() => {
    const fetchDiscountedProducts = async () => {
      try {
        setLoadingDiscounted(true);
        const response = await fetch('/api/products/discounted');
        if (response.ok) {
          const data = await response.json();
          setDiscountedProducts(data.products || []);
        }
      } catch {
        setDiscountedProducts([]);
      } finally {
        setLoadingDiscounted(false);
      }
    };
    fetchDiscountedProducts();
  }, []);

  // สินค้าทั่วไป: สุ่มจากทั้งฐานข้อมูล (ORDER BY RANDOM() ฝั่ง API)
  useEffect(() => {
    const fetchGeneralProducts = async () => {
      try {
        setLoadingGeneral(true);
        const response = await fetch('/api/products/random?limit=10');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setGeneralProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching general products:', err);
        setErrorGeneral(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดสินค้าทั่วไป');
      } finally {
        setLoadingGeneral(false);
      }
    };

    fetchGeneralProducts();
  }, []);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        const rawCategories: Category[] = data.categories || [];

        // Keep only categories that have at least one sub-category with products
        const filteredCategories = rawCategories
          .map((category) => ({
            ...category,
            subCategories: (category.subCategories || []).filter(
              (subCategory) => (subCategory.productCount || 0) > 0
            ),
          }))
          .filter((category) => category.subCategories.length > 0);

        setCategories(filteredCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch previously ordered products (สินค้าที่เคยสั่งซื้อ) when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPreviouslyOrderedProducts([]);
      return;
    }
    const email = user.username?.includes('@') ? user.username : user.email || user.username;
    if (!email) return;

    const fetchOrderedProducts = async () => {
      try {
        setLoadingOrdered(true);
        const res = await fetch(`/api/users/orders?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        const orders = data.orders || [];
        // Deduplicate by productId (keep most recent order)
        const seen = new Set<string>();
        const unique = orders
          .filter((o: { productId: string }) => {
            if (seen.has(o.productId)) return false;
            seen.add(o.productId);
            return true;
          })
          .map(
            (o: {
              productId: string;
              productName: string;
              price: number;
              unitPrice?: number;
              quantity?: number;
              image: string | null;
              category: string;
            }) => {
              const perUnit =
                typeof o.unitPrice === 'number' && o.unitPrice > 0
                  ? o.unitPrice
                  : o.quantity && o.quantity > 0
                    ? o.price / o.quantity
                    : o.price;
              return {
                id: o.productId,
                name: o.productName,
                price: perUnit,
                image: o.image,
                category: o.category || '',
              };
            }
          );
        setPreviouslyOrderedProducts(unique);
      } catch {
        setPreviouslyOrderedProducts([]);
      } finally {
        setLoadingOrdered(false);
      }
    };

    fetchOrderedProducts();
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 space-y-8 pb-8">
        {/* Favorite Products - โชว์ทีละ 2 การ์ด */}
        {favorites.length > 0 && (
          <section className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">สินค้าที่ชอบ</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goFavoritesPage('left')}
                  disabled={favoritesPageIndex === 0}
                  aria-label="เลื่อนซ้าย"
                  className={`w-9 h-9 rounded-full border shadow-sm flex items-center justify-center transition-colors ${
                    favoritesPageIndex === 0
                      ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => goFavoritesPage('right')}
                  disabled={favoritesPageIndex >= maxFavoritesPage}
                  aria-label="เลื่อนขวา"
                  className={`w-9 h-9 rounded-full border shadow-sm flex items-center justify-center transition-colors ${
                    favoritesPageIndex >= maxFavoritesPage
                      ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {displayedFavorites.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col hover:border-pink-200 transition-colors"
                >
                  <div className="w-full h-32 bg-white rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="text-gray-400 text-xs">ไม่มีรูปภาพ</div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">ไม่มีรูปภาพ</div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-base font-bold text-gray-900 mt-auto">{product.price.toFixed(2)} บาท</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Previously Ordered Products - Only show if authenticated, data from DB */}
        {isAuthenticated && (
          <section>
            <SectionHeader
              title="สินค้าที่เคยสั่งซื้อ"
              linkText="ดูเพิ่มเติม"
              linkHref="/profile"
            />
            {loadingOrdered ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />
                <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />
              </div>
            ) : previouslyOrderedProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {previouslyOrderedProducts.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price.toFixed(2)}
                    image={product.image}
                    category={product.category}
                    pricePerUnit
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm bg-white rounded-xl border border-gray-100">
                คุณยังไม่มีประวัติการสั่งซื้อ
              </div>
            )}
          </section>
        )}

        {/* สินค้าที่มีส่วนลด - จากตาราง Discounts */}
        {(loadingDiscounted || discountedProducts.length > 0) && (
          <section>
            <SectionHeader
              title="สินค้าที่มีส่วนลด"
              linkText="ดูเพิ่มเติม"
              linkHref="/search"
            />
            {loadingDiscounted ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />
                <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {discountedProducts.slice(0, 6).map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={product.image}
                    category={product.category}
                    discountLabel={product.discountLabel}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Product Categories - Shop By Category style */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">ประเภทสินค้า</h2>
            <Link href="/categories" className="text-sm font-medium text-orange-500 hover:text-orange-600">
              หมวดอื่นๆ
            </Link>
          </div>
          {loadingCategories ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl p-4 h-14 animate-pulse" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {categories.slice(0, 6).map((category, index) => {
                const style = getCategoryStyle(category, index);
                const IconComponent = style.Icon;
                return (
                  <Link
                    key={category.id}
                    href={`/search?category=${category.id}`}
                    className={`${style.bg} ${style.hover} rounded-xl p-4 flex items-center gap-3 transition-colors`}
                  >
                    <div className={`flex-shrink-0 ${style.icon}`}>
                      <IconComponent className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 line-clamp-2">
                      {category.nameTH}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              ไม่มีประเภทสินค้าในระบบ
            </div>
          )}
        </section>

        {/* New Products - แสดงเฉพาะเมื่อมีสินค้าใหม่หรือกำลังโหลด */}
        {(loadingNew || (!errorNew && newProducts.length > 0)) && (
          <section>
            <SectionHeader title="สินค้าใหม่" linkText="ดูเพิ่มเติม" linkHref="/search?sort=new" />
            {loadingNew ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
                <div className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {newProducts.slice(0, 6).map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.image}
                    category={product.category}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        
        {/* General Products - สินค้าทั่วไป (สุ่มจากฐานข้อมูล) */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">สินค้าทั่วไป</h2>
          </div>
          {loadingGeneral ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
              <div className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
            </div>
          ) : errorGeneral ? (
            <div className="text-center py-8 text-gray-500">
              <p>{errorGeneral}</p>
            </div>
          ) : generalProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {generalProducts.slice(0, 10).map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  image={product.image}
                  category={product.category}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>ไม่มีสินค้าทั่วไปที่สามารถแสดงได้</p>
            </div>
          )}
        </section>
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
    </div>
  );
}
