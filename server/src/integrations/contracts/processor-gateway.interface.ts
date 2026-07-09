/**
 * Knowledge Processor Gateway Contract.
 *
 * This is a placeholder interface for Sprint 3.
 * In Sprint 2, a mock implementation logs the batch and marks it as handed off.
 *
 * In Sprint 3, the real implementation will:
 * - Clean and classify the KnowledgeItems
 * - Chunk content for embedding
 * - Generate vector embeddings
 * - Store in vector database for RAG
 *
 * IMPORTANT: Provider developers must NOT call the processor directly.
 * Only the scheduler/batch system may hand data to the processor.
 */
export interface KnowledgeProcessorGateway {
  /**
   * Hand off an ingestion batch to the knowledge processor.
   *
   * @param batchId - The ID of the locked ingestion batch
   * @returns Result indicating whether the handoff was accepted
   */
  handoffBatch(batchId: string): Promise<ProcessorHandoffResult>;
}

/**
 * Result of a processor handoff attempt.
 */
export interface ProcessorHandoffResult {
  /** Whether the processor accepted the batch. */
  accepted: boolean;

  /** Human-readable message about the handoff. */
  message: string;

  /** Processor-assigned job ID (for tracking in Sprint 3). */
  processorJobId?: string;
}
