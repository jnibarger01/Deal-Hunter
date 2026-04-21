-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('active', 'sold', 'expired');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "condition" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "region" TEXT,
    "url" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSample" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "observedPrice" DECIMAL(65,30) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'sold',
    "condition" TEXT,
    "listedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "daysToSell" INTEGER,
    "location" TEXT,
    "region" TEXT,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TMVResult" (
    "dealId" TEXT NOT NULL,
    "tmv" DECIMAL(65,30) NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "volatility" DECIMAL(65,30) NOT NULL,
    "liquidityScore" DECIMAL(65,30) NOT NULL,
    "estimatedDaysToSell" INTEGER,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TMVResult_pkey" PRIMARY KEY ("dealId")
);

-- CreateTable
CREATE TABLE "Score" (
    "dealId" TEXT NOT NULL,
    "profitMargin" DECIMAL(65,30) NOT NULL,
    "velocityScore" DECIMAL(65,30) NOT NULL,
    "riskScore" DECIMAL(65,30) NOT NULL,
    "compositeRank" DECIMAL(65,30) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("dealId")
);

-- CreateTable
CREATE TABLE "MarketplaceSync" (
    "marketplace" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSync_pkey" PRIMARY KEY ("marketplace")
);

-- CreateTable
CREATE TABLE "CategoryConfig" (
    "category" TEXT NOT NULL,
    "decayRate" DECIMAL(65,30) NOT NULL,
    "minSamples" INTEGER NOT NULL DEFAULT 8,
    "freshnessWindow" INTEGER NOT NULL DEFAULT 180,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryConfig_pkey" PRIMARY KEY ("category")
);

-- CreateIndex
CREATE INDEX "Deal_status_createdAt_idx" ON "Deal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Deal_category_createdAt_idx" ON "Deal"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Deal_region_idx" ON "Deal"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_source_sourceId_key" ON "Deal"("source", "sourceId");

-- CreateIndex
CREATE INDEX "MarketSample_dealId_observedAt_idx" ON "MarketSample"("dealId", "observedAt");

-- CreateIndex
CREATE INDEX "MarketSample_source_observedAt_idx" ON "MarketSample"("source", "observedAt");

-- CreateIndex
CREATE INDEX "MarketSample_status_observedAt_idx" ON "MarketSample"("status", "observedAt");

-- CreateIndex
CREATE INDEX "TMVResult_calculatedAt_idx" ON "TMVResult"("calculatedAt");

-- CreateIndex
CREATE INDEX "Score_compositeRank_idx" ON "Score"("compositeRank");

-- CreateIndex
CREATE INDEX "Score_calculatedAt_idx" ON "Score"("calculatedAt");

-- AddForeignKey
ALTER TABLE "MarketSample" ADD CONSTRAINT "MarketSample_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TMVResult" ADD CONSTRAINT "TMVResult_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
