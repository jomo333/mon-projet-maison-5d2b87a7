import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { constructionSteps } from "@/data/constructionSteps";
import { format, parseISO, min, max } from "date-fns";
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

  // Function to update project_schedules based on task dates
  const syncScheduleWithTaskDates = async (stepId: string) => {
    if (!projectId) return;

    // Get all task dates for this step
    const { data: taskDates, error: fetchError } = await supabase
      .from("task_dates")
      .select("*")
      .eq("project_id", projectId)
      .eq("step_id", stepId);

    if (fetchError) {
      console.error("Error fetching task dates:", fetchError);
      return;
    }

    // Get the step definition to know total tasks
    const step = constructionSteps.find(s => s.id === stepId);
    if (!step) return;

    // Filter task dates that have both start and end dates
    const completeDates = (taskDates || []).filter(td => td.start_date && td.end_date);
    
    if (completeDates.length === 0) return;

    // Calculate the earliest start date and latest end date from task dates
    const startDates = completeDates
      .filter(td => td.start_date)
      .map(td => parseISO(td.start_date!));
    
    const endDates = completeDates
      .filter(td => td.end_date)
      .map(td => parseISO(td.end_date!));

    if (startDates.length === 0 || endDates.length === 0) return;

    const earliestStart = min(startDates);
    const latestEnd = max(endDates);

    const newStartDate = format(earliestStart, "yyyy-MM-dd");
    const newEndDate = format(latestEnd, "yyyy-MM-dd");

    // Check if a schedule exists for this step
    const { data: existingSchedule } = await supabase
      .from("project_schedules")
      .select("id, start_date, end_date")
      .eq("project_id", projectId)
      .eq("step_id", stepId)
      .maybeSingle();

    if (existingSchedule) {
      // Update existing schedule
      const { error: updateError } = await supabase
        .from("project_schedules")
        .update({
          start_date: newStartDate,
          end_date: newEndDate,
        })
        .eq("id", existingSchedule.id);

      if (updateError) {
        console.error("Error updating schedule:", updateError);
      } else {
        // Invalidate schedule queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
        toast({
          title: "Échéancier mis à jour",
          description: `Les dates de "${step.title}" ont été synchronisées avec les sous-tâches.`,
        });
      }
    }
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
