"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from '@/api/settings/index';
import { UpdateOrganizationBody } from "@/types/settings";

export function useSettings() {
  const queryClient = useQueryClient();

  const organizationQuery = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const res = await settingsApi.getOrganization();
      return res.data;
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: (body: UpdateOrganizationBody) => settingsApi.updateOrganization(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });

  const deleteOrganizationMutation = useMutation({
    mutationFn: () => settingsApi.deleteOrganization(),
  });

  return {
    organization: organizationQuery.data,
    isLoadingOrganization: organizationQuery.isLoading,
    organizationError: organizationQuery.error,

    updateOrganization: updateOrganizationMutation.mutate,
    isUpdating: updateOrganizationMutation.isPending,
    updateOrganizationError: updateOrganizationMutation.error,
    updateOrganizationSuccess: updateOrganizationMutation.isSuccess,

    deleteOrganization: deleteOrganizationMutation.mutate,
    isDeleting: deleteOrganizationMutation.isPending,
    deleteOrganizationError: deleteOrganizationMutation.error,
  };
}