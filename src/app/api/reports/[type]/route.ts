import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REPORT_TYPES = [
  "purchases",
  "vendors",
  "materials",
  "inventory",
  "formulas",
  "production",
  "qc",
] as const;

type ReportType = (typeof REPORT_TYPES)[number];

const isIncoming = (type: string) =>
  ["PURCHASE", "RETURN", "TRANSFER_IN", "OPENING_BALANCE", "ADJUSTMENT_IN", "CORRECTION"].includes(type);

async function getPurchasesReport() {
  const purchases = await prisma.purchase.findMany({
    include: {
      supplier: { select: { name: true } },
      items: { select: { id: true } },
    },
    orderBy: { purchaseDate: "desc" },
  });

  const totalSpend = purchases.reduce(
    (sum, p) => sum + Number(p.totalAmount),
    0
  );

  return {
    columns: ["Purchase No", "Date", "Supplier", "Items", "Subtotal", "Tax", "Total", "Status"],
    rows: purchases.map((p) => [
      p.purchaseNo,
      p.purchaseDate.toISOString().split("T")[0],
      p.supplier?.name ?? "",
      String(p.items.length),
      Number(p.subtotal).toFixed(2),
      Number(p.tax).toFixed(2),
      Number(p.totalAmount).toFixed(2),
      p.status,
    ]),
    summary: { count: purchases.length, totalSpend },
  };
}

async function getVendorsReport() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchases: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true, totalAmount: true, purchaseDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    columns: ["Supplier", "Contact", "County", "Orders", "Total Spend", "Avg Order Value", "Last Order Date"],
    rows: suppliers.map((supplier) => {
      const orders = supplier.purchases;
      const totalSpend = orders.reduce((sum, p) => sum + Number(p.totalAmount), 0);
      const lastOrder = orders.length > 0
        ? orders.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())[0]
        : null;

      return [
        supplier.name,
        supplier.contactName ?? "",
        supplier.address ?? "",
        String(orders.length),
        totalSpend.toFixed(2),
        orders.length > 0 ? (totalSpend / orders.length).toFixed(2) : "0.00",
        lastOrder ? lastOrder.purchaseDate.toISOString().split("T")[0] : "",
      ];
    }),
    summary: { count: suppliers.length },
  };
}

