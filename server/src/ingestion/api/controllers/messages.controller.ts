import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from '../../../integrations/messages/messages.service';

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for the send message request body.
 * Using a class instead of an interface to be compatible with
 * isolatedModules + emitDecoratorMetadata.
 */
class SendMessageDto {
  /** Required. The Slack channel ID (C...), user ID (U...), or DM ID (D...) */
  @IsString()
  @IsNotEmpty()
  targetId: string;

  /** Required. The message text. Supports Slack mrkdwn syntax. */
  @IsString()
  @IsNotEmpty()
  text: string;

  /** Optional. Structured Block Kit blocks. `text` will serve as the fallback. */
  @IsOptional()
  @IsArray()
  blocks?: Record<string, unknown>[];

  /** Optional. The `ts` of the parent message to reply in a thread. */
  @IsOptional()
  @IsString()
  threadId?: string;

  /** Optional. If true, a threaded reply is also sent to the main channel. */
  @IsOptional()
  @IsBoolean()
  broadcastReply?: boolean;
}

/**
 * REST controller for sending outgoing messages.
 *
 * Route: POST /api/v1/eyes/:connectionId/messages
 *
 * Any consumer (frontend, AI agent, alert service) can hit this endpoint
 * to send a message through the provider connected on the given eye.
 */
@Controller('eyes/:connectionId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Send a message to a channel/user via the provider connection.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async send(
    @Param('connectionId') connectionId: string,
    @Body() payload: SendMessageDto,
  ) {
    const result = await this.messagesService.send(connectionId, payload);
    return {
      success: result.success,
      data: result.success
        ? { messageId: result.messageId, channelId: result.channelId }
        : undefined,
      error: result.error,
    };
  }
}
