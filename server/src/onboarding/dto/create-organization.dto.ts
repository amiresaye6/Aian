import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 180)
  slug: string;

  @IsString()
  description?: string;

  @IsString()
  industry?: string;

  @IsString()
  companySize?: string;

  @IsString()
  country?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  timezone: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}
