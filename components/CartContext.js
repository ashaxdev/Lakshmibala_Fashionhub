'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);
const STORAGE_KEY = 'lb_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const addItem = useCallback((item) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === item.productId && i.variantId === item.variantId && i.size === item.size && i.comboId === item.comboId
      );
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].qty += item.qty;
        return copy;
      }
      return [...prev, item];
    });
    toast.success('Added to cart');
  }, []);

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      prev.map((i) => (cartKey(i) === key ? { ...i, qty: Math.max(1, qty) } : i))
    );
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => cartKey(i) !== key));
    toast('Removed from cart', { icon: '🗑️' });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function cartKey(i) {
  return [i.productId, i.variantId, i.size, i.comboId].filter(Boolean).join('-');
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
