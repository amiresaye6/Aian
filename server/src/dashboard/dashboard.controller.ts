import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGaurd } from '../auth/auth.gaurd';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('owner')
  @UseGuards(AuthGaurd)
  @HttpCode(HttpStatus.OK)
  async getOwnerDashboard(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getOwnerDashboard(user.id);
  }
}
