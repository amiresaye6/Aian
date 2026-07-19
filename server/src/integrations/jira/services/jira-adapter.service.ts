import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ProviderAdapter,
  ProviderEventInput,
  KnowledgeItem,
  Provider,
  EyeType,
} from '../../contracts';

@Injectable()
export class JiraAdapterService implements ProviderAdapter {
  normalizeEvent(input: ProviderEventInput): KnowledgeItem[] {
    const payload = input.rawPayload as Record<string, any>;
    
    // Support BOTH Webhook payloads (webhookEvent) AND direct API sync objects
    const eventType = input.providerEventType || payload.webhookEvent || payload.type;

    if (!eventType || typeof eventType !== 'string') {
      return [];
    }

    const items: KnowledgeItem[] = [];

    // Issue Events (From Webhooks or Historical Sync)
    if (
      eventType.includes('issue_created') ||
      eventType.includes('issue_updated') ||
      eventType.includes('issue_deleted') ||
      eventType === 'jira_historical_issue'
    ) {
      if (payload.issue) {
        items.push(this.mapIssue(input, payload.issue, this.mapEventType(eventType)));
      }

      // Extract comments
      if (payload.comment && payload.issue) {
        items.push(this.mapComment(input, payload.issue, payload.comment, 'comment_created'));
      } else if (payload.issue?.fields?.comment?.comments) {
        // Handle historical sync comments embedded in the issue object
        for (const comment of payload.issue.fields.comment.comments) {
          items.push(this.mapComment(input, payload.issue, comment, 'comment_created'));
        }
      }
    }

    // Comment Events
    if (eventType.includes('comment_created') || eventType.includes('comment_updated')) {
      if (payload.comment && payload.issue) {
        items.push(this.mapComment(input, payload.issue, payload.comment, this.mapEventType(eventType)));
      }
    }

    // Worklog Events
    if (eventType.includes('worklog_created') || eventType.includes('worklog_updated')) {
      if (payload.worklog && payload.issue) {
        items.push(this.mapWorklog(input, payload.issue, payload.worklog, this.mapEventType(eventType)));
      }
    }

    // Attachment Events
    if (eventType.includes('attachment_created')) {
      if (payload.attachment && payload.issue) {
        items.push(this.mapAttachment(input, payload.issue, payload.attachment));
      }
    }

    return items;
  }

  private mapEventType(raw: string): string {
    if (raw === 'jira_historical_issue') {
      return 'issue_synced';
    }
    if (raw.startsWith('jira:')) {
      return raw.replace('jira:', '');
    }
    return raw;
  }

