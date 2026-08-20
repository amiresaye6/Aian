import { Controller, Get, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
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

  @Get('transactions/logs')
  async getAllTransactionsLogs(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('type') type: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc'
  ) {
    const data = await this.adminService.getAllTransactionsLogs(
      { status, type, fromDate, toDate },
      { page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 10 },
      { sortBy, sortOrder }
    );
    return { success: true, data };
  }

  @Get('transactions/summary')
  async getAllTransactionsSummary(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    const data = await this.adminService.getAllTransactionsSummary({ fromDate, toDate });
    return { success: true, data };
  }
}
