import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addBusinessDays, differenceInBusinessDays, format, parseISO, subBusinessDays } from "date-fns";
import { fr } from "date-fns/locale";
import { sortSchedulesByExecutionOrder, getStepExecutionOrder } from "@/lib/scheduleOrder";
import { constructionSteps } from "@/data/constructionSteps";
import { addDays } from "date-fns";
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
  is_manual_date: boolean;
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

// Délais obligatoires après certaines étapes (jours calendrier)
// Ex: cure du béton avant structure
const minimumDelayAfterStep: Record<string, { afterStep: string; days: number; reason: string }> = {
  structure: {
    afterStep: "excavation-fondation",
    days: 21, // 3 semaines minimum pour la cure du béton
    reason: "Cure du béton des fondations (minimum 3 semaines)",
  },
};

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

  // Auto-réparation (1 seule fois) si des étapes "terminées" ont des dates incohérentes
  const hasAutoRepairedRef = useRef(false);
  useEffect(() => {
    if (!projectId) {
      hasAutoRepairedRef.current = false;
      return;
    }
    if (hasAutoRepairedRef.current) return;

    const data = (schedulesQuery.data || []) as ScheduleItem[];
    const hasIncoherentCompleted = data.some((s) => {
      if (s.status !== "completed" || !s.start_date || !s.end_date) return false;
      return parseISO(s.end_date) < parseISO(s.start_date);
    });

    if (hasIncoherentCompleted) {
      hasAutoRepairedRef.current = true;
      // Répare et régénère tout l'échéancier
      void fetchAndRegenerateSchedule();
    }
  }, [projectId, schedulesQuery.data]);

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
      // Toast supprimé ici - sera affiché une seule fois à la fin des opérations batch
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

  const normalizeCompletedDates = (
    s: ScheduleItem
  ): { start: string | null; end: string | null } => {
    const duration = (s.actual_days ?? s.estimated_days ?? 1) || 1;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const clampCompletedEnd = (end: string) => {
      try {
        return parseISO(end) > parseISO(todayStr) ? todayStr : end;
      } catch {
        return end;
      }
    };

    // Si on n'a aucune date, impossible d'inférer
    if (!s.start_date && !s.end_date) {
      return { start: null, end: null };
    }

    // Calculer une end candidate (puis la clamp si elle est dans le futur)
    const computedEnd = s.end_date ?? (s.start_date ? calculateEndDate(s.start_date, duration) : null);
    if (!computedEnd) return { start: null, end: null };

    const end = clampCompletedEnd(computedEnd);

    // IMPORTANT: une étape "Terminée" ne peut pas finir dans le futur.
    // Si on a clampé end (ou si start > end), on recalcule start depuis end pour garder la durée cohérente.
    const shouldRecomputeStartFromEnd =
      end !== computedEnd ||
      (s.start_date ? parseISO(s.start_date) > parseISO(end) : false);

    const start = shouldRecomputeStartFromEnd
      ? format(subBusinessDays(parseISO(end), duration - 1), "yyyy-MM-dd")
      : s.start_date ?? format(subBusinessDays(parseISO(end), duration - 1), "yyyy-MM-dd");

    return { start, end };
  };

  /**
   * Régénère l'échéancier complet (anti-chevauchement):
   * - Corrige les étapes "terminées" incohérentes (end_date < start_date)
   * - Recalcule toutes les étapes non terminées en chaîne
   * - Applique optionnellement une mise à jour "focus" (retard/avance) avant recalcul
   */
  const regenerateScheduleFromSchedules = async (
    allSchedules: ScheduleItem[],
    focusScheduleId?: string,
    focusUpdates?: Partial<ScheduleItem>
  ): Promise<{ warnings: string[] }> => {
    if (!projectId) return { warnings: [] };

    const sorted = sortSchedulesByExecutionOrder(allSchedules);
    const warnings: string[] = [];
    const directConflictWarning: string[] = []; // Conflit direct causé par le changement actuel
    const updatesToApply: Array<{ id: string; patch: Partial<ScheduleItem> }> = [];

    // Trouver l'index de l'étape focus
    const focusIndex = focusScheduleId 
      ? sorted.findIndex(s => s.id === focusScheduleId)
      : -1;

    // Collecter les dates de fin pour les vérifications de délais
    const stepEndDates: Record<string, string> = {};

    // Identifier les étapes avec dates manuelles (is_manual_date = true)
    const manualDateStepIds = new Set<string>();
    for (const s of sorted) {
      if (s.status !== "completed" && s.is_manual_date && s.id !== focusScheduleId) {
        manualDateStepIds.add(s.id);
      }
    }

    // 1) D'abord, traiter les étapes terminées et l'étape focus pour collecter leurs dates de fin
    for (const s of sorted) {
      if (s.status === "completed") {
        const norm = normalizeCompletedDates(s);
        if (norm.end) stepEndDates[s.step_id] = norm.end;
      } else if (s.id === focusScheduleId && focusUpdates?.end_date) {
        stepEndDates[s.step_id] = focusUpdates.end_date;
      } else if (s.id === focusScheduleId && focusUpdates?.start_date) {
        const duration = (s.actual_days ?? s.estimated_days ?? 1) || 1;
        stepEndDates[s.step_id] = format(addBusinessDays(parseISO(focusUpdates.start_date), duration - 1), "yyyy-MM-dd");
      }
    }

    // Variable pour suivre le curseur de date pour les étapes à décaler
    let cursor: Date | null = null;

    // 2) Traiter chaque étape
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const duration = (s.actual_days ?? s.estimated_days ?? 1) || 1;

      // Étapes terminées = ne pas toucher (sauf normalisation)
      if (s.status === "completed") {
        const norm = normalizeCompletedDates(s);
        if (norm.start && norm.end) {
          const patch: Partial<ScheduleItem> = {};
          if (s.start_date !== norm.start) patch.start_date = norm.start;
          if (s.end_date !== norm.end) patch.end_date = norm.end;
          
          if (s.id === focusScheduleId && focusUpdates) {
            const { start_date, end_date, ...rest } = focusUpdates;
            Object.assign(patch, rest);
            if (typeof start_date === "string") patch.start_date = start_date;
            if (typeof end_date === "string") patch.end_date = end_date;
            if (focusUpdates.actual_days === null) patch.actual_days = null;
          }
          
          if (Object.keys(patch).length > 0) {
            updatesToApply.push({ id: s.id, patch });
          }
          // Mettre à jour cursor pour l'étape suivante
          cursor = addBusinessDays(parseISO(norm.end), 1);
        }
        continue;
      }

      // Vérifier les contraintes de délai (ex: cure béton)
      const delayConfig = minimumDelayAfterStep[s.step_id];
      let requiredStartDate: Date | null = null;
      if (delayConfig && stepEndDates[delayConfig.afterStep]) {
        requiredStartDate = addDays(parseISO(stepEndDates[delayConfig.afterStep]), delayConfig.days);
      }

      // === ÉTAPE FOCUS: Appliquer les changements de l'utilisateur ===
      if (s.id === focusScheduleId && focusUpdates) {
        const patch: Partial<ScheduleItem> = {};
        let newStartStr: string;
        let newEndStr: string;

        // Cas spécial: réinitialisation (start_date = null explicitement)
        const isReset = 'start_date' in focusUpdates && focusUpdates.start_date === null;

        if (isReset) {
          // Recalculer la date basée sur le cursor (étape précédente)
          let newStart = cursor || new Date();
          
          // Respecter les contraintes de délai (cure béton)
          if (requiredStartDate && newStart < requiredStartDate) {
            newStart = requiredStartDate;
          }
          
          newStartStr = format(newStart, "yyyy-MM-dd");
          newEndStr = format(addBusinessDays(newStart, duration - 1), "yyyy-MM-dd");
          
          // Appliquer aussi is_manual_date si présent
          if ('is_manual_date' in focusUpdates) {
            patch.is_manual_date = focusUpdates.is_manual_date;
          }
        } else if (focusUpdates.start_date) {
          newStartStr = focusUpdates.start_date;
          newEndStr = focusUpdates.end_date || format(addBusinessDays(parseISO(newStartStr), duration - 1), "yyyy-MM-dd");
          
          // Vérifier conflit de cure
          if (requiredStartDate && parseISO(newStartStr) < requiredStartDate) {
            const daysShort = Math.ceil((requiredStartDate.getTime() - parseISO(newStartStr).getTime()) / (1000 * 60 * 60 * 24));
            directConflictWarning.push(
              `La date choisie (${format(parseISO(newStartStr), "d MMM yyyy", { locale: fr })}) ` +
              `ne respecte pas le délai de cure du béton de ${delayConfig!.days} jours (manque ${daysShort} jour(s)). ` +
              `Date recommandée: ${format(requiredStartDate, "d MMM yyyy", { locale: fr })}.`
            );
          }
        } else if (focusUpdates.end_date) {
          newEndStr = focusUpdates.end_date;
          newStartStr = format(subBusinessDays(parseISO(newEndStr), duration - 1), "yyyy-MM-dd");
          
          // Vérifier conflit de cure
          if (requiredStartDate && parseISO(newStartStr) < requiredStartDate) {
            const daysShort = Math.ceil((requiredStartDate.getTime() - parseISO(newStartStr).getTime()) / (1000 * 60 * 60 * 24));
            directConflictWarning.push(
              `La date de fin choisie implique un début trop tôt. ` +
              `Le délai de cure de ${delayConfig!.days} jours n'est pas respecté (manque ${daysShort} jour(s)).`
            );
          }
        } else {
          // Pas de changement de date, juste d'autres champs
          newStartStr = s.start_date || format(new Date(), "yyyy-MM-dd");
          newEndStr = s.end_date || format(addBusinessDays(parseISO(newStartStr), duration - 1), "yyyy-MM-dd");
        }

        // Appliquer les changements
        if (s.start_date !== newStartStr) patch.start_date = newStartStr;
        if (s.end_date !== newEndStr) patch.end_date = newEndStr;
        
        // Pour les autres champs (sauf si c'est un reset où on a déjà traité is_manual_date)
        if (!isReset) {
          const { start_date, end_date, ...rest } = focusUpdates;
          Object.assign(patch, rest);
        }
        if (focusUpdates.actual_days === null) patch.actual_days = null;

        if (Object.keys(patch).length > 0) {
          updatesToApply.push({ id: s.id, patch });
        }
        
        // Mettre à jour stepEndDates et cursor pour les vérifications suivantes
        stepEndDates[s.step_id] = newEndStr;
        cursor = addBusinessDays(parseISO(newEndStr), 1);
        continue;
      }

      // === AUTRES ÉTAPES APRÈS L'ÉTAPE FOCUS ===
      if (focusIndex >= 0 && i > focusIndex) {
        const isManualDate = manualDateStepIds.has(s.id);
        
        if (isManualDate && s.start_date) {
          // Cette étape a une date manuelle verrouillée - NE PAS la modifier
          // NE PAS propager les changements aux étapes suivantes non plus
          // Car les étapes après une étape verrouillée doivent rester stables
          
          const manualStart = parseISO(s.start_date);
          
          // Vérifier s'il y a conflit avec le cursor (juste pour avertir)
          if (cursor && manualStart < cursor) {
            const daysConflict = Math.ceil((cursor.getTime() - manualStart.getTime()) / (1000 * 60 * 60 * 24));
            if (directConflictWarning.length === 0) {
              directConflictWarning.push(
                `"${s.step_name}" a une date verrouillée (${format(manualStart, "d MMM yyyy", { locale: fr })}) ` +
                `qui chevauche l'étape précédente (${daysConflict} jour(s) de conflit).`
              );
            }
          }
          
          // Vérifier conflit de cure
          if (requiredStartDate && manualStart < requiredStartDate && directConflictWarning.length === 0) {
            const daysShort = Math.ceil((requiredStartDate.getTime() - manualStart.getTime()) / (1000 * 60 * 60 * 24));
            directConflictWarning.push(
              `"${s.step_name}" a une date verrouillée qui ne respecte pas le délai de cure (${daysShort} jour(s) manquants).`
            );
          }
          
          // Mettre à jour stepEndDates mais ARRÊTER la propagation du cursor modifié
          // Les étapes après cette étape verrouillée gardent leurs dates actuelles
          const manualEnd = s.end_date ? parseISO(s.end_date) : addBusinessDays(manualStart, duration - 1);
          stepEndDates[s.step_id] = format(manualEnd, "yyyy-MM-dd");
          
          // IMPORTANT: Réinitialiser le cursor à la date de fin de l'étape verrouillée
          // Cela empêche la propagation des changements aux étapes suivantes
          cursor = addBusinessDays(manualEnd, 1);
          
          // Marquer qu'on a rencontré une étape verrouillée - les étapes suivantes ne seront pas modifiées
          // sauf si elles sont aussi après une autre modification
          continue;
        } else {
          // Cette étape N'A PAS de date manuelle - la décaler automatiquement
          let newStart = cursor || new Date();
          
          // Respecter les contraintes de délai (cure béton)
          if (requiredStartDate && newStart < requiredStartDate) {
            newStart = requiredStartDate;
          }
          
          const newStartStr = format(newStart, "yyyy-MM-dd");
          const newEndStr = format(addBusinessDays(newStart, duration - 1), "yyyy-MM-dd");
          
          const patch: Partial<ScheduleItem> = {};
          if (s.start_date !== newStartStr) patch.start_date = newStartStr;
          if (s.end_date !== newEndStr) patch.end_date = newEndStr;
          
          if (Object.keys(patch).length > 0) {
            updatesToApply.push({ id: s.id, patch });
          }
          
          // Mettre à jour cursor et stepEndDates
          stepEndDates[s.step_id] = newEndStr;
          cursor = addBusinessDays(parseISO(newEndStr), 1);
        }
      } else if (s.start_date && s.end_date) {
        // Étapes avant l'étape focus - juste mettre à jour le cursor
        stepEndDates[s.step_id] = s.end_date;
        cursor = addBusinessDays(parseISO(s.end_date), 1);
      }
    }

    if (updatesToApply.length > 0) {
      const results = await Promise.all(
        updatesToApply.map((u) =>
          supabase.from("project_schedules").update(u.patch).eq("id", u.id)
        )
      );

      const errors = results.map((r) => r.error).filter(Boolean);
      if (errors.length > 0) {
        toast({
          title: "Erreur",
          description: errors[0]!.message,
          variant: "destructive",
        });
        return { warnings: [] };
      }
    }

    queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
    queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });

    // Vérifier les conflits de métiers après recalcul
    const recalculatedSchedules = sorted.map((s) => {
      const update = updatesToApply.find(u => u.id === s.id);
      if (update?.patch) {
        return { ...s, ...update.patch };
      }
      return s;
    });
    
    // Ne pas ajouter les conflits de métiers si on a déjà un conflit direct
    // pour éviter de surcharger l'utilisateur avec trop d'informations
    if (directConflictWarning.length === 0) {
      const tradeConflicts = checkConflicts(recalculatedSchedules);
      if (tradeConflicts.length > 0) {
        const conflictDates = tradeConflicts.slice(0, 1).map(c => 
          `${format(parseISO(c.date), "d MMM", { locale: fr })}: ${c.trades.join(" + ")}`
        ).join("; ");
        warnings.push(`Conflit de métiers: ${conflictDates}`);
      }
    }

    // Retourner seulement le conflit direct s'il y en a un, sinon les autres warnings
    const finalWarnings = directConflictWarning.length > 0 
      ? directConflictWarning 
      : warnings;
    
    return { warnings: finalWarnings };
  };

  const fetchAndRegenerateSchedule = async (
    focusScheduleId?: string,
    focusUpdates?: Partial<ScheduleItem>
  ) => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    await regenerateScheduleFromSchedules(
      (data || []) as ScheduleItem[],
      focusScheduleId,
      focusUpdates
    );
  };

  // Force un recalcul complet (utile quand des étapes "terminées" avaient des dates futures)
  const regenerateSchedule = async () => {
    await fetchAndRegenerateSchedule();
  };

  // Métiers intérieurs qui peuvent coexister avec l'extérieur
  const interiorTrades = ["gypse", "peinture", "plancher", "ceramique", "armoires", "comptoirs", "finitions"];
  const exteriorTrades = ["exterieur", "amenagement"];


  // Vérifie si deux métiers peuvent travailler en parallèle sans conflit
  const canWorkInParallel = (trade1: string, trade2: string): boolean => {
    // L'extérieur peut travailler en parallèle avec les métiers intérieurs
    const isExterior1 = exteriorTrades.includes(trade1);
    const isExterior2 = exteriorTrades.includes(trade2);
    const isInterior1 = interiorTrades.includes(trade1);
    const isInterior2 = interiorTrades.includes(trade2);

    // Extérieur + Intérieur = pas de conflit
    if ((isExterior1 && isInterior2) || (isExterior2 && isInterior1)) {
      return true;
    }

    return false;
  };

  const checkConflicts = (schedules: ScheduleItem[]): { date: string; trades: string[] }[] => {
    const conflicts: { date: string; trades: string[] }[] = [];
    const dateTradeMap: Record<string, Set<string>> = {};

    // Trades à ignorer pour les conflits (administratifs/préparation)
    const ignoredTrades = ["autre", "inspecteur"];

    for (const schedule of schedules) {
      // Ignorer les étapes terminées - elles ne créent plus de conflits
      if (schedule.status === "completed") continue;
      if (!schedule.start_date || !schedule.end_date) continue;
      // Ignorer les trades administratifs
      if (ignoredTrades.includes(schedule.trade_type)) continue;

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
      const tradesArray = Array.from(trades);
      if (tradesArray.length > 1) {
        // Vérifier si tous les métiers peuvent travailler en parallèle
        let hasRealConflict = false;
        for (let i = 0; i < tradesArray.length; i++) {
          for (let j = i + 1; j < tradesArray.length; j++) {
            if (!canWorkInParallel(tradesArray[i], tradesArray[j])) {
              hasRealConflict = true;
              break;
            }
          }
          if (hasRealConflict) break;
        }
        
        if (hasRealConflict) {
          conflicts.push({ date, trades: tradesArray });
        }
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

    // Calculer le nombre de jours d'avance/retard (positif = en avance, négatif = en retard)
    let daysAhead = 0;
    if (originalEndDate) {
      daysAhead = differenceInBusinessDays(parseISO(originalEndDate), parseISO(actualEndDate));
    } else if (completedSchedule.start_date) {
      const plannedDuration = completedSchedule.estimated_days;
      const realDuration = actualDays ?? (differenceInBusinessDays(parseISO(actualEndDate), parseISO(completedSchedule.start_date)) + 1);
      daysAhead = plannedDuration - realDuration;
    }

    // Mettre à jour l'étape complétée
    await supabase
      .from("project_schedules")
      .update({
        status: "completed",
        start_date: actualStartDate ?? completedSchedule.start_date,
        end_date: actualEndDate,
        actual_days: actualDays ?? completedSchedule.actual_days ?? completedSchedule.estimated_days,
      })
      .eq("id", completedScheduleId);

    // Décaler toutes les étapes suivantes en batch (que ce soit en avance OU en retard)
    const subsequentSchedules = sortedSchedules.slice(completedIndex + 1);
    let newStartDate = addBusinessDays(parseISO(actualEndDate), 1);
    const alertsToCreate: Omit<ScheduleAlert, 'id' | 'created_at'>[] = [];
    const updates: { id: string; start_date: string; end_date: string }[] = [];

    // Stocker les dates de fin pour les délais minimum
    const previousStepEndDates: Record<string, string> = {};
    previousStepEndDates[completedSchedule.step_id] = actualEndDate;

    for (const schedule of subsequentSchedules) {
      if (schedule.status === "completed") {
        if (schedule.end_date) {
          previousStepEndDates[schedule.step_id] = schedule.end_date;
        }
        continue;
      }

      // Vérifier s'il y a un délai minimum après une étape précédente
      const delayConfig = minimumDelayAfterStep[schedule.step_id];
      if (delayConfig && previousStepEndDates[delayConfig.afterStep]) {
        const requiredStartDate = addDays(parseISO(previousStepEndDates[delayConfig.afterStep]), delayConfig.days);
        // Si le délai impose une date plus tardive, on l'utilise
        if (requiredStartDate > newStartDate) {
          newStartDate = requiredStartDate;
        }
      }

      const newStart = format(newStartDate, "yyyy-MM-dd");
      const duration = schedule.actual_days || schedule.estimated_days;
      const newEnd = format(addBusinessDays(newStartDate, duration - 1), "yyyy-MM-dd");

      // Stocker la date de fin pour les délais des étapes suivantes
      previousStepEndDates[schedule.step_id] = newEnd;

      // Vérifier si le fournisseur doit être appelé (en avance = urgent, en retard = reporter)
      if (schedule.supplier_schedule_lead_days > 0 && schedule.start_date) {
        const newCallDate = subBusinessDays(newStartDate, schedule.supplier_schedule_lead_days);
        const today = new Date();
        const daysUntilCall = differenceInBusinessDays(newCallDate, today);
        
        if (daysAhead > 0 && daysUntilCall <= 5 && daysUntilCall >= -2) {
          // En avance: alerte urgente
          alertsToCreate.push({
            project_id: projectId,
            schedule_id: schedule.id,
            alert_type: "urgent_supplier_call",
            alert_date: format(today, "yyyy-MM-dd"),
            message: `⚠️ URGENT: Appeler ${schedule.supplier_name || "le fournisseur"} pour ${schedule.step_name} - Le projet avance plus vite! Nouvelle date prévue: ${format(newStartDate, "d MMM yyyy")}`,
            is_dismissed: false,
          });
        } else if (daysAhead < 0) {
          // En retard: informer du report
          alertsToCreate.push({
            project_id: projectId,
            schedule_id: schedule.id,
            alert_type: "schedule_delayed",
            alert_date: format(today, "yyyy-MM-dd"),
            message: `📅 REPORT: ${schedule.step_name} reportée au ${format(newStartDate, "d MMM yyyy")} (${Math.abs(daysAhead)} jour(s) de retard). Prévenir ${schedule.supplier_name || "le fournisseur"}.`,
            is_dismissed: false,
          });
        }
      }

      updates.push({ id: schedule.id, start_date: newStart, end_date: newEnd });
      newStartDate = addBusinessDays(parseISO(newEnd), 1);
    }

    // Exécuter les mises à jour en batch
    for (const update of updates) {
      await supabase
        .from("project_schedules")
        .update({ start_date: update.start_date, end_date: update.end_date })
        .eq("id", update.id);
    }

    // Créer les alertes
    if (alertsToCreate.length > 0) {
      await supabase.from("schedule_alerts").insert(alertsToCreate);
    }

    // Invalider une seule fois à la fin
    queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
    queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });

    // Message adapté selon avance ou retard
    if (daysAhead > 0) {
      toast({
        title: "Échéancier ajusté",
        description: `${daysAhead} jour(s) d'avance! ${updates.length} étape(s) devancée(s).`,
      });
    } else if (daysAhead < 0) {
      toast({
        title: "Échéancier recalculé",
        description: `${Math.abs(daysAhead)} jour(s) de retard. ${updates.length} étape(s) reportée(s).`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Étape terminée",
        description: "L'échéancier a été mis à jour.",
      });
    }

    return { daysAhead, alertsCreated: alertsToCreate.length };
  };

  /**
   * Marquer une étape comme complétée et ajuster l'échéancier
   * Utilise TOUJOURS la date du jour comme date de fin (sauf si l'utilisateur fournit actualDays)
   * Cela garantit que l'échéancier reflète la réalité
   */
  const completeStep = async (scheduleId: string, actualDays?: number) => {
    const todayDate = new Date();
    const today = format(todayDate, "yyyy-MM-dd");

    // Récupérer le schedule actuel
    const currentSchedule = schedulesQuery.data?.find(s => s.id === scheduleId);
    
    // Toujours utiliser aujourd'hui comme date de fin lors de la complétion
    const actualEndDate = today;
    
    // Durée: utiliser actualDays si fourni, sinon 1 jour (complété aujourd'hui)
    let usedDays: number;
    if (actualDays && actualDays > 0) {
      usedDays = actualDays;
    } else {
      usedDays = 1; // Par défaut, si complété aujourd'hui sans préciser la durée = 1 jour
    }

    // Calculer la date de début basée sur la durée réelle
    const actualStartDate = format(subBusinessDays(todayDate, usedDays - 1), "yyyy-MM-dd");

    console.log(`Completing step: ${currentSchedule?.step_name}, days: ${usedDays}, start: ${actualStartDate}, end: ${actualEndDate}`);

    // Régénérer l'échéancier complet en prenant cette étape comme point fixe "completed"
    await fetchAndRegenerateSchedule(scheduleId, {
      status: "completed",
      actual_days: usedDays,
      start_date: actualStartDate,
      end_date: actualEndDate,
    });

    // Pour compat: on renvoie une structure similaire
    return { daysAhead: 0, alertsCreated: 0 };
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

    // Mettre à jour l'étape complétée directement via Supabase
    await supabase
      .from("project_schedules")
      .update({
        status: "completed",
        start_date: actualStartDate ?? completedSchedule.start_date ?? actualEndDate,
        end_date: actualEndDate,
        actual_days: actualDays ?? 1,
      })
      .eq("id", completedScheduleId);

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
    let updatedCount = 0;

    // Stocker les dates de fin pour les délais minimum
    const previousStepEndDates: Record<string, string> = {};
    previousStepEndDates[completedSchedule.step_id] = actualEndDate;

    // Aussi collecter les dates de fin des étapes déjà complétées
    for (const schedule of existingSchedules) {
      if (schedule.status === "completed" && schedule.end_date) {
        previousStepEndDates[schedule.step_id] = schedule.end_date;
      }
    }

    for (const step of subsequentSteps) {
      // Vérifier si un schedule existe déjà pour cette étape
      const schedule = existingSchedules.find((s) => s.step_id === step.id);

      // Vérifier s'il y a un délai minimum après une étape précédente
      const delayConfig = minimumDelayAfterStep[step.id];
      if (delayConfig && previousStepEndDates[delayConfig.afterStep]) {
        const requiredStartDate = addDays(parseISO(previousStepEndDates[delayConfig.afterStep]), delayConfig.days);
        // Si le délai impose une date plus tardive, on l'utilise
        if (requiredStartDate > nextStartDate) {
          nextStartDate = requiredStartDate;
        }
      }

      const tradeType = stepTradeMapping[step.id] || "autre";
      const estimatedDays = defaultDurations[step.id] || 5;
      const newStart = format(nextStartDate, "yyyy-MM-dd");
      const newEnd = format(addBusinessDays(nextStartDate, estimatedDays - 1), "yyyy-MM-dd");

      // Stocker la date de fin pour les délais des étapes suivantes
      previousStepEndDates[step.id] = newEnd;

      if (schedule) {
        // Mettre à jour le schedule existant (sauf s'il est déjà complété)
        if (schedule.status !== "completed") {
          await supabase
            .from("project_schedules")
            .update({ start_date: newStart, end_date: newEnd })
            .eq("id", schedule.id);
          updatedCount++;
        } else {
          // Si complété, on utilise sa date de fin pour le suivant
          if (schedule.end_date) {
            nextStartDate = addBusinessDays(parseISO(schedule.end_date), 1);
            previousStepEndDates[step.id] = schedule.end_date;
            continue;
          }
        }
      } else {
        // Utiliser upsert pour créer le schedule sans risque de doublon
        await supabase.from("project_schedules").upsert({
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
        updatedCount++;
      }

      // La prochaine étape commence après celle-ci
      nextStartDate = addBusinessDays(parseISO(newEnd), 1);
    }

    // Invalider une seule fois à la fin
    queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });

    toast({
      title: "Étape terminée",
      description: `Les ${updatedCount} prochaines étapes ont été planifiées.`,
    });

    return { daysAhead: 0, alertsCreated: 0 };
  };

  /**
   * Annuler la complétion d'une étape et restaurer l'échéancier original
   * Recalcule toutes les dates suivantes en utilisant les durées estimées
   */
  const uncompleteStep = async (scheduleId: string) => {
    // On repasse l'étape en "pending" et on régénère tout l'échéancier
    await fetchAndRegenerateSchedule(scheduleId, {
      status: "pending",
      actual_days: null,
    });
  };

  /**
   * Met à jour une étape ET recalcule toutes les étapes suivantes
   * Pour maintenir la coordination du calendrier
   */
  const updateScheduleAndRecalculate = async (
    scheduleId: string,
    updates: Partial<ScheduleItem>
  ): Promise<{ warnings: string[] }> => {
    if (!projectId) return { warnings: [] };

    // Toujours relire depuis la DB pour éviter d'utiliser un cache incomplet/stale
    const { data: allSchedules, error: fetchError } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId);

    if (fetchError) {
      toast({ title: "Erreur", description: fetchError.message, variant: "destructive" });
      return { warnings: [] };
    }

    const sortedSchedules = sortSchedulesByExecutionOrder((allSchedules || []) as ScheduleItem[]);
    const schedule = sortedSchedules.find((s) => s.id === scheduleId);
    if (!schedule) return { warnings: [] };

    // Sécuriser les champs qu'on permet de mettre à jour (évite d'envoyer id/created_at/etc.)
    const allowedKeys: Array<keyof ScheduleItem> = [
      "step_name",
      "trade_type",
      "trade_color",
      "estimated_days",
      "actual_days",
      "start_date",
      "end_date",
      "supplier_name",
      "supplier_phone",
      "supplier_schedule_lead_days",
      "fabrication_lead_days",
      "fabrication_start_date",
      "measurement_required",
      "measurement_after_step_id",
      "measurement_notes",
      "status",
      "notes",
    ];

    const safeUpdates = allowedKeys.reduce((acc, key) => {
      if (key in updates) {
        // @ts-expect-error - reduce typing helper
        acc[key] = updates[key] as any;
      }
      return acc;
    }, {} as Partial<ScheduleItem>);


    // Si l'utilisateur passe une étape à "completed" via l'édition (Select/checkbox),
    // on considère qu'elle est terminée AUJOURD'HUI, sauf si l'utilisateur a réellement changé end_date.
    if (safeUpdates.status === "completed" && schedule.status !== "completed") {
      const todayStr = format(new Date(), "yyyy-MM-dd");

      const providedEnd = safeUpdates.end_date;
      const endUnchanged = providedEnd === schedule.end_date;
      const endIsManual = providedEnd != null && !endUnchanged;

      const usedDaysRaw =
        (safeUpdates.actual_days ?? schedule.actual_days ?? schedule.estimated_days ?? 1) || 1;
      const usedDays = Math.max(1, Number(usedDaysRaw));

      const endToUse = endIsManual ? (providedEnd as string) : todayStr;

      const providedStart = safeUpdates.start_date;
      const startUnchanged = providedStart === schedule.start_date;
      const startIsManual = providedStart != null && !startUnchanged;

      const startToUse = startIsManual
        ? (providedStart as string)
        : format(subBusinessDays(parseISO(endToUse), usedDays - 1), "yyyy-MM-dd");

      safeUpdates.end_date = endToUse;
      safeUpdates.start_date = startToUse;
      safeUpdates.actual_days = usedDays;
    }

    // Régénération complète (anti-chevauchement) en appliquant la modif comme “source de vérité”
    const result = await regenerateScheduleFromSchedules(
      sortSchedulesByExecutionOrder((allSchedules || []) as ScheduleItem[]),
      scheduleId,
      safeUpdates
    );
    return result;
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
    updateScheduleAndRecalculate,
    regenerateSchedule,
    isCreating: createScheduleMutation.isPending,
    isUpdating: updateScheduleMutation.isPending,
  };
};
