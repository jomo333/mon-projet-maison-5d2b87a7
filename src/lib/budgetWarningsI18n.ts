/**
 * Translation utility for budget analysis warnings and recommendations
 * These messages come from the AI analysis edge function in French
 * and need to be translated on the client side based on user language
 */

import { TFunction } from "i18next";

// Known warning prefixes and their translation keys
const WARNING_PREFIXES: Record<string, string> = {
  "⚠️ Élément manquant:": "budgetWarnings.missingElement",
  "❓ Ambiguïté:": "budgetWarnings.ambiguity",
  "⚡ Incohérence:": "budgetWarnings.inconsistency",
  "🏗️ PRÉPARATION DU SITE:": "budgetWarnings.sitePreparation",
  "🚧 PERMIS ET INSPECTIONS:": "budgetWarnings.permitsInspections",
  "📋 SERVICES PUBLICS:": "budgetWarnings.publicServices",
  "🔗 JUMELAGE STRUCTUREL:": "budgetWarnings.structuralJoining",
  "⚡ RACCORDEMENT ÉLECTRIQUE:": "budgetWarnings.electricalConnection",
  "🔌 RACCORDEMENT PLOMBERIE:": "budgetWarnings.plumbingConnection",
  "🏠 IMPERMÉABILISATION:": "budgetWarnings.waterproofing",
  "🎨 HARMONISATION:": "budgetWarnings.harmonization",
  "🔥 COUPE-FEU:": "budgetWarnings.fireSeparation",
};

// Known full warning messages that can be translated completely
const FULL_WARNING_TRANSLATIONS: Record<string, string> = {
  "🏗️ PRÉPARATION DU SITE: Vérifier les coûts d'excavation, nivellement, et accès chantier":
    "budgetWarnings.sitePreparationFull",
  "🚧 PERMIS ET INSPECTIONS: Frais de permis de construction et inspections municipales à prévoir":
    "budgetWarnings.permitsInspectionsFull",
  "📋 SERVICES PUBLICS: Confirmer les raccordements (eau, égout, électricité, gaz) et frais associés":
    "budgetWarnings.publicServicesFull",
  "🔗 JUMELAGE STRUCTUREL: Travaux de connexion à la structure existante (linteaux, ancrages, renfort fondation)":
    "budgetWarnings.structuralJoiningFull",
  "⚡ RACCORDEMENT ÉLECTRIQUE: Extension du panneau existant et mise aux normes possiblement requise":
    "budgetWarnings.electricalConnectionFull",
  "🔌 RACCORDEMENT PLOMBERIE: Connexion aux systèmes existants (eau, drainage, chauffage)":
    "budgetWarnings.plumbingConnectionFull",
  "🏠 IMPERMÉABILISATION: Joint d'étanchéité entre nouvelle et ancienne construction critique":
    "budgetWarnings.waterproofingFull",
  "🎨 HARMONISATION: Travaux de finition pour raccorder les matériaux extérieurs existants":
    "budgetWarnings.harmonizationFull",
  "🔥 COUPE-FEU: Vérifier les exigences de séparation coupe-feu entre garage et habitation":
    "budgetWarnings.fireSeparationFull",
};

// Missing element translations (common ones from AI)
const MISSING_ELEMENT_TRANSLATIONS: Record<string, string> = {
  "Plans de plancher détaillés": "budgetWarnings.missing.floorPlans",
  "Spécifications d'isolation": "budgetWarnings.missing.insulationSpecs",
  "Détails électriques et plomberie": "budgetWarnings.missing.electricalPlumbing",
  "Finitions intérieures": "budgetWarnings.missing.interiorFinishes",
  "Dimensions exactes de toutes les fenêtres": "budgetWarnings.missing.windowDimensions",
  "Toiture et couverture": "budgetWarnings.missing.roofing",
  "Fenêtres et portes extérieures": "budgetWarnings.missing.windowsDoors",
  "Revêtement extérieur": "budgetWarnings.missing.exteriorSiding",
  "Isolation détaillée": "budgetWarnings.missing.insulationDetailed",
  "Système CVAC": "budgetWarnings.missing.hvac",
  "Cuisine et salles de bain finies": "budgetWarnings.missing.kitchenBathroom",
  "Détails spécifiques des fenêtres (dimensions exactes, types)": "budgetWarnings.missing.windowDetails",
  "Spécifications électriques et plomberie": "budgetWarnings.missing.electricalPlumbingSpecs",
  "Détails de finition intérieure": "budgetWarnings.missing.interiorFinishDetails",
  "Type de revêtement extérieur": "budgetWarnings.missing.sidingType",
  "Système de chauffage": "budgetWarnings.missing.heatingSystem",
};

/**
 * Translate a single warning message from French to the user's language
 */
export function translateWarning(t: TFunction, warning: string): string {
  // First check for exact full translation
  const fullKey = FULL_WARNING_TRANSLATIONS[warning];
  if (fullKey) {
    const translated = t(fullKey);
    if (translated !== fullKey) return translated;
  }

  // Check for prefix-based translation (dynamic content after prefix)
  for (const [prefix, prefixKey] of Object.entries(WARNING_PREFIXES)) {
    if (warning.startsWith(prefix)) {
      const content = warning.slice(prefix.length).trim();
      const translatedPrefix = t(prefixKey);
      
      // Try to translate the content part too
      const translatedContent = translateWarningContent(t, content);
      
      if (translatedPrefix !== prefixKey) {
        return `${translatedPrefix} ${translatedContent}`;
      }
    }
  }

  // Return original if no translation found
  return warning;
}

/**
 * Try to translate the content portion of a warning
 */
function translateWarningContent(t: TFunction, content: string): string {
  // Check for known missing element translations
  const missingKey = MISSING_ELEMENT_TRANSLATIONS[content];
  if (missingKey) {
    const translated = t(missingKey);
    if (translated !== missingKey) return translated;
  }
  
  // Return original content if no specific translation
  return content;
}

/**
 * Translate an array of warnings
 */
export function translateWarnings(t: TFunction, warnings: string[]): string[] {
  return warnings.map((w) => translateWarning(t, w));
}

/**
 * Translate recommendation messages
 */
export function translateRecommendation(t: TFunction, recommendation: string): string {
  // Check for pattern: "Analyse multi-lots: X lot(s) fusionnés pour Y plan(s) total."
  const multiLotMatch = recommendation.match(
    /Analyse multi-lots:\s*(\d+)\s*lot\(s\)\s*fusionnés pour\s*(\d+)\s*plan\(s\)\s*total\./i
  );
  if (multiLotMatch) {
    return t("budgetWarnings.multiLotAnalysis", {
      lots: multiLotMatch[1],
      plans: multiLotMatch[2],
    });
  }

  // Return original if no translation pattern matched
  return recommendation;
}

/**
 * Translate an array of recommendations
 */
export function translateRecommendations(t: TFunction, recommendations: string[]): string[] {
  return recommendations.map((r) => translateRecommendation(t, r));
}
