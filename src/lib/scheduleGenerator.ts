import { format, addDays, subDays, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import { constructionSteps } from "@/data/constructionSteps";
import { getTradeColor } from "@/data/tradeTypes";
import { supabase } from "@/integrations/supabase/client";

// Étapes de préparation (à planifier AVANT la date visée de début des travaux)
const preparationSteps = ["planification", "financement", "plans-permis"];

// Mapping des étapes vers les métiers par défaut
const stepTradeMapping: Record<string, string> = {
  planification: "autre",
  financement: "autre",
  "plans-permis": "autre",
  "excavation-fondation": "excavation",
  structure: "charpente",
  toiture: "toiture",
  "fenetres-portes": "fenetre",
  electricite: "electricite",
  plomberie: "plomberie",
  hvac: "hvac",
  isolation: "isolation",
  gypse: "gypse",
  "revetements-sol": "plancher",
  "cuisine-sdb": "armoires",
  "finitions-int": "finitions",
  exterieur: "exterieur",
  "inspections-finales": "inspecteur",
};

// Durées par défaut en jours ouvrables (basées sur projet réel - exclut weekends et fériés)
const defaultDurations: Record<string, number> = {
  planification: 5,        // 4-5 jours
  financement: 10,         // ok - 2 semaines
  "plans-permis": 15,      // ok - 3 semaines
  "excavation-fondation": 10, // 2 semaines
  structure: 10,           // 2 semaines
  toiture: 2,              // 2 jours
  "fenetres-portes": 2,    // 2 jours
  electricite: 6,          // 5-7 jours
  plomberie: 6,            // 5-7 jours
  hvac: 3,                 // 2-3 jours
  isolation: 5,            // ok
  gypse: 11,               // 10-12 jours
  "revetements-sol": 6,    // 5-7 jours
  "cuisine-sdb": 4,        // 3-5 jours
  "finitions-int": 5,      // ok
  exterieur: 7,            // ok
  "inspections-finales": 2, // ok
};

// Délais fournisseurs par métier (jours avant la date de début)
const supplierLeadDays: Record<string, number> = {
  "fenetres-portes": 42, // 6 semaines
  "cuisine-sdb": 35, // 5 semaines
  "revetements-sol": 14, // 2 semaines
};

// Délais de fabrication
const fabricationLeadDays: Record<string, number> = {
  "cuisine-sdb": 21, // 3 semaines
  "fenetres-portes": 28, // 4 semaines
};

// Délais obligatoires après certaines étapes (jours calendrier)
// Ex: cure du béton avant structure
const minimumDelayAfterStep: Record<string, { afterStep: string; days: number; reason: string }> = {
  structure: {
    afterStep: "excavation-fondation",
    days: 21, // 3 semaines minimum pour la cure du béton
    reason: "Cure du béton des fondations (minimum 3 semaines)",
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
 * La date visée correspond au JOUR 1 des travaux (excavation-fondation)
 * Retourne une alerte si la date visée est impossible
 */
export async function generateProjectSchedule(
  projectId: string,
  targetStartDate: string,
  currentStage?: string
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    // Mapping des stages utilisateur vers les étapes de construction
    const stageToStepMapping: Record<string, string> = {
      planification: "planification",
      permis: "plans-permis",
      fondation: "excavation-fondation",
      structure: "structure",
      finition: "gypse",
    };

    const startFromStep = currentStage ? stageToStepMapping[currentStage] : "planification";
    
    // Trouver l'index de départ dans constructionSteps
    const startIndex = constructionSteps.findIndex(s => s.id === startFromStep);
    const stepsToSchedule = startIndex >= 0 
      ? constructionSteps.slice(startIndex) 
      : constructionSteps;

    // Séparer les étapes de préparation et les étapes de construction
    const prepSteps = stepsToSchedule.filter(s => preparationSteps.includes(s.id));
    const constructionStepsFiltered = stepsToSchedule.filter(s => !preparationSteps.includes(s.id));

    const schedulesToInsert: any[] = [];
    const today = format(new Date(), "yyyy-MM-dd");
    let warning: string | undefined;

    // 1. Planifier les étapes de PRÉPARATION à partir d'AUJOURD'HUI
    let currentPrepDate = today;
    let prepEndDate = today;
    
    if (prepSteps.length > 0) {
      for (const step of prepSteps) {
        const tradeType = stepTradeMapping[step.id] || "autre";
        const duration = defaultDurations[step.id] || 5;
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
        // Prochaine étape commence après la fin de celle-ci
        currentPrepDate = calculateEndDate(endDate, 1);
      }
    }

    // 2. Vérifier si la date visée est réalisable
    // La préparation doit se terminer AVANT la date visée
    const prepFinishDate = prepSteps.length > 0 ? prepEndDate : today;
    const earliestConstructionStart = calculateEndDate(prepFinishDate, 1);
    
    let actualConstructionStart = targetStartDate;
    
    if (earliestConstructionStart > targetStartDate) {
      // La date visée est impossible - on décale et on avertit
      actualConstructionStart = earliestConstructionStart;
      const delayDays = Math.ceil(
        (new Date(earliestConstructionStart).getTime() - new Date(targetStartDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      warning = `⚠️ La date visée du ${format(new Date(targetStartDate), "d MMMM yyyy", { locale: fr })} est impossible. La préparation nécessite plus de temps. Nouvelle date de début des travaux: ${format(new Date(actualConstructionStart), "d MMMM yyyy", { locale: fr })} (+${delayDays} jours)`;
    }

    // 3. Planifier les étapes de CONSTRUCTION à partir de la date effective
    let currentDate = actualConstructionStart;
    let previousStepEndDates: Record<string, string> = {}; // Pour stocker les dates de fin par step_id

    for (const step of constructionStepsFiltered) {
      const tradeType = stepTradeMapping[step.id] || "autre";
      const duration = defaultDurations[step.id] || 5;
      
      // Vérifier s'il y a un délai minimum après une étape précédente
      const delayConfig = minimumDelayAfterStep[step.id];
      if (delayConfig && previousStepEndDates[delayConfig.afterStep]) {
        const requiredStartDate = addDays(new Date(previousStepEndDates[delayConfig.afterStep]), delayConfig.days);
        const requiredStartStr = format(requiredStartDate, "yyyy-MM-dd");
        
        // Si le délai impose une date plus tardive, on l'utilise
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

      // Stocker la date de fin pour les vérifications de délais
      previousStepEndDates[step.id] = endDate;
      
      // Prochaine étape commence après la fin de celle-ci
      currentDate = calculateEndDate(endDate, 1);
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
        alertsToInsert.push({
          project_id: projectId,
          schedule_id: schedule.id || crypto.randomUUID(),
          alert_type: "supplier_call",
          alert_date: format(callDate, "yyyy-MM-dd"),
          message: `Appeler le fournisseur pour ${schedule.step_name}`,
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
    // Note: Les alertes nécessitent l'ID du schedule, on les insère après
    // Pour l'instant on skip les alertes car on n'a pas encore les IDs
    // Les alertes seront générées via le hook useProjectSchedule
  }
}

/**
 * Calcule la durée totale estimée du projet en jours ouvrables
 * Retourne aussi les jours de préparation requis AVANT le début des travaux
 */
export function calculateTotalProjectDuration(currentStage?: string): {
  preparationDays: number;
  constructionDays: number;
  totalDays: number;
} {
  const stageToStepMapping: Record<string, string> = {
    planification: "planification",
    permis: "plans-permis",
    fondation: "excavation-fondation",
    structure: "structure",
    finition: "gypse",
  };

  const startFromStep = currentStage ? stageToStepMapping[currentStage] : "planification";
  const startIndex = constructionSteps.findIndex(s => s.id === startFromStep);
  const stepsToCount = startIndex >= 0 
    ? constructionSteps.slice(startIndex) 
    : constructionSteps;

  // Calculer les jours de préparation (avant date visée)
  const preparationDays = stepsToCount
    .filter(s => preparationSteps.includes(s.id))
    .reduce((total, step) => total + (defaultDurations[step.id] || 5), 0);

  // Calculer les jours de construction (après date visée)
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
 * Calcule la date de début de préparation en fonction de la date visée des travaux
 */
export function calculatePreparationStartDate(targetConstructionDate: string, currentStage?: string): string {
  const { preparationDays } = calculateTotalProjectDuration(currentStage);
  return calculateStartDateBackward(targetConstructionDate, preparationDays);
}
