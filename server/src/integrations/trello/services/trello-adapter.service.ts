import { Injectable, NotImplementedException } from '@nestjs/common';
import { TrelloClientService } from './trello-client.service';

@Injectable()
export class TrelloAdapterService {
  constructor(private readonly trelloClient: TrelloClientService) {}

  // Empty foundation - implementation will come later
  async adaptTask(payload: any): Promise<any> {
    throw new NotImplementedException('Trello adapter methods are not implemented yet');
  }
}
