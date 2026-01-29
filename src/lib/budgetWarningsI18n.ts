/**
 * Translation utility for budget analysis warnings and recommendations
 * These messages come from the AI analysis edge function in French
 * and need to be translated on the client side based on user language
 */

import { TFunction } from "i18next";

// Known warning prefixes and their translation keys
const WARNING_PREFIXES: Record<string, string> = {
  "⚠️ Élément manquant:": "budgetWarnings.missingElement",
  "⚠️ Missing element:": "budgetWarnings.missingElement",
  "❓ Ambiguïté:": "budgetWarnings.ambiguity",
  "❓ Ambiguity:": "budgetWarnings.ambiguity",
  "⚡ Incohérence:": "budgetWarnings.inconsistency",
  "⚡ Inconsistency:": "budgetWarnings.inconsistency",
  "🏗️ PRÉPARATION DU SITE:": "budgetWarnings.sitePreparation",
  "🏗️ SITE PREPARATION:": "budgetWarnings.sitePreparation",
  "🚧 PERMIS ET INSPECTIONS:": "budgetWarnings.permitsInspections",
  "🚧 PERMITS AND INSPECTIONS:": "budgetWarnings.permitsInspections",
  "📋 SERVICES PUBLICS:": "budgetWarnings.publicServices",
  "📋 UTILITIES:": "budgetWarnings.publicServices",
  "🔗 JUMELAGE STRUCTUREL:": "budgetWarnings.structuralJoining",
  "🔗 STRUCTURAL CONNECTION:": "budgetWarnings.structuralJoining",
  "⚡ RACCORDEMENT ÉLECTRIQUE:": "budgetWarnings.electricalConnection",
  "⚡ ELECTRICAL CONNECTION:": "budgetWarnings.electricalConnection",
  "🔌 RACCORDEMENT PLOMBERIE:": "budgetWarnings.plumbingConnection",
  "🔌 PLUMBING CONNECTION:": "budgetWarnings.plumbingConnection",
  "🏠 IMPERMÉABILISATION:": "budgetWarnings.waterproofing",
  "🏠 WATERPROOFING:": "budgetWarnings.waterproofing",
  "🎨 HARMONISATION:": "budgetWarnings.harmonization",
  "🎨 HARMONIZATION:": "budgetWarnings.harmonization",
  "🔥 COUPE-FEU:": "budgetWarnings.fireSeparation",
  "🔥 FIRE SEPARATION:": "budgetWarnings.fireSeparation",
};

// Known full warning messages that can be translated completely
const FULL_WARNING_TRANSLATIONS: Record<string, string> = {
  "🏗️ PRÉPARATION DU SITE: Vérifier les coûts d'excavation, nivellement, et accès chantier":
    "budgetWarnings.sitePreparationFull",
  "🏗️ SITE PREPARATION: Verify excavation, grading, and site access costs":
    "budgetWarnings.sitePreparationFull",
  "🚧 PERMIS ET INSPECTIONS: Frais de permis de construction et inspections municipales à prévoir":
    "budgetWarnings.permitsInspectionsFull",
  "🚧 PERMITS AND INSPECTIONS: Building permit fees and municipal inspections to be planned":
    "budgetWarnings.permitsInspectionsFull",
  "📋 SERVICES PUBLICS: Confirmer les raccordements (eau, égout, électricité, gaz) et frais associés":
    "budgetWarnings.publicServicesFull",
  "📋 UTILITIES: Confirm connections (water, sewer, electricity, gas) and associated fees":
    "budgetWarnings.publicServicesFull",
  "🔗 JUMELAGE STRUCTUREL: Travaux de connexion à la structure existante (linteaux, ancrages, renfort fondation)":
    "budgetWarnings.structuralJoiningFull",
  "🔗 STRUCTURAL CONNECTION: Connection work to existing structure (lintels, anchors, foundation reinforcement)":
    "budgetWarnings.structuralJoiningFull",
  "⚡ RACCORDEMENT ÉLECTRIQUE: Extension du panneau existant et mise aux normes possiblement requise":
    "budgetWarnings.electricalConnectionFull",
  "⚡ ELECTRICAL CONNECTION: Existing panel extension and possible code upgrade required":
    "budgetWarnings.electricalConnectionFull",
  "🔌 RACCORDEMENT PLOMBERIE: Connexion aux systèmes existants (eau, drainage, chauffage)":
    "budgetWarnings.plumbingConnectionFull",
  "🔌 PLUMBING CONNECTION: Connection to existing systems (water, drainage, heating)":
    "budgetWarnings.plumbingConnectionFull",
  "🏠 IMPERMÉABILISATION: Joint d'étanchéité entre nouvelle et ancienne construction critique":
    "budgetWarnings.waterproofingFull",
  "🏠 WATERPROOFING: Critical sealing joint between new and existing construction":
    "budgetWarnings.waterproofingFull",
  "🎨 HARMONISATION: Travaux de finition pour raccorder les matériaux extérieurs existants":
    "budgetWarnings.harmonizationFull",
  "🎨 HARMONIZATION: Finishing work to match existing exterior materials":
    "budgetWarnings.harmonizationFull",
  "🔥 COUPE-FEU: Vérifier les exigences de séparation coupe-feu entre garage et habitation":
    "budgetWarnings.fireSeparationFull",
  "🔥 FIRE SEPARATION: Verify fire separation requirements between garage and dwelling":
    "budgetWarnings.fireSeparationFull",
};

