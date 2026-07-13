/*
  Warnings:

  - You are about to drop the `eye_sync_jobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `integration_resources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `integrations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ingestion_status" AS ENUM ('pending', 'locked', 'handed_off', 'acknowledged', 'failed');

-- CreateEnum
CREATE TYPE "batch_status" AS ENUM ('pending', 'locked', 'handed_off', 'acknowledged', 'failed');

-- CreateEnum
CREATE TYPE "collection_method" AS ENUM ('webhook', 'polling', 'manual');

-- CreateEnum
CREATE TYPE "collection_run_status" AS ENUM ('running', 'completed', 'failed');

-- DropForeignKey
ALTER TABLE "eye_sync_jobs" DROP CONSTRAINT "eye_sync_jobs_integration_id_fkey";

-- DropForeignKey
ALTER TABLE "eye_sync_jobs" DROP CONSTRAINT "eye_sync_jobs_organization_eye_id_fkey";

-- DropForeignKey
ALTER TABLE "integration_resources" DROP CONSTRAINT "integration_resources_integration_id_fkey";

-- DropForeignKey
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_connected_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_organization_eye_id_fkey";

-- DropForeignKey
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_provider_id_fkey";

-- DropTable
DROP TABLE "eye_sync_jobs";

-- DropTable
DROP TABLE "integration_resources";

-- DropTable
DROP TABLE "integrations";

-- DropEnum
DROP TYPE "sync_job_status";

-- DropEnum
DROP TYPE "sync_trigger_type";

-- CreateTable
CREATE TABLE "provider_connections" (
    "id" TEXT NOT NULL,
    "organization_eye_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "status" "integration_status" NOT NULL DEFAULT 'pending',
    "external_account_id" VARCHAR(255),
    "external_account_name" VARCHAR(255),
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "scopes" JSONB NOT NULL,
    "connected_by_user_id" TEXT,
    "connected_at" TIMESTAMPTZ NOT NULL,
    "last_sync_at" TIMESTAMPTZ,
    "last_verified_at" TIMESTAMPTZ,
    "last_error_message" TEXT,
    "webhook_secret" TEXT,
    "connection_metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_resource_selections" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "external_resource_id" VARCHAR(255) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "metadata" JSONB NOT NULL,
    "is_selected" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ,
    "last_collected_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_resource_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_cursors" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "external_resource_id" VARCHAR(255),
    "cursor_value" TEXT NOT NULL,
    "last_fetched_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_provider_events" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "eye_type" VARCHAR(20) NOT NULL,
    "provider_event_type" VARCHAR(100) NOT NULL,
    "provider_event_id" VARCHAR(255),
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "eye_type" VARCHAR(20) NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "external_resource_id" VARCHAR(255) NOT NULL,
    "external_event_id" VARCHAR(255),
    "parent_external_resource_id" VARCHAR(255),
    "title" TEXT,
    "content" TEXT NOT NULL,
    "author" JSONB,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "context_location" VARCHAR(500),
    "source_url" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'ORGANIZATION',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "raw_payload_reference" VARCHAR(255) NOT NULL,
    "idempotency_key" VARCHAR(500) NOT NULL,
    "ingestion_status" "ingestion_status" NOT NULL DEFAULT 'pending',
    "version" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "batch_status" NOT NULL DEFAULT 'pending',
    "trigger_type" VARCHAR(20) NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ,
    "handed_off_at" TIMESTAMPTZ,
    "acknowledged_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ingestion_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_batch_items" (
    "batch_id" TEXT NOT NULL,
    "knowledge_item_id" TEXT NOT NULL,

    CONSTRAINT "ingestion_batch_items_pkey" PRIMARY KEY ("batch_id","knowledge_item_id")
);

-- CreateTable
CREATE TABLE "organization_processing_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "time_interval_hours" INTEGER NOT NULL DEFAULT 6,
    "pending_item_threshold" INTEGER NOT NULL DEFAULT 100,
    "retention_days" INTEGER NOT NULL DEFAULT 15,
    "is_auto_processing_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_processing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_runs" (
    "id" TEXT NOT NULL,
    "organization_eye_id" TEXT NOT NULL,
    "connection_id" TEXT,
    "eye_type" VARCHAR(20) NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "collection_method" "collection_method" NOT NULL,
    "status" "collection_run_status" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "items_fetched" INTEGER NOT NULL DEFAULT 0,
    "items_stored" INTEGER NOT NULL DEFAULT 0,
    "items_ignored" INTEGER NOT NULL DEFAULT 0,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_connections_organization_eye_id_key" ON "provider_connections"("organization_eye_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_resource_selections_connection_id_external_resourc_key" ON "provider_resource_selections"("connection_id", "external_resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_cursors_connection_id_external_resource_id_key" ON "provider_cursors"("connection_id", "external_resource_id");

-- CreateIndex
CREATE INDEX "raw_provider_events_connection_id_received_at_idx" ON "raw_provider_events"("connection_id", "received_at");

-- CreateIndex
CREATE INDEX "raw_provider_events_provider_event_id_idx" ON "raw_provider_events"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_items_idempotency_key_key" ON "knowledge_items"("idempotency_key");

-- CreateIndex
CREATE INDEX "knowledge_items_organization_id_ingestion_status_idx" ON "knowledge_items"("organization_id", "ingestion_status");

-- CreateIndex
CREATE INDEX "knowledge_items_organization_id_eye_type_provider_idx" ON "knowledge_items"("organization_id", "eye_type", "provider");

-- CreateIndex
CREATE INDEX "knowledge_items_external_resource_id_idx" ON "knowledge_items"("external_resource_id");

-- CreateIndex
CREATE INDEX "ingestion_batches_organization_id_status_idx" ON "ingestion_batches"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_processing_settings_organization_id_key" ON "organization_processing_settings"("organization_id");

-- CreateIndex
CREATE INDEX "collection_runs_organization_eye_id_created_at_idx" ON "collection_runs"("organization_eye_id", "created_at");

-- AddForeignKey
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_organization_eye_id_fkey" FOREIGN KEY ("organization_eye_id") REFERENCES "organization_eyes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_connected_by_user_id_fkey" FOREIGN KEY ("connected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_resource_selections" ADD CONSTRAINT "provider_resource_selections_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_cursors" ADD CONSTRAINT "provider_cursors_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_batch_items" ADD CONSTRAINT "ingestion_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ingestion_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_batch_items" ADD CONSTRAINT "ingestion_batch_items_knowledge_item_id_fkey" FOREIGN KEY ("knowledge_item_id") REFERENCES "knowledge_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_processing_settings" ADD CONSTRAINT "organization_processing_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_runs" ADD CONSTRAINT "collection_runs_organization_eye_id_fkey" FOREIGN KEY ("organization_eye_id") REFERENCES "organization_eyes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_runs" ADD CONSTRAINT "collection_runs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
