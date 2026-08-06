import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import { JiraClientService } from '../../integrations/jira/services/jira-client.service';
import {
  JiraCreateTaskInputSchema,
  JiraUpdateTaskInputSchema,
  JiraAssignTaskInputSchema,
  JiraMoveTaskInputSchema,
  JiraCommentTaskInputSchema,
  JiraDeleteTaskInputSchema,
  JiraListTasksInputSchema,
  JiraGetTaskInputSchema,
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
      name: 'Jira.createTask',
      description: 'Create a new Jira issue.',
      schema: JiraCreateTaskInputSchema,
      destructive: false,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.createTask(ctx, input),
    });

    this.registry.register({
      name: 'Jira.updateTask',
      description: 'Update an existing Jira issue.',
      schema: JiraUpdateTaskInputSchema,
      destructive: false,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.updateTask(ctx, input),
    });

    this.registry.register({
      name: 'Jira.assignTask',
      description: 'Assign a Jira issue to a user.',
      schema: JiraAssignTaskInputSchema,
      destructive: false,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.assignTask(ctx, input),
    });

    this.registry.register({
      name: 'Jira.moveTask',
      description: 'Move a Jira issue to a different status.',
      schema: JiraMoveTaskInputSchema,
      destructive: false,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.moveTask(ctx, input),
    });

    this.registry.register({
      name: 'Jira.commentTask',
      description: 'Add a comment to a Jira issue.',
      schema: JiraCommentTaskInputSchema,
      destructive: false,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.commentTask(ctx, input),
    });

    this.registry.register({
      name: 'Jira.deleteTask',
      description: 'Delete a Jira issue.',
      schema: JiraDeleteTaskInputSchema,
      destructive: true,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.deleteTask(ctx, input),
    });

    this.registry.register({
      name: 'Jira.listTasks',
      description: 'List Jira issues with optional filtering.',
      schema: JiraListTasksInputSchema,
      destructive: false,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.listTasks(ctx, input),
    });

    this.registry.register({
      name: 'Jira.getTask',
      description: 'Get details of a specific Jira issue.',
      schema: JiraGetTaskInputSchema,
      destructive: false,
      requiredProviders: ['jira'],
      handler: (ctx: SkillContext, input: any) => this.getTask(ctx, input),
    });
  }

  async createTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraCreateTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.createTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'createTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.createTask(ctx.organizationId, parsed.data);
    });
  }

  async updateTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraUpdateTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.updateTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'updateTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.updateTask(ctx.organizationId, parsed.data);
    });
  }

  async assignTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraAssignTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.assignTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'assignTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.assignTask(ctx.organizationId, parsed.data);
    });
  }

  async moveTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraMoveTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.moveTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'moveTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.moveTask(ctx.organizationId, parsed.data);
    });
  }

  async commentTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraCommentTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.commentTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'commentTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.commentTask(ctx.organizationId, parsed.data);
    });
  }

  async deleteTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraDeleteTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.deleteTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'deleteTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.deleteTask(ctx.organizationId, parsed.data);
    });
  }

  async listTasks(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraListTasksInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.listTasks', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'listTasks', 'jira', parsed.data, async () => {
      return this.jiraClientService.listTasks(ctx.organizationId, parsed.data);
    });
  }

  async getTask(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = JiraGetTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, retryable: false },
        meta: { skill: 'Jira.getTask', provider: 'jira', durationMs: 0, idempotencyKey: ctx.idempotencyKey },
      };
    }

    return this.resilienceService.execute(ctx, 'JiraSkill', 'getTask', 'jira', parsed.data, async () => {
      return this.jiraClientService.getTask(ctx.organizationId, parsed.data);
    });
  }
}
