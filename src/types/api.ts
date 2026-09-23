// Store product list item (for GET /api/store/products)
export type StoreProductListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  isFeatured: boolean;
  status: string;
  unit: string;
  stockQuantity: number;
  category: { id: string; name: string; slug: string } | null;
  variants: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    sizeValue: string;
    sizeUnit: string;
    imageUrl: string | null;
    retailPrice: number | null;
  }[];
  retailPrice: number | null;
};

// Store product detail (for GET /api/store/products/[id])
export type StoreProductDetail = StoreProductListItem & {
  barcode: string | null;
  imageUrl2: string | null;
  subcategory: string | null;
  trades: string[];
};

// Admin product list item (for GET /api/products)
export type AdminProductListItem = {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  status: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  isFeatured: boolean;
  unit: string;
  subcategory: string | null;
  stockQuantity: number;
  trades: string[];
  category: { id: string; name: string; group: string | null } | null;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    sizeValue: string;
    sizeUnit: string;
    imageUrl: string | null;
    status: string;
  }[];
  supplierProducts: {
    brandId: string | null;
    brand: { id: string; name: string } | null;
    supplier: { id: string; name: string };
    rateListPrice: number | null;
    discount: number;
    wholesalePrice: number | null;
    retailPrice: number | null;
  }[];
};

// Inventory row (for GET /api/inventory)
export type InventoryRow = {
  id: string;
  code: string;
  name: string;
  unit: string;
  stockQuantity: number;
  status: string;
  imageUrl: string | null;
  barcode: string | null;
  category: { id: string; name: string } | null;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    sizeValue: string;
    sizeUnit: string;
    stockQuantity: number;
    status: string;
  }[];
};

// Generic paginated response
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
