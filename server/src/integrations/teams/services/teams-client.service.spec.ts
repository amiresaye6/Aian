import { Test, TestingModule } from '@nestjs/testing';
import { TeamsClientService } from './teams-client.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../../common/encryption.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EyeType } from '../../contracts';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TeamsClientService Subscription Lifecycle', () => {
  let service: TeamsClientService;
  let moduleRef: TestingModule;
  
  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        TeamsClientService,
        {
          provide: PrismaService,
          useValue: {
            provider: { findUnique: jest.fn().mockResolvedValue({ id: 'teams_prov_1' }) },
            providerConnection: {
              findFirst: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([])
            },
            organizationEye: {
              updateMany: jest.fn()
            }
          }
        },
        { 
          provide: ProviderConnectionRepository, 
          useValue: {
            updateConnectionMetadata: jest.fn(),
            update: jest.fn(),
            findByIdMapped: jest.fn()
          } 
        },
        { provide: EncryptionService, useValue: { decrypt: jest.fn().mockReturnValue('decrypted_token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockImplementation((key) => {
            if (key === 'TEAMS_API_URL') return 'https://test.api';
            return undefined;
        })} }
      ],
    }).compile();

    service = moduleRef.get<TeamsClientService>(TeamsClientService);
    
    // Mock getValidToken which is a private/internal method that makes HTTP calls in the real implementation
    jest.spyOn(service as any, 'getValidToken').mockResolvedValue('fake_token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onResourcesSelected', () => {
    it('creates subscriptions for channel (CHAT) and gracefully handles 403', async () => {
      mockedAxios.post.mockRejectedValueOnce({ response: { status: 403 } }); // Graph denies delegated sub
      
      const connection = {
        id: 'conn_1',
        eyeType: EyeType.CHAT,
        connectionMetadata: {},
        accessTokenEncrypted: 'enc'
      } as any;
      
      await service.onResourcesSelected(connection, [
        { resourceType: 'channel', externalResourceId: 'chan1', metadata: { teamId: 'team1' } }
      ]);
      
      expect(mockedAxios.post).toHaveBeenCalled();
      const call = mockedAxios.post.mock.calls[0];
      expect(call[0]).toContain('/subscriptions');
      expect((call[1] as any).resource).toContain('/teams/team1/channels/chan1/messages');
    });

    it('creates subscriptions for team (MEETING) and saves metadata on success', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'sub123', expirationDateTime: '2026-08-11T12:00:00Z' } });
      const mockUpdate = moduleRef.get(ProviderConnectionRepository).updateConnectionMetadata;
      
      const connection = {
        id: 'conn_1',
        eyeType: EyeType.MEETING,
        connectionMetadata: {},
        accessTokenEncrypted: 'enc'
      } as any;
      
      await service.onResourcesSelected(connection, [
        { resourceType: 'team', externalResourceId: 'group1' }
      ]);
      
      expect(mockedAxios.post).toHaveBeenCalled();
      const call = mockedAxios.post.mock.calls[0];
      expect((call[1] as any).resource).toContain('/groups/group1/events');
      
      expect(mockUpdate).toHaveBeenCalledWith('conn_1', expect.objectContaining({
        subscriptions: expect.arrayContaining([
          expect.objectContaining({ subscriptionId: 'sub123' })
        ])
      }));
    });
  });

  describe('revokeCredentials', () => {
    it('deletes active Graph subscriptions before token removal', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ status: 204 });
      
      const connection = {
        id: 'conn_1',
        connectionMetadata: {
          subscriptions: [
            { subscriptionId: 'sub1' }
          ]
        }
      } as any;
      
      await service.revokeCredentials(connection);
      
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions/sub1'),
        expect.any(Object)
      );
    });
  });
});
