import { UserStatus } from '@prisma/client';
import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDTO {
  @IsEmail()
  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  fullName: string;

  @IsOptional()
  @IsDateString()
  emailVerifiedAt: Date;

  @IsOptional()
  status: UserStatus;
}
