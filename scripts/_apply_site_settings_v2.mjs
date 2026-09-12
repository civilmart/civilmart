import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const sql = `
INSERT INTO "site_settings" ("key", "value")
VALUES
    ('currency', 'Rs'),
    ('shippingFee', '0'),
    ('freeShippingThreshold', '0'),
    ('codNote', 'Order by phone on WhatsApp and pay on delivery.')
ON CONFLICT ("key") DO NOTHING;
`;

try {
  await client.query(sql);
  console.log("Seeded site settings v2 keys");
} catch (e) {
  console.error("Seed failed:", e.message);
  process.exit(1);
}
await client.end();