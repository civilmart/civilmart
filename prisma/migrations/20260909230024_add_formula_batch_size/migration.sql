ALTER TABLE "formula_versions"
ADD COLUMN "batchSize" DECIMAL(14,4) NOT NULL DEFAULT 1000;

ALTER TABLE "formula_versions"
ADD COLUMN "batchUnit" "InventoryUnit" NOT NULL DEFAULT 'ML';

ALTER TABLE "formula_versions"
ALTER COLUMN "batchSize" DROP DEFAULT;

ALTER TABLE "formula_versions"
ALTER COLUMN "batchUnit" DROP DEFAULT;