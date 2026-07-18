import { Injectable } from '@nestjs/common';
import { ProviderAdapter, ProviderEventInput, KnowledgeItem, EyeType, Provider } from '../contracts';

@Injectable()
export class ZoomAdapterService implements ProviderAdapter {
  
  /**
   * Normalizes raw webhook payloads received from Zoom into the unified KnowledgeItem schema.
   */
  normalizeEvent(input: ProviderEventInput): KnowledgeItem[] {
    const event = input.rawPayload as any;
    
      const meetingObject = event.payload.object;

      const normalizedItem: KnowledgeItem = {
        id: undefined as any, // Generated automatically by the database (UUID)
        organizationId: input.organizationId,
        eyeType: EyeType.MEETING,
        provider: Provider.ZOOM,
        sourceType: 'Meeting Data',
        eventType: event.event,
        externalResourceId: meetingObject.id.toString(),
        externalEventId: meetingObject.uuid,
        parentExternalResourceId: null,
        title: meetingObject.topic || 'Zoom Meeting',
        
        content: meetingObject.transcript_text || 'Transcript will be fetched via Zoom API.', 
        
        author: {
          externalId: meetingObject.host_id || 'unknown_host',
          name: meetingObject.host_user_name || 'Zoom Host',
          email: meetingObject.host_email || undefined,
        },
        
        participants: [],
        contextLocation: meetingObject.topic ? `Meeting: ${meetingObject.topic}` : 'Zoom Meeting Room',
        sourceUrl: meetingObject.join_url || null,
        occurredAt: new Date(event.event_ts),
        receivedAt: new Date(),
        visibility: 'ORGANIZATION',
        rawPayloadReference: input.rawEventReference,
        metadata: { 
          host_id: meetingObject.host_id,
          topic: meetingObject.topic,
          duration: meetingObject.duration,
          recording_files: meetingObject.recording_files || [],
        },
        version: '1.0',
      };

      return [normalizedItem];
  }

  /**
   * Generates a unique idempotency key to prevent processing duplicate meeting transcripts.
   */
  getIdempotencyKey(item: KnowledgeItem): string {
    return `zoom:${item.organizationId}:${item.externalEventId}:transcript`;
  }

    /**
     * Extracts the unique external resource ID from the raw webhook payload.
     */
    getExternalResourceId(input: ProviderEventInput): string { 
        const raw = input.rawPayload as any;
        return raw?.payload?.object?.id?.toString() || 'unknown'; 
    }

    /**
     * Extracts the unique external event/meeting instance UUID from the raw webhook payload.
     */
    getExternalEventId(input: ProviderEventInput): string | null { 
        const raw = input.rawPayload as any;
        return raw?.payload?.object?.uuid || null; 
    }
}