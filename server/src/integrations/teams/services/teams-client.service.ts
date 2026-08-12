import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
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
  ) { }

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

    if (connection.eyeType === 'CHAT') {
      const teams: MicrosoftGraphTeam[] = [];

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

      const BATCH_SIZE = 10;
      for (let i = 0; i < teams.length; i += BATCH_SIZE) {
        const batch = teams.slice(i, i + BATCH_SIZE);
        const channelPromises = batch.map(async (team) => {
          try {
            const channels: MicrosoftGraphChannel[] = [];
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
            return { teamId: team.id, channels: [] };
          }
        });

        const results = await Promise.all(channelPromises);

        for (const result of results) {
          for (const channel of result.channels) {
            resources.push({
              externalResourceId: channel.id,
              name: channel.displayName || 'Unknown Channel',
              resourceType: 'channel',
              metadata: {
                teamId: result.teamId,
                description: channel.description || '',
                membershipType: channel.membershipType || 'standard',
              },
            });
          }
        }
      }

      // Fetch Chats
      try {
        let chatsNextLink: string | undefined = '/chats';
        do {
          const chatsResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(
            connection,
            chatsNextLink as string,
          );
          if (chatsResult.value && chatsResult.value.length > 0) {
            for (const chat of chatsResult.value) {
               let chatName = chat.topic || 'Group Chat';
               if (!chat.topic && chat.chatType === 'oneOnOne') {
                  chatName = 'Direct Message';
               }
               resources.push({
                 externalResourceId: chat.id,
                 name: chatName,
                 resourceType: 'chat',
                 metadata: {
                   chatType: chat.chatType,
                 },
               });
            }
          }
          chatsNextLink = chatsResult.nextLink;
        } while (chatsNextLink);
      } catch (error) {
        this.logger.warn(`Failed to fetch chats for connection ${connection.id}. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    } else if (connection.eyeType === 'MEETING') {
      // Fetch user calendars
      try {
        let calendarsNextLink: string | undefined = '/me/calendars';
        do {
          const calendarsResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(
            connection,
            calendarsNextLink as string,
          );
          if (calendarsResult.value && calendarsResult.value.length > 0) {
            for (const cal of calendarsResult.value) {
               resources.push({
                 externalResourceId: cal.id,
                 name: cal.name || 'Unknown Calendar',
                 resourceType: 'calendar',
                 metadata: {
                   canEdit: cal.canEdit,
                   owner: cal.owner,
                 },
               });
            }
          }
          calendarsNextLink = calendarsResult.nextLink;
        } while (calendarsNextLink);
      } catch (error) {
        this.logger.warn(`Failed to fetch calendars for connection ${connection.id}. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Also discover Teams (Groups) for group events, but map as event sources
      try {
        let nextLink: string | undefined = '/teams';
        do {
          const pageResult: { value: MicrosoftGraphTeam[]; nextLink?: string } = await this.getPaginated<MicrosoftGraphTeam>(
            connection,
            nextLink as string,
          );
          if (pageResult.value && pageResult.value.length > 0) {
            for (const team of pageResult.value) {
              resources.push({
                externalResourceId: team.id,
                name: `${team.displayName || 'Unknown Team'} (Group Events)`,
                resourceType: 'team',
                metadata: {
                  description: team.description || '',
                },
              });
            }
          }
          nextLink = pageResult.nextLink;
        } while (nextLink);
      } catch (error) {
        this.logger.warn(`Failed to fetch Teams for meeting connection ${connection.id}`, error);
      }
    }

    return resources;
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
    if (resource.resourceType !== 'channel' && resource.resourceType !== 'chat') {
      this.logger.warn(`Skipping unsupported resource type for chat sync: ${resource.resourceType}`);
      return;
    }

    const teamId = resource.metadata?.teamId;
    const resourceId = resource.externalResourceId;

    let nextLink: string | undefined = cursor;
    let hasMore = true;

    if (!nextLink) {
      const dateString = fromDate.toISOString();
      if (resource.resourceType === 'channel') {
        nextLink = `/teams/${teamId}/channels/${resourceId}/messages?$filter=lastModifiedDateTime gt ${dateString}&$top=50`;
      } else {
        nextLink = `/chats/${resourceId}/messages?$filter=lastModifiedDateTime gt ${dateString}&$top=50`;
      }
    }

    while (hasMore) {
      try {
        const pageResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(connection, nextLink as string);

        if (!pageResult.value || pageResult.value.length === 0) {
          this.logger.log(`No more messages found for ${resource.resourceType} ${resourceId}`);
          hasMore = false;
          await savePageCallback([], pageResult.nextLink);
          break;
        }

        const rawEvents: any[] = [];

        for (const msg of pageResult.value) {
          const decoratedMsg = resource.resourceType === 'channel'
            ? { ...msg, channelIdentity: { teamId, channelId: resourceId } }
            : { ...msg, chatId: resourceId };
          rawEvents.push(decoratedMsg);

          if (resource.resourceType === 'channel' && msg.messageType === 'message' && !msg.replyToId) {
            let repliesNextLink: string | undefined = `/teams/${teamId}/channels/${resourceId}/messages/${msg.id}/replies?$top=50`;
            while (repliesNextLink) {
              try {
                const repliesResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(connection, repliesNextLink as string);
                if (repliesResult.value) {
                  for (const reply of repliesResult.value) {
                    rawEvents.push({
                      ...reply,
                      channelIdentity: { teamId, channelId: resourceId },
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

        await savePageCallback(rawEvents, nextLink);

      } catch (error: any) {
        if (error.retryable) {
          this.logger.warn(`Transient error fetching Teams ${resource.resourceType} ${resourceId}, waiting before retry: ${error.message}`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        this.logger.error(`Failed to sync historical resource for ${resource.resourceType} ${resourceId}:`, error.message);
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
    if (resource.resourceType !== 'team' && resource.resourceType !== 'calendar') {
      this.logger.warn(`Skipping unsupported resource type for meeting sync: ${resource.resourceType}`);
      return;
    }

    const resourceId = resource.externalResourceId;
    let nextLink: string | undefined = cursor;
    let hasMore = true;

    if (!nextLink) {
      const dateString = fromDate.toISOString();
      if (resource.resourceType === 'team') {
        nextLink = `/groups/${resourceId}/events?$filter=isOnlineMeeting eq true and lastModifiedDateTime gt ${dateString}&$top=50`;
      } else {
        nextLink = `/me/calendars/${resourceId}/events?$filter=isOnlineMeeting eq true and lastModifiedDateTime gt ${dateString}&$top=50`;
      }
    }

    while (hasMore) {
      try {
        const pageResult: { value: any[]; nextLink?: string } = await this.getPaginated<any>(connection, nextLink as string);

        if (!pageResult.value || pageResult.value.length === 0) {
          this.logger.log(`No more meetings found for ${resource.resourceType} ${resourceId}`);
          hasMore = false;
          await savePageCallback([], pageResult.nextLink);
          break;
        }

        const rawEvents: any[] = [];
        for (const event of pageResult.value) {
          if (resource.resourceType === 'team') {
            rawEvents.push({ ...event, teamIdentity: { teamId: resourceId } });
          } else {
            rawEvents.push({ ...event, calendarIdentity: { calendarId: resourceId } });
          }
        }

        nextLink = pageResult.nextLink;
        if (!nextLink) {
          hasMore = false;
        }

        await savePageCallback(rawEvents, nextLink);

      } catch (error: any) {
        if (error.retryable) {
          this.logger.warn(`Transient error fetching events for ${resource.resourceType} ${resourceId}, waiting before retry: ${error.message}`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        this.logger.error(`Failed to sync historical meeting resource for ${resource.resourceType} ${resourceId}:`, error.message);
        throw error;
      }
    }
  }


  async onResourcesSelected(
    connection: ProviderConnection,
    selectedResources: any[],
  ): Promise<void> {
    this.logger.log(`Attempting to create subscriptions for connection ${connection.id}`);

    const baseUrl = this.getBaseUrl();
    const token = await this.getValidToken(connection);
    const headers = this.buildHeaders(token);

    const apiUrl = this.configService.get<string>('TEAMS_API_URL') ||
      this.configService.get<string>('WEBHOOK_BASE_URL') ||
      this.configService.get<string>('BACKEND_URL');

    if (!apiUrl) {
      this.logger.error('TEAMS_API_URL or BACKEND_URL is missing, cannot register webhooks');
      return;
    }

    const notificationUrl = `${apiUrl}/api/v1/integrations/microsoft_teams/events/${connection.id}`;

    const currentMetadata = (connection.connectionMetadata || {}) as any;
    const existingSubscriptions = currentMetadata.subscriptions || [];
    const newSubscriptions: any[] = [];

    for (const res of selectedResources) {
      let resourcePath = '';
      let expirationMinutes = 59; // Max 60 mins for channel and chat messages

      if (res.resourceType === 'channel' && connection.eyeType === 'CHAT') {
        const teamId = res.metadata?.teamId || res.externalResourceId.split(':')[0];
        resourcePath = `/teams/${teamId}/channels/${res.externalResourceId}/messages`;
      } else if (res.resourceType === 'chat' && connection.eyeType === 'CHAT') {
        resourcePath = `/chats/${res.externalResourceId}/messages`;
      } else if (res.resourceType === 'team' && connection.eyeType === 'MEETING') {
        resourcePath = `/groups/${res.externalResourceId}/events`;
        expirationMinutes = 4230; // Max 4230 mins for events
      } else if (res.resourceType === 'calendar' && connection.eyeType === 'MEETING') {
        resourcePath = `/me/calendars/${res.externalResourceId}/events`;
        expirationMinutes = 4230;
      } else {
        continue;
      }

      const expirationDateTime = new Date();
      expirationDateTime.setMinutes(expirationDateTime.getMinutes() + expirationMinutes);
      const clientState = crypto.randomBytes(32).toString('hex');

      try {
        const response = await axios.post(
          `${baseUrl}/subscriptions`,
          {
            changeType: 'created,updated',
            notificationUrl,
            resource: resourcePath,
            expirationDateTime: expirationDateTime.toISOString(),
            clientState,
          },
          { headers }
        );

        newSubscriptions.push({
          resourceId: res.externalResourceId,
          subscriptionId: response.data.id,
          expirationDateTime: response.data.expirationDateTime,
          clientState,
        });

        this.logger.log(`Created subscription ${response.data.id} for resource ${resourcePath}`);
      } catch (error: any) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          this.logger.warn(`Expected Limitation: Graph rejected subscription for ${resourcePath} under current permissions.`);
        } else {
          this.logger.error(`Failed to create subscription for ${resourcePath}: ${error.response?.data?.error?.message || error.message}`);
        }
      }
    }

    if (newSubscriptions.length > 0) {
      await this.providerConnectionRepo.updateConnectionMetadata(connection.id, {
        ...currentMetadata,
        subscriptions: [...existingSubscriptions, ...newSubscriptions],
      });
    }
  }

  async revokeCredentials(connection: ProviderConnection): Promise<void> {
    const currentMetadata = (connection.connectionMetadata || {}) as any;
    const subscriptions = currentMetadata.subscriptions || [];

    if (subscriptions.length > 0) {
      const baseUrl = this.getBaseUrl();
      let token: string | null = null;
      try {
        token = await this.getValidToken(connection);
      } catch (err) {
        this.logger.warn(`Could not get valid token to revoke subscriptions for ${connection.id}`);
      }

      if (token) {
        const headers = this.buildHeaders(token);
        for (const sub of subscriptions) {
          try {
            await axios.delete(`${baseUrl}/subscriptions/${sub.subscriptionId}`, { headers });
            this.logger.log(`Deleted Graph subscription ${sub.subscriptionId}`);
          } catch (err: any) {
            this.logger.warn(`Failed to delete Graph subscription ${sub.subscriptionId}: ${err.message}`);
          }
        }
      }
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
  }

  @Cron('0 */15 * * * *')
  async handleSubscriptionRenewals() {
    this.logger.debug('Running Teams Graph Subscription renewals check...');

    const provider = await this.prisma.provider.findUnique({ where: { key: 'microsoft_teams' } });
    if (!provider) return;

    const connections = await this.prisma.providerConnection.findMany({
      where: { providerId: provider.id, status: 'connected' },
    });

    for (const conn of connections) {
      try {
        const currentMetadata = (conn.connectionMetadata || {}) as any;
        const subscriptions = currentMetadata.subscriptions || [];

        if (subscriptions.length === 0) continue;

        const now = new Date();
        const renewalsNeeded = subscriptions.filter((sub: any) => {
          const exp = new Date(sub.expirationDateTime);
          // Renew if expiring in less than 30 minutes
          return (exp.getTime() - now.getTime()) < 30 * 60 * 1000;
        });

        if (renewalsNeeded.length === 0) continue;

        const fullConnection = await this.providerConnectionRepo.findByIdMapped(conn.id);
        if (!fullConnection) continue;

        const token = await this.getValidToken(fullConnection);
        const headers = this.buildHeaders(token);
        const baseUrl = this.getBaseUrl();

        const updatedSubscriptions = [...subscriptions];

        for (const sub of renewalsNeeded) {
          try {
            // Channel messages get 59 mins, events get 3 days. +59 mins is safe for both.
            const newExp = new Date();
            newExp.setMinutes(newExp.getMinutes() + 59);

            const response = await axios.patch(`${baseUrl}/subscriptions/${sub.subscriptionId}`, {
              expirationDateTime: newExp.toISOString()
            }, { headers });

            const index = updatedSubscriptions.findIndex(s => s.subscriptionId === sub.subscriptionId);
            if (index > -1) {
              updatedSubscriptions[index].expirationDateTime = response.data.expirationDateTime;
            }
            this.logger.debug(`Renewed subscription ${sub.subscriptionId}`);
          } catch (err: any) {
            if (err.response?.status === 404) {
              this.logger.warn(`Subscription ${sub.subscriptionId} not found, removing from list.`);
              const index = updatedSubscriptions.findIndex(s => s.subscriptionId === sub.subscriptionId);
              if (index > -1) updatedSubscriptions.splice(index, 1);
            } else {
              this.logger.error(`Failed to renew subscription ${sub.subscriptionId}: ${err.message}`);
            }
          }
        }

        await this.providerConnectionRepo.updateConnectionMetadata(conn.id, {
          ...currentMetadata,
          subscriptions: updatedSubscriptions
        });

      } catch (err: any) {
        this.logger.error(`Failed to process subscription renewals for connection ${conn.id}: ${err.message}`);
      }
    }
  }
}
