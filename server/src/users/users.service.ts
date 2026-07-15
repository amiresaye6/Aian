import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'
import { User, UserStatus } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

    async create(fullName:string, email:string, passwordHash:string,status:UserStatus,otpHash:string,otpExpiresAt:Date,roleName='owner'){
        const role = await this.prismaService.role.findFirst({where:{key:roleName}});
        const user = await this.prismaService.user.create({
            data:{fullName,
                    email,
                    passwordHash,
                    status,
                    otpHash,
                    otpExpiresAt,
                    roleId: role?.id
                }
            });
        return user;
    }

  async findOneById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
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
    if (!user) {
      throw new Error('user not found');
    }
    return user;
  }

  async findOneByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
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
  }

  async findAll() {
    const users = await this.prismaService.user.findMany();
    return users;
  }

  async updateUser(id: string, data: Partial<User>) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('user not found');
    }
    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data,
    });
    return updatedUser;
  }

  async delete(id: string) {
    const deletedUser = await this.prismaService.user.delete({ where: { id } });
    if (!deletedUser) {
      throw new Error('user not found');
    }
    return { deletedUser };
  }
}
