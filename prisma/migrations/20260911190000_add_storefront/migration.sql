-- CreateEnum
CREATE TYPE "CustomerOrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterTable: products
ALTER TABLE "products" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "products" ADD COLUMN "price" DECIMAL(14,2);
ALTER TABLE "products" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: product_variants
ALTER TABLE "product_variants" ADD COLUMN "price" DECIMAL(14,2);
ALTER TABLE "product_variants" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: customers
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customers_username_key" ON "customers"("username");
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateTable: customer_orders
CREATE TABLE "customer_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "notes" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
    "status" "CustomerOrderStatus" NOT NULL DEFAULT 'PLACED',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "shipping" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "customer_orders_orderNumber_key" ON "customer_orders"("orderNumber");
CREATE INDEX "customer_orders_customerId_idx" ON "customer_orders"("customerId");
CREATE INDEX "customer_orders_status_idx" ON "customer_orders"("status");
CREATE INDEX "customer_orders_createdAt_idx" ON "customer_orders"("createdAt");

-- CreateTable: customer_order_items
CREATE TABLE "customer_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    CONSTRAINT "customer_order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "customer_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "customer_order_items_orderId_idx" ON "customer_order_items"("orderId");

-- CreateTable: customer_order_status_events
CREATE TABLE "customer_order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "CustomerOrderStatus" NOT NULL,
    "note" TEXT,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_order_status_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "customer_order_status_events_orderId_idx" ON "customer_order_status_events"("orderId");