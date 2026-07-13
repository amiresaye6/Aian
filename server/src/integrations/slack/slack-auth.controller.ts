import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import axios from 'axios';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../common/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Handles the Slack OAuth 2.0 flow.
 *
 * Flow:
 *   1. Frontend redirects user to GET /install?organizationEyeId=...
 *   2. This controller redirects the user to Slack's OAuth consent page.
 *   3. Slack redirects back to GET /callback?code=...&state=...
 *   4. We exchange the code for tokens, encrypt them, and save the connection.
 */
@Controller('integrations/slack')
export class SlackAuthController {
  private readonly logger = new Logger(SlackAuthController.name);

  private readonly clientId = process.env.SLACK_CLIENT_ID;
  private readonly clientSecret = process.env.SLACK_CLIENT_SECRET;
  private readonly signingSecret = process.env.SLACK_SIGNING_SECRET;
  private readonly redirectUri = `http://localhost:${process.env.PORT || 1234}/api/v1/integrations/slack/callback`;

  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Step 1: Redirect user to Slack's OAuth consent page.
   * The frontend calls this with the organizationEyeId.
   */
  @Get('install')
  async install(
    @Query('organizationEyeId') organizationEyeId: string,
    @Res() res: express.Response,
  ) {
    if (!organizationEyeId) {
      throw new BadRequestException(
        'Missing organizationEyeId query parameter',
      );
    }

    if (!this.clientId) {
      throw new BadRequestException('SLACK_CLIENT_ID is not configured');
    }

    // We pass organizationEyeId in the `state` parameter so we get it back in the callback
    const scopes = 'channels:read,team:read,users:read';
    const slackAuthUrl =
      `https://slack.com/oauth/v2/authorize` +
      `?client_id=${this.clientId}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&state=${organizationEyeId}`;

    this.logger.log(`Redirecting to Slack OAuth for eye: ${organizationEyeId}`);
    return res.redirect(slackAuthUrl);
  }

  /**
   * Step 2: Slack redirects here after the user grants access.
   * We exchange the authorization code for an access token.
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
  ) {
    // Handle user denying the OAuth request
    if (error) {
      this.logger.warn(`Slack OAuth denied: ${error}`);
      throw new BadRequestException(`Slack authorization was denied: ${error}`);
    }

    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    const organizationEyeId = state;

    // Verify the OrganizationEye exists
    const eye = await this.prisma.organizationEye.findUnique({
      where: { id: organizationEyeId },
    });

    if (!eye) {
      throw new BadRequestException(
        `OrganizationEye ${organizationEyeId} not found`,
      );
    }

    // Look up the Slack provider record to get its DB UUID
    const slackProvider = await this.prisma.provider.findUnique({
      where: { key: 'slack' },
    });

    if (!slackProvider) {
      throw new BadRequestException(
        'Slack provider not found in database. Did you run the seed?',
      );
    }

    try {
      // Exchange the code for an access token via Slack's API
      const tokenResponse = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          code,
          redirect_uri: this.redirectUri,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const data = tokenResponse.data;

      if (!data.ok) {
        this.logger.error(`Slack token exchange failed: ${data.error}`);
        throw new BadRequestException(
          `Slack token exchange failed: ${data.error}`,
        );
      }

      /*
       * Slack's oauth.v2.access response shape:
       * {
       *   ok: true,
       *   access_token: "xoxb-...",
       *   token_type: "bot",
       *   scope: "channels:read,team:read,users:read",
       *   bot_user_id: "U12345678",
       *   app_id: "A12345678",
       *   team: { id: "T12345678", name: "Acme Corp" },
       *   authed_user: { id: "U87654321" },
       * }
       */
      const accessToken = data.access_token;
      const teamId = data.team?.id;
      const teamName = data.team?.name;
      const scopes = data.scope?.split(',') || [];

      // Encrypt the access token and signing secret before storage
      const encryptedAccessToken = this.encryptionService.encrypt(accessToken);
      const encryptedWebhookSecret = this.signingSecret
        ? this.encryptionService.encrypt(this.signingSecret)
        : null;

      // Save the connection using the global ProviderConnectionRepository
      const connection = await this.connectionRepo.create({
        organizationEyeId,
        providerId: slackProvider.id, // The DB UUID, not the string 'SLACK'
        status: 'connected',
        externalAccountId: teamId,
        externalAccountName: teamName,
        accessTokenEncrypted: encryptedAccessToken,
        scopes: scopes,
        webhookSecret: encryptedWebhookSecret,
        connectedAt: new Date(),
        connectionMetadata: {
          bot_user_id: data.bot_user_id,
          app_id: data.app_id,
          authed_user_id: data.authed_user?.id,
        },
      });

      // Update the OrganizationEye status to 'connected'
      await this.prisma.organizationEye.update({
        where: { id: organizationEyeId },
        data: { status: 'connected' },
      });

      this.logger.log(
        `Slack connected successfully: connection=${connection.id}, team=${teamName}`,
      );

      return {
        success: true,
        message: 'Slack connected successfully!',
        data: {
          connectionId: connection.id,
          teamName,
          teamId,
        },
      };
    } catch (err) {
      this.logger.error(
        `Slack OAuth error: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new BadRequestException('Failed to complete Slack OAuth flow');
    }
  }
}