type WarningKind = "missing" | "ambiguity" | "inconsistency" | "other";

function getWarningKind(prefixKey: string): WarningKind {
  if (prefixKey === "budgetWarnings.missingElement") return "missing";
  if (prefixKey === "budgetWarnings.ambiguity") return "ambiguity";
  if (prefixKey === "budgetWarnings.inconsistency") return "inconsistency";
  return "other";
}

// Extended missing element translations (common ones from AI)
const MISSING_ELEMENT_TRANSLATIONS: Record<string, string> = {
  // Original entries
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
  // Extended entries for more coverage
  "Détails spécifiques des fenêtres et dimensions exactes": "budgetWarnings.missing.windowSpecificDetails",
  "Finitions intérieures détaillées": "budgetWarnings.missing.interiorFinishesDetailed",
  "Revêtement extérieur spécifié": "budgetWarnings.missing.exteriorSidingSpecified",
  "Fenêtres et portes - dimensions non visibles": "budgetWarnings.missing.windowsDoorsDimensionsNotVisible",
  "Électricité - circuits non détaillés": "budgetWarnings.missing.electricalCircuitsNotDetailed",
  "Plomberie - appareils non spécifiés": "budgetWarnings.missing.plumbingAppliancesNotSpecified",
  "Finitions intérieures - matériaux non précisés": "budgetWarnings.missing.interiorFinishesMaterialsNotSpecified",
  "Comptoirs": "budgetWarnings.missing.countertops",
  "Armoires de cuisine": "budgetWarnings.missing.kitchenCabinets",
  "Vanités": "budgetWarnings.missing.vanities",
  "Escalier": "budgetWarnings.missing.staircase",
  "Rampes et garde-corps": "budgetWarnings.missing.railings",
  "Planchers": "budgetWarnings.missing.flooring",
  "Peinture": "budgetWarnings.missing.paint",
  "Portes intérieures": "budgetWarnings.missing.interiorDoors",
  "Moulures et plinthes": "budgetWarnings.missing.trimBaseboards",
  "Luminaires": "budgetWarnings.missing.lightFixtures",
  "Prises et interrupteurs": "budgetWarnings.missing.outletsSwitches",
  "Robinetterie": "budgetWarnings.missing.faucets",
  "Appareils sanitaires": "budgetWarnings.missing.sanitaryFixtures",
  "Ventilation": "budgetWarnings.missing.ventilation",
  "Système de climatisation": "budgetWarnings.missing.airConditioning",
  "Foyer ou poêle": "budgetWarnings.missing.fireplaceOrStove",
  "Garage": "budgetWarnings.missing.garage",
  "Terrasse ou balcon": "budgetWarnings.missing.deckOrBalcony",
  "Aménagement paysager": "budgetWarnings.missing.landscaping",
  "Entrée de garage": "budgetWarnings.missing.driveway",
  "Clôture": "budgetWarnings.missing.fence",
};

