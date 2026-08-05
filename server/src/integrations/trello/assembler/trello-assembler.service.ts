import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class TrelloAssemblerService {
  
  // Empty foundation - implementation will come later
  assembleTask(card: any): any {
    throw new NotImplementedException('Trello assembler methods are not implemented yet');
  }
}
