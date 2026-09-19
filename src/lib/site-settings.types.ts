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

export type LogoDisplayMode = "logo" | "text" | "both";

export type SiteLogo = {
  imageUrl: string;
  displayMode: LogoDisplayMode;
};

export const DEFAULT_SITE_LOGO: SiteLogo = {
  imageUrl: "",
  displayMode: "text",
};

export type Favicons = {
  icon: string;
  png16: string;
  png32: string;
  apple: string;
  android192: string;
  android512: string;
  webp: string;
  svg: string;
};

export const DEFAULT_FAVICONS: Favicons = {
  icon: "",
  png16: "",
  png32: "",
  apple: "",
  android192: "",
  android512: "",
  webp: "",
  svg: "",
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
  logo: SiteLogo;
  favicons: Favicons;
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
  logo: DEFAULT_SITE_LOGO,
  favicons: DEFAULT_FAVICONS,
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
  "logo",
  "favicons",
] as const;
