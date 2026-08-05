import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemberActivationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called on an invited member's first successful login.
   * Auto-verifies their email and activates their membership,
   * since possessing the temporary password sent to their inbox
   * is treated as proof of email ownership.
   */
  async activateFirstLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        memberStatus: 'active',
      },
      include: {
        role: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
    });
  }
}