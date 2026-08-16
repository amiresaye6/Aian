import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { SkillRegistryService } from '../core/registry.service';
import { SessionService } from './session.service';
import { AiMessage, AiTool } from '../../ai/providers/ai-provider.interface';
import { SkillContext, SkillResult } from '../core/types';
import { ConnectionResolverService } from '../core/connection-resolver.service';
import { UserResolverService } from '../core/user-resolver.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderClientFactory } from '../../integrations/provider-client.factory';
import { ProviderConnection } from '../../integrations/contracts';
import { markdownToSlackMrkdwn } from '../../integrations/slack/slack-formatter.util';
import {
  ChainExecutionContext,
  ChainStepResult,
  MAX_CHAIN_ITERATIONS,
  MAX_TOTAL_TOOLS_PER_CHAIN,
  MAX_CHAIN_DURATION_MS,
} from './chain-context';

/** Max character length for a tool result before truncation in LLM context */
const MAX_TOOL_RESULT_CHARS = 6000;

export interface HandleDMInput {
  organizationId: string;
  connectionId: string;
  teamId: string;
  userId: string;
  channelId: string;
  text: string;
  threadTs: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly skillRegistry: SkillRegistryService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly clientFactory: ProviderClientFactory,
    private readonly connectionResolver: ConnectionResolverService,
    private readonly userResolver: UserResolverService,
  ) {}

  // ── Reply Helper ─────────────────────────────────────────────────────────

  /**
   * Helper to send a message back to the user via the Provider Client (e.g. Slack)
   */
  private async sendReply(
    connectionId: string,
    channelId: string,
    text: string,
    threadTs?: string,
  ) {
    // Convert standard Markdown to Slack mrkdwn before sending
    const formattedText = markdownToSlackMrkdwn(text);
    try {
      const connection = await this.prisma.providerConnection.findUnique({
        where: { id: connectionId },
      });
      if (!connection) return;
      const client = this.clientFactory.getClient(connection.providerId);
      if (!client) return;

      if (client.sendMessage) {
        await client.sendMessage(connection as unknown as ProviderConnection, {
          targetId: channelId,
          text: formattedText,
          threadId: threadTs,
        });
      }
    } catch (e) {
      this.logger.error(
        `Failed to send reply to connection ${connectionId}: ${e.message}`,
      );
    }
  }

  // ── System Prompt ────────────────────────────────────────────────────────

  /**
   * Generates a dynamic capabilities summary from the skill registry.
   * Groups skills by their prefix (e.g. "Jira", "meetingSkill") and
   * lists each skill's description. Includes usage hints when provided.
   */
  private buildCapabilitiesSummary(): string {
    const definitions = this.skillRegistry.getAllDefinitions();
    if (definitions.length === 0) return '';

    const lines: string[] = ['AVAILABLE TOOLS:'];
    for (const def of definitions) {
      let line = `- ${def.name}: ${def.description}`;
      if (def.usageHint) {
        line += ` (Hint: ${def.usageHint})`;
      }
      lines.push(line);
    }

    return lines.join('\n');
  }

  private buildSystemPrompt(userProfile?: {
    fullName: string;
    email: string;
  }): string {
    const capabilities = this.buildCapabilitiesSummary();

    let prompt = `You are AIAN, an enterprise workspace assistant.

PERSONALITY & TONE:
- Be concise. Slack is a chat — not a report. Keep replies short and scannable.
- Be direct. Say "Done" not "The task has been successfully created for you."
- Be natural. Write like a helpful teammate, not a corporate chatbot.
- Never apologize excessively. One "sorry" max if something failed.
- Use emoji sparingly — one per message at most, and only when it adds clarity.

${capabilities}

WHAT YOU CANNOT DO:
- Answer general knowledge, math, or coding questions. If asked, say: "I can only help with workspace tasks. Try asking me about tasks, meetings, emails, or organizational questions."
- Make up information. If a knowledge search returns nothing, say so.
- However, NEVER refuse requests to use your tools (like sending emails, creating tasks, or searching).
- If a user provides a short answer (like an email address, "yes", or a name) during a multi-step conversation, DO NOT refuse it. It is just context for the ongoing task.

FORMATTING RULES FOR SLACK:
- Use *bold* for emphasis (NOT **bold**)
- Use _italic_ for secondary emphasis
- Use \`code\` for technical values like IDs, emails, keys
- Use • for bullet points (NOT - or *)
- Do NOT use # headers — Slack doesn't render them
- For links, use <url|display text> format
- Keep messages under 3000 characters. If a response is long, summarize the key points.

TOOL USAGE RULES:
1. Pick the right tool by reading each tool's name and description. Match the user's intent to the tool that fits.
2. Each tool defines its own required and optional parameters in its schema. Before calling any tool, verify you have values for ALL required parameters. If any are missing, ask the user — do not guess.
3. Only ask the user for required parameters that you cannot infer from context. Do not ask for optional parameters unless the user's request clearly needs them.
4. Sequential dependencies: If tool B needs output from tool A, call A first. Wait for the result, then call B. NEVER use placeholders like {report_content}.
5. Independent actions: If tools don't depend on each other, you may call them all at once.
6. Format conversion: When converting content between formats (e.g. markdown to HTML for email), do it yourself in the tool arguments.

TOOL EXECUTION RULES (CRITICAL):
- Once a tool succeeds (e.g. returns {"success":true}), DO NOT call that same tool again for the same task.
- When a task is complete, generate a conversational text response to the user and STOP generating tool calls.`;

    if (userProfile) {
      const nameStr = userProfile.fullName || 'there';
      const emailStr = userProfile.email || '';

      prompt += `\n\nYOU ARE TALKING TO:\n- Name: ${nameStr}`;
      if (emailStr) {
        prompt += `\n- Email: ${emailStr}`;
      }
      prompt += `\nWhen they say "me", "my", "I", or "mine" — they mean themselves.`;
      if (emailStr) {
        prompt += `\n"send it to me" = send to ${emailStr}. Do NOT ask for their email.`;
      }
    }

    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const currentTime = now.toLocaleTimeString('en-US');
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    prompt += `\n\nCURRENT TIME: ${currentDate}, ${currentTime} (${timeZone})\nWhen the user says "tomorrow", "next week", "in 2 hours" — convert to ISO 8601 dates using the time above. Never pass relative terms to tools.`;

    return prompt;
  }

  // ── Schema Conversion ────────────────────────────────────────────────────

  private buildTools(): AiTool[] {
    const definitions = this.skillRegistry.getAllDefinitions();
    return definitions.map((def) => {
      return {
        name: def.name,
        description: def.description,
        schema: (def.schema as any).toJSONSchema(),
      };
    });
  }

  // ── Chain Helpers ────────────────────────────────────────────────────────

  /**
   * Truncates/formats a tool result for injection into the LLM context.
   * Passes only .data (never .meta or internal fields) to control token cost.
   */
  private prepareToolResultForContext(result: SkillResult<any>): string {
    if (!result.success) {
      return JSON.stringify({
        success: false,
        error: result.error
          ? { code: result.error.code, message: result.error.message }
          : { code: 'UNKNOWN', message: 'Skill execution failed' },
      });
    }

    const payload = {
      status: 'SUCCESS - DO NOT CALL THIS TOOL AGAIN FOR THIS TASK',
      data: result.data ?? { success: true },
    };
    const dataStr = JSON.stringify(payload);

    if (dataStr.length <= MAX_TOOL_RESULT_CHARS) {
      return dataStr;
    }

    // Truncate large outputs but preserve structure
    const truncated = dataStr.substring(0, MAX_TOOL_RESULT_CHARS);
    return truncated + '... [truncated]';
  }

  /**
   * Helper to detect if an LLM is trying to use placeholders instead of waiting
   * for tool results in the agentic loop.
   */
  private containsPlaceholder(input: any): boolean {
    const str = JSON.stringify(input);
    // Matches {report_content}, {summary from toolCall 1}, etc.
    return /\{[a-z_\s1-9]+\}/i.test(str);
  }

  /**
   * Heuristic to detect if the LLM's text response is asking the user
   * for clarification (vs. being a final summary/answer).
   *
   * We check for question markers because when the LLM needs info,
   * it naturally phrases the response as a question.
   */
  private looksLikeClarification(text: string | undefined): boolean {
    if (!text) return false;

    const trimmed = text.trim();

    // Strong signals: ends with a question mark
    if (trimmed.endsWith('?')) return true;

    // Phrases commonly used when asking for input
    const clarificationPhrases = [
      'could you',
      'can you provide',
      'please provide',
      'please specify',
      'which one',
      'who should',
      'what is the',
      'what email',
      'what address',
      'i need to know',
      'could you clarify',
      'please clarify',
      'do you want',
      'would you like',
      'let me know',
    ];

    const lower = trimmed.toLowerCase();
    return clarificationPhrases.some((phrase) => lower.includes(phrase));
  }

  /**
   * Generates a user-facing status message showing the state of each step
   * in a chain execution: ✅ completed, ❌ failed, ⏹️ not executed.
   */
  private formatChainStatusMessage(
    steps: ChainStepResult[],
    headerMessage?: string,
  ): string {
    if (steps.length === 0) return headerMessage || '';

    const lines: string[] = [];
    if (headerMessage) lines.push(headerMessage);

    const completedSteps = steps.filter((s) => s.status === 'success');
    const failedSteps = steps.filter((s) => s.status === 'failed');
    const pendingSteps = steps.filter(
      (s) =>
        s.status === 'not_reached' ||
        s.status === 'pending_confirmation' ||
        s.status === 'skipped',
    );

    if (completedSteps.length > 0) {
      if (failedSteps.length > 0 || pendingSteps.length > 0) {
        lines.push('\n*Already completed (cannot be undone):*');
      }
      for (const step of completedSteps) {
        const detail = this.summarizeStepResult(step);
        lines.push(
          `  ✅ Step ${step.stepIndex + 1}: ${step.skillName}${detail}`,
        );
      }
    }

    if (failedSteps.length > 0) {
      lines.push('\n*Failed:*');
      for (const step of failedSteps) {
        const errMsg = step.result?.error?.message || 'Unknown error';
        lines.push(
          `  ❌ Step ${step.stepIndex + 1}: ${step.skillName} — ${errMsg}`,
        );
      }
    }

    if (pendingSteps.length > 0) {
      lines.push('\n*Not executed:*');
      for (const step of pendingSteps) {
        lines.push(
          `  ⏹️ Step ${step.stepIndex + 1}: ${step.skillName} — NOT executed`,
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Extracts a short human-readable summary from a successful step's result.
   */
  private summarizeStepResult(step: ChainStepResult): string {
    if (!step.result?.data) return '';
    const data = step.result.data as any;

    // Scan for common summary-like fields generically — no skill-specific checks
    const candidateFields = [
      'message',
      'answer',
      'summary',
      'reportMarkdown',
      'meetingSkillMessage',
      'result',
      'text',
      'content',
    ];
    for (const field of candidateFields) {
      if (typeof data[field] === 'string' && data[field].length > 0) {
        const preview = data[field].substring(0, 80);
        return ` — ${preview}${data[field].length > 80 ? '...' : ''}`;
      }
    }
    return '';
  }

  /**
   * Creates a new ChainExecutionContext with a unique ID.
   */
  private createChainContext(
    initialMessages: AiMessage[],
  ): ChainExecutionContext {
    return {
      chainId: `chain-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      startedAt: new Date().toISOString(),
      iterations: 0,
      totalToolCalls: 0,
      steps: [],
      messages: [...initialMessages],
    };
  }

  // ── Pre-Validation ───────────────────────────────────────────────────────

  /**
   * Pre-validates tool call inputs against the skill's Zod schema BEFORE execution.
   * Returns null if valid, or a structured object describing missing/invalid fields.
   * This saves token round-trips by catching problems before burning an LLM cycle.
   */
  private preValidateToolCall(call: { id: string; name: string; input: any }): {
    valid: boolean;
    missingFields?: string[];
    errors?: string;
  } {
    const def = this.skillRegistry.resolve(call.name);
    if (!def) return { valid: true }; // Will fail at execution with SKILL_NOT_FOUND

    const result = def.schema.safeParse(call.input);
    if (result.success) return { valid: true };

    // Extract the missing required fields from Zod errors
    const missingFields = result.error.issues
      .filter(
        (issue: any) =>
          issue.code === 'invalid_type' && issue.received === 'undefined',
      )
      .map((issue) => issue.path.join('.'));

    const otherErrors = result.error.issues
      .filter(
        (issue: any) =>
          !(issue.code === 'invalid_type' && issue.received === 'undefined'),
      )
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`);

    return {
      valid: false,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      errors: otherErrors.length > 0 ? otherErrors.join('; ') : undefined,
    };
  }

  // ── Action Descriptions ─────────────────────────────────────────────────

  /**
   * Generates a human-readable description of a skill action for confirmation prompts.
   * Pulls the description from the skill's own registration (actionDescription),
   * falling back to a generic message. No hardcoded skill names.
   */
  private describeAction(skillName: string, input: any): string {
    const def = this.skillRegistry.resolve(skillName);
    if (def?.actionDescription) {
      try {
        return def.actionDescription(input);
      } catch {
        // Fallback below
      }
    }

    // Generic fallback — still no internal names exposed
    return `I'm about to perform a permanent action that can't be undone`;
  }

  // ── User Profile Resolution ─────────────────────────────────────────────

  /**
   * Resolves the Slack user ID from a DM input to an internal user profile.
   * Reusable across handleDM, handleChainConfirmation, and handleChainClarificationResume.
   */
  private async resolveUserProfile(
    input: HandleDMInput,
  ): Promise<{ fullName: string; email: string } | undefined> {
    const resolved = await this.userResolver.resolveSlackUser(
      input.organizationId,
      input.userId,
      input.connectionId,
    );
    return resolved
      ? { fullName: resolved.fullName, email: resolved.email }
      : undefined;
  }

  // ── Skill Execution ──────────────────────────────────────────────────────

  /**
   * Executes a single skill call: resolves connections, builds context, runs the handler.
   * Returns the SkillResult and records the step in the chain context.
   */
  private async executeSkillCall(
    call: { id: string; name: string; input: any },
    dmInput: HandleDMInput,
    sessionId: string,
    chainContext: ChainExecutionContext,
    overrideStepIndex?: number,
  ): Promise<{ result: SkillResult<any>; step: ChainStepResult }> {
    const def = this.skillRegistry.resolve(call.name);
    const stepIndex = overrideStepIndex ?? chainContext.totalToolCalls;

    if (!def) {
      const step: ChainStepResult = {
        stepIndex,
        iterationIndex: chainContext.iterations,
        skillName: call.name,
        input: call.input,
        result: null,
        status: 'failed',
        timestamp: new Date().toISOString(),
      };
      const failResult: SkillResult<any> = {
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `Skill "${call.name}" is not registered.`,
          retryable: false,
        },
        meta: {
          skill: call.name,
          provider: 'unknown',
          durationMs: 0,
          idempotencyKey: '',
        },
      };
      step.result = failResult;
      return { result: failResult, step };
    }

    // Resolve provider connections
    const { connections, missing } =
      await this.connectionResolver.resolveForSkill(
        dmInput.organizationId,
        def.requiredProviders || [],
        def.optionalProviders || [],
      );

    if (missing.length > 0) {
      const step: ChainStepResult = {
        stepIndex,
        iterationIndex: chainContext.iterations,
        skillName: call.name,
        input: call.input,
        result: null,
        status: 'failed',
        timestamp: new Date().toISOString(),
      };
      const failResult: SkillResult<any> = {
        success: false,
        error: {
          code: 'MISSING_PROVIDER',
          message: `This action requires the following integrations: ${missing.join(', ')}. Please link them in your dashboard.`,
          retryable: false,
        },
        meta: {
          skill: call.name,
          provider: 'unknown',
          durationMs: 0,
          idempotencyKey: '',
        },
      };
      step.result = failResult;
      return { result: failResult, step };
    }

    // Build skill context with deterministic idempotency key
    const ctx: SkillContext = {
      organizationId: dmInput.organizationId,
      actorUserId: dmInput.userId,
      triggerConnectionId: dmInput.connectionId,
      connections,
      sessionId,
      idempotencyKey: `${sessionId}-${chainContext.chainId}-step-${stepIndex}`,
      traceId: `trace-${chainContext.chainId}-${stepIndex}`,
    };

    // Execute the skill
    const result = await def.handler(ctx, call.input);
    this.logger.log(
      `Skill ${def.name} executed with success: ${result.success}`,
    );

    const step: ChainStepResult = {
      stepIndex,
      iterationIndex: chainContext.iterations,
      skillName: call.name,
      input: call.input,
      result,
      status: result.success ? 'success' : 'failed',
      timestamp: new Date().toISOString(),
    };

    return { result, step };
  }

  // ── Main Entry Point ─────────────────────────────────────────────────────

  async handleDM(input: HandleDMInput) {
    this.logger.log(`Handling DM from user ${input.userId}`);

    // 1. Get or create session
    const session = await this.sessionService.getOrCreateSession(
      input.organizationId,
      input.userId,
    );

    // 2. State Machine: handle resume paths for paused chains and confirmations
    if (session.state === 'confirming') {
      return this.handleSingleConfirmation(input, session);
    }

    if (session.state === 'awaiting_chain_confirmation') {
      return this.handleChainConfirmation(input, session);
    }

    if (session.state === 'awaiting_clarification') {
      return this.handleChainClarificationResume(input, session);
    }

    // 3. Resolve Slack user ID to internal user profile
    const userProfile = await this.resolveUserProfile(input);

    // 3.5 Send immediate acknowledgment so the user knows we're processing
    await this.sendReply(
      input.connectionId,
      input.channelId,
      '⏳ On it...',
      input.threadTs,
    );

    // 4. Start the agentic loop
    const messages: AiMessage[] = [{ role: 'user', content: input.text }];
    const chainContext = this.createChainContext(messages);

    try {
      await this.runAgenticLoop(input, session.id, chainContext, userProfile);
    } catch (error) {
      this.logger.error(`Agentic loop failed: ${error.message}`, error.stack);
      await this.sendReply(
        input.connectionId,
        input.channelId,
        '❌ Something went wrong. Please try again, and if it keeps happening, let your admin know.',
        input.threadTs,
      );
      await this.sessionService.updateSessionState(session.id, 'idle');
    }
  }

  // ── Agentic Loop ─────────────────────────────────────────────────────────

  /**
   * The core agentic loop. Calls the LLM, executes tool calls, feeds results
   * back, and repeats until the LLM emits a final text response, a clarification
   * question, a destructive action needing confirmation, or limits are hit.
   */
  private async runAgenticLoop(
    input: HandleDMInput,
    sessionId: string,
    chainContext: ChainExecutionContext,
    userProfile?: { fullName: string; email: string },
  ): Promise<void> {
    const tools = this.buildTools();
    const systemPrompt = this.buildSystemPrompt(userProfile);
    const aiOptions = {
      organizationId: input.organizationId,
      feature: 'dm_chat',
    };

    await this.sessionService.updateSessionState(sessionId, 'chaining');

    const startTime = new Date(chainContext.startedAt).getTime();

    while (true) {
      // Max iterations check
      if (chainContext.iterations >= MAX_CHAIN_ITERATIONS) {
        this.logger.warn(
          `Chain ${chainContext.chainId} hit max iterations limit (${MAX_CHAIN_ITERATIONS})`,
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          '⚠️ That was a complex request — I completed what I could. If anything is still pending, just let me know.',
          input.threadTs,
        );
        break;
      }

      // Timeout check
      if (Date.now() - startTime > MAX_CHAIN_DURATION_MS) {
        this.logger.warn(
          `Chain ${chainContext.chainId} hit timeout after ${chainContext.iterations} iterations`,
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          '⏱️ This took too long — I had to stop. Please try again with a simpler request, or break it into smaller steps.',
          input.threadTs,
        );
        break;
      }

      // Tool count limit check
      if (chainContext.totalToolCalls >= MAX_TOTAL_TOOLS_PER_CHAIN) {
        this.logger.warn(
          `Chain ${chainContext.chainId} hit tool call limit (${MAX_TOTAL_TOOLS_PER_CHAIN})`,
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          '⚠️ That was a complex request — I completed what I could. If anything is still pending, just let me know.',
          input.threadTs,
        );
        break;
      }

      // Call the LLM
      const { data: aiResult } = await this.aiGateway.generateToolCalls(
        chainContext.messages,
        tools,
        systemPrompt,
        aiOptions,
      );

      // ── Case A: LLM emitted a text response with no tool calls ──
      if (!aiResult.toolCalls || aiResult.toolCalls.length === 0) {
        // If this looks like a question → clarification pause (even before tools execute)
        if (this.looksLikeClarification(aiResult.content)) {
          this.logger.log(
            `Chain ${chainContext.chainId} pausing for clarification`,
          );

          // Save the assistant's clarification message into context for later resumption
          chainContext.messages.push({
            role: 'assistant',
            content: aiResult.content,
          });

          await this.sessionService.updateSessionState(
            sessionId,
            'awaiting_clarification',
            chainContext,
          );

          await this.sendReply(
            input.connectionId,
            input.channelId,
            aiResult.content ||
              'I need some additional information to continue.',
            input.threadTs,
          );
          return; // Pause — will resume when user replies
        }

        // Otherwise: final response — send it and we're done
        if (aiResult.content) {
          await this.sendReply(
            input.connectionId,
            input.channelId,
            aiResult.content,
            input.threadTs,
          );
        } else {
          // LLM returned absolutely nothing (empty string and no tools)
          if (chainContext.iterations > 0) {
            await this.sendReply(
              input.connectionId,
              input.channelId,
              'Task processing completed.',
              input.threadTs,
            );
          } else {
            await this.sendReply(
              input.connectionId,
              input.channelId,
              '❌ I encountered an error processing your request.',
              input.threadTs,
            );
          }
        }
        break;
      }

      // ── Case B: LLM emitted tool calls ──
      const toolCalls = aiResult.toolCalls;

      // Pre-validate all tool calls before any execution
      const validationResults = toolCalls.map((call) => ({
        call,
        validation: this.preValidateToolCall(call),
      }));

      const invalidCalls = validationResults.filter((r) => !r.validation.valid);

      if (invalidCalls.length > 0) {
        // Build a clear message asking for the missing information
        const missingInfo = invalidCalls.map((r) => {
          const parts: string[] = [];
          if (r.validation.missingFields?.length) {
            parts.push(
              `Missing required fields: ${r.validation.missingFields.join(', ')}`,
            );
          }
          if (r.validation.errors) {
            parts.push(`Validation issues: ${r.validation.errors}`);
          }
          return `*${r.call.name}*: ${parts.join('. ')}`;
        });

        // Feed the validation errors back to the LLM so it can ask the user
        chainContext.messages.push({
          role: 'assistant',
          content: aiResult.content || '',
          toolCalls,
        });
        for (const r of invalidCalls) {
          chainContext.messages.push({
            role: 'tool',
            toolResultId: r.call.id,
            content: JSON.stringify({
              success: false,
              error: {
                code: 'MISSING_REQUIRED_FIELDS',
                message: `Cannot execute: ${r.validation.missingFields?.length ? 'Missing required fields: ' + r.validation.missingFields.join(', ') + '.' : ''} ${r.validation.errors || ''} Ask the user for the missing information before retrying.`,
              },
            }),
          });
        }
        chainContext.iterations++;
        continue;
      }

      // Check if any of the tool calls are destructive
      const destructiveCall = toolCalls.find((call) => {
        const def = this.skillRegistry.resolve(call.name);
        return def?.destructive === true;
      });

      if (destructiveCall) {
        // Separate destructive from non-destructive calls in this batch
        const nonDestructiveCalls = toolCalls.filter(
          (call) => call.id !== destructiveCall.id,
        );

        // Execute non-destructive calls first (if any)
        let nonDestructiveResults:
          | { callId: string; skillName: string; result: SkillResult<any> }[]
          | undefined;

        if (nonDestructiveCalls.length > 0) {
          const indexedCalls = nonDestructiveCalls.map((call, i) => ({
            call,
            assignedStepIndex: chainContext.totalToolCalls + i,
          }));
          chainContext.totalToolCalls += nonDestructiveCalls.length;

          const execResults = await Promise.all(
            indexedCalls.map(async ({ call, assignedStepIndex }) => {
              const { result, step } = await this.executeSkillCall(
                call,
                input,
                sessionId,
                chainContext,
                assignedStepIndex,
              );
              chainContext.steps.push(step);
              return { callId: call.id, skillName: call.name, result };
            }),
          );
          nonDestructiveResults = execResults;
        }

        // Record the destructive call as pending
        const destructiveStep: ChainStepResult = {
          stepIndex: chainContext.totalToolCalls,
          iterationIndex: chainContext.iterations,
          skillName: destructiveCall.name,
          input: destructiveCall.input,
          result: null,
          status: 'pending_confirmation',
          timestamp: new Date().toISOString(),
        };
        chainContext.steps.push(destructiveStep);
        chainContext.totalToolCalls++;

        // Save the pending destructive call
        chainContext.pendingDestructiveCall = {
          id: destructiveCall.id,
          name: destructiveCall.name,
          input: destructiveCall.input,
        };

        // If there were non-destructive results, add their tool-result messages
        let allNonDestructiveFailed = false;
        if (nonDestructiveResults) {
          allNonDestructiveFailed = nonDestructiveResults.every(
            (nr) => !nr.result.success,
          );
          for (const nr of nonDestructiveResults) {
            chainContext.messages.push({
              role: 'tool',
              toolResultId: nr.callId,
              content: this.prepareToolResultForContext(nr.result),
            });
          }
          chainContext.pendingNonDestructiveResults = nonDestructiveResults;
        }

        if (allNonDestructiveFailed && nonDestructiveCalls.length > 0) {
          // If all prerequisite non-destructive calls failed, skip confirmation.
          // Add the destructive call's "skipped" result to context and loop.
          const skippedResult: SkillResult<any> = {
            success: false,
            error: {
              code: 'SKIPPED',
              message: 'Skipped because prerequisite steps failed',
              retryable: false,
            },
            meta: {
              skill: destructiveCall.name,
              provider: 'unknown',
              durationMs: 0,
              idempotencyKey: '',
            },
          };
          chainContext.messages.push({
            role: 'tool',
            toolResultId: destructiveCall.id,
            content: this.prepareToolResultForContext(skippedResult),
          });
          const pendingStep = chainContext.steps.find(
            (s) => s.status === 'pending_confirmation',
          );
          if (pendingStep) {
            pendingStep.result = skippedResult;
            pendingStep.status = 'skipped';
            pendingStep.timestamp = new Date().toISOString();
          }
          delete chainContext.pendingDestructiveCall;
          delete chainContext.pendingNonDestructiveResults;
          chainContext.iterations++;
          continue;
        }

        // Save the pending destructive call
        chainContext.pendingDestructiveCall = {
          id: destructiveCall.id,
          name: destructiveCall.name,
          input: destructiveCall.input,
        };

        // Pause for confirmation
        await this.sessionService.updateSessionState(
          sessionId,
          'awaiting_chain_confirmation',
          chainContext,
        );

        // Build a human-readable description of the destructive action
        const actionDescription = this.describeAction(
          destructiveCall.name,
          destructiveCall.input,
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          `⚠️ Just to confirm — ${actionDescription}?\n\nReply *yes* to proceed or *no* to cancel.`,
          input.threadTs,
        );
        return; // Pause — will resume when user confirms
      }

      // ── No destructive calls: execute all in parallel ──

      // Filter out tool calls with placeholder inputs — they should wait for real data
      const readyCalls = toolCalls.filter(
        (call) => !this.containsPlaceholder(call.input),
      );
      const deferredCalls = toolCalls.filter((call) =>
        this.containsPlaceholder(call.input),
      );

      if (readyCalls.length === 0 && deferredCalls.length > 0) {
        // ALL calls have placeholders. Feed back an error message so the LLM calls them one by one.
        chainContext.messages.push({
          role: 'assistant',
          content: aiResult.content || '',
          toolCalls,
        });
        for (const call of deferredCalls) {
          chainContext.messages.push({
            role: 'tool',
            toolResultId: call.id,
            content: JSON.stringify({
              success: false,
              error: {
                code: 'BAD_TOOL_USAGE',
                message:
                  'You passed a placeholder value (e.g. {report_content}). You MUST NOT do this. Wait to receive the actual data from earlier tools, then call this tool with the real data.',
              },
            }),
          });
        }
        chainContext.iterations++;
        continue;
      }

      const assistantMessage: AiMessage = {
        role: 'assistant',
        content: aiResult.content || '',
        toolCalls: readyCalls, // Only execute ready calls
      };
      chainContext.messages.push(assistantMessage);

      const indexedCalls = readyCalls.map((call, i) => ({
        call,
        assignedStepIndex: chainContext.totalToolCalls + i,
      }));
      chainContext.totalToolCalls += readyCalls.length;

      const executionResults = await Promise.all(
        indexedCalls.map(async ({ call, assignedStepIndex }) => {
          const { result, step } = await this.executeSkillCall(
            call,
            input,
            sessionId,
            chainContext,
            assignedStepIndex,
          );
          chainContext.steps.push(step);
          return { call, result };
        }),
      );

      // Build tool-result messages and add to conversation
      for (const { call, result } of executionResults) {
        chainContext.messages.push({
          role: 'tool',
          toolResultId: call.id,
          content: this.prepareToolResultForContext(result),
        });
      }

      chainContext.iterations++;
    }

    // Chain loop ended — ensure session is idle
    await this.sessionService.updateSessionState(sessionId, 'idle');
  }

  // ── Single (non-chain) Destructive Confirmation Handler ──────────────────

  /**
   * Handles the original single-action confirmation flow (unchanged from before).
   * This is used when a standalone destructive action was triggered without chaining.
   */
  private async handleSingleConfirmation(
    input: HandleDMInput,
    session: any,
  ): Promise<void> {
    const text = input.text.toLowerCase();
    if (
      text.includes('yes') ||
      text.includes('confirm') ||
      text.includes('y')
    ) {
      this.logger.log('User confirmed destructive action.');
      await this.sessionService.updateSessionState(session.id, 'executing');

      const pendingAction = session.pendingAction as any;
      if (pendingAction && pendingAction.name) {
        const def = this.skillRegistry.resolve(pendingAction.name);
        if (def) {
          const { connections, missing } =
            await this.connectionResolver.resolveForSkill(
              input.organizationId,
              def.requiredProviders || [],
              def.optionalProviders || [],
            );

          if (missing.length > 0) {
            await this.sendReply(
              input.connectionId,
              input.channelId,
              `❌ This action requires the following integrations: *${missing.join(', ')}*. Please link them in your dashboard.`,
              input.threadTs,
            );
            await this.sessionService.updateSessionState(session.id, 'idle');
            return;
          }

          const ctx: SkillContext = {
            organizationId: input.organizationId,
            actorUserId: input.userId,
            triggerConnectionId: input.connectionId,
            connections,
            sessionId: session.id,
            idempotencyKey: `${session.id}-${Date.now()}`,
            traceId: `trace-${Date.now()}`,
          };
          const result = await def.handler(ctx, pendingAction.input);
          this.logger.log(
            `Executed confirmed action with success: ${result.success}`,
          );
          await this.sendReply(
            input.connectionId,
            input.channelId,
            result.success
              ? '✅ Done!'
              : '❌ Something went wrong. Please try again.',
            input.threadTs,
          );
        }
      }
      await this.sessionService.updateSessionState(session.id, 'idle');
      return;
    } else {
      this.logger.log('User cancelled destructive action.');
      await this.sessionService.updateSessionState(session.id, 'idle');
      await this.sendReply(
        input.connectionId,
        input.channelId,
        'Got it, cancelled.',
        input.threadTs,
      );
      return;
    }
  }

  // ── Chain Destructive Confirmation Handler ───────────────────────────────

  /**
   * Handles confirmation of a destructive action that appeared mid-chain.
   * On "yes": executes the destructive step, adds its result to context,
   * and resumes the agentic loop.
   * On "no": reports what was already completed and cancels the rest.
   */
  private async handleChainConfirmation(
    input: HandleDMInput,
    session: any,
  ): Promise<void> {
    const chainContext = session.pendingAction as ChainExecutionContext;
    if (!chainContext || !chainContext.pendingDestructiveCall) {
      this.logger.error(
        'Chain confirmation state but no pending destructive call',
      );
      await this.sessionService.updateSessionState(session.id, 'idle');
      await this.sendReply(
        input.connectionId,
        input.channelId,
        '❌ Something went wrong. The pending action was lost. Please try again.',
        input.threadTs,
      );
      return;
    }

    const text = input.text.toLowerCase();
    const isConfirmed =
      text.includes('yes') || text.includes('confirm') || text.includes('y');

    if (!isConfirmed) {
      // User cancelled — report what already completed
      this.logger.log('User cancelled mid-chain destructive action.');

      // Mark the pending step as skipped
      const pendingStep = chainContext.steps.find(
        (s) => s.status === 'pending_confirmation',
      );
      if (pendingStep) pendingStep.status = 'skipped';

      await this.sendReply(
        input.connectionId,
        input.channelId,
        'Got it, cancelled.',
        input.threadTs,
      );
      await this.sessionService.updateSessionState(session.id, 'idle');
      return;
    }

    // User confirmed — execute the destructive step
    this.logger.log('User confirmed mid-chain destructive action.');
    const destructiveCall = chainContext.pendingDestructiveCall;

    // Find the pending step to update it
    const pendingStep = chainContext.steps.find(
      (s) => s.status === 'pending_confirmation',
    );

    const { result } = await this.executeSkillCall(
      destructiveCall,
      input,
      session.id,
      chainContext,
    );

    // Update the step status
    if (pendingStep) {
      pendingStep.result = result;
      pendingStep.status = result.success ? 'success' : 'failed';
      pendingStep.timestamp = new Date().toISOString();
    }

    // Add the destructive call's tool-result message to conversation
    chainContext.messages.push({
      role: 'tool',
      toolResultId: destructiveCall.id,
      content: this.prepareToolResultForContext(result),
    });

    // Clear the pending destructive call
    delete chainContext.pendingDestructiveCall;
    delete chainContext.pendingNonDestructiveResults;
    chainContext.iterations++;
    chainContext.startedAt = new Date().toISOString(); // Reset timeout clock after user pause

    // Look up user profile for prompt context
    const userProfile = await this.resolveUserProfile(input);

    // Resume the agentic loop
    try {
      await this.runAgenticLoop(input, session.id, chainContext, userProfile);
    } catch (error) {
      this.logger.error(
        `Agentic loop failed on confirmation resume: ${error.message}`,
        error.stack,
      );
      await this.sessionService.updateSessionState(session.id, 'idle');
    }
  }

  // ── Chain Clarification Resume Handler ───────────────────────────────────

  /**
   * Handles resumption of a chain that was paused for clarification.
   * Appends the user's response to the conversation history and
   * resumes the agentic loop from where it left off.
   */
  private async handleChainClarificationResume(
    input: HandleDMInput,
    session: any,
  ): Promise<void> {
    const chainContext = session.pendingAction as ChainExecutionContext;
    if (!chainContext || !chainContext.messages) {
      this.logger.error(
        'Clarification resume state but no chain context found',
      );
      await this.sessionService.updateSessionState(session.id, 'idle');
      await this.sendReply(
        input.connectionId,
        input.channelId,
        '❌ Something went wrong. The chain context was lost. Please try again.',
        input.threadTs,
      );
      return;
    }

    this.logger.log(
      `Resuming chain ${chainContext.chainId} after clarification`,
    );

    // Append the user's clarification response to the conversation
    const userClarification = `${input.text}\n\n[SYSTEM] Please use the above information to continue fulfilling the original request. If you have enough information, output a JSON object containing your next tool calls. NEVER output an empty response.`;
    chainContext.messages.push({ role: 'user', content: userClarification });
    chainContext.startedAt = new Date().toISOString(); // Reset timeout clock after user pause

    // Look up user profile
    const userProfile = await this.resolveUserProfile(input);

    // Resume the agentic loop with the updated conversation
    try {
      await this.runAgenticLoop(input, session.id, chainContext, userProfile);
    } catch (error) {
      this.logger.error(
        `Agentic loop failed on clarification resume: ${error.message}`,
        error.stack,
      );
      await this.sessionService.updateSessionState(session.id, 'idle');
    }
  }
}
