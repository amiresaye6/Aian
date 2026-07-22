import { z } from 'zod';

/**
 * The canonical list of organizational entity types that can be extracted
 * from any KnowledgeArtifact, regardless of provider origin.
 *
 * These map directly to the node types that will later be created in the
 * organizational Knowledge Graph (Stage 4).
 */
export const ENTITY_TYPES = [
  'Person',
  'Team',
  'Project',
  'Feature',
  'Task',
  'Bug',
  'Incident',
  'System',
  'Service',
  'API',
  'Database',
  'Repository',
  'PullRequest',
  'Meeting',
  'Decision',
  'Document',
  'Release',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// ─── LLM Output Normalizer ────────────────────────────────────────────────────
//
// LLMs are inconsistent about field naming conventions. One model uses
// camelCase, another uses snake_case, another uses different synonyms.
// Rather than fighting the model, we normalize its output before Zod
// validates it, making the system robust against any provider.

/**
 * Maps any LLM entity type string to our canonical PascalCase enum value.
 * Handles: lowercase, snake_case, synonyms, and unknown types.
 */
function normalizeEntityType(type: string): EntityType {
  if (!type || typeof type !== 'string') return 'System';

  // Exact match — fastest path
  if ((ENTITY_TYPES as readonly string[]).includes(type))
    return type as EntityType;

  // Case-insensitive match (handles "person" → "Person", "TEAM" → "Team")
  const lower = type.toLowerCase().replace(/[_\s-]/g, '');
  const caseMatch = ENTITY_TYPES.find((t) => t.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  // Synonym / alias mapping
  const synonymMap: Record<string, EntityType> = {
    human: 'Person',
    user: 'Person',
    developer: 'Person',
    engineer: 'Person',
    employee: 'Person',
    group: 'Team',
    squad: 'Team',
    chapter: 'Team',
    product: 'Feature',
    component: 'Feature',
    module: 'Feature',
    issue: 'Bug',
    defect: 'Bug',
    ticket: 'Task',
    todo: 'Task',
    pullrequest: 'PullRequest',
    pr: 'PullRequest',
    mergerequest: 'PullRequest',
    db: 'Database',
    datastore: 'Database',
    repo: 'Repository',
    lib: 'Repository',
    library: 'Repository',
    package: 'Repository',
    technology: 'System',
    tool: 'System',
    platform: 'System',
    framework: 'System',
    infrastructure: 'System',
    endpoint: 'API',
    microservice: 'Service',
    version: 'Release',
    deployment: 'Release',
    call: 'Meeting',
    discussion: 'Meeting',
    choice: 'Decision',
    resolution: 'Decision',
  };

  const synonym = synonymMap[lower];
  if (synonym) return synonym;

  // Default — unknown types become 'System' rather than crashing
  return 'System';
}

/**
 * Extracts a string value from a raw LLM object by trying multiple
 * possible key names. LLMs often rename fields.
 */
function pick(obj: any, ...keys: string[]): string {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return String(obj[key]);
    }
  }
  return '';
}

function pickNullable(obj: any, ...keys: string[]): string | null {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return String(obj[key]);
    }
  }
  return null;
}

function pickNumber(obj: any, fallback: number, ...keys: string[]): number {
  for (const key of keys) {
    const val = parseFloat(obj[key]);
    if (!isNaN(val)) return Math.max(0, Math.min(1, val));
  }
  return fallback;
}

/**
 * Normalizes any raw LLM JSON output into our canonical ExtractionResult shape.
 * This is the key function that makes Stage 2 model-agnostic.
 */
