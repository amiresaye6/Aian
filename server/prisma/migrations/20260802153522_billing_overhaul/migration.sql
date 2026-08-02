-- CreateEnum
CREATE TYPE "quota_status" AS ENUM ('within_limits', 'warning', 'grace_period', 'hard_blocked');

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "ai_token_limit" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "is_trial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overage_storage_price_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overage_token_price_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overage_user_price_cents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "usage_period_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "total_tokens_used" BIGINT NOT NULL,
    "total_storage_mb" INTEGER NOT NULL,
    "total_members" INTEGER NOT NULL,
    "overage_tokens" BIGINT NOT NULL DEFAULT 0,
    "overage_storage_mb" INTEGER NOT NULL DEFAULT 0,
    "overage_users" INTEGER NOT NULL DEFAULT 0,
    "overage_total_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_period_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_period_snapshots_organization_id_period_start_idx" ON "usage_period_snapshots"("organization_id", "period_start");

-- AddForeignKey
ALTER TABLE "usage_period_snapshots" ADD CONSTRAINT "usage_period_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
