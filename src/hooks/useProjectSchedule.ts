import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addBusinessDays, differenceInBusinessDays, format, parseISO, subBusinessDays } from "date-fns";
import { sortSchedulesByExecutionOrder, getStepExecutionOrder } from "@/lib/scheduleOrder";
import { constructionSteps } from "@/data/constructionSteps";
import { getTradeColor } from "@/data/tradeTypes";
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
        .eq("project_id", projectId);
      
      if (error) throw error;
      // Sort by execution order defined in constructionSteps
      return sortSchedulesByExecutionOrder(data as ScheduleItem[]);
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
    actualDays?: number,
    actualStartDate?: string
  ) => {
    if (!projectId) return { daysAhead: 0, alertsCreated: 0 };

    // Sort by execution order, not by date
    const sortedSchedules = sortSchedulesByExecutionOrder(schedulesQuery.data || []);

    const completedIndex = sortedSchedules.findIndex((s) => s.id === completedScheduleId);
    if (completedIndex === -1) return { daysAhead: 0, alertsCreated: 0 };

    const completedSchedule = sortedSchedules[completedIndex];
    const originalEndDate = completedSchedule.end_date;

    // Calculer le nombre de jours d'avance (positif = en avance)
    // On se base sur la différence entre la date de fin planifiée et la date de fin réelle.
    let daysAhead = 0;
    if (originalEndDate) {
      daysAhead = differenceInBusinessDays(parseISO(originalEndDate), parseISO(actualEndDate));
    } else if (completedSchedule.start_date) {
      // Fallback si jamais end_date n'est pas défini
      const plannedDuration = completedSchedule.estimated_days;
      const realDuration = actualDays ?? (differenceInBusinessDays(parseISO(actualEndDate), parseISO(completedSchedule.start_date)) + 1);
      daysAhead = plannedDuration - realDuration;
    }

    // Mettre à jour l'étape complétée d'abord
    await updateScheduleMutation.mutateAsync({
      id: completedScheduleId,
      status: "completed",
      start_date: actualStartDate ?? completedSchedule.start_date,
      end_date: actualEndDate,
      actual_days: actualDays ?? completedSchedule.actual_days ?? completedSchedule.estimated_days,
    });

    // Si pas en avance, on arrête là
    if (daysAhead <= 0) {
      return { daysAhead: 0, alertsCreated: 0 };
    }

    // Décaler toutes les étapes suivantes
    const subsequentSchedules = sortedSchedules.slice(completedIndex + 1);
    let newStartDate = addBusinessDays(parseISO(actualEndDate), 1);
    const alertsToCreate: Omit<ScheduleAlert, 'id' | 'created_at'>[] = [];

    for (const schedule of subsequentSchedules) {
      if (schedule.status === "completed") {
        continue;
      }

      const newStart = format(newStartDate, "yyyy-MM-dd");
      const duration = schedule.actual_days || schedule.estimated_days;
      const newEnd = format(addBusinessDays(newStartDate, duration - 1), "yyyy-MM-dd");

      // Vérifier si le fournisseur doit être appelé plus tôt
      if (schedule.supplier_schedule_lead_days > 0 && schedule.start_date) {
        const originalStart = parseISO(schedule.start_date);
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
            message: `⚠️ URGENT: Appeler ${schedule.supplier_name || "le fournisseur"} pour ${schedule.step_name} - Le projet avance plus vite! Nouvelle date prévue: ${format(newStartDate, "d MMM yyyy")}`,
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
    const todayDate = new Date();
    const today = format(todayDate, "yyyy-MM-dd");
    // On considère "terminé" = terminé aujourd'hui.
    // Si l'utilisateur fournit une durée, on recalcule aussi la date de début réelle.
    const actualEndDate = today;

    let actualStartDate: string | undefined = undefined;
    if (actualDays && actualDays > 0) {
      actualStartDate = format(subBusinessDays(todayDate, actualDays - 1), "yyyy-MM-dd");
    }

    return recalculateScheduleFromCompleted(
      scheduleId,
      actualEndDate,
      actualDays,
      actualStartDate
    );
  };

  /**
   * Complète une étape par son step_id (crée le schedule si nécessaire)
   * et recalcule toutes les étapes suivantes
   */
  const completeStepByStepId = async (stepId: string, actualDays?: number) => {
    if (!projectId) return { daysAhead: 0, alertsCreated: 0 };

    const todayDate = new Date();
    const today = format(todayDate, "yyyy-MM-dd");

    // Chercher si un schedule existe déjà pour cette étape
    let existingSchedule = schedulesQuery.data?.find((s) => s.step_id === stepId);

    // Mapping des step_id vers trade_type
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

    // Durées par défaut
    const defaultDurations: Record<string, number> = {
      planification: 15,
      financement: 20,
      "plans-permis": 30,
      "excavation-fondation": 15,
      structure: 15,
      toiture: 7,
      "fenetres-portes": 5,
      electricite: 7,
      plomberie: 7,
      hvac: 7,
      isolation: 5,
      gypse: 15,
      "revetements-sol": 7,
      "cuisine-sdb": 10,
      "finitions-int": 10,
      exterieur: 15,
      "inspections-finales": 5,
    };

    // Si le schedule n'existe pas, on doit le créer avec upsert
    if (!existingSchedule) {
      const step = constructionSteps.find((s) => s.id === stepId);
      if (!step) return { daysAhead: 0, alertsCreated: 0 };

      const tradeType = stepTradeMapping[stepId] || "autre";
      const estimatedDays = defaultDurations[stepId] || 5;
      const usedDays = actualDays || 1; // Par défaut 1 jour si terminé aujourd'hui sans date
      
      // Calculer la date de début basée sur la durée réelle
      const startDate = format(subBusinessDays(todayDate, usedDays - 1), "yyyy-MM-dd");

      // Utiliser upsert pour éviter les doublons
      const { data: newSchedule, error } = await supabase
        .from("project_schedules")
        .upsert({
          project_id: projectId,
          step_id: stepId,
          step_name: step.title,
          trade_type: tradeType,
          trade_color: getTradeColor(tradeType),
          estimated_days: estimatedDays,
          actual_days: usedDays,
          start_date: startDate,
          end_date: today,
          status: "completed",
          supplier_schedule_lead_days: 21,
          fabrication_lead_days: 0,
        }, {
          onConflict: "project_id,step_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating schedule:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer l'échéancier pour cette étape",
          variant: "destructive",
        });
        return { daysAhead: 0, alertsCreated: 0 };
      }

      existingSchedule = newSchedule as ScheduleItem;
    }

    // Maintenant on a un schedule, on peut le marquer comme complété et recalculer
    // Utiliser la logique existante de recalculateScheduleFromCompleted
    let actualStartDate: string | undefined = undefined;
    if (actualDays && actualDays > 0) {
      actualStartDate = format(subBusinessDays(todayDate, actualDays - 1), "yyyy-MM-dd");
    }

    // Recalculer pour devancer les étapes suivantes
    const result = await recalculateScheduleFromCompletedAndCreateMissing(
      existingSchedule.id,
      today,
      actualDays,
      actualStartDate
    );

    // Invalider les queries pour rafraîchir les données
    queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });

    return result;
  };

  /**
   * Version étendue de recalculateScheduleFromCompleted qui crée les schedules manquants
   */
  const recalculateScheduleFromCompletedAndCreateMissing = async (
    completedScheduleId: string,
    actualEndDate: string,
    actualDays?: number,
    actualStartDate?: string
  ) => {
    if (!projectId) return { daysAhead: 0, alertsCreated: 0 };

    // Récupérer les schedules existants, triés par ordre d'exécution
    const existingSchedules = sortSchedulesByExecutionOrder(schedulesQuery.data || []);
    
    // Trouver l'étape complétée
    const completedSchedule = existingSchedules.find((s) => s.id === completedScheduleId);
    if (!completedSchedule) return { daysAhead: 0, alertsCreated: 0 };

    const completedStepIndex = getStepExecutionOrder(completedSchedule.step_id);

    // Mettre à jour l'étape complétée
    await updateScheduleMutation.mutateAsync({
      id: completedScheduleId,
      status: "completed",
      start_date: actualStartDate ?? completedSchedule.start_date ?? actualEndDate,
      end_date: actualEndDate,
      actual_days: actualDays ?? 1,
    });

    // Mapping et durées pour créer les étapes manquantes
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

    const defaultDurations: Record<string, number> = {
      planification: 15,
      financement: 20,
      "plans-permis": 30,
      "excavation-fondation": 15,
      structure: 15,
      toiture: 7,
      "fenetres-portes": 5,
      electricite: 7,
      plomberie: 7,
      hvac: 7,
      isolation: 5,
      gypse: 15,
      "revetements-sol": 7,
      "cuisine-sdb": 10,
      "finitions-int": 10,
      exterieur: 15,
      "inspections-finales": 5,
    };

    // Trouver toutes les étapes qui viennent APRÈS l'étape complétée
    const subsequentSteps = constructionSteps.filter((step) => {
      const stepIndex = getStepExecutionOrder(step.id);
      return stepIndex > completedStepIndex;
    });

    // La prochaine étape commence le jour ouvrable suivant la fin
    let nextStartDate = addBusinessDays(parseISO(actualEndDate), 1);
    const alertsToCreate: any[] = [];

    for (const step of subsequentSteps) {
      // Vérifier si un schedule existe déjà pour cette étape
      let schedule = existingSchedules.find((s) => s.step_id === step.id);

      const tradeType = stepTradeMapping[step.id] || "autre";
      const estimatedDays = defaultDurations[step.id] || 5;
      const newStart = format(nextStartDate, "yyyy-MM-dd");
      const newEnd = format(addBusinessDays(nextStartDate, estimatedDays - 1), "yyyy-MM-dd");

      if (schedule) {
        // Mettre à jour le schedule existant (sauf s'il est déjà complété)
        if (schedule.status !== "completed") {
          await updateScheduleMutation.mutateAsync({
            id: schedule.id,
            start_date: newStart,
            end_date: newEnd,
          });
        } else {
          // Si complété, on utilise sa date de fin pour le suivant
          if (schedule.end_date) {
            nextStartDate = addBusinessDays(parseISO(schedule.end_date), 1);
            continue;
          }
        }
      } else {
        // Utiliser upsert pour créer le schedule sans risque de doublon
        const { error } = await supabase.from("project_schedules").upsert({
          project_id: projectId,
          step_id: step.id,
          step_name: step.title,
          trade_type: tradeType,
          trade_color: getTradeColor(tradeType),
          estimated_days: estimatedDays,
          start_date: newStart,
          end_date: newEnd,
          status: "scheduled",
          supplier_schedule_lead_days: 21,
          fabrication_lead_days: 0,
        }, {
          onConflict: "project_id,step_id",
          ignoreDuplicates: false,
        });

        if (error) {
          console.error("Error creating subsequent schedule:", error);
        }
      }

      // La prochaine étape commence après celle-ci
      nextStartDate = addBusinessDays(parseISO(newEnd), 1);
    }

    toast({
      title: "Échéancier mis à jour",
      description: `Étape terminée! Les prochaines étapes ont été planifiées à partir de demain.`,
    });

    return { daysAhead: 0, alertsCreated: alertsToCreate.length };
  };

  /**
   * Annuler la complétion d'une étape et restaurer l'échéancier original
   * Recalcule toutes les dates suivantes en utilisant les durées estimées
   */
  const uncompleteStep = async (scheduleId: string) => {
    if (!projectId) return;

    // Sort by execution order, not by date
    const sortedSchedules = sortSchedulesByExecutionOrder(schedulesQuery.data || []);

    const uncompleteIndex = sortedSchedules.findIndex((s) => s.id === scheduleId);
    if (uncompleteIndex === -1) return;

    const uncompleteSchedule = sortedSchedules[uncompleteIndex];

    // Trouver la dernière étape complétée AVANT celle-ci
    let previousEndDate: string | null = null;
    for (let i = uncompleteIndex - 1; i >= 0; i--) {
      const prev = sortedSchedules[i];
      if (prev.status === "completed" && prev.end_date) {
        previousEndDate = prev.end_date;
        break;
      }
    }

    // Si aucune étape précédente n'est complétée, on prend la date de début de la première étape
    let newStartDate: Date;
    if (previousEndDate) {
      newStartDate = addBusinessDays(parseISO(previousEndDate), 1);
    } else {
      // Chercher la première date de début dans l'échéancier
      const firstScheduleWithDate = sortedSchedules.find((s) => s.start_date);
      if (firstScheduleWithDate?.start_date) {
        // Recalculer depuis le début en utilisant les durées estimées
        newStartDate = parseISO(firstScheduleWithDate.start_date);
        // Si on annule une étape au milieu, on doit recalculer depuis le début
        for (let i = 0; i < uncompleteIndex; i++) {
          const s = sortedSchedules[i];
          const duration = s.estimated_days;
          newStartDate = addBusinessDays(newStartDate, duration);
        }
      } else {
        // Fallback: utiliser la date actuelle de l'étape
        newStartDate = uncompleteSchedule.start_date 
          ? parseISO(uncompleteSchedule.start_date) 
          : new Date();
      }
    }

    // Mettre à jour l'étape décochée et toutes les suivantes
    for (let i = uncompleteIndex; i < sortedSchedules.length; i++) {
      const schedule = sortedSchedules[i];
      
      // Utiliser toujours la durée estimée (pas actual_days) pour restaurer le plan original
      const duration = schedule.estimated_days;
      const newStart = format(newStartDate, "yyyy-MM-dd");
      const newEnd = format(addBusinessDays(newStartDate, duration - 1), "yyyy-MM-dd");

      await updateScheduleMutation.mutateAsync({
        id: schedule.id,
        start_date: newStart,
        end_date: newEnd,
        status: i === uncompleteIndex ? "pending" : schedule.status,
        actual_days: i === uncompleteIndex ? null : schedule.actual_days,
      });

      // La prochaine étape commence après celle-ci
      newStartDate = addBusinessDays(parseISO(newEnd), 1);
    }

    toast({
      title: "Échéancier restauré",
      description: `Les dates ont été recalculées selon le plan original.`,
    });
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
    completeStepByStepId,
    uncompleteStep,
    isCreating: createScheduleMutation.isPending,
    isUpdating: updateScheduleMutation.isPending,
  };
};
