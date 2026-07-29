import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';
import { KnowledgeAssembler } from '../../../processor/assemblers/knowledge-assembler.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { JiraClientService } from './jira-client.service';

@Injectable()
export class JiraAssemblerService implements KnowledgeAssembler {
  private readonly logger = new Logger(JiraAssemblerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraClient: JiraClientService,
  ) {}

  supports(provider: string): boolean {
    return provider.toLowerCase() === 'jira';
  }

  async assemble(items: KnowledgeItem[]): Promise<Partial<KnowledgeArtifact>[]> {
    if (items.length === 0) return [];

    const organizationId = items[0].organizationId;

    // Group items by externalResourceId (Jira Issue ID)
    // Fallback to metadata.issueKey
    const grouped = this.groupItems(items);
    
    // Attempt to resolve missing displayNames using JiraClientService if needed
    await this.enrichMissingNames(organizationId, grouped);

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const [resourceId, groupItems] of Object.entries(grouped)) {
      this.sortItems(groupItems);

      // Split into chunks of 50 if needed
      const chunks = this.splitLargeArtifacts(groupItems, 50);

      chunks.forEach((chunk, index) => {
        const artifact = this.buildArtifact(
          organizationId,
          resourceId,
          chunk,
          index + 1,
          chunks.length
        );
        artifacts.push(artifact);
      });
    }

