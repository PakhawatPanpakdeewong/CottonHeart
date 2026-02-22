'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      const returnUrl = searchParams.get('returnUrl') || '/';
      router.push(returnUrl);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!usernameOrEmail.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อหรืออีเมลล์และรหัสผ่าน');
      setIsLoading(false);
      return;
    }

    // Attempt login
    const success = await login(usernameOrEmail, password);

    if (success) {
      // Get return URL from query params or default to home
      const returnUrl = searchParams.get('returnUrl') || '/';
      router.push(returnUrl);
    } else {
      setError('ชื่อหรือรหัสผ่านของท่านไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfafc]">
      <Header />

      <main className="max-w-md mx-auto px-4 py-8">
        {/* Welcome Message */}
        <div className="flex items-center gap-2 mb-8">
          <ArrowRight className="w-6 h-6 text-pink-500" />
          <h1 className="text-2xl font-bold text-gray-900">ยินดีต้อนรับกลับมาค่ะ</h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username/Email Field */}
          <div className="space-y-2">
            <label htmlFor="usernameOrEmail" className="text-sm font-medium text-gray-700">
              ชื่อหรืออีเมลล์
            </label>
            <Input
              id="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="กรุณาใส่ชื่อหรืออีเมลล์ของคุณ"
              disabled={isLoading}
              className="h-12"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรุณาใส่รหัสผ่าน"
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

          {/* Error Message */}
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Login Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-medium"
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        {/* Registration Link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          ถ้าคุณยังไม่มีแอคเค้าท์{' '}
          <Link href="/register" className="text-pink-500 hover:text-pink-600 underline">
            กดลงทะเบียนตรงนี้
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fcfafc] flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
