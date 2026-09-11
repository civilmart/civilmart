"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type WishlistContextValue = {
  loggedIn: boolean | null;
  wishlistedIds: Set<string>;
  ready: boolean;
  toggle: (
    productId: string
  ) => Promise<{ ok: boolean; loginRequired?: boolean }>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const meRes = await fetch("/api/store/customers");

      if (!meRes.ok) {
        setLoggedIn(false);
        setWishlistedIds(new Set());
        setReady(true);
        return;
      }

      setLoggedIn(true);

      const listRes = await fetch("/api/store/wishlist");

      if (listRes.ok) {
        const data = await listRes.json();
        const ids = new Set<string>();
        if (data.success) {
          for (const item of data.data) {
            ids.add(item.product.id);
          }
        }
        setWishlistedIds(ids);
      }
    } catch {
      setLoggedIn(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!loggedIn) {
        return { ok: false, loginRequired: true };
      }

      try {
        const res = await fetch("/api/store/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();

        if (!data.success) {
          return { ok: false };
        }

        setWishlistedIds((prev) => {
          const next = new Set(prev);
          if (data.data.wishlisted) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });

        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    [loggedIn]
  );

  const value = useMemo(
    () => ({ loggedIn, wishlistedIds, ready, toggle, refresh }),
    [loggedIn, wishlistedIds, ready, toggle, refresh]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);

  if (!ctx) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }

  return ctx;
}