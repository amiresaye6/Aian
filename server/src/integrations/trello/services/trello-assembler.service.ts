import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';
import { KnowledgeAssembler } from '../../../processor/assemblers/knowledge-assembler.interface';

@Injectable()
export class TrelloAssemblerService implements KnowledgeAssembler {
  private readonly logger = new Logger(TrelloAssemblerService.name);

  supports(provider: string): boolean {
    return provider.toLowerCase() === 'trello';
  }

  async assemble(items: KnowledgeItem[]): Promise<Partial<KnowledgeArtifact>[]> {
    if (items.length === 0) return [];

    const organizationId = items[0].organizationId;

    // Group items by externalResourceId (Trello Card ID, List ID, or Board ID)
    // Fallback to metadata.cardId
    const grouped = this.groupItems(items);

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
      const key = item.externalResourceId || metadata.cardId || metadata.boardId || metadata.listId || 'unknown-resource';
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

  private extractParticipants(items: KnowledgeItem[]): Array<{ externalId: string, name: string, email?: string, role?: string }> {
    const map = new Map<string, { externalId: string, name: string, email?: string, role?: string }>();
    
    items.forEach((item) => {
      const author = item.author as { externalId: string, name?: string, email?: string };
      if (author && author.externalId) {
        if (!map.has(author.externalId) || (author.name && author.name !== 'Unknown')) {
          map.set(author.externalId, {
            externalId: author.externalId,
            name: author.name || 'Unknown',
            email: author.email,
          });
        }
      }

      const parts = (item.participants || []) as Array<{ externalId?: string, name?: string, email?: string, role?: string }>;
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

  private buildCardHeader(items: KnowledgeItem[]): string {
    // Attempt to find the full card snapshot if present
    const cardItem = items.find((i) => i.sourceType === 'card') || items[0];
    const latestItem = items[items.length - 1];

    const cardMeta = (cardItem.metadata as any) || {};
    const latestMeta = (latestItem.metadata as any) || {};

    const title = (cardItem.sourceType === 'card' ? cardItem.title : null) || cardMeta.cardName || latestMeta.cardName || 'Untitled Resource';
    const cardId = cardItem.externalResourceId || cardMeta.cardId || latestMeta.cardId || 'Unknown ID';
    
    // Extract base context state
    let boardName = cardMeta.boardName || latestMeta.boardName || 'Unknown Board';
    let listName = cardMeta.listName || latestMeta.listName || 'Unknown List';
    let closed = cardMeta.closed || latestMeta.closed || false;
    let due = cardMeta.due || latestMeta.due || 'None';
    const creatorName = (cardItem.author as any)?.name || 'Unknown';
    const createdDate = cardItem.occurredAt.toISOString();

    // Fast-forward state based on actions in this chunk to reflect current reality
    const activeMembers = new Set<string>();
    const activeLabels = new Set<string>();

    for (const item of items) {
      if (item.eventType === 'list_updated' || item.eventType === 'card_updated') {
        boardName = (item.metadata as any)?.boardName || boardName;
        listName = (item.metadata as any)?.listName || listName;
        const meta = item.metadata as Record<string, any>;
        if (meta && typeof meta === 'object') {
          if ('closed' in meta) {
            closed = meta.closed;
          }
          if ('due' in meta) {
            due = meta.due || 'None';
          }
        }
      }
      
      // Track members dynamically added/removed
      if (item.eventType === 'member_added') {
        const memberName = ((item.author as any)?.name) || 'Unknown Member';
        activeMembers.add(memberName);
      } else if (item.eventType === 'member_removed') {
        const memberName = ((item.author as any)?.name) || 'Unknown Member';
        activeMembers.delete(memberName);
      }
    }

    const membersList = activeMembers.size > 0 ? Array.from(activeMembers).join(', ') : 'None';
    const status = closed ? 'Archived/Closed' : 'Active';

    return `# ${title}

**Resource ID:** ${cardId}
**Board:** ${boardName}
**List:** ${listName}
**Status:** ${status}
**Due Date:** ${due}
**Members:** ${membersList}
**Creator:** ${creatorName}
**First Event in Chunk:** ${createdDate}

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

    if (type === 'card_created') {
      actionLine = `${author} created the card.`;
    } else if (type === 'card_updated') {
      actionLine = `${author} updated the card.`;
    } else if (type === 'card_deleted') {
      actionLine = `${author} deleted the card.`;
    } else if (type === 'comment_created' || type === 'comment_updated') {
      const verb = type === 'comment_created' ? 'commented' : 'updated a comment';
      actionLine = `${author} ${verb}`;
      const content = item.content ? `"${item.content.trim()}"` : '"[Empty comment]"';
      details = content;
    } else if (type === 'comment_deleted') {
      actionLine = `${author} deleted a comment.`;
    } else if (type === 'attachment_created') {
      actionLine = `${author} attached a file.`;
    } else if (type === 'attachment_deleted') {
      actionLine = `${author} removed an attachment.`;
    } else if (type === 'list_created') {
      actionLine = `${author} created a new list.`;
    } else if (type === 'list_updated') {
      actionLine = `${author} updated the list.`;
    } else if (type === 'board_updated') {
      actionLine = `${author} updated board settings.`;
    } else if (type === 'member_added') {
      actionLine = `${author} was added to the card.`;
    } else if (type === 'member_removed') {
      actionLine = `${author} was removed from the card.`;
    } else if (type === 'label_added') {
      actionLine = `${author} added a label.`;
    } else if (type === 'label_removed') {
      actionLine = `${author} removed a label.`;
    } else {
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
    const titleBase = metadata.cardName || metadata.listName || metadata.boardName || latestItem.title || 'Untitled Resource';
    const safeResourceId = resourceId || 'Unknown';

    let title = `${safeResourceId}: ${titleBase}`;
    if (totalChunks > 1) {
      title += ` (Part ${chunkIndex})`;
    }

    const header = this.buildCardHeader(chunkItems);
    const timeline = this.buildTimeline(chunkItems);
    
    // Close the artifact cleanly
    const content = `${header}\n\n${timeline}\n==================================================`;

    const participants = this.extractParticipants(chunkItems);

    return {
      organizationId,
      type: 'ticket_lifecycle' as any,
      provider: 'trello',
      title,
      content,
      participants: participants as any,
      metadata: {
        originalItemCount: chunkItems.length,
        resourceId: safeResourceId,
        startTime: chunkItems[0].occurredAt.toISOString(),
        endTime: latestItem.occurredAt.toISOString(),
        chunkIndex,
        totalChunks,
      },
    };
  }
}
