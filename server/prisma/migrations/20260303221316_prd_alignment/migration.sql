/*
  Warnings:

  - You are about to drop the column `dealScore` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedProfit` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `marketValue` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `roi` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `demandScore` on the `Score` table. All the data in the column will be lost.
  - You are about to drop the column `hotDeal` on the `Score` table. All the data in the column will be lost.
  - You are about to drop the column `regionalIndex` on the `TMVResult` table. All the data in the column will be lost.
  - You are about to drop the column `seasonalityIndex` on the `TMVResult` table. All the data in the column will be lost.
  - You are about to drop the column `tmvNormalized` on the `TMVResult` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
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
INSERT INTO "new_Deal" ("category", "condition", "createdAt", "daysListed", "description", "id", "inquiries", "itemUrl", "location", "marketplace", "marketplaceId", "price", "region", "saves", "source", "sourceId", "status", "title", "updatedAt", "url", "views", "zipPrefix") SELECT "category", "condition", "createdAt", "daysListed", "description", "id", "inquiries", "itemUrl", "location", "marketplace", "marketplaceId", "price", "region", "saves", "source", "sourceId", "status", "title", "updatedAt", "url", "views", "zipPrefix" FROM "Deal";
DROP TABLE "Deal";
ALTER TABLE "new_Deal" RENAME TO "Deal";
CREATE UNIQUE INDEX "Deal_marketplaceId_key" ON "Deal"("marketplaceId");
CREATE INDEX "Deal_category_createdAt_idx" ON "Deal"("category", "createdAt");
CREATE INDEX "Deal_region_idx" ON "Deal"("region");
CREATE INDEX "Deal_status_idx" ON "Deal"("status");
CREATE UNIQUE INDEX "Deal_source_sourceId_key" ON "Deal"("source", "sourceId");
CREATE TABLE "new_Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "profitMargin" DECIMAL NOT NULL,
    "velocityScore" DECIMAL NOT NULL,
    "riskScore" DECIMAL NOT NULL,
    "compositeRank" DECIMAL NOT NULL,
    "feesApplied" DECIMAL NOT NULL DEFAULT 0,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Score" ("calculatedAt", "compositeRank", "dealId", "id", "profitMargin", "riskScore", "velocityScore") SELECT "calculatedAt", "compositeRank", "dealId", "id", "profitMargin", "riskScore", "velocityScore" FROM "Score";
DROP TABLE "Score";
ALTER TABLE "new_Score" RENAME TO "Score";
CREATE UNIQUE INDEX "Score_dealId_key" ON "Score"("dealId");
CREATE TABLE "new_TMVResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "tmv" DECIMAL NOT NULL,
    "confidence" DECIMAL NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "volatility" DECIMAL NOT NULL,
    "liquidityScore" DECIMAL NOT NULL,
    "estimatedDaysToSell" INTEGER,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TMVResult_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TMVResult" ("calculatedAt", "confidence", "dealId", "estimatedDaysToSell", "id", "liquidityScore", "sampleCount", "tmv", "volatility") SELECT "calculatedAt", "confidence", "dealId", "estimatedDaysToSell", "id", "liquidityScore", "sampleCount", "tmv", "volatility" FROM "TMVResult";
DROP TABLE "TMVResult";
ALTER TABLE "new_TMVResult" RENAME TO "TMVResult";
CREATE UNIQUE INDEX "TMVResult_dealId_key" ON "TMVResult"("dealId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
