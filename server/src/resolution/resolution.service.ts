import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { ResolvedEntityRepository } from './repositories/resolved-entity.repository';
import { EntityMentionRepository } from './repositories/entity-mention.repository';
import { ExtractionResult } from '../extraction/extraction.schema';
import { ResolvedEntity, ExtractionStatus } from '@prisma/client';

/**
 * Entity types where a wrong merge is especially costly.
 * Only these types trigger the LLM disambiguation call for borderline scores.
 */
const HIGH_VALUE_TYPES = new Set(['Person', 'Project', 'System', 'Service']);

/**
 * Model used for the yes/no plain-text disambiguation call.
 * Uses the same model as extraction — verified to work reliably.
 * The 20b model returned empty responses; plain text avoids that issue entirely.
 */
const DISAMBIGUATION_MODEL = 'openai.gpt-oss-120b-1:0';

/**
 * Type-group compatibility map.
 *
 * Entities within the same group can be merged across types when their
 * normalized names match exactly (Tier 1.5). Entities in different groups
 * are NEVER auto-merged across types, even with identical names.
 *
 * Examples:
 *   "Slack" (Service) + "Slack" (System)  → same Infrastructure group → merge
 *   "Auth" (Feature)  + "Auth" (Service)  → Planning vs Infrastructure → no merge
 */
const TYPE_GROUPS: Record<string, string[]> = {
  infrastructure: ['System', 'Service', 'API', 'Database'],
  code: ['Repository', 'PullRequest'],
  people: ['Person', 'Team'],
  planning: ['Project', 'Task', 'Bug', 'Incident', 'Feature', 'Release'],
  knowledge: ['Meeting', 'Decision', 'Document'],
};

// Reverse map: EntityType → group name. Computed once at module load.
const TYPE_TO_GROUP: Record<string, string> = Object.entries(TYPE_GROUPS)
  .flatMap(([group, types]) => types.map((t) => [t, group] as [string, string]))
  .reduce((acc, [type, group]) => ({ ...acc, [type]: group }), {});

@Injectable()
export class EntityResolutionService {
  private readonly logger = new Logger(EntityResolutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityRepo: ResolvedEntityRepository,
    private readonly mentionRepo: EntityMentionRepository,
    private readonly aiGateway: AiGatewayService,
  ) {}

  /**
   * Main Stage 3 entry point.
   *
   * Reads the extractedData from a completed KnowledgeArtifact and resolves
   * every extracted entity against the organization's canonical entity registry.
   * Creates EntityMention records linking each resolved entity back to the artifact.
   *
   * Failures are caught and logged — Stage 3 never blocks Stage 2.
   */
  async resolveArtifact(artifactId: string): Promise<void> {
    this.logger.log(
      `[Stage 3] Starting entity resolution for artifact: ${artifactId}`,
    );

    const artifact = await this.prisma.knowledgeArtifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) {
      this.logger.warn(
        `Artifact ${artifactId} not found. Skipping resolution.`,
      );
      return;
    }

    // Idempotency guard
    if (artifact.resolutionStatus === ExtractionStatus.completed) {
      this.logger.debug(`Artifact ${artifactId} already resolved. Skipping.`);
      return;
    }

    if (!artifact.extractedData) {
      this.logger.warn(
        `Artifact ${artifactId} has no extractedData. Cannot resolve.`,
      );
      return;
    }

    await this.prisma.knowledgeArtifact.update({
      where: { id: artifactId },
      data: { resolutionStatus: ExtractionStatus.processing },
    });

    try {
      const extracted = artifact.extractedData as unknown as ExtractionResult;
      const { organizationId } = artifact;
      const startTime = Date.now();

      let resolvedCount = 0;

      for (const entity of extracted.entities) {
        try {
          const resolved = await this.resolveEntity(entity, organizationId);

          // Create the evidence link
          await this.mentionRepo.upsert({
            resolvedEntityId: resolved.id,
            artifactId,
            extractedName: entity.name,
            confidence: entity.confidence,
          });

          resolvedCount++;
        } catch (entityErr) {
          // One entity failing never stops the others
          this.logger.warn(
            `[Stage 3] Failed to resolve entity "${entity.name}" in artifact ${artifactId}: ${entityErr.message}`,
          );
        }
      }

      await this.prisma.knowledgeArtifact.update({
        where: { id: artifactId },
        data: {
          resolutionStatus: ExtractionStatus.completed,
          resolvedAt: new Date(),
        },
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `[Stage 3] Resolution completed for artifact ${artifactId} in ${latency}ms. ` +
          `Resolved ${resolvedCount}/${extracted.entities.length} entities.`,
      );
    } catch (error) {
      await this.prisma.knowledgeArtifact.update({
        where: { id: artifactId },
        data: { resolutionStatus: ExtractionStatus.failed },
      });
      this.logger.error(
        `[Stage 3] Resolution failed for artifact ${artifactId}: ${error.message}`,
      );
    }
  }

