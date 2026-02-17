import { TFunction } from "i18next";

/**
 * Maps French plan names from DB to i18n tier keys
 */
const PLAN_NAME_TO_TIER_KEY: Record<string, string> = {
  "Découverte": "decouverte",
  "Essentiel": "essentiel",
  "Gestion complète": "gestionComplete",
};

/**
 * Get the i18n tier key from a plan name (from DB)
 */
export function getPlanTierKey(planName: string): string | null {
  return PLAN_NAME_TO_TIER_KEY[planName] || null;
}

/**
 * Get translated plan name
 */
export function getTranslatedPlanName(t: TFunction, planName: string): string {
  const tierKey = getPlanTierKey(planName);
  if (tierKey) {
    const translated = t(`plans.tiers.${tierKey}.name`);
    if (translated !== `plans.tiers.${tierKey}.name`) {
      return translated;
    }
  }
  return planName;
}

/**
 * Get translated plan description
 */
export function getTranslatedPlanDescription(t: TFunction, planName: string, fallback: string | null): string {
  const tierKey = getPlanTierKey(planName);
  if (tierKey) {
    const translated = t(`plans.tiers.${tierKey}.description`);
    if (translated !== `plans.tiers.${tierKey}.description`) {
      return translated;
    }
  }
  return fallback || "";
}

/**
 * Get translated plan features
 */
export function getTranslatedPlanFeatures(t: TFunction, planName: string, fallbackFeatures: string[]): string[] {
  const tierKey = getPlanTierKey(planName);
  if (tierKey) {
    const features = t(`plans.tiers.${tierKey}.features`, { returnObjects: true });
    if (Array.isArray(features) && features.length > 0 && typeof features[0] === "string") {
      return features as string[];
    }
  }
  return fallbackFeatures;
}
