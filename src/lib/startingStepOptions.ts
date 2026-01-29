import { constructionSteps } from "@/data/constructionSteps";

// Options d'étapes de départ pour la création de projet
// Utilise les mêmes ID que constructionSteps
export interface StartingStepOption {
  value: string;
  label: string;
  description: string;
  phase: string;
}

// Étapes de préparation (pré-construction)
export const preparationStepIds = ["planification", "plans-permis", "soumissions", "financement"];

// Étapes principales à proposer comme point de départ
// On regroupe certaines étapes pour simplifier le choix utilisateur
export const startingStepOptions: StartingStepOption[] = [
  // Pré-construction
  { 
    value: "planification", 
    label: "Planification", 
    description: "Je réfléchis à mon projet",
    phase: "pre-construction"
  },
  { 
    value: "plans-permis", 
    label: "Plans et permis", 
    description: "Je prépare ou attends mes permis",
    phase: "pre-construction"
  },
  { 
    value: "soumissions", 
    label: "Soumissions", 
    description: "J'obtiens les soumissions des entrepreneurs",
    phase: "pre-construction"
  },
  { 
    value: "financement", 
    label: "Financement", 
    description: "Je finalise mon financement",
    phase: "pre-construction"
  },
  // Gros œuvre
  { 
    value: "excavation", 
    label: "Excavation", 
    description: "Les travaux d'excavation commencent",
    phase: "gros-oeuvre"
  },
  { 
    value: "fondation", 
    label: "Fondation", 
    description: "Les travaux de fondation sont en cours",
    phase: "gros-oeuvre"
  },
  { 
    value: "structure", 
    label: "Structure", 
    description: "La charpente et la structure",
    phase: "gros-oeuvre"
  },
  { 
    value: "toiture", 
    label: "Toiture", 
    description: "Installation de la toiture",
    phase: "gros-oeuvre"
  },
  { 
    value: "fenetres-portes", 
    label: "Fenêtres et portes", 
    description: "Installation de la fenestration",
    phase: "gros-oeuvre"
  },
  // Second œuvre
  { 
    value: "isolation", 
    label: "Isolation", 
    description: "Isolation et pare-vapeur",
    phase: "second-oeuvre"
  },
  { 
    value: "plomberie-roughin", 
    label: "Plomberie (rough-in)", 
    description: "Installation de la plomberie brute",
    phase: "second-oeuvre"
  },
  { 
    value: "electricite-roughin", 
    label: "Électricité (rough-in)", 
    description: "Installation électrique brute",
    phase: "second-oeuvre"
  },
  { 
    value: "gypse", 
    label: "Gypse", 
    description: "Installation des plaques de gypse",
    phase: "second-oeuvre"
  },
  // Finitions
  { 
    value: "revetements-sol", 
    label: "Revêtements de sol", 
    description: "Installation des planchers",
    phase: "finitions"
  },
  { 
    value: "cuisine-sdb", 
    label: "Cuisine et SDB", 
    description: "Installation cuisine et salle de bain",
    phase: "finitions"
  },
  { 
    value: "finitions-int", 
    label: "Finitions intérieures", 
    description: "Finitions et dernières touches",
    phase: "finitions"
  },
];

/**
 * Filtre les étapes de construction à partir d'un step_id de départ
 * @param startingStepId - L'ID de l'étape de départ
 * @returns Les étapes à planifier (à partir de startingStepId)
 */
export function getStepsFromStartingPoint(startingStepId: string | null | undefined) {
  if (!startingStepId) {
    return constructionSteps;
  }

  const startIndex = constructionSteps.findIndex(s => s.id === startingStepId);
  if (startIndex === -1) {
    return constructionSteps;
  }

  return constructionSteps.slice(startIndex);
}

/**
 * Vérifie si une étape fait partie des étapes de préparation
 */
export function isPreparationStep(stepId: string): boolean {
  return preparationStepIds.includes(stepId);
}

/**
 * Obtient l'index d'une étape dans constructionSteps
 */
export function getStepIndex(stepId: string): number {
  return constructionSteps.findIndex(s => s.id === stepId);
}
