/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EyeStatusItem, EyeDetailResponse } from './types/eyes.types';

@Injectable()
export class EyesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<EyeStatusItem[]> {
    const eyes = await this.prisma.organizationEye.findMany({
      where: { organizationId },
      include: { eyeType: true, selectedProvider: true },
    });

    return eyes.map((eye) => ({
      eyeType: eye.eyeType.key,
      providerName: eye.selectedProvider?.name ?? null,
      status: eye.status,
    }));
  }

  async findOne(
    organizationId: string,
    eyeType: string,
  ): Promise<EyeDetailResponse> {
    const eye = await this.prisma.organizationEye.findFirst({
      where: { organizationId, eyeType: { key: eyeType } },
      include: { eyeType: true, selectedProvider: true },
    });

    if (!eye) throw new NotFoundException(`Eye of type ${eyeType} not found.`);

    return {
      id: eye.id,
      eyeType: eye.eyeType.key,
      providerName: eye.selectedProvider?.name ?? null,
      providerLogoUrl: eye.selectedProvider?.logoUrl ?? null,
      status: eye.status,
      lastSyncedAt: eye.lastSuccessfulSyncAt?.toISOString() ?? null,
      connectionExplanation:
        'OAuth connection will be available in the integrations sprint.',
    };
  }

  async requestConnection(organizationId: string, eyeType: string) {
    await this.findOne(organizationId, eyeType);
    return {
      success: true,
      message: 'OAuth connection will be available in the integrations sprint.',
      data: { eyeStatus: 'ready_to_connect' },
    };
  }
}
