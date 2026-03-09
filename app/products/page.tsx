'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import { ArrowLeft, ArrowUp, Plus } from 'lucide-react';

// Product Card Component
interface ProductCardProps {
  id: string;
  name: string;
  category: string | null;
  price: string;
  originalPrice?: string;
  image: string | null;
}

const ProductCard = ({ id, name, category, price, originalPrice, image }: ProductCardProps) => {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      id,
      name,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      image: image || null,
      category: category || null,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
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
      {category && <p className="text-xs text-gray-500 mb-1">{category}</p>}
      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{name}</h3>
      <div className="mt-auto">
        {originalPrice && (
          <p className="text-xs text-gray-500 line-through mb-1">จากราคา {originalPrice}</p>
        )}
        <p className="text-lg font-bold text-gray-900 mb-3">{price} บาท</p>
        <div className="flex gap-2">
          <Link
            href={`/products/${id}`}
            className="flex-1 text-xs py-2 px-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center"
          >
            ดูรายละเอียด
          </Link>
          <button
            onClick={handleAddToCart}
            className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white hover:bg-pink-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface Product {
  id: string;
  name: string;
  category: string | null;
  price: string;
  originalPrice?: string;
  image: string | null;
}

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageTitle, setPageTitle] = useState('สินค้าแนะนำ');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');

        // Get query parameters
        const categoryId = searchParams.get('category');
        const subCategoryId = searchParams.get('subcategory');

        // Build API URL
        let apiUrl = '/api/products/search?';
        const params = new URLSearchParams();
        
        if (categoryId) {
          params.append('category', categoryId);
        }
        if (subCategoryId) {
          params.append('subcategory', subCategoryId);
        }

        // If no filters, use regular products endpoint
        if (!categoryId && !subCategoryId) {
          apiUrl = '/api/products';
        } else {
          apiUrl += params.toString();
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        
        // Handle different response formats
        const productsData = data.products || data.products || [];
        
        const formattedProducts: Product[] = productsData.map((product: any) => ({
          id: product.id,
          name: product.name,
          category: product.subCategory?.nameTH || product.category || null,
          price: product.price || '0.00',
          image: product.image || null,
        }));

        setProducts(formattedProducts);

        // Set page title based on filters
        if (subCategoryId) {
          // Try to get subcategory name from products
          if (formattedProducts.length > 0 && formattedProducts[0].category) {
            setPageTitle(formattedProducts[0].category);
          } else {
            setPageTitle('สินค้า');
          }
        } else if (categoryId) {
          setPageTitle('สินค้า');
        } else {
          setPageTitle('สินค้าแนะนำ');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดสินค้า');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfafc] pb-20">
        <Header />
        <main className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-pink-500 hover:text-pink-600"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">ย้อนกลับ</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfafc] pb-20">
        <Header />
        <main className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-pink-500 hover:text-pink-600"
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
    <div className="min-h-screen bg-[#fcfafc] pb-20">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4">
        {/* Page Title and Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-pink-500 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">ย้อนกลับ</span>
          </button>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                category={product.category}
                price={product.price}
                image={product.image}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>ไม่พบสินค้า</p>
          </div>
        )}
      </main>

      {/* Footer - Back to Top */}
      {products.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3">
          <div className="max-w-md mx-auto px-4">
            <button
              onClick={scrollToTop}
              className="w-full flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 py-2"
            >
              <ArrowUp className="w-5 h-5" />
              <span className="text-sm">กลับสู่ด้านบน</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfafc] pb-20">
          <Header />
          <main className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">สินค้าแนะนำ</h1>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
              ))}
            </div>
          </main>
        </div>
      }
    >
      <ProductsPageInner />
    </Suspense>
  );
}
