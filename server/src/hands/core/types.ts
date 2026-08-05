/**
 * A resolved provider connection ready for skill consumption.
 * Contains everything a skill needs to make authenticated API calls.
 */
export interface ResolvedConnection {
  id: string;
  providerId: string;
  providerKey: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  externalAccountId: string | null;
  externalAccountName: string | null;
  connectionMetadata: Record<string, unknown>;
  organizationEyeId: string;
  organizationId: string;
}

export interface SkillContext {
  organizationId: string;
  actorUserId: string;
  /** The connection ID of the channel/provider that triggered this execution (e.g. Slack). Used for sending replies. */
  triggerConnectionId: string;
  /** Map of provider key → resolved connection. Populated by the orchestrator based on skill's requiredProviders/optionalProviders. */
  connections: Record<string, ResolvedConnection>;
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
