/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import { GenerateReportInputSchema, GenerateReportInput } from './schemas';
import { RetrievalPipelineService } from '../../retrieval/retrieval-pipeline.service';
import { AnswerGenerationService } from '../../retrieval/services/answer-generation.service';
import { JiraClientService } from '../../integrations/jira/services/jira-client.service';
import { ZoomClientService, MeetingType } from '../../integrations/zoom/zoom-client.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportingSkill implements OnModuleInit {
  constructor(
    private readonly retrievalPipeline: RetrievalPipelineService,
    private readonly answerGeneration: AnswerGenerationService,
    private readonly jiraClient: JiraClientService,
    private readonly zoomClient: ZoomClientService,
    private readonly prisma: PrismaService,
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'ReportingSkill.generateReport',
      description: 'Generates a structured markdown report including tasks, meetings, and knowledge context for a given scope and timeframe.',
      schema: GenerateReportInputSchema,
      destructive: false,
      handler: (ctx: SkillContext, input: any) => this.generateReport(ctx, input),
    });
  }

  async generateReport(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
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
        const { scope, timeframe, sections } = parsed.data;
        const activeSections = sections || ['tasks', 'meetings', 'knowledge'];

        let tasksMarkdown = '## 📋 Tasks\n*No tasks found or integration inactive.*';
        let meetingsMarkdown = '## 📅 Meetings\n*No meetings found or integration inactive.*';
        let knowledgeMarkdown = '## 🧠 Knowledge Context\n*No context found.*';
        let sourcesList: string[] = [];

        // 1. Fetch Tasks (Jira)
        if (activeSections.includes('tasks')) {
          try {
            const jiraConnection = await this.prisma.providerConnection.findFirst({
              where: { organizationEyeId: ctx.organizationId, provider: { key: 'jira' }, status: 'connected' },
            });
            if (jiraConnection) {
              const issues = (await this.jiraClient.getResources(jiraConnection as any)) || [];

              tasksMarkdown = `## 📋 Tasks\n| Key | Summary | Status | Assignee |\n|---|---|---|---|\n` +
                (issues.length > 0
                  ? issues.map((i: any) => `| ${i.key || 'N/A'} | ${i.summary || 'N/A'} | ${i.status || 'N/A'} | ${i.assignee || 'N/A'} |`).join('\n')
                  : `| No issues found | N/A | N/A | N/A |`);
              
              sourcesList.push(`Jira Connection: ${jiraConnection.id}`);
            }
          } catch (err: any) {
            tasksMarkdown = `## 📋 Tasks\n*Error fetching tasks: ${err.message}*`;
          }
        }

        // 2. Fetch Meetings (Zoom)
        if (activeSections.includes('meetings')) {
          try {
            const zoomConnection = await this.prisma.providerConnection.findFirst({
              where: { organizationEyeId: ctx.organizationId, provider: { key: 'zoom' }, status: 'connected' },
            });
            if (zoomConnection) {
              const meetingsResult = await this.zoomClient.getMeetings(zoomConnection as any, MeetingType.Scheduled);
              const meetings = meetingsResult.resources || [];

              meetingsMarkdown = `## 📅 Meetings\n| Topic | Date | Duration | Attendees |\n|---|---|---|---|\n` +
                (meetings.length > 0 
                  ? meetings.map((m: any) => `| ${m.name || 'N/A'} | ${m.metadata?.start_time || 'N/A'} | ${m.metadata?.duration || 'N/A'}m | N/A |`).join('\n')
                  : `| No scheduled meetings | N/A | N/A | N/A |`);
              
              sourcesList.push(`Zoom Connection: ${zoomConnection.id}`);
            }
          } catch (err: any) {
            meetingsMarkdown = `## 📅 Meetings\n*Error fetching meetings: ${err.message}*`;
          }
        }

        // 3. Fetch Knowledge Context & Real Evidence Chain Sources
        if (activeSections.includes('knowledge')) {
          try {
            const retrievalResult = await this.retrievalPipeline.retrieveContext(ctx.organizationId, scope);
            const contextString = retrievalResult?.contextString || '';
            
            const summaryAnswer = await this.answerGeneration.generateAnswer(
              `Provide a concise summary regarding: ${scope}`,
              contextString,
              {} as any
            );
            knowledgeMarkdown = `## 🧠 Knowledge Context\n${summaryAnswer}`;

            // Extract real artifact IDs/names from evidence chains
            if (retrievalResult?.evidenceChains && Array.isArray(retrievalResult.evidenceChains)) {
              retrievalResult.evidenceChains.forEach((node: any) => {
                if (node?.artifactId || node?.name) {
                  sourcesList.push(`Artifact: ${node.name || node.artifactId}`);
                }
              });
            }
          } catch (err: any) {
            knowledgeMarkdown = `## 🧠 Knowledge Context\n*Error fetching knowledge graph context: ${err.message}*`;
          }
        }

        // Assemble the final Markdown Report
        const sourcesFormatted = sourcesList.length > 0 ? sourcesList.join(', ') : 'None';
        const timeframeText = timeframe ? `*Period: ${timeframe.from} — ${timeframe.to}*` : '*Period: All Time*';
        let fullReport = `# Report: ${scope}\n${timeframeText}

${tasksMarkdown}

${meetingsMarkdown}

${knowledgeMarkdown}

---
*Sources: [${sourcesFormatted}]*
`;

        // Apply Slack ~4000 characters limit safety chunking
        if (fullReport.length > 3900) {
          fullReport = fullReport.substring(0, 3900) + '\n\n*(Report truncated due to Slack length limits)*';
        }

        return { reportMarkdown: fullReport };
      },
    );
  }
}