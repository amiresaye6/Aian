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
  scope: z
    .string()
    .describe('The primary subject of the report (e.g. user name, project name, or general topic).'),
  timeframe: z
    .string()
    .describe('Human readable timeframe, e.g., "last 3 days", "this month".')
    .optional(),
});

export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;
