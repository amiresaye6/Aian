import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  planSlug: string;

  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;

  @IsString()
  @IsNotEmpty()
  organizationId: string;
}

export class CheckoutResponseDto {
  paymentUrl: string;
  paymentId: string;
  orderId: number;
}
