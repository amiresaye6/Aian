import { IsEnum, IsNotEmpty } from 'class-validator';
import { MembershipStatus } from '@prisma/client';

export class ChangeMemberStatusDto {
  @IsEnum(MembershipStatus, {
    message: 'status must be one of: invited, active, deactivated.',
  })
  @IsNotEmpty()
  status!: MembershipStatus;
}
