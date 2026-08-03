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
import { GetMeetingsDto } from './dto/get-meetings.dto';
import { CreateMeetingDto } from './dto/create-meetings.dto';
import { UpdateMeetingDto } from './dto/update-meetings.dto';
import { AddRegistrantsDto } from './dto/add-registerants.dto';



@Controller('zoom')
export class ZoomController {

  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly zoomClient: ZoomClientService,
  ) {}

@Get('scheduled/:connectionId')
  async scheduled(
    @Param('connectionId') connectionId: string,
    @Query() query: GetMeetingsDto
  ) {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) {
      return { error: 'Connection record not found in database' };
    }

    const mappedConnection = this.connectionRepo.mapToInterface(connection);

    const parsedPageSize = query.pageSize ? query.pageSize : 30;

    let result: {
      resources: any[];
      nextPageToken: string | null;
      pageSize: number;
      totalRecords: number;
    };
    try {
      result = await this.zoomClient.listMeetings(
        mappedConnection as any,
        MeetingType.Scheduled,
        parsedPageSize,
        query.nextPageToken,
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
    @Query() query: GetMeetingsDto
  ) {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) {
      return { error: 'Connection record not found in database' };
    }

    const mappedConnection = this.connectionRepo.mapToInterface(connection);

    const parsedPageSize = query.pageSize ? query.pageSize : 30;

    let result: {
      resources: any[];
      nextPageToken: string | null;
      pageSize: number;
      totalRecords: number;
    };
    try {
      result = await this.zoomClient.listMeetings(
        mappedConnection as any,
        MeetingType.Live,
        parsedPageSize,
        query.nextPageToken,
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
async createMeeting(@Body()body:CreateMeetingDto,@Param()params:any) {
  const connection = await this.connectionRepo.findById(params.connectionId);
  if (!connection) {
    return { error: 'Connection record not found in database' };
  }
  const meetingData:any= {
    topic:body.topic,
    startTime:body.startTime,
    durationMinutes:body.durationMinutes,
    timezone:body.timezone,
    attendees:body.attendees
  }

  return await this.zoomClient.createMeeting(connection,meetingData)
}

@Patch('update-meeting/:connectionId/:meetingId')
async updateMeeting(@Body()body:UpdateMeetingDto,@Param()params:any) {
  const connection = await this.connectionRepo.findById(params.connectionId);
  if (!connection) {
    return { error: 'Connection record not found in database' };
  }
  const fieldsToUpdate:any= {
    topic:body.topic,
    startTime:body.startTime,
    durationMinutes:body.durationMinutes,
    timezone:body.timezone
  }
  return await this.zoomClient.updateMeeting(connection, params.meetingId, fieldsToUpdate);
}

@Delete('delete-meeting/:connectionId/:meetingId')
async deleteMeeting(@Param()params:any) {
  const connection = await this.connectionRepo.findById(params.connectionId);
  if (!connection) {
    return { error: 'Connection record not found in database' };
  }
  return await this.zoomClient.deleteMeeting(connection, params.meetingId);
}

@Post('add-registrants/:connectionId/:meetingId')
async addRegistrants(@Body()body:AddRegistrantsDto,@Param()params:any) {
  const connection = await this.connectionRepo.findById(params.connectionId);
  if (!connection) {
    return { error: 'Connection record not found in database' };
  }
  return await this.zoomClient.addRegistrants(connection, params.meetingId, body.attendees);
}
}