// Ambiguity translations
const AMBIGUITY_TRANSLATIONS: Record<string, string> = {
  "Dimensions exactes du bâtiment non clairement indiquées": "budgetWarnings.ambiguity.buildingDimensions",
  "Types précis de fenêtres difficiles à distinguer": "budgetWarnings.ambiguity.windowTypes",
  "Hauteur exacte des murs de fondation à confirmer": "budgetWarnings.ambiguity.foundationWallHeight",
  "Hauteur exacte des murs de fondation": "budgetWarnings.ambiguity.foundationWallHeightSimple",
  "Type exact de finition de plancher": "budgetWarnings.ambiguity.floorFinishType",
  "Spécifications des systèmes mécaniques": "budgetWarnings.ambiguity.mechanicalSpecs",
  "Nombre exact et dimensions des fenêtres non spécifiées": "budgetWarnings.ambiguity.windowCountDimensions",
  "Hauteur exacte des murs (estimé 9')": "budgetWarnings.ambiguity.wallHeightEstimated9",
  "Type de fondation (estimé béton coulé standard)": "budgetWarnings.ambiguity.foundationTypeEstimated",
  "Nombre exact et dimensions des fenêtres non clairement indiqués": "budgetWarnings.ambiguity.windowCountDimensionsNotClear",
  "Type de revêtement extérieur non spécifié": "budgetWarnings.ambiguity.exteriorSidingNotSpecified",
  "Hauteur exacte des murs non précisée": "budgetWarnings.ambiguity.wallHeightNotSpecified",
  "Hauteur exacte des murs - estimée à 8'": "budgetWarnings.ambiguity.wallHeightEstimated8",
  "Type exact de revêtement extérieur": "budgetWarnings.ambiguity.exteriorSidingType",
  "Nombre et dimensions des fenêtres": "budgetWarnings.ambiguity.windowCountAndDimensions",
  "Superficie exacte non visible": "budgetWarnings.ambiguity.exactAreaNotVisible",
  "Qualité des matériaux non précisée": "budgetWarnings.ambiguity.materialQualityNotSpecified",
  "Niveau de finition non indiqué": "budgetWarnings.ambiguity.finishLevelNotIndicated",
  "Type de chauffage non précisé": "budgetWarnings.ambiguity.heatingTypeNotSpecified",
  "Configuration électrique non détaillée": "budgetWarnings.ambiguity.electricalConfigNotDetailed",
};

// Inconsistency translations
const INCONSISTENCY_TRANSLATIONS: Record<string, string> = {
  "Aucune incohérence majeure détectée sur cette page d'élévations": "budgetWarnings.inconsistency.noMajorOnElevations",
  "Plan montre seulement le sous-sol, manque les étages supérieurs pour estimation complète": "budgetWarnings.inconsistency.basementOnlyMissingFloors",
  "Aucune incohérence majeure détectée": "budgetWarnings.inconsistency.noMajorDetected",
  "Plan montre coupe mais dimensions complètes non visibles": "budgetWarnings.inconsistency.sectionDimensionsNotVisible",
  "Dimensions incohérentes entre les plans": "budgetWarnings.inconsistency.dimensionsMismatch",
  "Superficie calculée ne correspond pas à la superficie indiquée": "budgetWarnings.inconsistency.areaMismatch",
  "Nombre de fenêtres différent entre élévations et plans": "budgetWarnings.inconsistency.windowCountMismatch",
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
      const translatedContent = translateWarningContent(t, content, getWarningKind(prefixKey));
      
      if (translatedPrefix !== prefixKey) {
        return `${translatedPrefix} ${translatedContent}`;
      }
    }
  }

  // Return original if no translation found
  return warning;
}

/**
 * Try to translate the content portion of a warning based on its type
 */
function translateWarningContent(t: TFunction, content: string, kind: WarningKind): string {
  if (kind === "missing") {
    const missingKey = MISSING_ELEMENT_TRANSLATIONS[content];
    if (missingKey) {
      const translated = t(missingKey);
      if (translated !== missingKey) return translated;
    }
  } else if (kind === "ambiguity") {
    const ambiguityKey = AMBIGUITY_TRANSLATIONS[content];
    if (ambiguityKey) {
      const translated = t(ambiguityKey);
      if (translated !== ambiguityKey) return translated;
    }
  } else if (kind === "inconsistency") {
    const inconsistencyKey = INCONSISTENCY_TRANSLATIONS[content];
    if (inconsistencyKey) {
      const translated = t(inconsistencyKey);
      if (translated !== inconsistencyKey) return translated;
    }
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
