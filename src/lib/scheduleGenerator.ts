import { format, addDays, subDays, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import { constructionSteps } from "@/data/constructionSteps";
import { getTradeColor } from "@/data/tradeTypes";
import { supabase } from "@/integrations/supabase/client";

// Interface pour les durées de référence
interface ReferenceDuration {
  step_id: string;
  step_name: string;
  base_duration_days: number;
  base_square_footage: number;
  min_duration_days: number | null;
  max_duration_days: number | null;
  scaling_factor: number;
  notes: string | null;
}

// Étapes de préparation (à planifier AVANT la date visée de début des travaux)
// Ordre: Planification → Plans et permis → Soumissions → Financement
const preparationSteps = ["planification", "plans-permis", "soumissions", "financement"];

// Mapping des étapes vers les métiers par défaut
const stepTradeMapping: Record<string, string> = {
  planification: "planification",
  financement: "financement",
  "plans-permis": "plans-permis",
  soumissions: "soumissions",
  "demolition-prep": "demolition",
  excavation: "excavation",
  fondation: "fondation",
  structure: "charpente",
  toiture: "toiture",
  "fenetres-portes": "fenetre",
  isolation: "isolation",
  "plomberie-sous-dalle": "plomberie",
  "dalle-sous-sol": "beton",
  "murs-division": "charpente",
  "plomberie-roughin": "plomberie",
  "electricite-roughin": "electricite",
  hvac: "hvac",
  exterieur: "exterieur",
  gypse: "gypse",
  "revetements-sol": "plancher",
  "cuisine-sdb": "armoires",
  "finitions-int": "finitions",
  "electricite-finition": "electricite",
  "plomberie-finition": "plomberie",
  "inspections-finales": "inspecteur",
};

// Durées par défaut en jours ouvrables (utilisé si pas de données de référence)
const defaultDurations: Record<string, number> = {
  planification: 5,
  "plans-permis": 40,
  soumissions: 15,
  financement: 15,
  "demolition-prep": 5,
  excavation: 5,
  fondation: 5,
  structure: 8,
  toiture: 2,
  "fenetres-portes": 2,
  isolation: 8,
  "plomberie-sous-dalle": 1,
  "dalle-sous-sol": 2,
  "murs-division": 3,
  "plomberie-roughin": 4,
  "electricite-roughin": 4,
  hvac: 7,
  exterieur: 18,
  gypse: 15,
  "revetements-sol": 7,
  "cuisine-sdb": 10,
  "finitions-int": 8,
  "electricite-finition": 3,
  "plomberie-finition": 3,
  "inspections-finales": 2,
};

// Délais fournisseurs par métier (jours avant la date de début)
const supplierLeadDays: Record<string, number> = {
  "fenetres-portes": 42,
  "cuisine-sdb": 35,
  "revetements-sol": 14,
};

// Délais de fabrication
const fabricationLeadDays: Record<string, number> = {
  "cuisine-sdb": 21,
  "fenetres-portes": 28,
};

// Délais obligatoires après certaines étapes (jours calendrier)
const minimumDelayAfterStep: Record<string, { afterStep: string; days: number; reason: string }> = {
  structure: {
    afterStep: "fondation",
    days: 21,
    reason: "Cure du béton des fondations (minimum 3 semaines)",
  },
  exterieur: {
    afterStep: "electricite-roughin",
    days: 0,
    reason: "Travaux extérieurs peuvent commencer après le filage électrique",
  },
};

// Étapes nécessitant des mesures
const measurementConfig: Record<string, { afterStep: string; notes: string }> = {
  "cuisine-sdb": {
    afterStep: "gypse",
    notes: "Mesures après gypse, avant peinture",
  },
  "revetements-sol": {
    afterStep: "gypse",
    notes: "Mesures après tirage de joints",
  },
};

/**
 * Récupère les durées de référence depuis la base de données
 */
async function getReferenceDurations(): Promise<Map<string, ReferenceDuration>> {
  const { data, error } = await supabase
    .from("schedule_reference_durations")
    .select("*");

  const map = new Map<string, ReferenceDuration>();
  if (data && !error) {
    for (const ref of data) {
      map.set(ref.step_id, ref as ReferenceDuration);
    }
  }
  return map;
}

/**
 * Calcule la durée ajustée au prorata de la superficie
 * @param stepId - ID de l'étape
 * @param projectSquareFootage - Superficie du projet en pi²
 * @param referenceDurations - Map des durées de référence
 * @returns Durée ajustée en jours ouvrables
 */
function calculateAdjustedDuration(
  stepId: string,
  projectSquareFootage: number | null,
  referenceDurations: Map<string, ReferenceDuration>
): number {
  const ref = referenceDurations.get(stepId);
  
  // Si pas de référence ou pas de superficie, utiliser la durée par défaut
  if (!ref || !projectSquareFootage) {
    return defaultDurations[stepId] || 5;
  }

  const baseSquareFootage = ref.base_square_footage || 2000;
  const baseDuration = ref.base_duration_days;
  const scalingFactor = Number(ref.scaling_factor) || 1.0;
  const minDuration = ref.min_duration_days || 1;
  const maxDuration = ref.max_duration_days || baseDuration * 3;

  // Calcul au prorata avec facteur d'échelle
  // Formule: duration = baseDuration * (1 + (ratio - 1) * scalingFactor)
  // où ratio = projectSquareFootage / baseSquareFootage
  const ratio = projectSquareFootage / baseSquareFootage;
  const adjustedDuration = Math.round(
    baseDuration * (1 + (ratio - 1) * scalingFactor)
  );

  // Appliquer les limites min/max
  return Math.max(minDuration, Math.min(maxDuration, adjustedDuration));
}

/**
 * Récupère la superficie et le type d'un projet
 */
async function getProjectInfo(projectId: string): Promise<{ squareFootage: number | null; projectType: string | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("square_footage, project_type")
    .eq("id", projectId)
    .single();

  if (error || !data) return { squareFootage: null, projectType: null };
  return { squareFootage: data.square_footage, projectType: data.project_type };
}

/**
 * Récupère la superficie d'un projet (kept for backwards compat)
 */
async function getProjectSquareFootage(projectId: string): Promise<number | null> {
  const info = await getProjectInfo(projectId);
  return info.squareFootage;
}

/**
 * Calcule la date de fin en ajoutant des jours ouvrables (vers le futur)
 */
export function calculateEndDate(startDate: string, businessDays: number): string {
  let date = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    date = addDays(date, 1);
    if (!isWeekend(date)) {
      daysAdded++;
    }
  }
  
  return format(date, "yyyy-MM-dd");
}

