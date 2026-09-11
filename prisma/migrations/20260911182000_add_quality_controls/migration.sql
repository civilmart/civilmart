-- CreateEnum
CREATE TYPE "QCCheckResult" AS ENUM ('PENDING', 'PASS', 'FAIL', 'N_A');

-- CreateEnum
CREATE TYPE "QCDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "quality_controls" (
    "id" TEXT NOT NULL,
    "productionBatchId" TEXT NOT NULL,
    "maturationResult" "QCCheckResult" NOT NULL DEFAULT 'PENDING',
    "maturationValue" TEXT,
    "maturationNotes" TEXT,
    "maturationCheckedBy" TEXT,
    "maturationCheckedAt" TIMESTAMPTZ,
    "stabilityResult" "QCCheckResult" NOT NULL DEFAULT 'PENDING',
    "stabilityValue" TEXT,
    "stabilityNotes" TEXT,
    "stabilityCheckedBy" TEXT,
    "stabilityCheckedAt" TIMESTAMPTZ,
    "clarityResult" "QCCheckResult" NOT NULL DEFAULT 'PENDING',
    "clarityValue" TEXT,
    "clarityNotes" TEXT,
    "clarityCheckedBy" TEXT,
    "clarityCheckedAt" TIMESTAMPTZ,
    "colourResult" "QCCheckResult" NOT NULL DEFAULT 'PENDING',
    "colourValue" TEXT,
    "colourNotes" TEXT,
    "colourCheckedBy" TEXT,
    "colourCheckedAt" TIMESTAMPTZ,
    "odourResult" "QCCheckResult" NOT NULL DEFAULT 'PENDING',
    "odourValue" TEXT,
    "odourNotes" TEXT,
    "odourCheckedBy" TEXT,
    "odourCheckedAt" TIMESTAMPTZ,
    "regulatoryReviewResult" "QCCheckResult" NOT NULL DEFAULT 'PENDING',
    "regulatoryReviewNotes" TEXT,
    "regulatoryReviewedBy" TEXT,
    "regulatoryReviewedAt" TIMESTAMPTZ,
    "decision" "QCDecision" NOT NULL DEFAULT 'PENDING',
    "decisionNotes" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMPTZ,
    "releasedBy" TEXT,
    "releasedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_controls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quality_controls_productionBatchId_key" ON "quality_controls"("productionBatchId");

-- CreateIndex
CREATE INDEX "quality_controls_decision_idx" ON "quality_controls"("decision");

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
