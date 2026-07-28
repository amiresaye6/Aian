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

  /**
   * Multi-turn chat with tool calling support.
   */
  generateToolCalls(
    messages: AiMessage[],
    tools: AiTool[],
    systemPrompt?: string,
    options?: AiOptions,
  ): Promise<AiMessage>;
}

export interface AiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: any;
  }>;
  toolResultId?: string; // used when role is 'tool'
}

export interface AiTool {
  name: string;
  description: string;
  schema: any; // json-schema representation
}
