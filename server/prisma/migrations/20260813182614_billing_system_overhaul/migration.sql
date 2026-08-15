-- CreateEnum
CREATE TYPE "ledger_event_type" AS ENUM ('plan_upgrade', 'plan_downgrade_scheduled', 'plan_downgrade_applied', 'subscription_renewal', 'overage_invoice', 'payment_success', 'payment_failed', 'proration_charge', 'grace_period_started', 'grace_period_expired');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('subscription', 'upgrade_proration', 'overage');

-- AlterEnum
ALTER TYPE "quota_status" ADD VALUE 'overage_active';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "type" "payment_type" NOT NULL DEFAULT 'subscription';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "grace_period_end" TIMESTAMPTZ,
ADD COLUMN     "overage_hard_cap_cents" INTEGER,
ADD COLUMN     "pending_downgrade_plan_id" TEXT;

-- CreateTable
CREATE TABLE "ledger_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "ledger_event_type" NOT NULL,
    "old_plan_id" TEXT,
    "new_plan_id" TEXT,
    "amount_cents" INTEGER,
    "currency" VARCHAR(10),
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "triggered_by" VARCHAR(255),
    "payment_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ledger_events_organization_id_type_idx" ON "ledger_events"("organization_id", "type");

-- CreateIndex
CREATE INDEX "ledger_events_organization_id_created_at_idx" ON "ledger_events"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
