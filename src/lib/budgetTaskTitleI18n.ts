import type { TFunction } from "i18next";

// NOTE: Budget categories are stored/processed using the French task titles.
// We keep those strings as internal identifiers (for mapping/grouping), but
// translate what we DISPLAY using i18n keys.

const normalizeKey = (s: unknown) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const OTHER_ITEMS_FR = "Autres éléments";

// Direct mapping from French task titles (used in budgetTaskMapping.ts) to i18n keys
// This covers ALL task titles used in the budget system, not just those from constructionSteps.ts
// IMPORTANT: Keys are NORMALIZED (lowercase, no accents) to match the normalizeKey function
const TASK_TITLE_TO_I18N_KEY: Record<string, string> = {
  // EXCAVATION
  "implantation de la maison": "budgetTasks.houseStaking",
  "deboisement": "budgetTasks.clearing",
  "creusage et excavation": "budgetTasks.diggingExcavation",
  
  // FONDATION
  "semelle": "budgetTasks.footing",
  "coulage des fondations": "budgetTasks.pouringFoundations",
  "impermeabilisation": "budgetTasks.waterproofing",
  "drain et remblai": "budgetTasks.frenchDrainBackfill",
  
  // STRUCTURE ET CHARPENTE
  "plancher du rez-de-chaussee": "budgetTasks.mainFloorFraming",
  "erection des murs": "budgetTasks.wallFraming",
  "structure de l'etage": "budgetTasks.secondFloorStructure",
  "installation des fermes de toit": "budgetTasks.roofTrussesInstallation",
  "pontage de toit": "budgetTasks.roofSheathing",
  "etancheite": "budgetTasks.weatherproofing",
  
  // TOITURE
  "membrane et bardeaux": "budgetTasks.membraneShingles",
  
  // FENÊTRES ET PORTES EXTÉRIEURES
  "installation des fenetres": "budgetTasks.windowInstallation",
  "portes exterieures": "budgetTasks.exteriorDoors",
  "porte de garage": "budgetTasks.garageDoor",
  
  // ISOLATION ET PARE-VAPEUR
  "isolation des murs": "budgetTasks.wallInsulation",
  "isolation du toit/comble": "budgetTasks.atticRoofInsulation",
  "insonorisation": "budgetTasks.soundproofing",
  "pare-vapeur": "budgetTasks.vapourBarrier",
  "fourrures de bois et fond de clouage": "budgetTasks.furringStripsBlocking",
  
  // PLOMBERIE SOUS DALLE
  "plomberie sous dalle - premiere visite": "budgetTasks.underSlabPlumbing",
  "taches incluses (etapes du guide)": "budgetTasks.includedTasks",
  
  // COULAGE DE DALLE DU SOUS-SOL
  "preparation du sol": "budgetTasks.subBasePreparation",
  "coulage du beton": "budgetTasks.concretePour",
  
  // MURS DE DIVISION
  "construire escalier": "budgetTasks.buildStaircase",
  "ossature des murs": "budgetTasks.partitionWallFraming",
  "cadrage des portes": "budgetTasks.doorFraming",
  
  // PLOMBERIE
  "plomberie brute": "budgetTasks.roughPlumbing",
  "chauffe-eau": "budgetTasks.waterHeater",
  "conduite pour gaz": "budgetTasks.gasLineRoughIn",
  "branchements municipaux": "budgetTasks.municipalConnections",
  "robinetterie": "budgetTasks.faucetsFixtures",
  "toilettes et lavabos": "budgetTasks.toiletsSinks",
  "douche et baignoire": "budgetTasks.showerBathtub",
  
  // ÉLECTRICITÉ
  "entree electrique": "budgetTasks.electricalServiceEntry",
  "filage brut": "budgetTasks.roughWiring",
  "inspection electrique": "budgetTasks.electricalInspection",
  "prises et interrupteurs": "budgetTasks.outletsSwitches",
  "luminaires": "budgetTasks.lightFixtures",
  "raccordement des appareils": "budgetTasks.applianceHookups",
  
  // CHAUFFAGE ET VENTILATION
  "systeme de chauffage": "budgetTasks.heatingSystem",
  "ventilateur recuperateur de chaleur (vrc) (echangeur d'air)": "budgetTasks.hrvAirExchanger",
  "conduits de ventilation": "budgetTasks.ventilationDucts",
  
  // REVÊTEMENT EXTÉRIEUR
  "revetement exterieur": "budgetTasks.exteriorCladding",
  "fascia et soffite": "budgetTasks.fasciaSoffit",
  "balcons et terrasses": "budgetTasks.balconiesDecks",
  "amenagement paysager": "budgetTasks.landscaping",
  
  // GYPSE ET PEINTURE
  "pose du gypse": "budgetTasks.drywallInstallation",
  "tirage de joints": "budgetTasks.tapingMudding",
  "peinture": "budgetTasks.painting",
  
  // REVÊTEMENTS DE SOL
  "plancher de bois ou stratifie": "budgetTasks.woodLaminateFlooring",
  "ceramique": "budgetTasks.ceramicTile",
  
  // TRAVAUX ÉBÉNISTERIE
  "armoires de cuisine et vanites": "budgetTasks.kitchenCabinetsVanities",
  "comptoirs": "budgetTasks.countertops",
  
  // FINITIONS INTÉRIEURES
  "portes interieures": "budgetTasks.interiorDoors",
  "moulures et plinthes": "budgetTasks.trimBaseboards",
  "escalier": "budgetTasks.staircaseFinishing",
  "peinture de finition": "budgetTasks.finalCoatPaint",
};

export const translateBudgetTaskTitle = (
  t: TFunction,
  categoryName: string,
  taskTitle: string
): string => {
  // Special "Other items" bucket (coming from the grouping logic)
  if (normalizeKey(taskTitle) === normalizeKey(OTHER_ITEMS_FR)) {
    return t("categories.otherItems");
  }

  const normalizedTitle = normalizeKey(taskTitle);
  const i18nKey = TASK_TITLE_TO_I18N_KEY[normalizedTitle];
  
  if (!i18nKey) {
    // No mapping found, return original title
    return taskTitle;
  }

  const translated = t(i18nKey);
  // If translation returns the key itself, fallback to original title
  return translated === i18nKey ? taskTitle : translated;
};
