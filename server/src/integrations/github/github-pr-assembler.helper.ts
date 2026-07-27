/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';

const MAX_ITEMS_PER_ARTIFACT = 50; // per sprint_3 doc: entity-bound chunking limit

/**
 * Owned by Hager. Handles: github_pull_request, github_pull_request_review,
 * github_pull_request_review_comment, github_pull_request_comment, github_commit.
 *
 * KNOWN LIMITATION: github_commit items always have parentExternalResourceId = null
 * (GithubAdapterService.normalizePush does not link commits to a PR — GitHub's push
 * webhook doesn't carry that association). Proper linkage would require an extra
 * GitHub API call (e.g. /pulls/{number}/commits) during assembly, which is out of
 * scope here. As a fallback, commits are grouped separately by repository instead
 * of by PR, so they still become artifacts instead of being silently dropped.
 * Flagging this for Amir/team — may need adapter-level enrichment later.
 */
@Injectable()
export class GithubPrAssemblerHelper {
  private readonly logger = new Logger(GithubPrAssemblerHelper.name);

  assemblePrItems(items: KnowledgeItem[]): Partial<KnowledgeArtifact>[] {
    if (items.length === 0) return [];

    const organizationId = items[0].organizationId;

    // Commits can't be linked to a PR (see class doc) — split them off up front.
    const commitItems = items.filter((i) => i.sourceType === 'github_commit');
    const prLinkedItems = items.filter((i) => i.sourceType !== 'github_commit');

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    artifacts.push(...this.assembleByPr(organizationId, prLinkedItems));
    artifacts.push(...this.assembleCommitsByRepo(organizationId, commitItems));

    return artifacts;
  }

  // ── PR-linked items (pull_request, review, review_comment, discussion comment) ──

