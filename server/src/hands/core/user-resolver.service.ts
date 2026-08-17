import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SlackClientService } from '../../integrations/slack/slack-client.service';

export interface ResolvedUserProfile {
  internalUserId: string;
  fullName: string;
  email: string;
}

/**
 * Resolves external provider user IDs (e.g. Slack's U12345ABC) to internal
 * user profiles by cross-referencing the provider's cached user map with
 * the organization's member list.
 *
 * Strategy:
 *   1. Read the Slack connection's connectionMetadata.userMap (Slack ID → name).
 *   2. If the Slack user is missing from the map, refresh it from the Slack API.
 *   3. Match the Slack display name against the org's internal User records.
 *   4. Fallback to Slack display name with no email if matching fails.
 */
@Injectable()
export class UserResolverService {
  private readonly logger = new Logger(UserResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slackClient: SlackClientService,
  ) {}

  /**
   * Resolves a Slack external user ID to an internal user profile.
   */
  async resolveSlackUser(
    organizationId: string,
    slackUserId: string,
    connectionId: string,
  ): Promise<ResolvedUserProfile | undefined> {
    try {
      // 1. Fetch the Slack connection's metadata which contains the userMap
      const connection = await this.prisma.providerConnection.findUnique({
        where: { id: connectionId },
        select: {
          id: true,
          connectionMetadata: true,
          accessTokenEncrypted: true,
          refreshTokenEncrypted: true,
          tokenExpiresAt: true,
          externalAccountId: true,
          externalAccountName: true,
          organizationEyeId: true,
          providerId: true,
          status: true,
        },
      });

      if (!connection) return undefined;

      const metadata =
        (connection.connectionMetadata as Record<string, any>) || {};
      let userMap = (metadata.userMap as Record<string, string>) || {};
      let slackDisplayName = userMap[slackUserId];

      // 2. If the user is not in the cached map, refresh from Slack API
      if (!slackDisplayName) {
        this.logger.log(
          `Slack user ${slackUserId} not in cached userMap. Refreshing from Slack API...`,
        );
        try {
          const freshMap = await this.slackClient.fetchWorkspaceUsers(
            connection as any,
          );
          userMap = { ...userMap, ...freshMap };
          slackDisplayName = userMap[slackUserId];

          // Persist the updated map
          await this.prisma.providerConnection.update({
            where: { id: connection.id },
            data: {
              connectionMetadata: { ...metadata, userMap },
            },
          });
        } catch (refreshErr) {
          this.logger.warn(
            `Failed to refresh Slack userMap: ${(refreshErr as Error).message}`,
          );
        }
      }

      if (!slackDisplayName) {
        this.logger.warn(
          `Could not resolve Slack user ${slackUserId} — not found even after refresh.`,
        );
        return undefined;
      }

      // 3. Match the Slack display name against internal org users
      const orgUsers = await this.prisma.user.findMany({
        where: { organizationId },
        select: { id: true, fullName: true, email: true },
      });

      if (orgUsers.length > 0) {
        const normalizedSlackName = slackDisplayName.toLowerCase().trim();

        const matchedUser = orgUsers.find((u) => {
          const normalizedFullName = u.fullName.toLowerCase().trim();
          return (
            normalizedFullName === normalizedSlackName ||
            normalizedSlackName.includes(normalizedFullName) ||
            normalizedFullName.includes(normalizedSlackName)
          );
        });

        if (matchedUser) {
          return {
            internalUserId: matchedUser.id,
            fullName: matchedUser.fullName,
            email: matchedUser.email,
          };
        }
      }

      // 4. Fallback: return Slack display name without internal email
      this.logger.warn(
        `Could not match Slack user ${slackUserId} (${slackDisplayName}) to any internal user in org ${organizationId}. Using Slack display name.`,
      );
      return {
        internalUserId: slackUserId,
        fullName: slackDisplayName,
        email: '',
      };
    } catch (e) {
      this.logger.error(
        `Failed to resolve Slack user ${slackUserId}: ${(e as Error).message}`,
      );
      return undefined;
    }
  }
}
