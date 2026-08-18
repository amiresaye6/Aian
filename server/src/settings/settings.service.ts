import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphService: GraphService,
  ) {}

  async patchOrganization(organizationId: string, dto: UpdateOrganizationDto) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    if (dto.slug && dto.slug !== organization.slug) {
      const existing = await this.prisma.organization.findFirst({
        where: {
          slug: dto.slug,
          id: { not: organizationId },
        },
      });

      if (existing) {
        throw new ConflictException('Organization slug is already in use.');
      }
    }

    const updateData: {
      name?: string;
      slug?: string;
      description?: string;
      industry?: string;
      country?: string;
      timezone?: string;
      logoUrl?: string;
    } = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.industry !== undefined) updateData.industry = dto.industry;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.logo !== undefined) updateData.logoUrl = dto.logo;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;

    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    return {
      success: true,
      message: 'Organization updated successfully.',
      data: updatedOrg,
    };
  }

  async deleteOrganization(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    // Delete all Neo4j graph entities and relationships for this organization
    try {
      await this.graphService.deleteOrganizationGraph(organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to clean up Neo4j graph for organization ${organizationId}: ${error.message}`,
      );
    }

    const eyes = await this.prisma.organizationEye.findMany({
      where: { organizationId },
      select: {
        id: true,
        connection: {
          select: { id: true },
        },
      },
    });

    const connectionIds = eyes
      .map((e) => e.connection?.id)
      .filter((id): id is string => Boolean(id));

    await this.prisma.$transaction(async (tx) => {
      // 1. Meetings & Registrants
      if (connectionIds.length > 0) {
        await tx.meetingRegistrant.deleteMany({
          where: { connectionId: { in: connectionIds } },
        });
        await tx.meeting.deleteMany({
          where: { connectionId: { in: connectionIds } },
        });

        // 2. Provider Cursors, Resource Selections, Raw Events
        await tx.providerCursor.deleteMany({
          where: { connectionId: { in: connectionIds } },
        });
        await tx.providerResourceSelection.deleteMany({
          where: { connectionId: { in: connectionIds } },
        });
        await tx.rawProviderEvent.deleteMany({
          where: { connectionId: { in: connectionIds } },
        });
      }

      // 3. Collection Runs & Provider Connections & Organization Eyes
      await tx.collectionRun.deleteMany({
        where: { organizationEye: { organizationId } },
      });

      if (connectionIds.length > 0) {
        await tx.providerConnection.deleteMany({
          where: { id: { in: connectionIds } },
        });
      }

      await tx.organizationEye.deleteMany({
        where: { organizationId },
      });

      // 4. Ingestion Batches & Items & Knowledge Items
      await tx.ingestionBatchItem.deleteMany({
        where: {
          OR: [
            { batch: { organizationId } },
            { knowledgeItem: { organizationId } },
          ],
        },
      });

      await tx.ingestionBatch.deleteMany({
        where: { organizationId },
      });

      await tx.knowledgeItem.deleteMany({
        where: { organizationId },
      });

      // 5. Entity Mentions, Resolved Entities, Knowledge Artifacts
      await tx.entityMention.deleteMany({
        where: {
          OR: [
            { artifact: { organizationId } },
            { resolvedEntity: { organizationId } },
          ],
        },
      });

      await tx.resolvedEntity.deleteMany({
        where: { organizationId },
      });

      await tx.knowledgeArtifact.deleteMany({
        where: { organizationId },
      });

      // 6. Knowledge Files, Onboarding, Processing Settings, Sync Runs
      await tx.organizationKnowledgeFile.deleteMany({
        where: { organizationId },
      });

      await tx.organizationProcessingSettings.deleteMany({
        where: { organizationId },
      });

      await tx.onboardingProgress.deleteMany({
        where: { organizationId },
      });

      await tx.syncRun.deleteMany({
        where: { organizationId },
      });

      // 7. Hands Sessions & Audit Logs
      await tx.handsSession.deleteMany({
        where: { organizationId },
      });

      await tx.auditLog.deleteMany({
        where: { organizationId },
      });

      // 8. Conversations & Chat Messages
      await tx.chatMessage.deleteMany({
        where: { conversation: { organizationId } },
      });

      await tx.conversation.deleteMany({
        where: { organizationId },
      });

      // 9. Custom Roles created for this organization
      const customRoles = await tx.role.findMany({
        where: {
          organizationId,
          isSystemRole: false,
        },
        select: { id: true },
      });

      const customRoleIds = customRoles.map((r) => r.id);
      if (customRoleIds.length > 0) {
        await tx.user.updateMany({
          where: { roleId: { in: customRoleIds } },
          data: { roleId: null },
        });

        await tx.rolePermission.deleteMany({
          where: { roleId: { in: customRoleIds } },
        });

        await tx.role.deleteMany({
          where: { id: { in: customRoleIds } },
        });
      }

      // 10. Unlink user invitations
      await tx.user.updateMany({
        where: { organizationId },
        data: { invitedByUserId: null },
      });

      // 11. Delete ongoing subscription & usage data, retaining historical paid financial records
      await tx.usagePeriodSnapshot.deleteMany({
        where: { organizationId },
      });

      await tx.aiUsageLog.deleteMany({
        where: { organizationId },
      });

      await tx.subscription.deleteMany({
        where: { organizationId },
      });

      const paymentCount = await tx.payment.count({
        where: { organizationId },
      });
      const ledgerCount = await tx.ledgerEvent.count({
        where: { organizationId },
      });

      const hasPaidFinancialRecords = paymentCount > 0 || ledgerCount > 0;

      if (hasPaidFinancialRecords) {
        // Retain shell Organization record to preserve FK integrity for historical financial records (payments & ledger)
        const fallbackUser =
          (await tx.user.findFirst({ where: { isSuperAdmin: true } })) ||
          (await tx.user.findFirst({
            where: {
              OR: [
                { organizationId: { not: organizationId } },
                { organizationId: null },
              ],
            },
          }));

        if (fallbackUser) {
          await tx.organization.update({
            where: { id: organizationId },
            data: {
              createdByUserId: fallbackUser.id,
              name: '[Deleted Organization]',
              status: 'suspended',
              logoUrl: null,
              description: null,
            },
          });
        }

        await tx.user.deleteMany({
          where: { organizationId },
        });
      } else {
        // No paid financial records: delete Organization first to remove creator FK constraint, then delete users
        await tx.organization.delete({
          where: { id: organizationId },
        });

        await tx.user.deleteMany({
          where: { organizationId },
        });
      }
    });

    return {
      success: true,
      message: 'Organization and all associated data deleted successfully.',
    };
  }
}
