import { z } from "zod";
import { PRODUCT_UNITS, VALID_PRODUCT_STATUSES } from "./catalog";

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  group: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
  tradeId: z.string().optional().nullable(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100),
  categoryId: z.string().optional().nullable(),
});

export type BrandFormValues = z.infer<typeof brandSchema>;

export const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required").max(100),
  sku: z.string().min(1, "SKU is required").max(50),
  barcode: z.string().max(50).optional().nullable(),
  sizeValue: z.string().min(1, "Size is required"),
  sizeUnit: z.string().refine((v) => PRODUCT_UNITS.includes(v), "Invalid unit"),
  imageUrl: z.string().url().optional().nullable(),
});

export type VariantFormValues = z.infer<typeof variantSchema>;

export const productSchema = z.object({
  code: z.string().min(1, "Product code is required").max(50),
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  unit: z.string().refine((v) => PRODUCT_UNITS.includes(v), "Invalid unit"),
  stockQuantity: z.coerce.number().min(0, "Stock cannot be negative"),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  imageUrl2: z.string().url().optional().nullable(),
  isFeatured: z.boolean().default(false),
  status: z
    .string()
    .refine((v) => VALID_PRODUCT_STATUSES.includes(v), "Invalid status")
    .default("ACTIVE"),
  variants: z.array(variantSchema).optional().default([]),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const poItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional().nullable(),
  productCode: z.string().optional(),
  productName: z.string().optional(),
  variantName: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  estimatedCost: z.coerce.number().min(0, "Cost cannot be negative").optional(),
});

export const purchaseOrderSchema = z.object({
  poNumber: z.string().min(1, "PO number is required").max(50),
  supplierId: z.string().min(1, "Supplier is required"),
  notes: z.string().max(500).optional().nullable(),
  items: z
    .array(poItemSchema)
    .min(1, "At least one item is required")
    .refine(
      (items) => items.every((i) => i.productId && i.unit && i.quantity > 0),
      "Every item must have a product, unit, and valid quantity"
    ),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional().nullable(),
  productCode: z.string().optional(),
  productName: z.string().optional(),
  variantName: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  cost: z.coerce.number().positive("Cost must be positive"),
});

export const purchaseSchema = z.object({
  purchaseNo: z.string().min(1, "Purchase number is required").max(50),
  supplierId: z.string().min(1, "Supplier is required"),
  notes: z.string().max(500).optional().nullable(),
  taxPercent: z.coerce.number().min(0, "Tax cannot be negative").max(100),
  discountAmount: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .optional(),
  items: z
    .array(purchaseItemSchema)
    .min(1, "At least one item is required")
    .refine(
      (items) =>
        items.every((i) => i.productId && i.unit && i.quantity > 0 && i.cost > 0),
      "Every item must have a product, unit, valid quantity, and cost"
    ),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(100),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  gstNo: z.string().max(20).optional().nullable(),
  tradeIds: z.array(z.string()).optional().default([]),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  gstNo: z.string().max(20).optional().nullable(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional().nullable(),
  adjustType: z.enum(["SET", "ADD", "SUBTRACT"]),
  quantity: z.coerce.number().min(0, "Quantity must be non-negative"),
  reason: z.string().min(1, "Reason is required").max(200),
});

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

export const tradeSchema = z.object({
  name: z.string().min(1, "Trade name is required").max(100),
  slug: z.string().max(100).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type TradeFormValues = z.infer<typeof tradeSchema>;

export const rateListUpdateSchema = z.object({
  rateListPrice: z.coerce.number().min(0).optional().nullable(),
  discount: z.coerce.number().min(0).max(100).optional().nullable(),
  wholesalePrice: z.coerce.number().min(0).optional().nullable(),
  retailPrice: z.coerce.number().min(0).optional().nullable(),
  brandId: z.string().optional().nullable(),
});

export type RateListFormValues = z.infer<typeof rateListUpdateSchema>;
