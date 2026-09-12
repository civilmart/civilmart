import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

type CatalogueItem = {
  code: string;
  name: string;
  brand: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  unit: string;
  trades: string[];
  minimumStock: number | null;
  maximumStock: number | null;
  reorderLevel: number | null;
};

type CatalogueCategory = {
  name: string;
  slug: string;
  group: string | null;
  subcategories: string[];
};

const catalogue = JSON.parse(
  readFileSync(new URL("./catalogue.json", import.meta.url), "utf8")
) as {
  categories: CatalogueCategory[];
  items: CatalogueItem[];
};

// Sample prices (PKR) for a handful of flagship items so the storefront
// demo has orderable products. Treat these as placeholders to confirm.
const SAMPLE_PRICES: Record<string, number> = {
  "CEM-OPC-001": 1450,
  "CEM-PPC-001": 1380,
  "CEM-WHT-001": 2200,
  "BRK-RED-001": 45,
  "BRK-FLA-001": 48,
  "BLK-CON-004": 65,
  "SND-RAV-001": 62,
  "AGG-010-001": 65,
  "AGG-020-001": 65,
  "REB-001": 265000,
  "STL-WIR-001": 330,
  "WPR-STP-001": 220,
  "TLE-FLR-300": 420,
  "FRM-PLY-001": 4500,
  "TOL-MSN-006": 8500,
  "ELC-LED-009": 350,
  "ELC-CNS-001": 120,
  "PLB-GIP-001": 320,
  "PLB-VLV-BAL": 480,
  "GEN-TRP-001": 900,
  "PPE-HLM-001": 550,
  "PAINT-0001": 1450,
  "GYPS-0001": 1200,
};

async function main() {
  console.log("Seeding Civil Mart catalogue...");

  // Categories
  let seededCategories = 0;
  for (const cat of catalogue.categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, group: cat.group, isActive: true },
      create: {
        name: cat.name,
        slug: cat.slug,
        group: cat.group,
        isActive: true,
      },
    });
    seededCategories += 1;
  }
  console.log(`Categories: ${seededCategories}`);

  const categoryBySlug = new Map(
    (
      await prisma.category.findMany({ select: { id: true, slug: true } })
    ).map((c) => [c.slug, c.id])
  );

  // Products
  let seeded = 0;
  let priced = 0;
  for (const item of catalogue.items) {
    const categoryId = categoryBySlug.get(
      item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    );

    const hasPrice = Object.prototype.hasOwnProperty.call(
      SAMPLE_PRICES,
      item.code
    );
    const price = hasPrice ? SAMPLE_PRICES[item.code] : null;
    const baseStock = item.minimumStock ?? 0;
    const openingStock =
      !hasPrice || item.maximumStock == null
        ? Math.max(baseStock, 0)
        : Math.max(item.maximumStock, 0);

    await prisma.product.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        brand: item.brand,
        unit: item.unit as never,
        description: item.description,
        status: "ACTIVE",
        subcategory: item.subcategory,
        minimumStock: item.minimumStock,
        maximumStock: item.maximumStock,
        reorderLevel: item.reorderLevel,
        trades: item.trades,
        categoryId: categoryId ?? null,
        price,
        isFeatured: hasPrice,
        stockQuantity: openingStock,
      },
      create: {
        code: item.code,
        name: item.name,
        brand: item.brand,
        unit: item.unit as never,
        description: item.description,
        status: "ACTIVE",
        subcategory: item.subcategory,
        minimumStock: item.minimumStock,
        maximumStock: item.maximumStock,
        reorderLevel: item.reorderLevel,
        trades: item.trades,
        categoryId: categoryId ?? null,
        price,
        isFeatured: hasPrice,
        stockQuantity: openingStock,
      },
    });
    seeded += 1;
    if (hasPrice) priced += 1;
  }
  console.log(`Products: ${seeded} (${priced} with sample prices)`);

  // Admin user (only when no staff users exist yet)
  const staffCount = await prisma.user.count();
  if (staffCount === 0) {
    await prisma.user.create({
      data: {
        username: "admin",
        name: "Super Admin",
        email: "admin@civilmart.pk",
        passwordHash: hashPassword("admin123"),
        role: "SUPERADMIN",
        isActive: true,
      },
    });
    console.log("Admin user created: admin / admin123");
  } else {
    console.log(`Skipped admin creation (${staffCount} user(s) already exist)`);
  }

  // Demo storefront customer
  const demoCustomer = await prisma.customer.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      name: "Demo Customer",
      email: "demo@example.com",
      phone: "03001234567",
      address: "House 12, Street 4, Gulberg",
      city: "Lahore",
      passwordHash: hashPassword("demo123"),
    },
  });
  console.log(`Demo customer ready: demo / demo123 (${demoCustomer.id})`);

  // Site settings defaults
  const settings: Record<string, string> = {
    siteName: "Civil Mart",
    helpline: "+92 300 0000000",
    footerText: "Quality building materials and hardware for every project.",
    codNote: "Order online and pay in cash when your order arrives.",
    currency: "Rs",
    shippingFee: "0",
    freeShippingThreshold: "0",
    topbarMessages: JSON.stringify([
      "Welcome to Civil Mart",
      "Construction materials, tools and hardware trusted by builders",
      "Cash on Delivery — pay when your order arrives",
      "Bulk & contractor orders welcome",
    ]),
    heroSlides: "[]",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log("Site settings defaults applied.");

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });