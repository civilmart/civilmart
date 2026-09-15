"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  sku: string;
  productName: string;
  variantName: string | null;
  unit: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  stockQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  hydrate: (items: CartItem[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "civilmart_cart_v1";

function parseQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Number(value.toFixed(4));
}

function readCartStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore corrupted cart
  }
  return [];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCartStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable
    }
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, qty = 1) => {
      const quantity = parseQuantity(qty);
      const maxQty = Math.max(1, item.stockQuantity || 1);

      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);

        if (existing) {
          return prev.map((i) =>
            i.id === item.id
              ? { ...i, quantity: Math.min(i.quantity + quantity, maxQty) }
              : i
          );
        }

        return [...prev, { ...item, quantity: Math.min(quantity, maxQty) }];
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  quantity: Math.min(parseQuantity(qty), Math.max(1, i.stockQuantity || 99)),
                }
              : i
          )
      );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const hydrate = useCallback((cartItems: CartItem[]) => {
    if (Array.isArray(cartItems)) setItems(cartItems);
  }, []);

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, count, subtotal, addItem, removeItem, updateQty, clear, hydrate }),
    [items, count, subtotal, addItem, removeItem, updateQty, clear, hydrate]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return ctx;
}