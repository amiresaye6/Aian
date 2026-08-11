import { Test, TestingModule } from '@nestjs/testing';
import { TeamsWebhookValidator } from './teams-webhook.validator';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';
import { Request } from 'express';

describe('TeamsWebhookValidator', () => {
  let validator: TeamsWebhookValidator;
  let mockConnectionRepo: jest.Mocked<Partial<ProviderConnectionRepository>>;

  beforeEach(async () => {
    mockConnectionRepo = {
      findByIdMapped: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsWebhookValidator,
        {
          provide: ProviderConnectionRepository,
          useValue: mockConnectionRepo,
        },
      ],
    }).compile();

    validator = module.get<TeamsWebhookValidator>(TeamsWebhookValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('handles Graph validationToken handshake by sending direct 200 response', async () => {
      const req = {
        query: { validationToken: 'test-token-123' },
        res: {
          status: jest.fn().mockReturnThis(),
          type: jest.fn().mockReturnThis(),
          send: jest.fn(),
        },
      } as unknown as Request;

      const result = await validator.validate(req, Buffer.from(''), 'secret');
      
      expect(result).toBe(true);
      expect(req.res!.status).toHaveBeenCalledWith(200);
      expect(req.res!.type).toHaveBeenCalledWith('text/plain');
      expect(req.res!.send).toHaveBeenCalledWith('test-token-123');
    });

    it('rejects payload missing "value" array', async () => {
      const req = {} as Request;
      const rawBody = Buffer.from(JSON.stringify({ someData: '123' }));
      
      const result = await validator.validate(req, rawBody, 'secret');
      expect(result).toBe(false);
    });

    it('rejects if connection is not found or not active', async () => {
      const req = {
        params: { connectionId: 'conn-1' },
      } as unknown as Request;
      const rawBody = Buffer.from(JSON.stringify({ value: [{}] }));
      
      (mockConnectionRepo.findByIdMapped as jest.Mock).mockResolvedValue(null);

      const result = await validator.validate(req, rawBody, 'secret');
      expect(result).toBe(false);
    });

    it('validates a valid payload with correct clientState', async () => {
      const req = {
        params: { connectionId: 'conn-1' },
      } as unknown as Request;
      
      const payload = {
        value: [
          {
            subscriptionId: 'sub-1',
            clientState: 'valid-state',
          }
        ]
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      
      (mockConnectionRepo.findByIdMapped as jest.Mock).mockResolvedValue({
        id: 'conn-1',
        status: 'connected',
        connectionMetadata: {
          subscriptions: [
            { subscriptionId: 'sub-1', clientState: 'valid-state' }
          ]
        }
      } as any);

      const result = await validator.validate(req, rawBody, 'secret');
      expect(result).toBe(true);
    });

    it('rejects payload with invalid clientState', async () => {
      const req = {
        params: { connectionId: 'conn-1' },
      } as unknown as Request;
      
      const payload = {
        value: [
          {
            subscriptionId: 'sub-1',
            clientState: 'hacked-state',
          }
        ]
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      
      (mockConnectionRepo.findByIdMapped as jest.Mock).mockResolvedValue({
        id: 'conn-1',
        status: 'connected',
        connectionMetadata: {
          subscriptions: [
            { subscriptionId: 'sub-1', clientState: 'valid-state' }
          ]
        }
      } as any);

      const result = await validator.validate(req, rawBody, 'secret');
      expect(result).toBe(false);
    });

    it('rejects payload with valid clientState but wrong tenantId', async () => {
      const req = {
        params: { connectionId: 'conn-1' },
      } as unknown as Request;
      
      const payload = {
        value: [
          {
            subscriptionId: 'sub-1',
            clientState: 'valid-state',
            tenantId: 'hacker-tenant'
          }
        ]
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      
      (mockConnectionRepo.findByIdMapped as jest.Mock).mockResolvedValue({
        id: 'conn-1',
        status: 'connected',
        connectionMetadata: {
          tenantId: 'our-tenant',
          subscriptions: [
            { subscriptionId: 'sub-1', clientState: 'valid-state' }
          ]
        }
      } as any);

      const result = await validator.validate(req, rawBody, 'secret');
      expect(result).toBe(false);
    });
  });

  describe('getEventType', () => {
    it('returns lifecycle event type correctly', () => {
      const req = {
        body: {
          value: [{ lifecycleEvent: 'subscriptionRemoved' }]
        }
      } as Request;
      
      const result = validator.getEventType(req);
      expect(result).toBe('teams_lifecycle_subscriptionRemoved');
    });

    it('returns standard message change type', () => {
      const req = {
        body: {
          value: [{ changeType: 'created' }]
        }
      } as Request;
      
      const result = validator.getEventType(req);
      expect(result).toBe('teams_message_change');
    });
  });
});
