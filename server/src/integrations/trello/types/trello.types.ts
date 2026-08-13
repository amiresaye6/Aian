export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  shortUrl: string;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idBoard: string;
  idList: string;
  pos: number;
  due: string | null;
  dueComplete: boolean;
  url: string;
  shortUrl: string;
  idMembers: string[];
  labels: TrelloLabel[];
}

export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  initials: string;
  avatarUrl: string | null;
}

export interface TrelloWebhook {
  id: string;
  description: string;
  idModel: string;
  callbackURL: string;
  active: boolean;
}

export interface TrelloTokenResponse {
  token: string;
  tokenSecret?: string;
}
