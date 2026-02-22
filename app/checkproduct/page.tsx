'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Truck, CreditCard, FileCheck } from 'lucide-react';

// Validate email format
const isValidEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

export default function CheckProductPage() {
  const { cartItems, getSelectedItems, getSelectedTotalPrice } = useCart();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [checkboxError, setCheckboxError] = useState('');
  const [stockError, setStockError] = useState('');
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  const selectedItems = getSelectedItems();
  const totalPrice = getSelectedTotalPrice();
  const shippingCost = 50;
  const finalTotal = totalPrice + shippingCost;

  // Get default email from user (email or username if it looks like email)
  const getDefaultEmail = () => {
    if (!user) return '';
    if (user.email) return user.email;
    if (user.username && user.username.includes('@')) return user.username;
    return '';
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent('/checkproduct')}`);
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect if cart is empty or no items selected
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (cartItems.length === 0 || selectedItems.length === 0) {
        router.push('/cart');
      }
    }
  }, [cartItems.length, selectedItems.length, isAuthenticated, isLoading, router]);

  // Pre-fill email when user loads
  useEffect(() => {
    if (user && email === '') {
      setEmail(getDefaultEmail());
    }
  }, [user]);

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setCheckboxError('');
    setStockError('');

    let hasError = false;

    if (!email.trim()) {
      setEmailError('กรุณากรอกอีเมลล์');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setEmailError('รูปแบบอีเมลล์ไม่ถูกต้อง กรุณากรอกใหม่');
      hasError = true;
    }

    if (!confirmed) {
      setCheckboxError('กรุณายืนยันการตรวจสอบรายการสินค้า');
      hasError = true;
    }

    if (hasError) return;

    setIsCheckingStock(true);
    try {
      const res = await fetch('/api/products/stock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({ id: i.id, sku: i.sku ?? null, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      const results = data.results ?? [];
      const insufficient = selectedItems.filter((_, i) => {
        const r = results[i];
        return !r || !r.sufficient;
      });
      if (insufficient.length > 0) {
        setStockError(
          insufficient.length === 1
            ? `สินค้า "${insufficient[0].name}" มีจำนวนไม่เพียงพอ กรุณากลับไปแก้ไขตะกร้า`
            : `มีสินค้า ${insufficient.length} รายการที่จำนวนไม่เพียงพอ กรุณากลับไปแก้ไขตะกร้า`
        );
        return;
      }
      router.push('/checkout/delivery');
    } catch {
      setStockError('ไม่สามารถตรวจสอบสต็อกได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCheckingStock(false);
    }
  };

  const handleEditClick = () => {
    router.push('/cart');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  // Don't render if not authenticated, cart empty, or no items selected (will redirect)
  if (!isAuthenticated || cartItems.length === 0 || selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      {/* Page Title and Breadcrumbs */}
      <div className="max-w-md mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">การสั่งซื้อสินค้า</h1>
        <div className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">ร้านค้า</Link>
          <span className="mx-2">/</span>
          <span>ตรวจสอบการสั่งซื้อสินค้า</span>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pb-24">
        {/* Product Summary - Read only, single card with list */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <div className="divide-y divide-gray-100">
            {selectedItems.map((item) => {
              const itemTotal = item.price * item.quantity;
              return (
                <div
                  key={item.id}
                  className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center"
                >
                  {/* Product Image - light pink background */}
                  <div className="w-20 h-20 bg-pink-50 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.img-fallback');
                            if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                          }
                        }}
                      />
                    ) : null}
                    <div className={`img-fallback text-gray-400 text-xs ${item.image ? 'hidden' : ''}`}>
                      ไม่มีรูป
                    </div>
                  </div>
                  {/* Product Details - center */}
                  <div className="flex-1 min-w-0">
                    {item.category && (
                      <p className="text-xs text-gray-500 mb-0.5">{item.category}</p>
                    )}
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5 line-clamp-2">
                      {item.name}
                    </h3>
                    {item.sku && (
                      <p className="text-xs text-gray-900 mb-0.5">ประเภท: {item.sku}</p>
                    )}
                    <p className="text-xs text-gray-900">
                      จํานวน: {item.quantity} หน่วย
                    </p>
                  </div>
                  {/* Price - right aligned */}
                  <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                    ฿ {itemTotal.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Totals */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ยอดรวม</span>
              <span className="text-gray-900 font-medium">฿ {totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ค่าจัดส่ง (ขั้นต้น)</span>
              <span className="text-gray-900 font-medium">฿ {shippingCost.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="text-base font-semibold text-gray-900">รวมทั้งหมด</span>
              <span className="text-lg font-bold text-pink-500">฿ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Check Order Form */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">ตรวจสอบการสั่งซื้อสินค้า</h2>
          <p className="text-sm text-gray-600 mb-4">
            เมื่อตรวจสอบรายการสินค้าเรียบร้อยแล้ว กรุณายืนยันอีเมลล์ เราจะส่งการอัปเดตสถานะใบสั่งซื้อให้ทางที่อยู่อีเมลล์ที่ระบุไว้ ในบัญชีของคุณ{' '}
            <button
              type="button"
              onClick={() => setEmail('')}
              className="text-pink-500 hover:text-pink-600 underline"
            >
              เปลี่ยนอีเมลล์
            </button>
          </p>

          <form onSubmit={handleProceed} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                อีเมลล์*
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="กรุณาใส่อีเมลล์ของคุณ"
                className={`h-11 ${emailError ? 'border-red-500' : ''}`}
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    setCheckboxError('');
                  }}
                  className="w-4 h-4 shrink-0 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">
                  ฉันได้ทําการตรวจสอบรายการสินค้าเรียบร้อยแล้ว
                </span>
              </label>
              {checkboxError && (
                <p className="text-red-500 text-sm mt-1">{checkboxError}</p>
              )}
            </div>

            {stockError && (
              <p className="text-red-500 text-sm font-medium">{stockError}</p>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleEditClick}
                className="w-full py-2.5 border-2 border-pink-500 bg-white text-pink-500 rounded-lg font-medium hover:bg-pink-50 transition-colors text-sm"
              >
                แก้ไขรายการสินค้า
              </button>
              <button
                type="submit"
                disabled={isCheckingStock}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  confirmed && !isCheckingStock
                    ? 'bg-pink-500 text-white hover:bg-pink-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCheckingStock ? 'กำลังตรวจสอบสต็อก...' : 'ดำเนินการต่อ'}
              </button>
            </div>
          </form>
        </div>

        {/* Next Steps */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">ขั้นตอนถัดไป</h2>
          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">วิธีการจัดส่ง</p>
                <p className="text-sm text-gray-600">เลือกวิธีที่คุณต้องการรับสินค้า</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">ข้อมูลการชำระเงิน</p>
                <p className="text-sm text-gray-600">เลือกวิธีการชำระเงินและรายละเอียดการชำระเงิน</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">ยืนยันการสั่งซื้อ</p>
                <p className="text-sm text-gray-600">รับรายการสั่งซื้อและรับอีเมลล์ยืนยัน</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
