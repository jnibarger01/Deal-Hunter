-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "marketValue" DECIMAL,
    "estimatedProfit" DECIMAL,
    "dealScore" DECIMAL,
    "roi" DECIMAL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "observedPrice" DECIMAL NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "condition" TEXT,
    "status" TEXT,
    "finalPrice" DECIMAL,
    "listedAt" DATETIME,
    "soldAt" DATETIME,
    "daysToSell" INTEGER,
    "location" TEXT,
    "zipPrefix" TEXT,
    "region" TEXT,
    "title" TEXT,
    "description" TEXT,
    "features" TEXT,
    "views" INTEGER,
    "saves" INTEGER,
    "inquiries" INTEGER,
    CONSTRAINT "MarketSample_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TMVResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "tmv" DECIMAL NOT NULL,
    "tmvNormalized" DECIMAL,
    "confidence" DECIMAL NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "volatility" DECIMAL NOT NULL,
    "liquidityScore" DECIMAL NOT NULL,
    "estimatedDaysToSell" INTEGER,
    "seasonalityIndex" DECIMAL,
    "regionalIndex" DECIMAL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TMVResult_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "profitMargin" DECIMAL NOT NULL,
    "velocityScore" DECIMAL NOT NULL,
    "riskScore" DECIMAL NOT NULL,
    "compositeRank" DECIMAL NOT NULL,
    "demandScore" DECIMAL,
    "hotDeal" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchlistItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketplace" TEXT NOT NULL,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CategoryConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "decayRate" DECIMAL NOT NULL,
    "minSamples" INTEGER NOT NULL DEFAULT 8,
    "freshnessWindow" INTEGER NOT NULL DEFAULT 180
);

-- CreateTable
CREATE TABLE "RegionalIndex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "multiplier" DECIMAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeasonalityIndex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "multiplier" DECIMAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_marketplaceId_key" ON "Deal"("marketplaceId");

-- CreateIndex
CREATE INDEX "Deal_category_createdAt_idx" ON "Deal"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Deal_region_idx" ON "Deal"("region");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_source_sourceId_key" ON "Deal"("source", "sourceId");

-- CreateIndex
CREATE INDEX "MarketSample_dealId_observedAt_idx" ON "MarketSample"("dealId", "observedAt");

-- CreateIndex
CREATE INDEX "MarketSample_region_observedAt_idx" ON "MarketSample"("region", "observedAt");

-- CreateIndex
CREATE INDEX "MarketSample_status_idx" ON "MarketSample"("status");

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
