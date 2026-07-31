import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuthGaurd } from '../../auth/auth.gaurd';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { RequiredPermissions } from '../../decorators/required-permissions.decorator';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('audit-logs')
@UseGuards(AuthGaurd)
// Requiring owner or admin roles for audit access as agreed
@RequiredPermissions('owner', 'admin')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getAuditLogs(
    @CurrentUser() user: any,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditLogService.findAll(user.organizationId, query);
  }

  @Get('analytics')
  async getAnalytics(@CurrentUser() user: any) {
    const data = await this.auditLogService.getAnalytics(user.organizationId);
    return { success: true, data };
  }
}
