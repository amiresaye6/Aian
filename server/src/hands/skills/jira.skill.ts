import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import { JiraClientService } from '../../integrations/jira/services/jira-client.service';
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
export class JiraSkill implements OnModuleInit {
  constructor(
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
    private readonly jiraClientService: JiraClientService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'TaskSkill.createTask',
      description: 'Create a new Jira issue.',
      schema: CreateTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.createTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.updateTask',
      description: 'Update an existing Jira issue.',
      schema: UpdateTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.updateTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.assignTask',
      description: 'Assign a Jira issue to a user.',
      schema: AssignTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.assignTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.moveTask',
      description: 'Transition a Jira issue to a new status.',
      schema: MoveTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.moveTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.comment',
      description: 'Add a comment to a Jira issue.',
      schema: CommentTaskInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.commentTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.deleteTask',
      description: 'Delete a Jira issue.',
      schema: DeleteTaskInputSchema,
      destructive: true,
      handler: (ctx: SkillContext, input: any) => this.deleteTask(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.listTasks',
      description: 'Search and list Jira issues based on filters.',
      schema: ListTasksInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.listTasks(ctx, input),
    });

    this.registry.register({
      name: 'TaskSkill.getTask',
      description: 'Get details of a specific Jira issue.',
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
        meta: { skill: 'TaskSkill.createTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'createTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.createTask(ctx.organizationId, parsed.data);
    });
  }

  async updateTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = UpdateTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.updateTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'updateTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.updateTask(ctx.organizationId, parsed.data);
    });
  }

  async assignTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = AssignTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.assignTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'assignTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.assignTask(ctx.organizationId, parsed.data);
    });
  }

  async moveTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = MoveTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.moveTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'moveTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.moveTask(ctx.organizationId, parsed.data);
    });
  }

  async commentTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = CommentTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.comment', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'commentTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.commentTask(ctx.organizationId, parsed.data);
    });
  }

  async deleteTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = DeleteTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.deleteTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'deleteTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.deleteTask(ctx.organizationId, parsed.data);
    });
  }

  async listTasks(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = ListTasksInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.listTasks', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'listTasks', 'jira', parsed.data, async () => {
      return this.jiraClientService.listTasks(ctx.organizationId, parsed.data);
    });
  }

  async getTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = GetTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'TaskSkill.getTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'getTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.getTask(ctx.organizationId, parsed.data);
    });
  }
}
