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
    afterStep: "fondation",
    days: 21, // 3 semaines minimum pour la cure du béton
    reason: "Cure du béton des fondations (minimum 3 semaines)",
  },
  exterieur: {
    afterStep: "electricite-roughin",
    days: 0,
    reason: "Le revêtement extérieur peut commencer après l'électricité rough-in",
  },
};

// Étapes qui doivent être traitées en parallèle (ne pas avancer le cursor principal)
// Ces étapes commencent après leur étape prérequise mais n'affectent pas la séquence des travaux intérieurs
const parallelSteps: Set<string> = new Set(["exterieur"]);

/** Tâche manuelle "travaux en simultané" - ne déplace pas l'échéancier */
const isOverlayTask = (s: ScheduleItem): boolean => {
  if (!s.step_id.startsWith("manual")) return false;
  if (!s.notes) return false;
  try {
    const parsed = JSON.parse(s.notes) as { isOverlay?: boolean };
    return !!parsed.isOverlay;
  } catch {
    return false;
  }
};

/** Récupère le step_id de l'étape liée pour une tâche manuelle */
const getLinkedStepId = (s: ScheduleItem): string | null => {
  if (s.measurement_after_step_id) return s.measurement_after_step_id;
  if (!s.notes) return null;
  try {
    const parsed = JSON.parse(s.notes) as { linkedStepId?: string };
    return parsed.linkedStepId || null;
  } catch {
    return null;
  }
};

// Mapping soumission trade ID -> schedule step_id
const soumissionTradeToStepId: Record<string, string> = {
  "chauffage-et-ventilation": "hvac",
  "hvac": "hvac",
  "plomberie": "plomberie-roughin",
  "electricite": "electricite-roughin",
  "toiture": "toiture",
  "fenetres-et-portes": "fenetre",
  "charpente": "structure",
  "excavation": "fondation",
  "fondation": "fondation",
  "isolation-et-pare-vapeur": "isolation",
  "isolation": "isolation",
  "revetement-exterieur": "exterieur",
  "exterieur": "exterieur",
  "gypse-et-peinture": "gypse",
  "gypse": "gypse",
  "peinture": "gypse",
  "revetements-de-sol": "plancher",
  "plancher": "plancher",
  "travaux-ebenisterie-(cuisine/sdb)": "cuisine-sdb",
  "armoires": "cuisine-sdb",
  "finitions-interieures": "finitions",
  "finitions": "finitions",
  "ceramique": "finitions",
  "comptoirs": "cuisine-sdb",
  "amenagement": "finitions",
};

