import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';

@Controller('eyes/:connectionId/knowledge')
export class KnowledgeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionRepo: ProviderConnectionRepository,
  ) {}

  @Get('recent')
  async getRecentKnowledge(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');

    const items = await this.prisma.knowledgeItem.findMany({
      where: {
        organizationId: connection.organizationId,
        provider: connection.providerKey.toUpperCase(), 
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        sourceType: true,
        createdAt: true,
        metadata: true,
      }
    });
    
    return items;
  }

  @Get('stats')
  async getKnowledgeStats(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');

    const total = await this.prisma.knowledgeItem.count({
      where: {
        organizationId: connection.organizationId,
        provider: connection.providerKey.toUpperCase(),
      }
    });

    // In a real scenario we could group by sourceType
    const grouped = await this.prisma.knowledgeItem.groupBy({
      by: ['sourceType'],
      where: {
        organizationId: connection.organizationId,
        provider: connection.providerKey.toUpperCase(),
      },
      _count: true,
    });

    const breakdown = {
      documents: 0,
      messages: 0,
      entities: 0,
    };
    
    grouped.forEach(g => {
      const type = g.sourceType.toLowerCase();
      if (type.includes('message') || type.includes('chat')) {
        breakdown.messages += g._count;
      } else if (type.includes('issue') || type.includes('task') || type.includes('repo')) {
        breakdown.entities += g._count;
      } else {
        breakdown.documents += g._count;
      }
    });

    const mapped = breakdown.documents + breakdown.messages + breakdown.entities;
    if (total > mapped) {
      breakdown.documents += (total - mapped); 
    }

    return { total, breakdown };
  }
}
