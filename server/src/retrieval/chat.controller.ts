import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGuards } from '../roles_permissions/roles.guard';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';
import { RetrievalPipelineService } from './retrieval-pipeline.service';
import { AnswerGenerationService } from './services/answer-generation.service';
import { EvidenceNode } from './services/evidence-chain.service';

import { IsString, IsNotEmpty } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

export interface ChatResponse {
  answer: string;
  evidenceChains: EvidenceNode[];
}

@Controller('chat')
@UseGuards(AuthGaurd, RolesGuards)
export class ChatController {
  constructor(
    private readonly retrievalPipeline: RetrievalPipelineService,
    private readonly answerGeneration: AnswerGenerationService,
  ) {}

  @Post('query')
  @RequiredPermissions('chat.use')
  async askQuestion(
    @Request() req: any,
    @Body() body: ChatQueryDto,
  ): Promise<ChatResponse> {
    const organizationId = req.user?.organizationId;
    const { query } = body;

    // 1. Run the core retrieval engine to get the evidence chains and context string
    const { contextString, evidenceChains } =
      await this.retrievalPipeline.retrieveContext(organizationId, query);

    // 2. Generate the human-readable answer wrapper
    const answer = await this.answerGeneration.generateAnswer(
      query,
      contextString,
    );

    // 3. Return static response containing both the answer and the raw citations
    return {
      answer,
      evidenceChains,
    };
  }
}
