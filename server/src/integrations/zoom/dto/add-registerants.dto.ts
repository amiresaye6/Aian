import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
} from 'class-validator';

export class AddRegistrantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  attendees: string[];
}