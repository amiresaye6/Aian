import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymobModule } from '../paymob/paymob.module';
import { QuotaService } from './quota.service';
import { BillingCronService } from './billing.cron';

@Module({
  imports: [PrismaModule, PaymobModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingRepository,
    QuotaService,
    BillingCronService,
  ],
  exports: [BillingService, QuotaService],
})
export class BillingModule {}
