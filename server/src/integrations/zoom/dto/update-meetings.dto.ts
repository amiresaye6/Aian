import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IsFutureDate } from '../../../decorators/is-future-date.decorator';

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  startTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  timezone?: string;
}