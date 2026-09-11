ALTER TABLE "products" ADD COLUMN "imageUrl2" TEXT;

-- CreateTable: customer_wishlist_items
CREATE TABLE "customer_wishlist_items" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_wishlist_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_wishlist_items_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "customer_wishlist_items_customerId_productId_key" ON "customer_wishlist_items"("customerId", "productId");
CREATE INDEX "customer_wishlist_items_productId_idx" ON "customer_wishlist_items"("productId");