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
  ) {}

  private decryptToken(connection: ProviderConnection): string {
    return this.encryptionService.decrypt(connection.accessTokenEncrypted);
  }

  private buildHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }

  private getBaseUrl(connection: ProviderConnection): string {
    if (!connection.externalAccountId) {
      throw new Error('Jira connection is missing externalAccountId (cloudId)');
    }
    return `https://api.atlassian.com/ex/jira/${connection.externalAccountId}/rest/api/3`;
  }

  async verifyConnection(
    connection: ProviderConnection,
  ): Promise<ConnectionVerificationResult> {
    try {
      const token = this.decryptToken(connection);
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
      const token = this.decryptToken(connection);
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

      // Fetch Boards
      const agileBaseUrl = `https://api.atlassian.com/ex/jira/${connection.externalAccountId}/rest/agile/1.0`;

      try {
        const boardsResponse = await axios.get<{
          values: {
            id: number;
            name: string;
            type: string;
            location?: { projectId: number };
          }[];
        }>(`${agileBaseUrl}/board`, { headers });

        const boards = boardsResponse.data.values || [];
        for (const board of boards) {
          resources.push({
            externalResourceId: board.id.toString(),
            name: board.name,
            resourceType: 'board',
            metadata: {
              type: board.type,
              projectId: board.location?.projectId,
            },
          });
        }
      } catch (boardError: unknown) {
        this.logger.warn(
          `Could not fetch Jira boards for connection ${connection.id}`,
          boardError instanceof AxiosError
            ? boardError.response?.data
            : boardError,
        );
      }

      // Fetch Users
      try {
        const usersResponse = await axios.get<{
          accountId: string;
          displayName: string;
          accountType: string;
          avatarUrls?: Record<string, string>;
        }[]>(`${baseUrl}/users/search`, { headers });

        const users = usersResponse.data || [];
        for (const user of users) {
          if (user.accountType === 'atlassian') {
            resources.push({
              externalResourceId: user.accountId,
              name: user.displayName,
              resourceType: 'user',
              metadata: {
                accountType: user.accountType,
                avatarUrls: user.avatarUrls,
              },
            });
          }
        }
      } catch (userError: unknown) {
        this.logger.warn(
          `Could not fetch Jira users for connection ${connection.id}`,
          userError instanceof AxiosError ? userError.response?.data : userError,
        );
      }

      return resources;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch Jira resources for connection ${connection.id}`,
        error instanceof AxiosError ? error.response?.data : error,
      );
      throw new Error('Failed to fetch Jira resources.');
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
        const token = this.decryptToken(connection);
        await axios.post(
          'https://auth.atlassian.com/oauth/token/revoke',
          {
            client_id: clientId,
            client_secret: clientSecret,
            token,
          },
        ).catch((err: unknown) => {
          if (err instanceof Error) {
            this.logger.warn(`Failed to revoke Jira token on Atlassian side: ${err.message}`);
          }
        });
      }

      await this.providerConnectionRepo.update(connection.id, {
        status: 'disconnected',
        accessTokenEncrypted: '',
        refreshTokenEncrypted: null,
      });

      await this.prisma.organizationEye.update({
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
}
