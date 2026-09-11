"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/context/cart-context";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/products" },
  { name: "Track Order", href: "/track" },
];

export function StoreHeader() {
  const router = useRouter();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(query.trim() ? `/products?search=${encodeURIComponent(query.trim())}` : "/products");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          aria-label="Open menu"
          className="rounded-md p-2 hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="shrink-0">
          <span className="text-lg font-bold tracking-tight">
            Naran<span className="text-amber-600">Scents</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form
            onSubmit={submitSearch}
            className="hidden items-center rounded-full border bg-slate-50 px-3 md:flex"
          >
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fragrances…"
              className="w-36 bg-transparent px-2 py-1.5 text-sm outline-none sm:w-48"
            />
          </form>

          <Link
            href="/account"
            aria-label="Account"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          >
            <User className="h-5 w-5" />
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="border-t bg-white px-4 py-3 lg:hidden">
          <form onSubmit={submitSearch} className="mb-3 flex items-center rounded-full border bg-slate-50 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fragrances…"
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
            />
          </form>

          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}