  private assembleByPr(
    organizationId: string,
    items: KnowledgeItem[],
  ): Partial<KnowledgeArtifact>[] {
    if (items.length === 0) return [];

    // Root `github_pull_request` events have parentExternalResourceId = null,
    // so fall back to building the key from metadata.prNumber (same pattern
    // Donia used for github_issue).
    const grouped = items.reduce((acc, item) => {
      const meta = item.metadata as any;
      const key = item.parentExternalResourceId ?? `pr:${meta?.prNumber}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, KnowledgeItem[]>);

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const [resourceId, groupItems] of Object.entries(grouped)) {
      groupItems.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

      const chunks: KnowledgeItem[][] = [];
      for (let i = 0; i < groupItems.length; i += MAX_ITEMS_PER_ARTIFACT) {
        chunks.push(groupItems.slice(i, i + MAX_ITEMS_PER_ARTIFACT));
      }

      chunks.forEach((chunk, idx) => {
        artifacts.push(
          this.buildPrArtifact(organizationId, resourceId, chunk, idx, chunks.length),
        );
      });
    }

    return artifacts;
  }

  private buildPrArtifact(
    organizationId: string,
    resourceId: string,
    chunk: KnowledgeItem[],
    partIndex: number,
    totalParts: number,
  ): Partial<KnowledgeArtifact> {
    const rootPr = chunk.find((i) => i.sourceType === 'github_pull_request');

    const lines = chunk.map((item) => this.formatPrLine(item));
    const content = lines.join('\n\n');

    const participantsSet = new Map<string, { externalId: string; name?: string }>();
    chunk.forEach((item) => {
      const author = item.author as any;
      if (author?.externalId) {
        participantsSet.set(author.externalId, {
          externalId: author.externalId,
          name: author.name,
        });
      }
    });

    const meta = chunk[0].metadata as any;
    const prNumber = meta?.prNumber ?? resourceId.replace('pr:', '');

    const baseTitle = rootPr?.title
      ? `PR #${prNumber}: ${rootPr.title}`
      : `Pull Request #${prNumber} (GitHub)`;
    const title = totalParts > 1 ? `${baseTitle} (Part ${partIndex + 1})` : baseTitle;

    return {
      organizationId,
      type: ArtifactType.implementation_story,
      provider: 'github',
      title,
      content,
      participants: Array.from(participantsSet.values()) as any,
      metadata: {
        resourceId,
        prNumber,
        repositoryId: meta?.repositoryId,
        itemCount: chunk.length,
        partIndex: partIndex + 1,
        totalParts,
        startTime: chunk[0].occurredAt.toISOString(),
        endTime: chunk[chunk.length - 1].occurredAt.toISOString(),
      },
    };
  }

  private formatPrLine(item: KnowledgeItem): string {
    const time = item.occurredAt.toISOString();
    const author = (item.author as any)?.name ?? 'Unknown';

    switch (item.sourceType) {
      case 'github_pull_request': {
        const action = item.eventType.replace('pr_', ''); // opened/edited/closed/reopened
        const titleLine = item.title ? `Title: ${item.title}\n` : '';
        return `[${time}] ${author} ${action} PR:\n${titleLine}${item.content}`;
      }
      case 'github_pull_request_review': {
        const state = (item.metadata as any)?.reviewState ?? 'submitted';
        return `[${time}] ${author} reviewed (${state}): ${item.content}`;
      }
      case 'github_pull_request_review_comment': {
        const path = (item.metadata as any)?.path;
        const pathInfo = path ? ` on ${path}` : '';
        return `[${time}] ${author} left a code comment${pathInfo}: ${item.content}`;
      }
      case 'github_pull_request_comment':
        return `[${time}] ${author} commented: ${item.content}`;
      default:
        return `[${time}] ${author}: ${item.content}`;
    }
  }

  // ── Commits (no PR linkage available — grouped by repository instead) ──

  private assembleCommitsByRepo(
    organizationId: string,
    commitItems: KnowledgeItem[],
  ): Partial<KnowledgeArtifact>[] {
    if (commitItems.length === 0) return [];

    const grouped = commitItems.reduce((acc, item) => {
      const key = item.externalResourceId; // repo:<id>
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, KnowledgeItem[]>);

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const [repoKey, groupItems] of Object.entries(grouped)) {
      groupItems.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

      const chunks: KnowledgeItem[][] = [];
      for (let i = 0; i < groupItems.length; i += MAX_ITEMS_PER_ARTIFACT) {
        chunks.push(groupItems.slice(i, i + MAX_ITEMS_PER_ARTIFACT));
      }

      chunks.forEach((chunk, idx) => {
        artifacts.push(
          this.buildCommitBatchArtifact(organizationId, repoKey, chunk, idx, chunks.length),
        );
      });
    }

    if (artifacts.length > 0) {
      this.logger.debug(
        `Assembled ${artifacts.length} commit-batch artifact(s) — not linked to specific PRs (see class doc).`,
      );
    }

    return artifacts;
  }

  private buildCommitBatchArtifact(
    organizationId: string,
    repoKey: string,
    chunk: KnowledgeItem[],
    partIndex: number,
    totalParts: number,
  ): Partial<KnowledgeArtifact> {
    const meta0 = chunk[0].metadata as any;
    const repoName = chunk[0].contextLocation ?? repoKey;

    const lines = chunk.map((item) => {
      const time = item.occurredAt.toISOString();
      const author = (item.author as any)?.name ?? 'Unknown';
      const sha = (item.metadata as any)?.sha?.slice(0, 7) ?? '';
      return `[${time}] ${author} committed (${sha}): ${item.content}`;
    });

    const participantsSet = new Map<string, { externalId: string; name?: string }>();
    chunk.forEach((item) => {
      const author = item.author as any;
      if (author?.name) {
        // Commit authors often only have name/email, no externalId.
        participantsSet.set(author.name, { externalId: author.email ?? author.name, name: author.name });
      }
    });

    const baseTitle = `Commits pushed to ${repoName}`;
    const title = totalParts > 1 ? `${baseTitle} (Part ${partIndex + 1})` : baseTitle;

    return {
      organizationId,
      type: ArtifactType.implementation_story,
      provider: 'github',
      title,
      content: lines.join('\n'),
      participants: Array.from(participantsSet.values()) as any,
      metadata: {
        resourceId: repoKey,
        repositoryId: meta0?.repositoryId,
        itemCount: chunk.length,
        partIndex: partIndex + 1,
        totalParts,
        startTime: chunk[0].occurredAt.toISOString(),
        endTime: chunk[chunk.length - 1].occurredAt.toISOString(),
        note: 'Commits could not be linked to a specific PR — grouped by repository.',
      },
    };
  }
}