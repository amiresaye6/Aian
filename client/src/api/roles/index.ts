"use client"

import api from "../axios";
import { 
  ApiResponse, 
  Role, 
  Permission, 
  CreateRoleBody, 
  UpdateRoleBody 
} from "@/types/roles"; 

export const rolesApi = {
  getRoleById: async (id: string): Promise<ApiResponse<Role>> => {
    const response = await api.get<ApiResponse<Role>>(`/roles-permissions/role/${id}`);
    return response.data;
  },

  getPermissionById: async (id: string): Promise<ApiResponse<Permission>> => {
    const response = await api.get<ApiResponse<Permission>>(`/roles-permissions/permission/${id}`);
    return response.data;
  },

  getRolesByORG: async (): Promise<ApiResponse<Role[]>> => {
    const response = await api.get<ApiResponse<Role[]>>(`/roles-permissions/organization`);
    return response.data;
  },

  assignRoleToUser: async (roleId: string, employeeUserId: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(`/roles-permissions/assign`, { 
      roleId, 
      employeeUserId 
    });
    return response.data;
  },

  createCustomRole: async (createRoleBody: CreateRoleBody): Promise<ApiResponse<Role>> => {
    const response = await api.post<ApiResponse<Role>>(`/roles-permissions/role`, createRoleBody);
    return response.data;
  },

  updateCustomRole: async (roleId: string, updateRoleBody: UpdateRoleBody): Promise<ApiResponse<Role>> => {
    const response = await api.patch<ApiResponse<Role>>(`/roles-permissions/role/${roleId}`, updateRoleBody);
    return response.data;
  },

  deleteCustomRole: async (roleId: string): Promise<ApiResponse<Role>> => {
    const response = await api.delete<ApiResponse<Role>>(`/roles-permissions/role/${roleId}`);
    return response.data;
  },

  getAllPermissions: async (): Promise<ApiResponse<Permission[]>> => {
    const response = await api.get<ApiResponse<Permission[]>>(`/roles-permissions/permissions`);
    return response.data;
  }
};