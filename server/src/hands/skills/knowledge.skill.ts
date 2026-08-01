import { Injectable, OnModuleInit } from '@nestjs/common';
import { RetrievalPipelineService } from '../../retrieval/retrieval-pipeline.service';
import { AnswerGenerationService } from '../../retrieval/services/answer-generation.service';
import { QueryUnderstandingService } from '../../retrieval/services/query-understanding.service';
import { GraphSearchService } from '../../retrieval/services/graph-search.service';
import { EvidenceChainService } from '../../retrieval/services/evidence-chain.service';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import {
  AnswerQuestionInputSchema,
  SearchInputSchema,
  SummarizeInputSchema,
} from './schemas';

@Injectable()
export class KnowledgeSkill implements OnModuleInit {
  constructor(
    private readonly retrievalPipeline: RetrievalPipelineService,
    private readonly answerGeneration: AnswerGenerationService,
    private readonly queryUnderstanding: QueryUnderstandingService,
    private readonly graphSearch: GraphSearchService,
    private readonly evidenceChain: EvidenceChainService,
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'KnowledgeSkill.answerQuestion',
      description:
        'Answers a question using the organizational knowledge graph. Returns the answer, sources, and a confidence score.',
      schema: AnswerQuestionInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) =>
        this.answerQuestion(ctx, input),
    });

    this.registry.register({
      name: 'KnowledgeSkill.summarize',
      description:
        'Summarizes a topic using the organizational knowledge graph, with an optional scope constraint.',
      schema: SummarizeInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.summarize(ctx, input),
    });
  }

  async answerQuestion(
    ctx: SkillContext,
    input: any,
  ): Promise<SkillResult<any>> {
    const parsed = AnswerQuestionInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.message,
          retryable: false,
        },
        meta: {
          skill: 'KnowledgeSkill',
          provider: 'neo4j',
          durationMs: 0,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }

    return this.resilienceService.execute(
      ctx,
      'KnowledgeSkill',
      'answerQuestion',
      'neo4j',
      parsed.data,
      async () => {
        const { contextString, evidenceChains } =
          await this.retrievalPipeline.retrieveContext(
            ctx.organizationId,
            parsed.data.question,
          );

        // Calculate a basic confidence score
        let confidence = 0;
        if (evidenceChains && evidenceChains.length > 0) {
          const maxRelevance = Math.max(
            ...evidenceChains.map((c) => c.relevanceScore),
          );
          // Scale based on some heuristics (example: max score might be ~1-10 depending on distance)
          confidence = Math.min(100, Math.round(maxRelevance * 20)); // Arbitrary scaling for demonstration
        }

        if (confidence === 0 || evidenceChains.length === 0) {
          return {
            answer:
              "I don't have enough context on this in the knowledge graph.",
            sources: [],
            confidence: 0,
          };
        }

        const answer = await this.answerGeneration.generateAnswer(
          ctx.organizationId,
          parsed.data.question,
          contextString,
        );

        return { answer, sources: evidenceChains, confidence };
      },
    );
  }

  async search(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = SearchInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.message,
          retryable: false,
        },
        meta: {
          skill: 'KnowledgeSkill',
          provider: 'neo4j',
          durationMs: 0,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }

    return this.resilienceService.execute(
      ctx,
      'KnowledgeSkill',
      'search',
      'neo4j',
      parsed.data,
      async () => {
        const understanding = await this.queryUnderstanding.analyzeQuery(
          ctx.organizationId,
          parsed.data.query,
        );
        const rankedArtifacts = await this.graphSearch.searchAndRankArtifacts(
          ctx.organizationId,
          understanding.entities,
        );
        let evidenceChains = await this.evidenceChain.constructChain(
          ctx.organizationId,
          rankedArtifacts,
        );

        if (parsed.data.artifactTypes && parsed.data.artifactTypes.length > 0) {
          evidenceChains = evidenceChains.filter((chain) =>
            parsed.data.artifactTypes!.includes(chain.type),
          );
        }

        return { results: evidenceChains };
      },
    );
  }

  async summarize(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    const parsed = SummarizeInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.message,
          retryable: false,
        },
        meta: {
          skill: 'KnowledgeSkill',
          provider: 'neo4j',
          durationMs: 0,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }

    return this.resilienceService.execute(
      ctx,
      'KnowledgeSkill',
      'summarize',
      'neo4j',
      parsed.data,
      async () => {
        const query = parsed.data.scope
          ? `Summarize the topic "${parsed.data.topic}" within the scope of "${parsed.data.scope}"`
          : `Summarize the topic "${parsed.data.topic}"`;

        const { contextString, evidenceChains } =
          await this.retrievalPipeline.retrieveContext(
            ctx.organizationId,
            query,
          );

        if (evidenceChains.length === 0) {
          return {
            summary:
              "I don't have enough context on this topic in the knowledge graph.",
            sources: [],
          };
        }

        const summary = await this.answerGeneration.generateAnswer(
          ctx.organizationId,
          query,
          contextString,
        );

        return { summary, sources: evidenceChains };
      },
    );
  }
}
