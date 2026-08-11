import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
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

import {
  TeamsIntegrationError,
  MicrosoftGraphTeam,
  MicrosoftGraphChannel,
} from '../types/teams.types';

/**
 * Microsoft Teams (Graph API) Client Service Foundation.
 * 
 * Provides centralized authentication, token management, error handling,
 * and resilient HTTP request wrapping for Microsoft Graph operations.
 */
@Injectable()
export class TeamsClientService implements ProviderClient {
  private readonly logger = new Logger(TeamsClientService.name);

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
    private readonly providerConnectionRepo: ProviderConnectionRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Microsoft Graph Base URL from configuration.
   */
  private getBaseUrl(): string {
    return (
      this.configService.get<string>('TEAMS_GRAPH_BASE_URL') ||
      'https://graph.microsoft.com/v1.0'
    );
  }

  /**
   * Refreshes the Microsoft Graph OAuth token.
   */
  async refreshCredentials(
    connection: ProviderConnection,
  ): Promise<RefreshedCredentials> {
    const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('TEAMS_CLIENT_SECRET');
    const tokenUrl =
      this.configService.get<string>('TEAMS_TOKEN_URL') ||
      'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Teams configuration is missing for token refresh',
      );
    }

    if (!connection.refreshTokenEncrypted) {
      throw new Error(
        `Cannot refresh Teams credentials for connection ${connection.id} - no refresh token`,
      );
    }

    const refreshToken = this.encryptionService.decrypt(
      connection.refreshTokenEncrypted,
    );

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    try {
      const response = await axios.post<{
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      }>(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;

      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(
        tokenExpiresAt.getSeconds() + (data.expires_in || 3600),
      );

      const refreshed: RefreshedCredentials = {
        accessTokenEncrypted: this.encryptionService.encrypt(data.access_token),
        tokenExpiresAt,
      };

      if (data.refresh_token) {
        refreshed.refreshTokenEncrypted = this.encryptionService.encrypt(
          data.refresh_token,
        );
      }

      // Persist the updated tokens in the database
      await this.providerConnectionRepo.update(connection.id, {
        accessTokenEncrypted: refreshed.accessTokenEncrypted,
        refreshTokenEncrypted:
          refreshed.refreshTokenEncrypted || connection.refreshTokenEncrypted,
        tokenExpiresAt: refreshed.tokenExpiresAt,
      });

      return refreshed;
    } catch (error) {
      this.handleGraphError(error, 'Token Refresh');
      throw error; // handleGraphError throws TeamsIntegrationError
    }
  }

  /**
   * Ensures a valid token is retrieved, proactively refreshing if close to expiry.
   */
  private async getValidToken(
    connection: ProviderConnection,
    forceRefresh = false,
  ): Promise<string> {
    if (
      forceRefresh ||
      (connection.tokenExpiresAt &&
        new Date().getTime() >= connection.tokenExpiresAt.getTime() - 5 * 60000) // 5 min buffer
    ) {
      try {
        const refreshed = await this.refreshCredentials(connection);
        connection.accessTokenEncrypted = refreshed.accessTokenEncrypted;
        connection.refreshTokenEncrypted =
          refreshed.refreshTokenEncrypted || connection.refreshTokenEncrypted;
        connection.tokenExpiresAt = refreshed.tokenExpiresAt;
      } catch (err) {
        this.logger.warn(
          `Proactive token refresh failed for Teams connection ${connection.id}`,
        );
      }
    }
    return this.encryptionService.decrypt(connection.accessTokenEncrypted);
  }

  /**
   * Constructs authorization and consistency headers.
   */
  private buildHeaders(token: string, additionalHeaders?: Record<string, string>) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };
  }

  /**
   * Centralized Graph API error handler mapping to TeamsIntegrationError.
   */
  private handleGraphError(error: unknown, context: string): never {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const graphError = error.response.data?.error || {};
      const code = graphError.code || `HTTP_${status}`;
      const message = graphError.message || error.message;

      // 429 Too Many Requests, 5xx Server Errors are retryable
      const retryable = status === 429 || status >= 500;

      // Log only safe info
      this.logger.error(
        `Teams Graph Error [${context}]: ${status} ${code} - ${message}`,
      );

      throw new TeamsIntegrationError(code, message, retryable, graphError);
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Teams Unknown Error [${context}]: ${message}`);
    throw new TeamsIntegrationError(
      'INTERNAL_CLIENT_ERROR',
      message,
      true, // Unknown errors might be transient network drops
    );
  }

  /**
   * Generic request execution wrapper with implicit token management.
   */
  public async request<T>(
    connection: ProviderConnection,
    config: AxiosRequestConfig,
    forceRefresh = false,
  ): Promise<T> {
    try {
      const token = await this.getValidToken(connection, forceRefresh);
      const headers = this.buildHeaders(token, config.headers as Record<string, string>);

      // Support absolute URLs for nextLink pagination, or relative paths for base URL
      const url =
        config.url?.startsWith('http')
          ? config.url
          : `${this.getBaseUrl()}${config.url}`;

      const response = await axios({
        ...config,
        url,
        headers,
      });

      return response.data as T;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401 && !forceRefresh) {
        this.logger.log(`Received 401 from Graph, attempting force refresh for ${connection.id}`);
        return this.request<T>(connection, config, true);
      }
      this.handleGraphError(error, config.url || 'Unknown Request');
    }
  }

  public async get<T>(
    connection: ProviderConnection,
    path: string,
    params?: Record<string, any>,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(connection, { method: 'GET', url: path, params, headers });
  }

  public async post<T>(
    connection: ProviderConnection,
    path: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(connection, { method: 'POST', url: path, data, headers });
  }

  public async patch<T>(
    connection: ProviderConnection,
    path: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(connection, { method: 'PATCH', url: path, data, headers });
  }

  public async delete<T>(
    connection: ProviderConnection,
    path: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(connection, { method: 'DELETE', url: path, headers });
  }

  /**
   * Paginates through Graph API results.
   * Passing a `url` starting with http treats it as an @odata.nextLink absolute path.
   */
  public async getPaginated<T>(
    connection: ProviderConnection,
    url: string,
    params?: Record<string, any>,
  ): Promise<{ value: T[]; nextLink?: string }> {
    const response = await this.request<any>(connection, {
      method: 'GET',
      url,
      params,
    });

    return {
      value: response.value || [],
      nextLink: response['@odata.nextLink'],
    };
  }

  /**
   * Core ProviderClient Implementations
   */
  async verifyConnection(
    connection: ProviderConnection,
  ): Promise<ConnectionVerificationResult> {
    try {
      const user = await this.get<{ id: string; displayName: string }>(
        connection,
        '/me',
      );
      
      return {
        isValid: true,
        message: 'Microsoft Teams connection verified successfully.',
        accountName: user.displayName,
        accountId: user.id,
      };
    } catch (error: unknown) {
      if (error instanceof TeamsIntegrationError) {
        if (error.code === 'HTTP_401' || error.code === 'HTTP_403' || error.code === 'InvalidAuthenticationToken') {
          return {
            isValid: false,
            message: 'Unauthorized: Token is invalid or expired.',
          };
        }
      }

      return {
        isValid: false,
        message: 'Failed to communicate with Microsoft Graph API.',
      };
    }
  }

  async getResources(
    connection: ProviderConnection,
  ): Promise<ProviderResource[]> {
    const resources: ProviderResource[] = [];
    const teams: MicrosoftGraphTeam[] = [];

    // 1. Fetch all Teams in the organization
    try {
      let nextLink: string | undefined = '/teams';
      do {
        const pageResult: { value: MicrosoftGraphTeam[]; nextLink?: string } = await this.getPaginated<MicrosoftGraphTeam>(
          connection,
          nextLink as string,
        );
        if (pageResult.value && pageResult.value.length > 0) {
          teams.push(...pageResult.value);
        }
        nextLink = pageResult.nextLink;
      } while (nextLink);
    } catch (error) {
      this.logger.error(`Failed to fetch Teams for connection ${connection.id}`, error);
      throw error;
    }

    // 2. Add Teams to resources
    for (const team of teams) {
      resources.push({
        externalResourceId: team.id,
        name: team.displayName || 'Unknown Team',
        resourceType: 'team',
        metadata: {
          description: team.description || '',
        },
      });
    }

    this.logger.log(`Discovered ${teams.length} Teams for connection ${connection.id}`);

    // 3. Concurrently fetch channels for all discovered Teams (with a batch limit to prevent rate limiting)
    const BATCH_SIZE = 10; // Process 10 teams at a time
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      const channelPromises = batch.map(async (team) => {
        try {
          const channels: MicrosoftGraphChannel[] = [];
          // Note: using /channels retrieves all accessible channels (standard & private we have access to).
          // We do not use /allChannels unless explicitly requested, as it requires broader permissions.
          let nextLink: string | undefined = `/teams/${team.id}/channels`;
          
          do {
            const pageResult: { value: MicrosoftGraphChannel[]; nextLink?: string } = await this.getPaginated<MicrosoftGraphChannel>(
              connection,
              nextLink as string,
            );
            if (pageResult.value && pageResult.value.length > 0) {
              channels.push(...pageResult.value);
            }
            nextLink = pageResult.nextLink;
          } while (nextLink);

          return { teamId: team.id, channels };
        } catch (error) {
          this.logger.warn(`Failed to fetch channels for Team ${team.id}. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
          return { teamId: team.id, channels: [] }; // Return empty on failure to not block everything
        }
      });

      const results = await Promise.all(channelPromises);

      // 4. Add Channels to resources, linking them to their parent Team via metadata
      for (const result of results) {
        for (const channel of result.channels) {
          resources.push({
            externalResourceId: channel.id,
            name: channel.displayName || 'Unknown Channel',
            resourceType: 'channel',
            metadata: {
              teamId: result.teamId, // CRITICAL: This allows hierarchical rendering on the frontend
              description: channel.description || '',
              membershipType: channel.membershipType || 'standard',
            },
          });
        }
      }
    }

    this.logger.log(`Discovered a total of ${resources.length} Teams & Channels for connection ${connection.id}`);
    
    return resources;
  }

  
  async revokeCredentials(connection: ProviderConnection): Promise<void> {
    try {
      this.logger.log(`Revoking Teams credentials for connection ${connection.id}`);
      
      // Future Webhook implementations (Task 8) will need to delete graph subscriptions here
      // Example:
      // await this.deleteGraphSubscriptions(connection);

      this.logger.log(`Teams credentials successfully marked for revocation for connection ${connection.id}`);
    } catch (error) {
      this.logger.error(
        `Failed during Teams credential revocation for connection ${connection.id}`,
        error,
      );
    }
  }

  /**
   * Fetch historical messages and their threaded replies from a Teams channel.
   * Handles pagination, respects rate limits, and uses the Graph API.
   */
  async syncHistoricalResource(
    connection: ProviderConnection,
    resource: any,
    fromDate: Date,
    cursor: string | undefined,
    savePageCallback: (rawEvents: any[], nextCursor?: string) => Promise<void>,
  ): Promise<void> {
    if (connection.eyeType === 'CHAT') {
      return this.syncHistoricalChatResource(connection, resource, fromDate, cursor, savePageCallback);
    } else if (connection.eyeType === 'MEETING') {
      return this.syncHistoricalMeetingResource(connection, resource, fromDate, cursor, savePageCallback);
    } else {
      this.logger.warn(`Skipping unsupported eyeType for Teams sync: ${connection.eyeType}`);
    }
  }

  private async syncHistoricalChatResource(
    connection: ProviderConnection,
    resource: any,
    fromDate: Date,
    cursor: string | undefined,
    savePageCallback: (rawEvents: any[], nextCursor?: string) => Promise<void>,
  ): Promise<void> {
    if (resource.resourceType !== 'channel') {
      this.logger.warn(`Skipping unsupported resource type for chat sync: ${resource.resourceType}`);
      return;
    }

    const teamId = resource.metadata?.teamId;
    const channelId = resource.externalResourceId;

    if (!teamId || !channelId) {
      this.logger.error(`Missing teamId or channelId for resource ${resource.id}`);
      return;
    }

    let nextLink: string | undefined = cursor;
    let hasMore = true;

    // By default, Graph does not filter by date directly on this endpoint easily without $filter on lastModifiedDateTime
    // But we can append $filter if we don't have a cursor. 
    // Format for Graph API: YYYY-MM-DDTHH:MM:SSZ
    if (!nextLink) {
      const dateString = fromDate.toISOString();
      nextLink = `/teams/${teamId}/channels/${channelId}/messages?$filter=lastModifiedDateTime gt ${dateString}&$top=50`;
    }

    while (hasMore) {
      try {
        const pageResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(connection, nextLink as string);

        if (!pageResult.value || pageResult.value.length === 0) {
          this.logger.log(`No more messages found for channel ${channelId}`);
          hasMore = false;
          // Trigger a final save with an empty array to update the cursor if needed
          await savePageCallback([], pageResult.nextLink);
          break;
        }

        const rawEvents: any[] = [];

        // Decorate with teamId/channelId for the Adapter
        for (const msg of pageResult.value) {
          const decoratedMsg = {
            ...msg,
            channelIdentity: { teamId, channelId },
          };
          rawEvents.push(decoratedMsg);

          // If the message is a parent and has replies, fetch replies
          // Graph API returns replies separately unless we expand, but expand on replies is not supported for list messages.
          // In Teams, if replyToId is null, it's a root message. Wait, do we need to fetch replies?
          // The endpoint for replies: /teams/{teamId}/channels/{channelId}/messages/{messageId}/replies
          // Only fetch if messageType === 'message' (some are system events) and we might want to check reply count? 
          // Unfortunately Graph doesn't expose a simple replyCount property on the list endpoint, we must explicitly fetch.
          // To prevent rate limiting, we only fetch replies for standard user messages.
          if (msg.messageType === 'message' && !msg.replyToId) {
             let repliesNextLink: string | undefined = `/teams/${teamId}/channels/${channelId}/messages/${msg.id}/replies?$top=50`;
             while (repliesNextLink) {
               try {
                 const repliesResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(connection, repliesNextLink as string);
                 if (repliesResult.value) {
                   for (const reply of repliesResult.value) {
                     rawEvents.push({
                       ...reply,
                       channelIdentity: { teamId, channelId },
                     });
                   }
                 }
                 repliesNextLink = repliesResult.nextLink;
               } catch (replyErr: any) {
                 this.logger.warn(`Failed to fetch replies for message ${msg.id}: ${replyErr.message}`);
                 break;
               }
             }
          }
        }

        nextLink = pageResult.nextLink;
        if (!nextLink) {
          hasMore = false;
        }

        // Hand off to the ingest pipeline
        await savePageCallback(rawEvents, nextLink);

      } catch (error: any) {
        if (error.retryable) {
          this.logger.warn(`Transient error fetching Teams channel ${channelId}, waiting before retry: ${error.message}`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        
        this.logger.error(`Failed to sync historical resource for channel ${channelId}:`, error.message);
        throw error;
      }
    }
  }

  private async syncHistoricalMeetingResource(
    connection: ProviderConnection,
    resource: any,
    fromDate: Date,
    cursor: string | undefined,
    savePageCallback: (rawEvents: any[], nextCursor?: string) => Promise<void>,
  ): Promise<void> {
    // For organization-level meetings under delegated permissions, we discover meetings from Group calendars
    if (resource.resourceType !== 'team') {
      this.logger.warn(`Skipping unsupported resource type for meeting sync: ${resource.resourceType}. Expected 'team'`);
      return;
    }

    const teamId = resource.externalResourceId;
    if (!teamId) {
      this.logger.error(`Missing externalResourceId (teamId) for resource ${resource.id}`);
      return;
    }

    let nextLink: string | undefined = cursor;
    let hasMore = true;

    if (!nextLink) {
      const dateString = fromDate.toISOString();
      // Filter for online meetings updated after fromDate
      nextLink = `/groups/${teamId}/events?$filter=isOnlineMeeting eq true and lastModifiedDateTime gt ${dateString}&$top=50`;
    }

    while (hasMore) {
      try {
        const pageResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(connection, nextLink as string);

        if (!pageResult.value || pageResult.value.length === 0) {
          this.logger.log(`No more meetings found for team ${teamId}`);
          hasMore = false;
          await savePageCallback([], pageResult.nextLink);
          break;
        }

        const rawEvents: any[] = [];

        for (const event of pageResult.value) {
          // Decorate with teamId so the Adapter knows the organizational context
          rawEvents.push({
            ...event,
            teamIdentity: { teamId },
          });
        }

        nextLink = pageResult.nextLink;
        if (!nextLink) {
          hasMore = false;
        }

        await savePageCallback(rawEvents, nextLink);

      } catch (error: any) {
        if (error.retryable) {
          this.logger.warn(`Transient error fetching Teams group events ${teamId}, waiting before retry: ${error.message}`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        
        this.logger.error(`Failed to sync historical meeting resource for team ${teamId}:`, error.message);
        throw error;
      }
    }
  }
}
