import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER'`);
  await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERADMIN'`);
  await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;
    ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "userId" TEXT;
    ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" TEXT;`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "customers_userId_key" ON "customers"("userId")`);
  const fk = await client.query(`select 1 from pg_constraint where conname='customers_userId_fkey'`);
  if (fk.rows.length === 0) {
    await client.query(`ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
  }
  await client.query(`INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES (gen_random_uuid()::text, 'manual_add_roles_staff_customer', CURRENT_TIMESTAMP, '20260911210000_add_roles_and_staff_customer', NULL, NULL, CURRENT_TIMESTAMP, 1)`);
  console.log("Applied add_roles_and_staff_customer");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
}
await client.end();