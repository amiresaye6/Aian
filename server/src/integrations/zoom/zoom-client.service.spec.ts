import { Test, TestingModule } from '@nestjs/testing';
import { ZoomClientService } from './zoom-client.service';
import { EncryptionService } from '../../common/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ZoomClientService', () => {
  let service: ZoomClientService;

  const mockEncryptionService = {
    decrypt: jest.fn(),
    encrypt: jest.fn(),
  };

  const mockPrismaService = {
    providerConnection: {
      update: jest.fn(),
    },
  };

  const mockConnection: any = {
    id: 'conn-1',
    accessTokenEncrypted: 'encrypted-access',
    refreshTokenEncrypted: 'encrypted-refresh',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZoomClientService,
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ZoomClientService>(ZoomClientService);
  });

  describe('verifyConnection', () => {
    it('should verify successfully', async () => {
      mockEncryptionService.decrypt.mockReturnValue('token');

      mockedAxios.get.mockResolvedValue({
        data: {
          first_name: 'Mohamed',
          last_name: 'Elazzazy',
          email: 'test@test.com',
        },
      });

      const result = await service.verifyConnection(mockConnection);

      expect(result.isValid).toBe(true);
      expect(result.message).toContain('Connected as');
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should return invalid if zoom returns error', async () => {
      mockEncryptionService.decrypt.mockReturnValue('token');

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
    it('should return mapped meetings', async () => {
      mockEncryptionService.decrypt.mockReturnValue('token');

      mockedAxios.get.mockResolvedValue({
        data: {
          meetings: [
            {
              id: 123,
              topic: 'Demo Meeting',
              start_time: 'today',
              duration: 30,
              timezone: 'UTC',
              join_url: 'join-url',
            },
          ],
        },
      });

      const result = await service.getResources(mockConnection);

      expect(result).toEqual([
        {
          externalResourceId: '123',
          name: 'Demo Meeting',
          resourceType: 'meeting',
          metadata: {
            start_time: 'today',
            duration: 30,
            timezone: 'UTC',
            join_url: 'join-url',
          },
        },
      ]);
    });

    it('should throw on api error', async () => {
      mockEncryptionService.decrypt.mockReturnValue('token');

      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            message: 'Bad Request',
          },
        },
      });

      await expect(service.getResources(mockConnection)).rejects.toThrow(
        'Failed to fetch Zoom resources: Bad Request',
      );
    });
  });

  describe('refreshAccessToken', () => {
    beforeEach(() => {
      process.env.ZOOM_CLIENT_ID = 'client';
      process.env.ZOOM_CLIENT_SECRET = 'secret';
    });

    it('should refresh token successfully', async () => {
      mockEncryptionService.decrypt.mockReturnValue('refresh-token');

      mockEncryptionService.encrypt
        .mockReturnValueOnce('encrypted-new-access')
        .mockReturnValueOnce('encrypted-new-refresh');

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
        },
      });

      mockPrismaService.providerConnection.update.mockResolvedValue({});

      const token = await service.refreshAccessToken(mockConnection);

      expect(token).toBe('new-access');
      expect(mockPrismaService.providerConnection.update).toHaveBeenCalled();
    });

    it('should throw if refresh token missing', async () => {
      await expect(
        service.refreshAccessToken({
          ...mockConnection,
          refreshTokenEncrypted: null,
        }),
      ).rejects.toThrow('Refresh token is missing');
    });
  });

  describe('getMeetingDetails', () => {
    it('should return meeting details', async () => {
      mockEncryptionService.decrypt.mockReturnValue('token');

      mockedAxios.get.mockResolvedValue({
        data: {
          id: '123',
          topic: 'Meeting',
        },
      });

      const result = await service.getMeetingDetails(mockConnection, '123');

      expect(result.id).toBe('123');
      expect(result.topic).toBe('Meeting');
    });

    it('should refresh token on 401', async () => {
      mockEncryptionService.decrypt.mockReturnValue('old-token');

      jest
        .spyOn(service, 'refreshAccessToken')
        .mockResolvedValue('new-token');

      mockedAxios.get
        .mockRejectedValueOnce({
          response: {
            status: 401,
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: '123',
            topic: 'Meeting',
          },
        });

      const result = await service.getMeetingDetails(mockConnection, '123');

      expect(service.refreshAccessToken).toHaveBeenCalled();
      expect(result.id).toBe('123');
    });
  });

  describe('revokeCredentials', () => {
    beforeEach(() => {
      process.env.ZOOM_CLIENT_ID = 'client';
      process.env.ZOOM_CLIENT_SECRET = 'secret';
    });

    it('should revoke successfully', async () => {
      mockEncryptionService.decrypt.mockReturnValue('token');

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          status: 'success',
        },
      });

      await service.revokeCredentials(mockConnection);

      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should not throw when revoke fails', async () => {
      mockEncryptionService.decrypt.mockReturnValue('token');

      mockedAxios.post.mockRejectedValue(new Error('network'));

      await expect(
        service.revokeCredentials(mockConnection),
      ).resolves.not.toThrow();
    });
  });
});