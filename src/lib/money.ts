export const DEFAULT_CURRENCY = "Rs";

export function formatMoney(
  value: number,
  currency: string = DEFAULT_CURRENCY
): string {
  return `${currency} ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)}`;
}

export function computeShipping(
  subtotal: number,
  shippingFee: number,
  freeShippingThreshold: number
): number {
  if (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) {
    return 0;
  }

  return shippingFee > 0 ? shippingFee : 0;
}