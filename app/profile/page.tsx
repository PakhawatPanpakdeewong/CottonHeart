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
  CreditCard,
  Star,
  XCircle,
  LogOut,
} from 'lucide-react';

// Order status types
type OrderStatus = 'ordered' | 'shipping' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  orderId?: string;
  productId: string;
  productName: string;
  category: string;
  image: string | null;
  variant?: string;
  quantity: number;
  price: number;
  status: OrderStatus;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  ordered: 'ที่สั่งซื้อ',
  shipping: 'กำลังจัดส่ง',
  delivered: 'ส่งสำเร็จ',
  cancelled: 'ยกเลิก',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  ordered: 'border-pink-500 text-pink-500 bg-pink-50',
  shipping: 'border-blue-500 text-blue-500 bg-blue-50',
  delivered: 'border-green-500 text-green-500 bg-green-50',
  cancelled: 'border-red-500 text-red-500 bg-red-50',
};

// Mask phone for privacy
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return 'XXX-XXX-XXXX';
  return `XXX-XXX-${phone.slice(-4)}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    fullName: string;
    email: string;
    address: string;
    phone: string;
    profileImage: string | null;
  } | null>(null);

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
      : orders.filter((o) => o.status === orderFilter);

  const orderTabs = [
    { key: 'all' as const, label: 'รายการทั้งหมด' },
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

        {/* User Info Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profileData?.profileImage ? (
                <img
                  src={profileData.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 truncate">
                {profileData?.fullName || user?.username || 'ผู้ใช้งาน'}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {profileData?.email || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Delivery Address */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            ที่อยู่การจัดส่งหลัก
          </h3>
          <p className="text-sm text-gray-600">
            {profileData?.address || 'ยังไม่ได้ระบุที่อยู่'}
          </p>
        </div>

        {/* Phone Number */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            เบอร์โทรศัพท์
          </h3>
          <p className="text-sm text-gray-600">
            {profileData?.phone ? maskPhone(profileData.phone) : 'XXX-XXX-XXXX'}
          </p>
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
          <Link
            href="/profile/payment"
            className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 border border-pink-500 rounded-lg text-sm font-medium text-pink-500 bg-white hover:bg-pink-50 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            เพิ่มหลักฐานการชำระเงินบนเว็บไซต์
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
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {order.image ? (
                        <img
                          src={order.image}
                          alt={order.productName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">ไม่มีรูป</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">{order.category}</p>
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                        {order.productName}
                      </h3>
                      {order.variant && (
                        <p className="text-xs text-gray-600 mb-1">
                          ประเภท: {order.variant}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mb-2">
                        จำนวน: {order.quantity} หน่วย
                      </p>
                      <p className="font-bold text-gray-900">฿ {order.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                    <Link
                      href={`/orders/${order.orderId || order.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      ดูรายละเอียดออเดอร์
                    </Link>
                    {order.status === 'delivered' && (
                      <Link
                        href={`/products/${order.productId}/review`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        รีวิว
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom Action Buttons */}
        <div className="mt-6 space-y-3">
          <Link
            href="/profile/reviews"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
          >
            <Star className="w-4 h-4" />
            รีวิวสินค้า
          </Link>
          <Link
            href="/profile/orders?status=cancelled"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium bg-white hover:bg-gray-50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            รายการที่ถูกยกเลิก
          </Link>
        </div>
      </main>
    </div>
  );
}
