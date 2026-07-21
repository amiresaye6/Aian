import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('providers')
export class ProvidersController {
  constructor(private configService: ConfigService) {}

  @Get('metadata')
  getProvidersMetadata() {
    return [
      {
        key: 'jira',
        name: 'Jira',
        category: 'Engineering',
        tagline: 'Sync issues, epics, and comments to provide context on ongoing engineering tasks.',
        brand: '#0052CC',
        resourceLabel: 'Projects',
        permissions: [
          { title: 'Read issues & comments', description: 'Read-only access to all issues, epics, and comments.' },
          { title: 'Read project metadata', description: 'Access to project names, keys, and configurations.' }
        ],
        scopes: (this.configService.get('JIRA_SCOPES') || 'read:jira-work read:jira-user').split(' '),
        defaultWorkspaceName: 'Jira Workspace',
      },
      {
        key: 'github',
        name: 'GitHub',
        category: 'Engineering',
        tagline: 'Ingest repositories, PRs, and commit history for deep codebase understanding.',
        brand: '#24292e',
        resourceLabel: 'Repositories',
        permissions: [
          { title: 'Read repository contents', description: 'Access to code, commits, and pull requests.' },
          { title: 'Read metadata', description: 'Access to repository configurations and webhooks.' }
        ],
        scopes: ['repo', 'read:user'],
        defaultWorkspaceName: 'GitHub Organization',
      },
      {
        key: 'slack',
        name: 'Slack',
        category: 'Communication',
        tagline: 'Index messages and threads to keep AIAN updated on team conversations.',
        brand: '#E01E5A',
        resourceLabel: 'Channels',
        permissions: [
          { title: 'Read messages', description: 'Access to messages and threads in public and private channels.' },
          { title: 'Read channel metadata', description: 'Access to channel lists and user directories.' }
        ],
        scopes: ['channels:history', 'groups:history', 'im:history', 'mpim:history'],
        defaultWorkspaceName: 'Slack Workspace',
      },
      {
        key: 'zoom',
        name: 'Zoom',
        category: 'Meetings',
        tagline: 'Transcribe and analyze meetings to capture verbal decisions and knowledge.',
        brand: '#2D8CFF',
        resourceLabel: 'Recordings',
        permissions: [
          { title: 'Read meeting recordings', description: 'Access to cloud recordings and transcripts.' },
          { title: 'Read meeting metadata', description: 'Access to meeting schedules and participant lists.' }
        ],
        scopes: ['recording:read', 'meeting:read'],
        defaultWorkspaceName: 'Zoom Account',
      }
    ];
  }
}
