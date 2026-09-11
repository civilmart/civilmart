-- CreateEnum
CREATE TYPE "ProductionBatchStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "formulaId" TEXT NOT NULL,
    "formulaVersionId" TEXT NOT NULL,
    "plannedQuantity" DECIMAL(14,4) NOT NULL,
    "producedQuantity" DECIMAL(14,4),
    "status" "ProductionBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_consumptions" (
    "id" TEXT NOT NULL,
    "productionBatchId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_batchNumber_key" ON "production_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "production_batches_productId_idx" ON "production_batches"("productId");

-- CreateIndex
CREATE INDEX "production_batches_formulaId_idx" ON "production_batches"("formulaId");

-- CreateIndex
CREATE INDEX "production_batches_formulaVersionId_idx" ON "production_batches"("formulaVersionId");

-- CreateIndex
CREATE INDEX "production_batches_status_idx" ON "production_batches"("status");

-- CreateIndex
CREATE INDEX "production_batches_createdAt_idx" ON "production_batches"("createdAt");

-- CreateIndex
CREATE INDEX "material_consumptions_productionBatchId_idx" ON "material_consumptions"("productionBatchId");

-- CreateIndex
CREATE INDEX "material_consumptions_rawMaterialId_idx" ON "material_consumptions"("rawMaterialId");

-- CreateIndex
CREATE INDEX "material_consumptions_lotId_idx" ON "material_consumptions"("lotId");

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "formulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_formulaVersionId_fkey" FOREIGN KEY ("formulaVersionId") REFERENCES "formula_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "raw_material_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
