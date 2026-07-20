import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { EncryptionService } from '../../../common/encryption.service';
import {
  CollectionStrategy,
  ProviderConnection,
  ProviderCursor,
  CollectionResult,
} from '../../contracts';

@Injectable()
export class JiraSyncService implements CollectionStrategy {
  private readonly logger = new Logger(JiraSyncService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  private decryptToken(connection: ProviderConnection): string {
    return this.encryptionService.decrypt(connection.accessTokenEncrypted);
  }

  private buildHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl(connection: ProviderConnection): string {
    if (!connection.externalAccountId) {
      throw new Error('Jira connection is missing externalAccountId (cloudId)');
    }
    return `https://api.atlassian.com/ex/jira/${connection.externalAccountId}/rest/api/3`;
  }

  private getAgileBaseUrl(connection: ProviderConnection): string {
    if (!connection.externalAccountId) {
      throw new Error('Jira connection is missing externalAccountId (cloudId)');
    }
    return `https://api.atlassian.com/ex/jira/${connection.externalAccountId}/rest/agile/1.0`;
  }

  /**
   * Main synchronization logic.
   * Loads selected resources, retrieves their latest state, and prepares raw events
   * for the ingestion pipeline.
   */
  async collect(
    connection: ProviderConnection,
    cursor?: ProviderCursor,
  ): Promise<CollectionResult> {
    const result: CollectionResult = {
      rawEvents: [],
      newCursor: null,
      hasMore: false,
      stats: { itemsFetched: 0, itemsStored: 0, itemsIgnored: 0 },
    };

    if (!cursor || !cursor.externalResourceId) {
      this.logger.warn(
        `Jira sync called without a specific resource cursor for connection ${connection.id}`,
      );
      return result;
    }

    const token = this.decryptToken(connection);
    const baseUrl = this.getBaseUrl(connection);
    const headers = this.buildHeaders(token);

    // The cursorValue stores the "startAt" offset for pagination or a timestamp.
    // For simplicity and robust pagination, we'll use startAt offset.
    const startAt = cursor.cursorValue ? parseInt(cursor.cursorValue, 10) : 0;
    const maxResults = 50;
    const resourceId = cursor.externalResourceId;

    try {
      // 1. First, attempt to sync treating the resource as a Project.
      // JQL: project = {resourceId} ORDER BY updated ASC
      const jql = `project = ${resourceId} ORDER BY updated ASC`;
      
      let response;
      try {
        response = await axios.post<{
          issues: any[];
          total: number;
          maxResults: number;
        }>(
          `${baseUrl}/search`,
          {
            jql,
            startAt,
            maxResults,
            expand: ['changelog', 'renderedFields'],
          },
          { headers },
        );
      } catch (err: unknown) {
        // If JQL fails with 400, it might not be a project ID, maybe it's a Board ID.
        if (axios.isAxiosError(err) && err.response?.status === 400) {
          this.logger.debug(`Resource ${resourceId} is not a valid project JQL, falling back to Board sync.`);
          
          // 2. Fallback: Treat the resource as a Board
          const agileBaseUrl = this.getAgileBaseUrl(connection);
          response = await axios.get<{
            issues: any[];
            total: number;
            maxResults: number;
          }>(`${agileBaseUrl}/board/${resourceId}/issue?startAt=${startAt}&maxResults=${maxResults}`, {
            headers,
          });
        } else {
          throw err; // Re-throw 401, 403, 429, 500, etc.
        }
      }

      const issues = response.data.issues || [];
      result.stats.itemsFetched = issues.length;

      if (issues.length === 0) {
        return result;
      }

      for (const issue of issues) {
        // Wrap the raw issue in a webhook-like structure so the adapter can transparently map it
        result.rawEvents.push({
          payload: {
            webhookEvent: 'jira:issue_updated',
            timestamp: new Date().getTime(),
            issue,
            // Extract comments directly from the issue payload to simulate comment events if needed,
            // though the adapter's mapIssue covers standard fields, and comment extraction is handled.
            comment: issue.fields?.comment?.comments?.[0] || null,
          },
          providerEventType: 'jira:issue_updated',
          providerEventId: issue.id.toString(),
        });
      }

      const total = response.data.total;
      const nextStartAt = startAt + issues.length;

      result.hasMore = nextStartAt < total;

      if (result.hasMore) {
        result.newCursor = {
          cursorValue: nextStartAt.toString(),
          lastFetchedAt: new Date(),
        };
      } else {
        // If we finished all pages, reset startAt to 0 for the next full sync, 
        // or we could use timestamps for delta sync in a more advanced implementation.
        result.newCursor = {
          cursorValue: '0', 
          lastFetchedAt: new Date(),
        };
      }

    } catch (error: unknown) {
      this.handleSyncError(error, connection.id);
    }

    return result;
  }

  private handleSyncError(error: unknown, connectionId: string) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      this.logger.error(
        `Jira Sync API Error [${status}] for connection ${connectionId}: ${JSON.stringify(data)}`,
      );

      if (status === 401 || status === 403) {
        throw new Error('Jira sync failed: Unauthorized or forbidden. Credentials may be invalid or expired.');
      } else if (status === 404) {
        throw new Error('Jira sync failed: Resource not found.');
      } else if (status === 429) {
        throw new Error('Jira sync failed: Rate limit exceeded.');
      }
    } else {
      this.logger.error(
        `Unexpected Jira Sync Error for connection ${connectionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
    throw new Error('Failed to synchronize Jira resources');
  }
}
