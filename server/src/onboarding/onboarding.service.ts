/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { EyeStatus } from '@prisma/client';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    return await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          ...dto,
          status: 'pending_connections',
          createdByUser: { connect: { id: userId } },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { organizationId: org.id },
      });

      const eyeTypes = await tx.eyeType.findMany();

      const eyesData = eyeTypes.map((type) => ({
        organizationId: org.id,
        eyeTypeId: type.id,
        status: EyeStatus.disconnected,
        syncSchedule: '0 0 * * *',
        settings: {},
      }));

      await tx.organizationEye.createMany({
        data: eyesData,
      });

      await tx.onboardingProgress.create({
        data: {
          organizationId: org.id,
          currentStep: 'providers',
          isCompleted: false,
          completedSteps: {organization_created: true},
          startedAt: new Date(),
        },
      });

      return org;
    });
  }

  async updateProviders(
    userId: string,
    providers: { eyeType: string; providerKey: string }[],
  ) {
    const org = await this.prisma.organization.findFirst({
      where: { createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!org) throw new Error('Organization not found.');

    return await this.prisma.$transaction(async (tx) => {
      const updatedEyes = [];

      for (const item of providers) {
        const validMapping = await tx.eyeProvider.findFirst({
          where: {
            eyeType: { key: item.eyeType },
            provider: { key: item.providerKey },
          },
          include: { eyeType: true, provider: true },
        });

        if (!validMapping || !validMapping.isAvailableInV1) {
          throw {
            code: 'VALIDATION_ERROR',
            field: `providers[${providers.indexOf(item)}].providerKey`,
            message: `${item.providerKey} is not available for the ${item.eyeType} Eye in V1.`,
          };
        }

        const eye = await tx.organizationEye.update({
          where: {
            organizationId_eyeTypeId: {
              organizationId: org.id,
              eyeTypeId: validMapping.eyeTypeId,
            },
          },
          data: {
            selectedProviderId: validMapping.providerId,
            status: 'disconnected',
          },
          select: {
            id: true,
            status: true,
            eyeTypeId: true,
            selectedProviderId: true,
          },
        });
        updatedEyes.push(eye);
      }

      return updatedEyes;
    });
  }

  async getProgress(userId: string) {
  const org = await this.prisma.organization.findFirst({
    where: { createdByUserId: userId }
  });
  
  if (!org) throw new Error("Organization not found.");

  return await this.prisma.onboardingProgress.findUnique({
    where: { organizationId: org.id }
  });
  }

  async completeOnboarding(userId: string) {
  const org = await this.prisma.organization.findFirst({
    where: { createdByUserId: userId }
  });

  if (!org) throw new Error("Organization not found.");

  return await this.prisma.onboardingProgress.update({
    where: { organizationId: org.id },
    data: { 
      isCompleted: true,
      currentStep: 'dashboard' 
    }
  });
}
}
