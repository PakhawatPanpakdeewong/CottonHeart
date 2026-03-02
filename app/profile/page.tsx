'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import {
  User,
  MapPin,
  Phone,
  FileText,
  MessageCircle,
  Star,
  LogOut,
  CreditCard,
  ChevronUp,
} from 'lucide-react';

// Order status types
type OrderStatus = 'ordered' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  orderId?: string;
  productId: string;
  productName: string;
  category: string;
  image: string | null;
  variant?: string;
  variantId?: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  totalAmount?: number;
  paymentAmount?: number | null;
  paymentStatus?: string | null;
  paymentDeadlineAt?: string | null;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  ordered: 'ที่สั่งซื้อ',
  confirmed: 'ยืนยันแล้ว',
  shipping: 'กำลังจัดส่ง',
  delivered: 'ส่งสำเร็จ',
  cancelled: 'ยกเลิก',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  ordered: 'border-pink-500 text-pink-500 bg-pink-50',
  confirmed: 'border-green-500 text-green-500 bg-green-50',
  shipping: 'border-blue-500 text-blue-500 bg-blue-50',
  delivered: 'border-green-500 text-green-500 bg-green-50',
  cancelled: 'border-red-500 text-red-500 bg-red-50',
};

// Mask phone for privacy
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return 'XXX-XXX-XXXX';
  return `XXX-XXX-${phone.slice(-4)}`;
}

