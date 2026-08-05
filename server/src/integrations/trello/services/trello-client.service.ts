import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderConnection } from '@prisma/client';
import { EncryptionService } from '../../../common/encryption.service';
import { OAuth } from 'oauth';
import { TrelloTokenResponse } from '../types/trello.types';

@Injectable()
export class TrelloClientService {
  private readonly logger = new Logger(TrelloClientService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  private getOauth(): OAuth {
    const key = this.configService.get<string>('TRELLO_CLIENT_ID') || this.configService.get<string>('TRELLO_API_KEY') || '';
    const secret = this.configService.get<string>('TRELLO_CLIENT_SECRET') || '';
    
    return new OAuth(
      this.configService.get<string>('TRELLO_TOKEN_URL')?.replace('OAuthGetAccessToken', 'OAuthGetRequestToken') || 'https://trello.com/1/OAuthGetRequestToken',
      this.configService.get<string>('TRELLO_TOKEN_URL') || 'https://trello.com/1/OAuthGetAccessToken',
      key,
      secret,
      '1.0A',
      null,
      'HMAC-SHA1'
    );
  }

  /**
   * Returns the decrypted valid token pair.
   * Trello OAuth 1.0a tokens set to `expiration=never` do not expire,
   * so this method does not implement a refresh token flow.
   */
  async getValidToken(connection: ProviderConnection): Promise<TrelloTokenResponse> {
    if (!connection.accessTokenEncrypted || !connection.refreshTokenEncrypted) {
      throw new Error(`Missing Trello credentials for connection ${connection.id}`);
    }

    const token = this.encryptionService.decrypt(connection.accessTokenEncrypted);
    const tokenSecret = this.encryptionService.decrypt(connection.refreshTokenEncrypted);

    return { token, tokenSecret };
  }

  /**
   * Validates if the connection is still active by attempting to fetch the user's profile.
   */
  async validateConnection(connection: ProviderConnection): Promise<boolean> {
    try {
      const { token, tokenSecret } = await this.getValidToken(connection);
      const oauth = this.getOauth();

      return await new Promise<boolean>((resolve) => {
        oauth.get(
          'https://api.trello.com/1/members/me',
          token,
          tokenSecret!,
          (error) => {
            if (error) {
              this.logger.warn(`Connection validation failed for Trello connection ${connection.id}`, error);
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (err) {
      this.logger.error(`Error validating Trello connection ${connection.id}`, err);
      return false;
    }
  }

  // Empty foundation for future business logic
  async getBoard(boardId: string): Promise<any> {
    throw new NotImplementedException('Trello API methods are not implemented yet');
  }
}
