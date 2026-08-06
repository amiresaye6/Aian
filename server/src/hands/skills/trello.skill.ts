import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import { TrelloClientService } from '../../integrations/trello/services/trello-client.service';
import {
  TrelloCreateTaskInputSchema,
  TrelloUpdateTaskInputSchema,
  TrelloAssignTaskInputSchema,
  TrelloMoveTaskInputSchema,
  TrelloCommentTaskInputSchema,
  TrelloDeleteTaskInputSchema,
  TrelloListTasksInputSchema,
  TrelloGetTaskInputSchema,
} from './schemas';

@Injectable()
export class TrelloSkill implements OnModuleInit {
  constructor(
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
    private readonly trelloClientService: TrelloClientService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'Trello.createTask',
      description: 'Create a new Trello card.',
      schema: TrelloCreateTaskInputSchema,
      destructive: false,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.createTask(ctx, input),
    });

    this.registry.register({
      name: 'Trello.updateTask',
      description: 'Update an existing Trello card.',
      schema: TrelloUpdateTaskInputSchema,
      destructive: false,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.updateTask(ctx, input),
    });

    this.registry.register({
      name: 'Trello.assignTask',
      description: 'Assign a Trello card to a user.',
      schema: TrelloAssignTaskInputSchema,
      destructive: false,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.assignTask(ctx, input),
    });

    this.registry.register({
      name: 'Trello.moveTask',
      description: 'Move a Trello card to a different list.',
      schema: TrelloMoveTaskInputSchema,
      destructive: false,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.moveTask(ctx, input),
    });

    this.registry.register({
      name: 'Trello.commentTask',
      description: 'Add a comment to a Trello card.',
      schema: TrelloCommentTaskInputSchema,
      destructive: false,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.commentTask(ctx, input),
    });

    this.registry.register({
      name: 'Trello.deleteTask',
      description: 'Delete a Trello card.',
      schema: TrelloDeleteTaskInputSchema,
      destructive: true,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.deleteTask(ctx, input),
    });

    this.registry.register({
      name: 'Trello.listTasks',
      description: 'List Trello cards with optional filtering.',
      schema: TrelloListTasksInputSchema,
      destructive: false,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.listTasks(ctx, input),
    });

    this.registry.register({
      name: 'Trello.getTask',
      description: 'Get details of a specific Trello card.',
      schema: TrelloGetTaskInputSchema,
      destructive: false,
      requiredProviders: ['trello'],
      handler: (ctx: SkillContext, input: any) => this.getTask(ctx, input),
    });
  }

  async createTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloCreateTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.createTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'createTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.createTask(ctx.organizationId, parsed.data);
    });
  }

  async updateTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloUpdateTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.updateTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'updateTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.updateTask(ctx.organizationId, parsed.data);
    });
  }

  async assignTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloAssignTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.assignTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'assignTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.assignTask(ctx.organizationId, parsed.data);
    });
  }

  async moveTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloMoveTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.moveTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'moveTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.moveTask(ctx.organizationId, parsed.data);
    });
  }

  async commentTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloCommentTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.commentTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'commentTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.commentTask(ctx.organizationId, parsed.data);
    });
  }

  async deleteTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloDeleteTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.deleteTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'archiveTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.archiveTask(ctx.organizationId, parsed.data);
    });
  }

  async listTasks(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloListTasksInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.listTasks', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'listTasks', 'trello', parsed.data, async () => {
      return this.trelloClientService.listTasks(ctx.organizationId, parsed.data);
    });
  }

  async getTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = TrelloGetTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Trello.getTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'getTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.getTask(ctx.organizationId, parsed.data);
    });
  }
}
