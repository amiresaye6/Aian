import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { EmailModule } from '../email/email.module';
import { MemberActivationService } from './member-activation.service';

@Module({
  imports: [EmailModule],
  controllers: [MembersController],
  providers: [MembersService, MemberActivationService],
  exports: [MembersService,MemberActivationService],
})
export class MembersModule {}
