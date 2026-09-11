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

// ============================================================
// AUTOMATIC MATERIAL CONSUMPTION
//
// This is the single place that decides which raw-material lots
// get consumed for a batch. It always picks lots automatically
// (oldest expiry first, then oldest received first — FEFO), so
// nobody ever needs to pick a lot or a quantity by hand.
//
// It is called from the batch status-update route whenever a
// batch moves into IN_PROGRESS. It is intentionally safe to call
// more than once for the same batch: if everything the formula
// needs has already been consumed, it just reports that and does
// nothing further.
// ============================================================

export type ConsumptionShortage = {
  rawMaterialId: string;
  rawMaterialName: string;
  required: number;
  unit: string;
  available: number;
};

export type ConsumedItem = {
  rawMaterialId: string;
  rawMaterialName: string;
  ingredientUnit: InventoryUnit;
  quantity: number;
  lotId: string;
  lotNumber: string;
  lotUnit: InventoryUnit;
};

export type ConsumeBatchMaterialsResult =
  | { status: "consumed"; consumed: ConsumedItem[] }
  | { status: "shortage"; shortages: ConsumptionShortage[] }
  | { status: "already_consumed" };

export async function consumeBatchMaterials(
  batchId: string
): Promise<ConsumeBatchMaterialsResult> {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error("Production batch not found.");
  }

  const requirements = await calculateBatchRequirements(batchId);

  const shortages: ConsumptionShortage[] = [];
  const consumptionPlan: ConsumedItem[] = [];

  for (const requirement of requirements.requirements) {
    if (requirement.remainingQuantity <= 0.000001) {
      continue;
    }

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: {
        id: requirement.rawMaterialId,
      },
    });

    if (!rawMaterial) {
      throw new Error(
        `Raw material ${requirement.rawMaterialName} no longer exists.`
      );
    }

    const lots = await prisma.rawMaterialLot.findMany({
      where: {
        rawMaterialId: requirement.rawMaterialId,
      },
      orderBy: [
        { expiryDate: "asc" },
        { receivedAt: "asc" },
      ],
    });

    let remaining = requirement.remainingQuantity;
    let totalAvailable = 0;

    for (const lot of lots) {
      const availableInLot = await getLotAvailableQuantity(lot.id);

      if (availableInLot <= 0) {
        continue;
      }

      let availableInIngredientUnit: number;

      try {
        availableInIngredientUnit = convertQuantity(
          availableInLot,
          lot.unit as InventoryUnit,
          requirement.requiredUnit
        );
      } catch {
        continue;
      }

      totalAvailable += availableInIngredientUnit;

      if (remaining <= 0.000001) {
        break;
      }

      const consumeInIngredientUnit = Math.min(
        remaining,
        availableInIngredientUnit
      );

      const consumeInLotUnit = convertQuantity(
        consumeInIngredientUnit,
        requirement.requiredUnit,
        lot.unit as InventoryUnit
      );

      consumptionPlan.push({
        rawMaterialId: requirement.rawMaterialId,
        rawMaterialName: requirement.rawMaterialName,
        ingredientUnit: requirement.requiredUnit,
        quantity: consumeInLotUnit,
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        lotUnit: lot.unit as InventoryUnit,
      });

      remaining -= consumeInIngredientUnit;
    }

    if (remaining > 0.000001) {
      shortages.push({
        rawMaterialId: requirement.rawMaterialId,
        rawMaterialName: requirement.rawMaterialName,
        required: requirement.remainingQuantity,
        unit: requirement.requiredUnit,
        available: totalAvailable,
      });
    }
  }

  if (shortages.length > 0) {
    return { status: "shortage", shortages };
  }

  if (consumptionPlan.length === 0) {
    return { status: "already_consumed" };
  }

  await prisma.$transaction(
    async (tx) => {
      for (const item of consumptionPlan) {
        const unitType =
          item.lotUnit === "G" || item.lotUnit === "KG"
            ? "WEIGHT"
            : item.lotUnit === "ML" || item.lotUnit === "L"
              ? "VOLUME"
              : "PIECE";

        await tx.materialConsumption.create({
          data: {
            productionBatchId: batchId,
            rawMaterialId: item.rawMaterialId,
            lotId: item.lotId,
            quantity: item.quantity,
            unitType,
            unit: item.lotUnit,
            notes: `Automatic formula consumption from lot ${item.lotNumber}`,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            rawMaterialId: item.rawMaterialId,
            lotId: item.lotId,
            transactionType: "CONSUMPTION",
            quantity: item.quantity,
            unitType,
            unit: item.lotUnit,
            referenceType: "PRODUCTION_BATCH",
            referenceId: batchId,
            notes: `Automatic production consumption for batch ${batch.batchNumber}`,
          },
        });
      }
    },
    {
      maxWait: 30000,
      timeout: 30000,
    }
  );

  return { status: "consumed", consumed: consumptionPlan };
}