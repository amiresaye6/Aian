-- CreateEnum
CREATE TYPE "extraction_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "knowledge_artifacts" ADD COLUMN     "extracted_data" JSONB,
ADD COLUMN     "extraction_status" "extraction_status" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "knowledge_artifacts_organization_id_extraction_status_idx" ON "knowledge_artifacts"("organization_id", "extraction_status");
