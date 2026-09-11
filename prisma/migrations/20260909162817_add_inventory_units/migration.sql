/*
  Warnings:

  - Added the required column `unit` to the `inventory_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `raw_material_lots` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('G', 'KG', 'ML', 'L', 'PIECE');

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "unit" "InventoryUnit" NOT NULL;

-- AlterTable
ALTER TABLE "raw_material_lots" ADD COLUMN     "unit" "InventoryUnit" NOT NULL;
