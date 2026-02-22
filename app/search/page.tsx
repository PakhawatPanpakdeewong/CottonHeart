'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { Filter, X, ChevronLeft, ChevronRight, ChevronUp, ArrowLeft, Search } from 'lucide-react';
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

interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string | null;
}

const ProductCard = ({ id, name, category, price, image }: ProductCardProps) => (
  <Link
    href={`/products/${id}`}
    className="block bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col hover:border-pink-200 transition-colors"
  >
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
);

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Search products
  const searchProducts = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedSubCategory) params.set('subcategory', selectedSubCategory);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (sortBy) params.set('sort', sortBy);
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

  // Initial search - รวมถึงเมื่อมี sort=new จาก URL
  useEffect(() => {
    if (searchParams.get('q') || searchParams.get('category') || searchParams.get('subcategory') || searchParams.get('minPrice') || searchParams.get('maxPrice') || searchParams.get('sort')) {
      searchProducts(1);
    }
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
    setPage(1);
    setProducts([]);
    router.push('/search', { scroll: false });
  };

  const hasActiveFilters = selectedCategory || selectedSubCategory || minPrice || maxPrice || searchQuery || sortBy;

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
              <DialogContent className="max-w-sm w-full mx-4 rounded-xl p-0 max-h-[70vh] flex flex-col">
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
                {sortBy === 'new' ? 'สินค้าใหม่' : sortBy}
                <button
                  onClick={() => {
                    setSortBy('');
                    searchProducts(1);
                  }}
                  className="hover:bg-amber-200 rounded-full p-0.5"
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
