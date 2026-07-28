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
    let eventType = input.providerEventType || payload.webhookEvent || payload.type;
    
    if (eventType === 'historical' && payload.type) {
      eventType = payload.type;
    }

    const eventTypeStr = eventType as string | undefined;

    if (!eventTypeStr || typeof eventTypeStr !== 'string') {
      return [];
    }

    const items: KnowledgeItem[] = [];

    // Issue Events (From Webhooks or Historical Sync)
    if (
      eventTypeStr.includes('issue_created') ||
      eventTypeStr.includes('issue_deleted') ||
      eventTypeStr === 'jira_historical_issue' ||
      (eventTypeStr.includes('issue_updated') && !payload.changelog)
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
    if (eventTypeStr.includes('issue_updated') && payload.changelog && payload.issue) {
      const changelogObj = payload.changelog as Record<string, unknown>;
      const itemsArr = (changelogObj.items as unknown[]) || [];
      for (const item of itemsArr) {
        const itemObj = item as Record<string, unknown>;
        items.push(
          this.mapTransition(
            input,
            payload.issue as Record<string, unknown>,
            itemObj
          ),
        );
      }
    }

    // Historical Sync Changelogs (convert to individual transitions)
    if (eventTypeStr === 'jira_historical_issue' && payload.issue) {
      const issueObj = payload.issue as Record<string, unknown>;
      const changelogObj = issueObj.changelog as Record<string, unknown> | undefined;
      const historiesArr = changelogObj?.histories as unknown[] | undefined;
      
      if (historiesArr && Array.isArray(historiesArr)) {
        for (const history of historiesArr) {
          const historyObj = history as Record<string, unknown>;
          const historyItems = historyObj.items as unknown[] | undefined;
          if (historyItems && historyItems.length > 0) {
            const dateStr = historyObj.created as string | undefined;
            const authorObj = historyObj.author as Record<string, unknown> | undefined;
            
            for (const item of historyItems) {
              const itemObj = item as Record<string, unknown>;
              items.push(
                this.mapTransition(
                  input,
                  issueObj,
                  itemObj,
                  authorObj,
                  dateStr
                )
              );
            }
          }
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

  private mapIssue(
    input: ProviderEventInput, 
    issue: Record<string, unknown>, 
    eventType: string
  ): KnowledgeItem {
    const fields = (issue.fields as Record<string, unknown>) || {};
    const project = (fields.project as Record<string, unknown>) || {};
    const creator = (fields.creator as Record<string, unknown>) || {};
    const updated = (fields.updated || issue.updated || new Date().toISOString()) as string;
    
    const summary = fields.summary as string | undefined;
    const key = issue.key as string | undefined;

    let content = `Title: ${summary || ''}\n`;
    if (fields.description) {
      const descStr = this.extractAdfText(fields.description);
      content += `\nDescription: ${descStr || '[Empty Description]'}`;
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

    const bodyStr = this.extractAdfText(comment.body) || '[Empty Comment]';

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

    const commentStr = this.extractAdfText(worklog.comment) || '[Empty Worklog]';

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
    historyAuthor?: Record<string, unknown>,
    historyCreated?: string
  ): KnowledgeItem {
    const user = historyAuthor || (input.rawPayload as Record<string, unknown>)?.user as Record<string, unknown> | undefined || {};
    
    const field = transition.field as string;
    const fromStr = (transition as Record<string, string>)['fromString'] || 'None';
    const toStr = (transition as Record<string, string>)['toString'] || 'None';
    
    let eventType = 'issue_updated';
    let sourceType = 'transition';
    let title = `Update on ${issue.key}: ${field.charAt(0).toUpperCase() + field.slice(1)}`;
    let content = `${field.charAt(0).toUpperCase() + field.slice(1)} changed from '${fromStr}' to '${toStr}'`;

    if (field === 'status') {
      eventType = 'status_changed';
      sourceType = 'transition';
      title = `Status Changed on ${issue.key}`;
    } else if (field === 'priority') {
      eventType = 'priority_changed';
      sourceType = 'priority_change';
      title = `Priority Changed on ${issue.key}`;
    } else if (field === 'assignee') {
      eventType = 'assignee_changed';
      sourceType = 'assignee_change';
      title = `Assignee Changed on ${issue.key}`;
      content = `Ticket reassigned from '${fromStr}' to '${toStr}'`;
    }

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.JIRA,
      sourceType,
      eventType,
      externalResourceId: (issue.id as string | undefined)?.toString() || 'unknown',
      externalEventId: null,
      parentExternalResourceId: (issue.id as string | undefined)?.toString() || 'unknown',
      title,
      content,
      author: {
        externalId: (user.accountId as string) || '',
        name: (user.displayName as string) || 'Unknown',
        email: (user.emailAddress as string) || undefined,
      },
      participants: [],
      contextLocation: `Issue: ${issue.key}`,
      sourceUrl: null,
      occurredAt: historyCreated ? new Date(historyCreated) : new Date(),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        issueKey: issue.key,
        field,
        fromString: fromStr,
        toString: toStr,
        summary: (issue.fields as any)?.summary,
        projectKey: (issue.fields as any)?.project?.key,
        status: (issue.fields as any)?.status?.name,
        priority: (issue.fields as any)?.priority?.name,
        assigneeName: (issue.fields as any)?.assignee?.displayName,
        reporterName: (issue.fields as any)?.reporter?.displayName,
        created: (issue.fields as any)?.created,
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

    if (
      item.sourceType === 'transition' || 
      item.sourceType === 'priority_change' || 
      item.sourceType === 'assignee_change'
    ) {
      const field = (item.metadata as Record<string, any>)?.field || 'unknown';
      const toStr = (item.metadata as Record<string, any>)?.toString || 'unknown';
      const time = item.occurredAt.getTime();
      return `jira:${org}:${item.sourceType}:${item.externalResourceId}:${field}:${toStr}:${time}`;
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

  /**
   * Helper to recursively extract plain text from Atlassian Document Format (ADF) JSON.
   */
  private extractAdfText(obj: any): string {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj !== 'object') return '';

    let text = '';
    
    // Base case: text node
    if (obj.type === 'text' && obj.text) {
      return obj.text;
    }

    // Traverse children
    if (Array.isArray(obj.content)) {
      for (const child of obj.content) {
        const childText = this.extractAdfText(child);
        if (childText) {
          text += childText + (child.type === 'paragraph' ? '\n' : ' ');
        }
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        text += this.extractAdfText(item) + ' ';
      }
    }

    return text.trim();
  }
}
