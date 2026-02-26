import { constructionSteps } from "@/data/constructionSteps";
import { rerouteFoundationItems, filterCategoriesForProjectType } from "@/lib/budgetItemReroute";

// Project configuration for filtering categories
export interface ProjectConfig {
  projectType?: string;
  garageFoundationType?: string;
}

export interface BudgetItem {
  name: string;
  cost: number;
  quantity: string;
  unit: string;
}

export interface BudgetCategory {
  name: string;
  budget: number;
  spent?: number;
  color: string;
  description?: string;
  items?: BudgetItem[];
}

export type IncomingAnalysisCategory = {
  name: string;
  budget: number;
  description: string;
  items?: BudgetItem[];
};

// Couleurs vives et distinctes pour une meilleure lisibilité
export const categoryColors = [
  "#3B82F6", // Bleu vif
  "#F97316", // Orange
  "#22C55E", // Vert
  "#EAB308", // Jaune doré
  "#EC4899", // Rose
  "#06B6D4", // Cyan
  "#8B5CF6", // Violet
  "#EF4444", // Rouge
  "#14B8A6", // Teal
  "#A855F7", // Pourpre
  "#F59E0B", // Ambre
  "#10B981", // Émeraude
  "#0EA5E9", // Bleu ciel
  "#DB2777", // Rose foncé
  "#64748B", // Gris ardoise
  "#78716C", // Pierre
  "#0891B2", // Cyan foncé
];

// Generate default categories from construction steps (physical work steps only: 5-22, excluding inspections)
// Merge Plomberie and Électricité rough-in + finition into single categories
const physicalWorkSteps = constructionSteps.filter(
  step => (step.phase === "gros-oeuvre" || step.phase === "second-oeuvre" || step.phase === "finitions") 
    && step.id !== "inspections-finales"
    && step.id !== "demolition-prep" // handled separately via project type
);

// IDs to merge (ONLY plumbing and electrical rough-in + finition phases)
const mergeMap: Record<string, string> = {
  "plomberie-roughin": "Plomberie",
  "plomberie-finition": "Plomberie",
  "electricite-roughin": "Électricité",
  "electricite-finition": "Électricité",
};

// Build a stable mapping of category -> tasks (based on the guide steps),
// so we can always display the tasks even if the budget analysis didn't produce items.
export const buildStepTasksByCategory = (): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  for (const step of physicalWorkSteps) {
    const name = mergeMap[step.id] ?? step.title;
    map[name] = [...(map[name] ?? []), ...step.tasks.map((t) => t.title)];
  }
  return map;
};

export const stepTasksByCategory = buildStepTasksByCategory();

// Normalize key for matching
const normalizeKey = (s: unknown) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

type MappingTarget = { target: string; weight: number };

