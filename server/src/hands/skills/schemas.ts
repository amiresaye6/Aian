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
  cleaned = cleaned.replace(/^<mailto:/i, '').replace(/>$/, '');
  if (cleaned.includes('|')) {
    cleaned = cleaned.split('|')[0].trim();
  }
  return cleaned.trim();
}

export const CreateMeetingInputSchema = z
  .preprocess((input: any) => {
    if (input && typeof input === 'object') {
      const normalized = { ...input };

      // 1. duration / durationMinutes
      const rawDuration = input.durationMinutes ?? input.duration;
      if (rawDuration !== undefined && rawDuration !== null) {
        normalized.durationMinutes = Number(rawDuration) || 30;
      }

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
