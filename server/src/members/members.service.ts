// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { ForbiddenException } from '@nestjs/common';

// @Injectable()
// export class MembersService {
//   constructor(private readonly prisma: PrismaService) {}

//   async listMembers(organizationId: string, userId: string) {
//     const membership = await this.prisma.organizationMember.findFirst({
//     where: { organizationId, userId, memberStatus: 'active' },
//   });

//   if (!membership) {
//     throw new ForbiddenException({
//       success: false,
//       message: 'You are not a member of this organization.',
//       error: { type: 'ForbiddenException' },
//     });
//   }
//     return this.prisma.organizationMember.findMany({
//       where: {
//         organizationId,
//       },
//        include: { user: true, role: true },
//     });
//   }

//   async inviteMember(organizationId: string, dto: any) {
//     return this.prisma.organizationMember.create({
//       data: {
//         email: dto.email,
//         roleId: dto.roleId,
//       },
//     });
//   }

    
//   }

//   async changeRole(organizationId: string, memberId: string, dto: any) {
//     return this.prisma.organizationMember.update({
//       where: {
//         id: memberId,
//       },
//       data: {
//         roleId: dto.roleId,
//       },
//     });
//   }

//   async changeStatus(organizationId: string, memberId: string, dto: any) {
//     return this.prisma.organizationMember.update({
//       where: {
//         id: memberId,
//       },
//       data: {
//         status: dto.status,
//       },
//     });
//   }

//   async removeMember(organizationId: string, memberId: string) {
//     return this.prisma.organizationMember.delete({
//       where: {
//         id: memberId,
//       },
//     });
//   }
// }