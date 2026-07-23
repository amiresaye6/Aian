import { Global, Module } from '@nestjs/common';
import { EntityResolutionService } from './resolution.service';
import { ResolvedEntityRepository } from './repositories/resolved-entity.repository';
import { EntityMentionRepository } from './repositories/entity-mention.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AiGatewayModule } from '../ai/ai-gateway.module';

@Global()
@Module({
  imports: [PrismaModule, AiGatewayModule],
  providers: [
    EntityResolutionService,
    ResolvedEntityRepository,
    EntityMentionRepository,
  ],
  exports: [EntityResolutionService, ResolvedEntityRepository],
})
export class ResolutionModule {}
