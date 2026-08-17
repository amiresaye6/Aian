import { IsNotEmpty, IsString } from 'class-validator';

export class DowngradePlanDto {
  @IsString()
  @IsNotEmpty()
  planSlug: string;
}
