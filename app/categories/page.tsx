'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubCategory {
  id: number;
  nameTH: string;
  nameEN: string;
  productCount: number;
}

interface Category {
  id: number;
  nameTH: string;
  nameEN: string;
  subCategories: SubCategory[];
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        const rawCategories = data.categories || [];
        setCategories(rawCategories);
        // Expand first category that has products
        const withProducts = rawCategories
          .map((cat: Category) => ({
            ...cat,
            subCategories: (cat.subCategories || []).filter((sc: SubCategory) => sc.productCount > 0),
          }))
          .filter((cat: { subCategories: SubCategory[] }) => cat.subCategories.length > 0);
        if (withProducts.length > 0) {
          setExpandedCategories(new Set([withProducts[0].id]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSubCategoryClick = (categoryId: number, subCategoryId: number) => {
    router.push(`/search?category=${categoryId}&subcategory=${subCategoryId}`);
  };

  // กรองเฉพาะหมวดที่มีสินค้า
  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        subCategories: category.subCategories.filter((sc) => sc.productCount > 0),
      }))
      .filter((category) => category.subCategories.length > 0);
  }, [categories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">ประเภทสินค้า</h1>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">ย้อนกลับ</span>
            </button>
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">ประเภทสินค้า</h1>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">ย้อนกลับ</span>
            </button>
          </div>
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4">
        {/* Page Title and Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">ประเภทสินค้า</h1>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">ย้อนกลับ</span>
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              ยังไม่มีประเภทสินค้าในขณะนี้
            </div>
          ) : (
          filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                {/* Category Header */}
                <CollapsibleTrigger className={cn(
                  'w-full flex items-center justify-between py-3 px-4 rounded-lg border transition-colors',
                  isExpanded 
                    ? 'bg-pink-50 border-pink-200' 
                    : 'bg-white border-gray-200'
                )}>
                  <span className={cn(
                    'text-base font-medium text-left',
                    isExpanded ? 'text-pink-600' : 'text-gray-900'
                  )}>
                    {category.nameTH}
                  </span>
                  <div className="text-gray-400 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </CollapsibleTrigger>

                {/* Sub-categories */}
                <CollapsibleContent className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {category.subCategories.length > 0 ? (
                    category.subCategories.map((subCategory, index) => (
                      <button
                        key={subCategory.id}
                        onClick={() => handleSubCategoryClick(category.id, subCategory.id)}
                        className={cn(
                          'w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors text-left',
                          index !== category.subCategories.length - 1 && 'border-b border-gray-200'
                        )}
                      >
                        <span className="text-sm text-gray-900">{subCategory.nameTH}</span>
                        <span className="text-sm font-medium text-gray-600">
                          {subCategory.productCount}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="py-3 px-4 text-sm text-gray-500">
                      ไม่มีหมวดหมู่ย่อย
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })
          )}
        </div>
      </main>
    </div>
  );
}
