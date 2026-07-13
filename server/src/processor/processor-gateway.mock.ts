import { Injectable, Logger } from '@nestjs/common';
import {
  KnowledgeProcessorGateway,
  ProcessorHandoffResult,
} from '../integrations/contracts/processor-gateway.interface';

/**
 * Mock Knowledge Processor Gateway for Sprint 2.
 *
 * In Sprint 2, we just collect data into batches.
 * In Sprint 3, this will be replaced with a real implementation that sends
 * data to the NLP processing queue (cleaning, chunking, embeddings).
 */
@Injectable()
export class MockProcessorGateway implements KnowledgeProcessorGateway {
  private readonly logger = new Logger(MockProcessorGateway.name);

  async handoffBatch(batchId: string): Promise<ProcessorHandoffResult> {
    this.logger.log(`[STUB] Handed off batch ${batchId} to Processor.`);

    // Simulating a successful handoff to a background queue
    return {
      accepted: true,
      message: 'Batch accepted by mock processor',
      processorJobId: `job-stub-${Date.now()}`,
    };
  }
}
