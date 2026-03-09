'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Pencil, Plus } from 'lucide-react';
import { THAI_PROVINCES } from '@/lib/thai-provinces';

const GENDER_LABELS: Record<string, string> = {
  male: 'ชาย',
  female: 'หญิง',
  other: 'อื่นๆ',
  prefer_not: 'ไม่ต้องการระบุ',
};

interface AddressItem {
  id: number;
  addressLine1: string;
  subDistrict: string;
  postalCode: string;
  province: string;
  isDefault: boolean;
}

function formatAddress(a: AddressItem): string {
  return [a.addressLine1, a.subDistrict, a.postalCode, a.province].filter(Boolean).join(', ');
}

function deduplicateAddresses(addrs: AddressItem[]): AddressItem[] {
  const seen = new Set<string>();
  return addrs.filter((a) => {
    const key = `${a.addressLine1}|${a.subDistrict}|${a.postalCode}|${a.province}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'xxx@xxx.com';
  const [local, domain] = email.split('@');
  if (local.length <= 3) return `${local.slice(0, 1)}xxx@${domain}`;
  return `${local.slice(0, 3)}xxx@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return 'xxx-xxx-xxxx';
  return `xxx-xxx-${phone.slice(-4)}`;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [genderDisplay, setGenderDisplay] = useState<string>('');
  const [dateOfBirthDisplay, setDateOfBirthDisplay] = useState<string>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<AddressItem[]>([]);

  const [editingPhone, setEditingPhone] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState<Partial<AddressItem> | null>(null);

  const emailVal = user?.username?.includes('@') ? user.username : user?.email || user?.username || '';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent('/profile/edit')}`);
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !user || !emailVal) return;

    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, addrRes] = await Promise.all([
          fetch(`/api/users/profile?email=${encodeURIComponent(emailVal)}`),
          fetch(`/api/users/address?email=${encodeURIComponent(emailVal)}`),
        ]);
        const profile = await profileRes.json();
        const addrData = await addrRes.json();

        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setGenderDisplay(profile.gender ? (GENDER_LABELS[profile.gender] || 'ไม่ต้องการระบุ') : 'ไม่ต้องการระบุ');
        setDateOfBirthDisplay(profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('th-TH') : '');
        setEmail(profile.email || emailVal);
        setPhone(profile.phone || '');

        const addrs = addrData.addresses || [];
        if (addrs.length > 0) {
          const mapped = addrs.map((a: { id: number; addressLine1: string; subDistrict: string; postalCode: string; province: string; isDefault: boolean }) => ({
            id: a.id,
            addressLine1: a.addressLine1 || '',
            subDistrict: a.subDistrict || '',
            postalCode: a.postalCode || '',
            province: a.province || '',
            isDefault: a.isDefault || false,
          }));
          setAddresses(deduplicateAddresses(mapped));
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, user, emailVal]);

  const handleSaveProfile = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailVal,
          firstName,
          lastName,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async (addr: AddressItem) => {
    if (addr.id === 0) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/users/address', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailVal,
          addressId: addr.id,
          addressLine1: addr.addressLine1,
          subDistrict: addr.subDistrict,
          postalCode: addr.postalCode,
          province: addr.province,
          isDefault: addr.isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }
      setEditingAddressId(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async (addr: AddressItem) => {
    if (!addr.addressLine1 || !addr.subDistrict || !addr.postalCode || !addr.province) {
      setError('กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/users/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailVal,
          addressLine1: addr.addressLine1,
          subDistrict: addr.subDistrict,
          postalCode: addr.postalCode,
          province: addr.province,
          isDefault: addresses.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }
      setAddresses((prev) => [
        ...prev,
        {
          id: data.addressId,
          addressLine1: addr.addressLine1,
          subDistrict: addr.subDistrict,
          postalCode: addr.postalCode,
          province: addr.province,
          isDefault: addresses.length === 0,
        },
      ]);
      setNewAddress(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  if (loading) {
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
        <div className="flex items-center gap-2 mb-6">
          <User className="w-6 h-6 text-pink-500" />
          <h1 className="text-xl font-bold text-gray-900">รายละเอียดโปรไฟล์</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
            บันทึกข้อมูลเรียบร้อยแล้ว
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="p-5 space-y-4">
            {/* ชื่อจริง นามสกุล */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">ชื่อจริง</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="ชื่อจริง"
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">นามสกุล</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="นามสกุล"
                  className="h-10"
                />
              </div>
            </div>

            {/* เพศ - read only */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">เพศ</label>
              <Input
                value={genderDisplay}
                readOnly
                className="h-10 bg-gray-50"
              />
            </div>

            {/* วันเกิด - read only */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">วันเกิด</label>
              <Input
                value={dateOfBirthDisplay}
                readOnly
                className="h-10 bg-gray-50"
              />
            </div>

            {/* อีเมลล์ - read only */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">อีเมลล์</label>
              <Input
                value={maskEmail(email)}
                readOnly
                className="h-10 bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1">อีเมลล์ใช้สำหรับเข้าสู่ระบบ ไม่สามารถเปลี่ยนได้</p>
            </div>

            {/* เบอร์โทรศัพท์ */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">เบอร์โทรศัพท์</label>
                <Input
                  type="tel"
                  value={editingPhone ? phone : maskPhone(phone)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(v);
                  }}
                  readOnly={!editingPhone}
                  className="h-10"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditingPhone(!editingPhone)}
                className="mt-6 px-3 py-2 text-pink-500 text-sm font-medium border border-pink-500 rounded-lg hover:bg-pink-50 flex items-center gap-1"
              >
                <Pencil className="w-4 h-4" />
                แก้ไข
              </button>
            </div>
          </div>
        </div>

        {/* ที่อยู่การจัดส่ง */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">ที่อยู่การจัดส่ง</h2>

            {/* ที่อยู่หลัก */}
            {addresses.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ที่อยู่การจัดส่งหลัก
                </label>
                {editingAddressId === addresses[0].id ? (
                  <AddressForm
                    addr={addresses[0]}
                    onChange={(a) =>
                      setAddresses((prev) => [a, ...prev.slice(1)])
                    }
                    onSave={(a) => handleSaveAddress(a)}
                    onCancel={() => setEditingAddressId(null)}
                    provinces={THAI_PROVINCES}
                    saving={saving}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2 p-3 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700 flex-1">
                      {formatAddress(addresses[0])}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingAddressId(addresses[0].id)}
                      className="px-3 py-1.5 text-pink-500 text-sm font-medium border border-pink-500 rounded-lg hover:bg-pink-50 flex items-center gap-1 shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                      แก้ไข
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ที่อยู่อื่นๆ */}
            {addresses.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ที่อยู่การจัดส่งอื่นๆ
                </label>
                <div className="space-y-3">
                  {addresses.slice(1).map((addr) => (
                    <div key={addr.id}>
                      {editingAddressId === addr.id ? (
                        <AddressForm
                          addr={addr}
                          onChange={(a) =>
                            setAddresses((prev) => {
                              const idx = prev.findIndex((x) => x.id === addr.id);
                              if (idx < 0) return prev;
                              const next = [...prev];
                              next[idx] = a;
                              return next;
                            })
                          }
                          onSave={(a) => handleSaveAddress(a)}
                          onCancel={() => setEditingAddressId(null)}
                          provinces={THAI_PROVINCES}
                          saving={saving}
                        />
                      ) : (
                        <div className="flex items-center justify-between gap-2 p-3 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-700 flex-1">
                            {formatAddress(addr)}
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditingAddressId(addr.id)}
                            className="px-3 py-1.5 text-pink-500 text-sm font-medium border border-pink-500 rounded-lg hover:bg-pink-50 flex items-center gap-1 shrink-0"
                          >
                            <Pencil className="w-4 h-4" />
                            แก้ไข
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* เพิ่มที่อยู่ใหม่ */}
            {newAddress ? (
              <div className="p-3 border border-pink-200 rounded-lg bg-pink-50/30">
                <p className="text-sm font-medium text-gray-700 mb-2">ที่อยู่การจัดส่งใหม่</p>
                <AddressForm
                  addr={{ ...newAddress, id: -1 } as AddressItem}
                  onChange={(a) => setNewAddress(a)}
                  onSave={(a) => handleAddAddress(a)}
                  onCancel={() => setNewAddress(null)}
                  provinces={THAI_PROVINCES}
                  saving={saving}
                  isNew
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setNewAddress({
                    addressLine1: '',
                    subDistrict: '',
                    postalCode: '',
                    province: '',
                    isDefault: false,
                  })
                }
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                เพิ่มที่อยู่การจัดส่งใหม่
              </button>
            )}
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <div className="flex gap-3">
          <Link
            href="/profile"
            className="flex-1 py-3 text-center border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ย้อนกลับ
          </Link>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex-1 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
          </button>
        </div>
      </main>
    </div>
  );
}

function AddressForm({
  addr,
  onChange,
  onSave,
  onCancel,
  provinces,
  saving,
  isNew,
}: {
  addr: AddressItem;
  onChange: (a: AddressItem) => void;
  onSave: (a: AddressItem) => void;
  onCancel: () => void;
  provinces: readonly string[];
  saving: boolean;
  isNew?: boolean;
}) {
  const [a, setA] = useState(addr);
  useEffect(() => {
    setA(addr);
  }, [addr.id, addr.addressLine1, addr.subDistrict, addr.postalCode, addr.province]);

  const update = (updates: Partial<AddressItem>) => {
    const next = { ...a, ...updates };
    setA(next);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="บ้านเลขที่ ที่อยู่"
        value={a.addressLine1}
        onChange={(e) => update({ addressLine1: e.target.value })}
        className="h-10"
      />
      <Input
        placeholder="แขวง/ตำบล"
        value={a.subDistrict}
        onChange={(e) => update({ subDistrict: e.target.value })}
        className="h-10"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="รหัสไปรษณีย์"
          value={a.postalCode}
          onChange={(e) =>
            update({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })
          }
          className="h-10"
        />
        <Select
          value={a.province || undefined}
          onValueChange={(v) => update({ province: v })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="จังหวัด" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={() => onSave(a)}
          disabled={saving}
          className="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  );
}