function formatPaymentDeadline(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  const buddhistYear = d.getFullYear() + 543;
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return `${day} ${month} ${buddhistYear} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} น.`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending_payment' | OrderStatus>('all');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    fullName: string;
    email: string;
    address: string;
    phone: string;
    profileImage: string | null;
  } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Show scroll-to-top button when scrolled down
  useEffect(() => {
    const onScroll = () => setShowScrollTop(typeof window !== 'undefined' && window.scrollY > 200);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent('/profile')}`);
    }
  }, [isAuthenticated, isLoading, router]);

  // Load profile data from API
  useEffect(() => {
    if (isAuthenticated && user) {
      const email = user.username?.includes('@') ? user.username : user.email || user.username;
      if (email) {
        Promise.all([
          fetch(`/api/users/profile?email=${encodeURIComponent(email)}`).then((r) => r.json()),
          fetch(`/api/users/address?email=${encodeURIComponent(email)}`).then((r) => r.json()),
        ])
          .then(([profile, addr]) => {
            const addressStr = addr.address
              ? [addr.address.addressLine1, addr.address.subDistrict, addr.address.postalCode, addr.address.province]
                  .filter(Boolean)
                  .join(', ')
              : '';
            setProfileData({
              fullName: profile.fullName || user.username || 'ผู้ใช้งาน',
              email: email,
              address: addressStr || 'ยังไม่ได้ระบุที่อยู่',
              phone: profile.phone || '',
              profileImage: null,
            });
          })
          .catch(() => {
            setProfileData({
              fullName: user.username || 'ผู้ใช้งาน',
              email: email || '',
              address: 'ยังไม่ได้ระบุที่อยู่',
              phone: '',
              profileImage: null,
            });
          });
      }
    }
  }, [isAuthenticated, user]);

  // Load order history from API
  useEffect(() => {
    if (isAuthenticated && user) {
      const email = user.username?.includes('@') ? user.username : user.email || user.username;
      if (email) {
        setOrdersLoading(true);
        fetch(`/api/users/orders?email=${encodeURIComponent(email)}`)
          .then((res) => res.json())
          .then((data) => setOrders(data.orders || []))
          .catch(() => setOrders([]))
          .finally(() => setOrdersLoading(false));
      } else {
        setOrdersLoading(false);
      }
    }
  }, [isAuthenticated, user]);

  const filteredOrders =
    orderFilter === 'all'
      ? orders
      : orderFilter === 'pending_payment'
        ? orders.filter(
            (o) =>
              o.status !== 'cancelled' &&
              (o.status === 'ordered' || o.status === 'confirmed') &&
              o.paymentStatus !== 'completed'
          )
        : orderFilter === 'ordered'
          ? orders.filter(
              (o) =>
                o.status !== 'cancelled' &&
                (o.status === 'ordered' || o.status === 'confirmed') &&
                o.paymentStatus === 'completed'
            )
          : orders.filter((o) => o.status === orderFilter);

  // Group by orderId (หมายเลขออเดอร์) - one card per order
  const ordersByOrderId = filteredOrders.reduce<Record<string, OrderItem[]>>((acc, item) => {
    const oid = item.orderId ?? item.id;
    if (!acc[oid]) acc[oid] = [];
    acc[oid].push(item);
    return acc;
  }, {});
  const orderGroups = Object.entries(ordersByOrderId);

  const orderTabs = [
    { key: 'all' as const, label: 'รายการทั้งหมด' },
    { key: 'pending_payment' as const, label: 'ที่ต้องชำระ' },
    { key: 'ordered' as const, label: 'ที่สั่งซื้อ' },
    { key: 'shipping' as const, label: 'กำลังจัดส่ง' },
    { key: 'delivered' as const, label: 'ส่งสำเร็จ' },
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-6">
          <User className="w-6 h-6 text-pink-500" />
          <h1 className="text-xl font-bold text-gray-900">โปรไฟล์ผู้ใช้งาน</h1>
        </div>

        {/* Profile Info Card - Combined */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="p-5 space-y-4">
            {/* Name & Email */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {profileData?.fullName || user?.username || 'ผู้ใช้งาน'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {profileData?.email || '—'}
              </p>
            </div>

            <div className="border-t border-gray-100" />

            {/* Address */}
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  ที่อยู่การจัดส่งหลัก
                </p>
                <p className="text-sm text-gray-700">
                  {profileData?.address || 'ยังไม่ได้ระบุที่อยู่'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Phone */}
            <div className="flex gap-3">
              <Phone className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  เบอร์โทรศัพท์
                </p>
                <p className="text-sm text-gray-700">
                  {profileData?.phone ? maskPhone(profileData.phone) : 'XXX-XXX-XXXX'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/profile/edit"
            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            ข้อมูลส่วนตัวเพิ่มเติม
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            ติดต่อกับร้านค้า
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>

        {/* Order History Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            ประวัติการสั่งซื้อสินค้า
          </h2>

          {/* Order Status Tabs */}
          <div className="flex gap-4 border-b border-gray-200 mb-4 overflow-x-auto">
            {orderTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setOrderFilter(tab.key)}
                className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  orderFilter === tab.key
                    ? 'text-pink-500 border-b-2 border-pink-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Order List */}
          {ordersLoading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-gray-500">กำลังโหลดประวัติการสั่งซื้อ...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-gray-500 mb-4">คุณยังไม่มีประวัติการสั่งซื้อ</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                เริ่มช้อปปิ้ง
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orderGroups.map(([orderId, items]) => {
                const firstItem = items[0];
                return (
                  <div
                    key={orderId}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                  >
                    {/* หมายเลขออเดอร์ */}
                    <p className="text-xs font-medium text-gray-500 mb-3">
                      หมายเลขออเดอร์: <span className="text-gray-900">{orderId}</span>
                    </p>
                    {/* รายการสินค้าในออเดอร์ */}
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.productName}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-gray-400">ไม่มีรูป</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                              {item.productName}
                            </h3>
                            {item.variant && (
                              <p className="text-xs text-gray-600 mb-1">
                                ประเภท: {item.variant}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 mb-1">
                              จำนวน: {item.quantity} หน่วย
                            </p>
                            <p className="font-bold text-gray-900">฿ {item.price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ส่วนของที่ต้องชำระ */}
                    {firstItem.status !== 'cancelled' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="w-4 h-4 text-pink-500" />
                          <span className="text-sm font-semibold text-gray-900">ที่ต้องชำระ</span>
                        </div>
                        {(() => {
                          const amount =
                            firstItem.paymentAmount ??
                            firstItem.totalAmount ??
                            items.reduce((s, i) => s + i.price, 0);
                          const needsPayment =
                            (firstItem.status === 'ordered' || firstItem.status === 'confirmed') &&
                            firstItem.paymentStatus !== 'completed';
                          if (needsPayment && amount > 0) {
                            return (
                              <div className="space-y-2">
                                <p className="text-sm font-bold text-pink-600">
                                  ยอดที่ต้องชำระ: ฿ {amount.toFixed(2)}
                                </p>
                                {firstItem.paymentDeadlineAt && (
                                  <p className="text-xs text-gray-600">
                                    หมดเวลาชำระ: {formatPaymentDeadline(firstItem.paymentDeadlineAt)}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return (
                            <p className="text-sm text-gray-600">
                              ชำระแล้ว: ฿ {amount > 0 ? amount.toFixed(2) : '—'}
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[firstItem.status]}`}
                      >
                        {STATUS_LABELS[firstItem.status]}
                      </span>
                      <Link
                        href={`/orders/${orderId}`}
                        className="inline-flex items-center px-3 py-1.5 border border-pink-500 rounded-lg text-xs font-medium text-pink-500 bg-white hover:bg-pink-50"
                      >
                        ดูรายละเอียดออเดอร์
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-white border-2 border-pink-500 text-pink-500 shadow-lg flex items-center justify-center hover:bg-pink-50 transition-colors z-50"
            aria-label="เลื่อนขึ้นด้านบน"
          >
            <ChevronUp className="w-6 h-6" strokeWidth={2.5} />
          </button>
        )}

        {/* Bottom Action Buttons */}
        <div className="mt-6 space-y-3">
          <Link
            href="/profile/reviews"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
          >
            <Star className="w-4 h-4" />
            รีวิวสินค้า
          </Link>
        </div>
      </main>
    </div>
  );
}
