import { formatMoney } from "@/lib/money";

export function formatPrice(value: number): string {
  return formatMoney(value);
}

export const PRODUCT_UNIT_LABELS: Record<string, string> = {
  BAG: "bag",
  BOX: "box",
  CARTON: "carton",
  PACK: "pack",
  PIECE: "piece",
  ROLL: "roll",
  SHEET: "sheet",
  KG: "kg",
  GRAM: "g",
  TON: "ton",
  LITER: "liter",
  CFT: "cft",
  CUBIC_METER: "cu m",
  SFT: "sq ft",
  METER: "m",
  FOOT: "ft",
  GALLON: "gallon",
  SET: "set",
  PAIR: "pair",
  TUBE: "tube",
  CAN: "can",
  LENGTH: "length",
  SLAB: "slab",
  DRUM: "drum",
  KIT: "kit",
  BUCKET: "bucket",
  ML: "ml",
};

export function unitLabel(unit: string): string {
  return PRODUCT_UNIT_LABELS[unit] ?? unit.toLowerCase();
}

export type StoreVariant = {
  id: string;
  sku: string;
  name: string;
  sizeValue: number;
  sizeUnit: string;
  price: number | null;
  imageUrl: string | null;
};

export type StoreProduct = {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit: string;
  stockQuantity: number;
  imageUrl: string | null;
  imageUrl2: string | null;
  category: string | null;
  categorySlug: string | null;
  subcategory: string | null;
  trades: string[];
  isFeatured: boolean;
  price: number | null;
  variants: StoreVariant[];
};

export function effectivePrice(product: StoreProduct): number | null {
  if (product.variants.length > 0) {
    const priced = product.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);

    if (priced.length > 0) {
      return Math.min(...priced);
    }
  }

  return product.price;
}

export function isInStock(product: StoreProduct): boolean {
  return product.stockQuantity > 0;
}

export function sizeLabel(variant: StoreVariant): string {
  return `${maybeInt(variant.sizeValue)} ${unitLabel(variant.sizeUnit)}`;
}

export function productUnitLabel(product: StoreProduct): string {
  return unitLabel(product.unit);
}

export function maybeInt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

export function placeholderImage(seed: string): string {
  const hues = [24, 38, 152, 262, 340, 200];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hues[Math.abs(hash) % hues.length];
  const letter = (seed.trim()[0] ?? "C").toUpperCase();
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue} 45% 92%)"/>
        <stop offset="100%" stop-color="hsl(${hue} 40% 82%)"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)"/>
    <text x="300" y="330" font-family="Georgia, serif" font-size="200"
      fill="hsl(${hue} 45% 45%)" text-anchor="middle">${letter}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type CatalogueCategory = {
  id: string;
  name: string;
  slug: string | null;
  count: number;
};

export type CatalogueGroup = {
  name: string;
  categories: CatalogueCategory[];
};

export type BrandCount = {
  name: string;
  count: number;
};

export type SubcategoryCount = {
  group: string;
  name: string;
  count: number;
};

export type CatalogueFilters = {
  groups: CatalogueGroup[];
  brands: BrandCount[];
  subcategories: SubcategoryCount[];
};

export type ProductPageResult = {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  products: StoreProduct[];
};

export type SortKey = "featured" | "name_asc" | "price_asc" | "price_desc";

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function defaultCartVariant(
  product: StoreProduct
): StoreVariant | null {
  if (product.variants.length === 0) return null;

  const priced = product.variants.filter((v) => v.price !== null);
  const pool = priced.length > 0 ? priced : product.variants;

  return pool.reduce((cheapest, v) =>
    (v.price ?? Number.POSITIVE_INFINITY) <
    (cheapest.price ?? Number.POSITIVE_INFINITY)
      ? v
      : cheapest
  );
}