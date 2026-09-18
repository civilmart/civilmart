import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL,
  max: 2,
});

async function main() {
  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%product%'"
  );
  console.log("Tables:", tables.rows.map((r: any) => r.tablename));

  const products = await pool.query(
    "UPDATE products SET barcode = NULL WHERE barcode = 'null' RETURNING id"
  );
  console.log(`Products with barcode "null" fixed: ${products.rowCount}`);

  const variants = await pool.query(
    "UPDATE product_variants SET barcode = NULL WHERE barcode = 'null' RETURNING id"
  );
  console.log(`Variants with barcode "null" fixed: ${variants.rowCount}`);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
