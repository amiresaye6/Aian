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
    const payload = input.rawPayload as Record<string, unknown>;
    
    // Support BOTH Webhook payloads (webhookEvent) AND direct API sync objects
    const eventType = input.providerEventType || payload.webhookEvent || payload.type;

    const eventTypeStr = eventType as string | undefined;

    if (!eventTypeStr || typeof eventTypeStr !== 'string') {
      return [];
    }

    const items: KnowledgeItem[] = [];

    // Issue Events (From Webhooks or Historical Sync)
    if (
      eventTypeStr.includes('issue_created') ||
      eventTypeStr.includes('issue_updated') ||
      eventTypeStr.includes('issue_deleted') ||
      eventTypeStr === 'jira_historical_issue'
    ) {
      if (payload.issue) {
        items.push(this.mapIssue(input, payload.issue as Record<string, unknown>, this.mapEventType(eventTypeStr)));
      }

      // Extract comments
      if (payload.comment && payload.issue) {
        items.push(this.mapComment(input, payload.issue as Record<string, unknown>, payload.comment as Record<string, unknown>, 'comment_created'));
      } else {
        const issueObj = payload.issue as Record<string, unknown> | undefined;
        const fieldsObj = issueObj?.fields as Record<string, unknown> | undefined;
        const commentObj = fieldsObj?.comment as Record<string, unknown> | undefined;
        const commentsArr = commentObj?.comments as unknown[] | undefined;
        if (commentsArr && Array.isArray(commentsArr)) {
          // Handle historical sync comments embedded in the issue object
          for (const comment of commentsArr) {
            items.push(this.mapComment(input, payload.issue as Record<string, unknown>, comment as Record<string, unknown>, 'comment_created'));
          }
        }
      }
    }

    // Comment Events
    if (eventTypeStr.includes('comment_created') || eventTypeStr.includes('comment_updated')) {
      if (payload.comment && payload.issue) {
        items.push(this.mapComment(input, payload.issue as Record<string, unknown>, payload.comment as Record<string, unknown>, this.mapEventType(eventTypeStr)));
      }
    }

    // Worklog Events
    if (eventTypeStr.includes('worklog_created') || eventTypeStr.includes('worklog_updated')) {
      if (payload.worklog && payload.issue) {
        items.push(this.mapWorklog(input, payload.issue as Record<string, unknown>, payload.worklog as Record<string, unknown>, this.mapEventType(eventTypeStr)));
      }
    }

    // Attachment Events
    if (eventTypeStr.includes('attachment_created')) {
      if (payload.attachment && payload.issue) {
        items.push(this.mapAttachment(input, payload.issue as Record<string, unknown>, payload.attachment as Record<string, unknown>));
      }
    }

    // Issue Link Events
    if (eventTypeStr.includes('issuelink_created') || eventTypeStr.includes('issuelink_deleted')) {
      if (payload.issueLink) {
        items.push(this.mapIssueLink(input, payload.issueLink as Record<string, unknown>, this.mapEventType(eventTypeStr)));
      }
    }

    // Transitions (extracted from changelog in issue_updated or historical sync)
    if (
      (eventTypeStr.includes('issue_updated') || eventTypeStr === 'jira_historical_issue') &&
      payload.changelog &&
      payload.issue
    ) {
      const changelogObj = payload.changelog as Record<string, unknown>;
      // Historical sync returns histories in .histories instead of .items, but some webhook payloads use .items. 
      // Actually Jira API /search returns changelog.histories array.
      const historiesArr = (changelogObj.histories as unknown[]) || (changelogObj.items ? [{ items: changelogObj.items }] : []);
      
      for (const history of historiesArr) {
        const historyObj = history as Record<string, unknown>;
        const itemsArr = (historyObj.items as unknown[]) || [];
        const transitionItem = itemsArr.find((i: unknown) => {
          const itemObj = i as Record<string, unknown>;
          return itemObj.field === 'status';
        });
        if (transitionItem) {
          // Pass the history author as the user who made the transition
          const author = historyObj.author || (input.rawPayload as Record<string, unknown>)?.user;
          const fakeInput = { ...input, rawPayload: { ...payload, user: author } };
          items.push(
            this.mapTransition(
              fakeInput,
              payload.issue as Record<string, unknown>,
              transitionItem as Record<string, unknown>,
              'issue_transitioned',
            ),
          );
        }
      }
    }

    // Historical Worklogs
    if (eventTypeStr === 'jira_historical_issue' && payload.issue) {
      const issueObj = payload.issue as Record<string, unknown>;
      const fieldsObj = issueObj.fields as Record<string, unknown> | undefined;
      const worklogObj = fieldsObj?.worklog as Record<string, unknown> | undefined;
      const worklogsArr = worklogObj?.worklogs as unknown[] | undefined;
      if (worklogsArr && Array.isArray(worklogsArr)) {
        for (const wl of worklogsArr) {
          items.push(
            this.mapWorklog(
              input,
              payload.issue as Record<string, unknown>,
              wl as Record<string, unknown>,
              'worklog_created',
            ),
          );
        }
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

  private mapIssue(input: ProviderEventInput, issue: Record<string, unknown>, eventType: string): KnowledgeItem {
    const fields = (issue.fields as Record<string, unknown>) || {};
    const project = (fields.project as Record<string, unknown>) || {};
    const creator = (fields.creator as Record<string, unknown>) || {};
    const updated = (fields.updated || issue.updated || new Date().toISOString()) as string;
    
    const summary = fields.summary as string | undefined;
    const key = issue.key as string | undefined;

    let content = `Title: ${summary || ''}\n`;
    if (fields.description) {
      if (typeof fields.description === 'string') {
        content += `\nDescription: ${fields.description}`;
      } else {
        content += `\nDescription: [Rich Text Content]`;
      }
    }

    const assignee = fields.assignee as Record<string, unknown> | undefined;
    const reporter = fields.reporter as Record<string, unknown> | undefined;
    const priority = fields.priority as Record<string, unknown> | undefined;
    const status = fields.status as Record<string, unknown> | undefined;
    const issuetype = fields.issuetype as Record<string, unknown> | undefined;
    const componentsArr = (fields.components as unknown[]) || [];

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType: 'issue',
      eventType,
      externalResourceId: (project.id as string | undefined)?.toString() || (issue.id as string | undefined)?.toString() || 'unknown',
      externalEventId: (issue.id as string | undefined)?.toString() || null,
      parentExternalResourceId: (project.id as string | undefined)?.toString() || null,
      title: summary || key || null,
      content: content.trim(),
      author: {
        externalId: (creator.accountId as string) || '',
        name: (creator.displayName as string) || 'Unknown',
        email: (creator.emailAddress as string) || undefined,
      },
      participants: this.extractParticipants(fields),
      contextLocation: project.name ? `Project: ${project.name}` : null,
      sourceUrl: null,
      occurredAt: new Date(updated),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueKey: key,
        projectId: project.id,
        projectKey: project.key,
        projectName: project.name,
        assignee: assignee?.displayName,
        reporter: reporter?.displayName,
        priority: priority?.name,
        status: status?.name,
        labels: fields.labels || [],
        components: componentsArr.map((c: unknown) => (c as Record<string, unknown>)?.name),
        issueType: issuetype?.name,
        creator: creator.displayName,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapComment(
    input: ProviderEventInput,
    issue: Record<string, unknown>,
    comment: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const author = (comment.author || comment.updateAuthor || {}) as Record<string, unknown>;
    const created = (comment.updated || comment.created || new Date().toISOString()) as string;

    const bodyStr = typeof comment.body === 'string' && comment.body ? comment.body : '[Rich Text Content]';

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
      content: bodyStr,
      author: {
        externalId: (author.accountId as string) || '',
        name: (author.displayName as string) || 'Unknown',
        email: (author.emailAddress as string) || undefined,
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
    issue: Record<string, unknown>,
    worklog: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const author = (worklog.author || worklog.updateAuthor || {}) as Record<string, unknown>;
    const created = (worklog.updated || worklog.started || new Date().toISOString()) as string;

    const commentStr = typeof worklog.comment === 'string' && worklog.comment ? worklog.comment : '[Rich Text Content]';

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
      content: `Time spent: ${worklog.timeSpent || 'unknown'}\nComment: ${commentStr}`,
      author: {
        externalId: (author.accountId as string) || '',
        name: (author.displayName as string) || 'Unknown',
        email: (author.emailAddress as string) || undefined,
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
    issue: Record<string, unknown>,
    attachment: Record<string, unknown>,
  ): KnowledgeItem {
    const author = (attachment.author || {}) as Record<string, unknown>;
    const created = (attachment.created || new Date().toISOString()) as string;

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
        externalId: (author.accountId as string) || '',
        name: (author.displayName as string) || 'Unknown',
        email: (author.emailAddress as string) || undefined,
      },
      participants: [],
      contextLocation: `Issue: ${issue.key}`,
      sourceUrl: (attachment.content as string) || null,
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

  private mapIssueLink(
    input: ProviderEventInput,
    issueLink: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const outwardIssue = issueLink.outwardIssue as Record<string, unknown> | undefined;
    const inwardIssue = issueLink.inwardIssue as Record<string, unknown> | undefined;
    const linkType = issueLink.issueLinkType as Record<string, unknown> | undefined;
    const sourceIssue = (issueLink.sourceIssueId || outwardIssue?.id || 'unknown') as string;
    const destIssue = (issueLink.destinationIssueId || inwardIssue?.id || 'unknown') as string;
    const typeName = (linkType?.name || 'Linked') as string;

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType: 'issuelink',
      eventType,
      externalResourceId: sourceIssue.toString(),
      externalEventId: issueLink.id?.toString() || null,
      parentExternalResourceId: sourceIssue.toString(),
      title: `Issue Link: ${typeName}`,
      content: `Linked issue ${sourceIssue} to ${destIssue} (${typeName})`,
      author: {
        externalId: '',
        name: 'System',
        email: '',
      },
      participants: [],
      contextLocation: null,
      sourceUrl: null,
      occurredAt: new Date(),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueLinkId: issueLink.id,
        sourceIssueId: sourceIssue,
        destinationIssueId: destIssue,
        linkType: typeName,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapTransition(
    input: ProviderEventInput,
    issue: Record<string, unknown>,
    transition: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const user = (input.rawPayload as Record<string, unknown>)?.user as Record<string, unknown> | undefined || {};
    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType: 'transition',
      eventType,
      externalResourceId: (issue.id as string | undefined)?.toString() || 'unknown',
      externalEventId: null,
      parentExternalResourceId: (issue.id as string | undefined)?.toString() || 'unknown',
      title: `Status Changed on ${issue.key}`,
      content: `Status changed from '${transition.fromString}' to '${transition.toString}'`,
      author: {
        externalId: (user.accountId as string) || '',
        name: (user.displayName as string) || 'Unknown',
        email: (user.emailAddress as string) || undefined,
      },
      participants: [],
      contextLocation: `Issue: ${issue.key}`,
      sourceUrl: null,
      occurredAt: new Date(),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueKey: issue.key,
        fromStatus: transition.fromString,
        toStatus: transition.toString,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private extractParticipants(fields: Record<string, unknown>): Array<{ externalId?: string; name?: string; email?: string }> {
    const participants: Array<{ externalId?: string; name?: string; email?: string }> = [];
    
    const assignee = fields.assignee as Record<string, unknown> | undefined;
    if (assignee) {
      participants.push({
        externalId: assignee.accountId as string | undefined,
        name: assignee.displayName as string | undefined,
        email: assignee.emailAddress as string | undefined,
      });
    }

    const reporter = fields.reporter as Record<string, unknown> | undefined;
    if (reporter && reporter.accountId !== assignee?.accountId) {
      participants.push({
        externalId: reporter.accountId as string | undefined,
        name: reporter.displayName as string | undefined,
        email: reporter.emailAddress as string | undefined,
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

    if (item.sourceType === 'issuelink') {
      return `jira:${org}:issuelink:${id}`;
    }

    if (item.sourceType === 'transition') {
      return `jira:${org}:transition:${item.externalResourceId}:${item.metadata?.toStatus}`;
    }

    return `jira:${org}:${item.sourceType}:${id}`;
  }

  getExternalResourceId(input: ProviderEventInput): string {
    const payload = input.rawPayload as Record<string, unknown>;

    const project = payload.project as Record<string, unknown> | undefined;
    if (project?.id) {
      return project.id.toString();
    }

    const issue = payload.issue as Record<string, unknown> | undefined;
    const fields = issue?.fields as Record<string, unknown> | undefined;
    const issueProject = fields?.project as Record<string, unknown> | undefined;

    if (issueProject?.id) {
      return issueProject.id.toString();
    }

    if (issue?.id) {
      return issue.id.toString();
    }

    return 'unknown';
  }

  getExternalEventId(input: ProviderEventInput): string | null {
    const payload = input.rawPayload as Record<string, unknown>;

    const issue = payload.issue as Record<string, unknown> | undefined;
    if (issue?.id) {
      return issue.id.toString();
    }

    const project = payload.project as Record<string, unknown> | undefined;
    if (project?.id) {
      return project.id.toString();
    }

    return null;
  }
}
