import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../../common/encryption.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Controller('integrations/jira')
export class JiraAuthController {
  private readonly logger = new Logger(JiraAuthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerConnectionRepo: ProviderConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  @Get('install')
  async install(@Query('organizationEyeId') organizationEyeId: string , @Res() res: Response) {
    if (!organizationEyeId) {
      throw new BadRequestException('organizationEyeId is required');
    }

    const organizationeye = await this.prisma.organizationEye.findUnique({
      where: { id: organizationEyeId },
    });

    if (!organizationeye) {
      throw new BadRequestException('Organization eye not found');
    }

    const clientId = this.configService.get<string>('JIRA_CLIENT_ID');
    const redirectUri = this.configService.get<string>('JIRA_REDIRECT_URI');
    const scopes = this.configService.get<string>('JIRA_SCOPES');
    const authUrl =
      this.configService.get<string>('JIRA_AUTH_URL') ||
      'https://auth.atlassian.com/authorize';

    if (!clientId || !redirectUri || !scopes) {
      this.logger.error('Missing Jira environment variables');
      throw new InternalServerErrorException(
        'Jira configuration is incomplete',
      );
    }

    // Securely encode organizationEyeId into state
    const stateObj = { orgEyeId: organizationEyeId };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const url = new URL(authUrl);
    url.searchParams.append('audience', 'api.atlassian.com');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('scope', scopes);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('state', state);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('prompt', 'consent');

    return res.redirect(url.toString());
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    try {
      if (!code || !state) {
        throw new BadRequestException('Missing code or state');
      }

      // Decode state
      let stateObj: { orgEyeId?: string } | undefined;
      try {
        const parsed = JSON.parse(
          Buffer.from(state, 'base64').toString('utf8'),
        ) as unknown;
        if (typeof parsed === 'object' && parsed !== null) {
          stateObj = parsed;
        }
      } catch {
        throw new BadRequestException('Invalid state format');
      }

      const organizationEyeId = stateObj?.orgEyeId;
      if (!organizationEyeId) {
        throw new BadRequestException('Invalid state: missing orgEyeId');
      }

      const clientId = this.configService.get<string>('JIRA_CLIENT_ID');
      const clientSecret = this.configService.get<string>('JIRA_CLIENT_SECRET');
      const redirectUri = this.configService.get<string>('JIRA_REDIRECT_URI');
      const tokenUrl =
        this.configService.get<string>('JIRA_TOKEN_URL') ||
        'https://auth.atlassian.com/oauth/token';

      if (!clientId || !clientSecret || !redirectUri) {
        throw new InternalServerErrorException(
          'Jira configuration is incomplete',
        );
      }

      // Exchange authorization code
      const tokenResponse = await axios.post<{
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      }>(tokenUrl, {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      const { access_token, refresh_token, expires_in, scope } =
        tokenResponse.data;

      if (!access_token) {
        throw new InternalServerErrorException(
          'Failed to retrieve access token from Jira',
        );
      }

      // Fetch accessible resources to get site info
      const resourcesResponse = await axios.get<
        {
          id: string;
          url: string;
          name: string;
          scopes: string[];
          avatarUrl: string;
        }[]
      >('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!resourcesResponse.data || resourcesResponse.data.length === 0) {
        throw new InternalServerErrorException(
          'No accessible resources found for this Jira connection',
        );
      }

      const hasMultipleSites = resourcesResponse.data.length > 1;

      let externalAccountId: string | null = null;
      let externalAccountName: string | null = null;
      let connectionMetadata: any = {};
      let status: IntegrationStatus = IntegrationStatus.connected;
      let redirectUrl = `${frontendUrl}/eyes/jira/redirect`;

      if (hasMultipleSites) {
        status = IntegrationStatus.pending;
        connectionMetadata = {
          availableSites: resourcesResponse.data.map((r) => ({
            id: r.id,
            name: r.name,
            url: r.url,
            avatarUrl: r.avatarUrl,
          })),
        };
      } else {
        const primaryResource = resourcesResponse.data[0];
        externalAccountId = primaryResource.id;
        externalAccountName = primaryResource.name;
        connectionMetadata = {
          url: primaryResource.url,
          avatarUrl: primaryResource.avatarUrl,
        };
      }

      // Encrypt tokens
      const encryptedAccessToken = this.encryptionService.encrypt(access_token);
      const encryptedRefreshToken = refresh_token
        ? this.encryptionService.encrypt(refresh_token)
        : null;

      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(
        tokenExpiresAt.getSeconds() + (expires_in || 3600),
      );

      const scopesArray = scope ? scope.split(' ') : [];

      // Find Jira provider ID
      const provider = await this.prisma.provider.findUnique({
        where: { key: 'jira' },
      });
      if (!provider) {
        throw new InternalServerErrorException(
          'Jira provider not found in database',
        );
      }

      // Update or create connection
      const existingConn =
        await this.providerConnectionRepo.findByOrganizationEyeId(
          organizationEyeId,
        );

      let connectionId;
      if (existingConn) {
        connectionId = existingConn.id;
        await this.providerConnectionRepo.update(existingConn.id, {
          externalAccountId,
          externalAccountName,
          connectionMetadata,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt,
          scopes: scopesArray,
          status,
        });
      } else {
        const newConn = await this.providerConnectionRepo.create({
          organizationEyeId,
          providerId: provider.id,
          externalAccountId,
          externalAccountName,
          connectionMetadata,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt,
          scopes: scopesArray,
          status,
          connectedAt: new Date(),
        });
        connectionId = newConn.id;
      }

      if (hasMultipleSites) {
        redirectUrl = `${frontendUrl}/eyes/jira/select-site?connectionId=${connectionId}`;
      } else {
        // Update the OrganizationEye status to 'connected'
        await this.prisma.organizationEye.update({
          where: { id: organizationEyeId },
          data: { status: 'connected' },
        });
      }

      return res.redirect(redirectUrl);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          'Jira OAuth callback failed',
          error.response?.data || error.message,
        );
      } else if (error instanceof Error) {
        this.logger.error('Jira OAuth callback failed', error.message);
      } else {
        this.logger.error('Jira OAuth callback failed', 'Unknown error');
      }
      return res.redirect(
        `${frontendUrl}/eyes/jira/error?provider=jira&error=oauth_failed`,
      );
    }
  }

  @Post('select-site')
  async selectSite(
    @Body() body: { connectionId: string; siteId: string },
  ) {
    const { connectionId, siteId } = body;
    if (!connectionId || !siteId) {
      throw new BadRequestException('connectionId and siteId are required');
    }

    const connection = await this.providerConnectionRepo.findById(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const metadata = connection.connectionMetadata as any;
    if (!metadata || !metadata.availableSites) {
      throw new BadRequestException('No available sites pending for selection');
    }

    const selectedSite = metadata.availableSites.find((s: any) => s.id === siteId);
    if (!selectedSite) {
      throw new BadRequestException('Invalid siteId provided');
    }

    const newMetadata = {
      url: selectedSite.url,
      avatarUrl: selectedSite.avatarUrl,
    };

    await this.providerConnectionRepo.update(connectionId, {
      externalAccountId: selectedSite.id,
      externalAccountName: selectedSite.name,
      connectionMetadata: newMetadata as any,
      status: 'connected',
    });

    await this.prisma.organizationEye.update({
      where: { id: connection.organizationEyeId },
      data: { status: 'connected' },
    });

    return { success: true, message: 'Site selected successfully' };
  }

  @Get('pending-sites')
  async getPendingSites(@Query('connectionId') connectionId: string) {
    if (!connectionId) {
      throw new BadRequestException('connectionId is required');
    }

    const connection = await this.providerConnectionRepo.findById(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const metadata = connection.connectionMetadata as any;
    if (!metadata || !metadata.availableSites) {
      return { sites: [] };
    }

    return { sites: metadata.availableSites };
  }
}
