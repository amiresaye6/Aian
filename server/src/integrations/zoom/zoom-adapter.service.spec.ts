import { Test, TestingModule } from '@nestjs/testing';
import { ZoomAdapterService } from './zoom-adapter.service';
import { ProviderEventInput, EyeType, Provider } from '../contracts';

describe('ZoomAdapterService', () => {
  let service: ZoomAdapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZoomAdapterService],
    }).compile();

    service = module.get<ZoomAdapterService>(ZoomAdapterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly normalize a meeting.transcript_completed event', () => {
    const mockInput: ProviderEventInput = {
      organizationId: 'org-123',
      connectionId: 'conn-456',
      rawEventReference: 'event_ref_001',
      rawPayload: {
        event: 'meeting.transcript_completed',
        event_ts: 1710000000000,
        payload: {
          object: {
            id: 987654321,
            uuid: 'mock-meeting-uuid-111',
            topic: 'Daily Standup Meeting',
            host_id: 'host_xyz',
            host_user_name: 'John Doe',
            host_email: 'john@acme.com',
            duration: 30,
            join_url: 'https://zoom.us/j/987654321',
            recording_files: []
          }
        }
      }
    };

    const result = service.normalizeEvent(mockInput);

    expect(result).toHaveLength(1);
    const item = result[0];

    expect(item.organizationId).toBe('org-123');
    expect(item.eyeType).toBe(EyeType.MEETING);
    expect(item.provider).toBe(Provider.ZOOM);
    expect(item.sourceType).toBe('meetingData');
    expect(item.eventType).toBe('meeting.transcript_completed');
    expect(item.externalResourceId).toBe('987654321');
    expect(item.externalEventId).toBe('mock-meeting-uuid-111');
    expect(item.title).toBe('Daily Standup Meeting');
    expect(item.author?.name).toBe('John Doe');
    expect(item.sourceUrl).toBe('https://zoom.us/j/987654321');
  });
});
