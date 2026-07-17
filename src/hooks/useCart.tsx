import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  _id: string;
  name: { en: string; mr: string } | string;
  price: number;
  mrp?: number;
  image?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalMrp: number;
  totalSavings: number;
  totalItems: number;
  latestOrder: any | null;
  setLatestOrder: (order: any | null) => void;
}

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_LATEST_ORDER_KEY = '@latest_order';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [latestOrder, setLatestOrderState] = useState<any | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_LATEST_ORDER_KEY)
      .then((savedOrder) => {
        if (!savedOrder) return;
        try {
          setLatestOrderState(JSON.parse(savedOrder));
        } catch (err) {
          console.error('Failed to parse saved order:', err);
        }
      })
      .catch((err) => console.error('Failed to load saved order:', err));
  }, []);

  const addToCart = useCallback((product: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const exists = prev.find((i) => i._id === product._id);
      if (exists) {
        return prev.map((i) =>
          i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  }, []);

  const increaseQty = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, quantity: i.quantity + 1 } : i))
    );
  }, []);

  const decreaseQty = useCallback((id: string) => {
    setItems((prev) =>
      prev
        .map((i) => (i._id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const setLatestOrder = useCallback((order: any | null) => {
    setLatestOrderState(order);
    if (order) {
      AsyncStorage.setItem(STORAGE_LATEST_ORDER_KEY, JSON.stringify(order)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_LATEST_ORDER_KEY).catch(() => {});
    }
  }, []);

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalMrp = items.reduce((sum, i) => sum + ((i.mrp && i.mrp > i.price) ? i.mrp : i.price) * i.quantity, 0);
  const totalSavings = totalMrp - totalAmount;
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, increaseQty, decreaseQty, clearCart, totalAmount, totalMrp, totalSavings, totalItems, latestOrder, setLatestOrder }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
