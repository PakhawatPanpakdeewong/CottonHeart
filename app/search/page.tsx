'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { Filter, X, ChevronLeft, ChevronRight, ChevronUp, ArrowLeft, Search, GitCompare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCompare } from '@/context/CompareContext';

// Icon Component for category button
const HeartIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

interface Product {
  id: string;
  name: string;
  nameEN: string;
  price: string;
  sku: string | null;
  image: string | null;
  category: {
    id: number;
    nameTH: string;
    nameEN: string;
  } | null;
  subCategory: {
    id: number;
    nameTH: string;
    nameEN: string;
  } | null;
}

interface Category {
  id: number;
  nameTH: string;
  nameEN: string;
  subCategories: Array<{
    id: number;
    nameTH: string;
    nameEN: string;
  }>;
}

/** แบรนด์หนึ่งรายการใน UI — รวม brandid ที่ชื่อซ้ำในฐานข้อมูล */
interface BrandGroup {
  ids: number[];
  nameTH: string;
  nameEN: string | null;
}

interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string | null;
  sku?: string | null;
  subCategory?: { id: number; nameTH: string; nameEN: string } | null;
  categoryObj?: { id: number; nameTH: string; nameEN: string } | null;
  onAddToCompare?: () => void;
  isInCompare?: boolean;
}

