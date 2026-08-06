import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { EyesService } from './eyes.service';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGuards } from '../roles_permissions/roles.guard';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';

@Controller('')
@UseGuards(AuthGaurd, RolesGuards)
export class EyesController {
  constructor(private readonly eyesService: EyesService) {}

  @RequiredPermissions('eyes.read')
  @Get('organizations/:organizationId/eyes')
  async findAll(@Param('organizationId') organizationId: string) {
    return this.eyesService.findAll(organizationId);
  }

  @RequiredPermissions('eyes.read')
  @Get('organizations/:organizationId/eyes/:eyeType')
  async findOne(
    @Param('organizationId') organizationId: string,
    @Param('eyeType') eyeType: string,
  ) {
    return this.eyesService.findOne(organizationId, eyeType);
  }

  @RequiredPermissions('eyes.manage')
  @Post('organizations/:organizationId/eyes/:eyeType/request-connection')
  async requestConnection(
    @Param('organizationId') organizationId: string,
    @Param('eyeType') eyeType: string,
  ) {
    return this.eyesService.requestConnection(organizationId, eyeType);
  }

  @RequiredPermissions('eyes.read')
  @Get('eyes/catalog')
  async getCatalog() {
    return this.eyesService.getCatalog();
  }
}
