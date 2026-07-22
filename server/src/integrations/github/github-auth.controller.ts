import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../common/encryption.service';
import {
  GithubAppEnvKeys,
  GithubApiUrls,
  ProviderKeyDbMap,
} from './github-connection.constants';
import { GithubClientService } from './github-client.service';

@Controller('integrations/github')
export class GithubAuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly githubClient: GithubClientService
  ) { }

  /**
   * Step 1: Redirect the owner to GitHub's App installation page.
   * `organizationEyeId` is passed as `state` so we know which Eye
   * this installation belongs to once GitHub redirects back.
   */
  @Get('install')
  install(
    @Query('organizationEyeId') organizationEyeId: string,
    @Res() res: Response,
  ) {
    if (!organizationEyeId) {
      throw new BadRequestException('organizationEyeId is required');
    }

    const appName =
      this.configService.get<string>('GITHUB_APP_NAME') ?? 'aian-dev-donia';
    const installUrl = `${GithubApiUrls.APP_INSTALL}/${appName}/installations/new?state=${organizationEyeId}`;

    return res.redirect(installUrl);
  }

  /**
   * Step 2: GitHub redirects here after the owner installs (or updates) the App.
   * Query params GitHub sends: installation_id, setup_action, state.
   */
  @Get('callback')
  async callback(
    @Query('installation_id') installationId: string,
    @Query('setup_action') setupAction: string,
    @Query('state') organizationEyeId: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    if (!installationId || !organizationEyeId) {
      throw new BadRequestException('Missing installation_id or state');
    }

    if (setupAction === 'delete' || setupAction === 'uninstall') {
      // Owner uninstalled the app — out of scope for this step,
      // will be handled in the disconnect flow.
      // return res.send('GitHub App was uninstalled.');
      return res.redirect(`${frontendUrl}/eyes/github/connect?status=uninstalled`);
    }

    // 3. Look up the actual Provider row to get its real UUID.
    //    NOTE: DB seed uses lowercase keys ('github'), NOT the Provider enum ('GITHUB').
    const githubProvider = await this.prisma.provider.findUnique({
      where: { key: ProviderKeyDbMap.GITHUB }, // 'github'
    });

    if (!githubProvider) {
      // throw new InternalServerErrorException(
      //   'PROVIDER_CONNECTION_FAILED: GitHub provider not found in database (seed missing?)',
      // );
      return res.redirect(`${frontendUrl}/eyes/github/connect?error=provider_not_found`,);
    }

    // 4. Generate a short-lived App JWT signed with our private key.
    const appJwt = this.githubClient.generateAppJwt();

    // 5. Exchange installation_id + App JWT for an Installation Access Token.
    let installationToken: string;
    let tokenExpiresAt: Date;

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

      installationToken = response.data.token;
      tokenExpiresAt = new Date(response.data.expires_at);
    } catch (error) {
      // throw new InternalServerErrorException(
      //   'PROVIDER_CONNECTION_FAILED: could not exchange installation_id for access token',
      // );
      return res.redirect(
        `${frontendUrl}/eyes/github/connect?error=token_exchange_failed`,
      );
    }

    // 6. Encrypt and save the connection using the shared repository.
    try {
      const webhookSecret = this.configService.get<string>('GITHUB_APP_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new InternalServerErrorException(
          'GITHUB_WEBHOOK_SECRET is not configured on the server',
        );
      }
      const existingConnection = await this.connectionRepo.findByOrganizationEyeId(organizationEyeId);
      if (existingConnection) {
        await this.connectionRepo.update(existingConnection.id, {
          status: 'connected',
          externalAccountId: installationId,
          accessTokenEncrypted:
            this.encryptionService.encrypt(installationToken),
          tokenExpiresAt,
          scopes: ['contents:read', 'issues:read', 'pull_requests:read'],
          connectedAt: new Date(),
          webhookSecret: this.encryptionService.encrypt(webhookSecret),
          lastErrorMessage: null,
        });
      } else {
        await this.connectionRepo.create({
          organizationEyeId,
          providerId: githubProvider.id, // real UUID now, not the enum string
          status: 'connected',
          externalAccountId: installationId,
          accessTokenEncrypted: this.encryptionService.encrypt(installationToken),
          tokenExpiresAt,
          scopes: ['contents:read', 'issues:read', 'pull_requests:read'],
          connectedAt: new Date(),
          webhookSecret: this.encryptionService.encrypt(webhookSecret), 
        } as any);
      }
    } catch (error) {
      return res.redirect(
        `${frontendUrl}/eyes/github/connect?error=save_connection_failed`,
      );
    }

    return res.redirect(`${frontendUrl}/eyes/github/success?organizationEyeId=${organizationEyeId}`,);
    // return res.send('GitHub App connected successfully. You can close this window.');
  }

  /**
   * Signs a JWT using the GitHub App's private key.
   * This JWT proves our identity as the App (not as a specific installation).
   * Valid for 10 minutes max per GitHub's rules — we use 9 to be safe.
   */
  private generateAppJwt(): string {
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
}
