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
