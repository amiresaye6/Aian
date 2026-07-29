import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';

const MAX_ITEMS_PER_ARTIFACT = 50; // per sprint_3 doc: entity-bound chunking limit

@Injectable()
export class GithubPrAssemblerHelper {
  private readonly logger = new Logger(GithubPrAssemblerHelper.name);

  assemblePrItems(items: KnowledgeItem[]): Partial<KnowledgeArtifact>[] {
    if (items.length === 0) return [];

    const organizationId = items[0].organizationId;

    // Group items by PR key or standalone repository key
    const grouped = items.reduce((acc, item) => {
      const key = this.resolveGroupingKey(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, KnowledgeItem[]>);

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const [key, groupItems] of Object.entries(grouped)) {
      groupItems.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

      // Chunk if group exceeds MAX_ITEMS_PER_ARTIFACT
      const chunks: KnowledgeItem[][] = [];
      for (let i = 0; i < groupItems.length; i += MAX_ITEMS_PER_ARTIFACT) {
        chunks.push(groupItems.slice(i, i + MAX_ITEMS_PER_ARTIFACT));
      }

      chunks.forEach((chunk, idx) => {
        if (key.startsWith('standalone:')) {
          artifacts.push(
            this.buildStandaloneCommitArtifact(
              organizationId,
              key,
              chunk,
              idx,
              chunks.length,
            ),
          );
        } else {
          artifacts.push(
            this.buildPrArtifact(
              organizationId,
              key,
              chunk,
              idx,
              chunks.length,
            ),
          );
        }
      });
    }

    return artifacts;
  }

  private resolveGroupingKey(item: KnowledgeItem): string {
    const meta = item.metadata as any;
    const prNumber = meta?.prNumber;

    if (item.parentExternalResourceId?.startsWith('pr:')) {
      return item.parentExternalResourceId;
    }

    if (prNumber !== undefined && prNumber !== null) {
      return `pr:${prNumber}`;
    }

    if (item.sourceType === 'github_pull_request') {
      return `pr:${meta?.prNumber ?? item.externalResourceId}`;
    }

    // Standalone item (e.g. push commit to main not tied to a PR)
    return `standalone:${item.externalResourceId}`;
  }

  private buildPrArtifact(
    organizationId: string,
    key: string,
    chunk: KnowledgeItem[],
    partIndex: number,
    totalParts: number,
  ): Partial<KnowledgeArtifact> {
    const rootPr = chunk.find((i) => i.sourceType === 'github_pull_request');
    const rootMeta = rootPr?.metadata as any;

    const prNumber = rootMeta?.prNumber ?? key.replace('pr:', '');
    const contextLoc = chunk[0].contextLocation ?? 'GitHub';

    const participantsSet = new Map<string, { externalId?: string; name?: string }>();
    chunk.forEach((item) => {
      const author = item.author as any;
      if (author) {
        const id = author.externalId ?? author.name ?? author.email;
        if (id) {
          participantsSet.set(id, {
            externalId: author.externalId,
            name: author.name ?? author.email,
          });
        }
      }
      if (Array.isArray(item.participants)) {
        item.participants.forEach((p: any) => {
          if (p?.externalId || p?.name) {
            const pid = p.externalId ?? p.name;
            participantsSet.set(pid, { externalId: p.externalId, name: p.name });
          }
        });
      }
    });

    // Content Formatting
    const sections: string[] = [];

    if (rootPr) {
      const stateStr = rootMeta?.state ? ` | State: ${rootMeta.state}` : '';
      const mergedStr = rootMeta?.merged ? ` | Merged: true` : '';
      const authorName = (rootPr.author as any)?.name ?? 'Unknown';
      sections.push(
        `=== PULL REQUEST DETAILS ===\nTitle: ${rootPr.title ?? `PR #${prNumber}`}\nAuthor: ${authorName}${stateStr}${mergedStr}\n\nDescription:\n${rootPr.content ?? '(No description provided)'}`,
      );
    }

    const commits = chunk.filter((i) => i.sourceType === 'github_commit');
    if (commits.length > 0) {
      const commitLines = commits.map((item) => {
        const time = item.occurredAt.toISOString();
        const author = (item.author as any)?.name ?? 'Unknown';
        const sha = (item.metadata as any)?.sha ? ` (sha: ${(item.metadata as any).sha.slice(0, 7)})` : '';
        return `[${time}] ${author}: ${item.content}${sha}`;
      });
      sections.push(`=== COMMITS (${commits.length}) ===\n${commitLines.join('\n')}`);
    }

    const reviewsAndComments = chunk.filter(
      (i) => i.sourceType !== 'github_pull_request' && i.sourceType !== 'github_commit',
    );
    if (reviewsAndComments.length > 0) {
      const commentLines = reviewsAndComments.map((item) => this.formatReviewOrComment(item));
      sections.push(`=== REVIEWS & COMMENTS (${reviewsAndComments.length}) ===\n${commentLines.join('\n')}`);
    }

    // Fallback if no specific section applied
    if (sections.length === 0) {
      const genericLines = chunk.map((item) => `[${item.occurredAt.toISOString()}] ${item.content}`);
      sections.push(genericLines.join('\n'));
    }

    const content = sections.join('\n\n');

    const baseTitle = rootPr?.title
      ? `PR #${prNumber} (${contextLoc}): ${rootPr.title}`
      : `PR #${prNumber} (${contextLoc}) Activity`;

    const title = totalParts > 1 ? `${baseTitle} (Part ${partIndex + 1})` : baseTitle;

    const firstMeta = chunk[0].metadata as any;

    return {
      organizationId,
      type: ArtifactType.implementation_story,
      provider: 'github',
      title,
      content,
      participants: Array.from(participantsSet.values()) as any,
      metadata: {
        resourceId: key,
        prNumber: Number(prNumber) || prNumber,
        repositoryId: firstMeta?.repositoryId,
        itemCount: chunk.length,
        partIndex: partIndex + 1,
        totalParts,
        startTime: chunk[0].occurredAt.toISOString(),
        endTime: chunk[chunk.length - 1].occurredAt.toISOString(),
      },
    };
  }

  private buildStandaloneCommitArtifact(
    organizationId: string,
    key: string,
    chunk: KnowledgeItem[],
    partIndex: number,
    totalParts: number,
  ): Partial<KnowledgeArtifact> {
    const contextLoc = chunk[0].contextLocation ?? 'GitHub';

    const participantsSet = new Map<string, { externalId?: string; name?: string }>();
    chunk.forEach((item) => {
      const author = item.author as any;
      if (author) {
        const id = author.externalId ?? author.name ?? author.email;
        if (id) {
          participantsSet.set(id, {
            externalId: author.externalId,
            name: author.name ?? author.email,
          });
        }
      }
    });

    const commitLines = chunk.map((item) => {
      const time = item.occurredAt.toISOString();
      const author = (item.author as any)?.name ?? 'Unknown';
      const sha = (item.metadata as any)?.sha ? ` (sha: ${(item.metadata as any).sha.slice(0, 7)})` : '';
      return `[${time}] ${author}: ${item.content}${sha}`;
    });

    const content = `=== STANDALONE COMMITS (${chunk.length}) ===\n${commitLines.join('\n')}`;

    const baseTitle = `Commit Activity for ${contextLoc}`;
    const title = totalParts > 1 ? `${baseTitle} (Part ${partIndex + 1})` : baseTitle;

    const firstMeta = chunk[0].metadata as any;

    return {
      organizationId,
      type: ArtifactType.implementation_story,
      provider: 'github',
      title,
      content,
      participants: Array.from(participantsSet.values()) as any,
      metadata: {
        resourceId: key,
        repositoryId: firstMeta?.repositoryId,
        itemCount: chunk.length,
        partIndex: partIndex + 1,
        totalParts,
        startTime: chunk[0].occurredAt.toISOString(),
        endTime: chunk[chunk.length - 1].occurredAt.toISOString(),
      },
    };
  }

  private formatReviewOrComment(item: KnowledgeItem): string {
    const time = item.occurredAt.toISOString();
    const author = (item.author as any)?.name ?? 'Unknown';

    if (item.sourceType === 'github_pull_request_review') {
      const reviewState = (item.metadata as any)?.reviewState ?? 'REVIEWED';
      return `[${time}] ${author} (Review: ${reviewState}): ${item.content}`;
    }

    if (item.sourceType === 'github_pull_request_review_comment') {
      const filePath = (item.metadata as any)?.path;
      const pathInfo = filePath ? ` on ${filePath}` : '';
      return `[${time}] ${author} commented${pathInfo}: ${item.content}`;
    }

    // github_pull_request_comment
    return `[${time}] ${author} commented: ${item.content}`;
  }
}