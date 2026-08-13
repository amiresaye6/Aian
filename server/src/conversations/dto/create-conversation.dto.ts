import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