  /**
   * Finds artifacts that completed extraction but haven't been resolved yet.
   * Called by the SchedulerService safety net.
   */
  async resolveOrphanedArtifacts(): Promise<void> {
    const orphans = await this.prisma.knowledgeArtifact.findMany({
      where: {
        extractionStatus: ExtractionStatus.completed,
        resolutionStatus: ExtractionStatus.pending,
      },
      select: { id: true },
      orderBy: { extractedAt: 'asc' },
    });

    if (orphans.length === 0) return;

    this.logger.log(
      `[Stage 3] Scheduler safety net found ${orphans.length} orphaned artifact(s) to resolve.`,
    );

    for (const { id } of orphans) {
      await this.resolveArtifact(id).catch((err) =>
        this.logger.error(
          `[Stage 3] Orphan resolution failed for ${id}: ${err.message}`,
        ),
      );
    }
  }

  // ─── Resolution Tiers ────────────────────────────────────────────────────

  private async resolveEntity(
    extracted: ExtractionResult['entities'][number],
    organizationId: string,
  ): Promise<ResolvedEntity> {
    const normalizedName = this.normalizeName(extracted.name);
    const allNames = [extracted.name, ...extracted.aliases];

    // Tier 1: Exact normalized name match (same type)
    const exactMatch = await this.entityRepo.findByNormalizedName(
      organizationId,
      normalizedName,
      extracted.type,
    );
    if (exactMatch) {
      await this.entityRepo.addAliasesIfNew(exactMatch.id, allNames);
      this.logger.debug(
        `[Stage 3] Tier 1 match: "${extracted.name}" → ${exactMatch.canonicalName}`,
      );
      return exactMatch;
    }

    // Tier 1.5: Cross-type exact name match (compatible type group only)
    // e.g. "Slack" extracted as System when it already exists as Service.
    const compatibleTypes = this.getCompatibleTypes(extracted.type);
    if (compatibleTypes.length > 0) {
      const crossTypeMatch =
        await this.entityRepo.findByNormalizedNameAcrossTypes(
          organizationId,
          normalizedName,
          compatibleTypes,
        );
      if (crossTypeMatch) {
        await this.entityRepo.addAliasesIfNew(crossTypeMatch.id, allNames);
        this.logger.debug(
          `[Stage 3] Tier 1.5 cross-type match: "${extracted.name}" (${extracted.type}) → ${crossTypeMatch.canonicalName} (${crossTypeMatch.type})`,
        );
        return crossTypeMatch;
      }
    }

    // Tier 2: Alias match — check if any of the extracted names appear in existing aliases
    const candidates = await this.entityRepo.findAllByOrgAndType(
      organizationId,
      extracted.type,
    );

    const aliasMatch = this.findAliasMatch(allNames, candidates);
    if (aliasMatch) {
      await this.entityRepo.addAliasesIfNew(aliasMatch.id, allNames);
      this.logger.debug(
        `[Stage 3] Tier 2 alias match: "${extracted.name}" → ${aliasMatch.canonicalName}`,
      );
      return aliasMatch;
    }

    // Tier 3: Fuzzy Jaccard match
    const { best, score } = this.findBestFuzzyMatch(normalizedName, candidates);

    if (score >= 0.85 && best) {
      await this.entityRepo.addAliasesIfNew(best.id, allNames);
      this.logger.debug(
        `[Stage 3] Tier 3 fuzzy match (score=${score.toFixed(2)}): "${extracted.name}" → ${best.canonicalName}`,
      );
      return best;
    }

    // Tier 4: LLM disambiguation for borderline scores + high-value types only
    if (score >= 0.5 && best && HIGH_VALUE_TYPES.has(extracted.type)) {
      this.logger.debug(
        `[Stage 3] Tier 4 LLM disambiguation: "${extracted.name}" vs "${best.canonicalName}" (score=${score.toFixed(2)})`,
      );
      const isSame = await this.disambiguateWithLLM(
        extracted.name,
        best.canonicalName,
        extracted.type,
      );
      if (isSame) {
        await this.entityRepo.addAliasesIfNew(best.id, allNames);
        this.logger.debug(
          `[Stage 3] LLM confirmed match: "${extracted.name}" → ${best.canonicalName}`,
        );
        return best;
      }
    }

    // No match — create new canonical entity
    const created = await this.entityRepo.create({
      organizationId,
      canonicalName: extracted.name,
      normalizedName,
      type: extracted.type,
      aliases: [...new Set(allNames)],
      confidence: extracted.confidence,
    });

    this.logger.debug(
      `[Stage 3] New entity created: "${extracted.name}" (${extracted.type})`,
    );
    return created;
  }

