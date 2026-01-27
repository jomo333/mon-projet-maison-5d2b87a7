export type ReroutableBudgetItem = {
  name: string;
  cost: number;
  quantity: string;
  unit: string;
};

export type ReroutableBudgetCategory = {
  name: string;
  items?: ReroutableBudgetItem[];
};

const normalize = (s: unknown) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isDrainRemblai = (name: string) => {
  const n = normalize(name);
  return (
    n.includes("drain") ||
    n.includes("remblai") ||
    n.includes("puisard") ||
    n.includes("drain francais")
  );
};

const isSlab = (name: string) => {
  const n = normalize(name);

  const hasDalle = n.includes("dalle") || n.includes("plancher beton");
  const has4in = n.includes("4 pouces") || n.includes("4\"") || n.includes("4 po");
  const hasSousSol = n.includes("sous-sol") || n.includes("sous sol");
  const hasCoffrageFinition = n.includes("coffrage et finition");
  const has25mpa = n.includes("25 mpa") || n.includes("beton 25");

  // 25MPA alone is not enough (foundation walls can also be 25MPA).
  return hasDalle || has4in || hasCoffrageFinition || (has25mpa && (hasDalle || has4in || hasSousSol));
};

// Items that should move from Toiture to Structure et charpente
const isRoofStructure = (name: string) => {
  const n = normalize(name);
  return (
    n.includes("contreplaque") ||
    n.includes("osb") ||
    n.includes("pontage") ||
    n.includes("plywood") ||
    n.includes("decking") ||
    n.includes("7/16") ||
    n.includes("5/8")
  );
};

// Items that should move from Toiture to Revêtement extérieur
const isExteriorFinish = (name: string) => {
  const n = normalize(name);
  return (
    n.includes("fascia") ||
    n.includes("soffite") ||
    n.includes("soffit") ||
    n.includes("gouttiere") ||
    n.includes("descente")
  );
};

// Items that should move from Structure et charpente to Murs de division
const isInteriorPartition = (name: string) => {
  const n = normalize(name);
  return (
    n.includes("cloison") ||
    n.includes("cloisons") ||
    (n.includes("interieur") && (n.includes("mur") || n.includes("partition") || n.includes("2x4")))
  );
};

// Items that should be EXCLUDED from Murs de division (structural items)
const isStructuralItem = (name: string) => {
  const n = normalize(name);
  return (
    n.includes("solive") ||
    n.includes("ferme") ||
    n.includes("contreplaque") ||
    n.includes("osb") ||
    n.includes("charpente mur") ||
    n.includes("murs exterieurs") ||
    n.includes("mur exterieur") ||
    n.includes("perimetre") ||
    n.includes("prefabrique") ||
    n.includes("toiture") ||
    n.includes("pontage") ||
    n.includes("plancher") ||
    n.includes("5/8") ||
    n.includes("2x6") ||
    n.includes("2x10") ||
    n.includes("2x12") ||
    n.includes("tyvek") ||
    n.includes("papier construction") ||
    n.includes("autres elements")
  );
};

// Items that should be moved TO Structure et charpente (Tyvek, etc.)
const isTyvekItem = (name: string) => {
  const n = normalize(name);
  return (
    n.includes("tyvek") ||
    n.includes("papier construction") ||
    n.includes("pare-air") ||
    n.includes("pare air") ||
    n.includes("housewrap")
  );
};

