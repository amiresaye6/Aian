import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listMembers,
  inviteMember,
  changeRole,
  changeStatus,
  removeMember,
} from "@/api/members";
import { InviteMemberPayload, ChangeRolePayload, ChangeStatusPayload } from "@/types/members";

export function useMembers(organizationId: string) {
  return useQuery({
    queryKey: ["members", organizationId],
    queryFn: () => listMembers(organizationId),
    enabled: !!organizationId,
  });
}

export function useInviteMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteMemberPayload) => inviteMember(organizationId, payload),
    onSuccess: () => {
      toast.success("Invitation sent");
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
    },
    onError: (err: any) => {
      const errorCode = err?.response?.data?.error?.code;
      if (errorCode === "MEMBER_LIMIT_REACHED") {
        return; // handled inline by the component, no toast
      }
      toast.error(err.response?.data?.message || "Failed to send invitation");
    },
  });
}

export function useChangeRole(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, payload }: { memberId: string; payload: ChangeRolePayload }) =>
      changeRole(organizationId, memberId, payload),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update role");
    },
  });
}

export function useChangeStatus(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, payload }: { memberId: string; payload: ChangeStatusPayload }) =>
      changeStatus(organizationId, memberId, payload),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update status");
    },
  });
}

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(organizationId, memberId),
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to remove member");
    },
  });
}