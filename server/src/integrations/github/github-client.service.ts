/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import {
  ProviderClient,
  ProviderConnection,
  ConnectionVerificationResult,
  ProviderResource,
} from '../contracts';
import { EncryptionService } from '../../common/encryption.service';
import {
  GithubAppEnvKeys,
  GithubApiUrls,
  GithubResourceType,
} from './github-connection.constants';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';

type HistoricalPhase =
  | 'commits'
  | 'issues'
  | 'issue_comments'
  | 'pr_review_comments'
  | 'pull_requests'
  | 'pr_reviews'
  | 'done';

/**
 * GitHub-specific implementation of ProviderClient.
 *
 * Unlike Slack (long-lived bot token), GitHub App installation tokens
 * expire every ~1 hour. This service regenerates a fresh installation
 * token on demand using the App's JWT, signed with our private key.
 */
@Injectable()
export class GithubClientService implements ProviderClient {
  private readonly logger = new Logger(GithubClientService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly connectionRepo: ProviderConnectionRepository,
  ) {}
  private isInstallationRevoked(error: any): boolean {
    const status = error?.response?.status;

    return status === 401 || status === 403 || status === 404;
  }
  private isRateLimited(error: any): boolean {
    const status = error?.response?.status;
    const remaining = error?.response?.headers?.['x-ratelimit-remaining'];

    return status === 429 || (status === 403 && remaining === '0');
  }
  /**
   * Verify the connection by listing repositories accessible to this
   * installation. If the call succeeds, the installation is still active.
   */
  async verifyConnection(
    connection: ProviderConnection,
  ): Promise<ConnectionVerificationResult> {
    try {
      const token = await this.getValidInstallationToken(connection);

      const response = await axios.get(
        `${GithubApiUrls.BASE}/installation/repositories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );

      this.logger.debug(
        `GitHub connection verified: ${response.data.total_count} repositories accessible`,
      );

      return {
        isValid: true,
        message: `Connected. ${response.data.total_count} repositories accessible.`,
        accountName: connection.externalAccountId ?? undefined,
        accountId: connection.externalAccountId ?? undefined,
      };
    } catch (error) {
      this.logger.error(
        `GitHub verifyConnection error: ${(error as Error).message}`,
      );
      if (this.isRateLimited(error)) {
        this.logger.warn('GitHub API rate limit exceeded');
        await this.connectionRepo.update(connection.id, {
          lastErrorMessage: 'GitHub API rate limit exceeded',
        });

        return {
          isValid: false,
          message: 'GitHub API rate limit exceeded. Please try again later.',
        };
      }
      if (this.isInstallationRevoked(error)) {
        this.logger.warn(
          `GitHub installation revoked for ${connection.externalAccountId}`,
        );
        await this.connectionRepo.update(connection.id, {
          status: 'disconnected',
          lastErrorMessage: 'GitHub App installation revoked',
        });
      }
      return {
        isValid: false,
        message: `Failed to verify GitHub installation: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Fetch all repositories accessible to this installation.
   * Maps each GitHub repository to a ProviderResource.
   */
  async getResources(
    connection: ProviderConnection,
  ): Promise<ProviderResource[]> {
    try {
      const token = await this.getValidInstallationToken(connection);
      const resources: ProviderResource[] = [];

      let page = 1;
      let totalCount = Infinity;

      while (resources.length < totalCount) {
        const response = await axios.get(
          `${GithubApiUrls.BASE}/installation/repositories`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
            },
            params: { per_page: 100, page },
          },
        );

        totalCount = response.data.total_count;

        for (const repo of response.data.repositories || []) {
          resources.push({
            externalResourceId: String(repo.id),
            name: repo.full_name,
            resourceType: GithubResourceType,
            metadata: {
              private: repo.private,
              defaultBranch: repo.default_branch,
              htmlUrl: repo.html_url,
            },
          });
        }

        page += 1;
        if (!response.data.repositories?.length) break; // safety exit
      }

      this.logger.log(`Fetched ${resources.length} GitHub repositories`);
      return resources;
    } catch (error) {
      if (this.isRateLimited(error)) {
        this.logger.warn('GitHub API rate limit exceeded');
        await this.connectionRepo.update(connection.id, {
          lastErrorMessage: 'GitHub API rate limit exceeded',
        });

        throw new InternalServerErrorException(
          'GitHub API rate limit exceeded. Please try again later.',
        );
      }

      if (this.isInstallationRevoked(error)) {
        this.logger.warn(
          `GitHub installation revoked for ${connection.externalAccountId}`,
        );
        await this.connectionRepo.update(connection.id, {
          status: 'disconnected',
          lastErrorMessage: 'GitHub App installation revoked',
        });

        throw new InternalServerErrorException(
          'GitHub installation has been revoked.',
        );
      }

      throw error;
    }
  }
  /**
   * Historical Sync — backfills PRs, issues, comments, and commits for a
   * single repository, page by page, resuming safely from `cursor` if the
   * process was interrupted.
   *
   * Phases run in order: commits -> issues -> issue_comments (covers both
   * issue comments and PR conversation-tab comments) -> pr_review_comments
   * (diff/code comments) -> pull_requests.
   *
   * NOTE: PR reviews (github_pull_request_review) are deferred to a future
   * enhancement — GitHub has no repo-wide "list all reviews" endpoint, only
   * a per-PR one, which needs a nested loop per PR.
   */
  async syncHistoricalResource(
    connection: ProviderConnection,
    resource: any,
    fromDate: Date,
    cursor: string | undefined,
    savePageCallback: (rawEvents: any[], nextCursor?: string) => Promise<void>,
  ): Promise<void> {
    const [owner, repo] = (resource.name as string).split('/');
    if (!owner || !repo) {
      throw new InternalServerErrorException(
        `Invalid GitHub resource name "${resource.name}", expected "owner/repo"`,
      );
    }

    const phases: HistoricalPhase[] = [
      'commits',
      'issues',
      'issue_comments',
      'pr_review_comments',
      'pull_requests',
      'pr_reviews',
    ];

    let state = this.parseHistoricalCursor(cursor, phases[0]);

    while (state.phase !== 'done') {
      const token = await this.getValidInstallationToken(connection);
      if (state.phase === 'pr_reviews') {
        const step = await this.fetchPrReviewsStep(
          owner,
          repo,
          token,
          state as any,
          fromDate,
          resource.externalResourceId,
        );
        if (step.items.length > 0) {
          await savePageCallback(step.items, step.nextCursor);
        }
        state = step.nextState;
        continue;
      }
      const page = await this.fetchHistoricalPage(
        state.phase,
        owner,
        repo,
        token,
        state.page,
        fromDate,
        resource.externalResourceId,
      );

      if (page.items.length > 0) {
        const nextCursorForThisPage = page.hasMorePages
          ? this.buildHistoricalCursor(state.phase, state.page + 1)
          : this.buildHistoricalCursor(this.nextPhase(phases, state.phase), 1);

        await savePageCallback(page.items, nextCursorForThisPage);
      }

      if (page.hasMorePages) {
        state = { phase: state.phase, page: state.page + 1, prIndex: 0, reviewPage: 1 };
      } else {
        const next = this.nextPhase(phases, state.phase);
        state = { phase: next, page: 1, prIndex: 0, reviewPage: 1 };
      }
    }

    await savePageCallback([], undefined);
  }

  private nextPhase(
    phases: HistoricalPhase[],
    current: HistoricalPhase,
  ): HistoricalPhase {
    const idx = phases.indexOf(current);
    return idx === -1 || idx === phases.length - 1 ? 'done' : phases[idx + 1];
  }

  private parseHistoricalCursor(
    cursor: string | undefined,
    defaultPhase: HistoricalPhase,
  ): { phase: HistoricalPhase; page: number; prIndex: number; reviewPage: number } {
    if (!cursor) return { phase: defaultPhase, page: 1, prIndex: 0, reviewPage: 1 };
    try {
      const parsed = JSON.parse(cursor);
      return {
        phase: parsed.phase ?? defaultPhase,
        page: parsed.page ?? 1,
        prIndex: parsed.prIndex ?? 0,
        reviewPage: parsed.reviewPage ?? 1,
      };
    } catch {
      return { phase: defaultPhase, page: 1, prIndex: 0, reviewPage: 1 };
    }
  }

  private buildHistoricalCursor(
    phase: HistoricalPhase,
    page: number,
    prIndex = 0,
    reviewPage = 1,
  ): string {
    return JSON.stringify({ phase, page, prIndex, reviewPage });
  }

  private async fetchHistoricalPage(
    phase: HistoricalPhase,
    owner: string,
    repo: string,
    token: string,
    page: number,
    fromDate: Date,
    repositoryId: string,
  ): Promise<{ items: any[]; hasMorePages: boolean }> {
    const perPage = 100;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    };

    let url: string;
    let params: Record<string, any>;

    switch (phase) {
      case 'commits':
        url = `${GithubApiUrls.BASE}/repos/${owner}/${repo}/commits`;
        params = { since: fromDate.toISOString(), per_page: perPage, page };
        break;
      case 'issues':
        url = `${GithubApiUrls.BASE}/repos/${owner}/${repo}/issues`;
        params = {
          since: fromDate.toISOString(),
          state: 'all',
          per_page: perPage,
          page,
        };
        break;
      case 'issue_comments':
        url = `${GithubApiUrls.BASE}/repos/${owner}/${repo}/issues/comments`;
        params = {
          since: fromDate.toISOString(),
          sort: 'created',
          direction: 'asc',
          per_page: perPage,
          page,
        };
        break;
      case 'pr_review_comments':
        url = `${GithubApiUrls.BASE}/repos/${owner}/${repo}/pulls/comments`;
        params = {
          since: fromDate.toISOString(),
          sort: 'created',
          direction: 'asc',
          per_page: perPage,
          page,
        };
        break;
      case 'pull_requests':
        url = `${GithubApiUrls.BASE}/repos/${owner}/${repo}/pulls`;
        params = {
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: perPage,
          page,
        };
        break;
      default:
        return { items: [], hasMorePages: false };
    }

    try {
      const response = await axios.get(url, { headers, params });
      await this.respectRateLimit(response);

      let items: any[] = response.data ?? [];

      if (phase === 'issues') {
        items = items.filter((i: any) => !i.pull_request);
      }

      let hasMorePages = items.length === perPage;

      if (phase === 'pull_requests') {
        const beforeFilter = items.length;
        items = items.filter((pr: any) => new Date(pr.updated_at) >= fromDate);
        if (items.length < beforeFilter) hasMorePages = false;
      }

      const taggedItems = items.map((item) => ({
        ...item,
        _syncSource: 'historical',
        _phase: phase,
        _repository: { id: repositoryId, full_name: `${owner}/${repo}` },
      }));

      return { items: taggedItems, hasMorePages };
    } catch (error) {
      if (this.isRateLimited(error)) {
        await this.sleepUntilRateLimitReset(error);
        return this.fetchHistoricalPage(
          phase,
          owner,
          repo,
          token,
          page,
          fromDate,
          repositoryId
        );
      }
      if (this.isInstallationRevoked(error)) {
        throw new InternalServerErrorException(
          'GitHub installation has been revoked during historical sync.',
        );
      }
      throw error;
    }
  }
  /**
   * Handles one "step" of PR Reviews backfill. Unlike other phases, reviews
   * have no repo-wide listing endpoint — we must list PRs page by page, and
   * for each PR, page through its reviews individually. State tracks the
   * PR list page, the index within that page, and the review sub-page.
   */
  private async fetchPrReviewsStep(
    owner: string,
    repo: string,
    token: string,
    state: { page: number; prIndex: number; reviewPage: number },
    fromDate: Date,
    repositoryId: string,
  ): Promise<{
    items: any[];
    nextCursor?: string;
    nextState: { phase: HistoricalPhase; page: number; prIndex: number; reviewPage: number };
  }> {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    };
    const perPage = 100;

