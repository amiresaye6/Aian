import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { SkillRegistryService } from '../core/registry.service';
import { SessionService } from './session.service';
import { AiMessage, AiTool } from '../../ai/providers/ai-provider.interface';
import { SkillContext } from '../core/types';
import { ConnectionResolverService } from '../core/connection-resolver.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderClientFactory } from '../../integrations/provider-client.factory';
import { ProviderConnection } from '../../integrations/contracts';

export interface HandleDMInput {
  organizationId: string;
  connectionId: string;
  teamId: string;
  userId: string;
  channelId: string;
  text: string;
  threadTs: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly skillRegistry: SkillRegistryService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly clientFactory: ProviderClientFactory,
    private readonly connectionResolver: ConnectionResolverService,
  ) {}

  /**
   * Helper to send a message back to the user via the Provider Client (e.g. Slack)
   */
  private async sendReply(
    connectionId: string,
    channelId: string,
    text: string,
    threadTs?: string,
  ) {
    try {
      const connection = await this.prisma.providerConnection.findUnique({
        where: { id: connectionId },
      });
      if (!connection) return;
      const client = this.clientFactory.getClient(connection.providerId);
      if (!client) return;

      if (client.sendMessage) {
        await client.sendMessage(connection as unknown as ProviderConnection, {
          targetId: channelId,
          text,
          threadId: threadTs,
        });
      }
    } catch (e) {
      this.logger.error(
        `Failed to send reply to connection ${connectionId}: ${e.message}`,
      );
    }
  }

  private buildSystemPrompt(): string {
    return `You are AIAN, a strict enterprise organizational intelligence AI.
CRITICAL RULES:
1. You have access to various tools (skills) like sending emails, sending messages, fetching reports, and querying organizational knowledge.
2. If the user asks you to perform an action that matches one of your tools, you MUST use the appropriate tool to fulfill their request.
3. If the user asks a question about the organization's data, projects, or employees, you MUST use the KnowledgeSkill.answerQuestion tool.
4. You MUST strictly refuse to answer any general knowledge questions, math problems, coding requests, or anything outside of organizational data that cannot be fulfilled by a tool. Respond with: "I am an enterprise AI and can only assist with organizational knowledge."
5. Be concise and professional.`;
  }

  private simpleZodToJsonSchema(schema: any): any {
    if (schema._def.typeName === 'ZodObject' || schema.shape) {
      const properties: any = {};
      const required: string[] = [];
      const shape = schema.shape;
      for (const key in shape) {
        properties[key] = this.simpleZodToJsonSchema(shape[key]);
        if (!shape[key].isOptional()) {
          required.push(key);
        }
      }
      return { type: 'object', properties, required };
    } else if (
      schema._def.typeName === 'ZodString' ||
      schema.constructor.name === 'ZodString'
    ) {
      return {
        type: 'string',
        description: schema.description || 'string value',
      };
    } else if (schema._def.typeName === 'ZodArray') {
      return {
        type: 'array',
        items: this.simpleZodToJsonSchema(schema._def.type),
      };
    } else if (schema._def.typeName === 'ZodEnum') {
      return { type: 'string', enum: schema._def.values };
    } else if (
      schema._def.typeName === 'ZodOptional' ||
      schema._def.typeName === 'ZodNullable'
    ) {
      return this.simpleZodToJsonSchema(schema._def.innerType);
    }
    return { type: 'string' }; // fallback
  }

  private buildTools(): AiTool[] {
    const definitions = this.skillRegistry.getAllDefinitions();
    return definitions.map((def) => {
      return {
        name: def.name,
        description: def.description,
        schema: this.simpleZodToJsonSchema(def.schema),
      };
    });
  }

  async handleDM(input: HandleDMInput) {
    this.logger.log(`Handling DM from user ${input.userId}`);

    // 1. Get or create session
    const session = await this.sessionService.getOrCreateSession(
      input.organizationId,
      input.userId,
    );

    // 2. State Machine: Check if we are confirming a destructive action
    if (session.state === 'confirming') {
      const text = input.text.toLowerCase();
      if (
        text.includes('yes') ||
        text.includes('confirm') ||
        text.includes('y')
      ) {
        this.logger.log('User confirmed destructive action.');
        await this.sessionService.updateSessionState(session.id, 'executing');
        // Retrieve action from session.pendingAction
        const pendingAction = session.pendingAction as any;
        if (pendingAction && pendingAction.name) {
          const def = this.skillRegistry.resolve(pendingAction.name);
          if (def) {
            const { connections, missing } =
              await this.connectionResolver.resolveForSkill(
                input.organizationId,
                def.requiredProviders || [],
                def.optionalProviders || [],
              );

            if (missing.length > 0) {
              await this.sendReply(
                input.connectionId,
                input.channelId,
                `❌ This action requires the following integrations: *${missing.join(', ')}*. Please link them in your dashboard.`,
                input.threadTs,
              );
              await this.sessionService.updateSessionState(session.id, 'idle');
              return;
            }

            const ctx: SkillContext = {
              organizationId: input.organizationId,
              actorUserId: input.userId,
              triggerConnectionId: input.connectionId,
              connections,
              sessionId: session.id,
              idempotencyKey: `${session.id}-${Date.now()}`,
              traceId: `trace-${Date.now()}`,
            };
            const result = await def.handler(ctx, pendingAction.input);
            this.logger.log(
              `Executed confirmed action with success: ${result.success}`,
            );
            await this.sendReply(
              input.connectionId,
              input.channelId,
              `✅ Confirmed and executed: *${def.name}* (Success: ${result.success})`,
              input.threadTs,
            );
          }
        }
        await this.sessionService.updateSessionState(session.id, 'idle');
        return;
      } else {
        this.logger.log('User cancelled destructive action.');
        await this.sessionService.updateSessionState(session.id, 'idle');
        await this.sendReply(
          input.connectionId,
          input.channelId,
          `❌ Action cancelled.`,
          input.threadTs,
        );
        return;
      }
    }

    // 3. Normal flow: Build messages and call AI
    const messages: AiMessage[] = [{ role: 'user', content: input.text }];

    const { data: aiResult } = await this.aiGateway.generateToolCalls(
      messages,
      this.buildTools(),
      this.buildSystemPrompt(),
      {
        organizationId: input.organizationId,
        feature: 'dm_chat',
      },
    );

    // 4. Handle Tool Calls
    if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
      for (const call of aiResult.toolCalls) {
        const def = this.skillRegistry.resolve(call.name);
        if (!def) continue;

        if (def.destructive) {
          this.logger.log(`Action ${def.name} requires confirmation.`);
          await this.sessionService.updateSessionState(
            session.id,
            'confirming',
            {
              name: call.name,
              input: call.input,
            },
          );

          await this.sendReply(
            input.connectionId,
            input.channelId,
            `⚠️ The action *${def.name}* requires your confirmation.\nReply with "yes" to proceed or "no" to cancel.`,
            input.threadTs,
          );
          return;
        }

        const { connections, missing } =
          await this.connectionResolver.resolveForSkill(
            input.organizationId,
            def.requiredProviders || [],
            def.optionalProviders || [],
          );

        if (missing.length > 0) {
          await this.sendReply(
            input.connectionId,
            input.channelId,
            `❌ This action requires the following integrations: *${missing.join(', ')}*. Please link them in your dashboard.`,
            input.threadTs,
          );
          continue;
        }

        // Execute non-destructive skill immediately
        const ctx: SkillContext = {
          organizationId: input.organizationId,
          actorUserId: input.userId,
          triggerConnectionId: input.connectionId,
          connections,
          sessionId: session.id,
          idempotencyKey: `${session.id}-${Date.now()}`,
          traceId: `trace-${Date.now()}`,
        };
        //this.logger.log(`Executing skill ${def.name} with input: ${JSON.stringify(ctx)}`);
        this.logger.log(`input: ${JSON.stringify(call.input)}`)
        const result = await def.handler(ctx, call.input);
        this.logger.log(
          `Skill ${def.name} executed with success: ${result.success}`,
        );

        let replyText = `✅ Executed: *${def.name}*`;

        if (!result.success) {
          this.logger.error(
            `Skill ${def.name} failed. Error: ${result.error?.message || JSON.stringify(result.error)}`,
          );
          replyText = `❌ *${def.name}* failed to execute. Please check the logs for more details.`;
        } else if (result.data) {
          if (typeof result.data === 'object') {
            const dataObj = result.data as any;
            if (dataObj.answer) {
              replyText = `*Answer:*\n${dataObj.answer}`;
              if (dataObj.confidence !== undefined)
                replyText += `\n_Confidence: ${dataObj.confidence}/100_`;
            } else if (dataObj.summary) {
              replyText = `*Summary:*\n${dataObj.summary}`;
            } else if (dataObj.reportMarkdown) {
              replyText = dataObj.reportMarkdown;
            } else if (dataObj.results && Array.isArray(dataObj.results)) {
              replyText = `✅ *${def.name}* completed successfully! Found ${dataObj.results.length} relevant items.`;
            } else {
              replyText = `✅ *${def.name}* executed successfully!`;
            }
          } else {
            replyText = `✅ *${def.name}* executed successfully!\n*Result:*\n${result.data}`;
          }
        }

        await this.sendReply(
          input.connectionId,
          input.channelId,
          replyText,
          input.threadTs,
        );
      }
    } else {
      // Just a normal text reply, send back to slack
      this.logger.log(`AI replied: ${aiResult.content}`);
      if (aiResult.content) {
        await this.sendReply(
          input.connectionId,
          input.channelId,
          aiResult.content,
          input.threadTs as string,
        );
      }
    }

    // Ensure session is idle
    if (session.state !== 'idle') {
      await this.sessionService.updateSessionState(session.id, 'idle');
    }
  }
}
