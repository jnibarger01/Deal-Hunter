-- CreateTable
CREATE TABLE "IngestSource" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestSource_kind_idx" ON "IngestSource"("kind");

-- CreateIndex
CREATE INDEX "IngestSource_enabled_idx" ON "IngestSource"("enabled");
