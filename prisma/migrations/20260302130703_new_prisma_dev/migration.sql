-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "enhancedPrompt" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "lighting" TEXT NOT NULL,
    "composition" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "seed" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "resultUrl" TEXT,
    "thumbnailUrl" TEXT,
    "errorMessage" TEXT,
    "creditsUsed" INTEGER,
    "providerJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderUsage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "dailyCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthlyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueJob" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Generation_provider_idx" ON "Generation"("provider");

-- CreateIndex
CREATE INDEX "Generation_status_idx" ON "Generation"("status");

-- CreateIndex
CREATE INDEX "Generation_createdAt_idx" ON "Generation"("createdAt");

-- CreateIndex
CREATE INDEX "Generation_task_idx" ON "Generation"("task");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUsage_provider_key" ON "ProviderUsage"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "QueueJob_generationId_key" ON "QueueJob"("generationId");

-- CreateIndex
CREATE INDEX "QueueJob_status_idx" ON "QueueJob"("status");

-- CreateIndex
CREATE INDEX "QueueJob_position_idx" ON "QueueJob"("position");
