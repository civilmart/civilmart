"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Carousel } from "@/components/store/carousel";
import { type StoreAd, type AdSize, AD_SIZE_MAP } from "@/lib/ads";

async function fetchAds(slot: string): Promise<StoreAd[]> {
  const response = await fetch(`/api/store/ads?slot=${encodeURIComponent(slot)}`);

  if (!response.ok) return [];

  const data = await response.json();

  return data.success ? (data.data as StoreAd[]) : [];
}

function sizeStyles(adSize: AdSize) {
  const s = AD_SIZE_MAP[adSize] ?? AD_SIZE_MAP.FULL_WIDTH;
  return { width: s.width, height: s.height };
}

function AdSlide({ ad, compact }: { ad: StoreAd; compact?: boolean }) {
  const minH = compact ? "min-h-[140px]" : "min-h-[200px] sm:min-h-[240px]";

  if (ad.contentType === "EMBED" && ad.embedCode) {
    const sz = sizeStyles(ad.adSize);
    return (
      <div
        className="mx-auto overflow-hidden rounded-xl border"
        style={{ width: sz.width, maxWidth: "100%", height: sz.height }}
        dangerouslySetInnerHTML={{ __html: ad.embedCode }}
      />
    );
  }

  if (ad.contentType === "TEXT") {
    const sz = sizeStyles(ad.adSize);
    const textBody = (
      <div className={`relative flex items-center justify-center overflow-hidden rounded-xl border bg-slate-900 px-6 ${minH}`} style={{ width: sz.width, maxWidth: "100%", height: sz.height }}>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white sm:text-3xl">{ad.title}</h3>
          {ad.subtitle && <p className="mt-2 text-sm text-amber-300">{ad.subtitle}</p>}
        </div>
      </div>
    );
    if (ad.href) {
      return <Link href={ad.href} className="block transition hover:shadow-md">{textBody}</Link>;
    }
    return textBody;
  }

  const sz = sizeStyles(ad.adSize);

  const body = (
    <>
      {ad.imageUrl && ad.imageUrl !== "null" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/10" />

      <div className="relative max-w-xl">
        <span className="inline-block rounded-sm bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950">
          {ad.subtitle ?? "Promotion"}
        </span>

        <h3 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
          {ad.title}
        </h3>

        {ad.subtitle && (
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-300">
            View offer
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </>
  );

  const wrapClass = `relative flex items-center overflow-hidden rounded-xl border bg-slate-900 px-6 ${minH}`;

  if (!ad.href) {
    return (
      <div className={wrapClass} style={{ width: sz.width, maxWidth: "100%", height: sz.height }}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={ad.href}
      className={`${wrapClass} transition hover:shadow-md`}
      style={{ width: sz.width, maxWidth: "100%", height: sz.height }}
    >
      {body}
    </Link>
  );
}

export function StoreAdBanners({
  slot,
  variant = "carousel",
}: {
  slot: string;
  variant?: "carousel" | "strip";
}) {
  const [ads, setAds] = useState<StoreAd[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const list = await fetchAds(slot);

      if (!cancelled) setAds(list);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [slot]);

  if (ads.length === 0) return null;

  if (variant === "strip") {
    return (
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ads.slice(0, 3).map((ad) => (
          <AdSlide key={ad.id} ad={ad} compact />
        ))}
      </section>
    );
  }

  return (
    <section>
      <Carousel
        autoAdvanceMs={7000}
        className="overflow-hidden rounded-xl border"
        slides={ads.slice(0, 4).map((ad) => (
          <AdSlide key={ad.id} ad={ad} />
        ))}
      />
    </section>
  );
}
