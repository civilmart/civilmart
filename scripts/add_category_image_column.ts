import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "categories"
    ADD COLUMN IF NOT EXISTS "imageUrl" TEXT
  `);

  const row = await prisma.$queryRawUnsafe<Array<{ column_name: string; is_nullable: string }>>(
    `SELECT column_name, is_nullable FROM information_schema.columns
     WHERE table_name = 'categories' AND column_name = 'imageUrl'`
  );

  console.log(JSON.stringify(row));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());