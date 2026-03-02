'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, FileCheck, Truck } from 'lucide-react';
import { THAI_PROVINCES } from '@/lib/thai-provinces';

const SHIPPING_COST = 50;
const DELIVERY_DAYS = 3;

// คำนวณวันที่คาดว่าจะได้รับ (ไม่นับวันหยุด - ใช้ +3 วันตามแผน)
function getEstimatedDeliveryDate(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + DELIVERY_DAYS);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { start, end };
}

function deduplicateAddresses<T extends { addressLine1?: string; subDistrict?: string; postalCode?: string; province?: string }>(
  addrs: T[]
): T[] {
  const seen = new Set<string>();
  return addrs.filter((a) => {
    const key = `${a.addressLine1 || ''}|${a.subDistrict || ''}|${a.postalCode || ''}|${a.province || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// แปลงเป็นรูปแบบ พ.ศ. (พุทธศักราช)
function formatBuddhistDate(date: Date): string {
  const buddhistYear = date.getFullYear() + 543;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  return `${day} ${monthNames[month - 1]} ${buddhistYear}`;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  subDistrict?: string;
  postalCode?: string;
  province?: string;
  shippingMethod?: string;
  confirmed?: string;
}

export default function DeliveryPage() {
  const { cartItems, getSelectedItems, getSelectedTotalPrice, removeFromCart } = useCart();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const firstErrorRef = useRef<HTMLDivElement | null>(null);
  const checkoutSuccessRef = useRef(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<Array<{
    id: number;
    addressLine1: string;
    subDistrict: string;
    postalCode: string;
    province: string;
    isDefault: boolean;
  }>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [addressLine1, setAddressLine1] = useState('');
  const [subDistrict, setSubDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedItems = getSelectedItems();
  const totalPrice = getSelectedTotalPrice();
  const finalTotal = totalPrice + SHIPPING_COST;
  const { start: estStart, end: estEnd } = getEstimatedDeliveryDate();

  // โหลดข้อมูลจาก login (ชื่อ, เบอร์โทร) และตาราง address (ที่อยู่ - ถ้ามี)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.username) {
      const email = user.username.includes('@') ? user.username : user.email || user.username;
      if (!email) return;

      const fetchData = async () => {
        try {
          const profileRes = await fetch(`/api/users/profile?email=${encodeURIComponent(email)}`);
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile.fullName) setFullName(profile.fullName);
            if (profile.phone) setPhone(profile.phone);
          }

          const addressRes = await fetch(`/api/users/address?email=${encodeURIComponent(email)}`);
          if (addressRes.ok) {
            const { addresses: addrs } = await addressRes.json();
            if (addrs?.length > 0) {
              const uniqueAddrs = deduplicateAddresses(addrs);
              setAddresses(uniqueAddrs);
              const defaultAddr = uniqueAddrs.find((a: { isDefault: boolean }) => a.isDefault) || uniqueAddrs[0];
              setSelectedAddressId(defaultAddr.id);
              setUseNewAddress(false);
              setAddressLine1(defaultAddr.addressLine1 || '');
              setSubDistrict(defaultAddr.subDistrict || '');
              setPostalCode(defaultAddr.postalCode || '');
              setProvince(defaultAddr.province || '');
            } else {
              setUseNewAddress(true);
            }
          }
        } catch {
          // ignore
        }
      };
      fetchData();
    }
  }, [isAuthenticated, isLoading, user?.username, user?.email]);

  // Redirect ถ้าไม่ได้ login หรือไม่มีสินค้า
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent('/checkout/delivery')}`);
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !checkoutSuccessRef.current) {
      if (cartItems.length === 0 || selectedItems.length === 0) {
        router.push('/cart');
      }
    }
  }, [cartItems.length, selectedItems.length, isAuthenticated, isLoading, router]);


  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    } else if (phoneDigits.length !== 10) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)';
    }

    if (!addressLine1.trim()) {
      newErrors.addressLine1 = 'กรุณากรอกที่อยู่';
    }

    if (!subDistrict.trim()) {
      newErrors.subDistrict = 'กรุณากรอกแขวง/ตำบล';
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = 'กรุณากรอกรหัสไปรษณีย์';
    } else if (!/^\d{5}$/.test(postalCode.replace(/\s/g, ''))) {
      newErrors.postalCode = 'กรุณากรอกรหัสไปรษณีย์ให้ถูกต้อง (5 หลัก)';
    }

    if (!province) {
      newErrors.province = 'กรุณาเลือกจังหวัด';
    }

    if (!confirmed) {
      newErrors.confirmed = 'กรุณายืนยันเงื่อนไขการจัดส่ง';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      setTimeout(() => {
        firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setIsSubmitting(true);
    try {
      const email = user?.username?.includes('@') ? user.username : user?.email || user?.username || '';
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          phone,
          addressId: useNewAddress ? undefined : selectedAddressId,
          addressLine1: useNewAddress ? addressLine1 : undefined,
          subDistrict: useNewAddress ? subDistrict : undefined,
          postalCode: useNewAddress ? postalCode : undefined,
          province: useNewAddress ? province : undefined,
          items: selectedItems.map((item) => ({
            id: item.id,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง';
        setErrors({ confirmed: errorMsg });
        if (errorMsg.includes('ไม่พบข้อมูลลูกค้า')) {
          logout();
          router.push(`/login?returnUrl=${encodeURIComponent('/checkout/delivery')}`);
        }
        return;
      }
      checkoutSuccessRef.current = true;
      router.push(data.orderId ? `/checkout/payment?orderId=${data.orderId}` : '/checkout/payment');
      selectedItems.forEach((item) => removeFromCart(item.id));
    } catch {
      setErrors({ confirmed: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push('/checkproduct');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  if (!isAuthenticated || cartItems.length === 0 || selectedItems.length === 0) {
    return null;
  }

  const hasError = Object.keys(errors).length > 0;

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      {/* Page Title and Breadcrumbs */}
      <div className="max-w-md mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">การสั่งซื้อสินค้า</h1>
        <div className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">ร้านค้า</Link>
          <span className="mx-2">/</span>
          <span>การจัดส่งและการมอบสินค้า</span>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pb-32">
        {/* Product Summary */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <div className="divide-y divide-gray-100">
            {selectedItems.map((item) => {
              const itemTotal = item.price * item.quantity;
              return (
                <div
                  key={item.id}
                  className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center"
                >
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
              <span className="text-gray-900 font-medium">฿ {SHIPPING_COST.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="text-base font-semibold text-gray-900">รวมทั้งหมด</span>
              <span className="text-lg font-bold text-pink-500">฿ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Form */}
        <div ref={hasError ? firstErrorRef : null} className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            การจัดส่งและการมอบสินค้า
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            การจัดส่งเกิดขึ้นเฉพาะภายในประเทศไทย โปรดตรวจสอบชื่อ เบอร์โทรศัพท์และที่อยู่ในการจัดส่ง ถ้าไม่ถูกต้องให้ทำการแก้ไข
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ชื่อ-นามสกุล */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ-นามสกุล*
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="กรุณาใส่ชื่อและนามสกุลของคุณ"
                className={`h-11 placeholder:text-gray-250 ${errors.fullName ? 'border-red-500' : ''}`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* โทรศัพท์ */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                โทรศัพท์*
              </label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(v);
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="กรุณาใส่เบอร์โทรของคุณ"
                className={`h-11 placeholder:text-gray-250 ${errors.phone ? 'border-red-500' : ''}`}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* เลือกที่อยู่จัดส่ง */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">สถานที่จัดส่ง*</p>

              {addresses.length > 0 && (
                <div className="space-y-2">
                  {addresses.map((addr) => {
                    const addrStr = [addr.addressLine1, addr.subDistrict, addr.postalCode, addr.province].filter(Boolean).join(', ');
                    const isSelected = !useNewAddress && selectedAddressId === addr.id;
                    return (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-pink-500 bg-pink-50/50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingAddress"
                          checked={isSelected}
                          onChange={() => {
                            setUseNewAddress(false);
                            setSelectedAddressId(addr.id);
                            setAddressLine1(addr.addressLine1);
                            setSubDistrict(addr.subDistrict);
                            setPostalCode(addr.postalCode);
                            setProvince(addr.province);
                            setErrors((prev) => ({ ...prev, addressLine1: undefined, subDistrict: undefined, postalCode: undefined, province: undefined }));
                          }}
                          className="mt-1 w-4 h-4 text-pink-500 border-gray-300 focus:ring-pink-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{addrStr}</p>
                          {addr.isDefault && (
                            <span className="inline-block mt-1 text-xs text-pink-500 font-medium">ที่อยู่หลัก</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                  <label
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      useNewAddress ? 'border-pink-500 bg-pink-50/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingAddress"
                      checked={useNewAddress}
                      onChange={() => {
                        setUseNewAddress(true);
                        setSelectedAddressId(null);
                        setAddressLine1('');
                        setSubDistrict('');
                        setPostalCode('');
                        setProvince('');
                        setErrors((prev) => ({ ...prev, addressLine1: undefined, subDistrict: undefined, postalCode: undefined, province: undefined }));
                      }}
                      className="mt-1 w-4 h-4 text-pink-500 border-gray-300 focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-900">ใช้ที่อยู่ใหม่</span>
                  </label>
                </div>
              )}

              {(useNewAddress || addresses.length === 0) && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">กรอกที่อยู่การจัดส่ง</p>
                  <div>
                    <Input
                      value={addressLine1}
                      onChange={(e) => {
                        setAddressLine1(e.target.value);
                        setErrors((prev) => ({ ...prev, addressLine1: undefined }));
                      }}
                      placeholder="บ้านเลขที่ ที่อยู่ถนน อพาร์ตเมนต์ ห้องชุด ชั้น ฯลฯ"
                      className={`h-11 placeholder:text-gray-250 ${errors.addressLine1 ? 'border-red-500' : ''}`}
                    />
                    {errors.addressLine1 && (
                      <p className="text-red-500 text-sm mt-1">{errors.addressLine1}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      value={subDistrict}
                      onChange={(e) => {
                        setSubDistrict(e.target.value);
                        setErrors((prev) => ({ ...prev, subDistrict: undefined }));
                      }}
                      placeholder="แขวงและเขต ตำบลและอำเภอ"
                      className={`h-11 placeholder:text-gray-250 ${errors.subDistrict ? 'border-red-500' : ''}`}
                    />
                    {errors.subDistrict && (
                      <p className="text-red-500 text-sm mt-1">{errors.subDistrict}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        value={postalCode}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                          setPostalCode(v);
                          setErrors((prev) => ({ ...prev, postalCode: undefined }));
                        }}
                        placeholder="รหัสไปรษณีย์"
                        className={`h-11 placeholder:text-gray-250 ${errors.postalCode ? 'border-red-500' : ''}`}
                      />
                      {errors.postalCode && (
                        <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>
                      )}
                    </div>
                    <div>
                      <Select
                        value={province || undefined}
                        onValueChange={(v) => {
                          setProvince(v);
                          setErrors((prev) => ({ ...prev, province: undefined }));
                        }}
                      >
                        <SelectTrigger className={`h-11 [&_span[data-placeholder]]:text-gray-250 ${errors.province ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="จังหวัด" />
                        </SelectTrigger>
                        <SelectContent>
                          {THAI_PROVINCES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.province && (
                        <p className="text-red-500 text-sm mt-1">{errors.province}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {addresses.length > 0 && (
                <Link
                  href="/profile/edit"
                  className="inline-block text-sm text-pink-500 hover:text-pink-600 font-medium"
                >
                  จัดการที่อยู่การจัดส่ง
                </Link>
              )}
            </div>

            {/* วิธีการจัดส่ง */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">วิธีการจัดส่งสินค้า*</p>
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="shipping"
                  defaultChecked
                  className="mt-1 w-4 h-4 text-pink-500 border-gray-300 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">ไปรษณีย์ไทยส่งด่วน (Thai Post EMS)</span>
                    <span className="text-pink-500 font-semibold">฿ {SHIPPING_COST.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    จะได้รับพัสดุภายใน 3 วัน
                    <br />
                    (วันที่ {formatBuddhistDate(estStart)} - {formatBuddhistDate(estEnd)})
                  </p>
                </div>
              </label>
            </div>

            {/* Checkbox ยืนยัน */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(checked) => {
                    setConfirmed(checked === true);
                    setErrors((prev) => ({ ...prev, confirmed: undefined }));
                  }}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  ฉันได้ทําการตรวจสอบรายละเอียดการจัดส่งเรียบร้อย และเข้าใจว่าไม่สามารถยกเลิกออร์เดอร์ได้หลังจากจัดส่ง
                </span>
              </label>
              {errors.confirmed && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmed}</p>
              )}
            </div>

            {/* ปุ่ม */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2.5 border-2 border-pink-500 bg-white text-pink-500 rounded-lg font-medium hover:bg-pink-50 transition-colors text-sm"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={!confirmed || isSubmitting}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  confirmed && !isSubmitting
                    ? 'bg-pink-500 text-white hover:bg-pink-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'กำลังดำเนินการ...' : 'ดำเนินการต่อ'}
              </button>
            </div>
          </form>
        </div>

        {/* Next Steps */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">ขั้นตอนถัดไป</h2>
          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-white border border-pink-200 rounded-lg">
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
                <p className="font-medium text-gray-900">ยืนยันการโอนชำระ</p>
                <p className="text-sm text-gray-600">รับรายการสั่งซื้อและรับรหัสยืนยัน</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
