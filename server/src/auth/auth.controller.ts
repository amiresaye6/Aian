import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SignInDto } from './dto/signIn.dto';
import { UserEntity } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGaurd } from './auth.gaurd';
import { User } from '@prisma/client';
import { changePasswordDTO } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async signUp(@Body() body: CreateUserDto) {
    const { fullName, email, password, confirmPassword } = body;
    const user = await this.authService.SignUp(
      fullName,
      email,
      password,
      confirmPassword,
    );
    return { user: new UserEntity(user) };
  }

  @Post('signIn')
  @HttpCode(HttpStatus.OK)
  async SignIn(@Body() body: SignInDto) {
    const { email, password } = body;
    const { user, access_token, refresh_token } = await this.authService.SignIn(
      email,
      password,
    );
    return { access_token, refresh_token, user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGaurd)
  async LogOut(@CurrentUser() user: UserEntity) {
    await this.authService.logOut(user.id);
    return;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.checkRefreshTokens(body.userId, body.refreshToken);
  }

  @UseGuards(AuthGaurd)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: UserEntity,
    @Body() body: changePasswordDTO,
  ) {
    const { oldPassword, newPassword, confirmNewPassword } = body;
    const updateUser = await this.authService.changePassword(
      user.id,
      oldPassword,
      newPassword,
      confirmNewPassword,
    );
    return updateUser;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.email, body.otp, body.purpose);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    const { resetToken, newPassword, confirmNewPassword } = body;
    return this.authService.resetPasswordWithToken(
      resetToken,
      newPassword,
      confirmNewPassword,
    );
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const authData = await this.authService.validateOAuthUser(req.user);
    const userJson = encodeURIComponent(JSON.stringify(authData.user));

    return res.redirect(
      `http://localhost:3000/oauth-success?token=${authData.access_token}&refresh_token=${authData.refresh_token}&user=${userJson}`,
    );
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Req() req: any) {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Req() req: any, @Res() res: any) {
    const authData = await this.authService.validateOAuthUser(req.user);
    const userJson = encodeURIComponent(JSON.stringify(authData.user));

    return res.redirect(
      `http://localhost:3000/oauth-success?token=${authData.access_token}&refresh_token=${authData.refresh_token}&user=${userJson}`,
    );
  }
}
