/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import { GenerateReportInputSchema } from './schemas';
import { RetrievalPipelineService } from '../../retrieval/retrieval-pipeline.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { JiraClientService } from '../../integrations/jira/services/jira-client.service';
import { TrelloClientService } from '../../integrations/trello/services/trello-client.service';
import {
  ZoomClientService,
  MeetingType,
} from '../../integrations/zoom/zoom-client.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GraphService } from '../../graph/graph.service';
import { EmailService } from '../../email/email.service';
import { marked } from 'marked';

@Injectable()
export class ReportingSkill implements OnModuleInit {
  constructor(
    private readonly retrievalPipeline: RetrievalPipelineService,
    private readonly aiGateway: AiGatewayService,
    private readonly jiraClient: JiraClientService,
    @Optional() private readonly trelloClient: TrelloClientService,
    private readonly zoomClient: ZoomClientService,
    private readonly prisma: PrismaService,
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
    private readonly graphService: GraphService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'ReportingSkill.generateReport',
      description:
        'Generates insightful, contextual Markdown reports by deducing progress from Jira/Trello tasks, Zoom meetings, and Knowledge Graph context (PRs, Slack, decisions).',
      schema: GenerateReportInputSchema,
      destructive: false,
      requiredProviders: [],
      optionalProviders: ['jira', 'trello', 'zoom'],
      handler: (ctx: SkillContext, input: any) =>
        this.generateReport(ctx, input),
    });
  }

  async generateReport(
    ctx: SkillContext,
    input: any,
  ): Promise<SkillResult<any>> {
    const parsed = GenerateReportInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.message,
          retryable: false,
        },
        meta: {
          skill: 'ReportingSkill',
          provider: 'multiple',
          durationMs: 0,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }

    return this.resilienceService.execute(
      ctx,
      'ReportingSkill',
      'generateReport',
      'multiple',
      parsed.data,
      async () => {
        const { reportTopic, targetUser, timeframe, sections, deliveryEmail } =
          parsed.data;
        const activeSections = sections || ['tasks', 'meetings', 'knowledge'];

        // 1. Gather raw data
        const rawTasks = activeSections.includes('tasks')
          ? await this.fetchRawTasks(
              ctx,
              targetUser,
              timeframe,
              parsed.data.projects,
            )
          : [];

        const rawMeetings = activeSections.includes('meetings')
          ? await this.fetchRawMeetings(ctx, targetUser, timeframe)
          : [];

        // 2. Fetch specific Knowledge Graph context
        let graphContext = '';
        if (activeSections.includes('knowledge')) {
          graphContext = await this.fetchGraphContext(
            ctx,
            targetUser,
            timeframe,
            rawTasks,
            rawMeetings,
          );
        }

        // 3. Generate Insightful Report using LLM
        const fullReport = await this.generateInsightfulReport(
          ctx,
          reportTopic || 'General Status Report',
          targetUser,
          timeframe,
          rawTasks,
          rawMeetings,
          graphContext,
        );

        if (deliveryEmail) {
          const parsedHtml = await marked.parse(fullReport);
          const htmlContent = `
            <div class="content" style="font-family: sans-serif;">
              ${parsedHtml}
            </div>
          `;
          await this.emailService.sendBrandedEmail(
            deliveryEmail,
            reportTopic || 'Your Requested Report',
            htmlContent,
          );

          return {
            success: true,
            message: `The report has been successfully generated and sent to ${deliveryEmail}.`,
          };
        }

        return { reportMarkdown: fullReport };
      },
    );
  }

  // ── Data Fetchers ─────────────────────────────────────────────────────────

  private async fetchRawTasks(
    ctx: SkillContext,
    targetUser?: string | null,
    timeframe?: any,
    projects?: string[] | null,
  ): Promise<any[]> {
    let jql = '';
    
    const formatDateForJQL = (isoStr: string) => {
      const d = new Date(isoStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    if (timeframe?.from && timeframe?.to) {
      jql = `updated >= "${formatDateForJQL(timeframe.from)}" AND updated <= "${formatDateForJQL(timeframe.to)}"`;
    } else if (timeframe?.from) {
      jql = `updated >= "${formatDateForJQL(timeframe.from)}"`;
    } else if (timeframe?.to) {
      jql = `updated <= "${formatDateForJQL(timeframe.to)}"`;
    } else {
      jql = `updated >= -30d`;
    }

    if (targetUser) {
      jql += ` AND (assignee ~ "${targetUser}" OR text ~ "${targetUser}")`;
    }

    if (projects && projects.length > 0) {
      const projectsStr = projects.map((p) => `"${p}"`).join(', ');
      jql += ` AND project IN (${projectsStr})`;
    }
    jql += ` ORDER BY updated DESC`;

    // Try Jira
    try {
      const jiraConnection =
        ctx?.connections?.['jira'] ||
        (await this.prisma.providerConnection.findFirst({
          where: {
            organizationEye: { organizationId: ctx.organizationId },
            provider: { key: 'jira' },
            status: 'connected',
          },
        }));

      if (jiraConnection) {
        const searchResult = await this.jiraClient.searchIssues(
          ctx.organizationId,
          jql,
          50,
        );
        if (searchResult?.issues && Array.isArray(searchResult.issues)) {
          return searchResult.issues.map((i: any) => ({
            id: i.key,
            summary: i.fields?.summary,
            status: i.fields?.status?.name,
            assignee: i.fields?.assignee?.displayName,
            updated: i.fields?.updated,
            source: 'Jira',
          }));
        }
      }
    } catch (err: any) {
      // fallback to Trello
    }

    // Try Trello
    try {
      const trelloConnection =
        ctx?.connections?.['trello'] ||
        (await this.prisma.providerConnection.findFirst({
          where: {
            organizationEye: { organizationId: ctx.organizationId },
            provider: { key: 'trello' },
            status: 'connected',
          },
        }));

      if (trelloConnection && this.trelloClient) {
        const allBoards = await this.trelloClient.getBoards(
          trelloConnection as any,
        );
        if (Array.isArray(allBoards) && allBoards.length > 0) {
          let targetBoards = allBoards;
          if (projects && projects.length > 0) {
            targetBoards = allBoards.filter((b) =>
              projects.some((p) =>
                b.name.toLowerCase().includes(p.toLowerCase()),
              ),
            );
          }
          if (!projects || projects.length === 0) {
            targetBoards = targetBoards.slice(0, 5); // Fallback to top 5 boards
          }

          let allCards: any[] = [];
          for (const board of targetBoards) {
            const cards = await this.trelloClient.listTasks(
              ctx.organizationId,
              {
                boardName: board.name,
                maxResults: 50,
              },
            );
            if (Array.isArray(cards)) {
              allCards = allCards.concat(cards);
            }
          }

          return allCards
            .filter((c: any) => {
              if (!timeframe) return true;
              const activityDate = new Date(
                c.lastActivity || c.due || Date.now(),
              );
              if (timeframe.from && activityDate < new Date(timeframe.from))
                return false;
              if (timeframe.to && activityDate > new Date(timeframe.to))
                return false;
              return true;
            })
            .map((c: any) => ({
              id: c.id?.slice(-6) || 'Card',
              summary: c.name,
              status: c.closed ? 'Archived' : 'Active',
              assignee: targetUser || 'Unassigned',
              source: 'Trello',
            }));
        }
      }
    } catch (err: any) {
      // ignore
    }

    return [];
  }

  private async fetchRawMeetings(
    ctx: SkillContext,
    targetUser?: string | null,
    timeframe?: any,
  ): Promise<any[]> {
    try {
      const zoomConnection =
        ctx?.connections?.['zoom'] ||
        (await this.prisma.providerConnection.findFirst({
          where: {
            organizationEye: { organizationId: ctx.organizationId },
            provider: { key: 'zoom' },
            status: 'connected',
          },
        }));

      if (!zoomConnection) return [];

      const meetingsResult = await this.zoomClient.listMeetings(
        zoomConnection as any,
        MeetingType.Scheduled,
        20,
      );
      const meetings = meetingsResult?.resources || [];

      return meetings
        .map((m: any) => ({
          id: m.id,
          topic: m.name,
          startTime: m.metadata?.start_time,
          duration: m.metadata?.duration,
          host: m.metadata?.host_email,
          source: 'Zoom',
        }))
        .filter((m: any) => {
          if (!timeframe || !m.startTime) return true;
          const start = new Date(m.startTime);
          if (timeframe.from && start < new Date(timeframe.from)) return false;
          if (timeframe.to && start > new Date(timeframe.to)) return false;
          return true;
        });
    } catch (err: any) {
      return [];
    }
  }

  private async fetchGraphContext(
    ctx: SkillContext,
    targetUser: string | null | undefined,
    timeframe: any,
    tasks: any[],
    meetings: any[],
  ): Promise<string> {
    if (!targetUser) {
      // Fallback: If no targetUser, use general retrieval pipeline based on task/meeting summaries
      const topics =
        tasks.map((t) => t.summary).join(' ') +
        ' ' +
        meetings.map((m) => m.topic).join(' ');
      if (!topics.trim()) return '';

      const retrievalResult = await this.retrievalPipeline.retrieveContext(
        ctx.organizationId,
        topics.substring(0, 200),
      );
      return retrievalResult?.contextString || '';
    }

    const session = this.graphService.getSession();
    try {
      // Custom Query: Find the user, expand 1-2 hops to find related context
      let query = `
        MATCH (u:Entity {organizationId: $orgId})
        WHERE u.type IN ['Person', 'User'] AND toLower(u.canonicalName) CONTAINS toLower($targetUser)
        
        // Traverse to find related Tickets, Meetings, Tasks, Projects, PullRequests, Messages, Decisions, Claims
        MATCH (u)-[r]-(n)
        WHERE (n:Claim OR n:Decision OR n:ActionItem OR (n:Entity AND n.type IN ['Ticket', 'Meeting', 'Task', 'Project', 'PullRequest', 'Message']))
        
        // Collect artifact IDs from the nodes and relationships
        WITH n, coalesce(n.artifactIds, []) + coalesce(r.artifactIds, []) AS artifactIds
        UNWIND artifactIds AS artifactId
        RETURN DISTINCT artifactId
        LIMIT 40
      `;

      const result = await session.run(query, {
        orgId: ctx.organizationId,
        targetUser,
      });

      const artifactIds = result.records.map((r) => r.get('artifactId'));

      if (artifactIds.length === 0) {
        return 'No highly related graph context found for this user.';
      }

      // Fetch artifact contents from DB
      const dateFilter: any = {};
      if (timeframe?.from) dateFilter.gte = new Date(timeframe.from);
      if (timeframe?.to) dateFilter.lte = new Date(timeframe.to);
      const createdAtQuery = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

      const artifacts = await this.prisma.knowledgeArtifact.findMany({
        where: {
          id: { in: artifactIds },
          organizationId: ctx.organizationId,
          ...(createdAtQuery ? { createdAt: createdAtQuery } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          title: true,
          content: true,
          type: true,
        },
        take: 15, // Limit payload
      });

      const contextStrings = artifacts.map(
        (a) => `[${a.type}] ${a.title || 'Untitled'}: ${a.content}`,
      );
      return contextStrings.join('\n\n---\n\n');
    } catch (e: any) {
      return `Error fetching graph context: ${e.message}`;
    } finally {
      await session.close();
    }
  }

  // ── LLM Report Generation ──────────────────────────────────────────────────

  private async generateInsightfulReport(
    ctx: SkillContext,
    reportTopic: string,
    targetUser: string | null | undefined,
    timeframe: any,
    tasks: any[],
    meetings: any[],
    graphContext: string,
  ): Promise<string> {
    const fromStr = timeframe?.from ?? 'Start of period';
    const toStr = timeframe?.to ?? 'End of period';
    const userScope = targetUser ? `for user: ${targetUser}` : 'for the team';

    const systemPrompt = `You are an expert AI reporting agent. Your job is to generate a comprehensive, highly insightful Markdown report based on raw data.
Instead of just listing tasks and meetings, DEDUCE insights. 
- Connect the dots between the Tickets, Meetings, and the Graph Context (Slack discussions, Pull Requests, Decisions).
- Why were tasks delayed or completed? (Look at the Graph Context for clues).
- What was the overarching focus of the meetings?
- How did the user perform? What did they achieve?
Output a beautifully structured Markdown document. Use headings, lists, and bold text for emphasis. Do not include raw JSON in your output.`;

    const userPrompt = `
Generate a report with the topic: "${reportTopic}" ${userScope}
Timeframe: ${fromStr} to ${toStr}

### Raw Tasks
${JSON.stringify(tasks, null, 2)}

### Raw Meetings
${JSON.stringify(meetings, null, 2)}

### Graph Context (Related discussions, PRs, decisions)
${graphContext}
`;

    const { data: result } = await this.aiGateway.generateText(userPrompt, {
      temperature: 0.3,
      organizationId: ctx.organizationId,
      feature: 'reporting',
      systemPrompt: systemPrompt,
    });

    return result;
  }
}
