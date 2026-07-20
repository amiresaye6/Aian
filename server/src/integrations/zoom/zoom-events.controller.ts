import { 
    Controller, 
    HttpCode, 
    HttpStatus, 
    Logger, 
    NotFoundException, 
    Post, 
    Req,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WebhookService } from "../../ingestion/collection/webhooks/webhook.service";
import { MeetingBaasService } from "./meeting-baas.service";
import { ProviderConnection } from "../contracts";
import { ZoomClientService } from "./zoom-client.service";

@Controller('events')
export class ZoomEventsController {
    private readonly logger = new Logger(ZoomEventsController.name)
    constructor(
        private readonly prismaService:PrismaService,
        private readonly webhookService:WebhookService,
        private readonly meetingBaasService:MeetingBaasService,
        private readonly zoomClientService:ZoomClientService
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
        console.log(req.body)
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
                
                console.log('Bot created successfully:', meetingBaasResponse);
            } catch (error: any) {
                this.logger.error(`Failed to trigger MeetingBaas Bot: ${error.message}`);
            }
        }
        
        return { received: true };
    }

}
