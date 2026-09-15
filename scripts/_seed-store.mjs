import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const products = [
  {
    code: "NS-OUD-01",
    name: "Nocturnal Oud",
    category: "Oud",
    description: "A deep, smoky oud with warm amber and a whisper of rose. Long-lasting and commanding.",
    price: "2900",
    isFeatured: true,
    imageUrl: null,
    variants: [
      { sku: "NS-OUD-01-10", name: "Oud · 10ml", sizeValue: "10", unit: "ML", price: "850", stock: 18 },
      { sku: "NS-OUD-01-30", name: "Oud · 30ml", sizeValue: "30", unit: "ML", price: "1900", stock: 12 },
      { sku: "NS-OUD-01-50", name: "Oud · 50ml", sizeValue: "50", unit: "ML", price: "2900", stock: 8 },
    ],
  },
  {
    code: "NS-FLR-02",
    name: "Wildflower Meadows",
    category: "Floral",
    description: "Fresh jasmine, neroli and soft musk. A bright, feminine everyday scent.",
    price: "2400",
    isFeatured: true,
    imageUrl: null,
    variants: [
      { sku: "NS-FLR-02-10", name: "Wildflower · 10ml", sizeValue: "10", unit: "ML", price: "750", stock: 25 },
      { sku: "NS-FLR-02-30", name: "Wildflower · 30ml", sizeValue: "30", unit: "ML", price: "1550", stock: 20 },
      { sku: "NS-FLR-02-50", name: "Wildflower · 50ml", sizeValue: "50", unit: "ML", price: "2400", stock: 10 },
    ],
  },
  {
    code: "NS-FRS-03",
    name: "Pine & Citrus",
    category: "Fresh",
    description: "Crisp bergamot, pine needle and clean vetiver. Like a morning in the northern mountains.",
    price: "2200",
    isFeatured: false,
    imageUrl: null,
    variants: [
      { sku: "NS-FRS-03-10", name: "Pine & Citrus · 10ml", sizeValue: "10", unit: "ML", price: "700", stock: 15 },
      { sku: "NS-FRS-03-30", name: "Pine & Citrus · 30ml", sizeValue: "30", unit: "ML", price: "1400", stock: 9 },
    ],
  },
  {
    code: "NS-SPK-04",
    name: "Cardamom Silk",
    category: "Spice",
    description: "Cardamom, saffron and creamy sandalwood. Warm and inviting for cooler evenings.",
    price: "2600",
    isFeatured: true,
    imageUrl: null,
    variants: [
      { sku: "NS-SPK-04-30", name: "Cardamom Silk · 30ml", sizeValue: "30", unit: "ML", price: "1700", stock: 0 },
      { sku: "NS-SPK-04-50", name: "Cardamom Silk · 50ml", sizeValue: "50", unit: "ML", price: "2600", stock: 6 },
    ],
  },
  {
    code: "NS-MSK-05",
    name: "White Musk",
    category: "Fresh",
    description: "Soft white musk with a touch of amber and white tea. Clean, subtle and romantic.",
    price: "2100",
    isFeatured: false,
    imageUrl: null,
    variants: [
      { sku: "NS-MSK-05-10", name: "White Musk · 10ml", sizeValue: "10", unit: "ML", price: "650", stock: 22 },
      { sku: "NS-MSK-05-30", name: "White Musk · 30ml", sizeValue: "30", unit: "ML", price: "1350", stock: 14 },
      { sku: "NS-MSK-05-50", name: "White Musk · 50ml", sizeValue: "50", unit: "ML", price: "2100", stock: 7 },
    ],
  },
];

for (const p of products) {
  const existing = await client.query(`SELECT id FROM products WHERE code = $1`, [p.code]);
  let productId;
  if (existing.rows.length > 0) {
    productId = existing.rows[0].id;
    await client.query(`DELETE FROM product_variants WHERE "productId" = $1`, [productId]);
    console.log(`Updating existing product ${p.code}`);
  } else {
    const res = await client.query(
      `INSERT INTO products (id, code, name, description, status, "createdAt", "updatedAt", category, "isFeatured", price) VALUES (gen_random_uuid()::text, $1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4, $5, $6) RETURNING id`,
      [p.code, p.name, p.description, p.category, p.isFeatured, p.price]
    );
    productId = res.rows[0].id;
    console.log(`Created product ${p.code}`);
  }

  for (const v of p.variants) {
    await client.query(
      `INSERT INTO product_variants (id, "productId", sku, name, "sizeValue", "sizeUnit", status, "createdAt", "updatedAt", price, "stockQuantity") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7)`,
      [productId, v.sku, v.name, v.sizeValue, v.unit, v.price, v.stock]
    );
  }
  console.log(`  -> ${p.variants.length} variants`);
}

await client.end();
console.log("Seed complete");