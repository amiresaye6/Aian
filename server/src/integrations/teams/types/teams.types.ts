export class TeamsIntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'TeamsIntegrationError';
  }
}

export interface MicrosoftGraphTeam {
  id: string;
  displayName: string;
  description?: string;
}

export interface MicrosoftGraphChannel {
  id: string;
  displayName: string;
  description?: string;
  membershipType?: string; 
}

export interface MicrosoftGraphIdentity {
  id: string;
  displayName: string;
  userIdentityType?: string;
}

export interface MicrosoftGraphEmailAddress {
  name: string;
  address: string;
}

export interface MicrosoftGraphEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  organizer?: {
    emailAddress: MicrosoftGraphEmailAddress;
  };
  attendees?: Array<{
    type: string;
    emailAddress: MicrosoftGraphEmailAddress;
  }>;
  isOnlineMeeting: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: {
    joinUrl: string;
  };
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  webLink?: string;
  type: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  teamIdentity?: {
    teamId: string;
  };
}

export interface MicrosoftGraphChatMessage {
  id: string;
  replyToId?: string;
  createdDateTime: string;
  lastModifiedDateTime?: string;
  deletedDateTime?: string;
  messageType: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  from?: {
    user?: MicrosoftGraphIdentity;
    application?: MicrosoftGraphIdentity;
  };
  chatId?: string;
  channelIdentity?: {
    teamId: string;
    channelId: string;
  };
  webUrl?: string;
}
