import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai/ai-gateway.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GraphModule } from '../graph/graph.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { QueryUnderstandingService } from './services/query-understanding.service';
import { GraphSearchService } from './services/graph-search.service';
import { EvidenceChainService } from './services/evidence-chain.service';
import { ContextBuilderService } from './services/context-builder.service';
import { RetrievalPipelineService } from './retrieval-pipeline.service';
import { AnswerGenerationService } from './services/answer-generation.service';
import { AiGraphPruningService } from './services/ai-graph-pruning.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [AiGatewayModule, PrismaModule, GraphModule, ConversationsModule],
  providers: [
    QueryUnderstandingService,
    GraphSearchService,
    EvidenceChainService,
    ContextBuilderService,
    RetrievalPipelineService,
    AnswerGenerationService,
    AiGraphPruningService,
  ],
  controllers: [ChatController],
  exports: [
    QueryUnderstandingService,
    GraphSearchService,
    EvidenceChainService,
    ContextBuilderService,
    RetrievalPipelineService,
    AnswerGenerationService,
    AiGraphPruningService,
  ],
})
export class RetrievalModule {}
