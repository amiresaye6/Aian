/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderAdapter,
  ProviderEventInput,
  KnowledgeItem,
  EyeType,
  Provider,
  ProviderError,
  ProviderErrorCode,
} from '../contracts';

/**
 * GitHub-specific implementation of ProviderAdapter.
 *
 * Normalizes raw GitHub webhook/polling payloads into KnowledgeItems.
 *
 * Event type resolution:
 * ProviderEventInput.providerEventType now carries the value derived from
 * GitHub's `X-GitHub-Event` header (set by WebhookEventDispatcherService).
 * When present, it is used directly via resolveEventKind(). When absent
 * (e.g. some polling paths that don't set it), the adapter falls back to
 * detecting the event type structurally from the shape of `rawPayload`
 * itself (see detectGithubEventType()), which mirrors how
 * SlackAdapterService infers `event.type` from the payload envelope.
 *
 * Supported source types:
 *   github_pull_request
 *   github_pull_request_comment      (issue_comment on a PR conversation tab)
 *   github_pull_request_review
 *   github_pull_request_review_comment (diff/code review comment)
 *   github_issue
 *   github_issue_comment
 *   github_commit
 *
 * Malformed payload handling:
 * Any payload missing required fields for its detected event type is
 * rejected with a ProviderError(PROVIDER_NORMALIZATION_FAILED) instead of
 * throwing an uncaught TypeError. BaseCollectorService catches this,
 * marks the collection_run as failed, and logs a clear error message.
 */
@Injectable()
export class GitHubAdapterService implements ProviderAdapter {
  private readonly logger = new Logger(GitHubAdapterService.name);

  /** Actions we care about for pull_request / issues events. Others (e.g. 'labeled', 'assigned') are ignored in V1. */
  private static readonly TRACKED_ACTIONS = new Set([
    'opened',
    'edited',
    'closed',
    'reopened',
  ]);

  normalizeEvent(input: ProviderEventInput): KnowledgeItem[] {
    const payload = input.rawPayload as any;
    if (payload?._syncSource === 'historical') {
      return this.normalizeHistoricalItem(input, payload);
    }
    const kind = this.resolveEventKind(input);

    switch (kind) {
      case 'pull_request':
        return this.normalizePullRequest(input, payload);
      case 'pull_request_review':
        return this.normalizePullRequestReview(input, payload);
      case 'pull_request_review_comment':
        return this.normalizePullRequestReviewComment(input, payload);
      case 'issue_comment_on_pr':
        return this.normalizeIssueComment(input, payload, true);
      case 'issue_comment_on_issue':
        return this.normalizeIssueComment(input, payload, false);
      case 'issues':
        return this.normalizeIssue(input, payload);
      case 'push':
        return this.normalizePush(input, payload);
      default:
        this.logger.debug('Ignoring unrecognized GitHub payload shape');
        return [];
    }
  }
  /**
   * Handles direct GitHub REST API objects produced by Historical Sync
   * (tagged with _syncSource/_phase/_repository by GithubClientService).
   * These have a different shape than webhook envelopes — the resource
   * itself is the top-level object, with no `action`/`repository` wrapper.
   */
  private normalizeHistoricalItem(
    input: ProviderEventInput,
    payload: any,
  ): KnowledgeItem[] {
    const phase = payload._phase;
    const repo = payload._repository;

    switch (phase) {
      case 'commits':
        return this.normalizeHistoricalCommit(input, payload, repo);
      case 'issues':
        return this.normalizeHistoricalIssue(input, payload, repo);
      case 'pull_requests':
        return this.normalizeHistoricalPullRequest(input, payload, repo);
      case 'issue_comments':
        return this.normalizeHistoricalIssueComment(input, payload, repo);
      case 'pr_review_comments':
        return this.normalizeHistoricalReviewComment(input, payload, repo);
      case 'pr_reviews':
        return this.normalizeHistoricalReview(input, payload, repo);
      default:
        this.logger.debug(`Unrecognized historical phase "${phase}"`);
        return [];
    }
  }