const ProductCard = ({ id, name, category, price, image, onAddToCompare, isInCompare }: ProductCardProps) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col hover:border-pink-200 transition-colors relative">
    <Link href={`/products/${id}`} className="flex flex-col flex-1">
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
      <p className="text-xs text-gray-500 mb-1">{category}</p>
      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{name}</h3>
      <div className="mt-auto">
        <p className="text-lg font-bold text-gray-900">{price} บาท</p>
      </div>
    </Link>
    {onAddToCompare && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onAddToCompare();
        }}
        className={cn(
          'mt-2 w-full py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors',
          isInCompare
            ? 'bg-pink-100 text-pink-700 border border-pink-200'
            : 'border border-gray-300 text-gray-600 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600'
        )}
      >
        <GitCompare className="h-3.5 w-3.5" />
        {isInCompare ? 'อยู่ในรายการเปรียบเทียบ' : 'เพิ่มเปรียบเทียบ'}
      </button>
    )}
  </div>
);

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getCompareCount, addToCompare, isInCompare } = useCompare();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(searchParams.get('subcategory') || '');
  const [minPrice, setMinPrice] = useState<string>(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || '');
  const [brandsCatalog, setBrandsCatalog] = useState<BrandGroup[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>(() => {
    const b = searchParams.get('brands');
    const cat = searchParams.get('category');
    if (!cat || !b) return [];
    return b.split(',').map((s) => s.trim()).filter(Boolean);
  });
  const [onSaleOnly, setOnSaleOnly] = useState(() => searchParams.get('onSale') === '1');
  const [minRating, setMinRating] = useState<string>(() => {
    const r = searchParams.get('minRating');
    return r && ['3', '4', '5'].includes(r) ? r : '';
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setBrandsCatalog([]);
      setBrandsLoading(false);
      setSelectedBrandIds([]);
      return;
    }

    let cancelled = false;
    setBrandsLoading(true);
    const load = async () => {
      try {
        const params = new URLSearchParams({ category: selectedCategory });
        if (selectedSubCategory) params.set('subcategory', selectedSubCategory);
        const response = await fetch(`/api/brands?${params.toString()}`);
        if (!response.ok) throw new Error('brands fetch failed');
        const data = await response.json();
        if (cancelled) return;
        const list: BrandGroup[] = data.brands || [];
        setBrandsCatalog(list);
        setSelectedBrandIds((prev) =>
          prev.filter((id) => list.some((b) => b.ids.includes(Number(id))))
        );
      } catch (error) {
        console.error('Error fetching brands:', error);
        if (!cancelled) setBrandsCatalog([]);
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedSubCategory]);

  // Search products - accepts optional overrides for initial load from URL
  const searchProducts = async (
    pageNum: number = 1,
    overrides?: {
      q?: string;
      category?: string;
      subcategory?: string;
      minPrice?: string;
      maxPrice?: string;
      sort?: string;
      brands?: string;
      onSale?: boolean;
      minRating?: string;
    }
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const q = overrides?.q ?? searchQuery;
      const cat = overrides?.category ?? selectedCategory;
      const subCat = overrides?.subcategory ?? selectedSubCategory;
      const min = overrides?.minPrice ?? minPrice;
      const max = overrides?.maxPrice ?? maxPrice;
      const sort = overrides?.sort ?? sortBy;
      const brandsCsv =
        overrides?.brands !== undefined
          ? overrides.brands
          : selectedBrandIds.length > 0 && cat
            ? selectedBrandIds.join(',')
            : '';
      const sale = overrides?.onSale ?? onSaleOnly;
      const rating = overrides?.minRating !== undefined ? overrides.minRating : minRating;

      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      if (subCat) params.set('subcategory', subCat);
      if (min) params.set('minPrice', min);
      if (max) params.set('maxPrice', max);
      if (sort) params.set('sort', sort);
      if (brandsCsv) params.set('brands', brandsCsv);
      if (sale) params.set('onSale', '1');
      if (rating) params.set('minRating', rating);
      params.set('page', pageNum.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/products/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setPage(pageNum);

        // Update URL
        router.push(`/search?${params.toString()}`, { scroll: false });
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial search - ใช้ searchParams จาก URL โดยตรง เพื่อให้แน่ใจว่าค่าถูกต้องแม้ state ยังไม่ sync
  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('category');
    const subCat = searchParams.get('subcategory');
    const min = searchParams.get('minPrice');
    const max = searchParams.get('maxPrice');
    const sort = searchParams.get('sort');
    const brands = searchParams.get('brands');
    const onSale = searchParams.get('onSale') === '1';
    const rating = searchParams.get('minRating');
    const brandsForSearch = cat && brands ? brands : undefined;
    if (
      q ||
      cat ||
      subCat ||
      min ||
      max ||
      sort ||
      brandsForSearch ||
      onSale ||
      (rating && ['3', '4', '5'].includes(rating))
    ) {
      searchProducts(1, {
        q: q ?? undefined,
        category: cat ?? undefined,
        subcategory: subCat ?? undefined,
        minPrice: min ?? undefined,
        maxPrice: max ?? undefined,
        sort: sort ?? undefined,
        brands: brandsForSearch,
        onSale: onSale || undefined,
        minRating: rating && ['3', '4', '5'].includes(rating) ? rating : undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- รันครั้งเดียวเมื่อโหลดหน้า
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(1);
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedSubCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSearchQuery('');
    setSortBy('');
    setSelectedBrandIds([]);
    setOnSaleOnly(false);
    setMinRating('');
    setPage(1);
    setProducts([]);
    router.push('/search', { scroll: false });
  };

  /** เลือก/ยกเลิกทุก brandid ในกลุ่มชื่อเดียวกัน — ค้นหาจะได้สินค้าทุกแถวที่ใช้แบรนด์นั้นในประเภทเดียวกัน */
  const toggleBrandGroup = (ids: number[]) => {
    const idStrs = ids.map(String);
    setSelectedBrandIds((prev) => {
      const allOn = idStrs.length > 0 && idStrs.every((x) => prev.includes(x));
      if (allOn) return prev.filter((x) => !idStrs.includes(x));
      return Array.from(new Set([...prev, ...idStrs]));
    });
  };

  const hasActiveFilters =
    selectedCategory ||
    selectedSubCategory ||
    minPrice ||
    maxPrice ||
    searchQuery ||
    sortBy ||
    (selectedBrandIds.length > 0 && !!selectedCategory) ||
    onSaleOnly ||
    !!minRating;

  // Get available subcategories for selected category
  const availableSubCategories = selectedCategory
    ? categories.find((c) => c.id.toString() === selectedCategory)?.subCategories || []
    : [];

  return (
    <div className="min-h-screen bg-[#fcfafc] pb-8">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4 bg-white">
        {/* Back Button and Search Bar */}
        <div className="mb-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-pink-500 hover:text-pink-600 mb-3 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">ย้อนกลับ</span>
          </Link>
          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาตามชื่อหรือ SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                />
              </div>
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className={`h-10 w-10 border rounded-lg flex items-center justify-center transition-colors ${
                    hasActiveFilters
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm w-full mx-4 rounded-xl p-0 max-h-[85vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 border-b">
                  <DialogTitle className="text-xl font-bold">ตัวกรองสินค้า</DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    เลือกตัวกรองเพื่อค้นหาสินค้าที่ต้องการ
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold block">ประเภท</label>
                    <Select
                      value={selectedCategory || undefined}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setSelectedSubCategory('');
                        setSelectedBrandIds([]);
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm border-pink-500 focus:ring-pink-500">
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()} className="text-sm py-2">
                            {category.nameTH}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Filter */}
                  {selectedCategory && availableSubCategories.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold block">หมวดหมู่</label>
                      <Select
                        value={selectedSubCategory || undefined}
                        onValueChange={setSelectedSubCategory}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="ทั้งหมด" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubCategories.map((subCategory) => (
                            <SelectItem key={subCategory.id} value={subCategory.id.toString()} className="text-sm py-2">
                              {subCategory.nameTH}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* แบรนด์ — แสดงหลังเลือกประเภท; รายการตามประเภท (และหมวดย่อยถ้าเลือก) */}
                  {selectedCategory ? (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold block">แบรนด์</label>
                      <p className="text-xs text-gray-500 -mt-1">
                        สินค้าทุกรายการของแบรนด์ในประเภทนี้
                      </p>
                      <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-2">
                        {brandsLoading ? (
                          <p className="text-xs text-gray-400 py-2 text-center">กำลังโหลดแบรนด์…</p>
                        ) : brandsCatalog.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2 text-center">ไม่มีแบรนด์ในประเภทนี้</p>
                        ) : (
                          brandsCatalog.map((b) => {
                            const idStrs = b.ids.map(String);
                            const checked =
                              idStrs.length > 0 && idStrs.every((x) => selectedBrandIds.includes(x));
                            return (
                              <label
                                key={b.ids.join('-')}
                                className="flex items-center gap-2 text-sm cursor-pointer py-1 px-1 rounded hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleBrandGroup(b.ids)}
                                  className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                                />
                                <span className="line-clamp-2">
                                  {b.nameTH || b.nameEN || `แบรนด์ #${b.ids[0]}`}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 border border-dashed border-gray-200">
                      เลือกประเภทสินค้าก่อนจึงจะเลือกกรองตามแบรนด์หรือหมวดหมู่เพิ่มเติมได้ค่ะ
                    </p>
                  )}

                  {/* Sort by - เรียงตาม */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold block">เรียงตาม</label>
                    <Select
                      value={sortBy || 'none'}
                      onValueChange={(v) => setSortBy(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="ไม่เรียง" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-sm py-2">
                          ไม่เรียง
                        </SelectItem>
                        <SelectItem value="new" className="text-sm py-2">
                          สินค้าใหม่ (ตามวันที่เพิ่ม)
                        </SelectItem>
                        <SelectItem value="price_asc" className="text-sm py-2">
                          ราคา: ต่ำ → สูง
                        </SelectItem>
                        <SelectItem value="price_desc" className="text-sm py-2">
                          ราคา: สูง → ต่ำ
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold block">ช่วงราคา</label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="ราคาต่ำสุด"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 h-10 text-sm"
                      />
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="ราคาสูงสุด"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 h-10 text-sm"
                      />
                    </div>
                  </div>

                  {/* โปรโมชัน & รีวิว */}
                  <div className="space-y-3 pt-1 border-t border-gray-100">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onSaleOnly}
                        onChange={(e) => setOnSaleOnly(e.target.checked)}
                        className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      />
                      <span className="font-semibold">เฉพาะสินค้าที่มีโปร / ส่วนลด</span>
                    </label>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold block">คะแนนรีวิวเฉลี่ยขั้นต่ำ</label>
                      <Select
                        value={minRating || 'none'}
                        onValueChange={(v) => setMinRating(v === 'none' ? '' : v)}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="ไม่กรอง" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-sm py-2">
                            ไม่กรอง
                          </SelectItem>
                          <SelectItem value="3" className="text-sm py-2">
                            3 ดาวขึ้นไป
                          </SelectItem>
                          <SelectItem value="4" className="text-sm py-2">
                            4 ดาวขึ้นไป
                          </SelectItem>
                          <SelectItem value="5" className="text-sm py-2">
                            5 ดาว
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        กรองเฉพาะสินค้าที่มีรีวิวและคะแนนเฉลี่ยไม่ต่ำกว่าที่เลือก
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="px-5 pb-5 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      searchProducts(1);
                      setShowFilters(false);
                    }}
                    className="w-full bg-pink-500 text-white py-2.5 px-4 rounded-lg hover:bg-pink-600 transition-colors h-10 text-sm font-semibold"
                  >
                    ค้นหา
                  </button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </form>
          {/* ปุ่มเปรียบเทียบสินค้า */}
          <Link
            href="/compare"
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-pink-500 text-pink-500 rounded-lg hover:bg-pink-50 transition-colors text-sm font-medium"
          >
            <GitCompare className="h-4 w-4" />
            <span>เปรียบเทียบสินค้า</span>
            {getCompareCount() > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs">
                {getCompareCount()}
              </span>
            )}
          </Link>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {searchQuery && (
              <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm flex items-center gap-1">
                ค้นหา: {searchQuery}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchProducts(1);
                  }}
                  className="hover:bg-pink-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                {categories.find((c) => c.id.toString() === selectedCategory)?.nameTH}
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedSubCategory('');
                    searchProducts(1);
                  }}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedSubCategory && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                {availableSubCategories.find((sc) => sc.id.toString() === selectedSubCategory)?.nameTH}
                <button
                  onClick={() => {
                    setSelectedSubCategory('');
                    searchProducts(1);
                  }}
                  className="hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {sortBy && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm flex items-center gap-1">
                {sortBy === 'new'
                  ? 'สินค้าใหม่'
                  : sortBy === 'price_asc'
                    ? 'ราคา: ต่ำ → สูง'
                    : sortBy === 'price_desc'
                      ? 'ราคา: สูง → ต่ำ'
                      : sortBy}
                <button
                  onClick={() => {
                    setSortBy('');
                    searchProducts(1, { sort: '' });
                  }}
                  className="hover:bg-amber-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {brandsCatalog.map((b) => {
              const hasAny = b.ids.some((id) => selectedBrandIds.includes(String(id)));
              if (!hasAny) return null;
              const label = b.nameTH || b.nameEN || `แบรนด์ #${b.ids[0]}`;
              return (
                <span
                  key={b.ids.join('-')}
                  className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-sm flex items-center gap-1 max-w-full"
                >
                  <span className="truncate">{label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const idSet = new Set(b.ids.map(String));
                      const next = selectedBrandIds.filter((x) => !idSet.has(x));
                      setSelectedBrandIds(next);
                      searchProducts(1, { brands: next.length ? next.join(',') : '' });
                    }}
                    className="hover:bg-rose-200 rounded-full p-0.5 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            {selectedBrandIds
              .filter(
                (bid) =>
                  !brandsCatalog.some((b) => b.ids.includes(Number(bid)))
              )
              .map((bid) => (
                <span
                  key={`brand-${bid}`}
                  className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-sm flex items-center gap-1"
                >
                  <span className="truncate">แบรนด์ #{bid}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedBrandIds.filter((x) => x !== bid);
                      setSelectedBrandIds(next);
                      searchProducts(1, { brands: next.length ? next.join(',') : '' });
                    }}
                    className="hover:bg-rose-200 rounded-full p-0.5 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            {onSaleOnly && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm flex items-center gap-1">
                มีโปร / ส่วนลด
                <button
                  type="button"
                  onClick={() => {
                    setOnSaleOnly(false);
                    searchProducts(1, { onSale: false });
                  }}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {minRating && (
              <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm flex items-center gap-1">
                รีวิวเฉลี่ย {minRating}+ ดาว
                <button
                  type="button"
                  onClick={() => {
                    setMinRating('');
                    searchProducts(1, { minRating: '' });
                  }}
                  className="hover:bg-cyan-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                {minPrice ? `${minPrice}` : '0'} - {maxPrice || '∞'} บาท
                <button
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    searchProducts(1);
                  }}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 animate-pulse">
                <div className="w-full h-40 bg-gray-100 rounded-lg mb-3" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-5 bg-gray-100 rounded w-1/2 mb-3" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  category={product.subCategory?.nameTH || product.category?.nameTH || 'ไม่มีหมวดหมู่'}
                  price={product.price}
                  image={product.image}
                  onAddToCompare={() =>
                    addToCompare({
                      id: product.id,
                      name: product.name,
                      nameEN: product.nameEN,
                      price: product.price,
                      image: product.image,
                      sku: product.sku,
                      subCategory: product.subCategory,
                      category: product.category,
                    })
                  }
                  isInCompare={isInCompare(product.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => searchProducts(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ก่อนหน้า
                </button>
                <span className="text-sm text-gray-500 px-4">
                  หน้า {page} จาก {totalPages}
                </span>
                <button
                  onClick={() => searchProducts(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </>
        ) : hasActiveFilters ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">ไม่พบสินค้าที่ค้นหา</p>
            <button
              onClick={handleClearFilters}
              className="text-pink-500 hover:text-pink-600 text-sm"
            >
              ล้างตัวกรอง
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>กรุณาค้นหาหรือเลือกตัวกรองเพื่อดูสินค้า</p>
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
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfafc] pb-8">
          <Header />
          <main className="max-w-md mx-auto px-4 py-4 bg-white">
            <div className="mb-4">
              <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
              <div className="h-10 bg-gray-200 rounded mb-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse" />
              ))}
            </div>
          </main>
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
