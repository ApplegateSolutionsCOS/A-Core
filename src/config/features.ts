import { SUBSCRIPTION_TIERS, SubscriptionTier, QCoreAddonId } from '@/types';

export type PreviewEditionOrTier = SubscriptionTier;
export type PreviewUserRole = 'actual' | 'organization_admin' | 'organization_manager' | 'organization_user';

const EDITION_STORAGE_KEY = 'acore_edition_override';
const PREVIEW_TIER_STORAGE_KEY = 'acore_godmode_preview_tier';
const PREVIEW_ROLE_STORAGE_KEY = 'acore_godmode_preview_role';

/**
 * Lite mode has been retired; A-CORE starts at the Basic ($249/mo) tier and builds upward.
 * Normalizes any legacy 'lite' storage overrides to 'basic'.
 */
const normalizeLegacyLiteStorage = (): void => {
  if (typeof window !== 'undefined') {
    const savedEdition = localStorage.getItem(EDITION_STORAGE_KEY);
    const savedTier = localStorage.getItem(PREVIEW_TIER_STORAGE_KEY);
    if (savedEdition === 'lite' || savedTier === 'lite') {
      localStorage.setItem(EDITION_STORAGE_KEY, 'full');
      localStorage.setItem(PREVIEW_TIER_STORAGE_KEY, 'basic');
    }
  }
};

normalizeLegacyLiteStorage();

/**
 * Gets the currently active God-Mode Preview Tier (or defaults to Basic tier)
 */
export function getActivePreviewTier(fallbackOrgTier: SubscriptionTier = 'basic'): SubscriptionTier {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const previewParam = params.get('previewTier') as SubscriptionTier | null;
    if (previewParam && previewParam in SUBSCRIPTION_TIERS) {
      localStorage.setItem(PREVIEW_TIER_STORAGE_KEY, previewParam);
      return previewParam;
    }

    const saved = localStorage.getItem(PREVIEW_TIER_STORAGE_KEY) as SubscriptionTier | null;
    if (saved && saved in SUBSCRIPTION_TIERS) {
      return saved;
    }
  }
  return fallbackOrgTier;
}

/**
 * Resolves the effective SubscriptionTier: respects God-Mode Preview Tier override first,
 * then falls back to the organization's subscription_tier or 'basic'.
 */
export function getEffectiveTier(orgTier?: SubscriptionTier | string | null): SubscriptionTier {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(PREVIEW_TIER_STORAGE_KEY) as SubscriptionTier | null;
    if (saved && saved in SUBSCRIPTION_TIERS) {
      return saved;
    }
  }
  if (orgTier && orgTier in SUBSCRIPTION_TIERS) {
    return orgTier as SubscriptionTier;
  }
  return 'basic';
}

/**
 * Allows Platform Owner Admin (God Mode) to switch between any of the 6 Pricing Tiers live
 */
export function setGodModePreviewTier(target: PreviewEditionOrTier): void {
  if (typeof window === 'undefined') return;
  const normalizedTarget: SubscriptionTier = target in SUBSCRIPTION_TIERS ? target : 'basic';
  localStorage.setItem(EDITION_STORAGE_KEY, 'full');
  localStorage.setItem(PREVIEW_TIER_STORAGE_KEY, normalizedTarget);
  window.location.reload();
}

/**
 * Gets the currently active God-Mode Role Preview
 */
export function getGodModePreviewRole(): PreviewUserRole {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(PREVIEW_ROLE_STORAGE_KEY) as PreviewUserRole | null;
    if (
      saved === 'actual' ||
      saved === 'organization_admin' ||
      saved === 'organization_manager' ||
      saved === 'organization_user'
    ) {
      return saved;
    }
  }
  return 'actual';
}

/**
 * Allows Platform Owner Admin (God Mode) to preview the application as different user roles
 */
export function setGodModePreviewRole(role: PreviewUserRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, role);
  window.location.reload();
}

const isLite = false;
const currentTier = getActivePreviewTier('basic');
const currentPreviewRole = getGodModePreviewRole();

export const TIER_RANK: Record<SubscriptionTier, number> = {
  basic: 1,
  pro: 2,
  expert: 3,
  enterprise: 4,
  enterprisePlus: 5,
  whiteGlove: 6,
};

const rank = TIER_RANK[currentTier] || 1;

