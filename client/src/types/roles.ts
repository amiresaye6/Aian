export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Permission {
  id: string;
  name: string;
  key: string;
  description?: string | null;
}

export interface RolePermissionRelation {
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface AssignedUser {
  id: string;
  fullName: string;
  email: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  organizationId: string;
  isSystemRole: boolean;
  permissions?: RolePermissionRelation[]; 
  users?: AssignedUser[];
}

export interface CreateRoleBody {
  key: string;
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleBody {
  name?: string;
  description?: string;
  permissionIds?: string[];
}