async function getMaterialsReport() {
  const materials = await prisma.rawMaterial.findMany({
    include: {
      inventoryTransactions: {
        select: { transactionType: true, quantity: true, unit: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = materials.map((material) => {
    let currentStock = 0;
    let purchased = 0;
    let consumed = 0;

    for (const tx of material.inventoryTransactions) {
      const qty = Number(tx.quantity);
      if (isIncoming(tx.transactionType)) {
        currentStock += qty;
        if (tx.transactionType === "PURCHASE") purchased += qty;
      } else {
        currentStock -= qty;
        if (tx.transactionType === "CONSUMPTION") consumed += qty;
      }
    }

    let status = "IN_STOCK";
    if (currentStock <= 0) status = "OUT_OF_STOCK";
    else if (material.reorderLevel !== null && currentStock <= Number(material.reorderLevel)) status = "LOW_STOCK";

    return [
      material.code,
      material.name,
      material.materialType.replaceAll("_", " "),
      currentStock.toFixed(2),
      purchased.toFixed(2),
      consumed.toFixed(2),
      material.reorderLevel !== null ? Number(material.reorderLevel).toFixed(2) : "",
      material.isActive ? "Active" : "Inactive",
      status,
    ];
  });

  return {
    columns: ["Code", "Name", "Type", "Current Stock", "Purchased", "Consumed", "Reorder Level", "Status", "Stock Status"],
    rows,
    summary: { count: materials.length },
  };
}

async function getInventoryReport() {
  const materials = await prisma.rawMaterial.findMany({
    where: { isActive: true },
    include: {
      inventoryTransactions: {
        select: { transactionType: true, quantity: true },
      },
      lots: {
        select: { costPerUnit: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const purchaseItems = await prisma.purchaseItem.findMany({
    select: {
      rawMaterialId: true,
      costPerUnit: true,
      quantity: true,
    },
  });

  const avgCostByMaterial = new Map<string, number>();
  for (const item of purchaseItems) {
    const qty = Number(item.quantity);
    const cost = Number(item.costPerUnit);
    if (qty <= 0) continue;
    const current = avgCostByMaterial.get(item.rawMaterialId) ?? { totalCost: 0, totalQty: 0 };
    current.totalCost += cost * qty;
    current.totalQty += qty;
    avgCostByMaterial.set(item.rawMaterialId, current);
  }

  let totalValue = 0;

  const rows = materials.map((material) => {
    let currentStock = 0;
    for (const tx of material.inventoryTransactions) {
      const qty = Number(tx.quantity);
      if (isIncoming(tx.transactionType)) currentStock += qty;
      else currentStock -= qty;
    }

    const lotCosts = material.lots
      .map((lot) => (lot.costPerUnit !== null ? Number(lot.costPerUnit) : null))
      .filter((c): c is number => c !== null);

    const lotAvg = lotCosts.length > 0
      ? lotCosts.reduce((a, b) => a + b, 0) / lotCosts.length
      : null;

    const avgCost = lotAvg ?? (() => {
      const data = avgCostByMaterial.get(material.id);
      return data && data.totalQty > 0 ? data.totalCost / data.totalQty : 0;
    })();

    const value = currentStock * avgCost;
    totalValue += value;

    return [
      material.code,
      material.name,
      material.materialType.replaceAll("_", " "),
      currentStock.toFixed(2),
      String(material.unitType),
      avgCost.toFixed(4),
      value.toFixed(2),
    ];
  });

  return {
    columns: ["Code", "Material", "Type", "Current Stock", "Unit Type", "Avg Cost/Unit", "Stock Value"],
    rows,
    summary: { count: materials.length, totalValue },
  };
}

async function getFormulasReport() {
  const formulas = await prisma.formula.findMany({
    include: {
      versions: {
        include: {
          _count: { select: { ingredients: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = formulas.map((formula) => {
    const activeVersion =
      formula.versions.find((v) => v.status === "ACTIVE") ??
      formula.versions[formula.versions.length - 1];
    return [
      formula.name,
      formula.code,
      formula.description ?? "",
      formula.status,
      String(formula.versions.length),
      activeVersion ? String(activeVersion.version) : "",
      activeVersion ? String(activeVersion._count.ingredients) : "",
    ];
  });

  return {
    columns: ["Name", "Code", "Description", "Status", "Versions", "Active Version", "Ingredients"],
    rows,
    summary: { count: formulas.length },
  };
}

async function getProductionReport() {
  const batches = await prisma.productionBatch.findMany({
    include: {
      product: { select: { name: true } },
      formula: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = batches.map((batch) => [
    batch.batchNumber,
    batch.product.name,
    batch.formula.name,
    batch.status,
    Number(batch.plannedQuantity).toFixed(2),
    batch.producedQuantity !== null ? Number(batch.producedQuantity).toFixed(2) : "",
    batch.startedAt ? batch.startedAt.toISOString().split("T")[0] : "",
    batch.completedAt ? batch.completedAt.toISOString().split("T")[0] : "",
    batch.releasedAt ? batch.releasedAt.toISOString().split("T")[0] : "",
  ]);

  return {
    columns: ["Batch No", "Product", "Formula", "Status", "Planned Qty", "Produced Qty", "Started", "Completed", "Released"],
    rows,
    summary: { count: batches.length },
  };
}

async function getQcReport() {
  const records = await prisma.qualityControl.findMany({
    include: {
      productionBatch: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = records.map((record) => [
    record.productionBatch.batchNumber,
    record.productionBatch.product.name,
    record.decision,
    record.maturationResult,
    record.stabilityResult,
    record.clarityResult,
    record.colourResult,
    record.odourResult,
    record.regulatoryReviewResult,
    record.decidedAt ? record.decidedAt.toISOString().split("T")[0] : "",
  ]);

  const approved = records.filter((r) => r.decision === "APPROVED").length;
  const rejected = records.filter((r) => r.decision === "REJECTED").length;
  const pending = records.filter((r) => r.decision === "PENDING").length;

  return {
    columns: ["Batch", "Product", "Decision", "Maturation", "Stability", "Clarity", "Colour", "Odour", "Regulatory", "Decided"],
    rows,
    summary: { count: records.length, approved, rejected, pending },
  };
}

const handlers: Record<ReportType, () => Promise<unknown>> = {
  purchases: getPurchasesReport,
  vendors: getVendorsReport,
  materials: getMaterialsReport,
  inventory: getInventoryReport,
  formulas: getFormulasReport,
  production: getProductionReport,
  qc: getQcReport,
};

export async function GET(_request: NextRequest, context: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await context.params;

    if (!REPORT_TYPES.includes(type as ReportType)) {
      return NextResponse.json(
        { success: false, error: "Unknown report type" },
        { status: 404 }
      );
    }

    const data = await handlers[type as ReportType]();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to generate report:", error);

    return NextResponse.json(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}