import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { AiOptions, AiResponse } from './providers/ai-provider.interface';
import { z } from 'zod';
import { QuotaService } from '../billing/quota.service';
import { AiUsageService } from './ai-usage.service';

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly providerFactory: AiProviderFactory,
    private readonly quotaService: QuotaService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  /**
   * Enforces quota limits before an AI call
   */
  private async enforceQuota(options?: AiOptions): Promise<void> {
    if (!options?.organizationId) return;

    const quota = await this.quotaService.checkTokenQuota(
      options.organizationId,
    );
    if (!quota.allowed) {
      throw new ForbiddenException(
        `Organization has exceeded its AI token quota. ` +
          `Usage: ${quota.used}/${quota.limit} tokens (${quota.percentage.toFixed(1)}%). ` +
          `Status: ${quota.status}.`,
      );
    }
    if (quota.status === 'overage_active') {
      this.logger.warn(
        `Organization ${options.organizationId} is in token overage: ` +
          `${quota.used}/${quota.limit} tokens (${quota.percentage.toFixed(1)}%).`,
      );
    }
  }

  /**
   * Wrapper for standard text generation. Includes basic telemetry.
   */
  async generateText(
    prompt: string,
    options?: AiOptions,
  ): Promise<AiResponse<string>> {
    await this.enforceQuota(options);
    const provider = this.providerFactory.getProvider();

    this.logger.log(`Routing text generation to ${provider.name}.`);
    const startTime = Date.now();

    try {
      const result = await provider.generateText(prompt, options);
      const latency = Date.now() - startTime;
      this.logger.log(`Text generation completed in ${latency}ms.`);

      if (options?.organizationId && options?.feature) {
        await this.aiUsageService.logUsage(
          options.organizationId,
          options.feature,
          provider.name,
          result.usage,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `AI Generation failed on ${provider.name}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Wrapper for structured generation. Includes output validation against Zod schema.
   */
  async generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    schemaName: string,
    schemaDescription: string,
    options?: AiOptions,
  ): Promise<AiResponse<T>> {
    await this.enforceQuota(options);
    const provider = this.providerFactory.getProvider();

    this.logger.log(
      `Routing structured output generation to ${provider.name} for schema: ${schemaName}.`,
    );
    const startTime = Date.now();

    try {
      // The provider internally ensures the output parses against the zod schema.
      const result = await provider.generateStructuredOutput(
        prompt,
        schema,
        schemaName,
        schemaDescription,
        options,
      );

      const latency = Date.now() - startTime;
      this.logger.log(
        `Structured output generation completed in ${latency}ms.`,
      );

      if (options?.organizationId && options?.feature) {
        await this.aiUsageService.logUsage(
          options.organizationId,
          options.feature,
          provider.name,
          result.usage,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Structured AI Generation failed on ${provider.name}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Wrapper for multi-turn tool calling.
   */
  async generateToolCalls(
    messages: import('./providers/ai-provider.interface').AiMessage[],
    tools: import('./providers/ai-provider.interface').AiTool[],
    systemPrompt?: string,
    options?: AiOptions,
  ): Promise<
    AiResponse<import('./providers/ai-provider.interface').AiMessage>
  > {
    await this.enforceQuota(options);
    const provider = this.providerFactory.getProvider();

    this.logger.log(`Routing tool calls to ${provider.name}.`);
    const startTime = Date.now();

    try {
      const result = await provider.generateToolCalls(
        messages,
        tools,
        systemPrompt,
        options,
      );
      const latency = Date.now() - startTime;
      this.logger.log(`Tool generation completed in ${latency}ms.`);

      if (options?.organizationId && options?.feature) {
        await this.aiUsageService.logUsage(
          options.organizationId,
          options.feature,
          provider.name,
          result.usage,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Tool AI Generation failed on ${provider.name}: ${error.message}`,
      );
      throw error;
    }
  }
}
