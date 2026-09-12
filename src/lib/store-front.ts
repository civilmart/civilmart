import { formatMoney } from "@/lib/money";

export function formatPrice(value: number): string {
  return formatMoney(value);
}

export type StoreVariant = {
  id: string;
  sku: string;
  name: string;
  sizeValue: number;
  sizeUnit: string;
  price: number | null;
  imageUrl: string | null;
  stockQuantity: number;
};

export type StoreProduct = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  category: string | null;
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
  return product.variants.some((v) => v.stockQuantity > 0);
}

export function sizeLabel(variant: StoreVariant): string {
  return `${Number.isInteger(variant.sizeValue) ? variant.sizeValue : variant.sizeValue.toFixed(2)} ${variant.sizeUnit.toLowerCase()}`;
}

export function maybeInt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function placeholderImage(seed: string): string {
  const hues = [24, 38, 152, 262, 340, 200];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hues[Math.abs(hash) % hues.length];
  const letter = (seed.trim()[0] ?? "N").toUpperCase();
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