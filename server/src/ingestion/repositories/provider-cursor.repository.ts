import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Repository for ProviderCursor CRUD operations.
 * Manages polling/pagination state per connection+resource.
 */
@Injectable()
export class ProviderCursorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByConnectionAndResource(
    connectionId: string,
    externalResourceId: string | null,
  ) {
    return this.prisma.providerCursor.findUnique({
      where: {
        connectionId_externalResourceId: {
          connectionId,
          externalResourceId: externalResourceId ?? '',
        },
      },
    });
  }

  async upsert(
    connectionId: string,
    externalResourceId: string | null,
    cursorValue: string,
  ) {
    const key = externalResourceId ?? '';
    return this.prisma.providerCursor.upsert({
      where: {
        connectionId_externalResourceId: {
          connectionId,
          externalResourceId: key,
        },
      },
      create: {
        connectionId,
        externalResourceId: key || null,
        cursorValue,
        lastFetchedAt: new Date(),
      },
      update: {
        cursorValue,
        lastFetchedAt: new Date(),
      },
    });
  }

  async deleteByConnectionId(connectionId: string) {
    return this.prisma.providerCursor.deleteMany({
      where: { connectionId },
    });
  }
}
