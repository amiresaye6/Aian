import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact } from '@prisma/client';
import { KnowledgeAssembler } from '../../processor/assemblers/knowledge-assembler.interface';
import { GithubPrAssemblerHelper } from './github-pr-assembler.helper';
import { GithubIssueAssemblerHelper } from './github-issue-assembler.helper';

const PR_SOURCE_TYPES = new Set([
  'github_pull_request',
  'github_pull_request_review',
  'github_pull_request_review_comment',
  'github_pull_request_comment',
  'github_commit',
]);

const ISSUE_SOURCE_TYPES = new Set([
  'github_issue',
  'github_issue_comment',
]);

/**
 * Orchestrator only — no grouping/formatting logic lives here.
 * Splits incoming GitHub KnowledgeItems by sourceType and delegates
 * to the PR helper (Hager) and Issue helper (Donia).
 */
@Injectable()
export class GithubAssemblerService implements KnowledgeAssembler {
  private readonly logger = new Logger(GithubAssemblerService.name);

  constructor(
    private readonly prHelper: GithubPrAssemblerHelper,
    private readonly issueHelper: GithubIssueAssemblerHelper,
  ) {}

  supports(provider: string): boolean {
    return provider.toLowerCase() === 'github';
  }

  async assemble(items: KnowledgeItem[]): Promise<Partial<KnowledgeArtifact>[]> {
    if (items.length === 0) return [];

    const prItems = items.filter((i) => PR_SOURCE_TYPES.has(i.sourceType));
    const issueItems = items.filter((i) => ISSUE_SOURCE_TYPES.has(i.sourceType));

    const unhandled = items.length - prItems.length - issueItems.length;
    if (unhandled > 0) {
      this.logger.warn(`${unhandled} GitHub item(s) with unrecognized sourceType were skipped`);
    }

    const [prArtifacts, issueArtifacts] = await Promise.all([
      Promise.resolve(this.prHelper.assemblePrItems(prItems)),
      Promise.resolve(this.issueHelper.assembleIssueItems(issueItems)),
    ]);

    return [...prArtifacts, ...issueArtifacts];
  }
}