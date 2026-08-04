import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessagesService } from '../../integrations/messages/messages.service';
import { SendMessageInputSchema } from './schemas';
import { ResilienceService } from '../core/resilience.service';
import { SkillContext, SkillResult } from '../core/types';
import { SkillRegistryService } from '../core/registry.service';

@Injectable()
export class MessagingSkill implements OnModuleInit {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'MessagingSkill.sendMessage',
      description:
        'Sends a chat message to a specific user or channel in the provider (e.g. Slack).',
      schema: SendMessageInputSchema,
      destructive: false,
      requiredProviders: [],
      handler: (ctx: SkillContext, input: any) => this.sendMessage(ctx, input),
    });
  }

  async sendMessage(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = SendMessageInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.message,
          retryable: false,
        },
        meta: {
          skill: 'MessagingSkill',
          provider: 'unknown', // can be fetched from ctx
          durationMs: 0,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }

    return this.resilienceService.execute(
      ctx,
      'MessagingSkill',
      'sendMessage',
      'messaging-provider', // This maps to whichever provider is backing the connectionId
      parsed.data,
      async () => {
        return this.messagesService.send(ctx.triggerConnectionId, {
          targetId: parsed.data.channelId,
          text: parsed.data.text,
        });
      },
    );
  }
}
