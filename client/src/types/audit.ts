export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorUserId: string;
  skill: string;
  method: string;
  input: any;
  success: boolean;
  error?: any;
  idempotencyKey: string;
  createdAt: string;
}

export interface AuditAnalytics {
  totalActions: number;
  successCount: number;
  failureCount: number;
  todayActions: number;
  yesterdayActions: number;
  bySkill: { skill: string; count: number }[];
  overTime: { date: string; success: number; failed: number }[];
}

export interface PaginatedAuditResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
