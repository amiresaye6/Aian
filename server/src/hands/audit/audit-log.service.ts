import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillContext } from '../core/types';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    ctx: SkillContext,
    skill: string,
    method: string,
    input: any,
    success: boolean,
    error?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: ctx.organizationId,
          actorUserId: ctx.actorUserId,
          skill,
          method,
          input: input || {},
          success,
          error: error
            ? JSON.parse(
                JSON.stringify(error, Object.getOwnPropertyNames(error)),
              )
            : null,
          idempotencyKey: ctx.idempotencyKey,
        },
      });
    } catch (err) {
      // We don't want audit log failures to crash the skill execution
      this.logger.error(`Failed to record audit log: ${err.message}`);
    }
  }

  async checkIdempotency(organizationId: string, idempotencyKey: string) {
    return this.prisma.auditLog.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey,
        },
      },
    });
  }
}
