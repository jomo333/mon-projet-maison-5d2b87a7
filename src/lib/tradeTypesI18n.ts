import { TFunction } from "i18next";

/**
 * Maps internal trade IDs to i18n keys.
 * The trade ID from tradeTypes.ts maps to schedule.trades.<key>
 */
const TRADE_I18N_KEYS: Record<string, string> = {
  excavation: "excavation",
  fondation: "foundation",
  charpente: "carpenter",
  toiture: "roofer",
  fenetre: "windowsDoors",
  electricite: "electrician",
  plomberie: "plumber",
  hvac: "hvac",
  isolation: "insulation",
  gypse: "drywall",
  peinture: "painter",
  plancher: "flooring",
  ceramique: "tiler",
  armoires: "cabinetMaker",
  comptoirs: "countertops",
  finitions: "interiorFinish",
  exterieur: "exteriorSiding",
  amenagement: "landscaping",
  inspecteur: "inspector",
  arpenteur: "surveyor",
  "entrepreneur-general": "generalContractor",
  planification: "planification",
  "plans-permis": "plansPermits",
  soumissions: "soumissions",
  financement: "financement",
  autre: "other",
  beton: "concrete",
};

/**
 * Get translated trade name using i18n.
 * Falls back to the raw tradeId if no translation found.
 */
export function getTranslatedTradeName(t: TFunction, tradeId: string): string {
  const key = TRADE_I18N_KEYS[tradeId];
  if (key) {
    const translated = t(`schedule.trades.${key}`);
    // Check if translation exists (i18next returns the key if not found)
    if (translated !== `schedule.trades.${key}`) {
      return translated;
    }
  }
  // Fallback: capitalize first letter
  return tradeId.charAt(0).toUpperCase() + tradeId.slice(1);
}
