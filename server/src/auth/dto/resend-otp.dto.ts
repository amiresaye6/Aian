import { IsEmail, IsEnum } from 'class-validator';
import { OtpPurpose } from './verify-otp.dto';

export class ResendOtpDto {
  @IsEmail()
  email: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
