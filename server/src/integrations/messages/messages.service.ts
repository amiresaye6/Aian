import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProviderClientFactory } from '../provider-client.factory';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';
import { MessagePayload, MessageSendResult } from '../contracts';

/**
 * Global Message Sender Service.
 *
 * This is the **single entry point** for sending outgoing messages across any provider.
 * Any part of the application (alert service, AI processor, report agent, etc.) can
 * inject this service and call `send()` without knowing anything about the provider.
 *
 * Usage example:
 * ```ts
 * await this.messagesService.send(connectionId, {
 *   targetId: 'C12345',
 *   text: '🚀 Report ready!',
 * });
 * ```
 */
@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly providerFactory: ProviderClientFactory,
  ) {}

  /**
   * Send a message through the provider associated with the given connectionId.
   *
   * @param connectionId - The UUID of the ProviderConnection in the database
   * @param payload      - The normalized message payload
   * @returns            - Result with messageId and channelId on success
   */
  async send(
    connectionId: string,
    payload: MessagePayload,
  ): Promise<MessageSendResult> {
    // 1. Load the connection (includes decryptable tokens)
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }

    // 2. Resolve the correct provider client
    const client = this.providerFactory.getClient(connection.provider);
    if (!client) {
      throw new BadRequestException(
        `No client registered for provider: ${connection.provider}`,
      );
    }

    // 3. Ensure this provider supports outgoing messages
    if (!client.sendMessage) {
      throw new BadRequestException(
        `Provider ${connection.provider} does not support sending messages`,
      );
    }

    this.logger.log(
      `Sending message via ${connection.provider} on connection ${connectionId} to target ${payload.targetId}`,
    );

    // 4. Delegate to the provider-specific implementation
    return client.sendMessage(connection, payload);
  }
}
