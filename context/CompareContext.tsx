'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'cottonheart_compare';
const MAX_COMPARE_ITEMS = 4;

export interface CompareItem {
  id: string;
  name: string;
  nameEN?: string;
  price: string;
  image: string | null;
  sku: string | null;
  category?: { id: number; nameTH: string; nameEN: string } | null;
  subCategory?: { id: number; nameTH: string; nameEN: string } | null;
}

interface CompareContextType {
  compareItems: CompareItem[];
  addToCompare: (item: CompareItem) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  getCompareCount: () => number;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setCompareItems(JSON.parse(saved));
        } catch (error) {
          console.error('Error loading compare from localStorage:', error);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareItems));
    }
  }, [compareItems, isLoaded]);

  const addToCompare = (item: CompareItem) => {
    setCompareItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      if (prev.length >= MAX_COMPARE_ITEMS) return prev;
      return [...prev, item];
    });
  };

  const removeFromCompare = (id: string) => {
    setCompareItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCompare = () => setCompareItems([]);

  const isInCompare = (id: string) => compareItems.some((i) => i.id === id);

  const getCompareCount = () => compareItems.length;

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        getCompareCount,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
