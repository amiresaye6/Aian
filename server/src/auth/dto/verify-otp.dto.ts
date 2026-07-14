import { IsEmail, IsEnum, IsString, Length } from 'class-validator';

export enum OtpPurpose {
  REGISTER = 'register',
  RESET_PASSWORD = 'reset_password',
}

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
