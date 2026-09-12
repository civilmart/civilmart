import { ProductUnit } from "@/generated/prisma/enums";

export const PRODUCT_UNITS: string[] = Object.values(ProductUnit);

export function isValidUnit(unit: string): boolean {
  return PRODUCT_UNITS.includes(unit);
}

export const VALID_PRODUCT_STATUSES = ["ACTIVE", "INACTIVE", "DISCONTINUED"];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const num = Number(value);

  return Number.isFinite(num) ? num : null;
}

export function toNumberOrZero(value: unknown): number {
  const num = toNumberOrNull(value);

  return num === null || num < 0 ? 0 : num;
}