/**
 * Estime la date la plus tôt possible pour commencer les travaux (excavation)
 * selon les étapes de préparation restantes, en partant d'aujourd'hui.
 *
 * NOTE: estimation basée sur les durées par défaut (sans superficie).
 */
export function estimateEarliestWorkStartDate(startingStepId?: string): string {
  const today = format(new Date(), "yyyy-MM-dd");

  const startFromStep = startingStepId || "planification";
  const startIndex = constructionSteps.findIndex((s) => s.id === startFromStep);
  const stepsToSchedule = startIndex >= 0 ? constructionSteps.slice(startIndex) : constructionSteps;
  const prepSteps = stepsToSchedule.filter((s) => preparationSteps.includes(s.id));

  if (prepSteps.length === 0) {
    return today;
  }

  let current = today;
  for (const step of prepSteps) {
    const duration = defaultDurations[step.id] || 5;
    const endDate = calculateEndDate(current, duration);
    // On avance au prochain jour ouvrable entre les étapes
    current = calculateEndDate(endDate, 1);
  }

  return current;
}

/**
 * Calcule la date de début en soustrayant des jours ouvrables (vers le passé)
 */
function calculateStartDateBackward(endDate: string, businessDays: number): string {
  let date = new Date(endDate);
  let daysSubtracted = 0;
  
  while (daysSubtracted < businessDays) {
    date = subDays(date, 1);
    if (!isWeekend(date)) {
      daysSubtracted++;
    }
  }
  
  return format(date, "yyyy-MM-dd");
}

/**
 * Génère automatiquement l'échéancier complet pour un projet
 * La préparation commence AUJOURD'HUI (jour de l'entrée des données)
 * La date visée correspond au JOUR 1 des travaux (excavation)
 * Les durées sont ajustées au prorata de la superficie du projet
 * 
 * @param projectId - ID du projet
 * @param targetStartDate - Date visée pour le début des travaux
 * @param startingStepId - ID de l'étape de départ (step_id de constructionSteps)
 */
