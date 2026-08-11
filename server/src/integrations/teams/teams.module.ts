import { Module } from '@nestjs/common';
import { TeamsAuthController } from './controllers/teams-auth.controller';
import { TeamsClientService } from './services/teams-client.service';

@Module({
  controllers: [TeamsAuthController],
  providers: [TeamsClientService],
  exports: [TeamsClientService],
})
export class TeamsModule {}
