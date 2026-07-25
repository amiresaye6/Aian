import { 
    Controller, 
    HttpCode, 
    HttpStatus, 
    Logger, 
    NotFoundException, 
    Post, 
    Req,
    UnauthorizedException,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WebhookService } from "../../ingestion/collection/webhooks/webhook.service";
import { MeetingBaasService } from "./meeting-baas.service";
import { ProviderConnection, ProviderEventInput } from "../contracts";
import { ZoomClientService } from "./zoom-client.service";
import axios from "axios";
import * as crypto from 'crypto';
import { ZoomAdapterService } from "./zoom-adapter.service";
import { WebhookEventDispatcherService } from "../../ingestion/collection/webhooks/webhook-event-dispatcher.service";
import { ZoomWebhookValidator } from "./zoom-webhook.validator";
import { EncryptionService } from "../../common/encryption.service";

@Controller('events')
export class ZoomEventsController {
    private readonly logger = new Logger(ZoomEventsController.name)
    constructor(
        private readonly prismaService:PrismaService,
        private readonly webhookService:WebhookService,
        private readonly meetingBaasService:MeetingBaasService,
        private readonly zoomClientService:ZoomClientService,
        private readonly zoomAdapterService:ZoomAdapterService,
        private readonly zoomWebhookValidator:ZoomWebhookValidator,
        private readonly encryptionService:EncryptionService
        //private readonly disbatcher:WebhookEventDispatcherService
    ){}

    @Post('zoom')
    @HttpCode(HttpStatus.OK)
    async handleZoomWebhook(
        @Req() req: RawBodyRequest<any>,
    ) {
        const zoomProvider= await this.prismaService.provider.findUnique({
            where:{key:'zoom'}
        })

        if(!zoomProvider)
        throw new NotFoundException("couldn't find the provider")

        const account_id= req.body.payload.account_id;
        if(!account_id)
            throw new NotFoundException('account_id is missing')

        const providerConnection= await this.prismaService.providerConnection.findFirst({
            where: {
                externalAccountId:account_id,
                providerId:zoomProvider.id
            },
            include: {
                organizationEye: true,
                provider: true
            }
        })
        if(!providerConnection)
            throw new NotFoundException('connection not found')
        
        const connectionId=providerConnection?.id;
        this.logger.debug('connectionId:'+ connectionId)

        if(!providerConnection.webhookSecret)
            throw new UnauthorizedException("couldn't find zoom webhook secret")

        const decryptedSecret = await this.encryptionService.decrypt(providerConnection?.webhookSecret)
        const isValid = this.zoomWebhookValidator.validate_Zoom(req,req.rawBody,decryptedSecret);
        if(!isValid)
            throw new UnauthorizedException('Zoom Webhook Signature comparison mismatch.')
        //await this.webhookService.processWebhook(connectionId, req as any);
        //console.log(req.body)
        if (req.body.event == 'meeting.started') {
            try {
                const meetingId = req.body.payload.object.id;
                
                this.logger.log(`Fetching live join_url for meeting: ${meetingId}`);
                
                const meetingDetails = await this.zoomClientService.getMeetingDetails(
                    providerConnection as any, 
                    meetingId
                );
                
                const realMeetingUrl = meetingDetails.join_url;
                this.logger.log('Bot is being created:', realMeetingUrl);
                const meetingBaasResponse = await this.meetingBaasService.createBot(
                    providerConnection as any,
                    realMeetingUrl,
                    'Aian bot',
                );
                
                this.logger.log('Bot created successfully:', meetingBaasResponse);
            } catch (error: any) {
                this.logger.error(`Failed to trigger MeetingBaas Bot: ${error.message}`);
            }
        }
        
        return { received: true };
    }


