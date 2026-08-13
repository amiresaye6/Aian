-- AlterTable
ALTER TABLE "ingestion_batches" ADD COLUMN     "sync_run_id" TEXT;

-- AlterTable
ALTER TABLE "knowledge_artifacts" ADD COLUMN     "sync_run_id" TEXT;

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "trigger_type" VARCHAR(20) NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_artifacts" INTEGER NOT NULL DEFAULT 0,
    "current_stage" VARCHAR(30),
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "error_message" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_runs_organization_id_status_idx" ON "sync_runs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "sync_runs_organization_id_started_at_idx" ON "sync_runs"("organization_id", "started_at");

-- AddForeignKey
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "sync_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
