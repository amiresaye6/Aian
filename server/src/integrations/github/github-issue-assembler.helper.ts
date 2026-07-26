import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';

const MAX_ITEMS_PER_ARTIFACT = 50; // per sprint_3 doc: entity-bound chunking limit

@Injectable()
export class GithubIssueAssemblerHelper {
  private readonly logger = new Logger(GithubIssueAssemblerHelper.name);

  assembleIssueItems(items: KnowledgeItem[]): Partial<KnowledgeArtifact>[] {
    if (items.length === 0) return [];

    const organizationId = items[0].organizationId;

    // Finding 1: root `github_issue` events have parentExternalResourceId = null,
    // so we fall back to building the key from metadata.issueNumber.
    const grouped = items.reduce((acc, item) => {
      const meta = item.metadata as any;
      const key = item.parentExternalResourceId ?? `issue:${meta?.issueNumber}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, KnowledgeItem[]>);

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const [resourceId, groupItems] of Object.entries(grouped)) {
      groupItems.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

      // Chunk if it exceeds the max — sequential parts, per doc.
      const chunks: KnowledgeItem[][] = [];
      for (let i = 0; i < groupItems.length; i += MAX_ITEMS_PER_ARTIFACT) {
        chunks.push(groupItems.slice(i, i + MAX_ITEMS_PER_ARTIFACT));
      }

      chunks.forEach((chunk, idx) => {
        artifacts.push(this.buildArtifact(organizationId, resourceId, chunk, idx, chunks.length));
      });
    }

    return artifacts;
  }

  private buildArtifact(
    organizationId: string,
    resourceId: string,
    chunk: KnowledgeItem[],
    partIndex: number,
    totalParts: number,
  ): Partial<KnowledgeArtifact> {
    const rootIssue = chunk.find((i) => i.sourceType === 'github_issue');

    const lines = chunk.map((item) => this.formatLine(item));
    const content = lines.join('\n\n');

    const participantsSet = new Map<string, { externalId: string; name?: string }>();
    chunk.forEach((item) => {
      const author = item.author as any;
      if (author?.externalId) {
        participantsSet.set(author.externalId, { externalId: author.externalId, name: author.name });
      }
    });

    const baseTitle = rootIssue?.title
      ? rootIssue.title
      : `Issue ${resourceId.replace('issue:', '#')} (GitHub)`;
    const title = totalParts > 1 ? `${baseTitle} (Part ${partIndex + 1})` : baseTitle;

    const meta = chunk[0].metadata as any;

    return {
      organizationId,
      type: ArtifactType.implementation_story,
      provider: 'github',
      title,
      content,
      participants: Array.from(participantsSet.values()) as any,
      metadata: {
        resourceId,
        issueNumber: meta?.issueNumber,
        repositoryId: meta?.repositoryId,
        itemCount: chunk.length,
        partIndex: partIndex + 1,
        totalParts,
        startTime: chunk[0].occurredAt.toISOString(),
        endTime: chunk[chunk.length - 1].occurredAt.toISOString(),
      },
    };
  }

  private formatLine(item: KnowledgeItem): string {
    const time = item.occurredAt.toISOString();
    const author = (item.author as any)?.name ?? 'Unknown';

    if (item.sourceType === 'github_issue') {
      const action = item.eventType.replace('issue_', ''); // opened/edited/closed/reopened
      const titleLine = item.title ? `Title: ${item.title}\n` : '';
      return `[${time}] ${author} ${action} the issue.\n${titleLine}${item.content}`;
    }

    // github_issue_comment
    return `[${time}] ${author} commented: ${item.content}`;
  }
}