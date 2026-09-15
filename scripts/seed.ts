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

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  console.log("Seeding Civil Mart catalogue...");

  // Categories (bulk, non-destructive)
  const existingSlugs = new Set(
    (await prisma.category.findMany({ select: { slug: true } })).map(
      (c) => c.slug
    )
  );
  const newCategories = catalogue.categories.filter(
    (c) => !existingSlugs.has(c.slug)
  );
  if (newCategories.length > 0) {
    await prisma.category.createMany({
      data: newCategories.map((c) => ({
        name: c.name,
        slug: c.slug,
        group: c.group,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }
  const categoryBySlug = new Map(
    (
      await prisma.category.findMany({ select: { id: true, slug: true } })
    ).map((c) => [c.slug, c.id])
  );
  console.log(`Categories: ${catalogue.categories.length}`);

  // Products (bulk create for missing, targeted update without clobbering prices)
  const existingProducts = await prisma.product.findMany({
    select: { id: true, code: true, price: true },
  });
  const byCode = new Map(existingProducts.map((p) => [p.code, p]));

  const toCreate: CatalogueItem[] = [];
  const toUpdate: CatalogueItem[] = [];
  for (const item of catalogue.items) {
    if (byCode.has(item.code)) toUpdate.push(item);
    else toCreate.push(item);
  }

  const buildData = (item: CatalogueItem) => {
    const hasPrice = Object.prototype.hasOwnProperty.call(
      SAMPLE_PRICES,
      item.code
    );
    const price = hasPrice ? SAMPLE_PRICES[item.code] : null;
    const openingStock =
      !hasPrice || item.maximumStock == null
        ? Math.max(item.minimumStock ?? 0, 0)
        : Math.max(item.maximumStock, 0);

    return {
      code: item.code,
      name: item.name,
      brand: item.brand,
      unit: item.unit as never,
      description: item.description,
      status: "ACTIVE" as const,
      subcategory: item.subcategory,
      minimumStock: item.minimumStock,
      maximumStock: item.maximumStock,
      reorderLevel: item.reorderLevel,
      trades: item.trades,
      categoryId: categoryBySlug.get(slugify(item.category)) ?? null,
      price,
      isFeatured: hasPrice,
      stockQuantity: openingStock,
    };
  };

  if (toCreate.length > 0) {
    await prisma.product.createMany({
      data: toCreate.map(buildData),
      skipDuplicates: true,
    });
    console.log(`Created products: ${toCreate.length} (new)`);
  }

  // For existing products, only fill in null prices / stock for the sample
  // set without overwriting admin-set values.
  const needPriceUpdate = toUpdate.filter(
    (item) =>
      Object.prototype.hasOwnProperty.call(SAMPLE_PRICES, item.code) &&
      byCode.get(item.code)?.price == null
  );
  for (const item of needPriceUpdate) {
    const price = SAMPLE_PRICES[item.code];
    const openingStock =
      item.maximumStock != null ? Math.max(item.maximumStock, 0) : 0;
    await prisma.product.update({
      where: { code: item.code },
      data: { price, stockQuantity: openingStock, isFeatured: true },
    });
  }
  console.log(
    `Existing products: ${toUpdate.length} kept, ${needPriceUpdate.length} given sample prices`
  );

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
  await prisma.customer.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      name: "Demo Customer",
      email: "demo@example.com",
      phone: "03001234567",
      address: "House 12, Street 4, Gulberg III",
      city: "Lahore",
      passwordHash: hashPassword("demo123"),
    },
  });
  console.log("Demo customer ready: demo / demo123");

  // ---------------------------------------------------------------
  // Demo suppliers + rate lists (so /admin/supplier-catalog has data)
  // ---------------------------------------------------------------
  const demoSupplierByEmail = new Map<string, string>(
    (
      await prisma.supplier.findMany({
        select: { id: true, email: true },
      })
    ).flatMap((row) => (row.email ? [[row.email, row.id] as const] : []))
  );

  const DEMO_SUPPLIER_RATE_LISTS: Array<{
    supplier: {
      name: string;
      contactName: string | null;
      phone: string | null;
      email: string;
      address: string | null;
      notes: string | null;
    };
    lines: Array<{
      code: string;
      rateListPrice: number;
      discount: number;
      retailPrice: number;
      notes: string | null;
    }>;
  }> = [
    {
      supplier: {
        name: "Muzaffar Hardware & Tools",
        contactName: "Muzaffar Khan",
        phone: "+92 321 5588990",
        email: "muzaffar@civilmart.demo",
        address: "Star City Tower, F-10 Markaz, Islamabad",
        notes: "Primary supplier for cement, aggregates and steel.",
      },
      lines: [
        { code: "CEM-OPC-001", rateListPrice: 1420, discount: 2, retailPrice: 1450, notes: null },
        { code: "CEM-PPC-001", rateListPrice: 1350, discount: 2.5, retailPrice: 1380, notes: null },
        { code: "AGG-010-001", rateListPrice: 168, discount: 3, retailPrice: 175, notes: "Per cft" },
        { code: "AGG-020-001", rateListPrice: 190, discount: 3.5, retailPrice: 200, notes: "Per cft" },
        { code: "SND-RAV-001", rateListPrice: 220, discount: 2.5, retailPrice: 230, notes: "Per cft" },
        { code: "BRK-RED-001", rateListPrice: 58, discount: 4, retailPrice: 62, notes: "Per piece" },
        { code: "BRK-FLA-001", rateListPrice: 61, discount: 4, retailPrice: 65, notes: "Per piece" },
      ],
    },
    {
      supplier: {
        name: "Metro Steel Traders",
        contactName: "Bilal Sheikh",
        phone: "+92 300 4466221",
        email: "metro@civilmart.demo",
        address: "Sindh Industrial Trading Estate, Karachi",
        notes: "Steel reinforcement (Deformed & Plain bars).",
      },
      lines: [
        { code: "REB-001", rateListPrice: 265000, discount: 1.5, retailPrice: 275000, notes: "Per ton" },
        { code: "STL-WIR-001", rateListPrice: 330, discount: 0.5, retailPrice: 345, notes: "Per kg" },
      ],
    },
  ];

  for (const entry of DEMO_SUPPLIER_RATE_LISTS) {
    let supplierId = demoSupplierByEmail.get(entry.supplier.email);
    if (!supplierId) {
      const created = await prisma.supplier.create({
        data: entry.supplier,
        select: { id: true },
      });
      supplierId = created.id;
      demoSupplierByEmail.set(entry.supplier.email, supplierId);
    }

    let linked = 0;
    for (const line of entry.lines) {
      const product = byCode.get(line.code);
      if (!product) {
        console.log(`  [catalog] skip rate line: ${line.code} (no product)`);
        continue;
      }
      await prisma.supplierProduct.upsert({
        where: {
          supplierId_productId: {
            supplierId,
            productId: product.id,
          },
        },
        update: {
          rateListPrice: line.rateListPrice,
          discount: line.discount,
          retailPrice: line.retailPrice,
          notes: line.notes,
          active: true,
        },
        create: {
          supplierId,
          productId: product.id,
          brandId: null,
          rateListPrice: line.rateListPrice,
          discount: line.discount,
          retailPrice: line.retailPrice,
          notes: line.notes,
          active: true,
        },
      });
      linked += 1;
    }
    console.log(
      `  Supplier "${entry.supplier.name}": ${linked} rate list line(s) linked.`
    );
  }
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
