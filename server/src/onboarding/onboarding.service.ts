import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { EyeStatus } from '@prisma/client';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            ...dto,
            status: 'pending_connections',
            createdByUser: { connect: { id: userId } },
          },
        });

        const ownerRole = await tx.role.findFirst({
          where: { key: 'owner', organizationId: null },
        });

        if (!ownerRole) {
          throw new Error('Owner role not found. Please check seed data.');
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            organizationId: org.id,
            roleId: ownerRole.id,
            memberStatus: 'active',
            joinedAt: new Date(),
          },
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
            completedSteps: { organization_created: true },
            startedAt: new Date(),
          },
        });

        return org;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta?.target as string[]) ?? ['slug'];
        const field = target[0] ?? 'slug';

        throw new HttpException(
          {
            success: false,
            message: `This organization ${field} is already taken. Please choose another one.`,
            error: {
              code: 'VALIDATION_ERROR',
              fields: {
                [field]: [`This ${field} is already taken.`],
              },
            },
          },
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async updateProviders(
    organizationId: string,
    providers: { eyeType: string; providerKey: string }[],
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const progress = await tx.onboardingProgress.findUnique({
        where: { organizationId },
      });

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
          throw new HttpException(
            {
              success: false,
              message: 'One or more selected providers are not available.',
              error: {
                code: 'VALIDATION_ERROR',
                fields: {
                  [`providers[${providers.indexOf(item)}].providerKey`]: [
                    `${item.providerKey} is not available for the ${item.eyeType} Eye in V1.`,
                  ],
                },
              },
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }

        const eye = await tx.organizationEye.update({
          where: {
            organizationId_eyeTypeId: {
              organizationId,
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

      await tx.onboardingProgress.update({
        where: { organizationId },
        data: {
          currentStep: 'dashboard',
          completedSteps: {
            ...((progress?.completedSteps as object) || {}),
            providers_selected: true,
          },
        },
      });

      return updatedEyes;
    });
  }

  async getProgress(organizationId: string) {
    return await this.prisma.onboardingProgress.findUnique({
      where: { organizationId },
    });
  }

  async completeOnboarding(organizationId: string) {
    return await this.prisma.onboardingProgress.update({
      where: { organizationId },
      data: {
        isCompleted: true,
        currentStep: 'dashboard',
        completedAt: new Date(),
      },
    });
  }
}
