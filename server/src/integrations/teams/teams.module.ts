import { Module } from '@nestjs/common';
import { TeamsAuthController } from './controllers/teams-auth.controller';

@Module({
  controllers: [TeamsAuthController],
  providers: [],
})
export class TeamsModule {}
