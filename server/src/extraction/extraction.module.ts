import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeExtractionService } from './extraction.service';
import { KnowledgeArtifactRepository } from './repositories/knowledge-artifact.repository';

/**
 * Global Extraction Module.
 *
 * Provides KnowledgeExtractionService to the entire application.
 * AiGatewayService is injected automatically since AiGatewayModule is @Global().
 *
 * Any module (ProcessorModule, future AgentModule, SchedulerModule) can inject
 * KnowledgeExtractionService without any additional imports.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [KnowledgeArtifactRepository, KnowledgeExtractionService],
  exports: [KnowledgeExtractionService, KnowledgeArtifactRepository],
})
export class KnowledgeExtractionModule {}
