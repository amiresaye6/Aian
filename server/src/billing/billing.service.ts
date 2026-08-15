import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BillingRepository } from './billing.repository';
import { PaymobService } from '../paymob/paymob.service';
import { QuotaService } from './quota.service';
import { PAYMOB_PROVIDER_NAME } from '../paymob/paymob.constants';
import { toPlanResponse, toPlanResponseList } from './mappers/plan.mapper';
import type { CheckoutDto } from './dto/checkout.dto';
import type {
  PlanResponse,
  CheckoutResult,
  PaymentVerificationResult,
  SubscriptionResponse,
} from './types/billing.types';
import type {
  PaymobCallbackPayload,
  PaymobPaymentStatus,
} from '../paymob/paymob.types';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly repository: BillingRepository,
    private readonly paymobService: PaymobService,
    private readonly quotaService: QuotaService,
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

  async getActiveSubscription(
    organizationId: string,
  ): Promise<SubscriptionResponse | null> {
    const subscription =
      await this.repository.findSubscriptionByOrganizationId(organizationId);
    if (!subscription) return null;

    return {
      id: subscription.id,
      organizationId: subscription.organizationId,
      planId: subscription.planId,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      paymentProvider: subscription.paymentProvider,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      pendingDowngradePlanId: subscription.pendingDowngradePlanId,
      gracePeriodEnd: subscription.gracePeriodEnd,
      overageHardCapCents: subscription.overageHardCapCents,
      plan: toPlanResponse(subscription.plan),
    };
  }

  // ─── Upgrade ──────────────────────────────────────────────────────────────

  /**
   * Upgrade takes effect immediately after payment confirmation.
   * Charges a prorated amount for the remainder of the cycle.
   * Does NOT change the billing anchor date.
   */
  async upgradePlan(organizationId: string, newPlanSlug: string) {
    const plan = await this.repository.findPlanBySlug(newPlanSlug);
    if (!plan) {
      throw new NotFoundException(`Plan "${newPlanSlug}" not found`);
    }

    const subscription =
      await this.repository.findSubscriptionByOrganizationId(organizationId);
    if (!subscription) {
      throw new BadRequestException('No active subscription found to upgrade');
    }

    const oldPlan = subscription.plan;
    const cycle = subscription.billingCycle;

    const oldPrice =
      cycle === 'yearly' ? oldPlan.yearlyPriceCents : oldPlan.monthlyPriceCents;
    const newPrice =
      cycle === 'yearly' ? plan.yearlyPriceCents : plan.monthlyPriceCents;

    if (newPrice <= oldPrice) {
      throw new BadRequestException(
        'New plan must be a higher tier. Use the downgrade endpoint for lower tiers.',
      );
    }

    // Calculate proration
    const now = new Date();
    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    if (!periodStart || !periodEnd) {
      throw new BadRequestException(
        'Subscription has no active billing period.',
      );
    }

    const totalDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const proratedAmount = Math.ceil(
      (newPrice - oldPrice) * (daysRemaining / totalDays),
    );

    if (proratedAmount <= 0) {
      // Period is about to end, just apply the upgrade immediately
      await this.repository.updateSubscriptionStatus(
        subscription.id,
        subscription.status,
        { planId: plan.id },
      );

      await this.repository.createLedgerEvent({
        organizationId,
        type: 'plan_upgrade',
        oldPlanId: oldPlan.id,
        newPlanId: plan.id,
        amountCents: 0,
        currency: plan.currency,
        description: `Upgrade from ${oldPlan.name} to ${plan.name} applied (no proration — period ending).`,
      });

      return {
        success: true,
        newPlan: plan.name,
        proratedAmountCents: 0,
        appliedImmediately: true,
      };
    }

    // Generate merchant order ID for upgrade payment
    const merchantOrderId = `AIAN-UPG-${subscription.id}-${uuidv4().slice(0, 8)}`;

    // Initiate Paymob payment for prorated amount
    const paymobResult = await this.paymobService.initiatePayment({
      amountCents: proratedAmount,
      currency: plan.currency,
      merchantOrderId,
    });

    // Create payment record tagged as upgrade
    const payment = await this.repository.createPaymentWithType({
      organizationId,
      subscriptionId: subscription.id,
      paymentProvider: PAYMOB_PROVIDER_NAME,
      providerPaymentId: merchantOrderId,
      amountCents: proratedAmount,
      currency: plan.currency,
      billingCycle: cycle,
      type: 'upgrade_proration',
      metadata: { targetPlanId: plan.id, oldPlanId: oldPlan.id },
    });

    // Record ledger event
    await this.repository.createLedgerEvent({
      organizationId,
      type: 'proration_charge',
      oldPlanId: oldPlan.id,
      newPlanId: plan.id,
      amountCents: proratedAmount,
      currency: plan.currency,
      description: `Upgrade from ${oldPlan.name} to ${plan.name}. Prorated charge: $${(proratedAmount / 100).toFixed(2)} for ${daysRemaining} remaining days.`,
      paymentId: payment.id,
    });

    this.logger.log(
      `Upgrade checkout initiated — Payment: ${payment.id}, Prorated: ${proratedAmount}c, Plan: ${oldPlan.name} → ${plan.name}`,
    );

    return {
      success: true,
      paymentUrl: paymobResult.paymentUrl,
      paymentId: payment.id,
      orderId: paymobResult.orderId,
      proratedAmountCents: proratedAmount,
      newPlan: plan.name,
    };
  }

  // ─── Downgrade ─────────────────────────────────────────────────────────────

  /**
   * Schedules a downgrade for the end of the current billing cycle.
   * Validates that current usage fits within the target plan's limits.
   */
  async schedulePlanDowngrade(organizationId: string, newPlanSlug: string) {
    const plan = await this.repository.findPlanBySlug(newPlanSlug);
    if (!plan) {
      throw new NotFoundException(`Plan "${newPlanSlug}" not found`);
    }

    const subscription =
      await this.repository.findSubscriptionByOrganizationId(organizationId);
    if (!subscription) {
      throw new BadRequestException(
        'No active subscription found to downgrade',
      );
    }

    if (subscription.pendingDowngradePlanId) {
      throw new BadRequestException(
        'A downgrade is already scheduled. Cancel it first before scheduling a new one.',
      );
    }

    const oldPlan = subscription.plan;
    const cycle = subscription.billingCycle;

    const oldPrice =
      cycle === 'yearly' ? oldPlan.yearlyPriceCents : oldPlan.monthlyPriceCents;
    const newPrice =
      cycle === 'yearly' ? plan.yearlyPriceCents : plan.monthlyPriceCents;

    if (newPrice >= oldPrice) {
      throw new BadRequestException(
        'New plan must be a lower tier. Use the upgrade endpoint for higher tiers.',
      );
    }

    // Pre-downgrade validation — check current usage against target plan limits
    const storageQuota =
      await this.quotaService.checkStorageQuota(organizationId);
    if (storageQuota.used > plan.storageLimitMb) {
      throw new BadRequestException(
        `Cannot schedule downgrade: current storage usage (${Math.ceil(storageQuota.used)}MB) ` +
          `exceeds the ${plan.name} plan's limit (${plan.storageLimitMb}MB). ` +
          `Please reduce your stored data before downgrading.`,
      );
    }

    const memberQuota =
      await this.quotaService.checkMemberQuota(organizationId);
    if (memberQuota.used > plan.maxMembers) {
      throw new BadRequestException(
        `Cannot schedule downgrade: current member count (${memberQuota.used}) ` +
          `exceeds the ${plan.name} plan's limit (${plan.maxMembers}). ` +
          `Please remove members before downgrading.`,
      );
    }

    // Schedule the downgrade
    await this.repository.setScheduledDowngrade(subscription.id, plan.id);

    // Record ledger event
    await this.repository.createLedgerEvent({
      organizationId,
      type: 'plan_downgrade_scheduled',
      oldPlanId: oldPlan.id,
      newPlanId: plan.id,
      description:
        `Downgrade from ${oldPlan.name} to ${plan.name} scheduled for ` +
        `end of current billing period (${subscription.currentPeriodEnd?.toISOString()}).`,
    });

    this.logger.log(
      `Downgrade scheduled — Org: ${organizationId}, Plan: ${oldPlan.name} → ${plan.name}`,
    );

    return {
      success: true,
      message: `Downgrade to ${plan.name} scheduled. You will keep your current plan limits until ${subscription.currentPeriodEnd?.toISOString()}.`,
      effectiveDate: subscription.currentPeriodEnd,
      currentPlan: oldPlan.name,
      targetPlan: plan.name,
    };
  }

  /**
   * Cancel a previously scheduled downgrade.
   */
  async cancelScheduledDowngrade(organizationId: string) {
    const subscription =
      await this.repository.findSubscriptionByOrganizationId(organizationId);
    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    if (!subscription.pendingDowngradePlanId) {
      throw new BadRequestException('No downgrade is currently scheduled.');
    }

    await this.repository.clearScheduledDowngrade(subscription.id);

    this.logger.log(
      `Downgrade cancelled — Org: ${organizationId}`,
    );

    return {
      success: true,
      message: 'Scheduled downgrade has been cancelled.',
    };
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

    if (payment.status === 'paid') {
      this.logger.log(
        `Payment ${payment.id} already processed as paid. Ignoring duplicate webhook.`,
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
      await this.handleSuccessfulPayment(payment);
    } else if (paymentStatus === 'failed') {
      await this.handleFailedPayment(payment);
    }
  }

  /**
   * Handles a successful payment — dispatches to the correct handler
   * based on payment type (subscription, upgrade, overage).
   */
  private async handleSuccessfulPayment(payment: {
    id: string;
    organizationId: string;
    subscriptionId: string;
    billingCycle: string;
    type: string;
    metadata: any;
  }) {
    const metadata = (payment.metadata as Record<string, any>) ?? {};

    // Record ledger event
    await this.repository.createLedgerEvent({
      organizationId: payment.organizationId,
      type: 'payment_success',
      amountCents: undefined,
      description: `Payment ${payment.id} succeeded (type: ${payment.type}).`,
      paymentId: payment.id,
    });

    if (payment.type === 'upgrade_proration') {
      // Apply upgrade immediately — change plan, keep billing period
      const targetPlanId = metadata.targetPlanId;
      if (targetPlanId) {
        await this.repository.updateSubscriptionStatus(
          payment.subscriptionId,
          'active',
          { planId: targetPlanId },
        );

        // Clear grace period if any
        await this.repository.clearGracePeriod(payment.subscriptionId);

        const targetPlan = await this.repository.findPlanById(targetPlanId);
        this.logger.log(
          `Upgrade applied — Subscription ${payment.subscriptionId} now on plan: ${targetPlan?.name}`,
        );
      }
    } else {
      // Regular subscription or renewal payment — advance billing period
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

      // Clear grace period if any
      await this.repository.clearGracePeriod(payment.subscriptionId);

      this.logger.log(
        `Payment successful — Subscription ${payment.subscriptionId} activated until ${periodEnd.toISOString()}`,
      );
    }

    await this.repository.updateOrganizationStatus(
      payment.organizationId,
      'active',
    );
  }

  /**
   * Handles a failed payment — enters grace period.
   */
  private async handleFailedPayment(payment: {
    id: string;
    organizationId: string;
    subscriptionId: string;
    type: string;
  }) {
    if (payment.type === 'upgrade_proration') {
      this.logger.warn(
        `Upgrade payment failed — Payment: ${payment.id}. Subscription ${payment.subscriptionId} remains on current plan without changes.`,
      );
      
      await this.repository.createLedgerEvent({
        organizationId: payment.organizationId,
        type: 'payment_failed',
        description: `Upgrade payment ${payment.id} failed. Subscription remains active on the current plan.`,
        paymentId: payment.id,
      });
      return;
    }

    const GRACE_PERIOD_DAYS = 3;
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    await this.repository.setGracePeriod(
      payment.subscriptionId,
      gracePeriodEnd,
    );

    await this.repository.createLedgerEvent({
      organizationId: payment.organizationId,
      type: 'grace_period_started',
      description: `Payment ${payment.id} failed. Grace period until ${gracePeriodEnd.toISOString()}.`,
      paymentId: payment.id,
    });

    this.logger.log(
      `Payment failed — Subscription ${payment.subscriptionId} entered grace period until ${gracePeriodEnd.toISOString()}`,
    );
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

  // ─── Redirect Resolution ───────────────────────────────────────────────────

  async resolveRedirectUrl(
    providerPaymentId: string,
    successStr: string,
  ): Promise<string> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const success = successStr === 'true';

    const payment =
      await this.repository.findPaymentByProviderPaymentId(providerPaymentId);

    if (!payment) {
      // Fallback if payment not found
      return `${frontendUrl}/dashboard/billing?payment=${success ? 'success' : 'failed'}`;
    }

    if (payment.type === 'upgrade_proration') {
      // Existing user upgrading
      return `${frontendUrl}/dashboard/billing?payment=${success ? 'success' : 'failed'}`;
    } else {
      // Initial checkout/subscription
      return `${frontendUrl}/payment-result?merchant_order_id=${providerPaymentId}`;
    }
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
  async updateHardCap(organizationId: string, overageHardCapCents: number | null) {
    const activeSub = await this.repository.findSubscriptionByOrganizationId(organizationId);
    if (!activeSub) {
      throw new BadRequestException('Organization does not have an active subscription.');
    }

    const updatedSub = await this.repository.updateHardCap(organizationId, overageHardCapCents);

    this.logger.log(
      `Updated overage hard cap for organization ${organizationId} to ${overageHardCapCents} cents`,
    );

    return { success: true, data: updatedSub };
  }
}
