import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact } from '@prisma/client';
import { KnowledgeAssembler } from '../../processor/assemblers/knowledge-assembler.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ZoomClientService } from './zoom-client.service';

@Injectable()
export class ZoomAssemblerService implements KnowledgeAssembler {
  private readonly logger = new Logger(ZoomAssemblerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly zoomClientService: ZoomClientService,
  ) {}

  supports(provider: string): boolean {
    return provider.toLowerCase() === 'zoom';
  }

  async assemble(items: KnowledgeItem[]): Promise<Partial<KnowledgeArtifact>[]> {
    if (!items || items.length === 0) return [];

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const item of items) {
      const organizationId = item.organizationId;
      const metadata: any = item?.metadata || {};
      const summarization = metadata?.summarization || '';
      const content = item?.content || '';

      if (!content) continue;

      const maxChunkLength = Math.max(1000, 5000 - summarization.length);

      const chunks = this.splitContentSafely(content, maxChunkLength);

      chunks.forEach((chunk, index) => {
        const partNumber = index + 1;
        const finalContent = 
            `meeting started at: ${metadata.joinedAt || 'N/A'} and ended at ${metadata.exitedAt || 'N/A'}
            summary of full meeting: ${summarization}
            and this is part number ${partNumber} of the conversation occurred in the meeting:
            ${chunk}`;

        artifacts.push({
          organizationId,
          type: 'meeting_outcome',
          provider: 'zoom',
          title: 'zoom meeting data',
          content: finalContent,
          participants: item.participants,
          metadata: item.metadata,
        });
      });
    }

    return artifacts;
  }

  private splitContentSafely(content: string, maxLength: number): string[] {
    const lines = content.split(/(?=\[[^\]]+\])/g);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + line).length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += line;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}