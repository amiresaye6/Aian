import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { AiUsageService } from '../ai/ai-usage.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AuthGaurd } from '../auth/auth.gaurd';
import type { PaymobCallbackPayload } from '../paymob/paymob.types';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  @Get('plans')
  // @UseGuards(AuthGaurd)
  @HttpCode(HttpStatus.OK)
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('plans/:slug')
  // @UseGuards(AuthGaurd)
  @HttpCode(HttpStatus.OK)
  async getPlanBySlug(@Param('slug') slug: string) {
    return this.billingService.getPlanBySlug(slug);
  }

  @Post('checkout')
  @RequiredPermissions('billing.manage')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() dto: CheckoutDto) {
    return this.billingService.checkout(dto);
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: PaymobCallbackPayload) {
    this.logger.log('Received billing webhook');
    await this.billingService.handleWebhook(payload);
    return { received: true };
  }

  @Get('verify/:providerPaymentId')
  // @UseGuards(AuthGaurd)
  @RequiredPermissions('billing.manage')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Param('providerPaymentId') providerPaymentId: string) {
    return this.billingService.verifyPayment(providerPaymentId);
  }

  @Get('subscription')
  @UseGuards(AuthGaurd)
  @RequiredPermissions('billing.manage')
  async getSubscription(@Query('organizationId') organizationId: string) {
    return this.billingService.getActiveSubscription(organizationId);
  }

  @Get('usage/logs')
  @UseGuards(AuthGaurd)
  @RequiredPermissions('billing.manage')
  async getUsageLogs(
    @Query('organizationId') organizationId: string,
    @Query('feature') feature?: string,
    @Query('modelUsed') modelUsed?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.aiUsageService.getUsageLogs(
      organizationId,
      { feature, modelUsed, fromDate, toDate },
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      { sortBy, sortOrder },
    );
  }

  @Get('usage/summary')
  @UseGuards(AuthGaurd)
  @RequiredPermissions('billing.manage')
  async getUsageSummary(
    @Query('organizationId') organizationId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.aiUsageService.getUsageSummary(organizationId, {
      fromDate,
      toDate,
    });
  }
}
