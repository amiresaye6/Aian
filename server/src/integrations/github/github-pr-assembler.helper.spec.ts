import { GithubPrAssemblerHelper } from './github-pr-assembler.helper';
import { KnowledgeItem, ArtifactType } from '@prisma/client';

describe('GithubPrAssemblerHelper', () => {
  let helper: GithubPrAssemblerHelper;

  beforeEach(() => {
    helper = new GithubPrAssemblerHelper();
  });

  it('should return empty array when items array is empty', () => {
    const result = helper.assemblePrItems([]);
    expect(result).toEqual([]);
  });

  it('should group PR opened, commits, and review comments into a single implementation_story artifact', () => {
    const now = new Date('2026-07-21T18:00:00Z');
    const items: Partial<KnowledgeItem>[] = [
      {
        id: '1',
        organizationId: 'org-123',
        sourceType: 'github_pull_request',
        eventType: 'pr_opened',
        externalResourceId: 'repo:100',
        externalEventId: 'pr:1:opened',
        parentExternalResourceId: null,
        title: 'Zoom Integration',
        content: 'This PR introduces Zoom integration.',
        author: { externalId: 'user-1', name: 'Azzazy6269' } as any,
        participants: [{ externalId: 'user-1', name: 'Azzazy6269' }] as any,
        contextLocation: 'owner/repo #1',
        occurredAt: now,
        metadata: { repositoryId: 100, prNumber: 1, state: 'open', merged: false },
      },
      {
        id: '2',
        organizationId: 'org-123',
        sourceType: 'github_commit',
        eventType: 'commit_pushed',
        externalResourceId: 'repo:100',
        externalEventId: 'commit:abc1234',
        parentExternalResourceId: 'pr:1',
        title: null,
        content: 'feat(zoom): add zoom validator',
        author: { name: 'Azzazy6269', email: 'azzazy@example.com' } as any,
        participants: [],
        contextLocation: 'owner/repo #1',
        occurredAt: new Date(now.getTime() + 1000),
        metadata: { repositoryId: 100, prNumber: 1, sha: 'abc1234' },
      },
      {
        id: '3',
        organizationId: 'org-123',
        sourceType: 'github_pull_request_review',
        eventType: 'pr_review_submitted',
        externalResourceId: 'repo:100',
        externalEventId: 'pr_review:500',
        parentExternalResourceId: 'pr:1',
        title: null,
        content: 'Well done, Azzazy.',
        author: { externalId: 'user-2', name: 'amiresaye6' } as any,
        participants: [],
        contextLocation: 'owner/repo #1',
        occurredAt: new Date(now.getTime() + 2000),
        metadata: { repositoryId: 100, prNumber: 1, reviewState: 'APPROVED' },
      },
    ];

    const result = helper.assemblePrItems(items as KnowledgeItem[]);

    expect(result).toHaveLength(1);
    const artifact = result[0];

    expect(artifact.type).toBe(ArtifactType.implementation_story);
    expect(artifact.provider).toBe('github');
    expect(artifact.title).toContain('PR #1');
    expect(artifact.title).toContain('Zoom Integration');
    expect(artifact.content).toContain('=== PULL REQUEST DETAILS ===');
    expect(artifact.content).toContain('=== COMMITS (1) ===');
    expect(artifact.content).toContain('=== REVIEWS & COMMENTS (1) ===');
    expect(artifact.content).toContain('feat(zoom): add zoom validator');
    expect(artifact.content).toContain('Well done, Azzazy.');
    expect(artifact.metadata).toMatchObject({
      prNumber: 1,
      itemCount: 3,
    });
  });

  it('should group standalone commits without a PR into a single commit activity artifact', () => {
    const now = new Date('2026-07-21T18:00:00Z');
    const items: Partial<KnowledgeItem>[] = [
      {
        id: '10',
        organizationId: 'org-123',
        sourceType: 'github_commit',
        eventType: 'commit_pushed',
        externalResourceId: 'repo:200',
        externalEventId: 'commit:def5678',
        parentExternalResourceId: null,
        title: null,
        content: 'chore: update README',
        author: { name: 'amiresaye6' } as any,
        participants: [],
        contextLocation: 'owner/repo',
        occurredAt: now,
        metadata: { repositoryId: 200, sha: 'def5678' },
      },
    ];

    const result = helper.assemblePrItems(items as KnowledgeItem[]);

    expect(result).toHaveLength(1);
    const artifact = result[0];

    expect(artifact.title).toContain('Commit Activity for owner/repo');
    expect(artifact.content).toContain('=== STANDALONE COMMITS (1) ===');
    expect(artifact.content).toContain('chore: update README');
  });
});