import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from './quota.service';
import { BillingRepository } from './billing.repository';
import { PaymobService } from '../paymob/paymob.service';
import { PAYMOB_PROVIDER_NAME } from '../paymob/paymob.constants';
import { v4 as uuidv4 } from 'uuid';

/** Grace period duration in days before downgrading to Free Trial */
const GRACE_PERIOD_DAYS = 3;

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly repository: BillingRepository,
    private readonly paymobService: PaymobService,
  ) {}

  /**
   * Daily billing cycle check — runs the full renewal sequence:
   * 1. Expire grace periods (downgrade to Free Trial)
   * 2. Apply scheduled downgrades
   * 3. Process subscription renewals
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBillingCycle() {
    this.logger.log('Running daily billing cycle check...');
    const now = new Date();

    await this.handleExpiredGracePeriods(now);
    await this.handleScheduledDowngrades(now);
    await this.handleSubscriptionRenewals(now);

    this.logger.log('Daily billing cycle check completed.');
  }

  // ─── Step 1: Expired Grace Periods ────────────────────────────────────────

  private async handleExpiredGracePeriods(now: Date) {
    const expiredSubs =
      await this.repository.findSubscriptionsInExpiredGracePeriod(now);

    if (expiredSubs.length === 0) return;

    this.logger.log(
      `Found ${expiredSubs.length} subscription(s) with expired grace periods.`,
    );

    // Find the free trial plan
    const freeTrialPlan = await this.repository.findPlanBySlug('freetrial');
    if (!freeTrialPlan) {
      this.logger.error(
        'Free Trial plan not found — cannot downgrade expired subscriptions.',
      );
      return;
    }

    for (const sub of expiredSubs) {
      try {
        // Downgrade to Free Trial
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            planId: freeTrialPlan.id,
            status: 'active',
            gracePeriodEnd: null,
            pendingDowngradePlanId: null,
          },
        });

        await this.repository.createLedgerEvent({
          organizationId: sub.organizationId,
          type: 'grace_period_expired',
          oldPlanId: sub.planId,
          newPlanId: freeTrialPlan.id,
          description: `Grace period expired. Organization downgraded from ${sub.plan.name} to Free Trial.`,
          triggeredBy: 'system',
        });

        this.logger.log(
          `Grace period expired — Org ${sub.organizationId} downgraded to Free Trial.`,
        );
      } catch (e) {
        this.logger.error(
          `Error processing grace period expiry for subscription ${sub.id}: ${(e as Error).message}`,
        );
      }
    }
  }

  // ─── Step 2: Scheduled Downgrades ─────────────────────────────────────────

  private async handleScheduledDowngrades(now: Date) {
    const pendingSubs =
      await this.repository.findSubscriptionsWithPendingDowngrade();

    if (pendingSubs.length === 0) return;

    this.logger.log(
      `Found ${pendingSubs.length} subscription(s) with pending downgrades.`,
    );

    for (const sub of pendingSubs) {
      try {
        if (!sub.pendingDowngradePlanId) continue;

        const targetPlan = await this.repository.findPlanById(
          sub.pendingDowngradePlanId,
        );
        if (!targetPlan) {
          this.logger.error(
            `Target downgrade plan ${sub.pendingDowngradePlanId} not found — clearing downgrade.`,
          );
          await this.repository.clearScheduledDowngrade(sub.id);
          continue;
        }

        // Apply the downgrade
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            planId: targetPlan.id,
            pendingDowngradePlanId: null,
          },
        });

        await this.repository.createLedgerEvent({
          organizationId: sub.organizationId,
          type: 'plan_downgrade_applied',
          oldPlanId: sub.planId,
          newPlanId: targetPlan.id,
          description: `Scheduled downgrade applied: ${sub.plan.name} → ${targetPlan.name}.`,
          triggeredBy: 'system',
        });

        this.logger.log(
          `Downgrade applied — Org ${sub.organizationId}: ${sub.plan.name} → ${targetPlan.name}`,
        );
      } catch (e) {
        this.logger.error(
          `Error applying scheduled downgrade for subscription ${sub.id}: ${(e as Error).message}`,
        );
      }
    }
  }

  // ─── Step 3: Subscription Renewals ────────────────────────────────────────

  private async handleSubscriptionRenewals(now: Date) {
    const dueSubscriptions =
      await this.repository.findSubscriptionsDueForRenewal(now);

    if (dueSubscriptions.length === 0) return;

    this.logger.log(
      `Found ${dueSubscriptions.length} subscription(s) due for renewal.`,
    );

    for (const sub of dueSubscriptions) {
      try {
        if (!sub.currentPeriodStart || !sub.currentPeriodEnd) continue;

        // Step 3a: Calculate and snapshot overages for the ending period
        const overages = await this.quotaService.calculateOverages(
          sub.organizationId,
          sub.currentPeriodStart,
          sub.currentPeriodEnd,
        );

        if (overages) {
          await this.prisma.usagePeriodSnapshot.create({
            data: {
              organizationId: sub.organizationId,
              periodStart: overages.periodStart,
              periodEnd: overages.periodEnd,
              totalTokensUsed: overages.totalTokensUsed,
              totalStorageMb: overages.totalStorageMb,
              totalMembers: overages.totalMembers,
              overageTokens: overages.overageTokens,
              overageStorageMb: overages.overageStorageMb,
              overageUsers: overages.overageUsers,
              overageTotalCents: overages.overageTotalCents,
            },
          });
        }

        // Step 3b: Determine renewal charge
        const subscriptionAmount =
          sub.billingCycle === 'yearly'
            ? sub.plan.yearlyPriceCents
            : sub.plan.monthlyPriceCents;
        const overageAmount = overages?.overageTotalCents || 0;
        const totalCharge = subscriptionAmount + overageAmount;

        // Step 3c: Process renewal
        if (totalCharge > 0 && !sub.plan.isTrial) {
          // Paid plan renewal — initiate Paymob payment
          await this.processRenewalPayment(
            sub,
            totalCharge,
            subscriptionAmount,
            overageAmount,
            now,
          );
        } else {
          // Free trial — just renew the period
          await this.renewSubscriptionPeriod(sub, now);
          await this.triggerBackfill(sub.organizationId);
        }
      } catch (e) {
        this.logger.error(
          `Error processing renewal for subscription ${sub.id}: ${(e as Error).message}`,
        );
      }
    }
  }

  /**
   * Initiate a Paymob payment for subscription renewal + overage.
   * The webhook handler in BillingService will process the payment result.
   */
  private async processRenewalPayment(
    sub: {
      id: string;
      organizationId: string;
      billingCycle: string;
      plan: { currency: string; name: string };
    },
    totalCharge: number,
    subscriptionAmount: number,
    overageAmount: number,
    now: Date,
  ) {
    const merchantOrderId = `AIAN-REN-${sub.id}-${uuidv4().slice(0, 8)}`;

    try {
      const paymobResult = await this.paymobService.initiatePayment({
        amountCents: totalCharge,
        currency: sub.plan.currency,
        merchantOrderId,
      });

      // Create payment record
      await this.repository.createPaymentWithType({
        organizationId: sub.organizationId,
        subscriptionId: sub.id,
        paymentProvider: PAYMOB_PROVIDER_NAME,
        providerPaymentId: merchantOrderId,
        amountCents: totalCharge,
        currency: sub.plan.currency,
        billingCycle: sub.billingCycle as any,
        type: 'subscription',
        metadata: { subscriptionAmount, overageAmount },
      });

      // Record overage invoice if any
      if (overageAmount > 0) {
        await this.repository.createLedgerEvent({
          organizationId: sub.organizationId,
          type: 'overage_invoice',
          amountCents: overageAmount,
          currency: sub.plan.currency,
          description: `Overage invoice: $${(overageAmount / 100).toFixed(2)} for the ending billing period.`,
          triggeredBy: 'system',
        });
      }

      await this.repository.createLedgerEvent({
        organizationId: sub.organizationId,
        type: 'subscription_renewal',
        amountCents: totalCharge,
        currency: sub.plan.currency,
        description:
          `Renewal payment initiated: $${(totalCharge / 100).toFixed(2)} ` +
          `(subscription: $${(subscriptionAmount / 100).toFixed(2)}, overage: $${(overageAmount / 100).toFixed(2)}). ` +
          `Payment URL generated.`,
        triggeredBy: 'system',
      });

      this.logger.log(
        `Renewal payment initiated — Org ${sub.organizationId}: $${(totalCharge / 100).toFixed(2)} ` +
          `(sub: $${(subscriptionAmount / 100).toFixed(2)}, overage: $${(overageAmount / 100).toFixed(2)})`,
      );

      // TODO: Send renewal payment notification email to org admin
      // with paymobResult.paymentUrl so they can complete the payment.
      // When tokenized payments are integrated, this can be charged automatically.
    } catch (paymentError) {
      // Payment initiation failed — enter grace period
      const gracePeriodEnd = new Date(now);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

      await this.repository.setGracePeriod(sub.id, gracePeriodEnd);

      await this.repository.createLedgerEvent({
        organizationId: sub.organizationId,
        type: 'grace_period_started',
        description: `Renewal payment initiation failed. Grace period until ${gracePeriodEnd.toISOString()}.`,
        triggeredBy: 'system',
      });

      this.logger.error(
        `Renewal payment failed for org ${sub.organizationId} — grace period until ${gracePeriodEnd.toISOString()}. ` +
          `Error: ${(paymentError as Error).message}`,
      );
    }
  }

  /**
   * Advance subscription dates to the next billing period.
   */
  private async renewSubscriptionPeriod(
    sub: { id: string; billingCycle: string },
    now: Date,
  ) {
    const nextPeriodStart = new Date(now);
    const nextPeriodEnd = new Date(nextPeriodStart);

    if (sub.billingCycle === 'yearly') {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    } else {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        currentPeriodStart: nextPeriodStart,
        currentPeriodEnd: nextPeriodEnd,
      },
    });

    this.logger.log(
      `Subscription ${sub.id} renewed until ${nextPeriodEnd.toISOString()}`,
    );
  }

  /**
   * Trigger extraction backfill for pending artifacts after renewal/upgrade.
   * This drains the backlog that accumulated while processing was paused.
   */
  private async triggerBackfill(organizationId: string) {
    const pendingCount = await this.prisma.knowledgeArtifact.count({
      where: {
        organizationId,
        extractionStatus: { in: ['pending', 'failed'] },
      },
    });

    if (pendingCount > 0) {
      this.logger.log(
        `Triggering backfill for org ${organizationId}: ${pendingCount} pending artifact(s).`,
      );
      // The extraction retry will be picked up by the extraction service.
      // We don't directly call it here to avoid circular dependencies —
      // the extraction retry cron or a manual trigger handles this.
    }
  }
}
