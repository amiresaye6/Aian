import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from './quota.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionRenewals() {
    this.logger.log('Running daily subscription renewal check...');
    const now = new Date();

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: {
          lte: now, // Period ended
        },
      },
    });

    this.logger.log(
      `Found ${dueSubscriptions.length} subscriptions due for renewal.`,
    );

    for (const sub of dueSubscriptions) {
      try {
        if (!sub.currentPeriodStart || !sub.currentPeriodEnd) continue;

        // Calculate overages for the ending period
        const overages = await this.quotaService.calculateOverages(
          sub.organizationId,
          sub.currentPeriodStart,
          sub.currentPeriodEnd,
        );

        if (overages) {
          // Save a snapshot of the usage for the period
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

          if (overages.overageTotalCents > 0) {
            this.logger.log(
              `Organization ${sub.organizationId} has ${overages.overageTotalCents} cents in overages. ` +
                `Invoice should be generated. (MVP: Just logging)`,
            );
            // TODO: Generate invoice using Paymob API for overages
          }
        }

        // Renew the subscription for the next period
        const nextPeriodStart = new Date();
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
      } catch (e) {
        this.logger.error(
          `Error processing renewal for subscription ${sub.id}: ${e.message}`,
        );
      }
    }
  }
}
