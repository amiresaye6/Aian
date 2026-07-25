import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureValidator } from '../../ingestion/collection/webhooks/webhook-signature-validator.interface';
import { Request } from 'express';
import * as crypto from 'crypto';
import { MeetingBaasService } from './meeting-baas.service';

/**
 * Validates incoming Zoom webhook payloads and handles URL verification challenges.
 * 
 * Zoom Verification Flow:
 *   1. Replay Attack Protection: Check `x-zm-request-timestamp` header.
 *   2. Compute signature: HMAC-SHA256 of "v0:{timestamp}:{rawBody}" using Zoom Webhook Secret Token.
 *   3. Compare computed signature against the `x-zm-signature` header.
 */
@Injectable()
export class ZoomWebhookValidator implements WebhookSignatureValidator {
  private readonly logger = new Logger(ZoomWebhookValidator.name);

  constructor(
    private readonly meetingBaasService: MeetingBaasService
  ){}

  async validate(
    req: Request,
    rawBody: Buffer,
    secret: string,
  ): Promise<boolean> {
    const eventType = req.body?.event;
    const eventData = req.body?.data;
    const botId = eventData?.bot_id;

    //console.log('webhook reached with req:', req)
    if (!botId) {
      this.logger.warn("Missing important data 'bot_id' in webhook request");
      return false;
    }
      this.logger.debug('Webhook reached at meetingbaas events');
      
              const svixId = req.headers['svix-id'] as string;
              const svixTimestamp = req.headers['svix-timestamp'] as string;
              const svixSignature = req.headers['svix-signature'] as string;
              const webhookSecret = process.env.MEETING_BAAS_WEBHOOK_SECRET;
              
              if (webhookSecret && svixId && svixTimestamp && svixSignature) {
                  if (!rawBody) {
                      throw new UnauthorizedException('Raw body is missing. Ensure { rawBody: true } is enabled in main.ts');
                  }
      
                  const secretKey = webhookSecret.startsWith('whsec_') 
                      ? Buffer.from(webhookSecret.split('_')[1], 'base64') 
                      : webhookSecret;
      
                  const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString('utf-8')}`;
                  const computedSignature = crypto
                      .createHmac('sha256', secretKey)
                      .update(signedContent)
                      .digest('base64');
      
                  const passedSignatures = svixSignature.split(' ').flatMap(s => s.split(','));
                  const isValid = passedSignatures.some(sig => sig === computedSignature || sig === `v1,${computedSignature}`);
      
                  if (!isValid) {
                      this.logger.error('Svix signature verification failed!');
                      return false
                  }
                  this.logger.log('Webhook signature verified successfully via Svix.');
                  return true;
              }
              console.log(req.body)
              this.logger.warn('Missing MeetingBaas webhook secret or Svix headers.');
              return false;
      

        
}


async validate_Zoom(
    req: Request,
    rawBody: Buffer,
    secret: string,
  ): Promise<boolean> {
    const signature = req.headers['x-zm-signature'] as string;
    const timestamp = req.headers['x-zm-request-timestamp'] as string;
    //console.log('webhook reached with req.body:', req.body)
    if (!signature || !timestamp) {
      this.logger.warn('Missing Zoom validation headers (x-zm-signature or x-zm-request-timestamp)');
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 60 * 5) {
      this.logger.error('Zoom Webhook rejected: Timestamp is older than 5 minutes or invalid.');
      return false;
    }

    const message = `v0:${timestamp}:${rawBody.toString('utf8')}`;
    //console.log('Zoom Webhook Validation: Message to sign:', message);
    //console.log('req:'+req);

    const expectedSignature = 
      'v0=' + 
      crypto.createHmac('sha256', secret).update(message).digest('hex');
      //console.log('zoom validator worked successfully');
    try {
       return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );

    } catch (error) {
      this.logger.error('Zoom Webhook Signature comparison mismatch.');
      return false;
    }
  }

  
  /**
   * Helper to handle Zoom URL Validation Challenge (endpoint.url_validation).
   * When configuring webhooks, Zoom sends a test token. We must encrypt it and return it.
   */
  handleUrlValidation(plainToken: string, secret: string): { plainToken: string; encryptedToken: string } {
    const encryptedToken = crypto
      .createHmac('sha256', secret)
      .update(plainToken)
      .digest('hex');

    return {
      plainToken,
      encryptedToken,
    };
  }

  getEventType(request: Request): string{
    return request.body?.event;
  }
  
}


/*
  webhook reached with req.body: {
  event: 'meeting.ended',
  payload: {
    account_id: 'Ws9lYbOZT56qC8fzSVx-zg',
    object: {
      duration: 0,
      start_time: '2026-07-17T22:24:18Z',
      timezone: '',
      end_time: '2026-07-17T22:25:21Z',
      topic: "Muhammad Elazzazy's Zoom Meeting",
      id: '86537167305',
      type: 1,
      uuid: '1j34liHNSLib+G/OV+4QHg==',
      host_id: 'DzQ9MFEBTnWCbA79wfNsww',
      host_email: 'mohamadelazzazy@gmail.com'
    }
  },
  event_ts: 1784327121469
}  
 */