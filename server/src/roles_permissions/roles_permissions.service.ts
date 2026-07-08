import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { Permission, Role, User } from '@prisma/client';
import { error } from 'console';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class RolesPermissionsService {
    constructor(
        private readonly prismaService:PrismaService,
        private readonly usersServices:UsersService
    ){}

    async getRoleById(id:string){
        const role= await this.prismaService.role.findUnique({
            where:{id},
            include:{
                permissions:{
                    include:{
                        permission:true
                    }
                }
            }
        });
        if(!role){
            throw new NotFoundException("role not found")
        }
        return role;
    }

    async getPermissionById(id:string){
        const role= await this.prismaService.permission.findUnique({where:{id}});
        if(!role){
            throw new NotFoundException("permission not found")
        }
        return role;
    }

    async getRolesByORG(id:string){
        const roles = await this.prismaService.role.findMany({
            where: {
                OR: [
                    { organizationId: id },
                    { isSystemRole: true }
                ]
            },
            include:{
                users:{
                    where:{organizationId:id},
                    select:{
                        id:true,
                        fullName:true,
                        email:true,
                    }
                }
            }
        });
        return roles;
    }

    async assignRoleToUser(roleId:string,currentUser:Partial<User>&{role?:string},employeeUserId:string){
        const employee = await this.usersServices.findOneById(employeeUserId);
        if(currentUser.organizationId!==employee.organizationId){
            throw new ForbiddenException("this employee doesn't belong to your organization")
        }

        const role=await this.getRoleById(roleId);
        if(!role.isSystemRole && role.organizationId !== currentUser.organizationId){
            throw new ForbiddenException("this role doesn't belong to your organization")
        }
        
        if((role.name=='Admin' || role.name=='Owner') && currentUser.role!=="Owner"){
            throw new BadRequestException('Only Owner of the organization can assign role admin or owner to users')
        }
        
        const user= await this.usersServices.updateUser(employeeUserId,{roleId})
        return user;
    }

    async createCustomRole(orgId: string, roleData: Partial<Role>, permissionIds: string[]) {
        if (!roleData.key || !roleData.name || !orgId) {
            throw new BadRequestException("invalid new role's data")
        }

        for (const pId of permissionIds) {
            await this.getPermissionById(pId);
        }
        
        return await this.prismaService.$transaction(async (tx) => {
            const role = await tx.role.create({
                data: {
                    key: roleData.key!,
                    name: roleData.name!,
                    description: roleData.description || null,
                    organizationId: orgId,
                    isSystemRole: false
                }
            });

            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map(pId => ({
                        roleId: role.id,
                        permissionId: pId
                    }))
                });
            }

            return role;
        });
    }

    async updateCustomRole(roleId: string, orgId: string, roleData: Partial<Role>, permissionIds: string[]) {        
        const role = await this.getRoleById(roleId);
        if (role.isSystemRole || role.organizationId !== orgId) {
            throw new ForbiddenException("this role doesn't belong to your organization");
        }

        for (const pId of permissionIds) {
            await this.getPermissionById(pId);
        }

        return await this.prismaService.$transaction(async (tx) => {
            const updatedRole = await tx.role.update({
                where: { id: roleId },
                data: {
                    name: roleData.name || role.name,
                    description: roleData.description !== undefined ? roleData.description : role.description
                }
            });

            await tx.rolePermission.deleteMany({ where: { roleId } });

            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map(pId => ({
                        roleId,
                        permissionId: pId
                    }))
                });
            }

            return updatedRole;
        });
    }

    async deleteCustomRole(roleId: string, currentUserOrgId: string) {
        const role = await this.getRoleById(roleId);

        if (role.isSystemRole || role.organizationId !== currentUserOrgId) {
            throw new ForbiddenException("This role doesn't belong to your organization or cannot be deleted");
        }

        const assignedUsersCount = await this.prismaService.user.count({
            where: { roleId: roleId }
        });

        if (assignedUsersCount > 0) {
            throw new BadRequestException("Cannot delete this role because it is currently assigned to one or more users");
        }

        return await this.prismaService.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({
                where: { roleId: roleId }
            });

            return await tx.role.delete({
                where: { id: roleId }
            });
        });
    }
}
