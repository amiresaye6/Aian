import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PaymobService } from './paymob.service';
import type { PaymobCallbackPayload } from './paymob.types';

@Controller('paymob')
export class PaymobController {
  private readonly logger = new Logger(PaymobController.name);

  constructor(private readonly paymobService: PaymobService) {}

  @Post('webhook')
  async handleWebhook(@Body() payload: PaymobCallbackPayload) {
    this.logger.log(
      `Received Paymob webhook for transaction: ${payload.obj?.id}`,
    );
    const result = this.paymobService.verifyWebhookCallback(payload);
    return { received: true, status: result.status };
  }
}
