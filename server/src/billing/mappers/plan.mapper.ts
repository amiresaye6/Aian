import type { SubscriptionPlan } from '@prisma/client';
import type { PlanResponse } from '../types/billing.types';

const PLAN_FEATURES: Record<
  string,
  {
    iconName: string;
    tagline: string;
    features: string[];
    limits: string;
    highlighted: boolean;
  }
> = {
  starter: {
    iconName: 'zap',
    tagline: 'Small teams getting started',
    features: [
      'Up to 10 members',
      'Basic AI assistant',
      '3 integrations',
      'Basic reports',
      'Community support',
    ],
    limits: 'Up to 5 GB knowledge',
    highlighted: false,
  },
  growth: {
    iconName: 'sparkles',
    tagline: 'Growing companies scaling knowledge',
    highlighted: true,
    features: [
      'Up to 100 members',
      'Advanced AI reasoning',
      'Unlimited meetings',
      'Knowledge Search',
      'Automations',
      'Priority support',
    ],
    limits: 'Up to 250 GB knowledge',
  },
  enterprise: {
    iconName: 'building-2',
    tagline: 'Large organizations, unlimited scope',
    features: [
      'Unlimited members',
      'Advanced AI Agents',
      'Knowledge Graph',
      'Advanced Reports',
      'Custom Integrations',
      'Dedicated support & SLA',
    ],
    limits: 'Unlimited knowledge',
    highlighted: false,
  },
};

export function toPlanResponse(plan: SubscriptionPlan): PlanResponse {
  const meta = PLAN_FEATURES[plan.slug] || PLAN_FEATURES.starter;
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    monthlyPriceCents: plan.monthlyPriceCents,
    yearlyPriceCents: plan.yearlyPriceCents,
    currency: plan.currency,
    maxMembers: plan.maxMembers,
    storageLimitMb: plan.storageLimitMb,
    sortOrder: plan.sortOrder,
    features: meta.features,
    tagline: meta.tagline,
    limits: meta.limits,
    highlighted: meta.highlighted,
    iconName: meta.iconName,
  };
}

export function toPlanResponseList(plans: SubscriptionPlan[]): PlanResponse[] {
  return plans.map(toPlanResponse);
}
