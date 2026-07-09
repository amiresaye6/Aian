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
        organization: { select: { id: true, name: true, status: true , country: true, industry: true } },
      },
    });

    if (!user?.organizationId || !user.organization) {
      throw new NotFoundException('Organization not found.');
    }

    const organizationId = user.organizationId;

    const [subscription, onboardingProgress, organizationEyes, eyeTypes, providers, memberCount, roleCount] =
      await Promise.all([
        this.prisma.subscription.findUnique({ where: { organizationId } }),
        this.prisma.onboardingProgress.findUnique({ where: { organizationId } }),
        this.prisma.organizationEye.findMany({ where: { organizationId } }),
        this.prisma.eyeType.findMany(),
        this.prisma.provider.findMany(),
        this.prisma.user.count({ where: { organizationId, memberStatus: 'active' } }),
        this.prisma.role.count({ where: { OR: [{ organizationId: null }, { organizationId }] } }),
      ]);

    return {
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        status: user.organization.status,
        country: user.organization.country,
        industry: user.organization.industry,
        
      },
      subscription: subscription
        ? { billingCycle: subscription.billingCycle, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null }
        : null,
      onboardingProgress: onboardingProgress
        ? { currentStep: onboardingProgress.currentStep, isCompleted: onboardingProgress.isCompleted }
        : null,
      eyes: organizationEyes.map((eye) => {
        const eyeType = eyeTypes.find((e) => e.id === eye.eyeTypeId);
        const provider = providers.find((p) => p.id === eye.selectedProviderId);
        return { eyeType: eyeType?.name ?? '', providerName: provider?.name ?? null, status: eye.status };
      }),
      memberCount,
      roleCount,
    };
  }
}