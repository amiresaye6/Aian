import {
  Controller,
  Get,
  Param,
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

}