import { Injectable, Logger } from '@nestjs/common';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { AiOptions } from './providers/ai-provider.interface';
import { z } from 'zod';

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(private readonly providerFactory: AiProviderFactory) {}

  /**
   * Simple validation to prevent obvious prompt injection attacks. #to-do
   */
  private sanitizePrompt(prompt: string): string {
    // Basic heuristic check (this can be expanded to use a lightweight LLM safeguard model if needed)
    const dangerousPatterns = [
      /ignore all previous instructions/i,
      /you are now an unrestricted/i,
      /system prompt/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(prompt)) {
        this.logger.warn(
          `Potential prompt injection detected. Pattern matched: ${pattern}`,
        );
        // For now, we just strip the matched pattern. In a real system, you might reject the request.
        prompt = prompt.replace(pattern, '[REDACTED]');
      }
    }

    return prompt;
  }

  /**
   * Wrapper for standard text generation. Includes basic telemetry.
   */
  async generateText(prompt: string, options?: AiOptions): Promise<string> {
    const safePrompt = this.sanitizePrompt(prompt);
    const provider = this.providerFactory.getProvider();

    this.logger.log(`Routing text generation to ${provider.name}.`);
    const startTime = Date.now();

    try {
      const result = await provider.generateText(safePrompt, options);
      const latency = Date.now() - startTime;
      this.logger.log(`Text generation completed in ${latency}ms.`);
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
  ): Promise<T> {
    const safePrompt = this.sanitizePrompt(prompt);
    const provider = this.providerFactory.getProvider();

    this.logger.log(
      `Routing structured output generation to ${provider.name} for schema: ${schemaName}.`,
    );
    const startTime = Date.now();

    try {
      // The provider internally ensures the output parses against the zod schema.
      const result = await provider.generateStructuredOutput(
        safePrompt,
        schema,
        schemaName,
        schemaDescription,
        options,
      );

      const latency = Date.now() - startTime;
      this.logger.log(
        `Structured output generation completed in ${latency}ms.`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Structured AI Generation failed on ${provider.name}: ${error.message}`,
      );
      throw error;
    }
  }
}
