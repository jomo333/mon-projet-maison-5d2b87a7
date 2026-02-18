import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface Task {
  id: string;
  title: string;
  description: string;
  tips?: string[];
  documents?: string[];
}

export interface Step {
  id: string;
  title: string;
  description: string;
  phase: "pre-construction" | "gros-oeuvre" | "second-oeuvre" | "finitions";
  phaseLabel: string;
  icon: string;
  duration: string;
  tasks: Task[];
}

export interface Phase {
  id: "pre-construction" | "gros-oeuvre" | "second-oeuvre" | "finitions";
  label: string;
  color: string;
}

// Step IDs for reference (demolition-prep is only for agrandissement projects)
export const stepIds = [
  "planification",
  "plans-permis",
  "soumissions",
  "financement",
  "demolition-prep",
  "excavation",
  "fondation",
  "structure",
  "toiture",
  "fenetres-portes",
  "isolation",
  "plomberie-sous-dalle",
  "dalle-sous-sol",
  "murs-division",
  "plomberie-roughin",
  "electricite-roughin",
  "hvac",
  "exterieur",
  "gypse",
  "revetements-sol",
  "cuisine-sdb",
  "finitions-int",
  "electricite-finition",
  "plomberie-finition",
  "inspections-finales",
] as const;

export type StepId = typeof stepIds[number];

// Phase labels
const phaseLabels = {
  "pre-construction": "steps.phases.preConstruction",
  "gros-oeuvre": "steps.phases.grosOeuvre",
  "second-oeuvre": "steps.phases.secondOeuvre",
  "finitions": "steps.phases.finitions",
} as const;

// Steps only visible for certain project types
export const agrandissementOnlySteps = ["demolition-prep"] as const;

// Step metadata (non-translatable)
const stepMeta: Record<StepId, { phase: Step["phase"]; icon: string }> = {
  planification: { phase: "pre-construction", icon: "ClipboardList" },
  "plans-permis": { phase: "pre-construction", icon: "FileText" },
  soumissions: { phase: "pre-construction", icon: "FileCheck" },
  financement: { phase: "pre-construction", icon: "DollarSign" },
  "demolition-prep": { phase: "gros-oeuvre", icon: "Hammer" },
  excavation: { phase: "gros-oeuvre", icon: "Shovel" },
  fondation: { phase: "gros-oeuvre", icon: "Layers" },
  structure: { phase: "gros-oeuvre", icon: "Home" },
  toiture: { phase: "gros-oeuvre", icon: "Umbrella" },
  "fenetres-portes": { phase: "gros-oeuvre", icon: "DoorOpen" },
  isolation: { phase: "second-oeuvre", icon: "Thermometer" },
  "plomberie-sous-dalle": { phase: "second-oeuvre", icon: "Droplets" },
  "dalle-sous-sol": { phase: "second-oeuvre", icon: "Square" },
  "murs-division": { phase: "second-oeuvre", icon: "LayoutGrid" },
  "plomberie-roughin": { phase: "second-oeuvre", icon: "Droplets" },
  "electricite-roughin": { phase: "second-oeuvre", icon: "Zap" },
  hvac: { phase: "second-oeuvre", icon: "Wind" },
  exterieur: { phase: "second-oeuvre", icon: "Building" },
  gypse: { phase: "finitions", icon: "PaintBucket" },
  "revetements-sol": { phase: "finitions", icon: "Square" },
  "cuisine-sdb": { phase: "finitions", icon: "ChefHat" },
  "finitions-int": { phase: "finitions", icon: "Sparkles" },
  "electricite-finition": { phase: "finitions", icon: "Zap" },
  "plomberie-finition": { phase: "finitions", icon: "Droplets" },
  "inspections-finales": { phase: "finitions", icon: "ClipboardCheck" },
};

