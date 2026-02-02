import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { constructionSteps } from "@/data/constructionSteps";

export interface CompletedTask {
  id: string;
  project_id: string;
  step_id: string;
  task_id: string;
  completed_at: string;
}

// Tâches qui déclenchent des alertes de mesure quand complétées
const MEASUREMENT_TRIGGER_TASKS: Record<string, { targetSteps: string[]; taskId: string }> = {
  "gypse": {
    taskId: "tirage-joints",
    targetSteps: ["cuisine-sdb", "revetements-sol"],
  },
};

export function useCompletedTasks(projectId: string | null) {
  const queryClient = useQueryClient();

  const completedTasksQuery = useQuery({
    queryKey: ["completed-tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("completed_tasks")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data as CompletedTask[];
    },
    enabled: !!projectId,
  });

  /**
   * Génère les alertes de mesure quand une tâche déclencheuse est complétée
   */
  const generateMeasurementAlerts = async (stepId: string, taskId: string) => {
    if (!projectId) return;
    
    const triggerConfig = MEASUREMENT_TRIGGER_TASKS[stepId];
    if (!triggerConfig || triggerConfig.taskId !== taskId) return;

    // Récupérer les schedules des étapes cibles
    const { data: targetSchedules } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId)
      .in("step_id", triggerConfig.targetSteps);

    if (!targetSchedules) return;

    for (const schedule of targetSchedules) {
      // Vérifier si une alerte existe déjà
      const { data: existingAlerts } = await supabase
        .from("schedule_alerts")
        .select("id")
        .eq("schedule_id", schedule.id)
        .eq("alert_type", "measurement")
        .eq("is_dismissed", false);

      if (existingAlerts && existingAlerts.length > 0) continue;

      // Créer l'alerte de mesure
      await supabase.from("schedule_alerts").insert({
        project_id: projectId,
        schedule_id: schedule.id,
        alert_type: "measurement",
        alert_date: new Date().toISOString().split("T")[0],
        message: `📏 Prendre les mesures en chantier pour "${schedule.step_name}"${schedule.measurement_notes ? ` - ${schedule.measurement_notes}` : ""}`,
        is_dismissed: false,
      });

      // Effacer le cache localStorage pour que le modal réapparaisse
      localStorage.removeItem(`alert_modal_shown_${projectId}`);
      localStorage.removeItem(`alert_modal_snooze_${projectId}`);
    }

    // Invalider les alertes pour rafraîchir l'UI
    queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
  };

  /**
   * Supprime les alertes de mesure quand la tâche déclencheuse est décochée
   */
  const removeMeasurementAlerts = async (stepId: string, taskId: string) => {
    if (!projectId) return;

    const triggerConfig = MEASUREMENT_TRIGGER_TASKS[stepId];
    if (!triggerConfig || triggerConfig.taskId !== taskId) return;

    // Récupérer les schedules des étapes cibles
    const { data: targetSchedules } = await supabase
      .from("project_schedules")
      .select("id")
      .eq("project_id", projectId)
      .in("step_id", triggerConfig.targetSteps);

    if (!targetSchedules) return;

    // Supprimer les alertes de mesure
    for (const schedule of targetSchedules) {
      await supabase
        .from("schedule_alerts")
        .delete()
        .eq("schedule_id", schedule.id)
        .eq("alert_type", "measurement");
    }

    queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
  };

  /**
   * Vérifie si toutes les tâches d'une étape sont complétées et met à jour le statut
   */
  const checkAndAutoCompleteStep = async (stepId: string, completedTaskIds: string[]) => {
    if (!projectId) return;

    const step = constructionSteps.find(s => s.id === stepId);
    if (!step) return;

    const allTaskIds = step.tasks.map(t => t.id);
    const allCompleted = allTaskIds.every(id => completedTaskIds.includes(id));

    // Récupérer le schedule actuel
    const { data: schedule } = await supabase
      .from("project_schedules")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("step_id", stepId)
      .single();

    if (!schedule) return;

    if (allCompleted && schedule.status !== "completed") {
      // Toutes les tâches sont complétées → marquer l'étape comme terminée
      await supabase
        .from("project_schedules")
        .update({ 
          status: "completed",
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", schedule.id);

      queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
    } else if (!allCompleted && schedule.status === "completed") {
      // Une tâche a été décochée → remettre l'étape en cours
      await supabase
        .from("project_schedules")
        .update({ status: "in_progress" })
        .eq("id", schedule.id);

      queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
    }
  };

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ stepId, taskId, isCompleted }: { stepId: string; taskId: string; isCompleted: boolean }) => {
      if (!projectId) throw new Error("No project ID");

      if (isCompleted) {
        // Delete the completed task record
        const { error } = await supabase
          .from("completed_tasks")
          .delete()
          .eq("project_id", projectId)
          .eq("step_id", stepId)
          .eq("task_id", taskId);

        if (error) throw error;

        // Supprimer les alertes de mesure si c'est une tâche déclencheuse
        await removeMeasurementAlerts(stepId, taskId);
      } else {
        // Insert a new completed task record
        const { error } = await supabase
          .from("completed_tasks")
          .insert({
            project_id: projectId,
            step_id: stepId,
            task_id: taskId,
          });

        if (error) throw error;

        // Générer les alertes de mesure si c'est une tâche déclencheuse
        await generateMeasurementAlerts(stepId, taskId);
      }

      return { stepId, taskId, wasCompleted: isCompleted };
    },
    onSuccess: async ({ stepId, taskId, wasCompleted }) => {
      await queryClient.invalidateQueries({ queryKey: ["completed-tasks", projectId] });
      
      // Attendre que le cache soit mis à jour puis vérifier l'auto-complétion
      const updatedData = await queryClient.fetchQuery({
        queryKey: ["completed-tasks", projectId],
        queryFn: async () => {
          const { data } = await supabase
            .from("completed_tasks")
            .select("*")
            .eq("project_id", projectId);
          return data as CompletedTask[];
        },
      });

      const completedTaskIds = updatedData
        ?.filter(ct => ct.step_id === stepId)
        .map(ct => ct.task_id) || [];

      await checkAndAutoCompleteStep(stepId, completedTaskIds);
    },
    onError: (error) => {
      console.error("Error toggling task:", error);
    },
  });

  const isTaskCompleted = (stepId: string, taskId: string): boolean => {
    if (!completedTasksQuery.data) return false;
    return completedTasksQuery.data.some(
      (ct) => ct.step_id === stepId && ct.task_id === taskId
    );
  };

  const getCompletedTasksForStep = (stepId: string): string[] => {
    if (!completedTasksQuery.data) return [];
    return completedTasksQuery.data
      .filter((ct) => ct.step_id === stepId)
      .map((ct) => ct.task_id);
  };

  return {
    completedTasks: completedTasksQuery.data || [],
    isLoading: completedTasksQuery.isLoading,
    toggleTask: toggleTaskMutation.mutate,
    isToggling: toggleTaskMutation.isPending,
    isTaskCompleted,
    getCompletedTasksForStep,
  };
}
