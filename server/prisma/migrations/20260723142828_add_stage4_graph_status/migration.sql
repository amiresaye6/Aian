-- AlterTable
ALTER TABLE "knowledge_artifacts" ADD COLUMN     "graph_status" "extraction_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "graph_synced_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "knowledge_artifacts_organization_id_resolution_status_idx" ON "knowledge_artifacts"("organization_id", "resolution_status");

-- CreateIndex
CREATE INDEX "knowledge_artifacts_organization_id_graph_status_idx" ON "knowledge_artifacts"("organization_id", "graph_status");
