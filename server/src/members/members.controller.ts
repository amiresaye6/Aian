import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { ChangeMemberStatusDto } from './dto/change-member-status.dto';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGaurds } from '../roles_permissions/roles.gaurd';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('organizations/:organizationId/members')
@UseGuards(AuthGaurd, RolesGaurds)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequiredPermissions('members.read')
  @HttpCode(HttpStatus.OK)
  async listMembers(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.membersService.listMembers(organizationId, user.id);
  }

  @Post('invite')
  @RequiredPermissions('members.invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.membersService.inviteMember(organizationId, dto, user.id);
  }

  @Patch(':memberId/role')
  @RequiredPermissions('members.update_role')
  @HttpCode(HttpStatus.OK)
  async changeRole(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: ChangeMemberRoleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.membersService.changeRole(organizationId, memberId, dto, user.id);
  }

  @Patch(':memberId/status')
  @RequiredPermissions('members.update_status')
  @HttpCode(HttpStatus.OK)
  async changeStatus(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: ChangeMemberStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.membersService.changeStatus(organizationId, memberId, dto, user.id);
  }

  @Delete(':memberId')
  @RequiredPermissions('members.remove')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.membersService.removeMember(organizationId, memberId, user.id);
  }
}