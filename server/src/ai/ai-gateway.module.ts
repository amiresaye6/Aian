import { Global, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { StudentBedrockProvider } from './providers/student-bedrock.provider';
import { AiGatewayService } from './ai-gateway.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [AiProviderFactory, StudentBedrockProvider, AiGatewayService],
  exports: [AiGatewayService],
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
