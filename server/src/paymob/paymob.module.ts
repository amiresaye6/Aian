import { Module } from '@nestjs/common';
import { PaymobService } from './paymob.service';
import { PaymobController } from './paymob.controller';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [CurrencyModule],
  controllers: [PaymobController],
  providers: [PaymobService],
  exports: [PaymobService],
})
export class PaymobModule {}
