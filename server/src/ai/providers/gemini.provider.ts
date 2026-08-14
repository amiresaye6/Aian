import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiOptions,
  AiProvider,
  AiResponse,
  AiUsage,
} from './ai-provider.interface';
import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable()
export class GeminiProvider implements AiProvider {
  name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private ai: GoogleGenAI;

  /**
   * Accessible Models (Ranked by Power/Capability):
   *
   * --- High Power & Complex Reasoning ---
   * - 'gemini-3.1-pro-preview' (Next-gen Pro)
   * - 'gemini-3.1-pro-preview-customtools' (Optimized for tool use)
   * - 'gemini-2.5-pro' (Stable Pro release)
   * - 'deep-research-max-preview-04-2026' (Specialized deep research)
   *
   * --- Balanced & Fast (Recommended for General Use) ---
   * - 'gemini-3.6-flash' (Latest Flash)
   * - 'gemini-3.5-flash'
   * - 'gemini-3-flash-preview'
   * - 'gemini-2.5-flash' (Current default, stable)
   *
   * --- Lightweight & Fastest ---
   * - 'gemini-3.5-flash-lite'
   * - 'gemini-3.1-flash-lite'
   * - 'gemini-2.5-flash-lite'
   *
   * Note: The API response did not include usage, rate limiting, or quota information.
   */
  private readonly DEFAULT_MODEL = 'gemini-3.1-flash-lite';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. Gemini provider will fail if used.',
      );
    }

    // Initialize Google Gen AI SDK
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  private extractUsage(response: any): AiUsage {
    const usageMetadata = response.usageMetadata;
    return {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
      totalTokens: usageMetadata?.totalTokenCount || 0,
      costUsd: 0, // Gemini API does not return cost per request in usage metadata
      stopReason: response.candidates?.[0]?.finishReason,
    };
  }

  async generateText(
    prompt: string,
    options?: AiOptions,
  ): Promise<AiResponse<string>> {
    const model = options?.model || this.DEFAULT_MODEL;
    this.logger.debug(`Generating text using model: ${model}`);

    try {
      const response = await this.ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: options?.systemPrompt || 'You are a helpful assistant.',
          maxOutputTokens: options?.maxTokens || undefined,
          temperature: options?.temperature || undefined,
        },
      });

      const usage = this.extractUsage(response);
      return { data: response.text || '', usage };
    } catch (error: any) {
      this.logger.error(`Gemini Text Gen Error: ${error.message}`);
      throw error;
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    schemaName: string,
    schemaDescription: string,
    options?: AiOptions,
  ): Promise<AiResponse<T>> {
    const model = options?.model || this.DEFAULT_MODEL;
    this.logger.debug(`Generating structured output using model: ${model}`);

    let geminiSchema: any = undefined;

    if (schemaName === 'knowledge_extraction') {
      geminiSchema = {
        type: Type.OBJECT,
        required: [
          'title',
          'summary',
          'topics',
          'entities',
          'relationships',
          'claims',
          'decisions',
          'actionItems',
        ],
        properties: {
          title: { type: Type.STRING, nullable: true },
          summary: { type: Type.STRING },
          topics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          entities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['name', 'type', 'aliases', 'confidence'],
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING },
                aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
                confidence: { type: Type.NUMBER },
              },
            },
          },
          relationships: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: [
                'subject',
                'predicate',
                'object',
                'confidence',
                'evidenceQuote',
              ],
              properties: {
                subject: { type: Type.STRING },
                predicate: { type: Type.STRING },
                object: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                evidenceQuote: { type: Type.STRING },
              },
            },
          },
          claims: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['statement', 'confidence', 'evidenceQuote'],
              properties: {
                statement: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                evidenceQuote: { type: Type.STRING },
              },
            },
          },
          decisions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['decision', 'madeBy', 'confidence', 'evidenceQuote'],
              properties: {
                decision: { type: Type.STRING },
                madeBy: { type: Type.STRING, nullable: true },
                confidence: { type: Type.NUMBER },
                evidenceQuote: { type: Type.STRING },
              },
            },
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: [
                'task',
                'assignee',
                'dueDate',
                'confidence',
                'evidenceQuote',
              ],
              properties: {
                task: { type: Type.STRING },
                assignee: { type: Type.STRING, nullable: true },
                dueDate: { type: Type.STRING, nullable: true },
                confidence: { type: Type.NUMBER },
                evidenceQuote: { type: Type.STRING },
              },
            },
          },
        },
      };
    } else {
      if (schema) {
        geminiSchema = (schema as any).toJSONSchema() as any;
      }
    }

    const userPromptWithSchema = `${prompt}

---
You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {"properties": {"foo": {"description": "a list of test words", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {"foo": ["bar", "baz"]} is a well-formatted instance of this example "JSON Schema". The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly! Do NOT rename any properties! Output only the raw JSON object.

Here is the JSON Schema instance your output must adhere to:
${JSON.stringify(geminiSchema, null, 2)}`;

    try {
      const response = await this.ai.models.generateContent({
        model: model,
        contents: userPromptWithSchema,
        config: {
          systemInstruction: options?.systemPrompt || 'You are a strict data extraction AI.',
          maxOutputTokens: options?.maxTokens || undefined,
          temperature: options?.temperature || undefined,
          responseMimeType: 'application/json',
          responseSchema: geminiSchema,
        },
      });

      this.logger.debug(`--- RAW GEMINI OUTPUT ---`);
      this.logger.debug(response.text || '{}');
      this.logger.debug(`-------------------------`);

      const usage = this.extractUsage(response);
      const content = response.text || '{}';

      const parsed = JSON.parse(content);
      return { data: schema.parse(parsed) as T, usage };
    } catch (error: any) {
      this.logger.error(`Gemini Structured Gen Error: ${error.message}`);
      throw error;
    }
  }

  async generateToolCalls(
    messages: import('./ai-provider.interface').AiMessage[],
    tools: import('./ai-provider.interface').AiTool[],
    systemPrompt?: string,
    options?: AiOptions,
  ): Promise<AiResponse<import('./ai-provider.interface').AiMessage>> {
    const model = options?.model || this.DEFAULT_MODEL;
    this.logger.debug(`Generating tool calls using model: ${model}`);

    const formattedMessages = messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'user',
          parts: [
            {
              text: `[System Tool Result for ID: ${m.toolResultId}]\n${m.content}\n\nThis is the result of the tool you just called. Please use this result to continue fulfilling my original request. If you need to use another tool, do so now. If you are finished, provide a final text summary.`,
            },
          ],
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      };
    });

    const geminiTools =
      tools.length > 0
        ? [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.schema,
              })),
            },
          ]
        : undefined;

    try {
      const response = await this.ai.models.generateContent({
        model: model,
        contents: formattedMessages as any,
        config: {
          systemInstruction:
            systemPrompt || 'You are a helpful assistant with access to tools.',
          maxOutputTokens: options?.maxTokens || undefined,
          temperature: options?.temperature || undefined,
          tools: geminiTools as any,
        },
      });

      const usage = this.extractUsage(response);
      const candidate = response.candidates?.[0];
      const functionCalls =
        candidate?.content?.parts
          ?.filter((p) => p.functionCall)
          .map((p) => p.functionCall as any) || [];
      const textPart =
        candidate?.content?.parts?.find((p) => p.text)?.text || '';

      if (functionCalls.length > 0) {
        const toolCalls = functionCalls.map((fc) => ({
          id: `call_${Math.random().toString(36).substring(2, 9)}`,
          name: fc.name || '',
          input: fc.args || {},
        }));

        return {
          data: {
            role: 'assistant',
            content: textPart,
            toolCalls: toolCalls,
          },
          usage,
        };
      }

      return {
        data: { role: 'assistant', content: textPart },
        usage,
      };
    } catch (error: any) {
      this.logger.error(`Gemini Tool Gen Error: ${error.message}`);
      throw error;
    }
  }
}
