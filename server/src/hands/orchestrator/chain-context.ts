import { SkillResult } from '../core/types';
import { AiMessage } from '../../ai/providers/ai-provider.interface';

// ── Chain Step Tracking ──────────────────────────────────────────────────────

export type ChainStepStatus =
  'success' | 'failed' | 'skipped' | 'pending_confirmation' | 'not_reached';

export interface ChainStepResult {
  /** Global step index across the entire chain (0-based) */
  stepIndex: number;
  /** Which loop iteration this step was executed in (0-based) */
  iterationIndex: number;
  /** The registered skill name, e.g. "ReportingSkill.generateReport" */
  skillName: string;
  /** The input the LLM provided for this tool call */
  input: any;
  /** The skill's result, null if not yet executed */
  result: SkillResult<any> | null;
  /** Current status of this step */
  status: ChainStepStatus;
  /** ISO timestamp of when this step completed (or was recorded) */
  timestamp: string;
}

// ── Chain Execution Context ──────────────────────────────────────────────────

export interface ChainExecutionContext {
  /** Unique ID for this chain execution */
  chainId: string;
  /** ISO timestamp of when the chain started */
  startedAt: string;
  /** Number of agentic loop iterations completed so far */
  iterations: number;
  /** Total number of individual tool calls executed so far */
  totalToolCalls: number;
  /** Ordered log of every step in the chain */
  steps: ChainStepResult[];
  /** Full conversation history (user + assistant + tool messages) for resumption */
  messages: AiMessage[];
  /**
   * Set when the chain is paused because the LLM emitted a destructive tool call
   * that needs user confirmation before execution.
   */
  pendingDestructiveCall?: {
    /** The tool call ID from the LLM response */
    id: string;
    /** Registered skill name */
    name: string;
    /** Input arguments for the tool */
    input: any;
  };
  /**
   * When the chain pauses for a destructive call that was part of a batch,
   * store the non-destructive calls' results here so we can continue properly.
   */
  pendingNonDestructiveResults?: {
    callId: string;
    skillName: string;
    result: SkillResult<any>;
  }[];
}

// ── Chain Limits ─────────────────────────────────────────────────────────────

/** Maximum number of agentic loop iterations (LLM call rounds) */
export const MAX_CHAIN_ITERATIONS = 10;

/** Maximum total tool calls across the entire chain */
export const MAX_TOTAL_TOOLS_PER_CHAIN = 12;

/** Hard timeout for the entire chain execution (ms) */
export const MAX_CHAIN_DURATION_MS = 60_000;
