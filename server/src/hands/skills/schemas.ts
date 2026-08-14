/* eslint-disable prettier/prettier */
import { z } from 'zod';

export const SendMessageInputSchema = z.object({
  channelId: z
    .string()
    .describe('The ID of the channel or DM to send the message to.'),
  text: z.string().describe('The content of the message.'),
});

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const SendEmailInputSchema = z.object({
  to: z.email().describe('The recipient email address.'),
  subject: z.string().describe('The subject of the email.'),
  contentHtml: z
    .string()
    .describe(
      'The HTML body of the email. Will be wrapped in company branding.',
    ),
});

export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export const AnswerQuestionInputSchema = z.object({
  question: z
    .string()
    .describe(
      'The natural language question to answer from the knowledge graph.',
    ),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

export const SearchInputSchema = z.object({
  query: z
    .string()
    .describe('The search query to find relevant knowledge artifacts.'),
  artifactTypes: z
    .array(z.string())
    .optional()
    .nullable()
    .describe(
      'Optional filter: artifact types like "message", "meeting", "task", "pr".',
    ),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const SummarizeInputSchema = z.object({
  topic: z
    .string()
    .describe('The topic to summarize from the knowledge graph.'),
  scope: z
    .string()
    .optional()
    .nullable()
    .describe('Optional scope constraint, e.g., a project name or team.'),
});
export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;


// Zoom Meeting Schemas

function cleanEmail(raw: string): string {
  let cleaned = raw.trim();

  // Extract from markdown: [text](mailto:email@a.com) or [text](email@a.com)
  const markdownMatch = cleaned.match(/\[.*?\]\((?:mailto:)?(.*?)\)/i);
  if (markdownMatch && markdownMatch[1]) {
    cleaned = markdownMatch[1];
  }

  // Extract from Slack/HTML: <mailto:email@a.com|text> or <email@a.com>
  cleaned = cleaned.replace(/^</, '').replace(/>$/, '');
  cleaned = cleaned.replace(/^mailto:/i, '');
  
  if (cleaned.includes('|')) {
    cleaned = cleaned.split('|')[0];
    cleaned = cleaned.replace(/^mailto:/i, '');
  }

  return cleaned.trim();
}

export const CreateMeetingInputSchema = z
  .preprocess((input: any) => {
    if (input && typeof input === 'object') {
      const normalized = { ...input };

      // 1. duration / durationMinutes
      const rawDuration = input.durationMinutes ?? input.duration;
      normalized.durationMinutes = (rawDuration !== undefined && rawDuration !== null)
        ? (Number(rawDuration) || 30)
        : 30;

      // 2. startTime / time / date / dateTime
      let rawDate = input.startTime ?? input.start_time ?? input.time ?? input.dateTime;

      if (!rawDate && (input.date || input.time)) {
        const datePart = input.date || '';
        const timePart = input.time || '';
        rawDate = `${datePart} ${timePart}`.trim();
      }

      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          normalized.startTime = parsedDate.toISOString();
        } else {
          normalized.startTime = rawDate;
        }
      }

      // 3. attendees
      const rawValue = input.attendees ?? input.email ?? input.emails;
      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        let attendeesArray: string[] = [];
        if (typeof rawValue === 'string') {
          const trimmed = rawValue.trim();
          if (trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                attendeesArray = parsed.map((e) => cleanEmail(String(e)));
              }
            } catch {}
          }
          if (attendeesArray.length === 0) {
            attendeesArray = trimmed.split(',').map((e) => cleanEmail(e)).filter(Boolean);
          }
        } else if (Array.isArray(rawValue)) {
          attendeesArray = rawValue
            .flatMap((item) => (typeof item === 'string' ? item.split(',') : item))
            .map((e) => (typeof e === 'string' ? cleanEmail(e) : e))
            .filter(Boolean);
        }
        normalized.attendees = attendeesArray.length > 0 ? attendeesArray : undefined;
      }

      return normalized;
    }
    return input;
  }, z.object({
    topic: z.string().describe('The meeting topic or title.'),
    startTime: z
      .string()
      .describe('CRITICAL: MUST use key name "startTime". ISO 8601 string, e.g. "2026-08-08T14:00:00Z"'),
    durationMinutes: z
      .coerce
      .number()
      .describe('CRITICAL: MUST use key name "durationMinutes". Duration in minutes as a number.'),
    timezone: z.string().optional().describe('Timezone, e.g., "Africa/Cairo". Defaults to UTC.'),
    attendees: z
      .array(z.string().email({ message: 'Invalid email address' }))
      .optional()
      .describe('Optional list of attendee email addresses.'),
  }));