  private normalizeHistoricalCommit(
    input: ProviderEventInput,
    commit: any,
    repo: { id: string; full_name: string },
  ): KnowledgeItem[] {
    this.assertRequiredFields(commit, 'historical_commit', ['sha']);

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_commit',
        eventType: 'commit_pushed',
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `commit:${commit.sha}`,
        parentExternalResourceId: null,
        title: null,
        content: commit.commit?.message ?? '',
        author: commit.commit?.author
          ? {
              name: commit.commit.author.name,
              email: commit.commit.author.email,
            }
          : null,
        participants: [],
        contextLocation: repo.full_name,
        sourceUrl: commit.html_url ?? null,
        occurredAt: new Date(
          commit.commit?.author?.date ?? commit.commit?.committer?.date ?? Date.now(),
        ),
        metadata: {
          repositoryId: repo.id,
          sha: commit.sha,
          syncSource: 'historical',
        },
      }),
    ];
  }

  private normalizeHistoricalIssue(
    input: ProviderEventInput,
    issue: any,
    repo: { id: string; full_name: string },
  ): KnowledgeItem[] {
    this.assertRequiredFields(issue, 'historical_issue', ['number']);

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_issue',
        eventType: 'issue_synced',
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `issue:${issue.number}:synced:${issue.updated_at}`,
        parentExternalResourceId: null,
        title: issue.title ?? null,
        content: issue.body ?? '',
        author: issue.user
          ? { externalId: String(issue.user.id), name: issue.user.login }
          : null,
        participants: (issue.assignees ?? []).map((a: any) => ({
          externalId: String(a.id),
          name: a.login,
        })),
        contextLocation: `${repo.full_name} #${issue.number}`,
        sourceUrl: issue.html_url ?? null,
        occurredAt: new Date(issue.updated_at ?? issue.created_at ?? Date.now()),
        metadata: {
          repositoryId: repo.id,
          issueNumber: issue.number,
          state: issue.state,
          labels: (issue.labels ?? []).map((l: any) => l.name),
          syncSource: 'historical',
        },
      }),
    ];
  }

  private normalizeHistoricalPullRequest(
    input: ProviderEventInput,
    pr: any,
    repo: { id: string; full_name: string },
  ): KnowledgeItem[] {
    this.assertRequiredFields(pr, 'historical_pull_request', ['number']);

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_pull_request',
        eventType: 'pr_synced',
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `pr:${pr.number}:synced:${pr.updated_at}`,
        parentExternalResourceId: null,
        title: pr.title ?? null,
        content: pr.body ?? '',
        author: pr.user
          ? { externalId: String(pr.user.id), name: pr.user.login }
          : null,
        participants: this.extractPrParticipants(pr),
        contextLocation: `${repo.full_name} #${pr.number}`,
        sourceUrl: pr.html_url ?? null,
        occurredAt: new Date(pr.updated_at ?? pr.created_at ?? Date.now()),
        metadata: {
          repositoryId: repo.id,
          prNumber: pr.number,
          state: pr.state,
          merged: pr.merged ?? false,
          syncSource: 'historical',
        },
      }),
    ];
  }

  private normalizeHistoricalIssueComment(
    input: ProviderEventInput,
    comment: any,
    repo: { id: string; full_name: string },
  ): KnowledgeItem[] {
    this.assertRequiredFields(comment, 'historical_issue_comment', ['id', 'issue_url']);

    const issueNumber = comment.issue_url.split('/').pop();
    const isOnPr = (comment.html_url ?? '').includes('/pull/');

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: isOnPr ? 'github_pull_request_comment' : 'github_issue_comment',
        eventType: 'comment_synced',
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `comment:${comment.id}`,
        parentExternalResourceId: isOnPr ? `pr:${issueNumber}` : `issue:${issueNumber}`,
        title: null,
        content: comment.body ?? '',
        author: comment.user
          ? { externalId: String(comment.user.id), name: comment.user.login }
          : null,
        participants: [],
        contextLocation: `${repo.full_name} #${issueNumber}`,
        sourceUrl: comment.html_url ?? null,
        occurredAt: new Date(comment.updated_at ?? comment.created_at ?? Date.now()),
        metadata: {
          repositoryId: repo.id,
          issueNumber,
          syncSource: 'historical',
        },
      }),
    ];
  }

  private normalizeHistoricalReviewComment(
    input: ProviderEventInput,
    comment: any,
    repo: { id: string; full_name: string },
  ): KnowledgeItem[] {
    this.assertRequiredFields(comment, 'historical_review_comment', [
      'id',
      'pull_request_url',
    ]);

    const prNumber = comment.pull_request_url.split('/').pop();

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_pull_request_review_comment',
        eventType: 'pr_review_comment_synced',
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `pr_review_comment:${comment.id}`,
        parentExternalResourceId: `pr:${prNumber}`,
        title: null,
        content: comment.body ?? '',
        author: comment.user
          ? { externalId: String(comment.user.id), name: comment.user.login }
          : null,
        participants: [],
        contextLocation: `${repo.full_name} #${prNumber}`,
        sourceUrl: comment.html_url ?? null,
        occurredAt: new Date(comment.updated_at ?? comment.created_at ?? Date.now()),
        metadata: {
          repositoryId: repo.id,
          prNumber,
          path: comment.path,
          diffHunk: comment.diff_hunk,
          syncSource: 'historical',
        },
      }),
    ];
  }
  private normalizeHistoricalReview(
    input: ProviderEventInput,
    review: any,
    repo: { id: string; full_name: string },
  ): KnowledgeItem[] {
    this.assertRequiredFields(review, 'historical_review', ['id', '_prNumber']);

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_pull_request_review',
        eventType: 'pr_review_synced',
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `pr_review:${review.id}`,
        parentExternalResourceId: `pr:${review._prNumber}`,
        title: null,
        content: review.body ?? `Review state: ${review.state}`,
        author: review.user
          ? { externalId: String(review.user.id), name: review.user.login }
          : null,
        participants: [],
        contextLocation: `${repo.full_name} #${review._prNumber}`,
        sourceUrl: review.html_url ?? null,
        occurredAt: new Date(review.submitted_at ?? Date.now()),
        metadata: {
          repositoryId: repo.id,
          prNumber: review._prNumber,
          reviewState: review.state,
          syncSource: 'historical',
        },
      }),
    ];
  }

  getIdempotencyKey(item: KnowledgeItem): string {
    return `github:${item.organizationId}:${item.sourceType}:${item.externalResourceId}:${item.externalEventId}`;
  }

  // getExternalResourceId(input: ProviderEventInput): string {
  //   const payload = input.rawPayload as any;
  //   const repo = payload?.repository;
  //   return repo?.id ? `repo:${repo.id}` : 'unknown';
  // }
  getExternalResourceId(input: ProviderEventInput): string {
    const payload = input.rawPayload as any;
    if (payload?._syncSource === 'historical') {
      return payload._repository?.id ? `repo:${payload._repository.id}` : 'unknown';
    }
    const repo = payload?.repository;
    return repo?.id ? `repo:${repo.id}` : 'unknown';
  }

  getExternalEventId(input: ProviderEventInput): string | null {
    const payload = input.rawPayload as any;
    const kind = this.resolveEventKind(input);

    try {
      switch (kind) {
        case 'pull_request':
          return `pr:${payload.pull_request.number}:${payload.action}:${payload.pull_request.updated_at}`;
        case 'pull_request_review':
          return `pr_review:${payload.review.id}`;
        case 'pull_request_review_comment':
          return `pr_review_comment:${payload.comment.id}`;
        case 'issue_comment_on_pr':
        case 'issue_comment_on_issue':
          return `comment:${payload.comment.id}`;
        case 'issues':
          return `issue:${payload.issue.number}:${payload.action}:${payload.issue.updated_at}`;
        case 'push':
          return payload.after ?? null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  // ── Event-type resolution ────────────────────────────────────────────────

  /**
   * Resolves the GitHub event kind for a given input.
   *
   * Priority:
   * 1. input.providerEventType (from the X-GitHub-Event header, set by
   *    WebhookEventDispatcherService) — used directly when present.
   * 2. Structural detection from the payload shape (detectGithubEventType)
   *    — used as a fallback when providerEventType is not set (e.g. some
   *    polling paths).
   */
  private resolveEventKind(
    input: ProviderEventInput,
  ): ReturnType<GitHubAdapterService['detectGithubEventType']> {
    const payload = input.rawPayload as any;
    const headerType = input.providerEventType;

    if (!headerType) {
      return this.detectGithubEventType(payload);
    }

    switch (headerType) {
      case 'push':
        return 'push';
      case 'pull_request':
        return 'pull_request';
      case 'pull_request_review':
        return 'pull_request_review';
      case 'pull_request_review_comment':
        return 'pull_request_review_comment';
      case 'issues':
        return 'issues';
      case 'issue_comment':
        // GitHub sends the same header type for comments on issues AND on
        // PR conversation tabs. Still need to inspect the payload to tell
        // them apart, since GitHub doesn't distinguish this in the header.
        return payload?.issue?.pull_request
          ? 'issue_comment_on_pr'
          : 'issue_comment_on_issue';
      default:
        this.logger.debug(
          `Unrecognized providerEventType "${headerType}", falling back to shape detection`,
        );
        return this.detectGithubEventType(payload);
    }
  }

  // ── Structural event-type detection (fallback) ──────────────────────────

  private detectGithubEventType(
    payload: any,
  ):
    | 'push'
    | 'pull_request_review'
    | 'pull_request_review_comment'
    | 'issue_comment_on_pr'
    | 'issue_comment_on_issue'
    | 'pull_request'
    | 'issues'
    | 'unknown' {
    if (!payload || typeof payload !== 'object') return 'unknown';

    if (payload.commits && payload.pusher && payload.ref !== undefined) {
      return 'push';
    }
    if (payload.review && payload.pull_request) {
      return 'pull_request_review';
    }
    if (payload.comment && payload.pull_request && !payload.issue) {
      return 'pull_request_review_comment';
    }
    if (payload.comment && payload.issue) {
      return payload.issue.pull_request
        ? 'issue_comment_on_pr'
        : 'issue_comment_on_issue';
    }
    if (payload.pull_request && payload.action) {
      return 'pull_request';
    }
    if (payload.issue && payload.action) {
      return 'issues';
    }
    return 'unknown';
  }

  // ── Malformed payload validation ────────────────────────────────────────

  /**
   * Throws a ProviderError(PROVIDER_NORMALIZATION_FAILED) if any of the
   * given dot-path fields are missing/undefined/null on the payload.
   *
   * Example:
   *   this.assertRequiredFields(payload, 'pull_request', [
   *     'repository.id',
   *     'pull_request.number',
   *   ]);
   */
  private assertRequiredFields(
    payload: any,
    eventLabel: string,
    paths: string[],
  ): void {
    const missing: string[] = [];

    for (const path of paths) {
      const value = path
        .split('.')
        .reduce(
          (acc, key) => (acc === undefined || acc === null ? acc : acc[key]),
          payload,
        );

      if (value === undefined || value === null) {
        missing.push(path);
      }
    }

    if (missing.length > 0) {
      throw new ProviderError(
        ProviderErrorCode.PROVIDER_NORMALIZATION_FAILED,
        Provider.GITHUB,
        EyeType.CODING,
        `Malformed GitHub ${eventLabel} payload — missing required field(s): ${missing.join(', ')}`,
      );
    }
  }

  // ── Per-event normalizers ───────────────────────────────────────────────

  private normalizePullRequest(
    input: ProviderEventInput,
    payload: any,
  ): KnowledgeItem[] {
    if (!GitHubAdapterService.TRACKED_ACTIONS.has(payload.action)) {
      this.logger.debug(`Ignoring pull_request action: ${payload.action}`);
      return [];
    }

    this.assertRequiredFields(payload, 'pull_request', [
      'repository.id',
      'repository.full_name',
      'pull_request.number',
    ]);

    const pr = payload.pull_request;
    const repo = payload.repository;

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_pull_request',
        eventType: `pr_${payload.action}`,
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `pr:${pr.number}:${payload.action}:${pr.updated_at}`,
        parentExternalResourceId: null,
        title: pr.title ?? null,
        content: pr.body ?? '',
        author: pr.user
          ? { externalId: String(pr.user.id), name: pr.user.login }
          : null,
        participants: this.extractPrParticipants(pr),
        contextLocation: `${repo.full_name} #${pr.number}`,
        sourceUrl: pr.html_url ?? null,
        occurredAt: new Date(pr.updated_at ?? pr.created_at ?? Date.now()),
        metadata: {
          repositoryId: repo.id,
          prNumber: pr.number,
          state: pr.state,
          merged: pr.merged ?? false,
          action: payload.action,
        },
      }),
    ];
  }

  private normalizePullRequestReview(
    input: ProviderEventInput,
    payload: any,
  ): KnowledgeItem[] {
    this.assertRequiredFields(payload, 'pull_request_review', [
      'repository.id',
      'repository.full_name',
      'pull_request.number',
      'review.id',
    ]);

    const review = payload.review;
    const pr = payload.pull_request;
    const repo = payload.repository;

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_pull_request_review',
        eventType: `pr_review_${payload.action ?? 'submitted'}`,
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `pr_review:${review.id}`,
        parentExternalResourceId: `pr:${pr.number}`,
        title: null,
        content: review.body ?? `Review state: ${review.state}`,
        author: review.user
          ? { externalId: String(review.user.id), name: review.user.login }
          : null,
        participants: [],
        contextLocation: `${repo.full_name} #${pr.number}`,
        sourceUrl: review.html_url ?? null,
        occurredAt: new Date(review.submitted_at ?? Date.now()),
        metadata: {
          repositoryId: repo.id,
          prNumber: pr.number,
          reviewState: review.state,
        },
      }),
    ];
  }

  private normalizePullRequestReviewComment(
    input: ProviderEventInput,
    payload: any,
  ): KnowledgeItem[] {
    this.assertRequiredFields(payload, 'pull_request_review_comment', [
      'repository.id',
      'repository.full_name',
      'pull_request.number',
      'comment.id',
    ]);

    const comment = payload.comment;
    const pr = payload.pull_request;
    const repo = payload.repository;

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_pull_request_review_comment',
        eventType: `pr_review_comment_${payload.action ?? 'created'}`,
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `pr_review_comment:${comment.id}`,
        parentExternalResourceId: `pr:${pr.number}`,
        title: null,
        content: comment.body ?? '',
        author: comment.user
          ? { externalId: String(comment.user.id), name: comment.user.login }
          : null,
        participants: [],
        contextLocation: `${repo.full_name} #${pr.number}`,
        sourceUrl: comment.html_url ?? null,
        occurredAt: new Date(
          comment.updated_at ?? comment.created_at ?? Date.now(),
        ),
        metadata: {
          repositoryId: repo.id,
          prNumber: pr.number,
          path: comment.path,
          diffHunk: comment.diff_hunk,
        },
      }),
    ];
  }

  private normalizeIssueComment(
    input: ProviderEventInput,
    payload: any,
    isOnPr: boolean,
  ): KnowledgeItem[] {
    this.assertRequiredFields(payload, 'issue_comment', [
      'repository.id',
      'repository.full_name',
      'issue.number',
      'comment.id',
    ]);

    const comment = payload.comment;
    const issue = payload.issue;
    const repo = payload.repository;

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: isOnPr
          ? 'github_pull_request_comment'
          : 'github_issue_comment',
        eventType: `comment_${payload.action ?? 'created'}`,
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `comment:${comment.id}`,
        parentExternalResourceId: isOnPr
          ? `pr:${issue.number}`
          : `issue:${issue.number}`,
        title: null,
        content: comment.body ?? '',
        author: comment.user
          ? { externalId: String(comment.user.id), name: comment.user.login }
          : null,
        participants: [],
        contextLocation: `${repo.full_name} #${issue.number}`,
        sourceUrl: comment.html_url ?? null,
        occurredAt: new Date(
          comment.updated_at ?? comment.created_at ?? Date.now(),
        ),
        metadata: {
          repositoryId: repo.id,
          issueNumber: issue.number,
        },
      }),
    ];
  }

  private normalizeIssue(
    input: ProviderEventInput,
    payload: any,
  ): KnowledgeItem[] {
    if (!GitHubAdapterService.TRACKED_ACTIONS.has(payload.action)) {
      this.logger.debug(`Ignoring issues action: ${payload.action}`);
      return [];
    }

    this.assertRequiredFields(payload, 'issues', [
      'repository.id',
      'repository.full_name',
      'issue.number',
    ]);

    const issue = payload.issue;
    const repo = payload.repository;

    return [
      this.buildBaseItem(input, {
        eyeType: EyeType.CODING,
        sourceType: 'github_issue',
        eventType: `issue_${payload.action}`,
        externalResourceId: `repo:${repo.id}`,
        externalEventId: `issue:${issue.number}:${payload.action}:${issue.updated_at}`,
        parentExternalResourceId: null,
        title: issue.title ?? null,
        content: issue.body ?? '',
        author: issue.user
          ? { externalId: String(issue.user.id), name: issue.user.login }
          : null,
        participants: (issue.assignees ?? []).map((a: any) => ({
          externalId: String(a.id),
          name: a.login,
        })),
        contextLocation: `${repo.full_name} #${issue.number}`,
        sourceUrl: issue.html_url ?? null,
        occurredAt: new Date(
          issue.updated_at ?? issue.created_at ?? Date.now(),
        ),
        metadata: {
          repositoryId: repo.id,
          issueNumber: issue.number,
          state: issue.state,
          labels: (issue.labels ?? []).map((l: any) => l.name),
          action: payload.action,
        },
      }),
    ];
  }

  private normalizePush(
    input: ProviderEventInput,
    payload: any,
  ): KnowledgeItem[] {
    this.assertRequiredFields(payload, 'push', [
      'repository.id',
      'repository.full_name',
    ]);

    const repo = payload.repository;
    const commits: any[] = Array.isArray(payload.commits)
      ? payload.commits
      : [];

    // Skip commits missing an id — cannot generate a safe idempotency key without it.
    return commits
      .filter((commit) => {
        if (!commit?.id) {
          this.logger.warn(
            `Skipping malformed commit in push payload for repo ${repo.full_name}: missing commit.id`,
          );
          return false;
        }
        return true;
      })
      .map((commit) =>
        this.buildBaseItem(input, {
          eyeType: EyeType.CODING,
          sourceType: 'github_commit',
          eventType: 'commit_pushed',
          externalResourceId: `repo:${repo.id}`,
          externalEventId: `commit:${commit.id}`,
          parentExternalResourceId: null,
          title: null,
          content: commit.message ?? '',
          author: commit.author
            ? { name: commit.author.name, email: commit.author.email }
            : null,
          participants: [],
          contextLocation: `${repo.full_name}`,
          sourceUrl: commit.url ?? null,
          occurredAt: new Date(commit.timestamp ?? Date.now()),
          metadata: {
            repositoryId: repo.id,
            ref: payload.ref,
            sha: commit.id,
            filesChanged: {
              added: commit.added ?? [],
              modified: commit.modified ?? [],
              removed: commit.removed ?? [],
            },
          },
        }),
      );
  }

  // ── Shared helpers ───────────────────────────────────────────────────────

  private extractPrParticipants(
    pr: any,
  ): Array<{ externalId?: string; name?: string; email?: string }> {
    const participants: Array<{ externalId?: string; name?: string }> = [];
    for (const reviewer of pr.requested_reviewers ?? []) {
      participants.push({
        externalId: String(reviewer.id),
        name: reviewer.login,
      });
    }
    if (pr.assignee) {
      participants.push({
        externalId: String(pr.assignee.id),
        name: pr.assignee.login,
      });
    }
    return participants;
  }

  private buildBaseItem(
    input: ProviderEventInput,
    fields: Omit<
      KnowledgeItem,
      | 'id'
      | 'organizationId'
      | 'provider'
      | 'receivedAt'
      | 'visibility'
      | 'rawPayloadReference'
      | 'version'
    >,
  ): KnowledgeItem {
    return {
      id: undefined as any, // generated by DB
      organizationId: input.organizationId,
      provider: Provider.GITHUB,
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      rawPayloadReference: input.rawEventReference,
      version: null,
      ...fields,
    };
  }
}
