export type HeroSlide = {
  id: string;
  imageUrl: string;
  heading: string;
  subheading: string;
  cta: string;
  href: string;
  active: boolean;
};

export type FooterCta = {
  heading: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  secondaryText: string;
  secondaryHref: string;
};

export type SiteSettings = {
  siteName: string;
  siteDescription: string;
  helpline: string;
  topbarMessages: string[];
  footerText: string;
  heroSlides: HeroSlide[];
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  codNote: string;
  featuredProductCount: number;
  footerCta: FooterCta;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "Civil Mart",
  siteDescription:
    "Building materials, tools and hardware for every project — order online and pay on delivery.",
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
  featuredProductCount: 4,
  footerCta: {
    heading: "Need help with your order?",
    description:
      "Call our helpline or chat with us on WhatsApp for bulk pricing and project orders.",
    buttonText: "Call Now",
    buttonHref: "tel:",
    secondaryText: "Browse Products",
    secondaryHref: "/products",
  },
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

export const SITE_SETTING_KEYS = [
  "siteName",
  "siteDescription",
  "helpline",
  "topbarMessages",
  "footerText",
  "heroSlides",
  "currency",
  "shippingFee",
  "freeShippingThreshold",
  "codNote",
  "featuredProductCount",
  "footerCta",
] as const;
