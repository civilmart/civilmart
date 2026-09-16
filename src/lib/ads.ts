export type AdSlot = "HOME_BANNER" | "PRODUCTS_BANNER";

export const AD_SLOTS: { value: AdSlot; label: string; note: string }[] = [
  {
    value: "HOME_BANNER",
    label: "Home page banner",
    note: "Shown on the storefront home page.",
  },
  {
    value: "PRODUCTS_BANNER",
    label: "Product listing banner",
    note: "Shown above the product grid when browsing categories.",
  },
];

export const AD_SLOT_LABELS: Record<AdSlot, string> = {
  HOME_BANNER: "Home page banner",
  PRODUCTS_BANNER: "Product listing banner",
};

export type AdContentType = "IMAGE" | "TEXT" | "EMBED";

export type AdSize = "FULL_WIDTH" | "300x250" | "728x90" | "1080x1080";

export const AD_SIZES: { value: AdSize; label: string; width: string; height: string }[] = [
  { value: "FULL_WIDTH", label: "Full Width", width: "100%", height: "auto" },
  { value: "300x250", label: "300 x 250 (Medium Rectangle)", width: "300px", height: "250px" },
  { value: "728x90", label: "728 x 90 (Leaderboard)", width: "728px", height: "90px" },
  { value: "1080x1080", label: "1080 x 1080 (Square)", width: "1080px", height: "1080px" },
];

export const AD_SIZE_MAP: Record<AdSize, { width: string; height: string }> = {
  FULL_WIDTH: { width: "100%", height: "auto" },
  "300x250": { width: "300px", height: "250px" },
  "728x90": { width: "728px", height: "90px" },
  "1080x1080": { width: "1080px", height: "1080px" },
};

export type StoreAd = {
  id: string;
  slot: AdSlot;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  href: string | null;
  contentType: AdContentType;
  embedCode: string | null;
  adSize: AdSize;
  sortOrder: number;
};

export function isAdSlot(value: string): value is AdSlot {
  return value === "HOME_BANNER" || value === "PRODUCTS_BANNER";
}

export function isAdContentType(value: string): value is AdContentType {
  return value === "IMAGE" || value === "TEXT" || value === "EMBED";
}

export function isAdSize(value: string): value is AdSize {
  return value === "FULL_WIDTH" || value === "300x250" || value === "728x90" || value === "1080x1080";
}
