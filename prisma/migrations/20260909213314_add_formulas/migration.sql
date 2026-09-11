-- CreateEnum
CREATE TYPE "FormulaStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "formulas" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FormulaStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_versions" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "FormulaStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formula_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_ingredients" (
    "id" TEXT NOT NULL,
    "formulaVersionId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "percentage" DECIMAL(7,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rawMaterialLotId" TEXT,

    CONSTRAINT "formula_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formulas_code_key" ON "formulas"("code");

-- CreateIndex
CREATE INDEX "formulas_productId_idx" ON "formulas"("productId");

-- CreateIndex
CREATE INDEX "formulas_status_idx" ON "formulas"("status");

-- CreateIndex
CREATE INDEX "formula_versions_formulaId_idx" ON "formula_versions"("formulaId");

-- CreateIndex
CREATE INDEX "formula_versions_status_idx" ON "formula_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "formula_versions_formulaId_version_key" ON "formula_versions"("formulaId", "version");

-- CreateIndex
CREATE INDEX "formula_ingredients_formulaVersionId_idx" ON "formula_ingredients"("formulaVersionId");

-- CreateIndex
CREATE INDEX "formula_ingredients_rawMaterialId_idx" ON "formula_ingredients"("rawMaterialId");

-- AddForeignKey
ALTER TABLE "formulas" ADD CONSTRAINT "formulas_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_versions" ADD CONSTRAINT "formula_versions_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "formulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_ingredients" ADD CONSTRAINT "formula_ingredients_formulaVersionId_fkey" FOREIGN KEY ("formulaVersionId") REFERENCES "formula_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_ingredients" ADD CONSTRAINT "formula_ingredients_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_ingredients" ADD CONSTRAINT "formula_ingredients_rawMaterialLotId_fkey" FOREIGN KEY ("rawMaterialLotId") REFERENCES "raw_material_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