export const FEATURES = {
  IS_LITE_MODE: isLite,
  IS_BASIC_TIER: rank <= 1,
  ACTIVE_PREVIEW_TIER: currentTier,
  ACTIVE_TIER_RANK: rank,
  ACTIVE_PREVIEW_ROLE: currentPreviewRole,

  // Core features INCLUDED in Basic ($249/mo) & All Tiers (Rank >= 1):
  ENABLE_WORKSPACES: true,
  ENABLE_CUSTOM_WORKSPACE_CREATION: rank >= 1,
  ENABLE_MINI_APPS: true,
  ENABLE_WORKFLOWS: true,
  ENABLE_PDF_BUILDER: true,
  ENABLE_QBALL: true,
  ENABLE_TASKS: true,
  ENABLE_CALENDAR: true,
  ENABLE_MESSAGES: true,
  ENABLE_ACTIVITY: true,
  ENABLE_REPORTS: true,
  ENABLE_LOCAL_FIRST_30_DAY_LEASE: true,
  ENABLE_QCORE_VAULT_ENCRYPTION_AT_REST: true,
  ENABLE_KUROGO_KOVAC_F12_HONEYPOT: true,

  // Pro ($499+) & Above (Rank >= 2) — Unbuilt / Dummy-Data Features Buried for Future Build-Out:
  ENABLE_PRESET_WORKSPACES_AND_APPS: rank >= 2,
  ENABLE_ADVANCED_DASHBOARD_WIDGETS: rank >= 2,
  ENABLE_WORKSPACE_MOCK_WIDGETS: rank >= 2,
  ENABLE_ADVANCED_QBALL_TOOLS: rank >= 2,
  ENABLE_CALL_AND_RECORD_MODALS: rank >= 2, // Cell + Business Phone Hub
  ENABLE_AI_VOICE_ASSISTANT: rank >= 2,

  // Expert ($899+) & Above (Rank >= 3):
  ENABLE_SUB_ORGANIZATIONS: rank >= 3,      // Up to 12 Organizations
  ENABLE_LABEL_PRINTING: rank >= 3,         // Barcode & RFID Label Printing
  ENABLE_HARDWARE_INTEGRATIONS: rank >= 3,  // Physical Hardware Connectors (+$199/mo)
  ENABLE_MOBILE_FIELD_LAYOUTS: rank >= 3,
  ENABLE_PHONE_AND_EMAIL_MIRROR: rank >= 3,

  // Enterprise ($1,999+) & Above (Rank >= 4):
  ENABLE_INTERACTIVE_MAPS_AND_WMS: rank >= 4,
  ENABLE_INDUSTRIAL_TELEMETRY: rank >= 4,
  ENABLE_POPOUT_NEWS_FEED: rank >= 4,

  // Enterprise+ ($4,999+) & Above (Rank >= 5):
  ENABLE_QUANTUM_BUBBLE_ANALYTICS: rank >= 5,
  ENABLE_BRANDED_UX: rank >= 5,

  // White Glove ($8,999) (Rank >= 6):
  ENABLE_WHITE_GLOVE_DEV_PORTAL: rank >= 6,
};

export function evaluateConnectorQuota(
  tier: SubscriptionTier = currentTier,
  currentActiveCloudConnectors: number,
  currentActiveHardwareConnectors: number
) {
  const config = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.basic;
  const totalActive = currentActiveCloudConnectors + currentActiveHardwareConnectors;
  const remainingFreeSlots = Math.max(0, config.includedFreeConnectors - totalActive);
  const remainingTotalCap = Math.max(0, config.maxTotalConnectorsCap - totalActive);

  return {
    tierName: config.name,
    includedFreeConnectors: config.includedFreeConnectors,
    maxPaidAddonConnectors: config.maxPaidAddonConnectors,
    maxTotalConnectorsCap: config.maxTotalConnectorsCap,
    totalActive,
    remainingFreeSlots,
    remainingTotalCap,
    isAtHardCap: totalActive >= config.maxTotalConnectorsCap,
    allowHardwareConnectors: config.allowHardwareConnectors,
    nextCloudConnectorCost: remainingFreeSlots > 0 ? 0 : (config.cloudConnectorAddonPrice ?? 49),
    nextHardwareConnectorCost: !config.allowHardwareConnectors
      ? null
      : remainingFreeSlots > 0
      ? 0
      : (config.hardwareConnectorAddonPrice ?? 199),
  };
}

export function hasQCoreAddon(
  activeAddons: QCoreAddonId[] | undefined,
  requiredAddon: QCoreAddonId
): boolean {
  if (!activeAddons || !Array.isArray(activeAddons)) return false;
  return activeAddons.includes(requiredAddon);
}


