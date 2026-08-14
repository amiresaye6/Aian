import { Test, TestingModule } from '@nestjs/testing';
import { JiraClientService, JiraIntegrationError } from './jira-client.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../../common/encryption.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JiraClientService Task Workflows', () => {
  let service: JiraClientService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraClientService,
        {
          provide: PrismaService,
          useValue: {
            provider: { findUnique: jest.fn().mockResolvedValue({ id: 'jira_prov_1' }) },
            providerConnection: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'conn_1',
                organizationEyeId: 'eye_1',
                accessTokenEncrypted: 'enc',
                externalAccountId: 'test-cloud-id',
                connectionMetadata: { baseUrl: 'https://test.atlassian.net' },
                organizationEye: { organizationId: 'org_1', eyeType: { key: 'tasks' } },
                provider: { key: 'jira' }
              })
            }
          }
        },
        { provide: ProviderConnectionRepository, useValue: {} },
        { provide: EncryptionService, useValue: { decrypt: jest.fn().mockReturnValue('decrypted_token') } },
        { provide: ConfigService, useValue: {} }
      ],
    }).compile();

    service = module.get<JiraClientService>(JiraClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveAssignee', () => {
    it('throws ASSIGNEE_NOT_FOUND if 0 matches', async () => {
      mockedAxios.request.mockResolvedValue({ data: [] }); // Use mockResolvedValue for multiple calls
      await expect((service as any).resolveAssignee('org_1', 'Ghost')).rejects.toThrow(JiraIntegrationError);
      await expect((service as any).resolveAssignee('org_1', 'Ghost')).rejects.toMatchObject({ code: 'ASSIGNEE_NOT_FOUND' });
    });

    it('throws MULTIPLE_ASSIGNEES if >1 matches', async () => {
      mockedAxios.request.mockResolvedValueOnce({ data: [{ accountId: '1', displayName: 'John A' }, { accountId: '2', displayName: 'John B' }] });
      await expect((service as any).resolveAssignee('org_1', 'John')).rejects.toMatchObject({ code: 'MULTIPLE_ASSIGNEES' });
    });

    it('returns accountId on exact match', async () => {
      mockedAxios.request.mockResolvedValueOnce({ data: [{ accountId: '123', displayName: 'John A' }] });
      const id = await (service as any).resolveAssignee('org_1', 'John');
      expect(id).toBe('123');
    });
  });

  describe('resolveTransition', () => {
    it('throws INVALID_TRANSITION if not found', async () => {
      mockedAxios.request.mockResolvedValueOnce({ data: { transitions: [{ id: '1', name: 'Done' }] } });
      await expect((service as any).resolveTransition('org_1', 'T-1', 'Review')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    });

    it('returns transition id with case-insensitive trim match', async () => {
      mockedAxios.request.mockResolvedValueOnce({ data: { transitions: [{ id: '1', name: ' In Progress ' }] } });
      const id = await (service as any).resolveTransition('org_1', 'T-1', 'in progress');
      expect(id).toBe('1');
    });
  });

  describe('createTask', () => {
    it('creates an issue with mapped fields', async () => {
      mockedAxios.request.mockResolvedValueOnce({ data: { id: '1000', key: 'T-1', self: 'self' } }); // issue creation
      const result = await service.createTask('org_1', {
        title: 'New Task',
        description: 'Desc',
        projectName: 'PROJ',
        priority: 'High',
        labels: ['bug'],
      });
      expect(result.key).toBe('T-1');
      expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    });

    it('resolves assignee if provided', async () => {
      mockedAxios.request
        .mockResolvedValueOnce({ data: [{ accountId: 'john123', displayName: 'John' }] }) // assignee search
        .mockResolvedValueOnce({ data: { id: '1000', key: 'T-2', self: 'self' } }); // issue creation
      
      await service.createTask('org_1', {
        title: 'Task 2',
        projectName: 'PROJ',
        assignee: 'John',
      });
      expect(mockedAxios.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('listTasks JQL Builder', () => {
    it('builds JQL accurately', async () => {
      mockedAxios.request
        .mockResolvedValueOnce({ data: [{ accountId: 'john123', displayName: 'John' }] }) // search users
        .mockResolvedValueOnce({ data: { issues: [], total: 0 } }); // search issues

      await service.listTasks('org_1', {
        projectName: 'DEV',
        status: 'Done',
        assignee: 'John',
        maxResults: 50,
      });

      const reqConfig = mockedAxios.request.mock.calls[1][0];
      expect((reqConfig.data as any).jql).toBe('project = "DEV" AND status = "Done" AND assignee = "john123"');
    });

    it('bypasses user resolution for currentUser()', async () => {
      mockedAxios.request.mockResolvedValueOnce({ data: { issues: [], total: 0 } });

      await service.listTasks('org_1', { assignee: 'currentUser()', maxResults: 50 });

      const reqConfig = mockedAxios.request.mock.calls[0][0];
      expect((reqConfig.data as any).jql).toBe('assignee = currentUser()');
    });
  });
});
