import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../../common/encryption.service';
import { ConfigService } from '@nestjs/config';
import {
  ProviderClient,
  ProviderConnection,
  ConnectionVerificationResult,
  ProviderResource,
  RefreshedCredentials,
} from '../../contracts';

@Injectable()
export class JiraClientService implements ProviderClient {
  private readonly logger = new Logger(JiraClientService.name);

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
    private readonly providerConnectionRepo: ProviderConnectionRepository,
    private readonly configService: ConfigService,
  ) { }

  private async getValidToken(connection: ProviderConnection, forceRefresh = false): Promise<string> {
    if (
      forceRefresh ||
      (connection.tokenExpiresAt &&
        new Date().getTime() >= connection.tokenExpiresAt.getTime() - 5 * 60000) // 5 min buffer
    ) {
      try {
        const refreshed = await this.refreshCredentials(connection);
        connection.accessTokenEncrypted = refreshed.accessTokenEncrypted;
        connection.refreshTokenEncrypted = refreshed.refreshTokenEncrypted || connection.refreshTokenEncrypted;
        connection.tokenExpiresAt = refreshed.tokenExpiresAt;
      } catch (err) {
        this.logger.warn(`Proactive token refresh failed for connection ${connection.id}`);
      }
    }
    return this.encryptionService.decrypt(connection.accessTokenEncrypted);
  }

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

  // Deprecated since we only track Projects now
  // private getAgileBaseUrl(connection: ProviderConnection): string {
  //   if (!connection.externalAccountId) {
  //     throw new Error('Jira connection is missing externalAccountId (cloudId)');
  //   }
  //   return `https://api.atlassian.com/ex/jira/${connection.externalAccountId}/rest/agile/1.0`;
  // }

  async verifyConnection(
    connection: ProviderConnection,
  ): Promise<ConnectionVerificationResult> {
    try {
      const token = await this.getValidToken(connection);
      const baseUrl = this.getBaseUrl(connection);

      const response = await axios.get<{
        accountId: string;
        displayName: string;
      }>(`${baseUrl}/myself`, {
        headers: this.buildHeaders(token),
      });

      const user = response.data;

      return {
        isValid: true,
        message: 'Connection verified successfully.',
        accountName: user.displayName,
        accountId: user.accountId,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to verify Jira connection ${connection.id}`,
        error instanceof AxiosError ? error.response?.data : error,
      );

      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return {
            isValid: false,
            message: 'Unauthorized: Token is invalid or expired.',
          };
        }
      }

      return {
        isValid: false,
        message: 'Failed to communicate with Jira API.',
      };
    }
  }

  async getResources(
    connection: ProviderConnection,
  ): Promise<ProviderResource[]> {
    const resources: ProviderResource[] = [];

    try {
      const token = await this.getValidToken(connection);
      const baseUrl = this.getBaseUrl(connection);
      const headers = this.buildHeaders(token);

      // Fetch Projects
      const projectsResponse = await axios.get<{
        values: {
          id: string;
          name: string;
          key: string;
          projectTypeKey: string;
          avatarUrls: Record<string, string>;
        }[];
      }>(`${baseUrl}/project/search`, { headers });

      const projects = projectsResponse.data.values || [];
      for (const project of projects) {
        resources.push({
          externalResourceId: project.id,
          name: project.name,
          resourceType: 'project',
          metadata: {
            key: project.key,
            projectTypeKey: project.projectTypeKey,
            avatarUrls: project.avatarUrls,
          },
        });
      }

      // // Fetch Boards
      // const agileBaseUrl = this.getAgileBaseUrl(connection);

      // try {
      //   const boardsResponse = await axios.get<{
      //     values: {
      //       id: number;
      //       name: string;
      //       type: string;
      //       location?: { projectId: number };
      //     }[];
      //   }>(`${agileBaseUrl}/board`, { headers });

      //   const boards = boardsResponse.data.values || [];
      //   for (const board of boards) {
      //     resources.push({
      //       externalResourceId: board.id.toString(),
      //       name: board.name,
      //       resourceType: 'board',
      //       metadata: {
      //         type: board.type,
      //         projectId: board.location?.projectId,
      //       },
      //     });
      //   }
      // } catch (boardError: unknown) {
      //   this.logger.warn(
      //     `Could not fetch Jira boards for connection ${connection.id}`,
      //     boardError instanceof AxiosError
      //       ? boardError.response?.data
      //       : boardError,
      //   );
      // }

      // // Fetch Users
      // try {
      //   const usersResponse = await axios.get<{
      //     accountId: string;
      //     displayName: string;
      //     accountType: string;
      //     avatarUrls?: Record<string, string>;
      //   }[]>(`${baseUrl}/users/search`, { headers });

      //   const users = usersResponse.data || [];
      //   for (const user of users) {
      //     if (user.accountType === 'atlassian') {
      //       resources.push({
      //         externalResourceId: user.accountId,
      //         name: user.displayName,
      //         resourceType: 'user',
      //         metadata: {
      //           accountType: user.accountType,
      //           avatarUrls: user.avatarUrls,
      //         },
      //       });
      //     }
      //   }
      // } catch (userError: unknown) {
      //   this.logger.warn(
      //     `Could not fetch Jira users for connection ${connection.id}`,
      //     userError instanceof AxiosError ? userError.response?.data : userError,
      //   );
      // }

      return resources;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch Jira resources for connection ${connection.id}`,
        error instanceof AxiosError ? error.response?.data : error,
      );
      throw new Error('Failed to fetch Jira resources.');
    }
  }

  async onResourcesSelected(
    connection: ProviderConnection,
    selectedResources: any[],
  ): Promise<void> {
    const token = await this.getValidToken(connection);
    const baseUrl = this.getBaseUrl(connection);
    const headers = this.buildHeaders(token);
    const apiUrl = this.configService.get<string>('JIRA_API_URL');
    if (!apiUrl) {
      this.logger.error('JIRA_API_URL is missing, cannot register webhooks');
      return;
    }

    const webhookUrl = `${apiUrl}/integrations/jira/events?connectionId=${connection.id}`;

    // Prepare a dynamic webhook creation payload for each selected project
    const webhooks: any[] = selectedResources.map((res) => {
      const projectKey = res.metadata?.key;
      return {
        jqlFilter: `project = ${projectKey || res.externalResourceId}`,
        events: [
          'jira:issue_created',
          'jira:issue_updated',
          'jira:issue_deleted',
          'comment_created',
          'comment_updated',
          // 'comment_deleted',
          // 'worklog_created',
          // 'worklog_updated',
          // 'worklog_deleted',
          // 'issuelink_created',
          // 'issuelink_deleted',
          // 'attachment_created',
          // 'attachment_deleted'
          'comment_deleted'
        ],
      };
    });

    // // Sprint events DO NOT support JQL filtering in Atlassian's API.
    // // They must be registered globally without a filter.
    // webhooks.push({
    //   events: [
    //     'sprint_created',
    //     'sprint_updated',
    //     'sprint_deleted',
    //     'sprint_started',
    //     'sprint_closed'
    //   ]
    // });

    try {
      // 1. Fetch all existing webhooks for this app on this site to clean up orphans
      const getWebhooksResponse = await axios.get(`${baseUrl}/webhook`, { headers });
      const existingWebhooksFromJira = getWebhooksResponse.data.values || [];
      const idsToDelete = existingWebhooksFromJira.map((w: any) => w.id);

      if (idsToDelete.length > 0) {
        this.logger.log(`Deleting ${idsToDelete.length} existing orphaned Jira webhooks before re-registering...`);
        await axios.delete(`${baseUrl}/webhook`, {
          headers,
          data: { webhookIds: idsToDelete },
        });
      }
    } catch (cleanupError: unknown) {
      this.logger.warn(`Failed to cleanup orphaned Jira webhooks: ${cleanupError}`);
    }

    try {
      const response = await axios.post(
        `${baseUrl}/webhook`,
        {
          url: webhookUrl,
          webhooks,
        },
        { headers }
      );

      const createdWebhookIds: number[] = [];
      const registrationErrors: string[] = [];

      response.data.webhookRegistrationResult?.forEach((r: any) => {
        if (r.createdWebhookId) {
          createdWebhookIds.push(r.createdWebhookId);
        } else if (r.errors) {
          registrationErrors.push(...r.errors);
        }
      });

      if (registrationErrors.length > 0) {
        this.logger.warn(`Jira rejected some webhook registrations: ${registrationErrors.join(', ')}`);
      }
      const currentMetadata = connection.connectionMetadata as any;
      const existingWebhooks = currentMetadata?.webhookIds || [];

      await this.providerConnectionRepo.updateConnectionMetadata(connection.id, {
        ...currentMetadata,
        webhookIds: [...existingWebhooks, ...createdWebhookIds],
      });

      this.logger.log(`Registered ${createdWebhookIds.length} webhooks for Jira connection ${connection.id}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to register Jira webhooks for connection ${connection.id}`,
        error instanceof AxiosError ? error.response?.data : error,
      );
    }
  }

  async refreshCredentials(
    connection: ProviderConnection,
  ): Promise<RefreshedCredentials> {
    const clientId = this.configService.get<string>('JIRA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('JIRA_CLIENT_SECRET');

    if (!connection.refreshTokenEncrypted) {
      throw new Error('No refresh token available to refresh Jira credentials');
    }

    const refreshToken = this.encryptionService.decrypt(connection.refreshTokenEncrypted);

    try {
      const response = await axios.post<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      }>('https://auth.atlassian.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 3600));

      const refreshed: RefreshedCredentials = {
        accessTokenEncrypted: this.encryptionService.encrypt(access_token),
        refreshTokenEncrypted: refresh_token ? this.encryptionService.encrypt(refresh_token) : undefined,
        tokenExpiresAt,
      };

      await this.providerConnectionRepo.update(connection.id, {
        accessTokenEncrypted: refreshed.accessTokenEncrypted,
        refreshTokenEncrypted: refreshed.refreshTokenEncrypted || null,
        tokenExpiresAt: refreshed.tokenExpiresAt,
      });

      return refreshed;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to refresh Jira credentials for connection ${connection.id}`,
        error instanceof AxiosError ? error.response?.data : error,
      );
      throw new Error('Failed to refresh Jira credentials');
    }
  }

  async revokeCredentials(connection: ProviderConnection): Promise<void> {
    try {
      const clientId = this.configService.get<string>('JIRA_CLIENT_ID');
      const clientSecret = this.configService.get<string>('JIRA_CLIENT_SECRET');

      if (clientId && clientSecret && connection.accessTokenEncrypted) {
        const token = await this.getValidToken(connection);

        // Delete all registered webhooks
        const metadata = connection.connectionMetadata as any;
        const webhookIds: number[] = metadata?.webhookIds || [];
        if (webhookIds.length > 0) {
          const baseUrl = this.getBaseUrl(connection);
          try {
            await axios.delete(`${baseUrl}/webhook`, {
              headers: this.buildHeaders(token),
              data: { webhookIds },
            });
            this.logger.log(`Deleted ${webhookIds.length} webhooks for Jira connection ${connection.id}`);
          } catch (webhookErr) {
            this.logger.warn(`Failed to delete Jira webhooks during revoke: ${webhookErr}`);
          }
        }

        await axios.post(
          'https://auth.atlassian.com/oauth/token/revoke',
          {
            client_id: clientId,
            client_secret: clientSecret,
            token,
          },
        ).catch((err: unknown) => {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            this.logger.debug('Jira token revocation endpoint returned 404 (may not be supported).');
          } else if (err instanceof Error) {
            this.logger.warn(`Failed to revoke Jira token on Atlassian side: ${err.message}`);
          }
        });
      }

      await this.providerConnectionRepo.update(connection.id, {
        status: 'disconnected',
        accessTokenEncrypted: '',
        refreshTokenEncrypted: null,
      });

      await this.prisma.organizationEye.updateMany({
        where: { id: connection.organizationEyeId },
        data: { status: 'disconnected' },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to revoke Jira credentials for connection ${connection.id}`,
        error instanceof AxiosError ? error.response?.data : error,
      );
    }
  }

  /**
   * Sync historical data for a Jira resource.
   * Fetches issues via pagination and yields them back using the savePageCallback.
   */
  async syncHistoricalResource(
    connection: ProviderConnection,
    resource: any,
    fromDate: Date,
    cursor: string | undefined,
    savePageCallback: (rawEvents: any[], nextCursor?: string) => Promise<void>,
  ): Promise<void> {
    this.logger.log(`Starting historical sync for Jira resource ${resource.externalResourceId}`);

    const token = await this.getValidToken(connection);
    const baseUrl = this.getBaseUrl(connection);
    const headers = this.buildHeaders(token);

    // Jira now uses cursor-based pagination with search/jql
    let nextPageToken: string | undefined = cursor;
    const maxResults = 50;
    let hasMore = true;

    // Use Jira's string format: 'YYYY-MM-DD HH:mm'
    const updatedStr = fromDate.toISOString().replace('T', ' ').substring(0, 16);

    // Fallback: If it's a Board, we would hit the Agile API, but for historical backfill,
    // we assume the resource is primarily an Issue container. For simplicity and robust fetching,
    // we will rely on Project JQL first. If it's a board, the Agile API does not support standard JQL search directly.
    const resourceId = resource.externalResourceId;
    const jql = `project = ${resourceId} AND updated >= "${updatedStr}" ORDER BY updated ASC`;

    while (hasMore) {
      let response;
      const payload: any = {
        jql,
        maxResults,
        expand: ['changelog', 'renderedFields'],
      };
      if (nextPageToken && nextPageToken !== '0') {
        payload.nextPageToken = nextPageToken;
      }

      try {
        response = await axios.post<{
          issues: any[];
          nextPageToken?: string;
        }>(
          `${baseUrl}/search/jql`,
          payload,
          { headers },
        );
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          this.logger.warn(`401 Unauthorized in syncHistoricalResource. Forcing token refresh...`);
          const newToken = await this.getValidToken(connection, true);
          headers.Authorization = `Bearer ${newToken}`;
          response = await axios.post<{
            issues: any[];
            nextPageToken?: string;
          }>(
            `${baseUrl}/search/jql`,
            payload,
            { headers },
          );
        } else {
          this.logger.error(`Jira search failed. Status: ${axios.isAxiosError(err) ? err.response?.status : 'unknown'}, Data: ${axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : 'none'}`);
          throw err;
        }
      }

      const issues = response.data.issues || [];
      if (issues.length === 0) {
        break; // No more issues
      }

      const rawEvents = issues.map(issue => ({
        // We pass the raw issue directly. 
        // The adapter must be updated to handle a raw issue without 'webhookEvent' wrapper.
        type: 'jira_historical_issue',
        issue,
      }));

      nextPageToken = response.data.nextPageToken;
      hasMore = !!nextPageToken;

      // Yield the page to the global engine
      await savePageCallback(rawEvents, nextPageToken);
    }

    this.logger.log(`Finished historical sync for Jira resource ${resource.externalResourceId}`);
  }
}
