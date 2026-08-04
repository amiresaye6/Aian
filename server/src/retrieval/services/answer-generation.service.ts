import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { ANSWER_GENERATION_PROMPT } from '../../ai/prompts';

@Injectable()
export class AnswerGenerationService {
  private readonly logger = new Logger(AnswerGenerationService.name);

  constructor(private readonly aiGateway: AiGatewayService) {}

  async generateAnswer(
    organizationId: string,
    query: string,
    contextString: string,
  ): Promise<string> {
    this.logger.log('Generating final answer based on Evidence Chains.');

    const prompt = ANSWER_GENERATION_PROMPT.replace('{query}', query).replace(
      '{contextString}',
      contextString,
    );

    // We can use standard text generation for the conversational answer
    const { data: result } = await this.aiGateway.generateText(prompt, {
      temperature: 0.3,
      organizationId,
      feature: 'retrieval',
    });

    this.logger.log('Final answer generated successfully.');
    return result;
  }
}
