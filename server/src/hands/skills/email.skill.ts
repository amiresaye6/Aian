import { Injectable, OnModuleInit } from '@nestjs/common';
import { EmailService } from '../../email/email.service';
import { SendEmailInputSchema } from './schemas';
import { ResilienceService } from '../core/resilience.service';
import { SkillContext, SkillResult } from '../core/types';
import { SkillRegistryService } from '../core/registry.service';

@Injectable()
export class EmailSkill implements OnModuleInit {
  constructor(
    private readonly emailService: EmailService,
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'EmailSkill.sendBrandedEmail',
      description: 'Sends an email wrapped in the company branding template.',
      schema: SendEmailInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) =>
        this.sendBrandedEmail(ctx, input),
    });
  }

  async sendBrandedEmail(
    ctx: SkillContext,
    input: any,
  ): Promise<SkillResult<any>> {
    const parsed = SendEmailInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.message,
          retryable: false,
        },
        meta: {
          skill: 'EmailSkill',
          provider: 'email',
          durationMs: 0,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }

    return this.resilienceService.execute(
      ctx,
      'EmailSkill',
      'sendBrandedEmail',
      'email',
      parsed.data,
      async () => {
        await this.emailService.sendBrandedEmail(
          parsed.data.to,
          parsed.data.subject,
          parsed.data.contentHtml,
        );
        return { success: true };
      },
    );
  }
}