    return artifacts;
  }

  private groupItems(items: KnowledgeItem[]): Record<string, KnowledgeItem[]> {
    return items.reduce((acc, item) => {
      const metadata = (item.metadata as any) || {};
      const key = item.externalResourceId || metadata.issueKey || 'unknown-issue';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, KnowledgeItem[]>);
  }

  private sortItems(items: KnowledgeItem[]): void {
    items.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }

  private splitLargeArtifacts(items: KnowledgeItem[], maxSize: number): KnowledgeItem[][] {
    const chunks: KnowledgeItem[][] = [];
    for (let i = 0; i < items.length; i += maxSize) {
      chunks.push(items.slice(i, i + maxSize));
    }
    return chunks;
  }

  private async enrichMissingNames(organizationId: string, grouped: Record<string, KnowledgeItem[]>) {
    const missingAccountIds = new Set<string>();

    // Scan for participants that only have accountId and no readable name
    Object.values(grouped).flat().forEach((item) => {
      const author = item.author as any;
      if (author && author.externalId && (!author.name || author.name === 'Unknown')) {
        missingAccountIds.add(author.externalId);
      }
      const participants = (item.participants || []) as any[];
      if (Array.isArray(participants)) {
        participants.forEach((p) => {
          if (p.externalId && (!p.name || p.name === 'Unknown')) {
            missingAccountIds.add(p.externalId);
          }
        });
      }
    });

    if (missingAccountIds.size > 0) {
      try {
        const connection = await this.prisma.providerConnection.findFirst({
          where: {
            organizationEye: { organizationId },
            provider: { key: 'jira' },
          },
        });

        if (connection) {
          const members = await this.jiraClient.getMembers(connection as any);
          const membersMap = new Map(members.map((m: any) => [m.externalId, m.name]));

          // Backfill missing names
          Object.values(grouped).flat().forEach((item) => {
            const author = item.author as any;
            if (author && author.externalId && missingAccountIds.has(author.externalId)) {
              author.name = membersMap.get(author.externalId) || author.name;
            }
            const participants = (item.participants || []) as any[];
            if (Array.isArray(participants)) {
              participants.forEach((p) => {
                if (p.externalId && missingAccountIds.has(p.externalId)) {
                  p.name = membersMap.get(p.externalId) || p.name;
                }
              });
            }
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to enrich missing Jira names: ${(err as Error).message}`);
      }
    }
  }

  private extractParticipants(items: KnowledgeItem[]): any[] {
    const map = new Map<string, any>();
    
    items.forEach((item) => {
      const author = item.author as any;
      if (author && author.externalId) {
        if (!map.has(author.externalId) || (author.name && author.name !== 'Unknown')) {
          map.set(author.externalId, {
            externalId: author.externalId,
            name: author.name || 'Unknown',
            email: author.email,
          });
        }
      }

      const parts = (item.participants || []) as any[];
      if (Array.isArray(parts)) {
        parts.forEach((p) => {
          if (p.externalId) {
            if (!map.has(p.externalId) || (p.name && p.name !== 'Unknown')) {
              map.set(p.externalId, {
                externalId: p.externalId,
                name: p.name || 'Unknown',
                email: p.email,
                role: p.role,
              });
            }
          }
        });
      }
    });

    return Array.from(map.values());
  }

  private buildTicketHeader(items: KnowledgeItem[]): string {
    // Attempt to find the full issue snapshot if present
    const issueItem = items.find((i) => i.sourceType === 'issue') || items[0];
    const latestItem = items[items.length - 1];

    const issueMeta = (issueItem.metadata as any) || {};
    const latestMeta = (latestItem.metadata as any) || {};

    // The summary can be on the snapshot's title or inside the metadata of any item
    const summary = (issueItem.sourceType === 'issue' ? issueItem.title : null) || issueMeta.summary || latestMeta.summary || 'Untitled Issue';
    const issueKey = issueMeta.issueKey || latestMeta.issueKey || issueItem.externalResourceId || 'Unknown';
    const project = issueMeta.projectKey || latestMeta.projectKey || 'Unknown';

    // Base state
    let status = issueMeta.status || latestMeta.status || 'Unknown';
    let priority = issueMeta.priority || latestMeta.priority || 'None';
    let assigneeName = issueMeta.assignee || latestMeta.assigneeName || 'Unassigned';

    // Fast-forward state based on transitions in this chunk to reflect current reality
    for (const item of items) {
      if (item.eventType === 'status_changed') {
        status = (item.metadata as any)?.toString || status;
      }
      if (item.eventType === 'priority_changed') {
        priority = (item.metadata as any)?.toString || priority;
      }
      if (item.eventType === 'assignee_changed') {
        assigneeName = (item.metadata as any)?.toString || assigneeName;
      }
    }

    const reporterName = issueMeta.reporter || latestMeta.reporterName || (issueItem.sourceType === 'issue' ? (issueItem.author as any)?.name : null) || 'Unknown';
    const createdDate = issueMeta.created || latestMeta.created ? new Date(issueMeta.created || latestMeta.created).toISOString() : issueItem.occurredAt.toISOString();

    return `# Ticket: ${issueKey} - ${summary}

**Project:** ${project}
**Status:** ${status}
**Priority:** ${priority}
**Reporter:** ${reporterName}
**Assignee:** ${assigneeName}
**Created:** ${createdDate}

## Timeline
`;
  }

  private formatEvent(item: KnowledgeItem): string {
    const type = item.eventType;
    const time = item.occurredAt.toISOString();
    const author = (item.author as any)?.name || 'Someone';

    let actionLine = '';
    let details = '';

    const metadata = (item.metadata as any) || {};

    if (type === 'issue_created') {
      actionLine = `${author} created the ticket.`;
    } else if (type === 'issue_updated') {
      // It might be a generic update or an issue transition.
      const changes = metadata.changelog || [];
      if (changes.length > 0) {
        const descriptions = changes.map((c: any) => {
          if (c.field === 'status') {
            return `changed status\n${c.fromString || 'None'}\n↓\n${c.toString || 'None'}`;
          }
          if (c.field === 'priority') {
            return `changed priority\n${c.fromString || 'None'}\n↓\n${c.toString || 'None'}`;
          }
          if (c.field === 'assignee') {
            return `reassigned ticket\n${c.fromString || 'Unassigned'}\n↓\n${c.toString || 'Unassigned'}`;
          }
          if (c.field === 'labels') {
            return `updated labels: ${c.toString}`;
          }
          if (c.field === 'summary') {
            return `changed title to "${c.toString}"`;
          }
          return `updated ${c.field} from "${c.fromString || 'empty'}" to "${c.toString || 'empty'}"`;
        });
        actionLine = `${author} updated the ticket`;
        details = descriptions.join('\n\n');
      } else {
        actionLine = `${author} updated the ticket details.`;
      }
    } else if (type === 'comment_created' || type === 'comment_updated') {
      const verb = type === 'comment_created' ? 'commented' : 'updated a comment';
      actionLine = `${author} ${verb}`;
      
      // Clean content (assuming rich text is stripped or handled, but we ensure we just put quotes)
      const content = item.content ? `"${item.content.trim()}"` : '"[Empty comment]"';
      details = content;
    } else if (type === 'comment_deleted') {
      actionLine = `${author} deleted a comment.`;
    } else if (type === 'status_changed') {
      actionLine = `${author} changed status`;
      details = `${metadata.fromString || 'Unknown'}\n↓\n${metadata.toString || 'Unknown'}`;
    } else if (type === 'priority_changed') {
      actionLine = `${author} changed priority`;
      details = `${metadata.fromString || 'Unknown'}\n↓\n${metadata.toString || 'Unknown'}`;
    } else if (type === 'assignee_changed') {
      actionLine = `${author} reassigned ticket`;
      details = `${metadata.fromString || 'Unassigned'}\n↓\n${metadata.toString || 'Unassigned'}`;
    } else if (type === 'label_added' || type === 'label_removed') {
      const verb = type === 'label_added' ? 'added' : 'removed';
      actionLine = `${author} ${verb} label "${metadata.label || 'Unknown'}".`;
    } else if (type === 'attachment_added') {
      actionLine = `${author} attached a file: ${metadata.filename || 'unknown file'}.`;
    } else if (type === 'issue_synced') {
      actionLine = `Ticket synced from Jira history.`;
    } else {
      // Fallback formatter
      actionLine = `${author} performed a ${type.replace(/_/g, ' ')} action.`;
    }

    if (details) {
      return `- **[${time}]**: ${actionLine}\n  > ${details.split('\n').join('\n  > ')}`;
    }
    return `- **[${time}]**: ${actionLine}`;
  }

  private buildTimeline(items: KnowledgeItem[]): string {
    const events = items.map(item => this.formatEvent(item));
    return events.join('\n\n');
  }

  private buildArtifact(
    organizationId: string,
    resourceId: string,
    chunkItems: KnowledgeItem[],
    chunkIndex: number,
    totalChunks: number
  ): Partial<KnowledgeArtifact> {
    const latestItem = chunkItems[chunkItems.length - 1];
    const metadata = (latestItem.metadata as any) || {};
    const issueKey = metadata.issueKey || latestItem.externalResourceId || 'Unknown';
    const summary = metadata.summary || metadata.title || 'Untitled Issue';

    let title = `${issueKey}: ${summary}`;
    if (totalChunks > 1) {
      title += ` (Part ${chunkIndex})`;
    }

    const header = this.buildTicketHeader(chunkItems);
    const timeline = this.buildTimeline(chunkItems);
    
    // Close the artifact cleanly
    const content = `${header}\n\n${timeline}\n==================================================`;

    const participants = this.extractParticipants(chunkItems);

    return {
      organizationId,
      type: 'ticket_lifecycle' as any, // Type cast since ArtifactType might not have it strictly exported if it's dynamic
      provider: 'jira',
      title,
      content,
      participants: participants as any,
      metadata: {
        originalItemCount: chunkItems.length,
        resourceId,
        issueKey,
        startTime: chunkItems[0].occurredAt.toISOString(),
        endTime: latestItem.occurredAt.toISOString(),
        chunkIndex,
        totalChunks,
      },
    };
  }
}
