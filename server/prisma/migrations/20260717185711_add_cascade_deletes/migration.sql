-- DropForeignKey
ALTER TABLE "collection_runs" DROP CONSTRAINT "collection_runs_organization_eye_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_cursors" DROP CONSTRAINT "provider_cursors_connection_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_resource_selections" DROP CONSTRAINT "provider_resource_selections_connection_id_fkey";

-- AddForeignKey
ALTER TABLE "provider_resource_selections" ADD CONSTRAINT "provider_resource_selections_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_cursors" ADD CONSTRAINT "provider_cursors_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_runs" ADD CONSTRAINT "collection_runs_organization_eye_id_fkey" FOREIGN KEY ("organization_eye_id") REFERENCES "organization_eyes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
