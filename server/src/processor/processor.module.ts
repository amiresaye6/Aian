import { Global, Module } from '@nestjs/common';
import { MockProcessorGateway } from './processor-gateway.mock';

/**
 * Global Processor Module.
 * Provides the KnowledgeProcessorGateway interface.
 * Using a Mock implementation for Sprint 2.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'KNOWLEDGE_PROCESSOR_GATEWAY',
      useClass: MockProcessorGateway,
    },
  ],
  exports: ['KNOWLEDGE_PROCESSOR_GATEWAY'],
})
export class ProcessorModule {}