export const UpdateMeetingInputSchema = z.object({
  meetingId: z.string().describe('The Zoom meeting ID.'),
  fields: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, z.record(z.string(), z.any())).describe('Fields to update: topic, startTime, durationMinutes, etc.'),
});

export const CancelMeetingInputSchema = z.object({
  meetingId: z.string().describe('The Zoom meeting ID to cancel or delete.'),
});

export const InviteMeetingInputSchema = z
  .preprocess((input: any) => {
    if (input && typeof input === 'object') {
      const rawValue = input.attendees ?? input.email ?? input.emails;

      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        let attendeesArray: string[] = [];

        if (typeof rawValue === 'string') {
          const trimmed = rawValue.trim();
          if (trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) attendeesArray = parsed;
            } catch {
              // ignore JSON error and fallback to comma split
            }
          }
          if (attendeesArray.length === 0) {
            attendeesArray = trimmed.split(',').map((e) => e.trim()).filter(Boolean);
          }
        } else if (Array.isArray(rawValue)) {
          attendeesArray = rawValue
            .flatMap((item) => (typeof item === 'string' ? item.split(',') : item))
            .map((e) => (typeof e === 'string' ? e.trim() : e))
            .filter(Boolean);
        }

        return {
          ...input,
          attendees: attendeesArray,
        };
      }
    }
    return input;
  }, z.object({
    meetingId: z.string().describe('The Zoom meeting ID.'),
    attendees: z
      .array(z.string().email({ message: 'Invalid email address' }))
      .optional()
      .describe('List of attendee email addresses.'),
  }));

export const GetMeetingInputSchema = z.object({
  meetingId: z.string().describe('The Zoom meeting ID.'),
});

export const ListMeetingsInputSchema = z.object({
  type: z.enum(['scheduled', 'live', 'upcoming'])
    .optional()
    .default('scheduled')
    .describe("Type of meetings to fetch: scheduled, live, upcoming"),
  pageSize: z.coerce.number().optional().default(30).describe('Number of records to return.'),
  nextPageToken: z.string().optional().describe('Token for pagination.'),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
});
// --- Jira Task Schemas ---
export const JiraCreateTaskInputSchema = z.object({
  title: z.string().describe('The title/summary of the Jira issue.'),
  description: z.string().optional().describe('Detailed description of the task.'),
  assignee: z.string().optional().describe('Name of the person to assign. Will be resolved to a Jira account.'),
  priority: z.string().optional().describe('Priority level: Highest, High, Medium, Low, Lowest.'),
  dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
  labels: z.array(z.string()).optional().describe('Labels to apply to the issue.'),
  projectName: z.string().describe('The name or key of the Jira project, e.g., "AIAN" or "The AIAN project".'),
});
export type JiraCreateTaskInput = z.infer<typeof JiraCreateTaskInputSchema>;

export const JiraUpdateTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name, summary, or issue key of the task, e.g., "AIAN-123" or "Login screen".'),
  fields: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
  }).passthrough().describe('Fields to update, e.g., { summary: "New title" }.'),
});
export type JiraUpdateTaskInput = z.infer<typeof JiraUpdateTaskInputSchema>;

export const JiraAssignTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name, summary, or issue key of the task.'),
  assignee: z.string().describe('Name of the person to assign.'),
});
export type JiraAssignTaskInput = z.infer<typeof JiraAssignTaskInputSchema>;

export const JiraMoveTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name, summary, or issue key of the task.'),
  targetStatus: z.string().describe('The target status name, e.g., "In Progress", "Done".'),
});
export type JiraMoveTaskInput = z.infer<typeof JiraMoveTaskInputSchema>;

export const JiraCommentTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name, summary, or issue key of the task.'),
  text: z.string().describe('The comment text to add.'),
});
export type JiraCommentTaskInput = z.infer<typeof JiraCommentTaskInputSchema>;

export const JiraDeleteTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name, summary, or issue key of the task to delete.'),
});
export type JiraDeleteTaskInput = z.infer<typeof JiraDeleteTaskInputSchema>;

