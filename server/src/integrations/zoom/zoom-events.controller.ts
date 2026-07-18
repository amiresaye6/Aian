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

@Controller('events')
export class ZoomEventsController {
    private readonly logger = new Logger(ZoomEventsController.name)
    constructor(
        private readonly prismaService:PrismaService,
        private readonly webhookService:WebhookService
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
            }
        
        })
        const connectionId=providerConnection?.id || 'null';
        this.logger.debug('connectionId:'+ connectionId)
        await this.webhookService.processWebhook(connectionId, req as any);
        return { received: true };
    }

}