import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GraphQueryDto {
  @IsOptional()
  @IsString()
  entityTypes?: string;

  @IsOptional()
  @IsString()
  relationshipTypes?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  limit?: number = 150;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  minDegree?: number = 0;
}
