import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsage } from './providers/ai-provider.interface';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs AI usage to the database asynchronously.
   * If organizationId is not available (e.g. background job without context), it can be skipped or logged to a system account.
   */
  async logUsage(
    organizationId: string,
    feature: string,
    modelUsed: string,
    usage: AiUsage,
  ): Promise<void> {
    if (!organizationId) {
      this.logger.warn(`Missing organizationId, skipping usage log for feature: ${feature}`);
      return;
    }

    try {
      await this.prisma.aiUsageLog.create({
        data: {
          organizationId,
          feature,
          modelUsed,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          costUsd: usage.costUsd,
          stopReason: usage.stopReason,
          budgetState: usage.budgetState,
        },
      });
      this.logger.debug(`Logged AI usage for org ${organizationId} on feature ${feature}`);
    } catch (error) {
      this.logger.error(`Failed to log AI usage: ${error.message}`);
    }
  }
}
