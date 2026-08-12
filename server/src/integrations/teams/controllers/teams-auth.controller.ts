import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import { IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../../common/encryption.service';
import { ConfigService } from '@nestjs/config';
import { Provider } from '../../contracts/provider.enum';
import axios from 'axios';

@Controller('integrations/microsoft_teams')
export class TeamsAuthController {
  private readonly logger = new Logger(TeamsAuthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerConnectionRepo: ProviderConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  @Get('install')
  async install(
    @Query('organizationEyeId') organizationEyeId: string,
    @Res() res: Response,
  ) {
    if (!organizationEyeId) {
      throw new BadRequestException('organizationEyeId is required');
    }

    const organizationeye = await this.prisma.organizationEye.findUnique({
      where: { id: organizationEyeId },
    });

    if (!organizationeye) {
      throw new BadRequestException('Organization eye not found');
    }

    const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
    const redirectUri = this.configService.get<string>('TEAMS_REDIRECT_URI');
   
    const scopes = 'offline_access User.Read Team.ReadBasic.All Channel.ReadBasic.All Chat.Read ChannelMessage.Read.All Calendars.Read';
    
    const authUrl =
      this.configService.get<string>('TEAMS_AUTH_URL') ||
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

    if (!clientId || !redirectUri) {
      this.logger.error('Missing Teams environment variables');
      throw new InternalServerErrorException(
        'Teams configuration is incomplete',
      );
    }

    // Securely encode organizationEyeId into state
    const stateObj = { orgEyeId: organizationEyeId };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const url = new URL(authUrl);
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_mode', 'query');
    url.searchParams.append('scope', scopes);
    url.searchParams.append('state', state);

    this.logger.log(`Redirecting to Teams Auth URL: ${url.toString()}`);

    return res.redirect(url.toString());
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    try {
      if (error) {
        this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
        throw new BadRequestException(`OAuth error: ${errorDescription}`);
      }

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

      const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
      const clientSecret = this.configService.get<string>('TEAMS_CLIENT_SECRET');
      const redirectUri = this.configService.get<string>('TEAMS_REDIRECT_URI');
      const tokenUrl =
        this.configService.get<string>('TEAMS_TOKEN_URL') ||
        'https://login.microsoftonline.com/common/oauth2/v2.0/token';

      if (!clientId || !clientSecret || !redirectUri) {
        throw new InternalServerErrorException(
          'Teams configuration is incomplete',
        );
      }

      // Exchange authorization code
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
      params.append('grant_type', 'authorization_code');

      const tokenResponse = await axios.post<{
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      }>(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;

      if (!access_token) {
        throw new InternalServerErrorException(
          'Failed to retrieve access token from Teams',
        );
      }

      // Fetch user profile from Microsoft Graph to get external account info
      const graphBaseUrl =
        this.configService.get<string>('TEAMS_GRAPH_BASE_URL') ||
        'https://graph.microsoft.com/v1.0';

      const profileResponse = await axios.get<{
        id: string;
        displayName: string;
        userPrincipalName: string;
      }>(`${graphBaseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const profile = profileResponse.data;
      if (!profile || !profile.id) {
        throw new InternalServerErrorException(
          'Failed to retrieve user profile from Microsoft Graph',
        );
      }

      const externalAccountId = profile.id;
      const externalAccountName = profile.displayName || profile.userPrincipalName;
      const connectionMetadata = {
        userPrincipalName: profile.userPrincipalName,
      };

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

      // Find Teams provider ID
      const provider = await this.prisma.provider.findUnique({
        where: { key: Provider.TEAMS },
      });
      if (!provider) {
        throw new InternalServerErrorException(
          'Teams provider not found in database',
        );
      }

      // Update or create connection
      const existingConn =
        await this.providerConnectionRepo.findByOrganizationEyeId(
          organizationEyeId,
        );

      if (existingConn) {
        await this.providerConnectionRepo.update(existingConn.id, {
          externalAccountId,
          externalAccountName,
          connectionMetadata,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt,
          scopes: scopesArray,
          status: IntegrationStatus.connected,
        });
      } else {
        await this.providerConnectionRepo.create({
          organizationEyeId,
          providerId: provider.id,
          externalAccountId,
          externalAccountName,
          connectionMetadata,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt,
          scopes: scopesArray,
          status: IntegrationStatus.connected,
          connectedAt: new Date(),
        });
      }

      // Update the OrganizationEye status to 'connected'
      await this.prisma.organizationEye.update({
        where: { id: organizationEyeId },
        data: { status: 'connected' },
      });

      const redirectUrl = `${frontendUrl}/eyes/microsoft_teams/redirect`;
      return res.redirect(redirectUrl);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          'Teams OAuth callback failed (AxiosError)',
          error.response?.data || error.message,
        );
      } else if (error instanceof Error) {
        this.logger.error('Teams OAuth callback failed', error.message);
      } else {
        this.logger.error('Teams OAuth callback failed', 'Unknown error');
      }
      return res.redirect(
        `${frontendUrl}/eyes/microsoft_teams/error?provider=teams&error=oauth_failed`,
      );
    }
  }
}
