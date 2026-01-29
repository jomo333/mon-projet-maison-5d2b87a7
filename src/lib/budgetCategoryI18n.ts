import type { TFunction } from "i18next";

/**
 * Budget categories are stored internally in French (DB + mapping),
 * but the UI should display them in the current language.
 */
export const CATEGORY_KEY_BY_FR_NAME: Record<string, string> = {
  "Excavation": "excavation",
  "Fondation": "foundation",
  "Structure et charpente": "structure",
  "Toiture": "roofing",
  "Fenêtres et portes extérieures": "windowsDoors",
  "Isolation et pare-vapeur": "insulation",
  "Plomberie sous dalle": "plumbingSlab",
  "Coulée de dalle du sous-sol": "basementSlab",
  "Murs de division": "interiorWalls",
  "Plomberie": "plumbing",
  "Électricité": "electrical",
  "Chauffage et ventilation": "hvac",
  "Revêtement extérieur": "exterior",
  "Gypse et peinture": "drywall",
  "Revêtements de sol": "flooring",
  "Travaux ébénisterie": "cabinetry",
  "Finitions intérieures": "interiorFinishes",
  "Autres éléments": "otherItems",
  // Extra (if ever displayed as categories)
  "Budget imprévu (5%)": "contingency",
  "Taxes": "taxes",
};

export function getCategoryLabel(t: TFunction, name: string): string {
  const categoryKey = CATEGORY_KEY_BY_FR_NAME[name];
  if (!categoryKey) return name;

  const i18nKey = `categories.${categoryKey}`;
  const translated = t(i18nKey);
  return translated === i18nKey ? name : translated;
}
