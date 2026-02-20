import { constructionSteps } from "@/data/constructionSteps";

/**
 * Get the execution order index for a step_id based on constructionSteps
 * Returns a high number if not found to push unknown steps to the end
 */
export const getStepExecutionOrder = (stepId: string): number => {
  const index = constructionSteps.findIndex((step) => step.id === stepId);
  return index === -1 ? 999 : index;
};

/**
 * Get effective order for a schedule.
 * Manual tasks with linked_step_id: go BEFORE that step (tâche d'abord, étape décalée après),
 * SAUF si l'étape liée a is_manual_date (verrouillée) → tâche après (on ne peut pas décaler).
 */
export const getScheduleExecutionOrder = (
  schedule: {
    step_id?: string | null;
    measurement_after_step_id?: string | null;
    notes?: string | null;
    is_manual_date?: boolean;
  },
  allSchedules?: Array<{ step_id?: string | null; is_manual_date?: boolean }>
): number => {
  if (!schedule?.step_id || typeof schedule.step_id !== "string") return 999;
  const baseOrder = getStepExecutionOrder(schedule.step_id);
  if (schedule.step_id.startsWith("manual-")) {
    const linkedId = schedule.measurement_after_step_id || parseLinkedStepFromNotes(schedule.notes);
    if (linkedId) {
      const linkedStep = allSchedules?.find((x) => x.step_id === linkedId);
      const linkedIsLocked = !!linkedStep?.is_manual_date;
      if (linkedIsLocked) {
        return getStepExecutionOrder(linkedId) + 0.5; // étape verrouillée : tâche après
      }
      return getStepExecutionOrder(linkedId) - 0.5; // étape non verrouillée : tâche avant, puis "ce qui reste"
    }
  }
  return baseOrder;
};

function parseLinkedStepFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as { linkedStepId?: string };
    return parsed.linkedStepId || null;
  } catch {
    return null;
  }
}

/**
 * Sort schedules by their execution order defined in constructionSteps
 * Manual tasks with linked_step_id are placed right BEFORE that step
 * (tâche d'abord à la date demandée, puis l'étape liée est décalée après)
 */
export const sortSchedulesByExecutionOrder = <T extends {
  step_id: string;
  measurement_after_step_id?: string | null;
  notes?: string | null;
  is_manual_date?: boolean;
}>(
  schedules: T[]
): T[] => {
  return [...schedules].sort((a, b) => {
    const orderA = getScheduleExecutionOrder(a, schedules);
    const orderB = getScheduleExecutionOrder(b, schedules);
    return orderA - orderB;
  });
};
