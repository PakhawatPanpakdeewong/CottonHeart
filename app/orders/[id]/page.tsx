'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import { ChevronRight, ShoppingCart } from 'lucide-react';

type OrderStatus = 'ordered' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  image: string | null;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetail {
  orderId: string;
  orderDate: string;
  orderStatus: OrderStatus;
  totalAmount: number;
  shippingAddress: string;
  recipientName: string;
  recipientPhone: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  shippingCost: number;
  items: OrderItem[];
  subtotal: number;
  paymentMethod: string;
  paymentAmount: number | null;
  paymentDate: string | null;
  paymentTransactionId: string | null;
  paymentStatus: string | null;
  referenceCode: string | null;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  ordered: 'คำสั่งซื้อของคุณกำลังจัดเตรียม',
  confirmed: 'คำสั่งซื้อได้รับการยืนยันแล้ว',
  shipping: 'คำสั่งซื้อของคุณกำลังจัดส่ง',
  delivered: 'จัดส่งสำเร็จแล้ว',
  cancelled: 'คำสั่งซื้อถูกยกเลิก',
};

const STATUS_BANNER_COLOR: Record<OrderStatus, string> = {
  ordered: 'bg-blue-500',
  confirmed: 'bg-green-500',
  shipping: 'bg-blue-600',
  delivered: 'bg-green-600',
  cancelled: 'bg-gray-500',
};

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/80x80/E8E8E8/999999?text=ไม่มีรูปภาพ';

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return 'XXX-XXX-XXXX';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `${digits.slice(0, 3)}-XXX-${digits.slice(-4)}`;
  }
  return 'XXX-XXX-XXXX';
}

function formatBuddhistDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  const buddhistYear = d.getFullYear() + 543;
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return `${day} ${month} ${buddhistYear} เวลา ${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')} น.`;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addToCartWithQuantity } = useCart();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/orders/${orderId}`)}`);
    }
  }, [isAuthenticated, isLoading, router, orderId]);

  useEffect(() => {
    if (!isAuthenticated || !user || !orderId) return;

    const email = user.username?.includes('@') ? user.username : user.email || user.username;
    if (!email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/users/orders/${orderId}?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || 'โหลดไม่สำเร็จ')));
        return res.json();
      })
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message || 'เกิดข้อผิดพลาด'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, orderId]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-6 pb-24">
          <div className="text-center text-gray-500 py-12">กำลังโหลดรายละเอียดคำสั่งซื้อ...</div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#fcfafc]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-6 pb-24">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">{error || 'ไม่พบคำสั่งซื้อ'}</p>
            <Link
              href="/profile"
              className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
            >
              กลับไปโปรไฟล์
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[order.orderStatus];
  const bannerColor = STATUS_BANNER_COLOR[order.orderStatus];
  // อนุญาตยกเลิกได้เฉพาะสถานะ ordered (pending) เท่านั้น - ถ้า confirmed แล้วไม่อนุญาต
  const canCancel = order.orderStatus === 'ordered';
  // แสดงปุ่มซื้ออีกครั้ง เมื่อออเดอร์ถูกยกเลิก หรือจัดส่งสำเร็จแล้ว
  const canBuyAgain = order.orderStatus === 'cancelled' || order.orderStatus === 'delivered';
  const isPaid = order.paymentStatus === 'paid' || !!order.paymentDate;

  const handleBuyAgain = () => {
    if (!order) return;
    order.items.forEach((item) => {
      addToCartWithQuantity(
        {
          id: item.productId,
          name: item.productName,
          price: item.unitPrice,
          image: item.image,
          category: item.category || null,
          sku: item.variant || null,
        },
        item.quantity
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-pink-500">ร้านค้า</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/profile" className="hover:text-pink-500">โปรไฟล์ผู้ใช้งาน</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-700 font-medium">ออร์เดอร์</span>
        </nav>

        {/* Page Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-4">รายละเอียดคำสั่งซื้อ</h1>

        {/* Order Status Banner */}
        <div className={`${bannerColor} text-white text-center py-3 px-4 rounded-lg mb-6`}>
          {statusLabel}
        </div>

        {/* Shipping Information */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">ข้อมูลการจัดส่ง</h2>
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-0.5">หมายเลขติดตามพัสดุ (Tracking Number)</p>
            {order.trackingNumber ? (
              <p className="text-sm font-semibold text-gray-900 font-mono">{order.trackingNumber}</p>
            ) : (
              <p className="text-sm text-gray-500">ยังไม่สามารถระบุได้</p>
            )}
          </div>
          {order.shippingCarrier && (
            <p className="text-sm text-gray-700 mb-2">
              <span className="text-gray-500">บริษัทขนส่ง:</span> {order.shippingCarrier}
            </p>
          )}
          <p className="text-sm text-gray-700 mb-2">
            ที่อยู่ในการจัดส่ง: {order.shippingAddress}
          </p>
          <p className="text-sm text-gray-700">
            ผู้สั่งซื้อ: {order.recipientName} ({maskPhone(order.recipientPhone)})
          </p>
        </section>

        {/* Order Details */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">รายละเอียด</h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="text-gray-500">หมายเลขออร์เดอร์:</span> {order.orderId}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">วันที่สั่ง:</span>{' '}
              {formatBuddhistDateTime(order.orderDate)}
            </p>
            <p className="text-gray-700 font-medium">
              <span className="text-gray-500">ยอดการสั่งซื้อ:</span> ฿ {order.subtotal.toFixed(2)}
            </p>
            {order.referenceCode && (
              <div className="mt-3 p-3 rounded-lg bg-green-50 border-2 border-green-200">
                <p className="text-xs text-gray-600 mb-1">เลขยืนยันการโอน</p>
                <p className="font-mono text-lg font-bold text-green-700 tracking-wider">
                  {order.referenceCode}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Product List */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">รายการสินค้า</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">ไม่มีรูป</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                  <h3 className="font-medium text-gray-900 text-sm mb-1">{item.productName}</h3>
                  {item.variant && (
                    <p className="text-xs text-gray-600 mb-1">ประเภท: {item.variant}</p>
                  )}
                  <p className="text-xs text-gray-600 mb-1">จำนวน: {item.quantity} หน่วย</p>
                  <p className="font-bold text-gray-900">฿ {item.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shipping Cost */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-2">ค่าจัดส่ง</h2>
          <p className="text-gray-700">฿ {order.shippingCost.toFixed(2)}</p>
        </section>

        {/* Payment Information */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">การชำระเงิน</h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="text-gray-500">ชำระด้วย:</span> {order.paymentMethod}
            </p>

            {/* Total Payment Highlight */}
            <div className="mt-3 p-3 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-pink-700 uppercase tracking-wide">
                  {isPaid ? 'ชำระแล้ว' : 'ยอดที่ต้องชำระ'}
                </span>
                <span className="text-[11px] text-gray-500">
                  รวมค่าสินค้าและค่าจัดส่งทั้งหมด
                </span>
              </div>
              <span className="text-xl font-bold text-pink-500 tracking-tight ml-4">
                ฿ {(order.paymentAmount ?? order.totalAmount).toFixed(2)}
              </span>
            </div>

            {order.paymentDate && (
              <p className="text-gray-700">
                <span className="text-gray-500">วันที่ยืนยันการชำระ:</span>{' '}
                {formatBuddhistDateTime(order.paymentDate)}
              </p>
            )}
            {order.paymentTransactionId && (
              <p className="text-gray-700">
                <span className="text-gray-500">หมายเลขการชำระ:</span> {order.paymentTransactionId}
              </p>
            )}
          </div>
        </section>

        {/* Cancel Order Button */}
        {canCancel && (
          <button
            type="button"
            className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            onClick={() => {
              router.push(`/orders/${order.orderId}/cancel`);
            }}
          >
            ยกเลิกการสั่งซื้อ
          </button>
        )}

        {/* Buy Again Button - แสดงเมื่อออเดอร์ถูกยกเลิกหรือจัดส่งสำเร็จ */}
        {canBuyAgain && (
          <button
            type="button"
            onClick={() => {
              handleBuyAgain();
              router.push('/cart');
            }}
            className="w-full py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors mb-4 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            ซื้ออีกครั้ง
          </button>
        )}

        {/* Back to Profile */}
        <Link
          href="/profile"
          className="block text-center text-pink-500 font-medium mt-4 hover:text-pink-600"
        >
          กลับไปโปรไฟล์
        </Link>
      </main>
    </div>
  );
}
