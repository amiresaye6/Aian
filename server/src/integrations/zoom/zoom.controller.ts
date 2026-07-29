import {
  Controller,
  Get,
  Param,
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
  async scheduled(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) {
      return { error: 'Connection record not found in database' };
    }

    const mappedConnection = this.connectionRepo.mapToInterface(connection);

    let resources = []  as any[];
      try {
        resources = await this.zoomClient.getMeetings(mappedConnection as any,MeetingType.Scheduled);
      } catch (err: any) {
        resources = [{ error: `Failed to fetch resources: ${err.message}` }];
      }
    

    return {
      resourcesFound: resources.length,
      resources,
    };
  }

@Get('live/:connectionId')
  async liveMeetings(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) {
      return { error: 'Connection record not found in database' };
    }

    const mappedConnection = this.connectionRepo.mapToInterface(connection);

    let resources = []  as any[];
      try {
        resources = await this.zoomClient.getMeetings(mappedConnection as any,MeetingType.Live);;
      } catch (err: any) {
        resources = [{ error: `Failed to fetch resources: ${err.message}` }];
      }
    

    return {
      resourcesFound: resources.length,
      resources,
    };
  }

}