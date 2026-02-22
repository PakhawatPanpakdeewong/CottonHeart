'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { Trash2, Minus, Plus, ArrowLeft, ChevronUp } from 'lucide-react';

type StockResult = { id: string; available: number; sufficient: boolean };

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, toggleItemSelection, selectAllItems, clearSelection, isItemSelected, getSelectedItems, getSelectedTotalPrice } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const selectedItems = getSelectedItems();
  const totalPrice = getSelectedTotalPrice();
  const shippingCost = 50.00; // Fixed shipping cost
  const finalTotal = totalPrice + shippingCost;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, StockResult>>({});
  const [stockLoading, setStockLoading] = useState(true);

  const getStockKey = (item: { id: string; sku?: string | null }) => `${item.id}-${item.sku ?? ''}`;
  const getStock = (item: { id: string; sku?: string | null }) => stockMap[getStockKey(item)];
  const selectableCount = cartItems.filter((i) => getStock(i)?.sufficient).length;
  const allSelected = selectableCount > 0 && selectedItems.length === selectableCount;

  const fetchStock = useCallback(async () => {
    if (cartItems.length === 0) {
      setStockMap({});
      setStockLoading(false);
      return;
    }
    setStockLoading(true);
    try {
      const res = await fetch('/api/products/stock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ id: i.id, sku: i.sku ?? null, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      const map: Record<string, StockResult> = {};
      const results = data.results ?? [];
      cartItems.forEach((item, i) => {
        const key = `${item.id}-${item.sku ?? ''}`;
        map[key] = results[i] ?? { id: item.id, available: 0, sufficient: false };
      });
      setStockMap(map);
    } catch {
      setStockMap({});
    } finally {
      setStockLoading(false);
    }
  }, [cartItems]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert('กรุณาเลือกสินค้าที่ต้องการสั่งซื้อก่อนดำเนินการ');
      return;
    }
    if (!stockLoading) {
      const insufficient = selectedItems.filter((item) => {
        const s = getStock(item);
        return !s || !s.sufficient;
      });
      if (insufficient.length > 0) {
        alert(insufficient.length === 1
          ? `สินค้า "${insufficient[0].name}" มีจำนวนไม่เพียงพอ กรุณาลดจำนวนหรือลบออกจากตะกร้า`
          : `มีสินค้า ${insufficient.length} รายการที่จำนวนไม่เพียงพอ กรุณาลดจำนวนหรือลบออกจากตะกร้า`);
        return;
      }
    }
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent('/checkproduct')}`);
      return;
    }
    router.push('/checkproduct');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <div className="max-w-md mx-auto px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-700 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">ตะกร้าสินค้า</h1>
          </div>
        </div>
        <main className="max-w-md mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">ตะกร้าว่างเปล่า</h2>
            <p className="text-gray-500 mb-6">ยังไม่มีสินค้าในตะกร้าของคุณ</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
            >
              เริ่มช้อปปิ้ง
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      {/* Page Title and Breadcrumbs */}
      <div className="max-w-md mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ตระกร้าสินค้า</h1>
        <div className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">ร้านค้า</Link>
          <span className="mx-2">/</span>
          <span>รถเข็นช็อปปิ้ง</span>
        </div>
      </div>

      {/* Order Summary */}
      <main className="max-w-md mx-auto px-4 pb-24">
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">จำนวนรายการสินค้า (ที่เลือก)</span>
              <span className="text-gray-900 font-medium">{selectedItems.length} / {cartItems.length} รายการ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">จำนวนชิ้นทั้งหมด (ที่เลือก)</span>
              <span className="text-gray-900 font-medium">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} / {cartItems.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ยอดรวม</span>
              <span className="text-gray-900 font-medium">฿ {totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ค่าจัดส่ง (ขั้นต้น)</span>
              <span className="text-gray-900 font-medium">฿ {shippingCost.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="text-base font-semibold text-gray-900">รวมทั้งหมด</span>
              <span className="text-lg font-bold text-pink-500">฿ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mb-6">
          <button
            onClick={() => {
              if (allSelected) {
                clearSelection();
              } else {
                clearSelection();
                cartItems.forEach((item) => {
                  const s = getStock(item);
                  if (s?.sufficient) toggleItemSelection(item.id);
                });
              }
            }}
            className={`w-full py-2.5 rounded-lg font-medium transition-colors text-sm border-2 border-pink-500 ${
              allSelected ? 'bg-pink-50 text-pink-500' : 'text-pink-500 hover:bg-pink-50'
            }`}
          >
            {allSelected ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกสินค้าทั้งหมด (เฉพาะที่มีสต็อกพอ)'}
          </button>
        </div>

        {/* Product List */}
        <div className="space-y-4">
          {cartItems.map((item, index) => {
            const itemTotal = item.price * item.quantity;
            const stock = getStock(item);
            const available = stock?.available ?? 0;
            const sufficient = stock?.sufficient ?? false;
            const canIncrease = available > item.quantity;
            return (
              <div
                key={`${item.id}-${item.sku ?? ''}-${index}`}
                className={`bg-white border rounded-lg p-4 relative transition-colors ${
                  isItemSelected(item.id) ? 'border-pink-500 border-2' : 'border-gray-200'
                } ${!sufficient ? 'opacity-90' : ''}`}
              >
                {/* Select Button - Top Right */}
                <button
                  onClick={() => sufficient && toggleItemSelection(item.id)}
                  disabled={!sufficient}
                  className={`absolute top-3 right-3 text-xs py-1.5 px-3 rounded-lg font-medium transition-colors ${
                    !sufficient
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : isItemSelected(item.id)
                        ? 'bg-pink-500 text-white'
                        : 'border border-pink-500 text-pink-500 hover:bg-pink-50'
                  }`}
                >
                  {isItemSelected(item.id) ? 'ยกเลิก' : sufficient ? 'เลือก' : 'สต็อกไม่พอ'}
                </button>

                <div className="flex gap-4 pr-20">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="text-gray-400 text-xs">ไม่มีรูป</div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">ไม่มีรูป</div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {item.name}
                    </h3>
                    
                    {/* Unit Price */}
                    <p className="text-xs text-gray-600 mb-1">
                      ราคาหน่วยละ {item.price.toFixed(2)} บาท
                      {item.originalPrice && (
                        <span className="text-pink-500 ml-1">(โปรโมชั่น)</span>
                      )}
                    </p>
                    
                    {/* Total Item Price */}
                    <p className="text-base font-bold text-gray-900 mb-1">
                      {itemTotal.toFixed(2)} บาท
                    </p>
                    {!stockLoading && (
                      <p className={`text-xs mb-2 ${sufficient ? 'text-gray-500' : 'text-red-500 font-medium'}`}>
                        {sufficient ? `คงเหลือ ${available} ชิ้น` : available === 0 ? 'สินค้าหมด' : `สินค้าไม่เพียงพอ (คงเหลือ ${available} ชิ้น)`}
                      </p>
                    )}
                    
                    {/* Quantity Selector, View Details and Delete Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => canIncrease && updateQuantity(item.id, item.quantity + 1)}
                          className={`p-1.5 transition-colors ${canIncrease ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                          disabled={!canIncrease}
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <Link
                        href={`/products/${item.id}`}
                        className="text-xs py-1.5 px-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        ดูรายละเอียด
                      </Link>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-xs py-1.5 px-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-10 w-11 h-11 bg-white border-2 border-pink-500 text-pink-500 rounded-full shadow-lg flex items-center justify-center hover:bg-pink-50 transition-colors"
          aria-label="เลื่อนกลับขึ้นด้านบน"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleCheckout}
            disabled={selectedItems.length === 0}
            className={`w-full py-2.5 rounded-lg font-semibold transition-colors text-sm ${
              selectedItems.length > 0
                ? 'bg-pink-500 text-white hover:bg-pink-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            ดำเนินการสั่งซื้อ
          </button>
        </div>
      </footer>
    </div>
  );
}
