import { Injectable, Logger } from '@nestjs/common';
import { AuditLogService } from '../audit/audit-log.service';
import { SkillContext, SkillResult } from './types';

@Injectable()
export class ResilienceService {
  private readonly logger = new Logger(ResilienceService.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Wraps a skill execution with audit logging and idempotency checks.
   * Can be extended later with retry and circuit breaker logic.
   */
  async execute<T>(
    ctx: SkillContext,
    skill: string,
    method: string,
    provider: string,
    input: any,
    fn: () => Promise<T>,
  ): Promise<SkillResult<T>> {
    const start = Date.now();

    // 1. Check Idempotency
    const existingLog = await this.auditLogService.checkIdempotency(
      ctx.organizationId,
      ctx.idempotencyKey,
    );

    if (existingLog) {
      this.logger.log(
        `Idempotency hit for ${skill}.${method} with key ${ctx.idempotencyKey}`,
      );
      if (existingLog.success) {
        return {
          success: true,
          meta: {
            skill,
            provider,
            durationMs: 0,
            idempotencyKey: ctx.idempotencyKey,
          },
        };
      } else {
        return {
          success: false,
          error: {
            code: 'PREVIOUSLY_FAILED',
            message: 'A previous attempt with this idempotency key failed.',
            retryable: false,
          },
          meta: {
            skill,
            provider,
            durationMs: 0,
            idempotencyKey: ctx.idempotencyKey,
          },
        };
      }
    }

    try {
      // 2. Execute actual function
      const data = await fn();

      // 3. Audit success
      await this.auditLogService.record(ctx, skill, method, input, true);

      return {
        success: true,
        data,
        meta: {
          skill,
          provider,
          durationMs: Date.now() - start,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    } catch (err) {
      this.logger.error(`Error executing ${skill}.${method}: ${err.message}`);

      // 3. Audit failure
      await this.auditLogService.record(ctx, skill, method, input, false, err);

      return {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
          retryable: true, // We can refine this later
        },
        meta: {
          skill,
          provider,
          durationMs: Date.now() - start,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }
  }
}
