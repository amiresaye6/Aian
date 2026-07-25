-- CreateEnum
CREATE TYPE "artifact_type" AS ENUM ('conversation', 'ticket_lifecycle', 'implementation_story', 'meeting_outcome', 'document');

-- AlterTable
ALTER TABLE "knowledge_items" ADD COLUMN     "artifact_id" TEXT;

-- CreateTable
CREATE TABLE "knowledge_artifacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "artifact_type" NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "title" VARCHAR(500),
    "content" TEXT NOT NULL,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "extracted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_artifacts_organization_id_type_idx" ON "knowledge_artifacts"("organization_id", "type");

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "knowledge_artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_artifacts" ADD CONSTRAINT "knowledge_artifacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
