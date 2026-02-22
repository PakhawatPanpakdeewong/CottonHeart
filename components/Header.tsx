'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Search, ShoppingCart, User } from 'lucide-react';

// Icon Component
const HeartIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

export default function Header() {
  const { getUniqueItemsCount } = useCart();
  const { isAuthenticated } = useAuth();
  const uniqueItemsCount = getUniqueItemsCount();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="text-pink-500">
            <HeartIcon />
          </div>
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-pink-500 transition-colors">
            KiddyCare
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/search" className="text-gray-700 hover:text-gray-900 transition-colors">
            <Search className="w-6 h-6" />
          </Link>
          <Link href="/cart" className="relative text-gray-700 hover:text-gray-900 transition-colors">
            <ShoppingCart className="w-6 h-6" />
            {uniqueItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
                <span className="text-[10px] text-white font-medium">{uniqueItemsCount}</span>
              </span>
            )}
          </Link>
          <Link
            href={isAuthenticated ? '/profile' : '/login'}
            className="text-gray-700 hover:text-gray-900 transition-colors"
          >
            <User className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
