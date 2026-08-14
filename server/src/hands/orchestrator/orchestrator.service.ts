import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { SkillRegistryService } from '../core/registry.service';
import { SessionService } from './session.service';
import { AiMessage, AiTool } from '../../ai/providers/ai-provider.interface';
import { SkillContext, SkillResult } from '../core/types';
import { ConnectionResolverService } from '../core/connection-resolver.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderClientFactory } from '../../integrations/provider-client.factory';
import { ProviderConnection } from '../../integrations/contracts';
import {
  ChainExecutionContext,
  ChainStepResult,
  MAX_CHAIN_ITERATIONS,
  MAX_TOTAL_TOOLS_PER_CHAIN,
  MAX_CHAIN_DURATION_MS,
} from './chain-context';

/** Max character length for a tool result before truncation in LLM context */
const MAX_TOOL_RESULT_CHARS = 3000;

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
          text,
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

  private buildSystemPrompt(userProfile?: {
    fullName: string;
    email: string;
  }): string {
    let prompt = `You are AIAN, a strict enterprise organizational intelligence AI.
CRITICAL RULES:
1. You have access to various tools (skills) like sending emails, sending messages, fetching reports, and querying organizational knowledge.
2. If the user asks you to perform an action that matches one of your tools, you MUST use the appropriate tool to fulfill their request.
3. If the user asks a question about the organization's data, projects, or employees, you MUST use the KnowledgeSkill.answerQuestion tool.
4. Do NOT answer general knowledge questions, math problems, or write code. If asked, respond: "I am an enterprise AI and can only assist with organizational tasks."
   However, NEVER refuse requests to use your tools (like sending emails, creating tasks, or searching).
   If a user provides a short answer (like an email address, "yes", or a name) during a multi-step conversation, DO NOT refuse it. It is just context for the ongoing task.
   If a search returns no results, tell the user "I searched but couldn't find any information" rather than refusing.
5. Be concise and professional.

MULTI-STEP CHAINING RULES:
6. When a user's request involves multiple steps where a later step depends on the output of an earlier step, you MUST execute them sequentially: call the first tool, observe its result, then call the next tool using that result.
7. When a user's request involves multiple INDEPENDENT actions (no dependency between them), you may call all the tools in a single response.
8. CRITICAL: NEVER use placeholder values like {report_content}, {summary}, or {result_from_step_1} in tool inputs. If a tool's input depends on another tool's output, DO NOT call that tool yet. Instead, call ONLY the tool that produces the data you need. After you receive its result, THEN call the dependent tool with the ACTUAL data. Example: For "generate a report and email it", ONLY call GenerateReport first. Do NOT call EmailSkill in the same response with a placeholder. Wait for the report result, then call EmailSkill with the real content.
9. If you need information from the user to complete a step (e.g., a missing email address, unclear recipient, or ambiguous identifier), ASK the user for clarification instead of guessing. Phrase your question clearly and concisely.
10. When converting content between formats (e.g., markdown report to HTML email), do the conversion yourself in the tool arguments.`;

    if (userProfile) {
      prompt += `\n\nCURRENT USER CONTEXT:
- Name: ${userProfile.fullName}
- Email: ${userProfile.email}
CRITICAL: When the user says "me", "my", or "I", they are referring to this user.
"send it to me" = send to ${userProfile.email}. "email me" = send to ${userProfile.email}.
Do NOT ask for the user's email address. You already have it: ${userProfile.email}.`;
    }

    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const currentTime = now.toLocaleTimeString('en-US');
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    prompt += `\n\nCURRENT SYSTEM TIME:
- Date: ${currentDate}
- Time: ${currentTime}
- Timezone: ${timeZone}
CRITICAL: When generating dates or times for tool arguments (like scheduling meetings or setting due dates), you MUST resolve relative terms (like "tomorrow", "next week", "in 2 hours") into strict absolute dates (e.g. ISO 8601 strings) using the current system time above. Never pass literal strings like "tomorrow" to tools.`;

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

    const dataStr = JSON.stringify(result.data ?? { success: true });

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
    if (data.reportMarkdown) return ' — Report generated';
    if (data.answer) return ` — "${data.answer.substring(0, 80)}..."`;
    if (data.summary) return ` — Summary generated`;
    if (data.meetingSkillMessage)
      return ` — ${data.meetingSkillMessage.substring(0, 80)}`;
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

    // 3. Look up user profile for context injection ("send it to me" → email)
    let userProfile: { fullName: string; email: string } | undefined;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { fullName: true, email: true },
      });
      if (user) {
        userProfile = { fullName: user.fullName, email: user.email };
      }
    } catch (e) {
      this.logger.warn(`Could not look up user profile: ${e.message}`);
    }

    // 4. Start the agentic loop
    const messages: AiMessage[] = [{ role: 'user', content: input.text }];
    const chainContext = this.createChainContext(messages);

    try {
      await this.runAgenticLoop(input, session.id, chainContext, userProfile);
    } catch (error) {
      this.logger.error(`Agentic loop failed: ${error.message}`, error.stack);
      if (chainContext.steps.length > 0) {
        const statusMsg = this.formatChainStatusMessage(
          chainContext.steps,
          '❌ *An error occurred while processing your request.* Here is what was completed:',
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          statusMsg,
          input.threadTs,
        );
      } else {
        await this.sendReply(
          input.connectionId,
          input.channelId,
          '❌ Sorry, something went wrong while processing your request. Please try again.',
          input.threadTs,
        );
      }
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
    let sentWorkingMessage = false;

    while (chainContext.iterations < MAX_CHAIN_ITERATIONS) {
      // Timeout check
      if (Date.now() - startTime > MAX_CHAIN_DURATION_MS) {
        this.logger.warn(
          `Chain ${chainContext.chainId} hit timeout after ${chainContext.iterations} iterations`,
        );
        const statusMsg = this.formatChainStatusMessage(
          chainContext.steps,
          '⏱️ *Chain timed out.* Here is what was completed:',
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          statusMsg || '⏱️ Chain timed out before any steps completed.',
          input.threadTs,
        );
        break;
      }

      // Tool count limit check
      if (chainContext.totalToolCalls >= MAX_TOTAL_TOOLS_PER_CHAIN) {
        this.logger.warn(
          `Chain ${chainContext.chainId} hit tool call limit (${MAX_TOTAL_TOOLS_PER_CHAIN})`,
        );
        const statusMsg = this.formatChainStatusMessage(
          chainContext.steps,
          `⚠️ *Chain reached the maximum number of tool calls (${MAX_TOTAL_TOOLS_PER_CHAIN}).* Here is what was completed:`,
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          statusMsg || '⚠️ Chain reached the tool call limit.',
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
              "✅ Task processing completed.",
              input.threadTs,
            );
          } else {
            await this.sendReply(
              input.connectionId,
              input.channelId,
              "❌ I encountered an error processing your request.",
              input.threadTs,
            );
          }
        }
        break;
      }

      // ── Case B: LLM emitted tool calls ──
      const toolCalls = aiResult.toolCalls;

      // Send "working on it" message after the first iteration
      // (so the user knows a multi-step chain is in progress)
      if (chainContext.iterations > 0 && !sentWorkingMessage) {
        await this.sendReply(
          input.connectionId,
          input.channelId,
          '⏳ Working on it...',
          input.threadTs,
        );
        sentWorkingMessage = true;
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

        const statusMsg = this.formatChainStatusMessage(
          chainContext.steps,
          '⚠️ *Chain progress so far:*',
        );
        await this.sendReply(
          input.connectionId,
          input.channelId,
          `${statusMsg}\n\n*Next step requires confirmation:*\n⚠️ *${destructiveCall.name}*\n\nReply with "yes" to proceed or "no" to cancel the remaining chain.`,
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
            `✅ Confirmed and executed: *${def.name}* (Success: ${result.success})`,
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
        `❌ Action cancelled.`,
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

      const statusMsg = this.formatChainStatusMessage(
        chainContext.steps,
        '❌ *Chain cancelled.*',
      );
      await this.sendReply(
        input.connectionId,
        input.channelId,
        statusMsg,
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
    let userProfile: { fullName: string; email: string } | undefined;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { fullName: true, email: true },
      });
      if (user) userProfile = { fullName: user.fullName, email: user.email };
    } catch (e) {
      this.logger.warn(`Could not look up user profile: ${e.message}`);
    }

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
    let userProfile: { fullName: string; email: string } | undefined;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { fullName: true, email: true },
      });
      if (user) userProfile = { fullName: user.fullName, email: user.email };
    } catch (e) {
      this.logger.warn(`Could not look up user profile: ${e.message}`);
    }

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
