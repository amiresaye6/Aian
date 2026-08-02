import { Global, Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { StudentBedrockProvider } from './providers/student-bedrock.provider';
import { AiGatewayService } from './ai-gateway.service';
import { AiUsageService } from './ai-usage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => BillingModule)],
  controllers: [],
  providers: [
    AiProviderFactory,
    StudentBedrockProvider,
    AiGatewayService,
    AiUsageService,
  ],
  exports: [AiGatewayService, AiUsageService],
})
export class AiGatewayModule implements OnModuleInit {
  constructor(
    private readonly providerFactory: AiProviderFactory,
    private readonly bedrockProvider: StudentBedrockProvider,
  ) {}

  onModuleInit() {
    // Register StudentBedrockProvider as the default provider for the entire system
    this.providerFactory.register(this.bedrockProvider, true);
  }
}
