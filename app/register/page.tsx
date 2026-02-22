'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Header from '@/components/Header';
import { User, Calendar, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'ไม่ต้องการระบุ',
    dateOfBirth: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string): boolean => {
    // 10-16 ตัวอักษร, ใช้ภาษาอังกฤษหรืออักขระพิเศษ, มีตัวเลขอย่างน้อย 1 ตัว
    if (password.length < 10 || password.length > 16) {
      return false;
    }
    if (!/\d/.test(password)) {
      return false;
    }
    // ตรวจสอบว่าเป็นภาษาอังกฤษหรืออักขระพิเศษ
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password)) {
      return false;
    }
    return true;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.dateOfBirth || 
        !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    // Validate email format
    if (!validateEmail(formData.email)) {
      setError('รูปแบบอีเมลล์ไม่ถูกต้อง');
      return;
    }

    // Validate password
    if (!validatePassword(formData.password)) {
      setError('รหัสผ่านต้องมี 10-16 ตัวอักษร ใช้ภาษาอังกฤษหรืออักขระพิเศษ และต้องมีตัวเลขอย่างน้อย 1 ตัว');
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบรหัสผ่านใหม่');
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      setError('กรุณายอมรับข้อตกลงการใช้งาน');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน');
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-[#fcfafc] pb-8">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-6">
          <User className="w-6 h-6 text-pink-500" />
          <h1 className="text-2xl font-bold text-gray-900">สมัครสมาชิก</h1>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              ชื่อจริง<span className="text-red-500">*</span>
            </label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="ชื่อจริง"
              disabled={isLoading}
              className="h-12"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              นามสกุล<span className="text-red-500">*</span>
            </label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="นามสกุล"
              disabled={isLoading}
              className="h-12"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label htmlFor="gender" className="text-sm font-medium text-gray-700">
              เพศ
            </label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
              disabled={isLoading}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="เลือกเพศ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ไม่ต้องการระบุ">ไม่ต้องการระบุ</SelectItem>
                <SelectItem value="ชาย">ชาย</SelectItem>
                <SelectItem value="หญิง">หญิง</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">
              วันเกิด<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={isLoading}
                className="h-12 pr-12"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              อีเมลล์<span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="กรุณาใส่อีเมลล์ของคุณ"
              disabled={isLoading}
              className="h-12"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              เบอร์โทร<span className="text-red-500">*</span>
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="กรุณาใส่เบอร์โทรของคุณ"
              disabled={isLoading}
              className="h-12"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              รหัสผ่าน<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="สร้างรหัสผ่าน"
                disabled={isLoading}
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              ยืนยันรหัสผ่าน<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                disabled={isLoading}
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              รหัสผ่านต้องมี 10-16 ตัวอักษร ใช้ภาษาอังกฤษหรืออักขระพิเศษ และต้องมีตัวเลขอย่างน้อย 1 ตัว
            </p>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              disabled={isLoading}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-gray-700 flex-1 cursor-pointer">
              ฉันได้ทำการตรวจสอบรายละเอียดที่ระบุไว้อย่างครบถ้วน และยอมรับข้อตกลงการใช้งานแล้ว
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Register Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-medium"
          >
            {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          มีแอคเค้าท์อยู่แล้ว{' '}
          <Link href="/login" className="text-pink-500 hover:text-pink-600 underline">
            กดเข้าสู่ระบบตรงนี้
          </Link>
        </div>
      </main>
    </div>
  );
}
