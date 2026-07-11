import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymobModule } from '../paymob/paymob.module';

@Module({
  imports: [PrismaModule, PaymobModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository],
  exports: [BillingService],
})
export class BillingModule {}
