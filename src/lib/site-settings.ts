import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SITE_LOGO,
  DEFAULT_FAVICONS,
  type HeroSlide,
  type SiteSettings,
  type SiteLogo,
  type Favicons,
  parseJsonArray,
} from "@/lib/site-settings.types";

export {
  DEFAULT_SITE_SETTINGS,
  SITE_SETTING_KEYS,
  type FooterCta,
  type HeroSlide,
  type SiteSettings,
  type SiteLogo,
  type Favicons,
} from "@/lib/site-settings.types";

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
    siteDescription:
      map.get("siteDescription") || DEFAULT_SITE_SETTINGS.siteDescription,
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
    featuredProductCount: readNumber(
      map,
      "featuredProductCount",
      DEFAULT_SITE_SETTINGS.featuredProductCount
    ),
    footerCta: (() => {
      const raw = map.get("footerCta");
      if (!raw) return DEFAULT_SITE_SETTINGS.footerCta;
      try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SITE_SETTINGS.footerCta, ...parsed };
      } catch {
        return DEFAULT_SITE_SETTINGS.footerCta;
      }
    })(),
    logo: (() => {
      const raw = map.get("logo");
      if (!raw) return DEFAULT_SITE_LOGO;
      try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SITE_LOGO, ...parsed };
      } catch {
        return DEFAULT_SITE_LOGO;
      }
    })(),
    favicons: (() => {
      const raw = map.get("favicons");
      if (!raw) return DEFAULT_FAVICONS;
      try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_FAVICONS, ...parsed };
      } catch {
        return DEFAULT_FAVICONS;
      }
    })(),
  };
}
