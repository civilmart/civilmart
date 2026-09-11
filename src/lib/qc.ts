import { prisma } from "@/lib/prisma";

// ============================================================
// QC CHECK DEFINITIONS
//
// The five physical checks (Maturation, Stability, Clarity,
// Colour, Odour) are all shaped the same way: result + value +
// notes + checkedBy + checkedAt. This map lets the API route
// handle all five generically instead of five copy-pasted
// branches, while the Prisma schema keeps them as plain typed
// columns (simpler queries/reports than a child table).
// ============================================================

export const QC_CHECK_KEYS = [
  "maturation",
  "stability",
  "clarity",
  "colour",
  "odour",
] as const;

export type QCCheckKey = (typeof QC_CHECK_KEYS)[number];

export function isQCCheckKey(value: string): value is QCCheckKey {
  return (QC_CHECK_KEYS as readonly string[]).includes(value);
}

export const QC_CHECK_LABELS: Record<QCCheckKey, string> = {
  maturation: "Maturation",
  stability: "Stability",
  clarity: "Clarity",
  colour: "Colour",
  odour: "Odour",
};

type QCCheckResultValue = "PENDING" | "PASS" | "FAIL";

// A loosely-typed row is fine here: this file is written against
// the Prisma schema fields directly (maturationResult, etc.) and
// keeping the type as `any` at the boundary avoids depending on
// the generated client output path from a library module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QCRecord = any;

export function getCheckField(
  record: QCRecord,
  key: QCCheckKey
) {
  return {
    result: record[`${key}Result`] as QCCheckResultValue,
    value: record[`${key}Value`] as string | null,
    notes: record[`${key}Notes`] as string | null,
    checkedBy: record[`${key}CheckedBy`] as string | null,
    checkedAt: record[`${key}CheckedAt`] as Date | null,
  };
}

/**
 * Ensures a batch has a QualityControl record, creating one with
 * every check PENDING if it doesn't exist yet. Safe to call more
 * than once — it's a get-or-create, never overwrites an existing
 * record. This is what the batch status-update route calls the
 * moment a batch becomes COMPLETED, and it's also called
 * defensively by the QC read routes so older batches that predate
 * this feature still get a record on first view.
 */
export async function getOrCreateQualityControl(
  productionBatchId: string
) {
  const existing = await prisma.qualityControl.findUnique({
    where: { productionBatchId },
  });

  if (existing) {
    return existing;
  }

  return prisma.qualityControl.create({
    data: { productionBatchId },
  });
}

/**
 * Whether every physical check plus the regulatory review has
 * passed. This is the gate for moving the overall decision to
 * APPROVED.
 */
export function isReadyForApproval(record: QCRecord): boolean {
  const allChecksPass = QC_CHECK_KEYS.every(
    (key) => getCheckField(record, key).result === "PASS"
  );

  return allChecksPass && record.regulatoryReviewResult === "PASS";
}

export function getOutstandingItems(record: QCRecord): string[] {
  const outstanding: string[] = [];

  for (const key of QC_CHECK_KEYS) {
    const { result } = getCheckField(record, key);

    if (result !== "PASS") {
      outstanding.push(
        `${QC_CHECK_LABELS[key]} is ${result === "FAIL" ? "failed" : "not completed"}.`
      );
    }
  }

  if (record.regulatoryReviewResult !== "PASS") {
    outstanding.push(
      `Regulatory review is ${
        record.regulatoryReviewResult === "FAIL" ? "failed" : "not completed"
      }.`
    );
  }

  return outstanding;
}