// Analysis (12 catégories) -> Postes (17+ étapes)
// IMPORTANT: les `target` doivent correspondre EXACTEMENT aux titres des étapes (constructionSteps)
// sinon le poste reste à 0$.
const analysisToStepMap: Record<string, MappingTarget[]> = {
  // Agrandissement - démolition
  "demolition": [{ target: "Démolition et préparation", weight: 1 }],
  "demolition et preparation": [{ target: "Démolition et préparation", weight: 1 }],
  "preparation": [{ target: "Démolition et préparation", weight: 1 }],

  // Gros œuvre
  "excavation": [{ target: "Excavation", weight: 1 }],

  // Fondation: l'IA regroupe souvent sous un seul poste. On ventile vers les postes distincts.
  "fondation": [
    { target: "Fondation", weight: 0.7 },
    { target: "Plomberie sous dalle", weight: 0.1 },
    { target: "Coulée de dalle du sous-sol", weight: 0.2 },
  ],

  // Structure: on ventile une portion vers les murs de division (charpente intérieure)
  "structure": [
    { target: "Structure et charpente", weight: 0.85 },
    { target: "Murs de division", weight: 0.15 },
  ],
  "structure et charpente": [{ target: "Structure et charpente", weight: 1 }],

  "toiture": [{ target: "Toiture", weight: 1 }],
  
  // Fenêtres et portes - plusieurs variations possibles
  "fenetres et portes": [{ target: "Fenêtres et portes extérieures", weight: 1 }],
  "fenetres et portes exterieures": [{ target: "Fenêtres et portes extérieures", weight: 1 }],

  // Second œuvre
  "isolation": [{ target: "Isolation et pare-vapeur", weight: 1 }],
  "isolation et pare-air": [{ target: "Isolation et pare-vapeur", weight: 1 }],
  "isolation et pare air": [{ target: "Isolation et pare-vapeur", weight: 1 }],
  "isolation et pare-vapeur": [{ target: "Isolation et pare-vapeur", weight: 1 }],
  
  "electricite": [{ target: "Électricité", weight: 1 }],
  "plomberie": [{ target: "Plomberie", weight: 1 }],
  "plomberie sous dalle": [{ target: "Plomberie sous dalle", weight: 1 }],
  "coulee de dalle du sous-sol": [{ target: "Coulée de dalle du sous-sol", weight: 1 }],
  "murs de division": [{ target: "Murs de division", weight: 1 }],

  // Chauffage - le titre de l'étape est "Chauffage et ventilation"
  "chauffage/cvac": [{ target: "Chauffage et ventilation", weight: 1 }],
  "chauffage et cvac": [{ target: "Chauffage et ventilation", weight: 1 }],
  "chauffage": [{ target: "Chauffage et ventilation", weight: 1 }],
  "chauffage et ventilation": [{ target: "Chauffage et ventilation", weight: 1 }],
  "chauffage et ventilation (hvac)": [{ target: "Chauffage et ventilation", weight: 1 }],
  "hvac": [{ target: "Chauffage et ventilation", weight: 1 }],

  "revetement exterieur": [{ target: "Revêtement extérieur", weight: 1 }],

  // Finitions
  "gypse": [{ target: "Gypse et peinture", weight: 1 }],
  "gypse et peinture": [{ target: "Gypse et peinture", weight: 1 }],
  "peinture": [{ target: "Gypse et peinture", weight: 1 }],
  
  "revetements de sol": [{ target: "Revêtements de sol", weight: 1 }],
  "revetement de sol": [{ target: "Revêtements de sol", weight: 1 }],
  "plancher": [{ target: "Revêtements de sol", weight: 1 }],
  "planchers": [{ target: "Revêtements de sol", weight: 1 }],
  
  "travaux ebenisterie": [{ target: "Travaux ébénisterie", weight: 1 }],
  "ebenisterie": [{ target: "Travaux ébénisterie", weight: 1 }],
  
  "finitions interieures": [{ target: "Finitions intérieures", weight: 1 }],
  
  // Catégories groupées de l'IA legacy
  "finition interieure": [
    { target: "Gypse et peinture", weight: 0.4 },
    { target: "Revêtements de sol", weight: 0.25 },
    { target: "Travaux ébénisterie", weight: 0.2 },
    { target: "Finitions intérieures", weight: 0.15 },
  ],
  "cuisine": [{ target: "Travaux ébénisterie", weight: 1 }],
  "salle de bain": [{ target: "Travaux ébénisterie", weight: 1 }],
  "salles de bain": [{ target: "Travaux ébénisterie", weight: 1 }],
};

// Build merged categories
export const buildDefaultCategories = (projectType?: string): BudgetCategory[] => {
  const result: BudgetCategory[] = [];
  const mergedCategories: Record<string, { tasks: string[]; color: string }> = {};
  let colorIndex = 0;

  // For agrandissement, add "Démolition et préparation" as first gros-oeuvre category
  const isAgrandissement = projectType?.toLowerCase()?.includes("agrandissement");
  if (isAgrandissement) {
    result.push({
      name: "Démolition et préparation",
      budget: 0,
      spent: 0,
      color: categoryColors[colorIndex % categoryColors.length],
      description: "Protection de l'existant, démolition intérieure/extérieure, nettoyage des débris",
    });
    colorIndex++;
  }

  for (const step of physicalWorkSteps) {
    const mergedName = mergeMap[step.id];
    
    if (mergedName) {
      // This step should be merged
      if (!mergedCategories[mergedName]) {
        mergedCategories[mergedName] = {
          tasks: [],
          color: categoryColors[colorIndex % categoryColors.length],
        };
        colorIndex++;
        // Add placeholder to maintain order (will be replaced)
        result.push({
          name: mergedName,
          budget: 0,
          spent: 0,
          color: mergedCategories[mergedName].color,
          description: "",
        });
      }
      // Accumulate tasks from both phases
      mergedCategories[mergedName].tasks.push(...step.tasks.map(t => t.title));
    } else {
      // Regular step
      const taskTitles = stepTasksByCategory[step.title]?.join(", ") ?? step.tasks.map(t => t.title).join(", ");
      result.push({
        name: step.title,
        budget: 0,
        spent: 0,
        color: categoryColors[colorIndex % categoryColors.length],
        description: taskTitles,
      });
      colorIndex++;
    }
  }

  // Update merged categories with accumulated task descriptions
  const withMerged = result.map(cat => {
    if (mergedCategories[cat.name]) {
      return { ...cat, description: mergedCategories[cat.name].tasks.join(", ") };
    }
    return cat;
  });
  // Ajouter "Autre" en dernier pour postes/tâches manuels
  withMerged.push({
    name: "Autre",
    budget: 0,
    spent: 0,
    color: categoryColors[colorIndex % categoryColors.length],
    description: "",
  });
  return withMerged;
};

