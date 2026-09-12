import { prisma } from "@/lib/prisma";

export type HeroSlide = {
  id: string;
  imageUrl: string;
  heading: string;
  subheading: string;
  cta: string;
  href: string;
  active: boolean;
};

export type SiteSettings = {
  siteName: string;
  helpline: string;
  topbarMessages: string[];
  footerText: string;
  heroSlides: HeroSlide[];
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  codNote: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "Civil Mart",
  helpline: "",
  topbarMessages: [
    "Welcome to Civil Mart",
    "Building materials, tools and hardware for every project",
    "Cash on Delivery — pay when your order arrives",
    "Bulk & contractor orders welcome",
  ],
  footerText: "Quality building materials and hardware for every project.",
  heroSlides: [],
  currency: "Rs",
  shippingFee: 0,
  freeShippingThreshold: 0,
  codNote: "Order online and pay in cash when your order arrives.",
};

export function parseJsonArray(
  value: string | undefined,
  fallback: unknown[]
): unknown[] {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readNumber(
  map: Map<string, string>,
  key: string,
  fallback: number
): number {
  const value = Number(map.get(key));

  return Number.isFinite(value) ? value : fallback;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await prisma.siteSetting.findMany();
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    siteName: map.get("siteName") || DEFAULT_SITE_SETTINGS.siteName,
    helpline: map.get("helpline") ?? "",
    footerText: map.get("footerText") || DEFAULT_SITE_SETTINGS.footerText,
    topbarMessages: parseJsonArray(
      map.get("topbarMessages"),
      DEFAULT_SITE_SETTINGS.topbarMessages
    ) as string[],
    heroSlides: parseJsonArray(
      map.get("heroSlides"),
      DEFAULT_SITE_SETTINGS.heroSlides
    ) as HeroSlide[],
    currency: map.get("currency") || DEFAULT_SITE_SETTINGS.currency,
    shippingFee: readNumber(
      map,
      "shippingFee",
      DEFAULT_SITE_SETTINGS.shippingFee
    ),
    freeShippingThreshold: readNumber(
      map,
      "freeShippingThreshold",
      DEFAULT_SITE_SETTINGS.freeShippingThreshold
    ),
    codNote: map.get("codNote") || DEFAULT_SITE_SETTINGS.codNote,
  };
}

export const SITE_SETTING_KEYS = [
  "siteName",
  "helpline",
  "topbarMessages",
  "footerText",
  "heroSlides",
  "currency",
  "shippingFee",
  "freeShippingThreshold",
  "codNote",
] as const;