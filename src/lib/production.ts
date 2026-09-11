import { prisma } from "@/lib/prisma";

export type InventoryUnit = "G" | "KG" | "ML" | "L" | "PIECE";

export function getUnitFamily(unit: InventoryUnit) {
  if (unit === "G" || unit === "KG") return "WEIGHT";
  if (unit === "ML" || unit === "L") return "VOLUME";
  return "PIECE";
}

export function toBaseQuantity(
  quantity: number,
  unit: InventoryUnit
): number {
  switch (unit) {
    case "KG":
      return quantity * 1000;
    case "L":
      return quantity * 1000;
    case "G":
    case "ML":
    case "PIECE":
      return quantity;
  }
}

export function fromBaseQuantity(
  quantity: number,
  unit: InventoryUnit
): number {
  switch (unit) {
    case "KG":
      return quantity / 1000;
    case "L":
      return quantity / 1000;
    case "G":
    case "ML":
    case "PIECE":
      return quantity;
  }
}

export function convertQuantity(
  quantity: number,
  fromUnit: InventoryUnit,
  toUnit: InventoryUnit
): number {
  if (fromUnit === toUnit) return quantity;

  if (getUnitFamily(fromUnit) !== getUnitFamily(toUnit)) {
    throw new Error(
      `Cannot convert ${fromUnit} to ${toUnit}. Units belong to different measurement families.`
    );
  }

  return fromBaseQuantity(
    toBaseQuantity(quantity, fromUnit),
    toUnit
  );
}

export async function getLotAvailableQuantity(
  lotId: string
): Promise<number> {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      lotId,
    },
  });

  let balance = 0;

  for (const transaction of transactions) {
    const quantity = Number(transaction.quantity);

    switch (transaction.transactionType) {
      case "PURCHASE":
      case "RETURN":
      case "TRANSFER_IN":
      case "OPENING_BALANCE":
      case "ADJUSTMENT_IN":
      case "CORRECTION":
        balance += quantity;
        break;

      case "CONSUMPTION":
      case "TRANSFER_OUT":
      case "ADJUSTMENT_OUT":
        balance -= quantity;
        break;
    }
  }

  return Math.max(balance, 0);
}

export async function calculateBatchRequirements(batchId: string) {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: {
      formulaVersion: {
        include: {
          ingredients: {
            include: {
              rawMaterial: true,
            },
          },
        },
      },
      materialConsumptions: true,
    },
  });

  if (!batch) {
    throw new Error("Production batch not found.");
  }

  const formulaBatchSize = Number(batch.formulaVersion.batchSize);
  const formulaBatchUnit =
    batch.formulaVersion.batchUnit as InventoryUnit;

  const plannedQuantity = Number(batch.plannedQuantity);

  const requirements = batch.formulaVersion.ingredients.map(
    (ingredient) => {
      const ingredientUnit = ingredient.unit as InventoryUnit;

      let productionQuantityInFormulaUnit: number;

      try {
        productionQuantityInFormulaUnit = convertQuantity(
          plannedQuantity,
          formulaBatchUnit,
          formulaBatchUnit
        );
      } catch {
        productionQuantityInFormulaUnit = plannedQuantity;
      }

      const requiredQuantity =
        (Number(ingredient.quantity) /
          formulaBatchSize) *
        productionQuantityInFormulaUnit;

      const consumedQuantity = batch.materialConsumptions
        .filter(
          (consumption) =>
            consumption.rawMaterialId === ingredient.rawMaterialId
        )
        .reduce((total, consumption) => {
          try {
            return (
              total +
              convertQuantity(
                Number(consumption.quantity),
                consumption.unit as InventoryUnit,
                ingredientUnit
              )
            );
          } catch {
            return total;
          }
        }, 0);

      return {
        rawMaterialId: ingredient.rawMaterialId,
        rawMaterialName: ingredient.rawMaterial.name,
        formulaQuantity: Number(ingredient.quantity),
        formulaUnit: ingredientUnit,
        requiredQuantity,
        requiredUnit: ingredientUnit,
        consumedQuantity,
        remainingQuantity: Math.max(
          requiredQuantity - consumedQuantity,
          0
        ),
      };
    }
  );

  return {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    plannedQuantity,
    plannedUnit: formulaBatchUnit,
    formulaBatchSize,
    formulaBatchUnit,
    requirements,
  };
}