import { Injectable } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact } from '@prisma/client';

/**
 * Owned by Hager. Handles: github_pull_request, github_pull_request_review,
 * github_pull_request_review_comment, github_pull_request_comment, github_commit.
 * TODO(Hager): implement grouping by PR number, enrichment, formatting, chunking.
 */
@Injectable()
export class GithubPrAssemblerHelper {
  assemblePrItems(items: KnowledgeItem[]): Partial<KnowledgeArtifact>[] {
    return [];
  }
}