export async function generateProjectSchedule(
  projectId: string,
  targetStartDate: string,
  startingStepId?: string
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    // Récupérer les durées de référence et la superficie du projet
    console.log("[generateProjectSchedule] Fetching reference durations and project info...");
    const [referenceDurations, projectInfo] = await Promise.all([
      getReferenceDurations(),
      getProjectInfo(projectId),
    ]);
    const projectSquareFootage = projectInfo.squareFootage;
    const isAgrandissement = projectInfo.projectType?.toLowerCase()?.includes("agrandissement") ?? false;
    
    console.log(`[generateProjectSchedule] Reference durations: ${referenceDurations.size} entries, Project square footage: ${projectSquareFootage || 'N/A'} pi², Type: ${projectInfo.projectType || 'N/A'}`);

    // Trouver l'index de départ dans constructionSteps
    // Si startingStepId est fourni, l'utiliser directement
    // Sinon, commencer à "planification"
    const startFromStep = startingStepId || "planification";
    const startIndex = constructionSteps.findIndex(s => s.id === startFromStep);
    const allStepsToSchedule = startIndex >= 0 
      ? constructionSteps.slice(startIndex) 
      : constructionSteps;

    // Filter demolition-prep: only include for agrandissement projects
    const stepsToSchedule = allStepsToSchedule.filter(s => 
      s.id !== "demolition-prep" || isAgrandissement
    );

    // Séparer les étapes de préparation et les étapes de construction
    const prepSteps = stepsToSchedule.filter(s => preparationSteps.includes(s.id));
    const constructionStepsFiltered = stepsToSchedule.filter(s => !preparationSteps.includes(s.id));

    const schedulesToInsert: any[] = [];
    const today = format(new Date(), "yyyy-MM-dd");
    let warning: string | undefined;

    // Info sur le calcul au prorata
    if (projectSquareFootage && referenceDurations.size > 0) {
      console.log(`Calcul des durées au prorata - Superficie projet: ${projectSquareFootage} pi² (référence: 2000 pi²)`);
    }

    // 1. Planifier les étapes de PRÉPARATION à partir d'AUJOURD'HUI
    let currentPrepDate = today;
    let prepEndDate = today;
    
    if (prepSteps.length > 0) {
      for (const step of prepSteps) {
        const tradeType = stepTradeMapping[step.id] || "autre";
        const duration = calculateAdjustedDuration(step.id, projectSquareFootage, referenceDurations);
        const endDate = calculateEndDate(currentPrepDate, duration);
        
        schedulesToInsert.push({
          project_id: projectId,
          step_id: step.id,
          step_name: step.title,
          trade_type: tradeType,
          trade_color: getTradeColor(tradeType),
          estimated_days: duration,
          start_date: currentPrepDate,
          end_date: endDate,
          supplier_schedule_lead_days: supplierLeadDays[step.id] || 21,
          fabrication_lead_days: fabricationLeadDays[step.id] || 0,
          measurement_required: false,
          measurement_after_step_id: null,
          measurement_notes: null,
          status: currentPrepDate === today ? "in_progress" : "scheduled",
        });

        prepEndDate = endDate;
        currentPrepDate = calculateEndDate(endDate, 1);
      }
    }

    // 2. Vérifier si la date visée est réalisable
    let actualConstructionStart = targetStartDate;
    
    if (prepSteps.length > 0) {
      // S'il y a des étapes de préparation, vérifier que la date visée est après leur fin
      const earliestConstructionStart = calculateEndDate(prepEndDate, 1);
      
      if (earliestConstructionStart > targetStartDate) {
        actualConstructionStart = earliestConstructionStart;
        const delayDays = Math.ceil(
          (new Date(earliestConstructionStart).getTime() - new Date(targetStartDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        warning = `⚠️ La date visée du ${format(new Date(targetStartDate), "d MMMM yyyy", { locale: fr })} est impossible. La préparation nécessite plus de temps. Nouvelle date de début des travaux: ${format(new Date(actualConstructionStart), "d MMMM yyyy", { locale: fr })} (+${delayDays} jours)`;
      }
    } else {
      // Pas d'étapes de préparation: la date visée est la date de début des travaux
      // Vérifier que la date n'est pas dans le passé
      if (targetStartDate < today) {
        actualConstructionStart = today;
        warning = `⚠️ La date visée est dans le passé. Début des travaux ajusté à aujourd'hui.`;
      }
    }

    // 3. Planifier les étapes de CONSTRUCTION à partir de la date effective
    let currentDate = actualConstructionStart;
    let previousStepEndDates: Record<string, string> = {};
    
    // Stocker la date de fin de l'électricité rough-in pour le revêtement extérieur
    let electriciteRoughinEndDate: string | null = null;

    // Séparer les étapes intérieures et le revêtement extérieur
    const exteriorStep = constructionStepsFiltered.find(s => s.id === "exterieur");
    const interiorSteps = constructionStepsFiltered.filter(s => s.id !== "exterieur");

    for (const step of interiorSteps) {
      const tradeType = stepTradeMapping[step.id] || "autre";
      const duration = calculateAdjustedDuration(step.id, projectSquareFootage, referenceDurations);
      
      // Vérifier s'il y a un délai minimum après une étape précédente
      const delayConfig = minimumDelayAfterStep[step.id];
      if (delayConfig && previousStepEndDates[delayConfig.afterStep]) {
        const requiredStartDate = addDays(new Date(previousStepEndDates[delayConfig.afterStep]), delayConfig.days);
        const requiredStartStr = format(requiredStartDate, "yyyy-MM-dd");
        
        if (requiredStartStr > currentDate) {
          currentDate = requiredStartStr;
        }
      }
      
      const endDate = calculateEndDate(currentDate, duration);
      const measurementReq = measurementConfig[step.id];

      schedulesToInsert.push({
        project_id: projectId,
        step_id: step.id,
        step_name: step.title,
        trade_type: tradeType,
        trade_color: getTradeColor(tradeType),
        estimated_days: duration,
        start_date: currentDate,
        end_date: endDate,
        supplier_schedule_lead_days: supplierLeadDays[step.id] || 21,
        fabrication_lead_days: fabricationLeadDays[step.id] || 0,
        measurement_required: !!measurementReq,
        measurement_after_step_id: measurementReq?.afterStep || null,
        measurement_notes: measurementReq?.notes || null,
        status: "scheduled",
      });

      previousStepEndDates[step.id] = endDate;
      
      // Stocker la date de fin de l'électricité rough-in
      if (step.id === "electricite-roughin") {
        electriciteRoughinEndDate = endDate;
      }
      
      currentDate = calculateEndDate(endDate, 1);
    }
    
    // 4. Planifier le revêtement extérieur en parallèle après l'électricité rough-in
    // Il commence le jour après la fin de l'électricité rough-in et chevauche HVAC, gypse, etc.
    if (exteriorStep && electriciteRoughinEndDate) {
      const tradeType = stepTradeMapping[exteriorStep.id] || "exterieur";
      const duration = calculateAdjustedDuration(exteriorStep.id, projectSquareFootage, referenceDurations);
      
      // Commencer le jour suivant la fin de l'électricité rough-in
      const exteriorStartDate = calculateEndDate(electriciteRoughinEndDate, 1);
      const exteriorEndDate = calculateEndDate(exteriorStartDate, duration);
      
      schedulesToInsert.push({
        project_id: projectId,
        step_id: exteriorStep.id,
        step_name: exteriorStep.title,
        trade_type: tradeType,
        trade_color: getTradeColor(tradeType),
        estimated_days: duration,
        start_date: exteriorStartDate,
        end_date: exteriorEndDate,
        supplier_schedule_lead_days: supplierLeadDays[exteriorStep.id] || 21,
        fabrication_lead_days: fabricationLeadDays[exteriorStep.id] || 0,
        measurement_required: false,
        measurement_after_step_id: null,
        measurement_notes: null,
        status: "scheduled",
      });
      
      previousStepEndDates[exteriorStep.id] = exteriorEndDate;
    }

    // Utiliser upsert pour éviter les doublons
    const { error } = await supabase
      .from("project_schedules")
      .upsert(schedulesToInsert, { 
        onConflict: "project_id,step_id",
        ignoreDuplicates: false 
      });

    if (error) {
      console.error("Error inserting schedules:", error);
      return { success: false, error: error.message };
    }

    // Générer les alertes pour chaque étape
    await generateScheduleAlerts(projectId, schedulesToInsert);

    return { success: true, warning };
  } catch (error: any) {
    console.error("Error generating schedule:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Génère les alertes pour les étapes planifiées
 */
async function generateScheduleAlerts(projectId: string, schedules: any[]): Promise<void> {
  const alertsToInsert: any[] = [];

  for (const schedule of schedules) {
    if (!schedule.start_date) continue;

    const startDate = new Date(schedule.start_date);

    // Alerte pour appeler le fournisseur
    if (schedule.supplier_schedule_lead_days > 0) {
      const callDate = addDays(startDate, -schedule.supplier_schedule_lead_days);
      if (callDate >= new Date()) {
        const formattedStartDate = format(startDate, "d MMMM yyyy", { locale: fr });
        alertsToInsert.push({
          project_id: projectId,
          schedule_id: schedule.id || crypto.randomUUID(),
          alert_type: "supplier_call",
          alert_date: format(callDate, "yyyy-MM-dd"),
          message: `📞 Contacter ${schedule.supplier_name || "le fournisseur"} pour planifier "${schedule.step_name}" - Début des travaux prévu le ${formattedStartDate} (préavis de ${schedule.supplier_schedule_lead_days} jours)`,
          is_dismissed: false,
        });
      }
    }

    // Alerte pour le début de fabrication
    if (schedule.fabrication_lead_days > 0) {
      const fabDate = addDays(startDate, -schedule.fabrication_lead_days);
      if (fabDate >= new Date()) {
        alertsToInsert.push({
          project_id: projectId,
          schedule_id: schedule.id || crypto.randomUUID(),
          alert_type: "fabrication_start",
          alert_date: format(fabDate, "yyyy-MM-dd"),
          message: `Début de fabrication pour ${schedule.step_name}`,
          is_dismissed: false,
        });
      }
    }
  }

  if (alertsToInsert.length > 0) {
    // Note: Les alertes seront générées via le hook useProjectSchedule
  }
}

/**
 * Calcule la durée totale estimée du projet en jours ouvrables
 * Utilise les durées par défaut (sans ajustement au prorata)
 * 
 * @param startingStepId - ID de l'étape de départ (step_id de constructionSteps)
 */
export function calculateTotalProjectDuration(startingStepId?: string): {
  preparationDays: number;
  constructionDays: number;
  totalDays: number;
} {
  const startFromStep = startingStepId || "planification";
  const startIndex = constructionSteps.findIndex(s => s.id === startFromStep);
  const stepsToCount = startIndex >= 0 
    ? constructionSteps.slice(startIndex) 
    : constructionSteps;

  const preparationDays = stepsToCount
    .filter(s => preparationSteps.includes(s.id))
    .reduce((total, step) => total + (defaultDurations[step.id] || 5), 0);

  const constructionDays = stepsToCount
    .filter(s => !preparationSteps.includes(s.id))
    .reduce((total, step) => total + (defaultDurations[step.id] || 5), 0);

  return {
    preparationDays,
    constructionDays,
    totalDays: preparationDays + constructionDays,
  };
}

/**
 * Calcule la durée totale estimée au prorata de la superficie
 * 
 * @param projectId - ID du projet
 * @param startingStepId - ID de l'étape de départ (step_id de constructionSteps)
 */
export async function calculateTotalProjectDurationWithProrata(
  projectId: string,
  startingStepId?: string
): Promise<{
  preparationDays: number;
  constructionDays: number;
  totalDays: number;
  squareFootage: number | null;
  isProrated: boolean;
}> {
  const [referenceDurations, projectSquareFootage] = await Promise.all([
    getReferenceDurations(),
    getProjectSquareFootage(projectId),
  ]);

  const startFromStep = startingStepId || "planification";
  const startIndex = constructionSteps.findIndex(s => s.id === startFromStep);
  const stepsToCount = startIndex >= 0 
    ? constructionSteps.slice(startIndex) 
    : constructionSteps;

  const preparationDays = stepsToCount
    .filter(s => preparationSteps.includes(s.id))
    .reduce((total, step) => total + calculateAdjustedDuration(step.id, projectSquareFootage, referenceDurations), 0);

  const constructionDays = stepsToCount
    .filter(s => !preparationSteps.includes(s.id))
    .reduce((total, step) => total + calculateAdjustedDuration(step.id, projectSquareFootage, referenceDurations), 0);

  return {
    preparationDays,
    constructionDays,
    totalDays: preparationDays + constructionDays,
    squareFootage: projectSquareFootage,
    isProrated: projectSquareFootage !== null && referenceDurations.size > 0,
  };
}

/**
 * Calcule la date de début de préparation en fonction de la date visée des travaux
 */
export function calculatePreparationStartDate(targetConstructionDate: string, currentStage?: string): string {
  const { preparationDays } = calculateTotalProjectDuration(currentStage);
  return calculateStartDateBackward(targetConstructionDate, preparationDays);
}
