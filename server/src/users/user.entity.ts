import { User, UserStatus } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity implements User {
  id: string;
  fullName: string;
  email: string;

  @Exclude()
  passwordHash: string | null;

  @Exclude()
  refreshTokenHash: string | null;

  emailVerifiedAt: Date | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;

  organizationId: string | null;
  roleId: string | null;
  memberStatus: any | null;
  joinedAt: Date | null;
  invitedByUserId: string | null;

  @Exclude()
  otpHash: string | null;

  @Exclude()
  otpExpiresAt: Date | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
