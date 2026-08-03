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
import { IsFutureDate } from '../../../decorators/is-future-date.decorator';

export class CreateMeetingDto {
  @IsString()
  topic: string;

  @IsDateString()
  @IsFutureDate()
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