function normalizeExtraction(raw: any): any {
  if (!raw || typeof raw !== 'object') {
    return {
      summary: '',
      topics: [],
      entities: [],
      relationships: [],
      claims: [],
      decisions: [],
      actionItems: [],
    };
  }

  // Merge entities from every key the model might use
  const entitySources: any[] = [
    ...(Array.isArray(raw.entities) ? raw.entities : []),
    // People / participants — common LLM alias for Person entities
    ...(Array.isArray(raw.people)
      ? raw.people.map((p: any) => ({
          name: p.name ?? p.id,
          type: 'Person',
          aliases: [],
          confidence: p.confidence ?? 0.9,
          ...p,
        }))
      : []),
    ...(Array.isArray(raw.participants)
      ? raw.participants.map((p: any) => ({
          name: p.name ?? p.id,
          type: 'Person',
          aliases: [],
          confidence: p.confidence ?? 0.9,
          ...p,
        }))
      : []),
    ...(Array.isArray(raw.actors)
      ? raw.actors.map((a: any) => ({
          name: a.name,
          type: 'Person',
          aliases: [],
          confidence: a.confidence ?? 0.9,
          ...a,
        }))
      : []),
    // Systems / services — common alias for non-person entities
    ...(Array.isArray(raw.systems)
      ? raw.systems.map((s: any) => ({
          name: s.name ?? s.entity,
          type: s.type ?? 'System',
          aliases: [],
          confidence: s.confidence ?? 0.9,
          ...s,
        }))
      : []),
    ...(Array.isArray(raw.systems_services_projects)
      ? raw.systems_services_projects.map((s: any) => ({
          name: s.entity ?? s.name,
          type: s.type ?? 'System',
          aliases: [],
          confidence: s.confidence ?? 0.9,
          ...s,
        }))
      : []),
    ...(Array.isArray(raw.services)
      ? raw.services.map((s: any) => ({
          name: s.name ?? s.entity,
          type: 'Service',
          aliases: [],
          confidence: s.confidence ?? 0.9,
          ...s,
        }))
      : []),
    ...(Array.isArray(raw.projects)
      ? raw.projects.map((p: any) => ({
          name: p.name ?? p.entity,
          type: 'Project',
          aliases: [],
          confidence: p.confidence ?? 0.9,
          ...p,
        }))
      : []),
  ];

  return {
    summary: pick(raw, 'summary', 'overview', 'description', 'abstract'),

    topics: Array.isArray(raw.topics)
      ? raw.topics.map(String)
      : Array.isArray(raw.themes)
        ? raw.themes.map(String)
        : Array.isArray(raw.tags)
          ? raw.tags.map(String)
          : [],

    entities: entitySources.map((e: any) => ({
      name: pick(e, 'name', 'entity', 'label', 'title', 'value', 'id'),
      type: normalizeEntityType(
        pick(e, 'type', 'entity_type', 'kind', 'category'),
      ),
      aliases: Array.isArray(e.aliases) ? e.aliases.map(String) : [],
      confidence: pickNumber(e, 0.8, 'confidence', 'score', 'certainty'),
    })),

    relationships: Array.isArray(raw.relationships)
      ? raw.relationships.map((r: any) => ({
          subject: pick(r, 'subject', 'source', 'from', 'entity1', 'actor'),
          predicate: pick(
            r,
            'predicate',
            'relation',
            'relationship',
            'type',
            'verb',
            'action',
          ),
          object: pick(r, 'object', 'target', 'to', 'entity2', 'target_entity'),
          confidence: pickNumber(r, 0.8, 'confidence', 'score', 'certainty'),
          evidenceQuote: pick(
            r,
            'evidenceQuote',
            'evidence_quote',
            'evidence',
            'quote',
            'supporting_text',
            'context',
            'description',
          ),
        }))
      : [],

    claims: (() => {
      // Merge claims from claims + observations (common model alias)
      const claimSources = [
        ...(Array.isArray(raw.claims) ? raw.claims : []),
        ...(Array.isArray(raw.observations)
          ? raw.observations.map((o: any) => ({
              statement: o.statement ?? o.text ?? o.observation,
              evidenceQuote: '',
              confidence: o.confidence ?? 0.8,
              ...o,
            }))
          : []),
        ...(Array.isArray(raw.facts) ? raw.facts : []),
      ];
      return claimSources.map((c: any) => ({
        statement: pick(
          c,
          'statement',
          'claim',
          'text',
          'content',
          'fact',
          'assertion',
          'observation',
        ),
        confidence: pickNumber(c, 0.8, 'confidence', 'score', 'certainty'),
        evidenceQuote: pick(
          c,
          'evidenceQuote',
          'evidence_quote',
          'evidence',
          'quote',
          'supporting_text',
          'context',
        ),
      }));
    })(),

    decisions: Array.isArray(raw.decisions)
      ? raw.decisions.map((d: any) => ({
          decision: pick(
            d,
            'decision',
            'description',
            'text',
            'content',
            'summary',
            'choice',
          ),
          madeBy: pickNullable(
            d,
            'madeBy',
            'made_by',
            'decided_by',
            'author',
            'by',
            'person',
            'who',
          ),
          confidence: pickNumber(d, 0.8, 'confidence', 'score', 'certainty'),
          evidenceQuote: pick(
            d,
            'evidenceQuote',
            'evidence_quote',
            'evidence',
            'quote',
            'supporting_text',
            'context',
            'rationale',
          ),
        }))
      : [],

    actionItems: (() => {
      const raw_items =
        raw.actionItems ??
        raw.action_items ??
        raw.tasks ??
        raw.actions ??
        raw.todos ??
        raw.followUps ??
        raw.follow_ups ??
        raw.next_steps ??
        [];
      if (!Array.isArray(raw_items)) return [];
      return raw_items.map((a: any) => ({
        task: pick(
          a,
          'task',
          'action',
          'text',
          'description',
          'item',
          'todo',
          'content',
        ),
        assignee: pickNullable(
          a,
          'assignee',
          'assigned_to',
          'owner',
          'responsible',
          'person',
          'who',
        ),
        dueDate: pickNullable(
          a,
          'dueDate',
          'due_date',
          'deadline',
          'date',
          'due',
        ),
        confidence: pickNumber(a, 0.8, 'confidence', 'score', 'certainty'),
        evidenceQuote: pick(
          a,
          'evidenceQuote',
          'evidence_quote',
          'evidence',
          'quote',
          'supporting_text',
          'context',
        ),
      }));
    })(),
  };
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const RawExtractionResultSchema = z.object({
  summary: z
    .string()
    .describe('A concise 2-4 sentence summary of the artifact content.'),

  topics: z
    .array(z.string())
    .describe('Main topics, technologies, domains, or system areas discussed.'),

  entities: z.array(
    z.object({
      name: z.string().describe('The canonical name of the entity.'),
      type: z.enum(ENTITY_TYPES),
      aliases: z
        .array(z.string())
        .default([])
        .describe('Alternative names or references.'),
      confidence: z.number().min(0).max(1),
    }),
  ),

  relationships: z.array(
    z.object({
      subject: z.string().describe('The entity name of the subject.'),
      predicate: z
        .string()
        .describe(
          'The relationship verb, e.g. caused, owns, depends_on, blocked_by.',
        ),
      object: z.string().describe('The entity name of the object.'),
      confidence: z.number().min(0).max(1),
      evidenceQuote: z
        .string()
        .describe('Supporting quote from the artifact text.'),
    }),
  ),

  claims: z.array(
    z.object({
      statement: z
        .string()
        .describe('A factual claim or observation in plain language.'),
      confidence: z.number().min(0).max(1),
      evidenceQuote: z.string().describe('Supporting quote from the artifact.'),
    }),
  ),

  decisions: z.array(
    z.object({
      decision: z.string().describe('The decision that was made.'),
      madeBy: z
        .string()
        .nullable()
        .describe('Person or team who made this decision, or null.'),
      confidence: z.number().min(0).max(1),
      evidenceQuote: z.string().describe('Supporting quote from the artifact.'),
    }),
  ),

  actionItems: z.array(
    z.object({
      task: z.string().describe('The action item to be completed.'),
      assignee: z.string().nullable().describe('The person assigned, or null.'),
      dueDate: z
        .string()
        .nullable()
        .describe('ISO 8601 date if mentioned, otherwise null.'),
      confidence: z.number().min(0).max(1),
      evidenceQuote: z.string().describe('Supporting quote from the artifact.'),
    }),
  ),
});

/**
 * The full structured output schema for Stage 2 Knowledge Extraction.
 *
 * Wraps RawExtractionResultSchema with a preprocessor that normalizes any LLM
 * output — regardless of field naming conventions — before Zod validates it.
 * This makes Stage 2 completely model-agnostic.
 */
export const ExtractionResultSchema = z.preprocess(
  normalizeExtraction,
  RawExtractionResultSchema,
);

export type ExtractionResult = z.infer<typeof RawExtractionResultSchema>;
