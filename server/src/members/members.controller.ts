import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MembersService } from './members.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { ChangeMemberStatusDto } from './dto/change-member-status.dto';


@Controller('organizations/:organizationId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  // @requiredPermissions('members.list')
  async listMembers(@Param('organizationId') organizationId: string, @CurrentUser() user: { id: string },) {
    return this.membersService.listMembers(organizationId, user.id);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.inviteMember(organizationId, dto);
  }

  @Patch(':memberId/role')
  @HttpCode(HttpStatus.OK)
  async changeRole(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.membersService.changeRole(organizationId, memberId, dto);
  }

  @Patch(':memberId/status')
  @HttpCode(HttpStatus.OK)
  async changeStatus(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: ChangeMemberStatusDto,
  ) {
    return this.membersService.changeStatus(organizationId, memberId, dto);
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.removeMember(organizationId, memberId);
  }
}