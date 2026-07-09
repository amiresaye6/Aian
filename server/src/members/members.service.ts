import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { InviteMemberDto } from './dto/invite-member.dto';
import{ChangeMemberRoleDto} from './dto/change-member-role.dto';
import {ChangeMemberStatusDto} from './dto/change-member-status.dto'
@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private async assertMembership(organizationId: string, userId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!requester || requester.organizationId !== organizationId) {
      throw new ForbiddenException({
        success: false,
        message: 'You are not a member of this organization.',
        error: { type: 'ForbiddenException' },
      });
    }
  }

  private generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    const pick = (chars: string) => chars[randomInt(chars.length)];

    let password =
      pick(upper) + pick(lower) + pick(digits) + pick(special);

    for (let i = password.length; i < 12; i++) {
      password += pick(all);
    }
    return password
      .split('')
      .sort(() => randomInt(2) - 0.5)
      .join('');
  }

  async listMembers(organizationId: string, userId: string) {
    await this.assertMembership(organizationId, userId);

    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        memberStatus: true,
        joinedAt: true,
        createdAt: true,
        role: { select: { id: true, key: true, name: true } },
      },
    });
  }

  async inviteMember(organizationId: string,dto: InviteMemberDto,invitedByUserId: string,) {
    await this.assertMembership(organizationId, invitedByUserId);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException({
        success: false,
        message: 'A user with this email already exists.',
        error: { type: 'ConflictException' },
      });
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
    if (!role) {
      throw new NotFoundException({
        success: false,
        message: 'Role not found for this organization.',
        error: { type: 'NotFoundException' },
      });
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const newMember = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        status: 'active',
        organizationId,
        roleId: dto.roleId,
        memberStatus: 'invited',
        invitedByUserId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        memberStatus: true,
        createdAt: true,
        role: { select: { id: true, key: true, name: true } },
      },
    });

    await this.emailService.sendBrandedEmail(
      dto.email,
      'You have been invited to join Aian',
      `<h2>Welcome to Aian, ${dto.fullName}!</h2>
       <p>You've been invited to join an organization on Aian.</p>
       <p><strong>Email:</strong> ${dto.email}</p>
       <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
       <p>Please log in and change your password as soon as possible.</p>
       <a href="http://localhost:3000/login" class="btn">Login Now</a>`,
    );

    return newMember;
  }

  async changeRole(organizationId: string,memberId: string,dto: ChangeMemberRoleDto,requesterId: string,) {
  await this.assertMembership(organizationId, requesterId);

  const targetMember = await this.prisma.user.findFirst({
    where: { id: memberId, organizationId },
  });
  if (!targetMember) {
    throw new NotFoundException({
      success: false,
      message: 'Member not found in this organization.',
      error: { type: 'NotFoundException' },
    });
  }

  const newRole = await this.prisma.role.findFirst({
    where: {
      id: dto.roleId,
      OR: [{ organizationId: null }, { organizationId }],
    },
  });
  if (!newRole) {
    throw new NotFoundException({
      success: false,
      message: 'Role not found for this organization.',
      error: { type: 'NotFoundException' },
    });
  }

  // Rule from sprint doc: Owner role can't be assigned by non-Owners.
  if (newRole.key === 'owner') {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: { select: { key: true } } },
    });
    if (requester?.role?.key !== 'owner') {
      throw new ForbiddenException({
        success: false,
        message: 'Only the current Owner can assign the Owner role.',
        error: { type: 'ForbiddenException' },
      });
    }
  }

  return this.prisma.user.update({
    where: { id: memberId },
    data: { roleId: dto.roleId },
    select: {
      id: true,
      fullName: true,
      email: true,
      memberStatus: true,
      role: { select: { id: true, key: true, name: true } },
    },
  });
}

  async changeStatus(organizationId: string,memberId: string,dto: ChangeMemberStatusDto,requesterId: string,) {
  await this.assertMembership(organizationId, requesterId);

  if (memberId === requesterId) {
    throw new ForbiddenException({
      success: false,
      message: 'You cannot change your own membership status.',
      error: { type: 'ForbiddenException' },
    });
  }

  const targetMember = await this.prisma.user.findFirst({
    where: { id: memberId, organizationId },
  });
  if (!targetMember) {
    throw new NotFoundException({
      success: false,
      message: 'Member not found in this organization.',
      error: { type: 'NotFoundException' },
    });
  }

  return this.prisma.user.update({
    where: { id: memberId },
    data: { memberStatus: dto.status },
    select: {
      id: true,
      fullName: true,
      email: true,
      memberStatus: true,
      role: { select: { id: true, key: true, name: true } },
    },
  });
}

  async removeMember(organizationId: string,memberId: string,requesterId: string,) {
  await this.assertMembership(organizationId, requesterId);

  if (memberId === requesterId) {
    throw new ForbiddenException({
      success: false,
      message: 'You cannot remove yourself from the organization.',
      error: { type: 'ForbiddenException' },
    });
  }

  const targetMember = await this.prisma.user.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true, role: { select: { key: true } } },
  });
  if (!targetMember) {
    throw new NotFoundException({
      success: false,
      message: 'Member not found in this organization.',
      error: { type: 'NotFoundException' },
    });
  }

  if (targetMember.role?.key === 'owner') {
    const ownerCount = await this.prisma.user.count({
      where: { organizationId, role: { key: 'owner' } },
    });
    if (ownerCount <= 1) {
      throw new ForbiddenException({
        success: false,
        message: 'Cannot remove the only Owner of the organization.',
        error: { type: 'ForbiddenException' },
      });
    }
  }

  await this.prisma.user.update({
    where: { id: memberId },
    data: {
      organizationId: null,
      roleId: null,
      memberStatus: null,
    },
  });

  return { id: memberId, removed: true };
}
}