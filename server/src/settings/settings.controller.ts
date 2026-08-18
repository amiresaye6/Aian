import {
  Controller,
  Patch,
  Delete,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGuards } from '../roles_permissions/roles.guard';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('settings')
@UseGuards(AuthGaurd, RolesGuards)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  private getOrgId(user: any): string {
    if (!user?.organizationId) {
      throw new NotFoundException(
        'User is not associated with any organization.',
      );
    }
    return user.organizationId;
  }

  @RequiredPermissions('organization.update')
  @Patch('organization')
  async patchOrganization(
    @CurrentUser() user: any,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const orgId = this.getOrgId(user);
    return await this.settingsService.patchOrganization(orgId, dto);
  }

  @RequiredPermissions('organization.delete')
  @Delete('organization')
  async deleteOrganization(@CurrentUser() user: any) {
    const orgId = this.getOrgId(user);
    return await this.settingsService.deleteOrganization(orgId);
  }
}
