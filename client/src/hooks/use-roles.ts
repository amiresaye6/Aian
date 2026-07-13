"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi } from '@/api/roles/index';
import { CreateRoleBody, UpdateRoleBody } from "@/types/roles"

export function useRoles() {
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await rolesApi.getRolesByORG();
      return res.data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (body: CreateRoleBody) => rolesApi.createCustomRole(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleBody }) =>
      rolesApi.updateCustomRole(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => rolesApi.deleteCustomRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  return {
    roles: rolesQuery.data || [],
    isLoading: rolesQuery.isLoading,
    isError: rolesQuery.isError,
    createRole: createRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    createRoleError: createRoleMutation.error,
    updateRole: updateRoleMutation.mutate,
    isUpdating: updateRoleMutation.isPending,
    updateRoleError: updateRoleMutation.error,
    deleteRole: deleteRoleMutation.mutate,
    isDeleting: deleteRoleMutation.isPending,
  };
}