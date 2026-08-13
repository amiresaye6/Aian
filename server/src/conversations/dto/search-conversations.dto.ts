import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SearchConversationsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;
}
