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
import { ProviderConnection } from "../../integrations/contracts";

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

        this.registry.register({
            name:"meetingSkill.listMeetings",
            description:"list zoom meetings",
            schema:ListMeetingsInputSchema,
            destructive:false,
            handler: (ctx, input) => this.listMeetings(ctx, input),
            requiredProviders:["ZOOM"]
        } as SkillDefinition  )

        this.registry.register({
            name:"meetingSkill.cancelMeetings",
            description:"cancel/remove/delete zoom meeting",
            schema:CancelMeetingInputSchema,
            destructive:true,
            handler: (ctx, input) => this.cancelMeeting(ctx, input),
            requiredProviders:["ZOOM"]
        } as SkillDefinition  )

        this.registry.register({
            name:"meetingSkill.inviteToMeetings",
            description:"invite people to zoom meeting or add registerants",
            schema:InviteMeetingInputSchema,
            destructive:false,
            handler: (ctx, input) => this.inviteToMeeting(ctx, input),
            requiredProviders:["ZOOM"]
        } as SkillDefinition  )

        this.registry.register({
            name:"meetingSkill.getMeetingDetails",
            description:"get meeting details",
            schema:GetMeetingInputSchema,
            destructive:false,
            handler: (ctx, input) => this.getMeetingDetails(ctx, input),
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
            const createdMeeting = await this.zoomClient.createMeeting(
                connection,
                parsed.data
            );
            
            const topic = createdMeeting.topic || 'Untitled Meeting';
            const id = createdMeeting.id;
            const duration = createdMeeting.duration ? `${createdMeeting.duration} mins` : 'N/A';
            const startTime = createdMeeting.startTime
                ? new Date(createdMeeting.startTime).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: 'Africa/Cairo',
                })
                : 'N/A';

            const joinUrl = createdMeeting.joinUrl ? `<${createdMeeting.joinUrl}|Join Zoom Meeting>` : 'N/A';
            const startUrl = createdMeeting.startUrl ? `<${createdMeeting.startUrl}|Start Meeting (Host)>` : null;

            const formattedText = [
                `🎉 *Meeting Created Successfully!*`,
                ``,
                `📌 *Topic:* ${topic}`,
                `🆔 *Meeting ID:* \`${id}\``,
                `🕒 *Start Time:* ${startTime}`,
                `⏱️ *Duration:* ${duration}`,
                ``,
                `🔗 *Join Link:* ${joinUrl}`,
                ...(startUrl ? [`🔑 *Host Link:* ${startUrl}`] : []),
            ].join('\n');

            return {
                createdMeeting,
                meetingSkillMessage: formattedText,
            };
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
            
            const fieldsUpdated = parsed.data.fields || {};
            const updatedFieldsList = Object.entries(fieldsUpdated)
                .map(([key, val]) => {
                const formattedKey = key
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());

                let displayVal = val;
                if (key === 'start_time' || key === 'startTime') {
                    displayVal = new Date(val as string).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: 'Africa/Cairo',
                    });
                } else if (key === 'duration' || key === 'durationMinutes') {
                    displayVal = `${val} mins`;
                }

                return `• *${formattedKey}:* ${displayVal}`;
                })
                .join('\n');

            const formattedText = [
                `📝 *Meeting Updated Successfully!*`,
                ``,
                `🆔 *Meeting ID:* \`${parsed.data.meetingId}\``,
                ``,
                `*Updated Fields:*`,
                updatedFieldsList || '• General settings updated.',
            ].join('\n');

            return {
                result,
                meetingId: parsed.data.meetingId,
                updatedFields: fieldsUpdated,
                meetingSkillMessage: formattedText
            };
        },
        );
    }

    async listMeetings(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
        const parsed = ListMeetingsInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: parsed.error.message,
                retryable: false,
            },
            meta: {
                skill: 'listMeetings',
                provider: 'zoom',
                durationMs: 0,
                idempotencyKey: ctx.idempotencyKey,
            },
            };
        }

        const connection = ctx.connections?.['ZOOM']

        if (!connection) {
            return {
            success: false,
            error: {
                code: 'CONNECTION_NOT_FOUND',
                message: `Provider connection not found for Zoom`,
                retryable: false,
            },
            meta: {
                skill: 'listMeetings',
                provider: 'zoom',
                durationMs: 0,
                idempotencyKey: ctx.idempotencyKey,
            },
            };
        }

        return this.resilience.execute(
            ctx,
            'meetingSkill',
            'listMeetings',
            'zoom',
            parsed.data,
            async () => {
            const result = await this.zoomClient.listMeetings(
                connection as any,
                parsed.data.type as any,
                parsed.data.pageSize,
                parsed.data.nextPageToken
            );
            const count = result.resources?.length || 0;
                let formattedText = '';

                if (count === 0) {
                    formattedText = `📅 *Zoom Meetings*\nNo meetings found.`;
                } else {
                    const meetingList = result.resources
                    .map((m: any, index: number) => {
                        const name = m.name || 'Untitled Meeting';
                        const id = m.externalResourceId;
                        const startTime = m.metadata?.start_time
                        ? new Date(m.metadata.start_time).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: m.metadata.timezone || 'Africa/Cairo',
                            })
                        : 'N/A';
                        const duration = m.metadata?.duration ? `${m.metadata.duration} mins` : 'N/A';
                        const joinUrl = m.metadata?.join_url ? `<${m.metadata.join_url}|Join Meeting>` : '';

                        return `${index + 1}. *${name}* (ID: \`${id}\`)\n   🕒 ${startTime} (${duration}) | 🔗 ${joinUrl}`;
                    })
                    .join('\n\n');

                    formattedText = `📅 *Found ${count} Zoom Meeting${count > 1 ? 's' : ''}:*\n\n${meetingList}`;
                }

                return {
                    ...result,
                    meetingSkillMessage: formattedText, 
                };
            },
        );
    }

    async cancelMeeting(ctx:SkillContext, input:any): Promise<SkillResult<any>>{
        const parsed = CancelMeetingInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                error: {
                code: 'VALIDATION_ERROR',
                message: parsed.error.message,
                retryable: false,
                },
                meta: {
                skill: 'deleteMeeting',
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
        'deleteMeeting',
        'zoom',
        parsed.data,
        async () => {
            const result = await this.zoomClient.deleteMeeting(
                connection,
                parsed.data.meetingId
            );

            return {
                meetingSkillMessage:result,
            };
        },
        );
    } 

    async inviteToMeeting(ctx:SkillContext, input:any): Promise<SkillResult<any>>{
        const parsed = InviteMeetingInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                error: {
                code: 'VALIDATION_ERROR',
                message: parsed.error.message,
                retryable: false,
                },
                meta: {
                skill: 'inviteToMeeting',
                provider: 'zoom',
                durationMs: 0,
                idempotencyKey: ctx.idempotencyKey,
                },
            };
        }

        const connection = ctx.connections['ZOOM'];
        const attendees = parsed.data.attendees ?? [];

        return this.resilience.execute(
        ctx,
        'meetingSkill',
        'inviteToMeeting',
        'zoom',
        parsed.data,
        async () => {
            const result = await this.zoomClient.addRegistrants(
                connection,
                parsed.data.meetingId,
                attendees
            );

            const newAdded = result?.count || 0;
            const alreadyExists = result?.alreadyExists || 0;
            const attendeesList = attendees
                .map((email: string) => `• \`${email}\``)
                .join('\n');

            let statusHeader = '📩 *Meeting Invitations Processed!*';
            if (newAdded > 0 && alreadyExists === 0) {
                statusHeader = '🎉 *Attendees Invited Successfully!*';
            } else if (newAdded === 0 && alreadyExists > 0) {
                statusHeader = 'ℹ️ *Attendees Already Invited*';
            }

            const formattedText = [
                statusHeader,
                ``,
                `🆔 *Meeting ID:* \`${parsed.data.meetingId}\``,
                `👥 *Submitted Email(s):*`,
                attendeesList,
                ``,
                `📊 *Summary:*`,
                `• *Newly Added:* ${newAdded}`,
                `• *Already Registered:* ${alreadyExists}`,
            ].join('\n');

            return {
                ...result,
                meetingSkillMessage: formattedText,
            };
        },
        );
    } 

    async getMeetingDetails(ctx:SkillContext, input:any): Promise<SkillResult<any>>{
        const parsed = GetMeetingInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                error: {
                code: 'VALIDATION_ERROR',
                message: parsed.error.message,
                retryable: false,
                },
                meta: {
                skill: 'getMeetingDetails',
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
        'getMeetingDetails',
        'zoom',
        parsed.data,
        async () => {
            const result = await this.zoomClient.getMeetingDetails(
                connection as any,
                parsed.data.meetingId
            );
            const startTimeFormatted = result.start_time
                    ? new Date(result.start_time).toLocaleString('en-US', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                        timeZone: result.timezone || 'UTC',
                    })
                    : 'N/A';

                const formattedMessage = [
                    `📅 *Zoom Meeting Details*`,
                    ``,
                    `📌 *Topic:* ${result.topic || 'N/A'}`,
                    `🆔 *Meeting ID:* \`${result.id}\``,
                    `🕒 *Start Time:* ${startTimeFormatted}`,
                    `⏱️ *Duration:* ${result.duration || 0} minutes`,
                    `🌍 *Timezone:* ${result.timezone || 'UTC'}`,
                    `👤 *Host Email:* \`${result.host_email || 'N/A'}\``,
                    `🔑 *Passcode:* \`${result.password || 'N/A'}\``,
                    ``,
                    `🔗 *Join Link:* ${result.join_url}`,
                ].join('\n');

                return {
                    ...result,
                    meetingSkillMessage: formattedMessage,
                };
        },
        );
    } 
}