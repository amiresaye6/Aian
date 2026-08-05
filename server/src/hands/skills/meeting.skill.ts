import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
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
private readonly logger = new Logger(MeetingSkill.name);
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
            handler: (ctx, input) => this.createMeeting(ctx, input),
            requiredProviders:["ZOOM"]
        } as SkillDefinition  )

        this.registry.register({
            name:"meetingSkill.updateMeeting",
            description:"update/modify an existing zoom meeting",
            schema:UpdateMeetingInputSchema,
            destructive:false,
            handler: (ctx, input) => this.updateMeeting(ctx, input),
            requiredProviders:["ZOOM"]
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

        const connection = ctx.connections['ZOOM'];

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
                parsed.data
            );
            return result; // The ResilienceService automatically wraps this in a success result
        },
        );
    }


    async updateMeeting(ctx:SkillContext, input:any): Promise<SkillResult<any>>{
        const parsed = UpdateMeetingInputSchema.safeParse(input);
        //this.logger.log(`Executing skill updateMeeting with input: ${JSON.stringify(ctx)}`);
        //this.logger.log(`input: ${JSON.stringify(parsed.data)}`)
        if (!parsed.success) {
            return {
                success: false,
                error: {
                code: 'VALIDATION_ERROR',
                message: parsed.error.message,
                retryable: false,
                },
                meta: {
                skill: 'updateMeeting',
                provider: 'zoom',
                durationMs: 0,
                idempotencyKey: ctx.idempotencyKey,
                },
            };
        }

        const connection = ctx.connections['ZOOM'];

        return this.resilience.execute(
        ctx,
        'meetingSkill',
        'updateMeeting',
        'zoom',
        parsed.data,
        async () => {
            // 3. Delegate to your actual service
            const result = await this.zoomClient.updateMeeting(
                connection,
                parsed.data.meetingId,
                parsed.data.fields
            );
            return result; // The ResilienceService automatically wraps this in a success result
        },
        );
    }
}