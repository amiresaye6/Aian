-- AlterTable
ALTER TABLE "knowledge_artifacts" ADD COLUMN     "resolution_status" "extraction_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "resolved_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "resolved_entities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "canonical_name" VARCHAR(500) NOT NULL,
    "normalized_name" VARCHAR(500) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "providerIds" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolved_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_mentions" (
    "id" TEXT NOT NULL,
    "resolved_entity_id" TEXT NOT NULL,
    "artifact_id" TEXT NOT NULL,
    "extracted_name" VARCHAR(500) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resolved_entities_organization_id_type_idx" ON "resolved_entities"("organization_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "resolved_entities_organization_id_normalized_name_type_key" ON "resolved_entities"("organization_id", "normalized_name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "entity_mentions_resolved_entity_id_artifact_id_extracted_na_key" ON "entity_mentions"("resolved_entity_id", "artifact_id", "extracted_name");

-- AddForeignKey
ALTER TABLE "resolved_entities" ADD CONSTRAINT "resolved_entities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_resolved_entity_id_fkey" FOREIGN KEY ("resolved_entity_id") REFERENCES "resolved_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "knowledge_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