export const useProjectSchedule = (projectId: string | null) => {
  const queryClient = useQueryClient();

  // Track schedules we already auto-dismissed to avoid repeated DB updates
  const autoDismissedSupplierAlertsRef = useRef<Set<string>>(new Set());

  const dismissSupplierCallAlertsForSchedule = async (scheduleId: string) => {
    if (!projectId) return;
    const { error } = await supabase
      .from("schedule_alerts")
      .update({ is_dismissed: true })
      .eq("project_id", projectId)
      .eq("schedule_id", scheduleId)
      .eq("alert_type", "supplier_call")
      .eq("is_dismissed", false);

    if (error) {
      console.error("Failed to dismiss supplier_call alerts:", error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
  };

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

  // If a step is already date-locked, supplier_call reminders are no longer relevant.
  // Auto-dismiss any existing supplier_call alerts for locked schedules.
  useEffect(() => {
    if (!projectId) {
      autoDismissedSupplierAlertsRef.current = new Set();
      return;
    }

    const schedules = (schedulesQuery.data || []) as ScheduleItem[];
    for (const s of schedules) {
      if (!s.is_manual_date) continue;
      if (autoDismissedSupplierAlertsRef.current.has(s.id)) continue;
      autoDismissedSupplierAlertsRef.current.add(s.id);
      void dismissSupplierCallAlertsForSchedule(s.id);
    }
  }, [projectId, schedulesQuery.data]);

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

    // Alerte appel fournisseur (inutile une fois la date verrouillée)
    if (!schedule.is_manual_date && schedule.supplier_schedule_lead_days > 0) {
      const alertDate = subBusinessDays(startDate, schedule.supplier_schedule_lead_days);
      const formattedStartDate = format(startDate, "d MMMM yyyy", { locale: fr });
      alerts.push({
        project_id: projectId,
        schedule_id: schedule.id,
        alert_type: "supplier_call",
        alert_date: format(alertDate, "yyyy-MM-dd"),
        message: `📞 Contacter ${schedule.supplier_name || "le fournisseur"} pour planifier "${schedule.step_name}" - Début des travaux prévu le ${formattedStartDate} (préavis de ${schedule.supplier_schedule_lead_days} jours)`,
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

  /**
   * Synchronize supplier call alerts from soumissions (task_dates) data.
   * This reads all soumissions with supplierLeadDays and creates alerts for each.
   */
  const syncAlertsFromSoumissions = async () => {
    if (!projectId) return;

    // 1. Fetch all soumission task_dates with notes
    const { data: soumissions, error: soumissionsError } = await supabase
      .from("task_dates")
      .select("task_id, notes")
      .eq("project_id", projectId)
      .eq("step_id", "soumissions")
      .like("task_id", "soumission-%");

    if (soumissionsError) {
      console.error("Error fetching soumissions:", soumissionsError);
      return;
    }

    // 2. Get current schedules
    const schedules = schedulesQuery.data || [];

    // 3. Process each soumission
    const alertsToCreate: Omit<ScheduleAlert, 'id' | 'created_at'>[] = [];

    for (const soumission of soumissions || []) {
      if (!soumission.notes) continue;

      let notes: {
        supplierName?: string;
        supplierPhone?: string;
        contactPerson?: string;
        supplierLeadDays?: number;
        isCompleted?: boolean;
        isDIY?: boolean;
        orderLeadDays?: number;
        subCategoryName?: string;
      };

      try {
        notes = JSON.parse(soumission.notes);
      } catch {
        continue;
      }

      // Extract trade ID from task_id (e.g., "soumission-chauffage-et-ventilation" -> "chauffage-et-ventilation")
      const fullTradeId = soumission.task_id.replace("soumission-", "");
      
      // Handle DIY sub-categories with order lead days
      if (fullTradeId.includes("-sub-") && notes.isDIY && notes.orderLeadDays && notes.orderLeadDays > 0) {
        // Extract the base trade ID (e.g., "electricite-sub-abc123" -> "electricite")
        const baseTradeId = fullTradeId.split("-sub-")[0];
        
        // Map to schedule step_id
        const stepId = soumissionTradeToStepId[baseTradeId];
        if (!stepId) {
          console.log(`No step mapping for DIY trade: ${baseTradeId}`);
          continue;
        }

        // Find the corresponding schedule
        const schedule = schedules.find(s => s.step_id === stepId);
        if (!schedule || !schedule.start_date) {
          continue;
        }

        // Calculate alert date for material order
        const startDate = parseISO(schedule.start_date);
        const alertDate = subBusinessDays(startDate, notes.orderLeadDays);
        const formattedStartDate = format(startDate, "d MMMM yyyy", { locale: fr });
        const itemName = notes.subCategoryName || "matériaux DIY";

        alertsToCreate.push({
          project_id: projectId,
          schedule_id: schedule.id,
          alert_type: "material_order",
          alert_date: format(alertDate, "yyyy-MM-dd"),
          message: `🛒 Commander les matériaux pour "${itemName}" (${schedule.step_name}) - Début des travaux prévu le ${formattedStartDate} (préavis de ${notes.orderLeadDays} jours)`,
          is_dismissed: false,
        });
        
        continue;
      }
      
      // Skip sub-categories for regular supplier alerts
      if (fullTradeId.includes("-sub-")) continue;

      // Skip if no supplier selected or no lead days (for regular suppliers)
      if (!notes.supplierName || !notes.supplierLeadDays || notes.supplierLeadDays <= 0) {
        continue;
      }

      // Map to schedule step_id
      const stepId = soumissionTradeToStepId[fullTradeId];
      if (!stepId) {
        console.log(`No step mapping for trade: ${fullTradeId}`);
        continue;
      }

      // Find the corresponding schedule
      const schedule = schedules.find(s => s.step_id === stepId);
      if (!schedule || !schedule.start_date) {
        continue;
      }

      // If the user has locked this step date, we consider the supplier confirmed.
      // Do not generate supplier_call alerts for locked steps.
      if (schedule.is_manual_date) {
        continue;
      }

      // Calculate alert date
      const startDate = parseISO(schedule.start_date);
      const alertDate = subBusinessDays(startDate, notes.supplierLeadDays);
      const formattedStartDate = format(startDate, "d MMMM yyyy", { locale: fr });

      // Build contact info string
      const contactInfo = notes.contactPerson 
        ? ` (Contact: ${notes.contactPerson}${notes.supplierPhone ? ` - ${notes.supplierPhone}` : ""})`
        : notes.supplierPhone 
          ? ` (${notes.supplierPhone})`
          : "";

      alertsToCreate.push({
        project_id: projectId,
        schedule_id: schedule.id,
        alert_type: "supplier_call",
        alert_date: format(alertDate, "yyyy-MM-dd"),
        message: `📞 Contacter ${notes.supplierName} pour planifier "${schedule.step_name}" - Début des travaux prévu le ${formattedStartDate} (préavis de ${notes.supplierLeadDays} jours)${contactInfo}`,
        is_dismissed: false,
      });
    }

    // 4. Delete existing supplier_call and material_order alerts and recreate
    const scheduleIds = schedules.map(s => s.id);
    if (scheduleIds.length > 0) {
      // Delete supplier_call alerts
      await supabase
        .from("schedule_alerts")
        .delete()
        .eq("project_id", projectId)
        .eq("alert_type", "supplier_call")
        .in("schedule_id", scheduleIds);
      
      // Delete material_order alerts
      await supabase
        .from("schedule_alerts")
        .delete()
        .eq("project_id", projectId)
        .eq("alert_type", "material_order")
        .in("schedule_id", scheduleIds);
    }

    // 5. Create new alerts
    for (const alert of alertsToCreate) {
      await createAlertMutation.mutateAsync(alert);
    }

    // Invalidate alerts query to refresh UI
    queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });

    return alertsToCreate.length;
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
    
    // Collecter les sous-traitants avec dates verrouillées à contacter
    const subcontractorsToContact: Array<{
      schedule: ScheduleItem;
      reason: "delay" | "advance";
      daysDiff: number;
    }> = [];

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

      // Tâches overlay (travaux en simultané) - ne pas modifier, ne pas participer au recalcul
      if (isOverlayTask(s)) continue;

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
          const requestedStart = parseISO(focusUpdates.start_date);
          const minValidStart = cursor ? subBusinessDays(cursor, 0) : null;
          const linkedStepId = getLinkedStepId(s);
          const linkedStep = linkedStepId ? sorted.find((x) => x.step_id === linkedStepId) : null;
          const linkedIsLocked = !!linkedStep?.is_manual_date;
          // Si étape liée verrouillée : la tâche est après elle, on ne peut pas décaler → date >= fin étape liée
          // Sinon : tâche avant l'étape liée, date >= fin étape précédente
          if (minValidStart && requestedStart < minValidStart) {
            const linkedName = linkedStep?.step_name || linkedStepId || "l'étape précédente";
            directConflictWarning.push(
              linkedIsLocked
                ? `L'étape liée "${linkedName}" a une date verrouillée. La date demandée (${format(requestedStart, "d MMM yyyy", { locale: fr })}) n'est pas possible. La tâche a été placée le ${format(minValidStart, "d MMM yyyy", { locale: fr })}.`
                : `La date demandée (${format(requestedStart, "d MMM yyyy", { locale: fr })}) est avant la fin de l'étape précédente. La tâche a été placée le ${format(minValidStart, "d MMM yyyy", { locale: fr })}.`
            );
            if (linkedIsLocked && projectId) {
              await supabase.from("schedule_alerts").insert({
                project_id: projectId,
                schedule_id: s.id,
                alert_type: "linked_step_locked",
                alert_date: format(new Date(), "yyyy-MM-dd"),
                message: `⚠️ L'étape liée "${linkedStep?.step_name}" a une date verrouillée. La tâche "${s.step_name}" a été décalée. Vérifiez avec vos sous-traitants.`,
                is_dismissed: false,
              });
            }
            newStartStr = format(minValidStart, "yyyy-MM-dd");
            newEndStr = format(addBusinessDays(minValidStart, duration - 1), "yyyy-MM-dd");
          } else {
            newStartStr = focusUpdates.start_date;
            newEndStr = focusUpdates.end_date || format(addBusinessDays(parseISO(newStartStr), duration - 1), "yyyy-MM-dd");
          }
          
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
          // Garder la date de début existante, ne changer que la date de fin
          newEndStr = focusUpdates.end_date;
          newStartStr = s.start_date || format(new Date(), "yyyy-MM-dd");
        } else {
          // Pas de changement de date, juste d'autres champs
          newStartStr = s.start_date || format(new Date(), "yyyy-MM-dd");
          newEndStr = s.end_date || format(addBusinessDays(parseISO(newStartStr), duration - 1), "yyyy-MM-dd");
        }

        // Appliquer les changements (toujours pousser pour forcer la persistance)
        patch.start_date = newStartStr;
        patch.end_date = newEndStr;
        if (!isReset) {
          const { start_date, end_date, ...rest } = focusUpdates;
          Object.assign(patch, rest);
        }
        if (focusUpdates.actual_days === null) patch.actual_days = null;
        updatesToApply.push({ id: s.id, patch });
        
        // Mettre à jour stepEndDates et cursor pour les vérifications suivantes
        stepEndDates[s.step_id] = newEndStr;
        cursor = addBusinessDays(parseISO(newEndStr), 1);
        continue;
      }

      // === AUTRES ÉTAPES (après l'étape focus OU toutes si pas de focus) ===
      // Quand focusIndex = -1, on recalcule toutes les étapes non-terminées
      const shouldRecalculate = focusIndex < 0 || (focusIndex >= 0 && i > focusIndex);
      
      if (shouldRecalculate) {
        const isManualDate = manualDateStepIds.has(s.id);
        
        if (isManualDate && s.start_date) {
          // Cette étape a une date manuelle verrouillée - NE PAS la modifier
          // NE PAS propager les changements aux étapes suivantes non plus
          
          const manualStart = parseISO(s.start_date);
          
          // Vérifier s'il y a conflit avec le cursor (juste pour avertir)
          // Afficher l'avertissement seulement si la date est verrouillée (is_manual_date)
          if (cursor && manualStart < cursor) {
            const daysConflict = Math.ceil((cursor.getTime() - manualStart.getTime()) / (1000 * 60 * 60 * 24));
            if (directConflictWarning.length === 0) {
              directConflictWarning.push(
                `"${s.step_name}" a une date verrouillée (${format(manualStart, "d MMM yyyy", { locale: fr })}) ` +
                `qui chevauche l'étape précédente (${daysConflict} jour(s) de conflit).`
              );
            }
            // Collecter pour créer une alerte de contact sous-traitant (retard)
            subcontractorsToContact.push({
              schedule: s,
              reason: "delay",
              daysDiff: daysConflict,
            });
          } else if (cursor && manualStart > cursor) {
            // L'échéancier est en avance - le sous-traitant pourrait commencer plus tôt
            const daysAdvance = Math.ceil((manualStart.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24));
            if (daysAdvance >= 2) { // Seulement si l'avance est significative (2+ jours)
              subcontractorsToContact.push({
                schedule: s,
                reason: "advance",
                daysDiff: daysAdvance,
              });
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
          const manualEnd = s.end_date ? parseISO(s.end_date) : addBusinessDays(manualStart, duration - 1);
          stepEndDates[s.step_id] = format(manualEnd, "yyyy-MM-dd");
          
          // Réinitialiser le cursor à la date de fin de l'étape verrouillée
          cursor = addBusinessDays(manualEnd, 1);
          continue;
        } else {
          // Cette étape N'A PAS de date manuelle - la décaler automatiquement
          const isParallelStep = parallelSteps.has(s.step_id);
          
          // Pour les étapes parallèles (ex: extérieur), utiliser la date de fin de l'étape prérequise
          // au lieu du cursor principal
          let newStart: Date;
          if (isParallelStep && requiredStartDate) {
            // L'étape parallèle commence après son étape prérequise, pas après le cursor
            newStart = requiredStartDate;
          } else {
            newStart = cursor || (s.start_date ? parseISO(s.start_date) : new Date());
            
            // Respecter les contraintes de délai (cure béton) pour les étapes séquentielles
            if (requiredStartDate && newStart < requiredStartDate) {
              newStart = requiredStartDate;
            }
          }
          
          const newStartStr = format(newStart, "yyyy-MM-dd");
          const newEndStr = format(addBusinessDays(newStart, duration - 1), "yyyy-MM-dd");
          
          const patch: Partial<ScheduleItem> = {
            start_date: newStartStr,
            end_date: newEndStr,
          };
          updatesToApply.push({ id: s.id, patch });
          
          // Mettre à jour stepEndDates
          stepEndDates[s.step_id] = newEndStr;
          
          // Pour les étapes parallèles, NE PAS avancer le cursor principal
          // Elles s'exécutent en même temps que les travaux intérieurs
          if (!isParallelStep) {
            cursor = addBusinessDays(parseISO(newEndStr), 1);
          }
        }
      } else if (s.start_date && s.end_date) {
        // Étapes avant l'étape focus - juste mettre à jour le cursor
        stepEndDates[s.step_id] = s.end_date;
        // Ne pas avancer le cursor pour les étapes parallèles
        if (!parallelSteps.has(s.step_id)) {
          cursor = addBusinessDays(parseISO(s.end_date), 1);
        }
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

    // Créer des alertes pour contacter les sous-traitants avec dates verrouillées
    // Exclure les tâches manuelles (manual-*) : pas de fournisseur à contacter
    const realSubcontractors = subcontractorsToContact.filter(
      ({ schedule }) => !schedule.step_id?.startsWith("manual")
    );
    if (realSubcontractors.length > 0) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      
      for (const { schedule, reason, daysDiff } of realSubcontractors) {
        const supplierName = schedule.supplier_name || "le sous-traitant";
        const supplierPhone = schedule.supplier_phone ? ` (${schedule.supplier_phone})` : "";
        
        let message: string;
        if (reason === "delay") {
          message = `⚠️ URGENT: Contacter ${supplierName}${supplierPhone} pour "${schedule.step_name}" - L'échéancier a pris du retard (${daysDiff} jour(s)). Date prévue: ${format(parseISO(schedule.start_date!), "d MMM yyyy", { locale: fr })}`;
        } else {
          message = `📅 Contacter ${supplierName}${supplierPhone} pour "${schedule.step_name}" - L'échéancier est en avance de ${daysDiff} jour(s). Possibilité d'avancer les travaux ?`;
        }

        // Vérifier si une alerte similaire existe déjà
        const { data: existingAlerts } = await supabase
          .from("schedule_alerts")
          .select("id")
          .eq("schedule_id", schedule.id)
          .eq("alert_type", "contact_subcontractor")
          .eq("is_dismissed", false);

        // Ne créer l'alerte que si elle n'existe pas déjà
        if (!existingAlerts || existingAlerts.length === 0) {
          await supabase.from("schedule_alerts").insert({
            project_id: projectId,
            schedule_id: schedule.id,
            alert_type: "contact_subcontractor",
            alert_date: todayStr,
            message,
            is_dismissed: false,
          });
        }
      }

      // Notifier l'utilisateur
      const urgentCount = realSubcontractors.filter(s => s.reason === "delay").length;
      const advanceCount = realSubcontractors.filter(s => s.reason === "advance").length;
      
      if (urgentCount > 0 || advanceCount > 0) {
        const parts: string[] = [];
        if (urgentCount > 0) parts.push(`${urgentCount} sous-traitant(s) à contacter (retard)`);
        if (advanceCount > 0) parts.push(`${advanceCount} sous-traitant(s) à contacter (avance)`);
        
        toast({
          title: "📞 Sous-traitants à contacter",
          description: parts.join(", ") + ". Consultez vos alertes.",
          duration: 10000,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
    }

    // Note: Les alertes de mesure sont maintenant gérées par useCompletedTasks
    // basées sur la complétion de tâches spécifiques (ex: "tirage-joints")
    // plutôt que sur le statut de l'étape complète

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
    focusUpdates?: Partial<ScheduleItem>,
    injectSchedule?: ScheduleItem
  ): Promise<void> => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      throw new Error(error.message);
    }

    let schedules = (data || []) as ScheduleItem[];
    if (injectSchedule && !schedules.some((s) => s.id === injectSchedule.id)) {
      schedules = [...schedules, injectSchedule];
    }

    await regenerateScheduleFromSchedules(schedules, focusScheduleId, focusUpdates);
  };

  /** Interrompre les travaux qui chevauchent, insérer la tâche, reprendre après (ex: Finitions 18-28, tâche 20-21 → Finitions 18-19, tâche 20-21, Finitions 22-30) */
  const interruptAndResumeAroundManualTask = async (
    newManualTask: ScheduleItem
  ): Promise<void> => {
    if (!projectId) return;

    const taskStart = newManualTask.start_date ? parseISO(newManualTask.start_date) : null;
    const taskEnd = newManualTask.end_date ? parseISO(newManualTask.end_date) : null;
    if (!taskStart || !taskEnd) return;

    const { data, error } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      throw new Error(error.message);
    }

    let allSchedules = (data || []) as ScheduleItem[];
    if (!allSchedules.some((s) => s.id === newManualTask.id)) {
      allSchedules = [...allSchedules, newManualTask];
    }

    const updates: Array<{ id: string; patch: Partial<ScheduleItem> }> = [];
    const continuations: Omit<ScheduleItem, "id" | "created_at" | "updated_at">[] = [];
    const continuedStepIds = new Set<string>(); // Éviter plusieurs continuations pour le même step_id

    for (const s of allSchedules) {
      if (s.id === newManualTask.id) continue;
      if (s.step_id?.startsWith("continuation-")) continue; // Ne pas créer de continuation d'une continuation
      if (isOverlayTask(s) || s.status === "completed") continue;
      if (!s.start_date || !s.end_date) continue;

      const stepStart = parseISO(s.start_date);
      const stepEnd = parseISO(s.end_date);

      // Chevauchement : la tâche démarre pendant l'étape (stepStart <= taskStart <= stepEnd)
      const overlaps = taskStart <= stepEnd && taskEnd >= stepStart;
      if (!overlaps) continue;

      const dayBeforeTask = subBusinessDays(taskStart, 1);
      const dayAfterTask = addBusinessDays(taskEnd, 1);

      const daysBeforeOverlap = dayBeforeTask >= stepStart
        ? differenceInBusinessDays(dayBeforeTask, stepStart) + 1
        : 0;
      const totalDuration = differenceInBusinessDays(stepEnd, stepStart) + 1;
      const remainingDays = Math.max(1, totalDuration - daysBeforeOverlap);

      const contStartStr = format(dayAfterTask, "yyyy-MM-dd");
      const contEndStr = format(addBusinessDays(dayAfterTask, remainingDays - 1), "yyyy-MM-dd");

      if (daysBeforeOverlap > 0) {
        const newEndStr = format(dayBeforeTask, "yyyy-MM-dd");
        updates.push({ id: s.id, patch: { end_date: newEndStr } });
        if (s.step_id && !continuedStepIds.has(s.step_id)) {
          continuedStepIds.add(s.step_id);
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = s;
          continuations.push({
            ...rest,
            project_id: projectId,
            step_id: `continuation-${s.step_id}-${Date.now()}`,
            step_name: `${s.step_name} (suite)`,
            start_date: contStartStr,
            end_date: contEndStr,
            estimated_days: remainingDays,
            measurement_after_step_id: newManualTask.step_id,
          } as Omit<ScheduleItem, "id" | "created_at" | "updated_at">);
        }
      } else {
        updates.push({ id: s.id, patch: { start_date: contStartStr, end_date: contEndStr } });
      }
    }

    for (const u of updates) {
      await supabase.from("project_schedules").update(u.patch).eq("id", u.id);
    }
    for (const c of continuations) {
      await supabase.from("project_schedules").insert([c as never]);
    }

    const truncatedIds = new Set(updates.map((u) => u.id));
    await shiftStepsAfterManualTask(newManualTask, truncatedIds);
  };

  /** Décaler les étapes après une nouvelle tâche manuelle (sauf celles déjà tronquées) */
  const shiftStepsAfterManualTask = async (
    newManualTask: ScheduleItem,
    skipScheduleIds: Set<string> = new Set()
  ): Promise<void> => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      throw new Error(error.message);
    }

    let allSchedules = (data || []) as ScheduleItem[];
    if (!allSchedules.some((s) => s.id === newManualTask.id)) {
      allSchedules = [...allSchedules, newManualTask];
    }

    const sorted = sortSchedulesByExecutionOrder(allSchedules);
    const taskIndex = sorted.findIndex((s) => s.id === newManualTask.id);
    if (taskIndex < 0) return;

    const taskEndDate = newManualTask.end_date || newManualTask.start_date;
    if (!taskEndDate) return;

    const updates: Array<{ id: string; patch: Partial<ScheduleItem> }> = [];
    const stepEndDates: Record<string, string> = {};

    for (let i = 0; i <= taskIndex; i++) {
      const s = sorted[i];
      if (s.end_date) stepEndDates[s.step_id] = s.end_date;
    }

    let cursor = addBusinessDays(parseISO(taskEndDate), 1);

    const delayConfig = minimumDelayAfterStep;
    for (let i = taskIndex + 1; i < sorted.length; i++) {
      const s = sorted[i];
      if (skipScheduleIds.has(s.id)) continue;
      if (isOverlayTask(s) || s.status === "completed") continue;

      if (s.is_manual_date && s.start_date && s.end_date) {
        stepEndDates[s.step_id] = s.end_date;
        if (!parallelSteps.has(s.step_id)) {
          cursor = addBusinessDays(parseISO(s.end_date), 1);
        }
        continue;
      }

      const duration = (s.actual_days ?? s.estimated_days ?? 1) || 1;
      const config = delayConfig[s.step_id];
      let newStart = cursor;
      if (config && stepEndDates[config.afterStep]) {
        const required = addDays(parseISO(stepEndDates[config.afterStep]), config.days);
        if (required > newStart) newStart = required;
      }

      const newStartStr = format(newStart, "yyyy-MM-dd");
      const newEndStr = format(addBusinessDays(newStart, duration - 1), "yyyy-MM-dd");
      stepEndDates[s.step_id] = newEndStr;
      if (!parallelSteps.has(s.step_id)) {
        cursor = addBusinessDays(parseISO(newEndStr), 1);
      }
      updates.push({ id: s.id, patch: { start_date: newStartStr, end_date: newEndStr } });
    }

    if (updates.length > 0) {
      const results = await Promise.all(
        updates.map((u) => supabase.from("project_schedules").update(u.patch).eq("id", u.id))
      );
      const err = results.find((r) => r.error);
      if (err?.error) {
        toast({ title: "Erreur", description: err.error.message, variant: "destructive" });
        throw new Error(err.error.message);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });
    queryClient.invalidateQueries({ queryKey: ["schedule-alerts", projectId] });
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
    // Map: date -> { trade, scheduleId, isManualDate }[]
    const dateTradeMap: Record<string, Array<{ trade: string; scheduleId: string; isManualDate: boolean }>> = {};

    // Trades à ignorer pour les conflits (administratifs/préparation)
    const ignoredTrades = ["autre", "inspecteur"];

    for (const schedule of schedules) {
      // Ignorer les étapes terminées - elles ne créent plus de conflits
      if (schedule.status === "completed") continue;
      if (!schedule.start_date || !schedule.end_date) continue;
      // Ignorer les trades administratifs
      if (ignoredTrades.includes(schedule.trade_type)) continue;
      // Ignorer les tâches "travaux en simultané" - elles peuvent chevaucher volontairement
      if (isOverlayTask(schedule)) continue;

      const start = parseISO(schedule.start_date);
      const end = parseISO(schedule.end_date);
      const days = differenceInBusinessDays(end, start) + 1;

      for (let i = 0; i < days; i++) {
        const currentDate = addBusinessDays(start, i);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        if (!dateTradeMap[dateStr]) {
          dateTradeMap[dateStr] = [];
        }
        dateTradeMap[dateStr].push({
          trade: schedule.trade_type,
          scheduleId: schedule.id,
          isManualDate: schedule.is_manual_date,
        });
      }
    }

    for (const [date, entries] of Object.entries(dateTradeMap)) {
      // Récupérer les trades uniques pour cette date
      const uniqueTrades = [...new Set(entries.map(e => e.trade))];
      
      if (uniqueTrades.length > 1) {
        // Vérifier si AU MOINS UNE des étapes a une date verrouillée manuellement
        const hasManualDate = entries.some(e => e.isManualDate);
        
        // N'afficher le conflit que si l'utilisateur a verrouillé au moins une date
        if (!hasManualDate) continue;
        
        // Vérifier si tous les métiers peuvent travailler en parallèle
        let hasRealConflict = false;
        for (let i = 0; i < uniqueTrades.length; i++) {
          for (let j = i + 1; j < uniqueTrades.length; j++) {
            if (!canWorkInParallel(uniqueTrades[i], uniqueTrades[j])) {
              hasRealConflict = true;
              break;
            }
          }
          if (hasRealConflict) break;
        }
        
        if (hasRealConflict) {
          conflicts.push({ date, trades: uniqueTrades });
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
      planification: "planification",
      financement: "financement",
      "plans-permis": "plans-permis",
      soumissions: "soumissions",
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
      planification: "planification",
      financement: "financement",
      "plans-permis": "plans-permis",
      soumissions: "soumissions",
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
      "is_manual_date",
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

    // If user locks the date, hide supplier_call alerts for that step.
    if (safeUpdates.is_manual_date === true) {
      await dismissSupplierCallAlertsForSchedule(scheduleId);
    }

    // If user unlocks the date, regenerate supplier_call alerts for that step.
    if (safeUpdates.is_manual_date === false && schedule.is_manual_date === true) {
      // Remove this schedule from the auto-dismissed set so it can be processed again
      autoDismissedSupplierAlertsRef.current.delete(scheduleId);
      // Regenerate alerts from soumissions data
      await syncAlertsFromSoumissions();
    }

    return result;
  };

  type ManualTaskInput = {
    description: string;
    start_date: string;
    estimated_days: number;
    linked_step_id: string | null;
    is_overlay: boolean;
    trade_type: string;
    trade_color?: string;
  };

  const createManualTask = async (task: ManualTaskInput): Promise<void> => {
    if (!projectId) return;

    const endDate = calculateEndDate(task.start_date, task.estimated_days);
    const tradeColor = task.trade_color ?? getTradeColor(task.trade_type);
    const notes = JSON.stringify({
      isOverlay: task.is_overlay,
      linkedStepId: task.linked_step_id || undefined,
    });

    // Sans "travaux en simultané": is_manual_date=false pour que la régénération place la tâche
    // dans la séquence (après le cursor) et modifie l'échéancier. Avec "simultané": is_manual_date=true
    // pour garder les dates choisies et ne pas déplacer les autres étapes.
    const schedule: Omit<ScheduleItem, "id" | "created_at" | "updated_at"> = {
      project_id: projectId,
      step_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      step_name: task.description.trim(),
      trade_type: task.trade_type,
      trade_color: tradeColor,
      estimated_days: task.estimated_days,
      actual_days: null,
      start_date: task.start_date,
      end_date: endDate,
      supplier_name: null,
      supplier_phone: null,
      supplier_schedule_lead_days: 0,
      fabrication_lead_days: 0,
      fabrication_start_date: null,
      measurement_required: false,
      measurement_after_step_id: task.linked_step_id,
      measurement_notes: null,
      status: "scheduled",
      notes,
      is_manual_date: task.is_overlay, // true = simultané (garder dates), false = intégré (recalculer)
    };

    const { data: newSchedule, error } = await supabase
      .from("project_schedules")
      .insert([schedule as any])
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      throw new Error(error.message);
    }

    queryClient.invalidateQueries({ queryKey: ["project-schedules", projectId] });

    if (task.is_overlay) {
      // Alerte pour rappeler de vérifier avec les sous-traitants
      await createAlertMutation.mutateAsync({
        project_id: projectId,
        schedule_id: (newSchedule as ScheduleItem).id,
        alert_type: "simultaneous_work",
        alert_date: format(new Date(), "yyyy-MM-dd"),
        message: "⚠️ Travaux en simultané : Vérifiez avec vos sous-traitants que les chevauchements d'horaires conviennent à tous.",
        is_dismissed: false,
      });
      toast({ title: "Tâche ajoutée (travaux en simultané)", description: "Une alerte vous rappelle de vérifier avec vos sous-traitants." });
    } else {
      // Sans "simultané" : interrompre les travaux en cours, insérer la tâche, reprendre après
      const newItem = newSchedule as ScheduleItem;
      await interruptAndResumeAroundManualTask(newItem);
      await queryClient.refetchQueries({ queryKey: ["project-schedules", projectId] });
      toast({ title: "Tâche ajoutée", description: "L'échéancier a été ajusté : travaux interrompus puis repris après la nouvelle tâche." });
    }
  };

  return {
    schedules: schedulesQuery.data || [],
    alerts: alertsQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    isLoadingAlerts: alertsQuery.isLoading,
    createSchedule: createScheduleMutation.mutate,
    createScheduleAsync: createScheduleMutation.mutateAsync,
    createManualTask,
    updateSchedule: updateScheduleMutation.mutate,
    updateScheduleAsync: updateScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutate,
    dismissAlert: dismissAlertMutation.mutate,
    generateAlerts,
    syncAlertsFromSoumissions,
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