    let prList: any[];
    try {
      const prResponse = await axios.get(
        `${GithubApiUrls.BASE}/repos/${owner}/${repo}/pulls`,
        {
          headers,
          params: {
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: perPage,
            page: state.page,
          },
        },
      );
      await this.respectRateLimit(prResponse);
      prList = (prResponse.data ?? []).filter(
        (pr: any) => new Date(pr.updated_at) >= fromDate,
      );
    } catch (error) {
      if (this.isRateLimited(error)) {
        await this.sleepUntilRateLimitReset(error);
        return this.fetchPrReviewsStep(owner, repo, token, state, fromDate, repositoryId);
      }
      throw error;
    }

    // No PRs left on this page (or we've crossed the date boundary) — done.
    if (prList.length === 0 || state.prIndex >= prList.length) {
      if (prList.length < perPage) {
        return { items: [], nextState: { phase: 'done', page: 1, prIndex: 0, reviewPage: 1 } };
      }
      return {
        items: [],
        nextState: { phase: 'pr_reviews', page: state.page + 1, prIndex: 0, reviewPage: 1 },
      };
    }

    const pr = prList[state.prIndex];

    let reviews: any[];
    try {
      const reviewResponse = await axios.get(
        `${GithubApiUrls.BASE}/repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
        { headers, params: { per_page: perPage, page: state.reviewPage } },
      );
      await this.respectRateLimit(reviewResponse);
      reviews = reviewResponse.data ?? [];
    } catch (error) {
      if (this.isRateLimited(error)) {
        await this.sleepUntilRateLimitReset(error);
        return this.fetchPrReviewsStep(owner, repo, token, state, fromDate, repositoryId);
      }
      throw error;
    }

    const taggedReviews = reviews.map((review) => ({
      ...review,
      _syncSource: 'historical',
      _phase: 'pr_reviews',
      _prNumber: pr.number,
      _repository: { id: repositoryId, full_name: `${owner}/${repo}` },
    }));

    const hasMoreReviewPages = reviews.length === perPage;

    const nextState = hasMoreReviewPages
      ? { phase: 'pr_reviews' as HistoricalPhase, page: state.page, prIndex: state.prIndex, reviewPage: state.reviewPage + 1 }
      : { phase: 'pr_reviews' as HistoricalPhase, page: state.page, prIndex: state.prIndex + 1, reviewPage: 1 };

    const nextCursor = this.buildHistoricalCursor(
      nextState.phase,
      nextState.page,
      nextState.prIndex,
      nextState.reviewPage,
    );

    return { items: taggedReviews, nextCursor, nextState };
  }

  private async respectRateLimit(response: any): Promise<void> {
    const remaining = Number(response.headers?.['x-ratelimit-remaining']);
    if (!Number.isNaN(remaining) && remaining <= 1) {
      this.logger.warn(
        'GitHub rate limit nearly exhausted during historical sync',
      );
    }
  }

  private async sleepUntilRateLimitReset(error: any): Promise<void> {
    const resetHeader = error?.response?.headers?.['x-ratelimit-reset'];
    const resetAtSeconds = resetHeader ? Number(resetHeader) : null;

    const waitMs = resetAtSeconds
      ? Math.max(resetAtSeconds * 1000 - Date.now(), 1000)
      : 60_000;

    this.logger.warn(
      `GitHub rate limit hit during historical sync. Sleeping ${Math.round(waitMs / 1000)}s.`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  /**
   * Installation tokens expire hourly. This regenerates one if the
   * stored token is missing/expired, using the App's signed JWT.
   * NOTE: This does not persist the refreshed token — persisting refreshed
   * credentials is the Collection Service's responsibility (Amir), same
   * pattern as Slack. This method only returns a usable token for the
   * current API call.
   */
  private async getValidInstallationToken(
    connection: ProviderConnection,
  ): Promise<string> {
    const now = new Date();
    const storedExpiry = connection.tokenExpiresAt
      ? new Date(connection.tokenExpiresAt)
      : null;

    // If we have a still-valid stored token, decrypt and reuse it.
    if (storedExpiry && storedExpiry > now && connection.accessTokenEncrypted) {
      return this.encryptionService.decrypt(connection.accessTokenEncrypted);
    }

    // Otherwise, mint a fresh installation token.
    const appJwt = this.generateAppJwt();
    const installationId = connection.externalAccountId;

    try {
      const response = await axios.post(
        `${GithubApiUrls.BASE}/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );

      return response.data.token;
    } catch (error) {
      if (this.isRateLimited(error)) {
        throw new InternalServerErrorException(
          'GitHub API rate limit exceeded.',
        );
      }

      if (this.isInstallationRevoked(error)) {
        throw new InternalServerErrorException(
          'GitHub App installation revoked.',
        );
      }
      throw new InternalServerErrorException(
        'PROVIDER_TOKEN_EXPIRED: could not refresh GitHub installation token',
      );
    }
  }

  /**
   * Signs a JWT using the GitHub App's private key.
   * Shared logic — used here and by GithubAuthController.
   */
  generateAppJwt(): string {
    const appId = this.configService.get<string>(GithubAppEnvKeys.APP_ID);
    const privateKeyPath = this.configService.get<string>(
      'GITHUB_APP_PRIVATE_KEY_PATH',
    );

    if (!appId || !privateKeyPath) {
      throw new InternalServerErrorException(
        'GitHub App is not configured (missing APP_ID or PRIVATE_KEY_PATH)',
      );
    }

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
      {
        iat: now - 60,
        exp: now + 9 * 60,
        iss: appId,
      },
      privateKey,
      { algorithm: 'RS256' },
    );
  }
  /**
 * Uninstalls the GitHub App from the account, revoking all repository access.
 * Unlike Slack's per-token revoke, this removes the entire installation —
 * signed with the App's JWT (not the installation token, which may already
 * be stale/expired by the time revoke is called).
 */
  async revokeCredentials(connection: ProviderConnection): Promise<void> {
    const appJwt = this.generateAppJwt();
    const installationId = connection.externalAccountId;

    try {
      await axios.delete(
        `${GithubApiUrls.BASE}/app/installations/${installationId}`,
        {
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      this.logger.log(
        `GitHub installation ${installationId} uninstalled successfully for connection ${connection.id}`,
      );
    } catch (error) {
      if (this.isInstallationRevoked(error)) {
        // Already uninstalled on GitHub's side (e.g. owner removed it manually
        // from GitHub settings) — nothing more to do, not a real failure.
        this.logger.warn(
          `GitHub installation ${installationId} was already revoked or missing`,
        );
      } else {
        this.logger.error(
          `Failed to reach GitHub API for revocation: ${(error as Error).message}`,
        );
      }
      // Same principle as Slack: log and swallow — don't throw, so the DB
      // cleanup in eyes.controller.ts still proceeds even if GitHub's side fails.
    }
  }
}
