/**
 * ContinuaOS — Pricing Configuration
 * 
 * Defines pricing tiers and feature gates for monetization.
 */

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number; // cents
  yearlyPrice: number; // cents
  features: string[];
  limits: TierLimits;
  highlighted?: boolean;
}

export interface TierLimits {
  /** Maximum apps that can be installed */
  maxApps: number;
  /** Maximum storage in GB */
  storageGB: number;
  /** Maximum collaborators */
  maxCollaborators: number;
  /** Maximum plugins */
  maxPlugins: number;
  /** API rate limit (requests per minute) */
  apiRateLimit: number;
  /** Maximum cloud storage sync size in GB */
  maxSyncSizeGB: number;
  /** Priority support */
  prioritySupport: boolean;
  /** Custom branding */
  customBranding: boolean;
}

export const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individuals getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'All built-in apps',
      '5 GB local storage',
      '3 cloud storage connections',
      'Basic sync',
      'Community support',
    ],
    limits: {
      maxApps: 20,
      storageGB: 5,
      maxCollaborators: 1,
      maxPlugins: 5,
      apiRateLimit: 30,
      maxSyncSizeGB: 1,
      prioritySupport: false,
      customBranding: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users and creators',
    monthlyPrice: 1200, // $12/mo
    yearlyPrice: 9600, // $8/mo billed yearly
    features: [
      'Everything in Free',
      '50 GB storage',
      'Unlimited cloud storage connections',
      'Full sync with conflict resolution',
      'Priority support',
      'Advanced analytics',
      'Unlimited plugins',
    ],
    highlighted: true,
    limits: {
      maxApps: 50,
      storageGB: 50,
      maxCollaborators: 5,
      maxPlugins: 25,
      apiRateLimit: 120,
      maxSyncSizeGB: 20,
      prioritySupport: true,
      customBranding: false,
    },
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For teams and organizations',
    monthlyPrice: 2400, // $24/mo per seat
    yearlyPrice: 19200, // $16/mo per seat billed yearly
    features: [
      'Everything in Pro',
      '200 GB storage per seat',
      'Real-time collaboration',
      'Admin dashboard',
      'SSO integration',
      'Audit logs',
      'Dedicated support',
      'Custom branding',
    ],
    limits: {
      maxApps: -1, // unlimited
      storageGB: 200,
      maxCollaborators: 20,
      maxPlugins: -1, // unlimited
      apiRateLimit: 300,
      maxSyncSizeGB: 100,
      prioritySupport: true,
      customBranding: true,
    },
  },
];

/**
 * Get a pricing tier by ID
 */
export function getTierById(id: string): PricingTier | undefined {
  return TIERS.find(t => t.id === id);
}

/**
 * Check if a feature is available for a tier
 */
export function isFeatureAvailable(tierId: string, feature: string): boolean {
  const tier = getTierById(tierId);
  if (!tier) return false;
  return tier.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
}

/**
 * Get the limit for a tier
 */
export function getTierLimit(tierId: string, limit: keyof TierLimits): number {
  const tier = getTierById(tierId);
  if (!tier) return 0;
  return tier.limits[limit] as number;
}

/**
 * Check if a user has exceeded their limit
 */
export function hasExceededLimit(
  tierId: string,
  limit: keyof TierLimits,
  currentUsage: number
): boolean {
  const limitValue = getTierLimit(tierId, limit);
  if (limitValue === -1) return false; // unlimited
  return currentUsage >= limitValue;
}
