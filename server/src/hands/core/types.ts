export interface SkillContext {
  organizationId: string;
  actorUserId: string;
  connectionId: string;
  sessionId: string;
  idempotencyKey: string;
  traceId: string;
}

export interface SkillError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: SkillError;
  meta: {
    skill: string;
    provider: string;
    durationMs: number;
    idempotencyKey: string;
  };
}