  private mapIssue(input: ProviderEventInput, issue: Record<string, any>, eventType: string): KnowledgeItem {
    const fields = issue.fields || {};
    const project = fields.project || {};
    const creator = fields.creator || {};
    const updated = fields.updated || issue.updated || new Date().toISOString();

    let content = `Title: ${fields.summary || ''}\n`;
    if (fields.description) {
      if (typeof fields.description === 'string') {
        content += `\nDescription: ${fields.description}`;
      } else {
        content += `\nDescription: [Rich Text Content]`;
      }
    }

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType: 'issue',
      eventType,
      externalResourceId: project.id?.toString() || issue.id?.toString() || 'unknown',
      externalEventId: issue.id?.toString() || null,
      parentExternalResourceId: project.id?.toString() || null,
      title: fields.summary || issue.key || null,
      content: content.trim(),
      author: {
        externalId: creator.accountId,
        name: creator.displayName,
        email: creator.emailAddress,
      },
      participants: this.extractParticipants(fields),
      contextLocation: project.name ? `Project: ${project.name}` : null,
      sourceUrl: null,
      occurredAt: new Date(updated),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueKey: issue.key,
        projectId: project.id,
        projectKey: project.key,
        projectName: project.name,
        assignee: fields.assignee?.displayName,
        reporter: fields.reporter?.displayName,
        priority: fields.priority?.name,
        status: fields.status?.name,
        labels: fields.labels || [],
        components: (fields.components || []).map((c: Record<string, any>) => c.name),
        issueType: fields.issuetype?.name,
        creator: creator.displayName,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapComment(
    input: ProviderEventInput,
    issue: Record<string, any>,
    comment: Record<string, any>,
    eventType: string,
  ): KnowledgeItem {
    const author = comment.author || comment.updateAuthor || {};
    const created = comment.updated || comment.created || new Date().toISOString();

    let bodyText = comment.body || '';
    if (typeof bodyText !== 'string') {
      bodyText = '[Rich Text Content]';
    }

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType: 'comment',
      eventType,
      externalResourceId: issue.id?.toString() || 'unknown',
      externalEventId: comment.id?.toString() || null,
      parentExternalResourceId: issue.id?.toString() || null,
      title: `Comment on ${issue.key}`,
      content: bodyText,
      author: {
        externalId: author.accountId,
        name: author.displayName,
        email: author.emailAddress,
      },
      participants: [],
      contextLocation: `Issue: ${issue.key}`,
      sourceUrl: null,
      occurredAt: new Date(created),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueKey: issue.key,
        commentId: comment.id,
        commentAuthor: author.displayName,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapWorklog(
    input: ProviderEventInput,
    issue: Record<string, any>,
    worklog: Record<string, any>,
    eventType: string,
  ): KnowledgeItem {
    const author = worklog.author || worklog.updateAuthor || {};
    const created = worklog.updated || worklog.started || new Date().toISOString();

    let commentText = worklog.comment || '';
    if (typeof commentText !== 'string') {
      commentText = '[Rich Text Content]';
    }

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType: 'worklog',
      eventType,
      externalResourceId: issue.id?.toString() || 'unknown',
      externalEventId: worklog.id?.toString() || null,
      parentExternalResourceId: issue.id?.toString() || null,
      title: `Worklog on ${issue.key}`,
      content: `Time spent: ${worklog.timeSpent || 'unknown'}\nComment: ${commentText}`,
      author: {
        externalId: author.accountId,
        name: author.displayName,
        email: author.emailAddress,
      },
      participants: [],
      contextLocation: `Issue: ${issue.key}`,
      sourceUrl: null,
      occurredAt: new Date(created),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueKey: issue.key,
        worklogId: worklog.id,
        timeSpentSeconds: worklog.timeSpentSeconds,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapAttachment(
    input: ProviderEventInput,
    issue: Record<string, any>,
    attachment: Record<string, any>,
  ): KnowledgeItem {
    const author = attachment.author || {};
    const created = attachment.created || new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType: 'attachment',
      eventType: 'attachment_created',
      externalResourceId: issue.id?.toString() || 'unknown',
      externalEventId: attachment.id?.toString() || null,
      parentExternalResourceId: issue.id?.toString() || null,
      title: `Attachment on ${issue.key}: ${attachment.filename}`,
      content: `Attachment: ${attachment.filename}\nMimeType: ${attachment.mimeType}\nSize: ${attachment.size}`,
      author: {
        externalId: author.accountId,
        name: author.displayName,
        email: author.emailAddress,
      },
      participants: [],
      contextLocation: `Issue: ${issue.key}`,
      sourceUrl: attachment.content || null,
      occurredAt: new Date(created),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueKey: issue.key,
        attachmentId: attachment.id,
        mimeType: attachment.mimeType,
        size: attachment.size,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private extractParticipants(fields: Record<string, any>): Array<{ externalId?: string; name?: string; email?: string }> {
    const participants: Array<{ externalId?: string; name?: string; email?: string }> = [];
    if (fields.assignee) {
      participants.push({
        externalId: fields.assignee.accountId,
        name: fields.assignee.displayName,
        email: fields.assignee.emailAddress,
      });
    }
    if (fields.reporter && fields.reporter.accountId !== fields.assignee?.accountId) {
      participants.push({
        externalId: fields.reporter.accountId,
        name: fields.reporter.displayName,
        email: fields.reporter.emailAddress,
      });
    }
    return participants;
  }

  getIdempotencyKey(item: KnowledgeItem): string {
    const org = item.organizationId;
    const id = item.externalEventId || 'unknown';

    if (item.sourceType === 'issue') {
      const updated = item.occurredAt.getTime();
      return `jira:${org}:issue:${id}:${updated}`;
    }

    if (item.sourceType === 'comment') {
      return `jira:${org}:comment:${id}`;
    }

    if (item.sourceType === 'attachment') {
      return `jira:${org}:attachment:${id}`;
    }

    if (item.sourceType === 'worklog') {
      return `jira:${org}:worklog:${id}`;
    }

    return `jira:${org}:${item.sourceType}:${id}`;
  }

  getExternalResourceId(input: ProviderEventInput): string {
    const payload = input.rawPayload as Record<string, any>;

    if (payload.project?.id) {
      return payload.project.id.toString();
    }

    if (payload.issue?.fields?.project?.id) {
      return payload.issue.fields.project.id.toString();
    }

    if (payload.issue?.id) {
      return payload.issue.id.toString();
    }

    return 'unknown';
  }

  getExternalEventId(input: ProviderEventInput): string | null {
    const payload = input.rawPayload as Record<string, any>;

    if (payload.issue?.id) {
      return payload.issue.id.toString();
    }

    if (payload.project?.id) {
      return payload.project.id.toString();
    }

    return null;
  }
}
