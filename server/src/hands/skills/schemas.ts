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