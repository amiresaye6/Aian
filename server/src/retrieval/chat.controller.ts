import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGuards } from '../roles_permissions/roles.guard';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';
import { RetrievalPipelineService } from './retrieval-pipeline.service';
import { AnswerGenerationService } from './services/answer-generation.service';
import { ConversationsService } from '../conversations/conversations.service';
import { EvidenceNode } from './services/evidence-chain.service';

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

export interface ChatResponse {
  answer: string;
  evidenceChains: EvidenceNode[];
  conversationId: string;
  messageId: string;
}

@Controller('chat')
@UseGuards(AuthGaurd, RolesGuards)
export class ChatController {
  constructor(
    private readonly retrievalPipeline: RetrievalPipelineService,
    private readonly answerGeneration: AnswerGenerationService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Post('query')
  @RequiredPermissions('chat.use')
  async askQuestion(
    @Request() req: any,
    @Body() body: ChatQueryDto,
  ): Promise<ChatResponse> {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    const { query, conversationId } = body;

    let activeConversationId = conversationId;

    // 0. If no conversationId is provided, create a new conversation
    if (!activeConversationId) {
      const title = query.length > 50 ? query.substring(0, 50) + '...' : query;
      const conversation = await this.conversationsService.createConversation(
        organizationId,
        userId,
        title,
      );
      activeConversationId = conversation.id;
    }

    // Save User message
    await this.conversationsService.addMessageToConversation(
      activeConversationId as string,
      'user',
      query,
    );

    // 1. Run the core retrieval engine to get the evidence chains and context string
    const { contextString, evidenceChains } =
      await this.retrievalPipeline.retrieveContext(organizationId, query);

    // 2. Generate the human-readable answer wrapper
    const answer = await this.answerGeneration.generateAnswer(
      organizationId,
      query,
      contextString,
    );

    // Save Assistant message
    const assistantMessage = await this.conversationsService.addMessageToConversation(
      activeConversationId as string,
      'assistant',
      answer,
    );

    // 3. Return static response containing both the answer and the raw citations
    return {
      answer,
      evidenceChains,
      conversationId: activeConversationId as string,
      messageId: assistantMessage.id,
    };
  }
}
