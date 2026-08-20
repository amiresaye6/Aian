export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  industry?: string | null;
  country?: string | null;
  timezone?: string | null;
  logoUrl?: string | null;
  status?: string;
  createdByUserId?: string | null;
}

export interface UpdateOrganizationBody {
  name?: string;
  slug?: string;
  description?: string;
  industry?: string;
  country?: string;
  timezone?: string;
  logo?: string;
  logoUrl?: string;
}