import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompletedTask {
  id: string;
  project_id: string;
  step_id: string;
  task_id: string;
  completed_at: string;
}

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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completed-tasks", projectId] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour de la tâche");
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
