import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  topic: string;

  @IsDateString()
  startTime: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsString()
  timezone: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  attendees?: string[];
}