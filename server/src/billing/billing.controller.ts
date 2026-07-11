import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AuthGaurd } from '../auth/auth.gaurd';
import type { PaymobCallbackPayload } from '../paymob/paymob.types';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  
  @Get('plans')
  // @UseGuards(AuthGaurd)
  async getPlans() {
    return this.billingService.getPlans();
  }

  
  @Get('plans/:slug')
  // @UseGuards(AuthGaurd)
  async getPlanBySlug(@Param('slug') slug: string) {
    return this.billingService.getPlanBySlug(slug);
  }

  
  @Post('checkout')
  // @UseGuards(AuthGaurd)
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
  async verifyPayment(
    @Param('providerPaymentId') providerPaymentId: string,
  ) {
    return this.billingService.verifyPayment(providerPaymentId);
  }
}
