import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogService } from './audit/audit-log.service';
import { ResilienceService } from './core/resilience.service';
import { SkillRegistryService } from './core/registry.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmailModule } from '../email/email.module';
import { AiGatewayModule } from '../ai/ai-gateway.module';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { SessionService } from './orchestrator/session.service';
import { MessagingSkill } from './skills/messaging.skill';
import { EmailSkill } from './skills/email.skill';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { KnowledgeSkill } from './skills/knowledge.skill';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => IntegrationsModule),
    EmailModule,
    AiGatewayModule,
    RetrievalModule,
  ],
  providers: [
    AuditLogService,
    ResilienceService,
    SkillRegistryService,
    SessionService,
    OrchestratorService,
    MessagingSkill,
    EmailSkill,
    KnowledgeSkill,
  ],
  exports: [OrchestratorService],
})
export class HandsModule {}
