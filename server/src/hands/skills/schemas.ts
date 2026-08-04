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

export const CreateTaskInputSchema = z.object({
  title: z.string().describe('The title/summary of the Jira issue.'),
  description: z.string().optional().describe('Detailed description of the task.'),
  assignee: z.string().optional().describe('Name of the person to assign. Will be resolved to a Jira account.'),
  priority: z.string().optional().describe('Priority level: Highest, High, Medium, Low, Lowest.'),
  dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
  labels: z.array(z.string()).optional().describe('Labels to apply to the issue.'),
  projectKey: z.string().describe('The Jira project key, e.g., "AIAN" or "DEV".'),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  taskId: z.string().describe('The Jira issue key, e.g., "AIAN-123".'),
  fields: z.record(z.string(), z.any()).describe('Fields to update, e.g., { summary: "New title" }.'),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const AssignTaskInputSchema = z.object({
  taskId: z.string().describe('The Jira issue key.'),
  assignee: z.string().describe('Name of the person to assign.'),
});
export type AssignTaskInput = z.infer<typeof AssignTaskInputSchema>;

export const MoveTaskInputSchema = z.object({
  taskId: z.string().describe('The Jira issue key.'),
  targetStatus: z.string().describe('The target status name, e.g., "In Progress", "Done".'),
});
export type MoveTaskInput = z.infer<typeof MoveTaskInputSchema>;

export const CommentTaskInputSchema = z.object({
  taskId: z.string().describe('The Jira issue key.'),
  text: z.string().describe('The comment text to add.'),
});
export type CommentTaskInput = z.infer<typeof CommentTaskInputSchema>;

export const DeleteTaskInputSchema = z.object({
  taskId: z.string().describe('The Jira issue key to delete.'),
});
export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>;

export const ListTasksInputSchema = z.object({
  projectKey: z.string().optional().describe('Filter by project key.'),
  assignee: z.string().optional().describe('Filter by assignee name.'),
  status: z.string().optional().describe('Filter by status name.'),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional().describe('Filter by date range.'),
});
export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;

export const GetTaskInputSchema = z.object({
  taskId: z.string().describe('The Jira issue key.'),
});
export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;
export const GenerateReportInputSchema = z.object({
  scope: z
    .string()
    .describe('What the report is about, e.g., "Project AIAN", "Sprint 5", "Backend team".'),
  timeframe: z.object({
    from: z.string().describe('Start date in ISO 8601 format.'),
    to: z.string().describe('End date in ISO 8601 format.'),
  }).optional().nullable().describe('The time period for the report.'),
  sections: z
    .array(z.enum(['tasks', 'meetings', 'knowledge']))
    .optional()
    .nullable()
    .describe('Which sections to include. Defaults to all.'),
});

export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;
