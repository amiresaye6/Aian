import { Injectable, Logger } from '@nestjs/common';
import { ProviderClient } from '../contracts/provider-client.interface';
import { ProviderConnection } from '../contracts/provider-connection.interface';
import { ProviderResource } from '../contracts/provider-resource.interface';
import { ConnectionVerificationResult } from '../contracts/provider-connection.interface';
import { EncryptionService } from '../../common/encryption.service';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MeetingBaasService {
  private readonly logger = new Logger(MeetingBaasService.name);
  private readonly baseUrl = 'https://api.meetingbaas.com/v2';
  private readonly apiKey = process.env.MEET_BAAS_API_KEY;
  private readonly webhookSecret = process.env.MEETING_BAAS_REDIRECT_URI;

  constructor(
    private readonly prismaService: PrismaService
) {}

  /**
   * Verifies if the Meeting Baas credentials stored inside are valid.
   * Hits Meeting Baas /bots or a similar lightweight configuration endpoint to validate the token.
   */
  async verifyConnection(connection: ProviderConnection): Promise<ConnectionVerificationResult> {

    if (!this.apiKey) {
      return {
        isValid: false,
        message: 'Failed to connect with Meeting Baas: API key is missing.',
      };
    }

    try {
      //console.log(apiKey)
      const response = await axios.get(`${this.baseUrl}/bots`, {
        headers: {
            'x-meeting-baas-api-key': this.apiKey,
        },
      });

      this.logger.log(`Meeting Baas connection verified successfully for connection ID: ${connection.id}`);
      return {
        isValid: true,
        message: 'Successfully authenticated with Meeting Baas API Key.',
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Meeting Baas verification failed: ${errorMsg}`);
      return {
        isValid: false,
        message: `Failed to connect with Meeting Baas: ${errorMsg}`,
      };
    }
  }

  /**
   * Retrieves active bots or resources managed by this specific Meeting Baas credential profile.
   */
  async getResources(): Promise<ProviderResource[]> {
    if (!this.apiKey) {
      throw new Error('Meeting Baas API key is missing from metadata.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/bots`, {
        headers: {
            'x-meeting-baas-api-key': this.apiKey,
        },
      });

      const bots = response.data.data || [];
      //console.log(response.data);
        return bots.map((bot: any) => ({
        externalResourceId: bot.bot_id,
        name: bot.bot_name || 'Meeting Assistant Bot',
        resourceType: 'bot',
        metadata: {
          status: bot.status,
          meeting_url: bot.meeting_url,
          created_at: bot.created_at,
        },
      }));
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to fetch Meeting Baas resources: ${errorMsg}`);
      throw new Error(`Failed to fetch Meeting Baas resources: ${errorMsg}`);
    }
  }

  /**
   * Core feature method to spawn a bot using the connection's authenticated context.
   */
  async createBot(
    connection: ProviderConnection,
    meetingUrl: string,
    botName: string,
    dedupId?: string,
  ): Promise<any> {
    
    if (!this.apiKey) {
      throw new Error('Meeting Baas API key is missing.');
    }

    if (!this.webhookSecret) {
      throw new Error('Meeting Baas Webhook SecretKey is missing.');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/bots`,
        {
          meeting_url: meetingUrl,
          bot_name: botName,
          dedup_id: dedupId,
          "transcription_enabled": true,
          "transcription_config": {
            "provider": "gladia",
            "custom_params": {
              "summarization": true,
              "summarization_config": {
                "type": "general"
              }
            }
          },
          "callback_enabled": true,
          "callback_config": {
            "url": process.env.MEETING_BAAS_REDIRECT_URI,
            "method": "POST",
            "secret": this.webhookSecret
          }
        },
        {
          headers: {
            'x-meeting-baas-api-key': this.apiKey,
        },
        },
      );
      const currentConnection =
        await this.prismaService.providerConnection.findUnique({
            where: {
            id: connection.id,
            },
            select: {
            connectionMetadata: true,
            },
        });

        await this.prismaService.providerConnection.update({
        where: {
            id: connection.id,
        },
        data: {
            connectionMetadata: {
            ...(currentConnection?.connectionMetadata as object ?? {}),
            bot_id: response.data.data.bot_id,
            },
        },
        });
        //console.log(response.data)
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to create Bot on Meeting Baas: ${errorMsg}`);
      throw new Error(`Meeting Baas bot creation failed: ${errorMsg}`);
    }
  }
}