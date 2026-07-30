import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { AiUsageService } from '../../ai/ai-usage.service';

@Injectable()
export class AnswerGenerationService {
  private readonly logger = new Logger(AnswerGenerationService.name);

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly usageService: AiUsageService,
  ) {}

  async generateAnswer(
    organizationId: string,
    query: string,
    contextString: string,
  ): Promise<string> {
    this.logger.log('Generating final answer based on Evidence Chains.');

    const prompt = `
You are AIAN, an enterprise organizational intelligence AI.
The user has asked a question. You have been provided with an "Evidence Chain" retrieved from the organizational knowledge graph.

USER QUESTION:
"${query}"

EVIDENCE CHAIN CONTEXT:
${contextString}

INSTRUCTIONS:
1. Answer the user's question accurately using ONLY the information provided in the Evidence Chain.
2. If the context does not contain the answer, politely state that you do not have enough information in the current knowledge graph.
3. Narrate the timeline of events or logical progression if applicable (e.g., "First discussed in Slack, then a PR was opened").
4. Be concise, professional, and clear.
`;

    // We can use standard text generation for the conversational answer
    const { data: result, usage } = await this.aiGateway.generateText(prompt, {
      temperature: 0.3,
    });

    await this.usageService.logUsage(
      organizationId,
      'retrieval',
      'us.meta.llama3-3-70b-instruct-v1:0',
      usage,
    );

    this.logger.log('Final answer generated successfully.');
    return result;
  }
}
