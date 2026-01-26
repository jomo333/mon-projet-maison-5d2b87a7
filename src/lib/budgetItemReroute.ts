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

/**
 * Moves misclassified items OUT of "Fondation" into:
 * - "Excavation" for drain/remblai items
 * - "Coulage de dalle du sous-sol" for slab/dalle items
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
  const dalle = nextByName.get("Coulage de dalle du sous-sol");

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

  return next;
}
