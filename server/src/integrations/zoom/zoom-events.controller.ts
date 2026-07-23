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

@Controller('events')
export class ZoomEventsController {
    private readonly logger = new Logger(ZoomEventsController.name)
    constructor(
        private readonly prismaService:PrismaService,
        private readonly webhookService:WebhookService,
        private readonly meetingBaasService:MeetingBaasService,
        private readonly zoomClientService:ZoomClientService,
        private readonly zoomAdapterService:ZoomAdapterService,
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
        await this.webhookService.processWebhook(connectionId, req as any);
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

                const meetingBaasResponse = await this.meetingBaasService.createBot(
                    providerConnection as any,
                    realMeetingUrl,
                    'Aian bot',
                );
                
                //console.log('Bot created successfully:', meetingBaasResponse);
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
        this.logger.debug('Webhook reached at meetingbaas events');

        const svixId = req.headers['svix-id'] as string;
        const svixTimestamp = req.headers['svix-timestamp'] as string;
        const svixSignature = req.headers['svix-signature'] as string;
        const webhookSecret = process.env.MEETING_BAAS_WEBHOOK_SECRET;

        if (webhookSecret && svixId && svixTimestamp && svixSignature) {
            if (!req.rawBody) {
                throw new UnauthorizedException('Raw body is missing. Ensure { rawBody: true } is enabled in main.ts');
            }

            const secretKey = webhookSecret.startsWith('whsec_') 
                ? Buffer.from(webhookSecret.split('_')[1], 'base64') 
                : webhookSecret;

            const signedContent = `${svixId}.${svixTimestamp}.${req.rawBody.toString('utf-8')}`;
            const computedSignature = crypto
                .createHmac('sha256', secretKey)
                .update(signedContent)
                .digest('base64');

            const passedSignatures = svixSignature.split(' ').flatMap(s => s.split(','));
            const isValid = passedSignatures.some(sig => sig === computedSignature || sig === `v1,${computedSignature}`);

            if (!isValid) {
                this.logger.error('Svix signature verification failed!');
                throw new UnauthorizedException('Invalid Svix webhook signature.');
            }
            this.logger.log('Webhook signature verified successfully via Svix.');
        }

        try {
            const eventType = req.body?.event;
            const eventData = req.body?.data;

            const botId = eventData?.bot_id || req.body?.bot_id;

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

            const connectionId = providerConnection?.id || 'null';
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
                botId: botId,
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

            this.logger.log('--- Meeting Data Object Successfully Compiled ---');

            const organizationEye = await this.prismaService.organizationEye.findFirst({
                where:{id:providerConnection?.organizationEyeId}
            })

            if(!organizationEye?.id)
                throw new NotFoundException('organization eye not found');
            //console.log(meetingResultObject);
            const eventInput: ProviderEventInput = {
                rawPayload: meetingResultObject,
                rawEventReference: botId, 
                organizationId: organizationEye?.id,
                connectionId: connectionId,
                providerEventType: eventType,
            };

            const knowledgeItems = this.zoomAdapterService.normalizeEvent(eventInput);

            //console.log('knowledge Item: ',knowledgeItems)
            /*
            this.disbatcher.dispatch(
                connectionId,
                meetingProvider.id,
                meetingProvider.key,
                organizationEye.id,
                organizationEye.organizationId,
                'meeting',
                'bot.completed',
                knowledgeItems
            )
                */
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