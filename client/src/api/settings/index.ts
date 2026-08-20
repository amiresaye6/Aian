"use client"

import api from "../axios";
import {
  ApiResponse,
  Organization,
  UpdateOrganizationBody
} from "@/types/settings";

export const settingsApi = {
  updateOrganization: async (body: UpdateOrganizationBody): Promise<ApiResponse<Organization>> => {
    const response = await api.patch<ApiResponse<Organization>>(`/settings/organization`, body);
    return response.data;
  },

  deleteOrganization: async (): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/settings/organization`);
    return response.data;
  },
};