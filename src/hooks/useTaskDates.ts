import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { constructionSteps } from "@/data/constructionSteps";
import {
  addBusinessDays,
  differenceInBusinessDays,
  format,
  max,
  min,
  parseISO,
} from "date-fns";
import { toast } from "@/hooks/use-toast";

interface TaskDate {
  id: string;
  project_id: string;
  step_id: string;
  task_id: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTaskDates(projectId: string | null) {
  const queryClient = useQueryClient();

  const taskDatesQuery = useQuery({
    queryKey: ["task-dates", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("task_dates")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data as TaskDate[];
    },
    enabled: !!projectId,
  });

  // Met à jour l'échéancier (project_schedules) à partir des dates des sous-tâches,
  // puis recalcule les étapes suivantes pour éviter les conflits si la durée change.
  const syncScheduleWithTaskDates = async (stepId: string) => {
    if (!projectId) return;

    // 1) Lire les dates de sous-tâches pour cette étape
    const { data: taskDates, error: fetchError } = await supabase
      .from("task_dates")
      .select("*")
      .eq("project_id", projectId)
      .eq("step_id", stepId);

    if (fetchError) {
      console.error("Error fetching task dates:", fetchError);
      return;
    }

    const step = constructionSteps.find((s) => s.id === stepId);
    if (!step) return;

    const startDates = (taskDates || [])
      .filter((td) => td.start_date)
      .map((td) => parseISO(td.start_date!));

    const endDates = (taskDates || [])
      .filter((td) => td.end_date)
      .map((td) => parseISO(td.end_date!));

    // On a besoin au moins d'une date de début ET d'une date de fin pour synchroniser
    if (startDates.length === 0 || endDates.length === 0) return;

    const newStartDate = format(min(startDates), "yyyy-MM-dd");
    const newEndDate = format(max(endDates), "yyyy-MM-dd");

    // Durée réelle dérivée des dates (jours ouvrables)
    const computedActualDays =
      differenceInBusinessDays(parseISO(newEndDate), parseISO(newStartDate)) + 1;
    const safeActualDays = Math.max(1, computedActualDays);

    // 2) Récupérer l'étape dans l'échéancier
    const { data: currentSchedule, error: scheduleFetchError } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId)
      .eq("step_id", stepId)
      .maybeSingle();

    if (scheduleFetchError) {
      console.error("Error fetching schedule:", scheduleFetchError);
      return;
    }

    if (!currentSchedule) return;

    // 3) Mettre à jour l'étape courante (dates + durée réelle)
    const { error: updateError } = await supabase
      .from("project_schedules")
      .update({
        start_date: newStartDate,
        end_date: newEndDate,
        actual_days: safeActualDays,
      })
      .eq("id", currentSchedule.id);

    if (updateError) {
      console.error("Error updating schedule:", updateError);
      return;
    }

    // 4) Recalculer les étapes suivantes pour suivre l'avancement (plus rapide / plus lent)
    const { data: allSchedules, error: allSchedulesError } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date", { ascending: true, nullsFirst: false });

    if (allSchedulesError) {
      console.error("Error fetching all schedules:", allSchedulesError);
      return;
    }

    const sorted = (allSchedules || []) as any[];
    const currentIndex = sorted.findIndex((s) => s.id === currentSchedule.id);
    if (currentIndex === -1) return;

    let nextStart = addBusinessDays(parseISO(newEndDate), 1);

    const updates: Array<{ id: string; start_date: string; end_date: string }> = [];

    for (let i = currentIndex + 1; i < sorted.length; i++) {
      const s = sorted[i];

      // On ne touche pas aux étapes déjà terminées
      if (s.status === "completed") {
        if (s.end_date) {
          nextStart = addBusinessDays(parseISO(s.end_date), 1);
        }
        continue;
      }

      const duration = (s.actual_days || s.estimated_days || 1) as number;
      const startStr = format(nextStart, "yyyy-MM-dd");
      const endStr = format(addBusinessDays(nextStart, duration - 1), "yyyy-MM-dd");

      updates.push({ id: s.id, start_date: startStr, end_date: endStr });

      nextStart = addBusinessDays(parseISO(endStr), 1);
    }

    if (updates.length > 0) {
      const results = await Promise.all(
        updates.map((u) =>
          supabase
            .from("project_schedules")
            .update({ start_date: u.start_date, end_date: u.end_date })
            .eq("id", u.id)
        )
      );

      const anyUpdateError = results.find((r) => r.error)?.error;
      if (anyUpdateError) {
        console.error("Error updating subsequent schedules:", anyUpdateError);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });

    toast({
      title: "Échéancier synchronisé",
      description: `"${step.title}" + étapes suivantes ont été recalculées selon tes dates.`,
    });
  };

  const upsertTaskDateMutation = useMutation({
    mutationFn: async ({
      stepId,
      taskId,
      startDate,
      endDate,
      notes,
    }: {
      stepId: string;
      taskId: string;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
    }) => {
      if (!projectId) throw new Error("Project ID required");

      // Check if record exists
      const { data: existing } = await supabase
        .from("task_dates")
        .select("id")
        .eq("project_id", projectId)
        .eq("step_id", stepId)
        .eq("task_id", taskId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const updateData: Record<string, unknown> = {};
        if (startDate !== undefined) updateData.start_date = startDate;
        if (endDate !== undefined) updateData.end_date = endDate;
        if (notes !== undefined) updateData.notes = notes;

        const { error } = await supabase
          .from("task_dates")
          .update(updateData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("task_dates")
          .insert({
            project_id: projectId,
            step_id: stepId,
            task_id: taskId,
            start_date: startDate || null,
            end_date: endDate || null,
            notes: notes || null,
          });

        if (error) throw error;
      }

      return { stepId };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-dates", projectId] });
      
      // Sync schedule with task dates
      if (data?.stepId) {
        await syncScheduleWithTaskDates(data.stepId);
      }
    },
  });

  const getTaskDate = (stepId: string, taskId: string): TaskDate | undefined => {
    return taskDatesQuery.data?.find(
      (td) => td.step_id === stepId && td.task_id === taskId
    );
  };

  // Get aggregated dates for a step from its tasks
  const getStepDatesFromTasks = (stepId: string): { startDate: string | null; endDate: string | null } => {
    const stepTasks = taskDatesQuery.data?.filter(td => td.step_id === stepId) || [];
    
    const startDates = stepTasks
      .filter(td => td.start_date)
      .map(td => parseISO(td.start_date!));
    
    const endDates = stepTasks
      .filter(td => td.end_date)
      .map(td => parseISO(td.end_date!));

    return {
      startDate: startDates.length > 0 ? format(min(startDates), "yyyy-MM-dd") : null,
      endDate: endDates.length > 0 ? format(max(endDates), "yyyy-MM-dd") : null,
    };
  };

  return {
    taskDates: taskDatesQuery.data || [],
    isLoading: taskDatesQuery.isLoading,
    getTaskDate,
    getStepDatesFromTasks,
    upsertTaskDate: upsertTaskDateMutation.mutate,
    upsertTaskDateAsync: upsertTaskDateMutation.mutateAsync,
    syncScheduleWithTaskDates,
  };
}
