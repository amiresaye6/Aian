import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardOwnerData } from './dashboard.types';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnerDashboard(userId: string): Promise<DashboardOwnerData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            country: true,
            industry: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user?.organizationId || !user.organization) {
      throw new NotFoundException('Organization not found.');
    }

    const organizationId = user.organizationId;

    const [
      subscription,
      onboardingProgress,
      organizationEyes,
      eyeTypes,
      providers,
      integrations,
      syncJobs,
      knowledgeFiles,
      memberCount,
      roleCount,
      knowledgeItemCounts,
      processingSettings,
    ] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { organizationId },
      }),

      this.prisma.onboardingProgress.findFirst({
        where: { organizationId },
      }),

      this.prisma.organizationEye.findMany({
        where: { organizationId },
      }),

      this.prisma.eyeType.findMany(),

      this.prisma.provider.findMany(),

      this.prisma.providerConnection.findMany({
        where: { organizationEye: { organizationId } },
      }),

      this.prisma.collectionRun.findMany({
        where: { organizationEye: { organizationId } },
      }),

      this.prisma.organizationKnowledgeFile.findMany({
        where: { organizationId },
      }),

      this.prisma.user.count({
        where: {
          organizationId,
          memberStatus: 'active',
        },
      }),

      this.prisma.role.count({
        where: {
          OR: [{ organizationId: null }, { organizationId }],
        },
      }),

      this.prisma.knowledgeItem.groupBy({
        by: ['provider'],
        where: { organizationId },
        _count: { _all: true },
      }),

      this.prisma.organizationProcessingSettings.findUnique({
        where: { organizationId },
      }),
    ]);

    return {
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        status: user.organization.status,
        country: user.organization.country,
        industry: user.organization.industry,
        slug: user.organization.slug,
        logo_url: user.organization.logoUrl,
      },

      subscription: subscription
        ? {
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            currentPeriodEnd:
              subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,

      onboardingProgress: onboardingProgress
        ? {
            currentStep: onboardingProgress.currentStep,
            isCompleted: onboardingProgress.isCompleted,
          }
        : null,

      eyes: organizationEyes.map((eye) => {
        const eyeType = eyeTypes.find((e) => e.id === eye.eyeTypeId);

        const provider = providers.find((p) => p.id === eye.selectedProviderId);

        return {
          id: eye.id,
          eyeType: eyeType?.key ?? '',
          eyeTypeName: eyeType?.name ?? '',
          providerName: provider?.name ?? null,
          status: eye.status,
        };
      }),

      integrations: integrations.map((integration) => {
        const providerName = providers.find(p => p.id === integration.providerId)?.key?.toUpperCase();
        const itemCount = knowledgeItemCounts.find(k => k.provider.toUpperCase() === providerName)?._count?._all || 0;
        return {
          id: integration.id,
          organizationEyeId: integration.organizationEyeId,
          providerId: integration.providerId,
          status: integration.status,
          externalAccountName: integration.externalAccountName,
          lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
          connectedAt: integration.connectedAt.toISOString(),
          knowledgeItems: itemCount,
        };
      }),

      syncJobs: syncJobs.map((job) => ({
        id: job.id,
        status: job.status,
        startedAt: job.startedAt?.toISOString() ?? null,
        finishedAt: job.finishedAt?.toISOString() ?? null,
      })),

      knowledgeFiles: knowledgeFiles.map((file) => ({
        id: file.id,
        name: file.originalFileName,
        status: file.status,
        uploadedAt: file.createdAt.toISOString(),
      })),

      processingSettings: processingSettings ? {
        timeIntervalHours: processingSettings.timeIntervalHours,
      } : { timeIntervalHours: 6 },

      memberCount,

      roleCount,
    };
  }
}
