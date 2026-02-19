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
 * Get effective order for a schedule (manual tasks with linked_step_id go after that step)
 */
export const getScheduleExecutionOrder = (schedule: {
  step_id: string;
  measurement_after_step_id?: string | null;
  notes?: string | null;
}): number => {
  const baseOrder = getStepExecutionOrder(schedule.step_id);
  if (schedule.step_id.startsWith("manual-")) {
    const linkedId = schedule.measurement_after_step_id || parseLinkedStepFromNotes(schedule.notes);
    if (linkedId) {
      return getStepExecutionOrder(linkedId) + 0.5; // juste après l'étape liée
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
 * Manual tasks with linked_step_id are placed right after that step
 */
export const sortSchedulesByExecutionOrder = <T extends {
  step_id: string;
  measurement_after_step_id?: string | null;
  notes?: string | null;
}>(
  schedules: T[]
): T[] => {
  return [...schedules].sort((a, b) => {
    const orderA = getScheduleExecutionOrder(a);
    const orderB = getScheduleExecutionOrder(b);
    return orderA - orderB;
  });
};
