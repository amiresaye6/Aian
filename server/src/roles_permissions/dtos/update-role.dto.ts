import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateRoleDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permissionIds?: string[];
}
