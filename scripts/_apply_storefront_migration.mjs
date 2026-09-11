import fs from "node:fs";
import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const sql = fs.readFileSync(new URL("../prisma/migrations/20260911190000_add_storefront/migration.sql", import.meta.url), "utf8");

try {
  await client.query(sql);
  console.log("Storefront migration applied");
} catch (e) {
  console.error("Migration failed:", e.message);
  await client.end();
  process.exit(1);
}

try {
  await client.query(`
    INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
    VALUES (gen_random_uuid()::text, 'manual_add_storefront', CURRENT_TIMESTAMP, '20260911190000_add_storefront', NULL, NULL, CURRENT_TIMESTAMP, 1)
  `);
  console.log("Migration recorded in _prisma_migrations");
} catch (e) {
  console.error("Failed to record migration:", e.message);
}

await client.end();