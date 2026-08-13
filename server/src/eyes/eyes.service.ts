import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EyeStatusItem, EyeDetailResponse, EyeCatalogResponse } from './types/eyes.types';

@Injectable()
export class EyesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<EyeStatusItem[]> {
    const eyes = await this.prisma.organizationEye.findMany({
      where: { organizationId },
      include: { 
        eyeType: true, 
        selectedProvider: true,
        connection: { include: { provider: true } }
      },
    });

    return eyes.map((eye) => {
      const activeProvider = eye.connection?.provider || eye.selectedProvider;
      return {
        id: eye.id,
        eyeType: eye.eyeType.key,
        category: eye.eyeType.name,
        tagline: eye.eyeType.description,
        providerKey: activeProvider?.key ?? null,
        providerName: activeProvider?.name ?? null,
        logoUrl: activeProvider?.logoUrl ?? null,
        status: eye.status,
        connectionId: eye.connection?.id ?? null,
      };
    });
  }


  async findOne(
    organizationId: string,
    eyeType: string,
  ): Promise<EyeDetailResponse> {
    const eye = await this.prisma.organizationEye.findFirst({
      where: { organizationId, eyeType: { key: eyeType } },
      include: { 
        eyeType: true, 
        selectedProvider: true,
        connection: { include: { provider: true } }
      },
    });

    if (!eye) throw new NotFoundException(`Eye of type ${eyeType} not found.`);

    const activeProvider = eye.connection?.provider || eye.selectedProvider;

    return {
      id: eye.id,
      eyeType: eye.eyeType.key,
      providerName: activeProvider?.name ?? null,
      providerLogoUrl: activeProvider?.logoUrl ?? null,
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

  async getCatalog(): Promise<EyeCatalogResponse[]> {
    const eyeTypes = await this.prisma.eyeType.findMany({
      where: { isActive: true },
      include: {
        providers: {
          where: { isEnabled: true },
          include: {
            provider: true,
          },
        },
      },
      orderBy: { key: 'asc' }, // simple predictable ordering
    });

    return eyeTypes.map((eye) => ({
      key: eye.key,
      name: eye.name,
      description: eye.description,
      providers: eye.providers.map((ep) => ({
        key: ep.provider.key,
        name: ep.provider.name,
        logoUrl: ep.provider.logoUrl,
        availableInV1: ep.isAvailableInV1,
      })),
    }));
  }
}
