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
      if (type.includes('message') || type.includes('chat') || type.includes('comment')) {
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

  @Get('activity')
  async getKnowledgeActivity(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');

    // Grouping by date natively in Prisma is clunky, so we use a raw SQL query.
    // This fetches the ingestion volume for the last 30 days grouped by day.
    const timeSeries = await this.prisma.$queryRaw<
      { date: Date; count: number }[]
    >`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM knowledge_items
      WHERE organization_id = ${connection.organizationId}
        AND provider = ${connection.providerKey.toUpperCase()}
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC;
    `;

    // Map into a simpler format for the frontend chart (YYYY-MM-DD)
    const formattedSeries = timeSeries.map((row) => ({
      date: new Date(row.date).toISOString().split('T')[0],
      count: Number(row.count),
    }));

    return formattedSeries;
  }
}
