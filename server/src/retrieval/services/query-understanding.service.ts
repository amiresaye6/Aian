import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { z } from 'zod';

export const QueryUnderstandingSchema = z.object({
  intent: z
    .string()
    .describe(
      'A brief explanation of what the user is trying to find or accomplish.',
    ),
  entities: z
    .array(z.string())
    .describe(
      'List of exact canonical entity names mentioned or implied (e.g. "Slack", "OAuth", "Amir"). Used for graph entry points.',
    ),
  timeRange: z
    .string()
    .nullable()
    .describe(
      'Any temporal constraints mentioned, e.g., "last week", "yesterday". Null if none.',
    ),
  people: z
    .array(z.string())
    .describe('Names of people explicitly mentioned in the query.'),
});

export type QueryUnderstandingResult = z.infer<typeof QueryUnderstandingSchema>;

@Injectable()
export class QueryUnderstandingService {
  private readonly logger = new Logger(QueryUnderstandingService.name);

  constructor(private readonly aiGateway: AiGatewayService) {}

  async analyzeQuery(
    organizationId: string,
    query: string,
  ): Promise<QueryUnderstandingResult> {
    this.logger.log(`Analyzing query: "${query}"`);

    const prompt = `
You are a Query Understanding module for an Enterprise Knowledge Graph.
Your job is to analyze the user's question and extract the core entities, intent, time ranges, and people involved.
These extracted entities will be used as seed nodes to search the Neo4j graph database.

CRITICAL INSTRUCTION: You MUST return a valid JSON object with EXACTLY the following keys (camelCase):
{
  "intent": "string",
  "entities": ["string", "string"],
  "timeRange": "string or null",
  "people": ["string", "string"]
}
Do NOT use snake_case keys like "core_entities" or "time_range". Use exactly "entities", "timeRange", "people", and "intent".

USER QUERY:
"${query}"

Extract the parameters accurately. If no time range is mentioned, set "timeRange" to null. If no people are mentioned, set "people" to [].
`;

    const { data: result } = await this.aiGateway.generateStructuredOutput(
      prompt,
      QueryUnderstandingSchema,
      'QueryUnderstanding',
      'Extracts structured context from a user query for graph retrieval',
      {
        temperature: 0.1,
        organizationId,
        feature: 'retrieval',
      },
    );

    this.logger.debug(`Extraction result: ${JSON.stringify(result)}`);
    return result;
  }
}
