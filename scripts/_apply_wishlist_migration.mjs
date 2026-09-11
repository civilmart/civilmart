import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const sql = `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl2" TEXT;
CREATE TABLE IF NOT EXISTS "customer_wishlist_items" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_wishlist_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_wishlist_items_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_wishlist_items_customerId_productId_key" ON "customer_wishlist_items"("customerId", "productId");
CREATE INDEX IF NOT EXISTS "customer_wishlist_items_productId_idx" ON "customer_wishlist_items"("productId");`;
try {
  await client.query(sql);
  await client.query(`INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES (gen_random_uuid()::text, 'manual_add_wishlist', CURRENT_TIMESTAMP, '20260911200000_add_wishlist', NULL, NULL, CURRENT_TIMESTAMP, 1)`);
  console.log("Applied add_wishlist");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
}
await client.end();