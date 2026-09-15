import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { slugify } from "../src/lib/catalog";

async function main() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, group: true, tradeId: true },
  });

  const groups = [
    ...new Set(
      categories
        .map((c) => c.group)
        .filter((g): g is string => Boolean(g))
    ),
  ].sort();

  const tradeByGroup = new Map<string, string>();

  for (const group of groups) {
    let trade = await prisma.trade.findUnique({ where: { name: group } });

    if (!trade) {
      trade = await prisma.trade.create({
        data: {
          name: group,
          slug: slugify(group) || "trade",
        },
      });
      console.log(`trade created: ${group}`);
    }

    tradeByGroup.set(group, trade.id);
  }

  let general = await prisma.trade.findUnique({ where: { name: "General" } });

  if (!general) {
    general = await prisma.trade.create({
      data: { name: "General", slug: "general" },
    });
    console.log("trade created: General");
  }

  let linked = 0;

  for (const category of categories) {
    const tradeId = category.group
      ? tradeByGroup.get(category.group) ?? null
      : general!.id;

    if (tradeId && category.tradeId !== tradeId) {
      await prisma.category.update({
        where: { id: category.id },
        data: { tradeId },
      });
      linked += 1;
    }
  }

  console.log(`categories linked to trades: ${linked}`);
  console.log(`categories without trade: ${categories.filter((c) => !c.group).length} (assigned General)`);

  const genericBrand = await prisma.brand.findFirst({
    where: { name: "Generic", categoryId: null },
  });

  if (!genericBrand) {
    await prisma.brand.create({
      data: { name: "Generic", categoryId: null },
    });
    console.log("brand created: Generic");
  } else {
    console.log("brand Generic already exists");
  }

  const tradeCount = await prisma.trade.count();
  console.log(`total trades: ${tradeCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });