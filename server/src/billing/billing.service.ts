import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BillingRepository } from './billing.repository';
import { PaymobService } from '../paymob/paymob.service';
import { PAYMOB_PROVIDER_NAME } from '../paymob/paymob.constants';
import { toPlanResponse, toPlanResponseList } from './mappers/plan.mapper';
import type { CheckoutDto } from './dto/checkout.dto';
import type {
  PlanResponse,
  CheckoutResult,
  PaymentVerificationResult,
} from './types/billing.types';
import type { PaymobCallbackPayload, PaymobPaymentStatus } from '../paymob/paymob.types';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly repository: BillingRepository,
    private readonly paymobService: PaymobService,
  ) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  async getPlans(): Promise<PlanResponse[]> {
    const plans = await this.repository.findActivePlans();
    return toPlanResponseList(plans);
  }

  async getPlanBySlug(slug: string): Promise<PlanResponse> {
    const plan = await this.repository.findPlanBySlug(slug);
    if (!plan) {
      throw new NotFoundException(`Plan "${slug}" not found`);
    }
    return toPlanResponse(plan);
  }

  // ─── Checkout ──────────────────────────────────────────────────────────────

  async checkout(dto: CheckoutDto): Promise<CheckoutResult> {
    const plan = await this.repository.findPlanBySlug(dto.planSlug);
    if (!plan) {
      throw new NotFoundException(`Plan "${dto.planSlug}" not found`);
    }

    const amountCents =
      dto.billingCycle === 'yearly'
        ? plan.yearlyPriceCents
        : plan.monthlyPriceCents;

    // Check for existing subscription
    const existing = await this.repository.findSubscriptionByOrganizationId(
      dto.organizationId,
    );

    // Create or reuse subscription
    const subscription = existing
      ? existing
      : await this.repository.createSubscription({
          organizationId: dto.organizationId,
          planId: plan.id,
          billingCycle: dto.billingCycle,
          paymentProvider: PAYMOB_PROVIDER_NAME,
        });

    // Generate a unique merchant order ID
    const merchantOrderId = `AIAN-${subscription.id}-${uuidv4().slice(0, 8)}`;

    // Initiate Paymob payment
    const paymobResult = await this.paymobService.initiatePayment({
      amountCents,
      currency: plan.currency,
      merchantOrderId,
    });

    // Create payment record
    const payment = await this.repository.createPayment({
      organizationId: dto.organizationId,
      subscriptionId: subscription.id,
      paymentProvider: PAYMOB_PROVIDER_NAME,
      providerPaymentId: merchantOrderId,
      amountCents,
      currency: plan.currency,
      billingCycle: dto.billingCycle,
    });

    this.logger.log(
      `Checkout initiated — Payment: ${payment.id}, Order: ${paymobResult.orderId}`,
    );

    return {
      paymentUrl: paymobResult.paymentUrl,
      paymentId: payment.id,
      orderId: paymobResult.orderId,
    };
  }

  // ─── Webhook Handler ──────────────────────────────────────────────────────

  async handleWebhook(payload: PaymobCallbackPayload): Promise<void> {
    const result = this.paymobService.verifyWebhookCallback(payload);

    this.logger.log(
      `Processing webhook — MerchantOrder: ${result.merchantOrderId}, Status: ${result.status}`,
    );

    const payment = await this.repository.findPaymentByProviderPaymentId(
      result.merchantOrderId,
    );

    if (!payment) {
      this.logger.warn(
        `Payment not found for merchant order: ${result.merchantOrderId}`,
      );
      return;
    }

    // Map Paymob status to our PaymentStatus enum
    const paymentStatus = this.mapPaymobStatus(result.status);

    // Update payment
    await this.repository.updatePaymentStatus(
      result.merchantOrderId,
      paymentStatus,
      payload.obj as unknown as Prisma.InputJsonObject,
    );

    // Update subscription and organization based on payment status
    if (paymentStatus === 'paid') {
      const now = new Date();
      const periodEnd = new Date(now);
      if (payment.billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await this.repository.updateSubscriptionStatus(
        payment.subscriptionId,
        'active',
        {
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      );

      await this.repository.updateOrganizationStatus(
        payment.organizationId,
        'active',
      );

      this.logger.log(
        `Payment successful — Subscription ${payment.subscriptionId} activated`,
      );
    } else if (paymentStatus === 'failed') {
      this.logger.log(
        `Payment failed — Subscription ${payment.subscriptionId} remains pending`,
      );
      
    }
  }

  // ─── Verify Payment ────────────────────────────────────────────────────────

  async verifyPayment(
    providerPaymentId: string,
  ): Promise<PaymentVerificationResult> {
    const payment =
      await this.repository.findPaymentByProviderPaymentId(providerPaymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      status: payment.status,
      paymentId: payment.id,
      subscriptionId: payment.subscriptionId,
      planName: payment.subscription.plan.name,
      billingCycle: payment.billingCycle,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paidAt: payment.paidAt,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private mapPaymobStatus(
    paymobStatus: PaymobPaymentStatus,
  ): 'pending' | 'paid' | 'failed' {
    switch (paymobStatus) {
      case 'paid':
        return 'paid';
      case 'pending':
        return 'pending';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
