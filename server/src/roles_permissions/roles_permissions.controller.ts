import { 
  Controller, 
  UseGuards, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  ParseUUIDPipe, 
  Delete
} from '@nestjs/common';
import { RolesPermissionsService } from './roles_permissions.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGuards } from './roles.guard';
import { CreateRoleDTO } from './dtos/create-role.dto';
import { UpdateRoleDTO } from './dtos/update-role.dto';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';

@UseGuards(AuthGaurd, RolesGuards)
@Controller('roles-permissions')
export class RolesPermissionsController {
  constructor(private readonly rolesPermissionsService: RolesPermissionsService) {}

  @RequiredPermissions('roles.read')
  @Get('role/:id')
  async getRoleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesPermissionsService.getRoleById(id);
  }

  @Get('permission/:id')
  async getPermissionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesPermissionsService.getPermissionById(id);
  }

  @RequiredPermissions('roles.read',"organization.read")
  @Get('organization')
  async getRolesByORG(@CurrentUser() user: any) {
    return this.rolesPermissionsService.getRolesByORG(user.organizationId);
  }

  @RequiredPermissions('roles.assign_permissions')
  @Post('assign')
  async assignRoleToUser(
    @CurrentUser() user: any,
    @Body('roleId', ParseUUIDPipe) roleId: string,
    @Body('employeeUserId', ParseUUIDPipe) employeeUserId: string,
  ) {
    return this.rolesPermissionsService.assignRoleToUser(roleId, user, employeeUserId);
  }

  @RequiredPermissions('roles.create')
  @Post('role')
  async createCustomRole(
    @CurrentUser() user: any,
    @Body() createRoleDto: CreateRoleDTO,
  ) {
    const { permissionIds, ...roleData } = createRoleDto;
    return this.rolesPermissionsService.createCustomRole(
      user.organizationId,
      roleData,
      permissionIds,
    );
  }

  @RequiredPermissions('roles.update')
  @Put('role/:id')
  async updateCustomRole(
    @Param('id', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: any,
    @Body() updateRoleDto: UpdateRoleDTO,
  ) {
    const { permissionIds = [], ...roleData } = updateRoleDto;
    return this.rolesPermissionsService.updateCustomRole(
      roleId,
      user.organizationId,
      roleData,
      permissionIds,
    );
  }

  @RequiredPermissions('roles.delete')
  @Delete('role/:id')
  async deleteRole(
    @Param('id', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: any
  ) {
    return this.rolesPermissionsService.deleteCustomRole(roleId, user.organizationId);
  }
}