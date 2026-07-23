import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';
import { KnowledgeAssembler } from '../../processor/assemblers/knowledge-assembler.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { SlackClientService } from './slack-client.service';

@Injectable()
export class SlackAssemblerService implements KnowledgeAssembler {
  private readonly logger = new Logger(SlackAssemblerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slackClient: SlackClientService,
  ) {}

  supports(provider: string): boolean {
    return provider.toLowerCase() === 'slack';
  }

  async assemble(
    items: KnowledgeItem[],
  ): Promise<Partial<KnowledgeArtifact>[]> {
    if (items.length === 0) return [];

    const organizationId = items[0].organizationId;

    // 1. Fetch connection for this org to retrieve and update user map
    const connection = await this.prisma.providerConnection.findFirst({
      where: {
        organizationEye: { organizationId },
        provider: { name: 'slack' },
      },
    });

    let userMap: Record<string, string> = {};

    if (connection) {
      const meta = (connection.connectionMetadata as Record<string, any>) || {};
      userMap = (meta.userMap as Record<string, string>) || {};

      // 2. Identify missing users
      const missingUserIds = new Set<string>();
      const idRegex = /<@(U[A-Z0-9]+|W[A-Z0-9]+)>/g;

      for (const item of items) {
        // Check author
        const authorId = item.author ? (item.author as any).externalId : null;
        if (authorId && !userMap[authorId]) {
          missingUserIds.add(authorId);
        }

        // Check content
        let match;
        while ((match = idRegex.exec(item.content)) !== null) {
          const id = match[1];
          if (!userMap[id]) {
            missingUserIds.add(id);
          }
        }
      }

      // 3. Fetch users if missing
      if (missingUserIds.size > 0) {
        this.logger.log(`Found ${missingUserIds.size} unknown Slack users. Fetching user list...`);
        try {
          const newMap = await this.slackClient.fetchWorkspaceUsers(connection as any);
          userMap = { ...userMap, ...newMap };

          // Save to DB
          await this.prisma.providerConnection.update({
            where: { id: connection.id },
            data: {
              connectionMetadata: {
                ...meta,
                userMap,
              },
            },
          });
          this.logger.log('Updated Slack userMap in connection metadata.');
        } catch (err) {
          this.logger.error(`Failed to fetch workspace users: ${(err as Error).message}`);
        }
      }
    }

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
        const authorId = item.author
          ? (item.author as any).externalId || 'Unknown User'
          : 'Unknown User';
        
        const authorName = userMap[authorId] || authorId;
        const time = item.occurredAt.toISOString();

        let content = item.content;
        // Replace <@U1234> with @Name
        content = content.replace(/<@(U[A-Z0-9]+|W[A-Z0-9]+)>/g, (match, id) => {
          return userMap[id] ? `@${userMap[id]}` : match;
        });

        return `[${time}] ${authorName}: ${content}`;
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
