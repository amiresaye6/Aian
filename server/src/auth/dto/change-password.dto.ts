import { IsString, IsStrongPassword } from 'class-validator';

export class changePasswordDTO {
  @IsString()
  oldPassword: string;

  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'password minimum length is 8 charcaters, must has at least 1 lower case character, 1 upper case character and a symbol',
    },
  )
  newPassword: string;

  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'password minimum length is 8 charcaters, must has at least 1 lower case character, 1 upper case character and a symbol',
    },
  )
  confirmNewPassword: string;
}
