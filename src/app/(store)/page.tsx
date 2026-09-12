"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Carousel } from "@/components/store/carousel";
import { ProductCard } from "@/components/store/product-card";
import { PromoBanners } from "@/components/store/promo-banners";
import { type StoreProduct } from "@/lib/store-front";
import { type HeroSlide, type SiteSettings } from "@/lib/site-settings";

const FALLBACK_HERO_SLIDES = [
  {
    title: "Fragrances for every occasion",
    subtitle: "Find a scent that fits your personality and your budget.",
    cta: "Shop now",
    href: "/products",
    bg: "from-amber-100 to-orange-50",
    accent: "text-amber-800",
  },
  {
    title: "Cash on Delivery",
    subtitle: "Order online and pay when your order arrives at your door.",
    cta: "How it works",
    href: "/track",
    bg: "from-emerald-100 to-teal-50",
    accent: "text-emerald-800",
  },
  {
    title: "Quality you can trust",
    subtitle: "Long-lasting fragrances, delivered to your door.",
    cta: "Explore",
    href: "/products",
    bg: "from-violet-100 to-fuchsia-50",
    accent: "text-violet-800",
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
        className="overflow-hidden rounded-2xl"
        slides={
          heroSlides.length > 0
            ? heroSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="relative flex min-h-[320px] items-center px-6 py-10 sm:min-h-[380px] sm:px-12"
                >
                  <Image
                    src={slide.imageUrl}
                    alt={slide.heading || "Promotional banner"}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10" />

                  <div className="relative max-w-lg">
                    <h2 className="text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl">
                      {slide.heading}
                    </h2>

                    {slide.subheading && (
                      <p className="mt-3 text-sm text-white/90 sm:text-base">
                        {slide.subheading}
                      </p>
                    )}

                    {slide.cta && slide.href && (
                      <Link
                        href={slide.href}
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100"
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
                  className={`flex min-h-[320px] items-center bg-gradient-to-br ${slide.bg} px-6 py-10 sm:min-h-[380px] sm:px-12`}
                >
                  <div className="max-w-lg">
                    <h2 className={`text-3xl font-bold leading-tight sm:text-4xl ${slide.accent}`}>
                      {slide.title}
                    </h2>
                    <p className="mt-3 text-sm text-slate-600 sm:text-base">
                      {slide.subtitle}
                    </p>
                    <Link
                      href={slide.href}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
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
            <h2 className="text-xl font-bold">Shop by category</h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-sm font-medium text-amber-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/products?category=${encodeURIComponent(category)}`}
                className="shrink-0 rounded-full border bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Promo banners */}
      {featured.length > 0 && <PromoBanners products={featured} />}

      {/* Featured */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold">Featured fragrances</h2>
        </div>

        <ProductShelf loading={loading} products={featured} />
      </section>

      {/* Latest */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">New arrivals</h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-medium text-amber-700"
          >
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <ProductShelf loading={loading} products={latest} />
      </section>
    </div>
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
        Nothing here yet — new products are on the way.
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