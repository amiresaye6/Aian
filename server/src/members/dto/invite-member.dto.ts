import { IsEmail, IsNotEmpty, IsUUID, IsString, MinLength} from 'class-validator';

export class InviteMemberDto {
  @IsString({ message: 'fullName must be a string.' })
  @IsNotEmpty()
  @MinLength(2, { message: 'fullName must be at least 2 characters long.' })
  fullName!: string;

  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty()
  email!: string;

  @IsUUID('4', { message: 'roleId must be a valid UUID.' })
  @IsNotEmpty()
  roleId!: string;

}
