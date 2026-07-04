-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('pending_verification', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "organization_status" AS ENUM ('pending_connections', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('invited', 'active', 'deactivated');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "eye_status" AS ENUM ('disconnected', 'connecting', 'connected', 'error', 'paused');

-- CreateEnum
CREATE TYPE "integration_status" AS ENUM ('pending', 'connected', 'disconnected', 'error');

-- CreateEnum
CREATE TYPE "knowledge_file_status" AS ENUM ('pending', 'processing', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "sync_trigger_type" AS ENUM ('initial', 'scheduled', 'manual');

-- CreateEnum
CREATE TYPE "sync_job_status" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "billing_cycle" "billing_cycle" NOT NULL,
    "status" "subscription_status" NOT NULL,
    "payment_provider" VARCHAR(50) NOT NULL,
    "provider_customer_id" VARCHAR(255),
    "provider_subscription_id" VARCHAR(255),
    "current_period_start" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "payment_provider" VARCHAR(50) NOT NULL,
    "provider_payment_id" VARCHAR(255) NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "billing_cycle" "billing_cycle" NOT NULL,
    "status" "payment_status" NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "failure_reason" TEXT,
    "provider_payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eye_types" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eye_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "oauth_supported" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eye_providers" (
    "eye_type_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "is_available_in_v1" BOOLEAN NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eye_providers_pkey" PRIMARY KEY ("eye_type_id","provider_id")
);

-- CreateTable
CREATE TABLE "organization_eyes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "eye_type_id" TEXT NOT NULL,
    "selected_provider_id" TEXT,
    "status" "eye_status" NOT NULL DEFAULT 'disconnected',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_schedule" VARCHAR(50) NOT NULL,
    "last_successful_sync_at" TIMESTAMPTZ,
    "next_scheduled_sync_at" TIMESTAMPTZ,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_eyes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
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
    "last_error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_resources" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "external_resource_id" VARCHAR(255) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "metadata" JSONB NOT NULL,
    "is_selected" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "last_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_knowledge_files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT,
    "original_file_name" VARCHAR(255) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "status" "knowledge_file_status" NOT NULL DEFAULT 'pending',
    "processing_error" TEXT,
    "uploaded_at" TIMESTAMPTZ NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_knowledge_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "current_step" VARCHAR(100) NOT NULL,
    "completed_steps" JSONB NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eye_sync_jobs" (
    "id" TEXT NOT NULL,
    "organization_eye_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "trigger_type" "sync_trigger_type" NOT NULL,
    "status" "sync_job_status" NOT NULL DEFAULT 'queued',
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "progress_percentage" SMALLINT NOT NULL,
    "summary" JSONB NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eye_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "industry" VARCHAR(100),
    "company_size" VARCHAR(50),
    "country" VARCHAR(100),
    "timezone" VARCHAR(100) NOT NULL,
    "logo_url" TEXT,
    "status" "organization_status" NOT NULL DEFAULT 'pending_connections',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system_role" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "member_status" "membership_status" NOT NULL DEFAULT 'invited',
    "invited_by_user_id" TEXT,
    "joined_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMPTZ,
    "status" "user_status" NOT NULL DEFAULT 'pending_verification',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "eye_types_key_key" ON "eye_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "providers_key_key" ON "providers"("key");

-- CreateIndex
CREATE UNIQUE INDEX "organization_eyes_organization_id_eye_type_id_key" ON "organization_eyes"("organization_id", "eye_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_organization_eye_id_key" ON "integrations"("organization_eye_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_resources_integration_id_external_resource_id_key" ON "integration_resources"("integration_id", "external_resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_knowledge_files_storage_key_key" ON "organization_knowledge_files"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_organization_id_key" ON "onboarding_progress"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_providers" ADD CONSTRAINT "eye_providers_eye_type_id_fkey" FOREIGN KEY ("eye_type_id") REFERENCES "eye_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_providers" ADD CONSTRAINT "eye_providers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_eyes" ADD CONSTRAINT "organization_eyes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_eyes" ADD CONSTRAINT "organization_eyes_eye_type_id_fkey" FOREIGN KEY ("eye_type_id") REFERENCES "eye_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_eyes" ADD CONSTRAINT "organization_eyes_selected_provider_id_fkey" FOREIGN KEY ("selected_provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_eye_id_fkey" FOREIGN KEY ("organization_eye_id") REFERENCES "organization_eyes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_connected_by_user_id_fkey" FOREIGN KEY ("connected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_resources" ADD CONSTRAINT "integration_resources_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_knowledge_files" ADD CONSTRAINT "organization_knowledge_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_knowledge_files" ADD CONSTRAINT "organization_knowledge_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_sync_jobs" ADD CONSTRAINT "eye_sync_jobs_organization_eye_id_fkey" FOREIGN KEY ("organization_eye_id") REFERENCES "organization_eyes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_sync_jobs" ADD CONSTRAINT "eye_sync_jobs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
