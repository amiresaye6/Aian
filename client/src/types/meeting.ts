export interface MeetingAttendee {
  email: string;
  name?: string;
}

export interface CreateMeetingPayload {
  topic: string;
  startTime: string;
  durationMinutes: number;
  timezone: string;
  attendees?: MeetingAttendee[];
}

export interface UpdateMeetingPayload {
  topic?: string;
  startTime?: string;
  durationMinutes?: number;
  timezone?: string;
}