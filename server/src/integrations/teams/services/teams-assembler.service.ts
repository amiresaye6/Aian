import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';
import { KnowledgeAssembler } from '../../../processor/assemblers/knowledge-assembler.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TeamsAssemblerService implements KnowledgeAssembler {
  private readonly logger = new Logger(TeamsAssemblerService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  supports(provider: string): boolean {
    return provider.toLowerCase() === 'microsoft_teams' || provider.toLowerCase() === 'teams';
  }

  async assemble(
    items: KnowledgeItem[],
  ): Promise<Partial<KnowledgeArtifact>[]> {
    if (items.length === 0) return [];

    const organizationId = items[0].organizationId;
    const provider = items[0].provider; // Should be 'microsoft_teams'

    // Group items by grouping key
    const grouped = items.reduce(
      (acc, item) => {
        let key = '';
        if (item.eyeType === 'MEETING') {
          // Group by Meeting ID
          key = `meeting-${item.externalEventId}`;
        } else {
          // Group by Channel/Chat ID or Parent ID (Thread)
          key = `chat-${item.parentExternalResourceId || item.externalResourceId}`;
        }

        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, KnowledgeItem[]>,
    );

    const artifacts: Partial<KnowledgeArtifact>[] = [];

    for (const [key, groupItems] of Object.entries(grouped)) {
      // Sort items chronologically
      groupItems.sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      );

      const isMeeting = key.startsWith('meeting-');
      const resourceId = groupItems[0].externalResourceId;

      if (isMeeting) {
        // Aggregate meeting contents
        const fullContent = groupItems.map(item => item.content).filter(Boolean).join('\n\n');

        // Aggregate participants
        const participantsSet = new Map<string, any>();
        groupItems.forEach((item) => {
          const parts = item.participants as any[];
          if (Array.isArray(parts)) {
            parts.forEach((p) => {
              if (p.externalId && !participantsSet.has(p.externalId)) {
                participantsSet.set(p.externalId, p);
              }
            });
          }
        });
        const participants = Array.from(participantsSet.values());

        artifacts.push({
          organizationId,
          type: ArtifactType.meeting_outcome,
          provider: provider,
          title: groupItems[0].title || `Teams Meeting (${groupItems[0].externalEventId})`,
          content: fullContent,
          participants: participants as any,
          metadata: {
            originalItemCount: groupItems.length,
            resourceId: resourceId,
            eventId: groupItems[0].externalEventId,
            teamId: (groupItems[0].metadata as any)?.teamId,
            startTime: groupItems[0].occurredAt.toISOString(),
            endTime: groupItems[groupItems.length - 1].occurredAt.toISOString(),
          },
        });
      } else {
        // Chat / Channel Message
        const lines = groupItems.map((item) => {
          const authorName = item.author
            ? (item.author as any).name || (item.author as any).externalId || 'Unknown User'
            : 'Unknown User';
          
          const time = item.occurredAt.toISOString();
          const content = item.content || '';

          return `[${time}] ${authorName}: ${content}`;
        });

        const fullContent = lines.join('\n\n');

        // Aggregate participants
        const participantsSet = new Map<string, any>();
        groupItems.forEach((item) => {
          const parts = item.participants as any[];
          if (Array.isArray(parts)) {
            parts.forEach((p) => {
              if (p.externalId && !participantsSet.has(p.externalId)) {
                participantsSet.set(p.externalId, p);
              }
            });
          }
        });
        const participants = Array.from(participantsSet.values());

        artifacts.push({
          organizationId,
          type: ArtifactType.conversation,
          provider: provider,
          title: `Teams Conversation (${resourceId})`,
          content: fullContent,
          participants: participants as any,
          metadata: {
            originalItemCount: groupItems.length,
            resourceId: resourceId,
            teamId: (groupItems[0].metadata as any)?.teamId,
            startTime: groupItems[0].occurredAt.toISOString(),
            endTime: groupItems[groupItems.length - 1].occurredAt.toISOString(),
          },
        });
      }
    }

    return artifacts;
  }
}
