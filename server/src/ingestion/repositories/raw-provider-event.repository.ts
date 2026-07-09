import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for RawProviderEvent storage.
 * Immutable — events are only created, never updated or deleted by application code.
 */
@Injectable()
export class RawProviderEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    connectionId: string;
    provider: string;
    eyeType: string;
    providerEventType: string;
    providerEventId?: string;
    payload: Prisma.InputJsonValue;
  }) {
    return this.prisma.rawProviderEvent.create({ data });
  }

  async findById(id: string) {
    return this.prisma.rawProviderEvent.findUnique({ where: { id } });
  }

  async findByConnectionId(
    connectionId: string,
    options?: { take?: number; skip?: number },
  ) {
    return this.prisma.rawProviderEvent.findMany({
      where: { connectionId },
      orderBy: { receivedAt: 'desc' },
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
    });
  }
}
