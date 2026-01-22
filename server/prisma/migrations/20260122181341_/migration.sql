-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('active', 'sold', 'expired');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "marketValue" DECIMAL(65,30),
    "estimatedProfit" DECIMAL(65,30),
    "dealScore" DECIMAL(65,30),
    "roi" DECIMAL(65,30),
    "condition" TEXT,
    "category" TEXT NOT NULL,
    "marketplace" TEXT,
    "marketplaceId" TEXT,
    "itemUrl" TEXT,
    "location" TEXT,
    "zipPrefix" TEXT,
    "region" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "views" INTEGER,
    "saves" INTEGER,
    "inquiries" INTEGER,
    "daysListed" INTEGER,
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
    "condition" TEXT,
    "status" "ListingStatus",
    "finalPrice" DECIMAL(65,30),
    "listedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "daysToSell" INTEGER,
    "location" TEXT,
    "zipPrefix" TEXT,
    "region" TEXT,
    "title" TEXT,
    "description" TEXT,
    "features" JSONB,
    "views" INTEGER,
    "saves" INTEGER,
    "inquiries" INTEGER,

    CONSTRAINT "MarketSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TMVResult" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "tmv" DECIMAL(65,30) NOT NULL,
    "tmvNormalized" DECIMAL(65,30),
    "confidence" DECIMAL(65,30) NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "volatility" DECIMAL(65,30) NOT NULL,
    "liquidityScore" DECIMAL(65,30) NOT NULL,
    "estimatedDaysToSell" INTEGER,
    "seasonalityIndex" DECIMAL(65,30),
    "regionalIndex" DECIMAL(65,30),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TMVResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "profitMargin" DECIMAL(65,30) NOT NULL,
    "velocityScore" DECIMAL(65,30) NOT NULL,
    "riskScore" DECIMAL(65,30) NOT NULL,
    "compositeRank" DECIMAL(65,30) NOT NULL,
    "demandScore" DECIMAL(65,30),
    "hotDeal" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceSync" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryConfig" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "decayRate" DECIMAL(65,30) NOT NULL,
    "minSamples" INTEGER NOT NULL DEFAULT 8,
    "freshnessWindow" INTEGER NOT NULL DEFAULT 180,

    CONSTRAINT "CategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalIndex" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "multiplier" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionalIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalityIndex" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "multiplier" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonalityIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_marketplaceId_key" ON "Deal"("marketplaceId");

-- CreateIndex
CREATE INDEX "Deal_category_createdAt_idx" ON "Deal"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_source_sourceId_key" ON "Deal"("source", "sourceId");

-- CreateIndex
CREATE INDEX "MarketSample_dealId_observedAt_idx" ON "MarketSample"("dealId", "observedAt");

-- CreateIndex
CREATE INDEX "MarketSample_region_observedAt_idx" ON "MarketSample"("region", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TMVResult_dealId_key" ON "TMVResult"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_dealId_key" ON "Score"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_dealId_idx" ON "WatchlistItem"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_dealId_key" ON "WatchlistItem"("userId", "dealId");

-- CreateIndex
CREATE INDEX "PortfolioItem_userId_idx" ON "PortfolioItem"("userId");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryConfig_category_key" ON "CategoryConfig"("category");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalIndex_region_key" ON "RegionalIndex"("region");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonalityIndex_category_month_key" ON "SeasonalityIndex"("category", "month");

-- AddForeignKey
ALTER TABLE "MarketSample" ADD CONSTRAINT "MarketSample_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TMVResult" ADD CONSTRAINT "TMVResult_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
