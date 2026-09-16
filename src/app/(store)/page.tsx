import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  LayoutGrid,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Carousel } from "@/components/store/carousel";
import { ProductCard } from "@/components/store/product-card";
import { StoreAdBanners } from "@/components/store/ad-banners";
import { type StoreProduct } from "@/lib/store-front";
import { type HeroSlide, type SiteSettings } from "@/lib/site-settings.types";
import { type StoreHomeData } from "@/app/api/store/home/route";
import {
  getFeaturedProducts,
  getLatestProducts,
  getHomeData,
  getSiteSettingsData,
} from "@/lib/store-data";

const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    imageUrl: "",
    heading: "Building materials & hardware",
    subheading:
      "Cement, steel, timber, tiles, plumbing and tools — everything for your project, at trade-friendly prices.",
    cta: "Browse catalogue",
    href: "/products",
    active: true,
  },
  {
    id: "fallback-2",
    imageUrl: "",
    heading: "Cash on Delivery",
    subheading:
      "Order online and pay in cash when your order arrives at your site or doorstep.",
    cta: "How it works",
    href: "/track",
    active: true,
  },
  {
    id: "fallback-3",
    imageUrl: "",
    heading: "Contractors & bulk orders",
    subheading:
      "Need project quantities? Contact our desk for bulk pricing and scheduled deliveries.",
    cta: "View all products",
    href: "/products",
    active: true,
  },
];

export default async function StoreHomePage() {
  const settings = await getSiteSettingsData();
  const [featured, latest, homeData] = await Promise.all([
    getFeaturedProducts(settings.featuredProductCount ?? 4),
    getLatestProducts(8),
    getHomeData(),
  ]);

  const heroSlides = settings.heroSlides.filter(
    (slide) => slide.active && slide.imageUrl
  );

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
                  className="relative flex min-h-[200px] items-center bg-slate-900 px-6 py-10 sm:min-h-[280px] sm:px-12"
                >
                  <Image
                    src={slide.imageUrl}
                    alt={slide.heading || "Promotional banner"}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-contain object-right"
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
                  key={slide.id}
                  className="flex min-h-[200px] items-center bg-slate-900 px-6 py-10 sm:min-h-[280px] sm:px-12"
                >
                  <div className="max-w-2xl">
                    <span className="inline-block rounded-sm bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                      Civil Mart
                    </span>

                    <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                      {slide.heading}
                    </h2>

                    <p className="mt-3 text-sm text-slate-300 sm:text-base">
                      {slide.subheading}
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

      {/* Featured */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold tracking-tight">Featured products</h2>
        </div>

        <ProductShelf products={featured} />
      </section>

      {/* Featured promo tiles */}
      {featured.length > 0 && <PromoTiles products={featured} />}

      {/* Main categories */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                What are you looking for?
              </h2>
              <p className="text-xs text-muted-foreground">
                {homeData.productCount} products across{" "}
                {homeData.mainCategories.length} categories
              </p>
            </div>
          </div>

          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-semibold text-amber-700"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <MainCategoryGrid tiles={homeData.mainCategories} />
      </section>

      {/* Home banners */}
      <StoreAdBanners slot="HOME_BANNER" />

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

        <ProductShelf products={latest} />
      </section>

      {/* Footer CTA */}
      {settings.footerCta.heading && (
        <section className="rounded-xl border bg-slate-900 p-8 text-center text-white">
          <h2 className="text-lg font-bold">{settings.footerCta.heading}</h2>
          {settings.footerCta.description && (
            <p className="mt-2 text-sm text-slate-300">
              {settings.footerCta.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-3">
            {settings.footerCta.buttonText && (
              <a
                href={settings.footerCta.buttonHref}
                className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                {settings.footerCta.buttonText}
              </a>
            )}
            {settings.footerCta.secondaryText && (
              <Link
                href={settings.footerCta.secondaryHref}
                className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-amber-400 hover:text-white"
              >
                {settings.footerCta.secondaryText}
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function MainCategoryGrid({ tiles }: { tiles: StoreHomeData["mainCategories"] }) {
  if (tiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Categories are being set up.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.key}
          href={tile.href}
          className="group relative flex h-28 flex-col justify-end overflow-hidden rounded-xl border bg-slate-900 p-4 transition hover:shadow-md sm:h-32"
        >
          {tile.imageUrl ? (
            <Image
              src={tile.imageUrl}
              alt={tile.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

          <div className="relative">
            <p className="text-sm font-bold leading-tight text-white sm:text-base">
              {tile.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              {tile.productCount} {tile.productCount === 1 ? "item" : "items"}
              <span className="mx-1.5 text-slate-400">·</span>
              Browse
              <ArrowUpRight className="ml-1 inline h-3 w-3 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </p>
          </div>
        </Link>
      ))}
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

function ProductShelf({ products }: { products: StoreProduct[] }) {
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
