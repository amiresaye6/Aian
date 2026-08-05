import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import { TrelloClientService } from '../../integrations/trello/services/trello-client.service';
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  AssignTaskInputSchema,
  MoveTaskInputSchema,
  CommentTaskInputSchema,
  DeleteTaskInputSchema,
  ListTasksInputSchema,
  GetTaskInputSchema,
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
      name: 'TaskSkill.createTask',
      description: 'Create a new Trello card.',
      schema: CreateTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.createTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.updateTask',
      description: 'Update an existing Trello card.',
      schema: UpdateTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.updateTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.assignTask',
      description: 'Assign a Trello card to a user.',
      schema: AssignTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.assignTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.moveTask',
      description: 'Transition a Trello card to a new list (status).',
      schema: MoveTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.moveTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.comment',
      description: 'Add a comment to a Trello card.',
      schema: CommentTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.commentTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.deleteTask',
      description: 'Archive a Trello card.',
      schema: DeleteTaskInputSchema,
      destructive: true,
      handler: (ctx: SkillContext, input: any) => this.deleteTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.listTasks',
      description: 'Search and list Trello cards based on filters.',
      schema: ListTasksInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.listTasks(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.getTask',
      description: 'Get details of a specific Trello card.',
      schema: GetTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.getTask(ctx, input),
    });
  }

  async createTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = CreateTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.createTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'createTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.createTask(ctx.organizationId, parsed.data);
    });
  }

  async updateTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = UpdateTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.updateTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'updateTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.updateTask(ctx.organizationId, parsed.data);
    });
  }

  async assignTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = AssignTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.assignTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'assignTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.assignTask(ctx.organizationId, parsed.data);
    });
  }

  async moveTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = MoveTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.moveTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'moveTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.moveTask(ctx.organizationId, parsed.data);
    });
  }

  async commentTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = CommentTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.comment', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'commentTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.commentTask(ctx.organizationId, parsed.data);
    });
  }

  async deleteTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = DeleteTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.deleteTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'archiveTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.archiveTask(ctx.organizationId, parsed.data);
    });
  }

  async listTasks(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = ListTasksInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.listTasks', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'listTasks', 'trello', parsed.data, async () => {
      return this.trelloClientService.listTasks(ctx.organizationId, parsed.data);
    });
  }

  async getTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = GetTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.getTask', provider: 'trello', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'TrelloSkill', 'getTask', 'trello', parsed.data, async () => {
      return this.trelloClientService.getTask(ctx.organizationId, parsed.data);
    });
  }
}
