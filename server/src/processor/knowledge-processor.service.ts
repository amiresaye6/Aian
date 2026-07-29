import { Injectable, Logger } from '@nestjs/common';
import {
  KnowledgeProcessorGateway,
  ProcessorHandoffResult,
} from '../integrations/contracts/processor-gateway.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AssemblerFactory } from './assemblers/assembler.factory';
import { BatchStatus, IngestionStatus } from '@prisma/client';
import { KnowledgeExtractionService } from '../extraction/extraction.service';

@Injectable()
export class KnowledgeProcessorService implements KnowledgeProcessorGateway {
  private readonly logger = new Logger(KnowledgeProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assemblerFactory: AssemblerFactory,
    private readonly extractionService: KnowledgeExtractionService,
  ) {}

  async handoffBatch(batchId: string): Promise<ProcessorHandoffResult> {
    this.logger.log(
      `Received handoff for batch ${batchId}. Starting Stage 1 Assembly.`,
    );

    try {
      // 1. Fetch the batch and its raw items
      const batch = await this.prisma.ingestionBatch.findUnique({
        where: { id: batchId },
        include: {
          items: {
            include: {
              knowledgeItem: true,
            },
          },
        },
      });

      if (!batch) {
        throw new Error(`Batch ${batchId} not found.`);
      }

      const rawItems = batch.items.map((i) => i.knowledgeItem);

      if (rawItems.length === 0) {
        this.logger.warn(`Batch ${batchId} is empty.`);
        return {
          accepted: true,
          message: 'Batch was empty, nothing to assemble.',
        };
      }

      // 2. Group items by Provider
      const itemsByProvider = rawItems.reduce(
        (acc, item) => {
          const p = item.provider.toLowerCase();
          if (!acc[p]) acc[p] = [];
          acc[p].push(item);
          return acc;
        },
        {} as Record<string, typeof rawItems>,
      );

      // 3. Assemble for each provider
      for (const [provider, items] of Object.entries(itemsByProvider)) {
        const assembler = this.assemblerFactory.getAssembler(provider);

        if (!assembler) {
          this.logger.warn(
            `No KnowledgeAssembler found for provider: ${provider}. Skipping items.`,
          );
          continue;
        }

        this.logger.log(`Assembling ${items.length} items for ${provider}...`);

        // Let the specific provider assembler group and structure the items
        const artifactsData = await assembler.assemble(items);

        // Collect created artifact IDs to safely dispatch extraction outside the transaction
        const createdArtifactIds: string[] = [];

        // Save artifacts and update knowledge items
        await this.prisma.$transaction(async (tx) => {
          for (const artifactData of artifactsData) {
            // Create the artifact
            const artifact = await tx.knowledgeArtifact.create({
              data: artifactData as any,
            });

            createdArtifactIds.push(artifact.id);

            // Find all items that belong to this artifact
            const resourceId = (artifactData.metadata as any)?.resourceId;
            const prNumber = (artifactData.metadata as any)?.prNumber;
            const issueNumber = (artifactData.metadata as any)?.issueNumber;

            if (resourceId) {
              const orConditions: any[] = [
                { externalResourceId: resourceId },
                { parentExternalResourceId: resourceId },
              ];

              if (prNumber !== undefined && prNumber !== null) {
                orConditions.push({
                  metadata: {
                    path: ['prNumber'],
                    equals: prNumber,
                  },
                });
              }

              if (issueNumber !== undefined && issueNumber !== null) {
                orConditions.push({
                  metadata: {
                    path: ['issueNumber'],
                    equals: issueNumber,
                  },
                });
              }

              await tx.knowledgeItem.updateMany({
                where: {
                  id: { in: items.map((i) => i.id) },
                  OR: orConditions,
                },
                data: {
                  artifactId: artifact.id,
                  ingestionStatus: IngestionStatus.handed_off,
                },
              });
            }
          }
        });

        // --- Stage 2 Hook ---
        // Trigger Knowledge Extraction asynchronously AFTER the transaction completes.
        // We use a single background setImmediate that iterates sequentially
        // to avoid slamming the AI Provider with parallel requests and hitting rate limits.
        if (createdArtifactIds.length > 0) {
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          
          setImmediate(async () => {
            for (const artifactId of createdArtifactIds) {
              try {
                await this.extractionService.extractFromArtifact(artifactId);
              } catch (err) {
                this.logger.error(
                  `Unexpected error dispatching extraction for artifact ${artifactId}: ${err.message}`,
                );
              }
              // Add a 1.5-second delay to avoid rate limiting or TPS spikes on the AI Gateway
              await sleep(1500);
            }
          });
        }

        this.logger.log(
          `Created ${artifactsData.length} Artifacts for ${provider}.`,
        );
      }

      // 4. Mark batch as acknowledged
      await this.prisma.ingestionBatch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.acknowledged,
          acknowledgedAt: new Date(),
        },
      });

      return {
        accepted: true,
        message: 'Batch assembled into Knowledge Artifacts successfully.',
      };
    } catch (error) {
      this.logger.error(`Failed to process batch ${batchId}:`, error);
      return {
        accepted: false,
        message: `Error: ${error.message}`,
      };
    }
  }
}
