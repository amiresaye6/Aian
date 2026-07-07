import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export class InviteMemberDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty()
  email!: string;

  @IsUUID('4', { message: 'roleId must be a valid UUID.' })
  @IsNotEmpty()
  roleId!: string;
}