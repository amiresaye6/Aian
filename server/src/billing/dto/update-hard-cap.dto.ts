import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateHardCapDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  overageHardCapCents?: number;
}
