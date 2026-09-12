"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Carousel } from "@/components/store/carousel";
import { type StoreAd } from "@/lib/ads";

async function fetchAds(slot: string): Promise<StoreAd[]> {
  const response = await fetch(`/api/store/ads?slot=${encodeURIComponent(slot)}`);

  if (!response.ok) return [];

  const data = await response.json();

  return data.success ? (data.data as StoreAd[]) : [];
}

function AdSlide({ ad, compact }: { ad: StoreAd; compact?: boolean }) {
  const minHeight = compact ? "min-h-[140px]" : "min-h-[200px] sm:min-h-[240px]";

  const body = (
    <>
      {ad.imageUrl ? (
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

  if (!ad.href) {
    return (
      <div
        className={`relative flex items-center overflow-hidden rounded-xl border bg-slate-900 px-6 ${minHeight}`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={ad.href}
      className={`relative flex items-center overflow-hidden rounded-xl border bg-slate-900 px-6 transition hover:shadow-md ${minHeight}`}
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