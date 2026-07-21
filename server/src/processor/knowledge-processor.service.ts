import { Injectable, Logger } from '@nestjs/common';
import {
  KnowledgeProcessorGateway,
  ProcessorHandoffResult,
} from '../integrations/contracts/processor-gateway.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AssemblerFactory } from './assemblers/assembler.factory';
import { BatchStatus, IngestionStatus } from '@prisma/client';

@Injectable()
export class KnowledgeProcessorService implements KnowledgeProcessorGateway {
  private readonly logger = new Logger(KnowledgeProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assemblerFactory: AssemblerFactory,
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

        // Save artifacts and update knowledge items
        await this.prisma.$transaction(async (tx) => {
          for (const artifactData of artifactsData) {
            // Create the artifact
            const artifact = await tx.knowledgeArtifact.create({
              data: artifactData as any,
            });

            // Find all items that belong to this artifact (this assumes the assembler grouped them correctly,
            // but for safety, we can just link all items in this provider batch that match the resourceId)
            // The assembler doesn't return the mapping. We should probably pass it back, but simpler:
            // Since we grouped by externalResourceId in the slack assembler, we can find them.
            // Actually, best approach is just to let the items link to the first artifact in MVP,
            // or we update the assembler interface to return { artifact, items }.
            // For now, let's just do a bulk link for items that belong to the same resource.
            const resourceId = (artifactData.metadata as any)?.resourceId;
            if (resourceId) {
              await tx.knowledgeItem.updateMany({
                where: {
                  id: { in: items.map((i) => i.id) },
                  OR: [
                    { externalResourceId: resourceId },
                    { parentExternalResourceId: resourceId },
                  ],
                },
                data: {
                  artifactId: artifact.id,
                  ingestionStatus: IngestionStatus.handed_off, // We consider it handed off to Stage 2
                },
              });
            }
          }
        });

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
