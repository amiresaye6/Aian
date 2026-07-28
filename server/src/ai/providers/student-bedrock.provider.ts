import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOptions, AiProvider } from './ai-provider.interface';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import axios from 'axios';

@Injectable()
export class StudentBedrockProvider implements AiProvider {
  name = 'student-bedrock';
  private readonly logger = new Logger(StudentBedrockProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  // Recommended default models based on portal capabilities
  private readonly DEFAULT_MODEL = 'us.meta.llama3-3-70b-instruct-v1:0'; // Llama 3 70B is renowned for instruction following and JSON output
  private readonly FALLBACK_MODEL = 'openai.gpt-oss-120b-1:0';

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('AI_BASE_URL') ||
      'http://apiaccess.iti.net.eg/api/v1';
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
  }

  async generateText(prompt: string, options?: AiOptions): Promise<string> {
    const model = options?.model || this.DEFAULT_MODEL;

    this.logger.debug(`Generating text using model: ${model}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/student/chat`,
        {
          model_id: model,
          messages: [{ role: 'user', content: prompt }],
          system_prompt: 'You are a helpful assistant.',
          max_tokens: options?.maxTokens || 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // The gateway returns output in the 'output_text' property
      if (response.data && response.data.output_text !== undefined) {
        return response.data.output_text;
      }

      return JSON.stringify(response.data);
    } catch (error) {
      this.logger.error(
        `Bedrock Text Gen Error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`,
      );
      throw error;
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    schemaName: string,
    schemaDescription: string,
    options?: AiOptions,
  ): Promise<T> {
    const model = options?.model || this.DEFAULT_MODEL;
    this.logger.debug(`Generating structured output using model: ${model}`);

    const jsonSchema = zodToJsonSchema(schema as any) as any;

    // We use a battle-tested structured output prompt format
    const userPromptWithSchema = `${prompt}

---
You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {"properties": {"foo": {"description": "a list of test words", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {"foo": ["bar", "baz"]} is a well-formatted instance of this example "JSON Schema". The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly! Do NOT rename any properties! Output only the raw JSON object.

Here is the JSON Schema instance your output must adhere to:
${JSON.stringify(jsonSchema, null, 2)}`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/student/chat`,
        {
          model_id: model,
          messages: [{ role: 'user', content: userPromptWithSchema }],
          system_prompt: 'You are a strict data extraction AI.',
          max_tokens: options?.maxTokens || 4000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Extract raw text from custom gateway property 'output_text'
      let content = '';
      if (response.data && response.data.output_text !== undefined) {
        content = response.data.output_text;
      } else {
        content = JSON.stringify(response.data);
      }

      // Robust JSON extraction: Find the first '{' and last '}'
      const match = content.match(/\{[\s\S]*\}/);
      const cleanContent = match
        ? match[0]
        : content
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

      this.logger.debug(`Raw LLM Structured Output: ${cleanContent}`);

      const parsed = JSON.parse(cleanContent);
      return schema.parse(parsed) as T;
    } catch (error) {
      this.logger.error(
        `Bedrock Structured Gen Error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`,
      );
      throw error;
    }
  }

  async generateToolCalls(
    messages: import('./ai-provider.interface').AiMessage[],
    tools: import('./ai-provider.interface').AiTool[],
    systemPrompt?: string,
    options?: AiOptions,
  ): Promise<import('./ai-provider.interface').AiMessage> {
    const model = options?.model || this.DEFAULT_MODEL;
    this.logger.debug(`Generating tool calls using model: ${model}`);

    // Map internal message format to gateway format
    const formattedMessages = messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'user', // LLMs often need tool results as user messages if not using native tool roles, but we'll try native first
          content: `Tool Result for ${m.toolResultId}: ${m.content}`,
        };
      }
      return m;
    });

    const promptWithTools = `
${systemPrompt || 'You are a helpful assistant with access to tools.'}

You have access to the following tools:
${JSON.stringify(tools, null, 2)}

If you need to use a tool to fulfill the user's request, you MUST output ONLY a valid JSON object matching this structure:
{
  "toolCalls": [
    {
      "id": "unique_call_id",
      "name": "TheToolName",
      "input": { ... }
    }
  ]
}
If you do not need to use a tool, just respond normally with text. Do not wrap normal text in JSON.`;

    try {
      // Assuming the gateway supports Anthropic/OpenAI-style tool definitions natively,
      // but providing a strong fallback prompt in case it ignores the 'tools' array.
      const response = await axios.post(
        `${this.baseUrl}/student/chat`,
        {
          model_id: model,
          messages: formattedMessages,
          system_prompt: promptWithTools,
          tools: tools, // Pass tools directly to gateway just in case it's supported natively
          max_tokens: options?.maxTokens || 4000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content =
        response.data.output_text || JSON.stringify(response.data);

      // If the gateway supports native tool calls, it should return them in response.data.tool_calls
      if (response.data.tool_calls) {
        return {
          role: 'assistant',
          content: response.data.output_text,
          toolCalls: response.data.tool_calls,
        };
      }

      // Fallback: Check if the content is a JSON object with a tool call (manual parse)
      try {
        const match = content.match(/\{[\s\S]*\}/);
        const cleanContent = match
          ? match[0]
          : content
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim();

        const parsed = JSON.parse(cleanContent);
        if (parsed.toolCalls && Array.isArray(parsed.toolCalls)) {
          return { role: 'assistant', toolCalls: parsed.toolCalls };
        }
      } catch (e) {
        // Not JSON, just normal text response
      }

      return {
        role: 'assistant',
        content: content,
      };
    } catch (error) {
      this.logger.error(
        `Bedrock Tool Gen Error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`,
      );
      throw error;
    }
  }
}
