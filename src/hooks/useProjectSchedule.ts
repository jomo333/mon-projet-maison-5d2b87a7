import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addBusinessDays, differenceInBusinessDays, format, parseISO, subBusinessDays } from "date-fns";

export interface ScheduleItem {
  id: string;
  project_id: string;
  step_id: string;
  step_name: string;
  trade_type: string;
  trade_color: string;
  estimated_days: number;
  actual_days: number | null;
  start_date: string | null;
  end_date: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_schedule_lead_days: number;
  fabrication_lead_days: number;
  fabrication_start_date: string | null;
  measurement_required: boolean;
  measurement_after_step_id: string | null;
  measurement_notes: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleAlert {
  id: string;
  project_id: string;
  schedule_id: string;
  alert_type: string;
  alert_date: string;
  message: string;
  is_dismissed: boolean;
  created_at: string;
}

export const useProjectSchedule = (projectId: string | null) => {
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ["project-schedules", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_schedules")
        .select("*")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as ScheduleItem[];
    },
    enabled: !!projectId,
  });

  const alertsQuery = useQuery({
    queryKey: ["schedule-alerts", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("schedule_alerts")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_dismissed", false)
        .order("alert_date", { ascending: true });
      
      if (error) throw error;
      return data as ScheduleAlert[];
    },
    enabled: !!projectId,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (schedule: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("project_schedules")
        .insert([schedule as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
      toast({ title: "Étape ajoutée à l'échéancier" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("project_schedules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
      queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
      toast({ title: "Échéancier mis à jour" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_schedules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
      queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
      toast({ title: "Étape supprimée" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: async (alert: Omit<ScheduleAlert, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from("schedule_alerts")
        .insert([alert as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("schedule_alerts")
        .update({ is_dismissed: true })
        .eq("id", alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
      toast({ title: "Alerte fermée" });
    },
  });

  const generateAlerts = async (schedule: ScheduleItem) => {
    if (!projectId || !schedule.start_date) return;

    const startDate = parseISO(schedule.start_date);
    const alerts: Omit<ScheduleAlert, 'id' | 'created_at'>[] = [];

    // Alerte appel fournisseur
    if (schedule.supplier_schedule_lead_days > 0) {
      const alertDate = subBusinessDays(startDate, schedule.supplier_schedule_lead_days);
      alerts.push({
        project_id: projectId,
        schedule_id: schedule.id,
        alert_type: "supplier_call",
        alert_date: format(alertDate, "yyyy-MM-dd"),
        message: `Appeler ${schedule.supplier_name || "le fournisseur"} pour ${schedule.step_name}`,
        is_dismissed: false,
      });
    }

    // Alerte mise en fabrication
    if (schedule.fabrication_lead_days > 0) {
      const fabDate = subBusinessDays(startDate, schedule.fabrication_lead_days);
      alerts.push({
        project_id: projectId,
        schedule_id: schedule.id,
        alert_type: "fabrication_start",
        alert_date: format(fabDate, "yyyy-MM-dd"),
        message: `Lancer la fabrication pour ${schedule.step_name}`,
        is_dismissed: false,
      });
    }

    // Alerte prise de mesures
    if (schedule.measurement_required && schedule.measurement_after_step_id) {
      // Trouver la date de fin de l'étape précédente
      const prevSchedule = schedulesQuery.data?.find(s => s.step_id === schedule.measurement_after_step_id);
      if (prevSchedule?.end_date) {
        alerts.push({
          project_id: projectId,
          schedule_id: schedule.id,
          alert_type: "measurement",
          alert_date: prevSchedule.end_date,
          message: `Prendre les mesures pour ${schedule.step_name}${schedule.measurement_notes ? ` - ${schedule.measurement_notes}` : ""}`,
          is_dismissed: false,
        });
      }
    }

    // Supprimer les anciennes alertes et créer les nouvelles
    await supabase
      .from("schedule_alerts")
      .delete()
      .eq("schedule_id", schedule.id);

    for (const alert of alerts) {
      await createAlertMutation.mutateAsync(alert);
    }
  };

  const calculateEndDate = (startDate: string, days: number): string => {
    const start = parseISO(startDate);
    const end = addBusinessDays(start, days - 1);
    return format(end, "yyyy-MM-dd");
  };

  const checkConflicts = (schedules: ScheduleItem[]): { date: string; trades: string[] }[] => {
    const conflicts: { date: string; trades: string[] }[] = [];
    const dateTradeMap: Record<string, Set<string>> = {};

    for (const schedule of schedules) {
      if (!schedule.start_date || !schedule.end_date) continue;

      const start = parseISO(schedule.start_date);
      const end = parseISO(schedule.end_date);
      const days = differenceInBusinessDays(end, start) + 1;

      for (let i = 0; i < days; i++) {
        const currentDate = addBusinessDays(start, i);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        if (!dateTradeMap[dateStr]) {
          dateTradeMap[dateStr] = new Set();
        }
        dateTradeMap[dateStr].add(schedule.trade_type);
      }
    }

    for (const [date, trades] of Object.entries(dateTradeMap)) {
      if (trades.size > 1) {
        conflicts.push({ date, trades: Array.from(trades) });
      }
    }

    return conflicts;
  };

  /**
   * Recalcule l'échéancier à partir d'une étape terminée
   * Devance toutes les étapes suivantes et génère des alertes
   */
  const recalculateScheduleFromCompleted = async (
    completedScheduleId: string,
    actualEndDate: string,
    actualDays?: number
  ) => {
    if (!projectId) return;

    const sortedSchedules = [...(schedulesQuery.data || [])].sort((a, b) => {
      if (!a.start_date || !b.start_date) return 0;
      return a.start_date.localeCompare(b.start_date);
    });

    const completedIndex = sortedSchedules.findIndex(s => s.id === completedScheduleId);
    if (completedIndex === -1) return;

    const completedSchedule = sortedSchedules[completedIndex];
    const originalEndDate = completedSchedule.end_date;
    
    // Calculer le nombre de jours d'avance
    let daysAhead = 0;
    if (originalEndDate) {
      daysAhead = differenceInBusinessDays(parseISO(originalEndDate), parseISO(actualEndDate));
    }

    // Si on est en avance (daysAhead > 0), on décale les étapes suivantes
    if (daysAhead <= 0) {
      // Pas en avance, juste mettre à jour l'étape courante
      await updateScheduleMutation.mutateAsync({
        id: completedScheduleId,
        status: "completed",
        end_date: actualEndDate,
        actual_days: actualDays || completedSchedule.estimated_days,
      });
      return { daysAhead: 0, alertsCreated: 0 };
    }

    // Mettre à jour l'étape complétée
    await updateScheduleMutation.mutateAsync({
      id: completedScheduleId,
      status: "completed",
      end_date: actualEndDate,
      actual_days: actualDays || completedSchedule.estimated_days,
    });

    // Décaler toutes les étapes suivantes
    const subsequentSchedules = sortedSchedules.slice(completedIndex + 1);
    let newStartDate = addBusinessDays(parseISO(actualEndDate), 1);
    const alertsToCreate: Omit<ScheduleAlert, 'id' | 'created_at'>[] = [];

    for (const schedule of subsequentSchedules) {
      if (!schedule.start_date || schedule.status === "completed") continue;

      const originalStart = parseISO(schedule.start_date);
      const newStart = format(newStartDate, "yyyy-MM-dd");
      const duration = schedule.actual_days || schedule.estimated_days;
      const newEnd = format(addBusinessDays(newStartDate, duration - 1), "yyyy-MM-dd");

      // Vérifier si le fournisseur doit être appelé plus tôt
      if (schedule.supplier_schedule_lead_days > 0) {
        const originalCallDate = subBusinessDays(originalStart, schedule.supplier_schedule_lead_days);
        const newCallDate = subBusinessDays(newStartDate, schedule.supplier_schedule_lead_days);
        const today = new Date();
        
        // Si la nouvelle date d'appel est proche ou dépassée, créer une alerte urgente
        const daysUntilCall = differenceInBusinessDays(newCallDate, today);
        
        if (daysUntilCall <= 5 && daysUntilCall >= -2) {
          alertsToCreate.push({
            project_id: projectId,
            schedule_id: schedule.id,
            alert_type: "urgent_supplier_call",
            alert_date: format(today, "yyyy-MM-dd"),
            message: `⚠️ URGENT: Appeler ${schedule.supplier_name || "le fournisseur"} pour ${schedule.step_name} - Le projet avance plus vite! Nouvelle date prévue: ${format(newStartDate, "d MMM yyyy", { locale: undefined })}`,
            is_dismissed: false,
          });
        }
      }

      // Mettre à jour l'étape
      await updateScheduleMutation.mutateAsync({
        id: schedule.id,
        start_date: newStart,
        end_date: newEnd,
      });

      // La prochaine étape commence après celle-ci
      newStartDate = addBusinessDays(parseISO(newEnd), 1);
    }

    // Créer les alertes urgentes
    for (const alert of alertsToCreate) {
      await createAlertMutation.mutateAsync(alert);
    }

    // Régénérer les alertes normales pour les étapes décalées
    for (const schedule of subsequentSchedules) {
      const updatedSchedule = {
        ...schedule,
        start_date: format(addBusinessDays(parseISO(actualEndDate), 1), "yyyy-MM-dd"),
      };
      // Les alertes seront regénérées par generateAlerts
    }

    toast({
      title: "Échéancier ajusté",
      description: `${daysAhead} jour(s) d'avance! ${subsequentSchedules.length} étape(s) devancée(s). ${alertsToCreate.length} alerte(s) urgente(s) créée(s).`,
    });

    return { daysAhead, alertsCreated: alertsToCreate.length };
  };

  /**
   * Marquer une étape comme complétée et ajuster l'échéancier
   */
  const completeStep = async (
    scheduleId: string,
    actualDays?: number
  ) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const schedule = schedulesQuery.data?.find(s => s.id === scheduleId);
    
    if (!schedule?.start_date) return;

    // Calculer la date de fin réelle basée sur les jours réels ou à partir d'aujourd'hui
    let actualEndDate: string;
    if (actualDays) {
      actualEndDate = format(
        addBusinessDays(parseISO(schedule.start_date), actualDays - 1),
        "yyyy-MM-dd"
      );
    } else {
      actualEndDate = today;
    }

    return recalculateScheduleFromCompleted(scheduleId, actualEndDate, actualDays);
  };

  return {
    schedules: schedulesQuery.data || [],
    alerts: alertsQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    isLoadingAlerts: alertsQuery.isLoading,
    createSchedule: createScheduleMutation.mutate,
    createScheduleAsync: createScheduleMutation.mutateAsync,
    updateSchedule: updateScheduleMutation.mutate,
    updateScheduleAsync: updateScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutate,
    dismissAlert: dismissAlertMutation.mutate,
    generateAlerts,
    calculateEndDate,
    checkConflicts,
    recalculateScheduleFromCompleted,
    completeStep,
    isCreating: createScheduleMutation.isPending,
    isUpdating: updateScheduleMutation.isPending,
  };
};