  // ─── Matching Helpers ────────────────────────────────────────────────────

  private findAliasMatch(
    names: string[],
    candidates: ResolvedEntity[],
  ): ResolvedEntity | null {
    const normalizedNames = names.map((n) => this.normalizeName(n));

    for (const candidate of candidates) {
      const candidateAliases = (candidate.aliases as string[]).map((a) =>
        this.normalizeName(a),
      );
      const candidateNames = [candidate.normalizedName, ...candidateAliases];

      for (const name of normalizedNames) {
        if (candidateNames.includes(name)) return candidate;
      }
    }

    return null;
  }

  private findBestFuzzyMatch(
    normalizedName: string,
    candidates: ResolvedEntity[],
  ): { best: ResolvedEntity | null; score: number } {
    let best: ResolvedEntity | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this.jaccardScore(normalizedName, candidate.normalizedName);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return { best, score: bestScore };
  }

  /**
   * Jaccard similarity on word tokens.
   * |intersection| / |union| of the two token sets.
   * Zero-dependency, no packages required.
   */
  private jaccardScore(a: string, b: string): number {
    const tokensA = new Set(a.split(' ').filter(Boolean));
    const tokensB = new Set(b.split(' ').filter(Boolean));

    if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
    if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

    const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
    const union = new Set([...tokensA, ...tokensB]);

    return intersection.size / union.size;
  }

  /**
   * Normalizes a name for comparison:
   * lowercase → strip punctuation → collapse whitespace.
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ─── Type-Group Helpers ─────────────────────────────────────────────────

  /**
   * Returns all types that are in the same group as the given type,
   * excluding the type itself. Returns an empty array if the type
   * has no known group (unknown types are never cross-type merged).
   */
  private getCompatibleTypes(type: string): string[] {
    const group = TYPE_TO_GROUP[type];
    if (!group) return [];
    return (TYPE_GROUPS[group] ?? []).filter((t) => t !== type);
  }

  // ─── LLM Disambiguation ─────────────────────────────────────────────────

  /**
   * Asks the LLM to decide if two names refer to the same entity.
   *
   * Uses plain text generation (not structured output) — the 20b model
   * returned empty JSON for structured calls. Any model can answer "yes" or "no".
   * We take the first word of the response and check if it equals "yes".
   */
  private async disambiguateWithLLM(
    extractedName: string,
    canonicalName: string,
    type: string,
  ): Promise<boolean> {
    try {
      const response = await this.aiGateway.generateText(
        `Are "${extractedName}" and "${canonicalName}" the same ${type} in an organizational context?
` + `Answer with exactly one word: yes, no, or uncertain.`,
        { model: DISAMBIGUATION_MODEL, maxTokens: 10 },
      );

      const answer = response
        .trim()
        .toLowerCase()
        .split(/[\s,\.]+/)[0];
      this.logger.debug(
        `[Stage 3] LLM disambiguation answered: "${answer}" ("${extractedName}" vs "${canonicalName}")`,
      );
      return answer === 'yes';
    } catch (err) {
      this.logger.warn(
        `[Stage 3] LLM disambiguation failed, defaulting to new entity: ${err.message}`,
      );
      return false;
    }
  }
}
