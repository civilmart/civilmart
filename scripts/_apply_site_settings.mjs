import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const sql = `
CREATE TABLE IF NOT EXISTS "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "site_settings" ("key", "value")
VALUES
    ('siteName', 'NaranScents'),
    ('helpline', ''),
    ('footerText', 'Fresh, long-lasting fragrances at honest prices.'),
    ('topbarMessages', '["Welcome to NaranScents", "ENJOY 5% OFF ON YOUR FIRST PURCHASE", "Cash on Delivery — pay when your order arrives", "Free delivery on orders over Rs 2,000"]'),
    ('heroSlides', '[]')
ON CONFLICT ("key") DO NOTHING;
`;

try {
  await client.query(sql);
  await client.query(
    `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES (gen_random_uuid()::text, 'manual_add_site_settings', CURRENT_TIMESTAMP, '20260912090000_add_site_settings', NULL, NULL, CURRENT_TIMESTAMP, 1)`
  );
  console.log("Applied add_site_settings");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
}
await client.end();