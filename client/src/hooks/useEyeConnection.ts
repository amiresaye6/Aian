import { useOwnerDashboard } from "./use-owner-dashboard"; 

/**
 * Extracts the organizationId and the organizationEyeId for a specific
 * eyeType from the already-fetched owner dashboard data.
 * Avoids a duplicate network call — dashboard data is the single source
 * of truth for eye IDs (per DashboardEye.id from Sprint 1 work).
 */
export function useEyeConnection(eyeType: string) {
  const { data, isLoading, isError, error } = useOwnerDashboard();

  const organizationId = data?.organization?.id ?? null;
  const eye = data?.eyes?.find((e) => e.eyeType === eyeType) ?? null;
  const organizationEyeId = eye?.id ?? null;
  const integration =data?.integrations?.find((i) => i.organizationEyeId === organizationEyeId) ?? null;
  const connectionId = integration?.id ?? null;

  return {
    organizationId,
    organizationEyeId,
    connectionId,
    eye,
    isLoading,
    isError,
    error,
  };
}