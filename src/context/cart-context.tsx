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
  variantId: string;
  productId: string;
  sku: string;
  productName: string;
  variantName: string;
  sizeLabel: string;
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
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clear: () => void;
  hydrate: (items: CartItem[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "naranscents_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore corrupted cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // storage unavailable
      }
    }
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.variantId === item.variantId);

        if (existing) {
          return prev.map((i) =>
            i.variantId === item.variantId
              ? {
                  ...i,
                  quantity: Math.min(
                    i.quantity + qty,
                    Math.max(i.stockQuantity, i.quantity + qty)
                  ),
                }
              : i
          );
        }

        return [...prev, { ...item, quantity: qty }];
      });
    },
    []
  );

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.variantId !== variantId)
        : prev.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.min(qty, i.stockQuantity || 99) }
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