// Items that should be EXCLUDED from Plomberie sous dalle (concrete/foundation/structural)
const isNotPlumbing = (name: string) => {
  const n = normalize(name);
  return (
    // Concrete/slab items
    n.includes("beton") ||
    n.includes("dalle") ||
    n.includes("coffrage") ||
    n.includes("finition") ||
    n.includes("25 mpa") ||
    n.includes("4 pouces") ||
    n.includes("4\"") ||
    n.includes("4 po") ||
    // Foundation items
    n.includes("semelle") ||
    n.includes("fondation") ||
    n.includes("mur de fondation") ||
    n.includes("murs fondation") ||
    n.includes("footing") ||
    n.includes("solage") ||
    n.includes("8' hauteur") ||
    n.includes("8 pieds") ||
    n.includes("perimetre") ||
    n.includes("impermeabilisation") ||
    // Structural items
    n.includes("solive") ||
    n.includes("ferme") ||
    n.includes("contreplaque") ||
    n.includes("osb") ||
    n.includes("charpente") ||
    n.includes("murs exterieurs") ||
    n.includes("pontage") ||
    n.includes("plancher") ||
    n.includes("5/8") ||
    n.includes("2x6") ||
    n.includes("autres elements")
  );
};

// Items that should be EXCLUDED from Coulée de dalle (foundation walls/footings, NOT slab items)
const isFoundationNotSlab = (name: string) => {
  const n = normalize(name);
  return (
    // Foundation walls and footings - go to "Fondation"
    n.includes("semelle") ||
    n.includes("semelles de fondation") ||
    n.includes("semelles beton perimetre") ||
    n.includes("mur de fondation") ||
    n.includes("murs de fondation") ||
    n.includes("murs fondation") ||
    n.includes("fondation beton") ||
    n.includes("footing") ||
    n.includes("solage") ||
    n.includes("8' hauteur") ||
    n.includes("8 pieds") ||
    n.includes("hauteur 8") ||
    n.includes("ml fondation") ||
    n.includes("perimetre") ||
    n.includes("coffrage et finition") ||
    n.includes("coffrage mur") ||
    n.includes("impermeabilisation") ||
    n.includes("beton coule") ||
    n.includes("25 mpa avec air") ||
    n.includes("autres elements")
  );
};

/**
 * Moves misclassified items OUT of "Fondation" into:
 * - "Excavation" for drain/remblai items
 * - "Coulée de dalle du sous-sol" for slab/dalle items
 *
 * And OUT of "Toiture" into:
 * - "Structure et charpente" for OSB/contreplaqué items
 * - "Revêtement extérieur" for fascia/soffite/gouttières items
 *
 * Budgets are left unchanged; this only reroutes the item lists.
 */
