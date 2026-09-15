import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Pool } from "pg";

const url =
  process.env.DATABASE_URL ||
  "postgres://fb2790cd88cf11f97a98da93fb493f9e4aaa760ee66a241ae20af4c68c55d006:sk_g5P1uawfvV2JqXODvO_9g@db.prisma.io:5432/postgres?sslmode=verify-full";

const sql = readFileSync(
  "prisma/migrations/20260912000000_init_civil_mart/migration.sql",
  "utf8"
);

const pool = new Pool({ connectionString: url, max: 1 });

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" SERIAL PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  );`);

  const existing = await pool.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    ["20260912000000_init_civil_mart"]
  );

  if (existing.rowCount === 0) {
    console.log("Executing migration SQL...");
    await pool.query(sql);
    const checksum = createHash("sha256").update(sql).digest("hex");
    await pool.query(
      `INSERT INTO "_prisma_migrations" (checksum, finished_at, migration_name, started_at, applied_steps_count)
       VALUES ($1, now(), '20260912000000_init_civil_mart', now(), 1)`,
      [checksum]
    );
    console.log("Migration applied and recorded.");
  } else {
    console.log("Migration already recorded; skipping.");
  }

  const tables = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  console.log("Tables:", tables.rows.map((r) => r.tablename).join(", "));
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error("ERROR:", e.message);
    await pool.end();
    process.exit(1);
  });