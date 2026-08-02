import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';
import { ZoomClientService } from './zoom-client.service';
import { MeetingType } from './zoom-client.service'
/**
 * Handles the Zoom OAuth 2.0 flow.
 */
@Controller('zoom')
export class ZoomController {

  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly zoomClient: ZoomClientService,
  ) {}

@Get('scheduled/:connectionId')
  async scheduled(
    @Param('connectionId') connectionId: string,
    @Query('pageSize') pageSize?: string,
    @Query('nextPageToken') nextPageToken?: string,
  ) {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) {
      return { error: 'Connection record not found in database' };
    }

    const mappedConnection = this.connectionRepo.mapToInterface(connection);

    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 30;

    let result: {
      resources: any[];
      nextPageToken: string | null;
      pageSize: number;
      totalRecords: number;
    };
    try {
      result = await this.zoomClient.getMeetings(
        mappedConnection as any,
        MeetingType.Scheduled,
        parsedPageSize,
        nextPageToken,
      );
    } catch (err: any) {
      return { error: `Failed to fetch resources: ${err.message}` };
    }

    return {
      resourcesFound: result.totalRecords,
      resources: result.resources,
      pageSize: result.pageSize,
      nextPageToken: result.nextPageToken,
    };
  }

@Get('live/:connectionId')
  async liveMeetings(
    @Param('connectionId') connectionId: string,
    @Query('pageSize') pageSize?: string,
    @Query('nextPageToken') nextPageToken?: string,
  ) {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) {
      return { error: 'Connection record not found in database' };
    }

    const mappedConnection = this.connectionRepo.mapToInterface(connection);

    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 30;

    let result: {
      resources: any[];
      nextPageToken: string | null;
      pageSize: number;
      totalRecords: number;
    };
    try {
      result = await this.zoomClient.getMeetings(
        mappedConnection as any,
        MeetingType.Live,
        parsedPageSize,
        nextPageToken,
      );
    } catch (err: any) {
      return { error: `Failed to fetch resources: ${err.message}` };
    }

    return {
      resourcesFound: result.totalRecords,
      resources: result.resources,
      pageSize: result.pageSize,
      nextPageToken: result.nextPageToken,
    };
  }

@Post('create-meeting/:connectionId')
async createMeeting(@Body()body:any,@Param()params:any) {
  const connection = await this.connectionRepo.findById(params.connectionId);
  if (!connection) {
    return { error: 'Connection record not found in database' };
  }
  const meetingData:any= {
    topic:body.type,
    startTime:body.startTime,
    durationMinutes:body.durationMinutes,
    timezone:body.timezone,
    attendees:body.attendees
  }

  return await this.zoomClient.createMeeting(connection,meetingData)
}

@Delete('delete-meeting/:connectionId/:meetingId')
async deleteMeeting(@Param()params:any) {
  const connection = await this.connectionRepo.findById(params.connectionId);
  if (!connection) {
    return { error: 'Connection record not found in database' };
  }
  return await this.zoomClient.deleteMeeting(connection, params.meetingId);
}
}