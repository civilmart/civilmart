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

export type StoreAd = {
  id: string;
  slot: AdSlot;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  href: string | null;
  sortOrder: number;
};

export function isAdSlot(value: string): value is AdSlot {
  return value === "HOME_BANNER" || value === "PRODUCTS_BANNER";
}