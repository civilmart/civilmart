"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Loader2,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Carousel } from "@/components/store/carousel";
import { ProductCard } from "@/components/store/product-card";
import { type StoreProduct } from "@/lib/store-front";
import { type HeroSlide, type SiteSettings } from "@/lib/site-settings";

const FALLBACK_HERO_SLIDES = [
  {
    title: "Building materials & hardware",
    subtitle:
      "Cement, steel, timber, tiles, plumbing and tools — everything for your project, at trade-friendly prices.",
    cta: "Browse catalogue",
    href: "/products",
  },
  {
    title: "Cash on Delivery",
    subtitle:
      "Order online and pay in cash when your order arrives at your site or doorstep.",
    cta: "How it works",
    href: "/track",
  },
  {
    title: "Contractors & bulk orders",
    subtitle:
      "Need project quantities? Contact our desk for bulk pricing and scheduled deliveries.",
    cta: "View all products",
    href: "/products",
  },
];

export default function StoreHomePage() {
  const [featured, setFeatured] = useState<StoreProduct[]>([]);
  const [latest, setLatest] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [featuredRes, latestRes, categoriesRes, settingsRes] =
          await Promise.all([
            fetch("/api/store/products?featured=true&limit=8"),
            fetch("/api/store/products?limit=8"),
            fetch("/api/store/categories"),
            fetch("/api/store/settings"),
          ]);

        const [featuredData, latestData, categoriesData, settingsData] =
          await Promise.all([
            featuredRes.json(),
            latestRes.json(),
            categoriesRes.json(),
            settingsRes.json(),
          ]);

        if (featuredData.success) setFeatured(featuredData.data);
        if (latestData.success) setLatest(latestData.data);
        if (categoriesData.success) setCategories(categoriesData.data);
        if (settingsData.success) {
          const settings = settingsData.data as SiteSettings;
          setHeroSlides(
            settings.heroSlides.filter(
              (slide) => slide.active && slide.imageUrl
            )
          );
        }
      } catch (error) {
        console.error("Failed to load storefront:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero slider */}
      <Carousel
        autoAdvanceMs={6000}
        className="overflow-hidden rounded-xl border"
        slides={
          heroSlides.length > 0
            ? heroSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="relative flex min-h-[320px] items-center bg-slate-900 px-6 py-10 sm:min-h-[380px] sm:px-12"
                >
                  <Image
                    src={slide.imageUrl}
                    alt={slide.heading || "Promotional banner"}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/40 to-slate-950/10" />

                  <div className="relative max-w-2xl">
                    <span className="inline-block rounded-sm bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                      Civil Mart
                    </span>

                    <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                      {slide.heading}
                    </h2>

                    {slide.subheading && (
                      <p className="mt-3 text-sm text-slate-200 sm:text-base">
                        {slide.subheading}
                      </p>
                    )}

                    {slide.cta && slide.href && (
                      <Link
                        href={slide.href}
                        className="mt-6 inline-flex items-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400"
                      >
                        {slide.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            : FALLBACK_HERO_SLIDES.map((slide) => (
                <div
                  key={slide.title}
                  className="flex min-h-[320px] items-center bg-slate-900 px-6 py-10 sm:min-h-[380px] sm:px-12"
                >
                  <div className="max-w-2xl">
                    <span className="inline-block rounded-sm bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                      Civil Mart
                    </span>

                    <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                      {slide.title}
                    </h2>

                    <p className="mt-3 text-sm text-slate-300 sm:text-base">
                      {slide.subtitle}
                    </p>

                    <Link
                      href={slide.href}
                      className="mt-6 inline-flex items-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400"
                    >
                      {slide.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
        }
      />

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">
              Shop by category
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-sm font-semibold text-amber-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/products?category=${encodeURIComponent(category)}`}
                className="shrink-0 rounded-md border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold tracking-tight">Featured products</h2>
        </div>

        <ProductShelf loading={loading} products={featured} />
      </section>

      {/* Featured promo tiles */}
      {featured.length > 0 && <PromoTiles products={featured} />}

      {/* Latest */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">New in store</h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-semibold text-amber-700"
          >
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <ProductShelf loading={loading} products={latest} />
      </section>
    </div>
  );
}

function PromoTiles({ products }: { products: StoreProduct[] }) {
  const featuredProduct = products[0];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-5">
        <Truck className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
            Cash on Delivery
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            Pay in cash when your order arrives. Nationwide delivery available.
          </p>
        </div>
      </div>

      {featuredProduct && (
        <Link
          href={`/products/${featuredProduct.id}`}
          className="group border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400 hover:shadow-md"
        >
          <span className="inline-block rounded-sm bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Recommended
          </span>
          <h3 className="mt-2 text-sm font-bold leading-snug">
            {featuredProduct.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {featuredProduct.brand || "Civil Mart"} ·{" "}
            {featuredProduct.unit.toLowerCase()}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
            View details
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>
      )}

      <div className="flex items-start gap-3 bg-slate-900 p-5 text-white">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-400">
            Bulk &amp; project orders
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            Request contractor quantities through your order or helpline.
          </p>
        </div>
      </div>
    </section>
  );
}

function ProductShelf({
  loading,
  products,
}: {
  loading: boolean;
  products: StoreProduct[];
}) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Products are being added to the catalogue.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}