   @Post('meeting-baas')
    @HttpCode(HttpStatus.OK)
    async handleMeetingBaasWebhook(
        @Req() req: RawBodyRequest<any>,
    ) {
        
        try {
            //console.log(req.body)
            const eventType = req.body?.event;
            const eventData = req.body?.data;

            const botId = eventData?.bot_id;

            if (!botId) {
                throw new NotFoundException('bot_id is missing from webhook body');
            }

            const meetingProvider = await this.prismaService.provider.findUnique({
                where: { key: 'zoom' }
            });

            if (!meetingProvider) {
                throw new NotFoundException("Couldn't find the Meeting Baas provider config.");
            }

            const providerConnection = await this.prismaService.providerConnection.findFirst({
                where: {
                    providerId: meetingProvider.id,
                    connectionMetadata: {
                        path: ['bot_id'],
                        equals: botId
                    }
                }
            });

            if (!providerConnection) {
                this.logger.warn(`No active provider connection profile mapped for Meeting Baas Bot: ${botId}`);
            }

            const connectionId = providerConnection?.id;
            if(!connectionId)
                throw new UnauthorizedException("couldn't find connection")
            this.logger.debug(`Meeting Baas connectionId matched: ${connectionId} for Bot ID: ${botId}`);

            if (eventType === 'bot.completed' && eventData) {
            this.logger.log(`Bot ${botId} completed. Fetching transcription details...`);

            const transcriptionUrl = eventData.transcription;
            const rawTranscriptionUrl = eventData.raw_transcription;
            let transcriptionText = '';
            let summarization = '';
            let full_transcription = '';
            if (transcriptionUrl) {
                try {
                    const transcriptionResponse = await axios.get(transcriptionUrl);
                    const rawTranscriptionResponse = await axios.get(rawTranscriptionUrl);

                    const transcriptionData = transcriptionResponse.data;
                    const rawtranscriptionData = rawTranscriptionResponse.data;

                    const utterances = transcriptionData?.result?.utterances || transcriptionData?.utterances || [];

                    if (Array.isArray(utterances) && utterances.length > 0) {
                        transcriptionText = utterances
                            .map((u: any) => `[${u.speaker || 'Unknown'}]: ${u.text}`)
                            .join('\n');
                    } else if (transcriptionData?.transcription) {
                        transcriptionText = transcriptionData.transcription;
                    }

                    summarization = rawtranscriptionData?.transcriptions?.[0]?.payload?.summarization?.results || ''
                    full_transcription = rawtranscriptionData?.transcriptions?.[0]?.payload?.transcription.full_transcript || ''
                } catch (fetchError: any) {
                    this.logger.error(`Failed to process transcription JSON from S3: ${fetchError.message}`);
                }
            }

            const participants = (eventData.participants || []).map((p: any) => ({
                name: p.name || undefined,
                externalId: p.id ? String(p.id) : undefined,
                ...(p.email && { email: p.email }),
            }));

            const meetingResultObject = {
                bot_id: botId,
                connectionId: connectionId,
                durationSeconds: eventData.duration_seconds,
                joinedAt: eventData.joined_at,
                exitedAt: eventData.exited_at,
                participants, 
                speakers: eventData.speakers || [],      
                transcriptionText,
                summarization,
                full_transcription,
                videoUrl: eventData.video,
                audioUrl: eventData.audio,
                externalAccountId:providerConnection?.externalAccountId,
                externalAccountName:providerConnection?.externalAccountName,
            };
            req.body.data = meetingResultObject;
            try {
                await this.webhookService.processWebhook(connectionId, req as any);
                this.logger.log('--- Meeting Data Object Successfully Compiled ---');
            } catch (validationError: any) {
                this.logger.warn(
                    `Skipping unsigned/invalid MeetingBaas callback for bot ${botId}: ${validationError.message}`,
                );
            }
        }     
            return { received: true };

        } catch (error: any) {
            this.logger.error(`Error processing webhook: ${error.message}`);
            throw error;
        }
    }

}

/***
 * {
  success: true,
  data: { bot_id: '2380152a-29c5-41cf-8dd7-6589360fe4d6' }
}
 */