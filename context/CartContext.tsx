'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image?: string | null;
  sku?: string | null;
  category?: string | null;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  addToCartWithQuantity: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getUniqueItemsCount: () => number;
  getTotalPrice: () => number;
  // Selection for checkout
  selectedItemIds: Set<string>;
  toggleItemSelection: (id: string) => void;
  selectAllItems: () => void;
  clearSelection: () => void;
  isItemSelected: (id: string) => boolean;
  getSelectedItems: () => CartItem[];
  getSelectedTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cottonheart_cart');
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (error) {
          console.error('Error loading cart from localStorage:', error);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('cottonheart_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isLoaded]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id && (i.sku ?? '') === (item.sku ?? ''));
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id && (i.sku ?? '') === (item.sku ?? '')
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const addToCartWithQuantity = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    if (quantity <= 0) return;
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id && (i.sku ?? '') === (item.sku ?? ''));
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id && (i.sku ?? '') === (item.sku ?? '')
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prevItems, { ...item, quantity }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedItemIds(new Set());
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getUniqueItemsCount = () => {
    return cartItems.length;
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllItems = () => {
    setSelectedItemIds(new Set(cartItems.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedItemIds(new Set());
  };

  const isItemSelected = (id: string) => selectedItemIds.has(id);

  const getSelectedItems = () => {
    return cartItems.filter((item) => selectedItemIds.has(item.id));
  };

  const getSelectedTotalPrice = () => {
    return getSelectedItems().reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addToCartWithQuantity,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getUniqueItemsCount,
        getTotalPrice,
        selectedItemIds,
        toggleItemSelection,
        selectAllItems,
        clearSelection,
        isItemSelected,
        getSelectedItems,
        getSelectedTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}


