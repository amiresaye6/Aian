"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from '@/api/settings/index';
import { UpdateOrganizationBody } from "@/types/settings";

export function useSettings() {
  const queryClient = useQueryClient();

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
    updateOrganization: updateOrganizationMutation.mutate,
    isUpdating: updateOrganizationMutation.isPending,
    updateOrganizationError: updateOrganizationMutation.error,
    updateOrganizationSuccess: updateOrganizationMutation.isSuccess,

    deleteOrganization: deleteOrganizationMutation.mutate,
    isDeleting: deleteOrganizationMutation.isPending,
    deleteOrganizationError: deleteOrganizationMutation.error,
  };
}