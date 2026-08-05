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
import { OAuth } from 'oauth';

@Controller('integrations/trello')
export class TrelloAuthController {
  private readonly logger = new Logger(TrelloAuthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerConnectionRepo: ProviderConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  private getOauth(callbackUrl: string): OAuth {
    const key = this.configService.get<string>('TRELLO_CLIENT_ID') || this.configService.get<string>('TRELLO_API_KEY');
    const secret = this.configService.get<string>('TRELLO_CLIENT_SECRET');

    if (!key || !secret) {
      throw new InternalServerErrorException('Trello configuration is incomplete');
    }

    const requestTokenUrl = this.configService.get<string>('TRELLO_TOKEN_URL')?.replace('OAuthGetAccessToken', 'OAuthGetRequestToken') || 'https://trello.com/1/OAuthGetRequestToken';
    const accessTokenUrl = this.configService.get<string>('TRELLO_TOKEN_URL') || 'https://trello.com/1/OAuthGetAccessToken';

    return new OAuth(
      requestTokenUrl,
      accessTokenUrl,
      key,
      secret,
      '1.0A',
      callbackUrl,
      'HMAC-SHA1'
    );
  }

  @Get('install')
  async install(@Query('organizationEyeId') organizationEyeId: string, @Res() res: Response) {
    if (!organizationEyeId) {
      throw new BadRequestException('organizationEyeId is required');
    }

    const organizationeye = await this.prisma.organizationEye.findUnique({
      where: { id: organizationEyeId },
    });

    if (!organizationeye) {
      throw new BadRequestException('Organization eye not found');
    }

    const redirectUri = this.configService.get<string>('TRELLO_REDIRECT_URI');
    if (!redirectUri) {
      throw new InternalServerErrorException('TRELLO_REDIRECT_URI is not configured');
    }

    const oauth = this.getOauth(redirectUri);

    oauth.getOAuthRequestToken((error, oauth_token, oauth_token_secret) => {
      if (error) {
        this.logger.error('Failed to get Trello OAuth request token', error);
        return res.status(500).send('Failed to authenticate with Trello');
      }

      const stateObj = {
        orgEyeId: organizationEyeId,
        secret: oauth_token_secret,
      };
      
      const state = this.encryptionService.encrypt(JSON.stringify(stateObj));
      const authUrlBase = this.configService.get<string>('TRELLO_AUTH_URL') || 'https://trello.com/1/OAuthAuthorizeToken';
      
      const callbackWithState = `${redirectUri}?state=${encodeURIComponent(state)}`;
      const authUrl = `${authUrlBase}?oauth_token=${oauth_token}&name=AIAN&scope=read,write,account&expiration=never&return_url=${encodeURIComponent(callbackWithState)}`;
      
      res.redirect(authUrl);
    });
  }

  @Get('callback')
  async callback(
    @Query('oauth_token') oauth_token: string,
    @Query('oauth_verifier') oauth_verifier: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    try {
      if (!oauth_token || !oauth_verifier || !state) {
        throw new BadRequestException('Missing required OAuth parameters');
      }

      let stateObj: { orgEyeId: string; secret: string };
      try {
        const decrypted = this.encryptionService.decrypt(state);
        stateObj = JSON.parse(decrypted);
      } catch (err) {
        throw new BadRequestException('Invalid or expired state');
      }

      const { orgEyeId, secret: oauth_token_secret } = stateObj;
      const redirectUri = this.configService.get<string>('TRELLO_REDIRECT_URI')!;
      const oauth = this.getOauth(redirectUri);

      oauth.getOAuthAccessToken(
        oauth_token,
        oauth_token_secret,
        oauth_verifier,
        async (error, access_token, access_token_secret) => {
          if (error) {
            this.logger.error('Failed to get Trello access token', error);
            return res.redirect(`${frontendUrl}/eyes/trello/redirect?status=error&message=TokenExchangeFailed`);
          }

          try {
            const profile = await this.getTrelloProfile(access_token, access_token_secret, oauth);
            const externalAccountId = profile.id;
            const externalAccountName = profile.fullName;
            const connectionMetadata = {
              username: profile.username,
              avatarUrl: profile.avatarUrl,
            };

            const provider = await this.prisma.provider.findUnique({
              where: { key: 'trello' },
            });

            if (!provider) {
              throw new InternalServerErrorException('Trello provider not found in database');
            }

            const existingConnection = await this.prisma.providerConnection.findFirst({
              where: {
                providerId: provider.id,
                organizationEyeId: orgEyeId,
                externalAccountId,
              },
            });

            const encryptedAccessToken = this.encryptionService.encrypt(access_token);
            const encryptedAccessTokenSecret = this.encryptionService.encrypt(access_token_secret);

            if (existingConnection) {
              await this.providerConnectionRepo.update(existingConnection.id, {
                accessTokenEncrypted: encryptedAccessToken,
                refreshTokenEncrypted: encryptedAccessTokenSecret,
                status: IntegrationStatus.connected,
                connectionMetadata: connectionMetadata as any,
              });
              this.logger.log(`Updated Trello connection for orgEye: ${orgEyeId}`);
            } else {
              await this.providerConnectionRepo.create({
                providerId: provider.id,
                organizationEyeId: orgEyeId,
                externalAccountId,
                externalAccountName,
                accessTokenEncrypted: encryptedAccessToken,
                refreshTokenEncrypted: encryptedAccessTokenSecret,
                status: IntegrationStatus.connected,
                scopes: ['read', 'write', 'account'],
                connectedAt: new Date(),
                connectionMetadata: connectionMetadata as any,
              });
              this.logger.log(`Created new Trello connection for orgEye: ${orgEyeId}`);
            }

            res.redirect(`${frontendUrl}/eyes/trello/redirect?status=success`);
          } catch (profileError) {
            this.logger.error('Failed to fetch Trello profile', profileError);
            res.redirect(`${frontendUrl}/eyes/trello/redirect?status=error&message=ProfileFetchFailed`);
          }
        }
      );
    } catch (err: any) {
      this.logger.error(`Trello callback error: ${err.message}`, err.stack);
      res.redirect(`${frontendUrl}/eyes/trello/redirect?status=error`);
    }
  }

  private getTrelloProfile(accessToken: string, accessTokenSecret: string, oauth: OAuth): Promise<any> {
    return new Promise((resolve, reject) => {
      oauth.get(
        'https://api.trello.com/1/members/me',
        accessToken,
        accessTokenSecret,
        (error, data) => {
          if (error) {
            reject(error);
          } else {
            try {
              resolve(JSON.parse(data as string));
            } catch (e) {
              reject(e);
            }
          }
        }
      );
    });
  }
}
