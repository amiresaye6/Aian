import { Test, TestingModule } from '@nestjs/testing';
import { MeetingBaasService } from './meeting-baas.service';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MeetingBaasService', () => {
  let service: MeetingBaasService;

  const mockPrisma = {
    providerConnection: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConnection: any = {
    id: 'connection-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    process.env.MEET_BAAS_API_KEY = 'fake-api-key';
    process.env.MEETING_BAAS_REDIRECT_URI = 'https://example.com/webhook';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingBaasService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get(MeetingBaasService);

    // لأن القيم بتتقري أثناء إنشاء الـ service
    (service as any).apiKey = process.env.MEET_BAAS_API_KEY;
    (service as any).webhookSecret =
      process.env.MEETING_BAAS_REDIRECT_URI;
  });

  describe('verifyConnection', () => {
    it('should verify successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {},
      });

      const result = await service.verifyConnection(mockConnection);

      expect(result.isValid).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should return invalid if api fails', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            message: 'Unauthorized',
          },
        },
      });

      const result = await service.verifyConnection(mockConnection);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Unauthorized');
    });
  });

  describe('getResources', () => {
    it('should return mapped bots', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [
            {
              bot_id: 'bot-1',
              bot_name: 'Assistant',
              status: 'running',
              meeting_url: 'meeting-url',
              created_at: 'today',
            },
          ],
        },
      });

      const resources = await service.getResources();

      expect(resources).toEqual([
        {
          externalResourceId: 'bot-1',
          name: 'Assistant',
          resourceType: 'bot',
          metadata: {
            status: 'running',
            meeting_url: 'meeting-url',
            created_at: 'today',
          },
        },
      ]);
    });

    it('should throw on api failure', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            message: 'Bad Request',
          },
        },
      });

      await expect(service.getResources()).rejects.toThrow(
        'Failed to fetch Meeting Baas resources: Bad Request',
      );
    });
  });

  describe('createBot', () => {
    beforeEach(() => {
      mockPrisma.providerConnection.findUnique.mockResolvedValue({
        connectionMetadata: {
          foo: 'bar',
        },
      });

      mockPrisma.providerConnection.update.mockResolvedValue({});
    });

    it('should create bot successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          data: {
            bot_id: 'bot-123',
          },
        },
      });

      const result = await service.createBot(
        mockConnection,
        'meeting-url',
        'AI Bot',
      );

      expect(result.data.bot_id).toBe('bot-123');

      expect(mockPrisma.providerConnection.update).toHaveBeenCalledWith({
        where: {
          id: mockConnection.id,
        },
        data: {
          connectionMetadata: {
            foo: 'bar',
            bot_id: 'bot-123',
          },
        },
      });
    });

    it('should throw when MeetingBaas api fails', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            message: 'Invalid meeting',
          },
        },
      });

      await expect(
        service.createBot(mockConnection, 'meeting', 'bot'),
      ).rejects.toThrow(
        'Meeting Baas bot creation failed: Invalid meeting',
      );
    });
  });
});