export function rerouteFoundationItems<T extends ReroutableBudgetCategory>(categories: T[]): T[] {
  let next = categories.map((c) => ({ ...c })) as T[];
  const nextByName = new Map(next.map((c) => [c.name, c] as const));

  // === FONDATION REROUTING ===
  const fondation = nextByName.get("Fondation");
  const excavation = nextByName.get("Excavation");
  const dalle = nextByName.get("Coulée de dalle du sous-sol");

  if (fondation && Array.isArray(fondation.items) && fondation.items.length > 0 && excavation && dalle) {
    const toExcavation: ReroutableBudgetItem[] = [];
    const toDalle: ReroutableBudgetItem[] = [];
    const keepInFondation: ReroutableBudgetItem[] = [];

    for (const item of fondation.items as ReroutableBudgetItem[]) {
      if (isDrainRemblai(item.name)) {
        toExcavation.push(item);
        continue;
      }
      if (isSlab(item.name)) {
        toDalle.push(item);
        continue;
      }
      keepInFondation.push(item);
    }

    fondation.items = keepInFondation as any;
    excavation.items = ([...((excavation.items as any) || []), ...toExcavation] as any) as any;
    dalle.items = ([...((dalle.items as any) || []), ...toDalle] as any) as any;
  }

  // === TOITURE REROUTING ===
  const toiture = nextByName.get("Toiture");
  const structure = nextByName.get("Structure et charpente");
  const revetement = nextByName.get("Revêtement extérieur");

  if (toiture && Array.isArray(toiture.items) && toiture.items.length > 0 && structure && revetement) {
    const toStructure: ReroutableBudgetItem[] = [];
    const toRevetement: ReroutableBudgetItem[] = [];
    const keepInToiture: ReroutableBudgetItem[] = [];

    for (const item of toiture.items as ReroutableBudgetItem[]) {
      if (isRoofStructure(item.name)) {
        toStructure.push(item);
        continue;
      }
      if (isExteriorFinish(item.name)) {
        toRevetement.push(item);
        continue;
      }
      keepInToiture.push(item);
    }

    toiture.items = keepInToiture as any;
    structure.items = ([...((structure.items as any) || []), ...toStructure] as any) as any;
    revetement.items = ([...((revetement.items as any) || []), ...toRevetement] as any) as any;
  }

  // === STRUCTURE ET CHARPENTE → MURS DE DIVISION REROUTING ===
  const structureUpdated = nextByName.get("Structure et charpente");
  const mursDivision = nextByName.get("Murs de division");

  if (structureUpdated && Array.isArray(structureUpdated.items) && structureUpdated.items.length > 0 && mursDivision) {
    const toMursDivision: ReroutableBudgetItem[] = [];
    const keepInStructure: ReroutableBudgetItem[] = [];

    for (const item of structureUpdated.items as ReroutableBudgetItem[]) {
      if (isInteriorPartition(item.name)) {
        toMursDivision.push(item);
        continue;
      }
      keepInStructure.push(item);
    }

    structureUpdated.items = keepInStructure as any;
    mursDivision.items = ([...((mursDivision.items as any) || []), ...toMursDivision] as any) as any;
  }

  // === REVÊTEMENT EXTÉRIEUR → STRUCTURE (Tyvek) ===
  const revetementUpdated = nextByName.get("Revêtement extérieur");
  const structureForTyvek = nextByName.get("Structure et charpente");
  if (revetementUpdated && Array.isArray(revetementUpdated.items) && revetementUpdated.items.length > 0 && structureForTyvek) {
    const tyvekToStructure: ReroutableBudgetItem[] = [];
    const keepInRevetement: ReroutableBudgetItem[] = [];

    for (const item of revetementUpdated.items as ReroutableBudgetItem[]) {
      if (isTyvekItem(item.name)) {
        tyvekToStructure.push(item);
        continue;
      }
      keepInRevetement.push(item);
    }

    revetementUpdated.items = keepInRevetement as any;
    if (tyvekToStructure.length > 0) {
      structureForTyvek.items = ([...((structureForTyvek.items as any) || []), ...tyvekToStructure] as any) as any;
    }
  }

  // === ISOLATION → STRUCTURE (Tyvek) ===
  const isolation = nextByName.get("Isolation et pare-vapeur");
  if (isolation && Array.isArray(isolation.items) && isolation.items.length > 0 && structureForTyvek) {
    const tyvekFromIsolation: ReroutableBudgetItem[] = [];
    const keepInIsolation: ReroutableBudgetItem[] = [];

    for (const item of isolation.items as ReroutableBudgetItem[]) {
      if (isTyvekItem(item.name)) {
        tyvekFromIsolation.push(item);
        continue;
      }
      keepInIsolation.push(item);
    }

    isolation.items = keepInIsolation as any;
    if (tyvekFromIsolation.length > 0) {
      structureForTyvek.items = ([...((structureForTyvek.items as any) || []), ...tyvekFromIsolation] as any) as any;
    }
  }

  // === MURS DE DIVISION CLEANUP - Remove structural items that don't belong ===
  const mursDivisionFinal = nextByName.get("Murs de division");
  if (mursDivisionFinal && Array.isArray(mursDivisionFinal.items) && mursDivisionFinal.items.length > 0) {
    const structureFinal = nextByName.get("Structure et charpente");
    const cleanedItems: ReroutableBudgetItem[] = [];
    const movedToStructure: ReroutableBudgetItem[] = [];

    for (const item of mursDivisionFinal.items as ReroutableBudgetItem[]) {
      if (isStructuralItem(item.name)) {
        // Move structural items back to Structure et charpente
        if (structureFinal) {
          movedToStructure.push(item);
        }
        continue;
      }
      cleanedItems.push(item);
    }

    mursDivisionFinal.items = cleanedItems as any;
    if (structureFinal && movedToStructure.length > 0) {
      structureFinal.items = ([...((structureFinal.items as any) || []), ...movedToStructure] as any) as any;
    }
  }

  // === PLOMBERIE SOUS DALLE CLEANUP - Remove non-plumbing items ===
  const plomberieSousDalle = nextByName.get("Plomberie sous dalle");
  if (plomberieSousDalle && Array.isArray(plomberieSousDalle.items) && plomberieSousDalle.items.length > 0) {
    const cleanedPlomberie: ReroutableBudgetItem[] = [];

    for (const item of plomberieSousDalle.items as ReroutableBudgetItem[]) {
      if (isNotPlumbing(item.name)) {
        // Simply remove these items - they belong elsewhere
        continue;
      }
      cleanedPlomberie.push(item);
    }

    plomberieSousDalle.items = cleanedPlomberie as any;
  }

  // === COULÉE DE DALLE CLEANUP - Remove foundation items that don't belong ===
  const coulagesDalle = nextByName.get("Coulée de dalle du sous-sol");
  const fondationFinal = nextByName.get("Fondation");
  if (coulagesDalle && Array.isArray(coulagesDalle.items) && coulagesDalle.items.length > 0) {
    const cleanedDalle: ReroutableBudgetItem[] = [];
    const movedToFondation: ReroutableBudgetItem[] = [];

    for (const item of coulagesDalle.items as ReroutableBudgetItem[]) {
      if (isFoundationNotSlab(item.name)) {
        // Move foundation items to Fondation
        if (fondationFinal) {
          movedToFondation.push(item);
        }
        continue;
      }
      cleanedDalle.push(item);
    }

    coulagesDalle.items = cleanedDalle as any;
    if (fondationFinal && movedToFondation.length > 0) {
      fondationFinal.items = ([...((fondationFinal.items as any) || []), ...movedToFondation] as any) as any;
    }
  }

  return next;
}

