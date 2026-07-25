import { z } from 'zod';

export interface AiOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiProvider {
  /**
   * The name of the provider (e.g. 'student-bedrock', 'gemini', 'openai')
   */
  name: string;

  /**
   * Generates a plain text response.
   */
  generateText(prompt: string, options?: AiOptions): Promise<string>;

  /**
   * Generates a structured JSON output matching the provided Zod schema.
   */
  generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    schemaName: string,
    schemaDescription: string,
    options?: AiOptions,
  ): Promise<T>;
}
