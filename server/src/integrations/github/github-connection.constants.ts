export const GithubAppEnvKeys = {
  APP_ID: 'GITHUB_APP_ID',
  PRIVATE_KEY: 'GITHUB_APP_PRIVATE_KEY',
  WEBHOOK_SECRET: 'GITHUB_APP_WEBHOOK_SECRET',
  CLIENT_ID: 'GITHUB_APP_CLIENT_ID',
  CLIENT_SECRET: 'GITHUB_APP_CLIENT_SECRET',
} as const;

export const GithubApiUrls = {
  BASE: 'https://api.github.com',
  APP_INSTALL: 'https://github.com/apps', // + /{app-slug}/installations/new
} as const;

export const GithubWebhookHeaders = {
  EVENT_TYPE: 'x-github-event',
  SIGNATURE: 'x-hub-signature-256',
  DELIVERY_ID: 'x-github-delivery',
} as const;

export const GithubResourceType = 'repository';

/**
 * Provider/EyeType DB key casing workaround.
 * DB seed uses lowercase; Sprint 2 enums use UPPERCASE.
 * TODO: remove once Amir unifies casing.
 */
export const ProviderKeyDbMap = {
  GITHUB: 'github',
} as const;

export const EyeTypeKeyDbMap = {
  CODING: 'coding',
} as const;