// Task IDs per step
const stepTaskIds: Record<StepId, string[]> = {
  planification: ["besoins", "budget-initial", "terrain", "preapprobation-planification"],
  "plans-permis": ["plans-architecture", "test-sol", "services-publics", "permis-construction"],
  soumissions: ["obtenir-soumissions", "assurance-chantier"],
  financement: ["pret-construction"],
  "demolition-prep": ["protection-existant", "demolition-int", "demolition-ext", "nettoyage-debris"],
  excavation: ["implantation", "deboisement", "excavation-creusage"],
  fondation: ["coulage-fondation", "drain-remblai"],
  structure: ["plancher", "murs", "etage", "fermes-toit", "pontage", "etancheite"],
  toiture: ["membrane"],
  "fenetres-portes": ["fenetres", "portes-ext"],
  isolation: ["isolation-murs", "isolation-toit", "insonorisation", "pare-vapeur", "fourrures-clouage"],
  "plomberie-sous-dalle": ["plomberie-sous-dalle-visite"],
  "dalle-sous-sol": ["preparation-dalle", "coulage-dalle"],
  "murs-division": ["construire-escalier", "ossature-murs", "cadrage-portes"],
  "plomberie-roughin": ["plomberie-brute", "chauffe-eau", "conduite-gaz", "balayeuse-centrale", "branchements"],
  "electricite-roughin": ["entree-electrique", "filage", "inspection-electrique"],
  hvac: ["chauffage", "vrc", "conduits"],
  exterieur: ["revetement", "fascia-soffite", "balcons-terrasses", "amenagement"],
  gypse: ["pose-gypse", "tirage-joints", "peinture"],
  "revetements-sol": ["plancher-bois", "ceramique"],
  "cuisine-sdb": ["armoires", "comptoirs"],
  "finitions-int": ["portes-int", "moulures", "escalier", "peinture-finition"],
  "electricite-finition": ["prises-interrupteurs", "luminaires", "appareils-electriques"],
  "plomberie-finition": ["robinetterie", "toilettes-lavabos", "douche-bain"],
  "inspections-finales": ["inspection-municipale", "inspection-garantie", "certificat-localisation"],
};

export function useConstructionSteps(): Step[] {
  const { t } = useTranslation();

  return useMemo(() => {
    return stepIds.map((stepId) => {
      const meta = stepMeta[stepId];
      const taskIds = stepTaskIds[stepId];

      const tasks: Task[] = taskIds.map((taskId) => {
        const tipsKey = `steps.${stepId}.tasks.${taskId}.tips`;
        const docsKey = `steps.${stepId}.tasks.${taskId}.documents`;
        
        // Get tips array if exists
        const tipsRaw = t(tipsKey, { returnObjects: true, defaultValue: [] });
        const tips = Array.isArray(tipsRaw) ? tipsRaw : [];
        
        // Get documents array if exists
        const docsRaw = t(docsKey, { returnObjects: true, defaultValue: [] });
        const documents = Array.isArray(docsRaw) ? docsRaw : [];

        return {
          id: taskId,
          title: t(`steps.${stepId}.tasks.${taskId}.title`),
          description: t(`steps.${stepId}.tasks.${taskId}.description`),
          ...(tips.length > 0 && { tips }),
          ...(documents.length > 0 && { documents }),
        };
      });

      return {
        id: stepId,
        title: t(`steps.${stepId}.title`),
        description: t(`steps.${stepId}.description`),
        phase: meta.phase,
        phaseLabel: t(phaseLabels[meta.phase]),
        icon: meta.icon,
        duration: t(`steps.${stepId}.duration`),
        tasks,
      };
    });
  }, [t]);
}

// Helper to get a single step by ID
export function useConstructionStep(stepId: string): Step | undefined {
  const steps = useConstructionSteps();
  return useMemo(() => steps.find((s) => s.id === stepId), [steps, stepId]);
}

// Hook for phases with translated labels
export function usePhases(): Phase[] {
  const { t } = useTranslation();

  return useMemo(() => [
    { id: "pre-construction", label: t("steps.phases.preConstruction"), color: "bg-blue-500" },
    { id: "gros-oeuvre", label: t("steps.phases.grosOeuvre"), color: "bg-orange-500" },
    { id: "second-oeuvre", label: t("steps.phases.secondOeuvre"), color: "bg-purple-500" },
    { id: "finitions", label: t("steps.phases.finitions"), color: "bg-green-500" },
  ], [t]);
}
