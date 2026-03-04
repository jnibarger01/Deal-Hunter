-- CreateTable
CREATE TABLE "TMVScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "source" TEXT,
    "buyPrice" DECIMAL(65,30) NOT NULL,
    "expectedSalePrice" DECIMAL(65,30) NOT NULL,
    "shippingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "platformFeePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "prepCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TMVScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TMVScenario_category_idx" ON "TMVScenario"("category");

-- CreateIndex
CREATE INDEX "TMVScenario_source_idx" ON "TMVScenario"("source");

-- CreateIndex
CREATE INDEX "TMVScenario_createdAt_idx" ON "TMVScenario"("createdAt");
