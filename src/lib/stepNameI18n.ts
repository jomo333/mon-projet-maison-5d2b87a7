import { TFunction } from "i18next";

/**
 * Get the translated step name using i18n based on the step_id.
 * Falls back to the provided step_name (from DB) if no translation found.
 *
 * @param t - i18next translation function
 * @param stepId - The step ID (e.g., "planification", "fondation")
 * @param fallbackName - Fallback name if no translation exists (usually from DB)
 * @returns Translated step name
 */
export function getTranslatedStepName(
  t: TFunction,
  stepId: string,
  fallbackName?: string
): string {
  // Try to get translation from steps namespace
  const translationKey = `steps.${stepId}.title`;
  const translated = t(translationKey);

  // If translation exists (not returning the key itself), use it
  if (translated !== translationKey) {
    return translated;
  }

  // Fallback to the provided name or capitalize the stepId
  return fallbackName || stepId.charAt(0).toUpperCase() + stepId.slice(1).replace(/-/g, " ");
}
