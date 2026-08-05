import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AuthGaurd } from '../auth/auth.gaurd';

@Controller('admin')
@UseGuards(AuthGaurd, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizations')
  async getOrganizations() {
    const data = await this.adminService.getOrganizations();
    return { success: true, data };
  }

  @Get('organizations/:id')
  async getOrganizationDetails(@Param('id') id: string) {
    const data = await this.adminService.getOrganizationDetails(id);
    return { success: true, data };
  }

  @Patch('organizations/:id/status')
  async updateOrganizationStatus(
    @Param('id') id: string,
    @Body('status') status: 'pending_connections' | 'active' | 'suspended',
  ) {
    const data = await this.adminService.updateOrganizationStatus(id, status);
    return { success: true, data };
  }

  @Get('revenue')
  async getRevenue() {
    const data = await this.adminService.getRevenueMetrics();
    return { success: true, data };
  }

  @Get('alerts')
  async getAlerts() {
    const data = await this.adminService.getAlerts();
    return { success: true, data };
  }
}
