import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category" TEXT');
await client.query(`
  INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
  VALUES (gen_random_uuid()::text, 'manual_add_product_category', CURRENT_TIMESTAMP, '20260911190500_add_product_category', NULL, NULL, CURRENT_TIMESTAMP, 1)
`);
console.log('Applied add_product_category');
await client.end();