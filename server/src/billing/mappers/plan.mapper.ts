import type { SubscriptionPlan } from '@prisma/client';
import type { PlanResponse } from '../types/billing.types';

const UNIVERSAL_FEATURES = [
  'All 4 Eyes (Chat, Meetings, Coding, Tasks)',
  'One provider per Eye',
  'Full Knowledge Graph',
  'AI Search & AI Assistant',
  'AI Hands (Autonomous Agent)',
  'Daily Planning & Reports',
  'Intelligent Alerts',
  'All future platform features',
];

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
  freetrial: {
    iconName: 'gift',
    tagline: 'Test the AIAN platform',
    features: UNIVERSAL_FEATURES,
    limits: 'Up to 1M tokens, 5GB storage',
    highlighted: false,
  },
  starter: {
    iconName: 'zap',
    tagline: 'Small teams getting started',
    features: UNIVERSAL_FEATURES,
    limits: 'Up to 10M tokens, 25GB storage',
    highlighted: false,
  },
  growth: {
    iconName: 'sparkles',
    tagline: 'Growing companies scaling knowledge',
    highlighted: true,
    features: UNIVERSAL_FEATURES,
    limits: 'Up to 60M tokens, 100GB storage',
  },
  business: {
    iconName: 'building-2',
    tagline: 'Large organizations, unlimited scope',
    features: UNIVERSAL_FEATURES,
    limits: 'Up to 250M tokens, 500GB storage',
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
