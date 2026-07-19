import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { OtpPurpose } from './dto/verify-otp.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    return { otp, otpExpiresAt };
  }

  async SignUp(
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) {
    if (password !== confirmPassword) {
      throw new BadRequestException(
        'password and confirm password are not matched',
      );
    }

    const existedUser = await this.usersService.findOneByEmail(email);
    if (existedUser && existedUser.status !== UserStatus.pending_verification) {
      throw new BadRequestException('user is already exist');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { otp, otpExpiresAt } = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    let user;
    if (existedUser) {
      user = await this.prismaService.user.update({
        where: { id: existedUser.id },
        data: {
          fullName,
          passwordHash,
          otpHash,
          otpExpiresAt,
        },
      });
    } else {
      user = await this.usersService.create(
        fullName,
        email,
        passwordHash,
        UserStatus.pending_verification,
        otpHash,
        otpExpiresAt,
      );
    }

    const emailContent = `
            <h3>Verify Your Email</h3>
            <p>Hello ${fullName},</p>
            <p>Use the following One-Time Password (OTP) to verify your email and activate your account:</p>
            <h2 style="color: #4CAF50; letter-spacing: 2px;">${otp}</h2>
            <p>This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
        `;
    await this.emailService.sendBrandedEmail(
      email,
      'verify-email',
      emailContent,
    );

    return user;
  }

  async SignIn(email: string, password: string) {
    const existedUser = await this.usersService.findOneByEmail(email);
    if (!existedUser) {
      throw new UnauthorizedException('invalid email or password');
    }

    const isMatched = await bcrypt.compare(
      password,
      existedUser.passwordHash as string,
    );
    if (!isMatched) {
      throw new UnauthorizedException('invalid email or password');
    }

    if (
      existedUser.status !== UserStatus.active ||
      !existedUser.emailVerifiedAt
    ) {
      throw new ForbiddenException(
        'Please verify your email before signing in',
      );
    }

    const payload = {
      id: existedUser.id,
      email: existedUser.email,
      fullName: existedUser.fullName,
      roleId: existedUser.roleId || 'unkown',
      role: existedUser.role?.name || 'unkown',
      organizationId: existedUser.organizationId || 'unkown',
      organization: existedUser.organization?.name || 'unkown',
    };

    const { access_token, refresh_token } = await this.getTokens(payload);
    await this.updateRefreshToken(existedUser.id, refresh_token);

    return { user: payload, access_token, refresh_token };
  }

  async getTokens(payload: any) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET_REFRESH_TOKEN,
        expiresIn: '30d',
      }),
    ]);
    return { access_token, refresh_token };
  }

  async updateRefreshToken(userid: string, refreshToken: string) {
    const newrefreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prismaService.user.update({
      where: { id: userid },
      data: { refreshTokenHash: newrefreshTokenHash },
    });
  }

  async checkRefreshTokens(userid: string, refreshToken: string) {
    try {
      await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_TOKEN,
      });
    } catch (error: any) {
      throw new ForbiddenException('Expired or invalid refresh token');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userid },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access denied');
    }
    const isMatched = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatched) {
      throw new ForbiddenException('Access denied');
    }

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId || 'unkown',
      role: user.role?.name || 'unkown',
      organizationId: user.organizationId || 'unkown',
      organization: user.organization?.name || 'unkown',
    };

    const { access_token, refresh_token } = await this.getTokens(payload);
    await this.updateRefreshToken(userid, refresh_token);
    return { access_token, refresh_token };
  }

  async logOut(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) {
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException("password doesn't match confirm-password");
    }
    if (oldPassword === newPassword) {
      throw new BadRequestException("new password can't be the old one");
    }
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    const isMatched = await bcrypt.compare(
      oldPassword,
      user.passwordHash as string,
    );
    if (!isMatched) {
      throw new UnauthorizedException('wrong password');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return updatedUser;
  }

  async validateOAuthUser(oauthUser: { email: string; fullName: string }) {
    let user = await this.usersService.findOneByEmail(oauthUser.email);

    if (!user) {
      user = (await this.usersService.create(
        oauthUser.fullName,
        oauthUser.email,
        '',
        UserStatus.pending_verification,
        '',
        new Date(),
      )) as any;
    }
    if (!user) {
      throw new ConflictException("couldn't authenticate");
    }

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      role: (user as any).role?.name || 'unknown',
    };

    const { access_token, refresh_token } = await this.getTokens(payload);
    await this.updateRefreshToken(user.id, refresh_token);

    return { user: payload, access_token, refresh_token };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('user not found');

    const { otp, otpExpiresAt } = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.usersService.updateUser(user.id, {
      otpHash,
      otpExpiresAt,
    });
    const emailContent = `
            <h3>Reset Your Password</h3>
            <p>Hello ${user.fullName},</p>
            <p>You requested to reset your password. Use the following One-Time Password (OTP) to proceed:</p>
            <h2 style="color: #4CAF50; letter-spacing: 2px;">${otp}</h2>
            <p>This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
        `;
    await this.emailService.sendBrandedEmail(
      email,
      'reset-password',
      emailContent,
    );

    return;
  }

  async resendOtp(email: string, purpose: OtpPurpose) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    if (
      purpose === OtpPurpose.REGISTER &&
      user.status !== UserStatus.pending_verification
    ) {
      throw new BadRequestException('This account is already verified');
    }

    const { otp, otpExpiresAt } = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.usersService.updateUser(user.id, { otpHash, otpExpiresAt });

    const isRegister = purpose === OtpPurpose.REGISTER;
    const emailContent = `
            <h3>${isRegister ? 'Verify Your Email' : 'Reset Your Password'}</h3>
            <p>Hello ${user.fullName},</p>
            <p>Use the following One-Time Password (OTP) to ${isRegister ? 'verify your email' : 'reset your password'}:</p>
            <h2 style="color: #4CAF50; letter-spacing: 2px;">${otp}</h2>
            <p>This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
        `;
    await this.emailService.sendBrandedEmail(
      email,
      isRegister ? 'verify-email' : 'reset-password',
      emailContent,
    );

    return;
  }

  async verifyOtp(email: string, otp: string, purpose: OtpPurpose) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid request or OTP not found');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    const isOtpMatched = await bcrypt.compare(otp, user.otpHash);
    if (!isOtpMatched) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (purpose === OtpPurpose.REGISTER) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          otpHash: null,
          otpExpiresAt: null,
          status: UserStatus.active,
          memberStatus: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      return { purpose: OtpPurpose.REGISTER };
    }

    const resetToken = await this.jwtService.signAsync(
      { userId: user.id, email: user.email, purpose: 'password_reset' },
      { secret: process.env.JWT_SECRET, expiresIn: '5m' },
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null },
    });

    return {
      purpose: OtpPurpose.RESET_PASSWORD,
      resetToken,
    };
  }

  async resetPasswordWithToken(
    resetToken: string,
    newPassword: string,
    confirmNewPassword: string,
  ) {
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException("Password doesn't match confirm password");
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(resetToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new ForbiddenException('Invalid or expired reset token');
    }

    if (payload.purpose !== 'password_reset') {
      throw new ForbiddenException('Invalid token purpose');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prismaService.user.update({
      where: { id: payload.userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null,
      },
    });

    return { message: 'Password has been reset successfully.' };
  }
}
