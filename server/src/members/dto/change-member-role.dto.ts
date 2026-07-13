import { IsNotEmpty, IsUUID } from 'class-validator';

export class ChangeMemberRoleDto {
  @IsUUID('4', { message: 'roleId must be a valid UUID.' })
  @IsNotEmpty()
  roleId!: string;
}
