import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';
import { KnowledgeAssembler } from '../../processor/assemblers/knowledge-assembler.interface';

@Injectable()
export class SlackAssemblerService implements KnowledgeAssembler {
  private readonly logger = new Logger(SlackAssemblerService.name);

  supports(provider: string): boolean {
    return provider.toLowerCase() === 'slack';
  }

  async assemble(
    items: KnowledgeItem[],
  ): Promise<Partial<KnowledgeArtifact>[]> {
    if (items.length === 0) return [];

    // Group items by externalResourceId (usually the Slack channel or thread)
    const grouped = items.reduce(
      (acc, item) => {
        // If it's a thread reply, group it under the parent thread if we have it, else use channel
        const key = item.parentExternalResourceId || item.externalResourceId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, KnowledgeItem[]>,
    );

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const [resourceId, groupItems] of Object.entries(grouped)) {
      // Sort items chronologically
      groupItems.sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      );

      // Concatenate content into a clean script format
      const lines = groupItems.map((item) => {
        const author = item.author
          ? (item.author as any).externalId || 'Unknown User'
          : 'Unknown User';
        const time = item.occurredAt.toISOString();
        return `[${time}] ${author}: ${item.content}`;
      });

      const fullContent = lines.join('\n\n');

      // Aggregate all unique participants
      const participantsSet = new Set<string>();
      groupItems.forEach((item) => {
        const parts = item.participants as any[];
        if (Array.isArray(parts)) {
          parts.forEach(
            (p) => p.externalId && participantsSet.add(p.externalId),
          );
        }
      });
      const participants = Array.from(participantsSet).map((id) => ({
        externalId: id,
      }));

      const organizationId = groupItems[0].organizationId;

      artifacts.push({
        organizationId,
        type: ArtifactType.conversation,
        provider: 'slack',
        title: `Slack Conversation (${resourceId})`,
        content: fullContent,
        participants: participants as any,
        metadata: {
          originalItemCount: groupItems.length,
          resourceId,
          startTime: groupItems[0].occurredAt.toISOString(),
          endTime: groupItems[groupItems.length - 1].occurredAt.toISOString(),
        },
      });
    }

    return artifacts;
  }
}
