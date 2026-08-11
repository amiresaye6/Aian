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

export class TeamsIntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'TeamsIntegrationError';
  }
}

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
    // Teams Resource Discovery is reserved for Task 5
    throw new Error('Not Implemented - Resource Discovery reserved for Task 5');
  }
}
