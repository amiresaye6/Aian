import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesGuards implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request['user'];
    const [roleId, role] = [user.roleId, user.role];
    const handler = context.getHandler();

    if (role == 'Owner') return true;

    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      handler,
    );
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const rolesPermission = await this.prismaService.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          select: {
            key: true,
          },
        },
      },
    });

    const rolesPermissionsKeys = rolesPermission.map((rp) => rp.permission.key);
    const hasRequieredPermissions = requiredPermissions.every((p) =>
      rolesPermissionsKeys.includes(p),
    );
    if (hasRequieredPermissions) return true;

    throw new ForbiddenException("you don't have the required permissions");
  }
}
