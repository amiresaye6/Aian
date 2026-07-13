import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  fullName: string;

  @IsEmail()
  @IsString()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  password: string;
}
