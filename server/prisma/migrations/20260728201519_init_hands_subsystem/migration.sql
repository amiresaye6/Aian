-- CreateTable
CREATE TABLE "hands_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "pending_action" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hands_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "skill" VARCHAR(100) NOT NULL,
    "method" VARCHAR(100) NOT NULL,
    "input" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" JSONB,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hands_sessions_organization_id_user_id_key" ON "hands_sessions"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_organization_id_idempotency_key_key" ON "audit_logs"("organization_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "hands_sessions" ADD CONSTRAINT "hands_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
