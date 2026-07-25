import { Global, Module } from '@nestjs/common';
import { KnowledgeProcessorService } from './knowledge-processor.service';
import { AssemblerFactory } from './assemblers/assembler.factory';

/**
 * Global Processor Module.
 * Provides the KnowledgeProcessorGateway interface.
 */
@Global()
@Module({
  providers: [
    AssemblerFactory,
    {
      provide: 'KNOWLEDGE_PROCESSOR_GATEWAY',
      useClass: KnowledgeProcessorService,
    },
  ],
  exports: ['KNOWLEDGE_PROCESSOR_GATEWAY', AssemblerFactory],
})
export class ProcessorModule {}
