import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGaurd implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,

          roleId: true,
          role: {
            select: {
              id: true,
              key: true,
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      id: true,
                      key: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },

          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },

          isSuperAdmin: true,
        },
      });

      if(!user){
        throw new UnauthorizedException({
          success: false,
          error: 'Invalid or expired token',
        });
      }
      const data = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,

        roleId: user.roleId,
        role: user.role?.name,

        organizationId: user.organizationId,
        organization: user.organization?.name,

        organizationLogo: user.organization?.logoUrl,

        isSuperAdmin: user.isSuperAdmin,

        iat: payload.iat,
        exp: payload.exp,
      };

      request['user'] = data;
      return true;
    } catch (error) {
      throw new UnauthorizedException({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  }
}
