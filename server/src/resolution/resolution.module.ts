import { Global, Module } from '@nestjs/common';
import { EntityResolutionService } from './resolution.service';
import { ResolvedEntityRepository } from './repositories/resolved-entity.repository';
import { EntityMentionRepository } from './repositories/entity-mention.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AiGatewayModule } from '../ai/ai-gateway.module';
import { GraphModule } from '../graph/graph.module';
import { EntityMergeService } from './entity-merge.service';

@Global()
@Module({
  imports: [PrismaModule, AiGatewayModule, GraphModule],
  providers: [
    EntityResolutionService,
    ResolvedEntityRepository,
    EntityMentionRepository,
    EntityMergeService,
  ],
  exports: [EntityResolutionService, ResolvedEntityRepository, EntityMergeService],
})
export class ResolutionModule {}