/**
 * Categories that should be excluded for garage projects with monolithic slab.
 * Only "Coulée de dalle du sous-sol" is excluded because a monolithic slab IS the floor.
 * NOTE: "Plomberie sous dalle" remains relevant for sumps (puisards) and cleaning sinks.
 */
const GARAGE_MONOLITHIC_EXCLUDED_CATEGORIES = [
  "Coulée de dalle du sous-sol",
];

/**
 * Filters out categories that are not applicable for the given project configuration.
 * For garage projects with monolithic slab:
 * - Removes "Coulée de dalle du sous-sol" (monolithic slab IS the floor)
 * - Removes "Plomberie sous dalle" (no separate basement slab)
 * 
 * @param categories - The budget categories to filter
 * @param projectConfig - Object containing project configuration
 * @returns Filtered categories appropriate for the project type
 */
export function filterCategoriesForProjectType<T extends ReroutableBudgetCategory>(
  categories: T[],
  projectConfig?: {
    projectType?: string;
    garageFoundationType?: string;
  }
): T[] {
  if (!projectConfig) return categories;

  const { projectType, garageFoundationType } = projectConfig;
  const isGarage = projectType?.toLowerCase()?.includes('garage');
  const isMonolithicSlab = garageFoundationType === 'dalle-monolithique';

  // For garage with monolithic slab, exclude basement-related categories
  if (isGarage && isMonolithicSlab) {
    const normalizeKey = (s: string) => s.toLowerCase().trim();
    const excludedNormalized = GARAGE_MONOLITHIC_EXCLUDED_CATEGORIES.map(normalizeKey);
    
    return categories.filter((cat) => {
      const catName = normalizeKey(cat.name);
      return !excludedNormalized.some((excluded) => catName.includes(excluded) || excluded.includes(catName));
    });
  }

  return categories;
}