export const JiraListTasksInputSchema = z.object({
  projectName: z.string().optional().describe('Filter by project name or key.'),
  assignee: z.string().optional().describe('Filter by assignee name.'),
  status: z.string().optional().describe('Filter by status name.'),
  maxResults: z.number().optional().default(50).describe('Max number of tasks to return.'),
});
export type JiraListTasksInput = z.infer<typeof JiraListTasksInputSchema>;

export const JiraGetTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name, summary, or issue key of the task.'),
});
export type JiraGetTaskInput = z.infer<typeof JiraGetTaskInputSchema>;

// --- Trello Task Schemas ---
export const TrelloCreateTaskInputSchema = z.object({
  title: z.string().describe('The title/summary of the Trello card.'),
  description: z.string().optional().describe('Detailed description of the task.'),
  assignee: z.string().optional().describe('Name of the person to assign. Will be resolved to a Trello member.'),
  priority: z.string().optional().describe('Priority/Label to apply (e.g. High, Medium).'),
  dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
  labels: z.array(z.string()).optional().describe('Labels to apply to the card.'),
  boardName: z.string().describe('The name of the Trello board.'),
  listName: z.string().describe('The name of the Trello list.'),
});
export type TrelloCreateTaskInput = z.infer<typeof TrelloCreateTaskInputSchema>;

export const TrelloUpdateTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name or ID of the Trello card.'),
  fields: z.object({
    name: z.string().optional(),
    desc: z.string().optional(),
  }).passthrough().describe('Fields to update, e.g., { name: "New title" }.'),
});
export type TrelloUpdateTaskInput = z.infer<typeof TrelloUpdateTaskInputSchema>;

export const TrelloAssignTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name or ID of the Trello card.'),
  assignee: z.string().describe('Name of the person to assign.'),
});
export type TrelloAssignTaskInput = z.infer<typeof TrelloAssignTaskInputSchema>;

export const TrelloMoveTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name or ID of the Trello card.'),
  targetStatus: z.string().describe('The target list name or ID to move the card to.'),
});
export type TrelloMoveTaskInput = z.infer<typeof TrelloMoveTaskInputSchema>;

export const TrelloCommentTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name or ID of the Trello card.'),
  text: z.string().describe('The comment text to add.'),
});
export type TrelloCommentTaskInput = z.infer<typeof TrelloCommentTaskInputSchema>;

export const TrelloDeleteTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name or ID of the Trello card to delete/archive.'),
});
export type TrelloDeleteTaskInput = z.infer<typeof TrelloDeleteTaskInputSchema>;

export const TrelloListTasksInputSchema = z.object({
  boardName: z.string().optional().describe('Filter by board name.'),
  listName: z.string().optional().describe('Filter by list name.'),
  assignee: z.string().optional().describe('Filter by assignee name.'),
  maxResults: z.number().optional().default(50).describe('Max number of cards to return.'),
});
export type TrelloListTasksInput = z.infer<typeof TrelloListTasksInputSchema>;

export const TrelloGetTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The name or ID of the Trello card.'),
});
export type TrelloGetTaskInput = z.infer<typeof TrelloGetTaskInputSchema>;

export const GenerateReportInputSchema = z.object({
  reportType: z
    .enum(['daily', 'weekly', 'performance', 'planning'])
    .optional()
    .nullable()
    .describe(
      'Type of report: "daily" for today status, "weekly" for sprint summary, "performance" for individual activity, "planning" for today roadmap. Defaults to "daily".',
    ),
  scope: z
    .string()
    .describe(
      'What the report is about, e.g., "Project AIAN", "Sprint 5", "Backend team".',
    ),
  targetUser: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Target user name or email for performance report (e.g. "Amir", "Hager", "donia"). Required if reportType is "performance".',
    ),
  timeframe: z
    .object({
      from: z.string().optional().nullable().describe('Start date in ISO 8601 format.'),
      to: z.string().optional().nullable().describe('End date in ISO 8601 format.'),
    })
    .optional()
    .nullable()
    .describe('Optional time period constraint for the report.'),
  sections: z
    .array(z.enum(['tasks', 'meetings', 'knowledge']))
    .optional()
    .nullable()
    .describe('Which sections to include. Defaults to all.'),
});

export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;