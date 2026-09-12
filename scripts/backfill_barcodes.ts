import "dotenv/config";
import { Pool } from "pg";
import { prisma } from "@/lib/prisma";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL,
  max: 2,
});

/** Deterministic barcode: CM + 9-digit sequence (Code 128 scannable). */
function barcodeFor(sequence: number): string {
  return `CM${String(sequence).padStart(9, "0")}`;
}

async function main() {
  console.log("Ensuring barcode columns + unique indexes exist...");
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;`);
  await pool.query(
    `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS barcode TEXT;`
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_key" ON products (barcode) WHERE barcode IS NOT NULL;`
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_barcode_key" ON product_variants (barcode) WHERE barcode IS NOT NULL;`
  );

  const [products, variants, usedBarcodes] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, barcode: true, createdAt: true },
    }),
    prisma.productVariant.findMany({
      orderBy: [{ product: { createdAt: "asc" } }, { sizeValue: "asc" }],
      select: { id: true, barcode: true, product: { select: { id: true, barcode: true } } },
    }),
    pool
      .query<{ barcode: string }>(
        `SELECT barcode FROM products WHERE barcode IS NOT NULL
         UNION ALL
         SELECT barcode FROM product_variants WHERE barcode IS NOT NULL`
      )
      .then((rows) => new Set(rows.rows.map((r) => r.barcode))),
  ]);

  const productUpdates: Array<{ id: string; barcode: string }> = [];
  let sequence = 0;

  for (const product of products) {
    if (product.barcode) {
      continue;
    }

    sequence += 1;
    const rank = sequence;

    while (usedBarcodes.has(barcodeFor(rank)) && sequence < 100000) {
      sequence += 1;
    }

    const barcode = barcodeFor(sequence);
    usedBarcodes.add(barcode);
    productUpdates.push({ id: product.id, barcode });
  }

  const productBarcodeById = new Map<string, string>();
  products.forEach((p) => {
    if (p.barcode) productBarcodeById.set(p.id, p.barcode);
  });

  const variantUpdates: Array<{ id: string; barcode: string }> = [];
  let variantSuffix = 0;

  for (const variant of variants) {
    if (variant.barcode) {
      continue;
    }

    variantSuffix += 1;

    const base = variant.product.barcode || productBarcodeById.get(variant.product.id);
    let barcode = `${base || barcodeFor(sequence + variantSuffix)}-V${variantSuffix}`;

    while (usedBarcodes.has(barcode)) {
      variantSuffix += 1;
      barcode = `${base || barcodeFor(sequence + variantSuffix)}-V${variantSuffix}`;
    }

    usedBarcodes.add(barcode);
    variantUpdates.push({ id: variant.id, barcode });
  }

  if (productUpdates.length > 0) {
    const values = productUpdates
      .map((p) => `('${p.id}', '${p.barcode}')`)
      .join(",\n");
    await pool.query(`
      UPDATE products AS p SET barcode = t.barcode
      FROM (VALUES ${values}) AS t(id, barcode)
      WHERE p.id = t.id
    `);
  }

  if (variantUpdates.length > 0) {
    const values = variantUpdates
      .map((v) => `('${v.id}', '${v.barcode}')`)
      .join(",\n");
    await pool.query(`
      UPDATE product_variants AS v SET barcode = t.barcode
      FROM (VALUES ${values}) AS t(id, barcode)
      WHERE v.id = t.id
    `);
  }

  const [productTotal, productBarcoded, variantTotal, variantBarcoded] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { barcode: { not: null } } }),
      prisma.productVariant.count(),
      prisma.productVariant.count({ where: { barcode: { not: null } } }),
    ]);

  console.log(
    `Done. Products: ${productBarcoded}/${productTotal} barcoded | Variants: ${variantBarcoded}/${variantTotal} barcoded`
  );
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });