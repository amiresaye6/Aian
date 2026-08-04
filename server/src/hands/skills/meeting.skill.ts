import { Injectable, OnModuleInit } from "@nestjs/common";
import { ZoomClientService } from "../../integrations/zoom/zoom-client.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SkillDefinition, SkillRegistryService } from "../core/registry.service";
import { ResilienceService } from "../core/resilience.service";
import { SkillContext, SkillResult } from "../core/types";
import {
    CreateMeetingInputSchema,
    UpdateMeetingInputSchema,
    CancelMeetingInputSchema,
    InviteMeetingInputSchema,
    GetMeetingInputSchema,
    ListMeetingsInputSchema,
}
from "../skills/schemas";

@Injectable()
export class MeetingSkill implements OnModuleInit {
  constructor(
    private readonly zoomClient: ZoomClientService,
    private readonly prisma: PrismaService,
    private readonly registry: SkillRegistryService,
    private readonly resilience: ResilienceService,
  ) {}

    onModuleInit() {
        this.registry.register({
            name:"meetingSkill.createMeeting",
            description:"schedule or create zoom meeting and add registrants by email",
            schema:CreateMeetingInputSchema,
            destructive:false,
            handler: (ctx, input) => this.createMeeting(ctx, input)
        } as SkillDefinition  )
    }

    async createMeeting(ctx:SkillContext, input:any): Promise<SkillResult<any>>{
        const parsed = CreateMeetingInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                error: {
                code: 'VALIDATION_ERROR',
                message: parsed.error.message,
                retryable: false,
                },
                meta: {
                skill: 'createMeeting',
                provider: 'zoom',
                durationMs: 0,
                idempotencyKey: ctx.idempotencyKey,
                },
            };
        }

        const connection = await this.prisma.providerConnection.findFirst({
            where:{ id:ctx.connectionId}
        })

        return this.resilience.execute(
        ctx,
        'meetingSkill',
        'createMeeting',
        'zoom',
        parsed.data,
        async () => {
            // 3. Delegate to your actual service
            const result = await this.zoomClient.createMeeting(
                connection,
                input
            );
            return result; // The ResilienceService automatically wraps this in a success result
        },
        );
    }

}