export const defaultCategories: BudgetCategory[] = buildDefaultCategories();

// Get the ordered category names (for consistent display order)
export const getOrderedCategoryNames = (projectType?: string): string[] => {
  return buildDefaultCategories(projectType).map(cat => cat.name);
};

// Result type that includes separate taxes and contingency
export interface MappedBudgetResult {
  categories: BudgetCategory[];
  contingency: number;
  taxes: number;
  subTotal: number;
}

// Map legacy AI analysis categories (12-category model + taxes/contingence) into
// the app's step-based budget categories so the table always updates.
// Now returns taxes and contingency separately instead of distributing them.
// Optionally filters categories based on project configuration (e.g., garage with monolithic slab).
export const mapAnalysisToStepCategories = (
  analysisCategories: IncomingAnalysisCategory[],
  defaults: BudgetCategory[] = defaultCategories,
  projectConfig?: ProjectConfig
): BudgetCategory[] => {
  const result = mapAnalysisToStepCategoriesWithExtras(analysisCategories, defaults, projectConfig);
  return result.categories;
};

// Extended version that also returns contingency and taxes separately
// Optionally filters categories based on project configuration (e.g., garage with monolithic slab).
export const mapAnalysisToStepCategoriesWithExtras = (
  analysisCategories: IncomingAnalysisCategory[],
  defaults: BudgetCategory[] = defaultCategories,
  projectConfig?: ProjectConfig
): MappedBudgetResult => {
  // Build categories with project type support (e.g., adds demolition for agrandissement)
  const projectTypeDefaults = projectConfig?.projectType
    ? buildDefaultCategories(projectConfig.projectType)
    : defaults;
  // Then filter based on project configuration (e.g., remove basement for garage with monolithic slab)
  const filteredDefaults = projectConfig 
    ? filterCategoriesForProjectType(projectTypeDefaults, projectConfig)
    : projectTypeDefaults;
    
  const mapped: BudgetCategory[] = filteredDefaults.map((d) => ({
    ...d,
    budget: 0,
    spent: 0,
    items: [],
  }));

  const byName = new Map(mapped.map((c) => [c.name, c] as const));
  const byNormalizedName = new Map(mapped.map((c) => [normalizeKey(c.name), c] as const));

  let contingencyAmount = 0;
  let taxesAmount = 0;

  const analysisKeys = new Set(analysisCategories.map((c) => normalizeKey(c.name)));
  const hasExplicitExcavation = Array.from(analysisKeys).some((k) => k.includes("excav"));

  for (const cat of analysisCategories) {
    const key = normalizeKey(cat.name);

    if (key.includes("tax")) {
      taxesAmount += Number(cat.budget) || 0;
      continue;
    }
    if (key.includes("contingence") || key.includes("budget imprévu") || key.includes("budget imprevu")) {
      contingencyAmount += Number(cat.budget) || 0;
      continue;
    }

    // Pick mapping rule (with a small dynamic tweak for excavation)
    const rule = analysisToStepMap[key];
    if (!rule || rule.length === 0) {
      // Fallback: match by normalized name against step categories
      const directMatch = byNormalizedName.get(key) ?? byName.get(cat.name);
      if (directMatch) {
        directMatch.budget += Number(cat.budget) || 0;
        if (cat.items?.length) {
          directMatch.items = [...(directMatch.items || []), ...cat.items];
        }
      }
      continue;
    }

    // If excavation is missing in the analysis, we allow a small portion of "Fondation" to fill it.
    const targets: MappingTarget[] =
      key === "fondation" && !hasExplicitExcavation
        ? [{ target: "Excavation", weight: 0.15 }, ...rule.map((r) => ({ ...r, weight: r.weight * 0.85 }))]
        : rule;

    const totalBudget = Number(cat.budget) || 0;
    if (totalBudget <= 0) continue;

    const weightSum = targets.reduce((s, t) => s + (Number(t.weight) || 0), 0) || 1;

    targets.forEach((t) => {
      const target = byName.get(t.target);
      if (!target) return;
      const weightRatio = (Number(t.weight) || 0) / weightSum;
      target.budget += totalBudget * weightRatio;

      // Distribute items proportionally with adjusted costs so that details match the budget
      if (cat.items?.length && weightRatio > 0) {
        const adjustedItems = cat.items.map((item) => ({
          ...item,
          cost: Math.round((Number(item.cost) || 0) * weightRatio),
        }));
        target.items = [...(target.items || []), ...adjustedItems];
      }
    });
  }

  // Reroute common misclassifications (ex: dalle/drain listed under Fondation)
  const rerouted = rerouteFoundationItems(mapped);

  // Calculate subtotal (before taxes and contingency)
  const subTotal = rerouted.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);

  return {
    categories: rerouted,
    contingency: contingencyAmount,
    taxes: taxesAmount,
    subTotal,
  };
};
