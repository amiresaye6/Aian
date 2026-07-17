import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ProviderClient,
  ProviderConnection,
  ConnectionVerificationResult,
  ProviderResource,
  MessagePayload,
  MessageSendResult,
} from '../contracts';
import { EncryptionService } from '../../common/encryption.service';

/**
 * Slack-specific implementation of ProviderClient.
 *
 * Handles live API calls to Slack to:
 *   - Verify the bot token is still valid (auth.test)
 *   - Fetch available channels the bot can see (conversations.list)
 */
@Injectable()
export class SlackClientService implements ProviderClient {
  private readonly logger = new Logger(SlackClientService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Verify the connection by calling Slack's auth.test endpoint.
   * This confirms the bot token is valid and returns workspace info.
   */
  async verifyConnection(
    connection: ProviderConnection,
  ): Promise<ConnectionVerificationResult> {
    const token = this.encryptionService.decrypt(
      connection.accessTokenEncrypted,
    );

    try {
      const response = await axios.post(
        'https://slack.com/api/auth.test',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.ok) {
        this.logger.debug(
          `Slack connection verified: team=${response.data.team}`,
        );
        return {
          isValid: true,
          message: `Connected to workspace: ${response.data.team}`,
          accountName: response.data.team,
          accountId: response.data.team_id,
        };
      }

      return {
        isValid: false,
        message: `Slack auth.test failed: ${response.data.error}`,
      };
    } catch (error) {
      this.logger.error(
        `Slack verifyConnection error: ${(error as Error).message}`,
      );
      return {
        isValid: false,
        message: `Failed to reach Slack API: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Fetch all public channels the bot can access.
   * Maps each Slack channel to a ProviderResource.
   */
  async getResources(
    connection: ProviderConnection,
  ): Promise<ProviderResource[]> {
    const token = this.encryptionService.decrypt(
      connection.accessTokenEncrypted,
    );
    const resources: ProviderResource[] = [];

    let cursor: string | undefined;
    do {
      const params: Record<string, string> = {
        types: 'public_channel',
        limit: '200',
        exclude_archived: 'true',
      };
      if (cursor) params.cursor = cursor;

      const response = await axios.get(
        'https://slack.com/api/conversations.list',
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        },
      );

      if (!response.data.ok) {
        this.logger.error(
          `Slack conversations.list failed: ${response.data.error}`,
        );
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      for (const channel of response.data.channels || []) {
        resources.push({
          externalResourceId: channel.id,
          name: `#${channel.name}`,
          resourceType: 'channel',
          metadata: {
            is_private: channel.is_private || false,
            num_members: channel.num_members || 0,
            topic: channel.topic?.value || '',
            purpose: channel.purpose?.value || '',
          },
        });
      }

      cursor = response.data.response_metadata?.next_cursor || undefined;
    } while (cursor);

    this.logger.log(`Fetched ${resources.length} Slack channels`);
    return resources;
  }

  /**
   * Revoke the Slack OAuth access token.
   * Hits the Slack API `auth.revoke` endpoint.
   */
  async revokeCredentials(connection: ProviderConnection): Promise<void> {
    const token = this.encryptionService.decrypt(
      connection.accessTokenEncrypted,
    );

    try {
      const response = await axios.post(
        'https://slack.com/api/auth.revoke',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.ok) {
        this.logger.log(
          `Slack token revoked successfully for connection ${connection.id}`,
        );
      } else {
        this.logger.warn(
          `Slack token revocation failed: ${response.data.error}`,
        );
        // We log a warning but don't throw an error, since the connection might
        // already be revoked or invalid on Slack's side. We still want to delete it from DB.
      }
    } catch (error) {
      this.logger.error(
        `Failed to reach Slack API for revocation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send an outgoing message to a Slack channel or user.
   * Maps the generic MessagePayload to Slack's chat.postMessage API.
   *
   * @param connection - The active ProviderConnection holding the encrypted bot token
   * @param payload    - The normalized message payload (text, blocks, thread, etc.)
   */
  async sendMessage(
    connection: ProviderConnection,
    payload: MessagePayload,
  ): Promise<MessageSendResult> {
    const token = this.encryptionService.decrypt(connection.accessTokenEncrypted);

    const body: Record<string, unknown> = {
      channel: payload.targetId,
      text: payload.text,
      mrkdwn: true,
    };

    if (payload.blocks && payload.blocks.length > 0) {
      body.blocks = payload.blocks;
    }

    if (payload.threadId) {
      body.thread_ts = payload.threadId;
      if (payload.broadcastReply) {
        body.reply_broadcast = true;
      }
    }

    try {
      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.ok) {
        this.logger.log(
          `Message sent to channel ${payload.targetId}, ts=${response.data.ts}`,
        );
        return {
          success: true,
          messageId: response.data.ts,
          channelId: response.data.channel,
        };
      }

      this.logger.warn(`Slack chat.postMessage failed: ${response.data.error}`);
      return {
        success: false,
        error: response.data.error,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reach Slack API for sendMessage: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
  /**
   * Automatically join channels that were selected by the user,
   * and send a welcome message so they know Aian is active.
   */
  async onResourcesSelected(
    connection: ProviderConnection,
    resources: any[],
  ): Promise<void> {
    const token = this.encryptionService.decrypt(
      connection.accessTokenEncrypted,
    );

    for (const resource of resources) {
      if (resource.resourceType !== 'channel') continue;

      try {
        // 1. Join the channel
        const joinResponse = await axios.post(
          'https://slack.com/api/conversations.join',
          { channel: resource.externalResourceId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (!joinResponse.data.ok) {
          if (joinResponse.data.error === 'already_in_channel') {
            this.logger.debug(
              `Already in channel ${resource.name} (${resource.externalResourceId})`,
            );
          } else {
            this.logger.warn(
              `Failed to join channel ${resource.externalResourceId}: ${joinResponse.data.error}`,
            );
            continue; // Skip sending message if join failed
          }
        } else {
          this.logger.log(
            `Successfully joined channel ${resource.name} (${resource.externalResourceId})`,
          );
        }

        // 2. Send welcome message
        await this.sendMessage(connection, {
          targetId: resource.externalResourceId,
          text: "Hi everyone! I'm Aian. I'm here to help answer questions and assist with anything you need!",
        });
      } catch (error) {
        this.logger.error(
          `Error joining/welcoming in channel ${resource.externalResourceId}: ${
            (error as Error).message
          }`,
        );
      }
    }
  }
}
