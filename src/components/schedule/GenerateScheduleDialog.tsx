import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { constructionSteps } from "@/data/constructionSteps";
import { toast } from "sonner";
import { generateProjectSchedule, calculateTotalProjectDuration } from "@/lib/scheduleGenerator";
import { supabase } from "@/integrations/supabase/client";
import { getStepsFromStartingPoint, preparationStepIds } from "@/lib/startingStepOptions";

interface GenerateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  createSchedule: (data: any) => Promise<any>;
  calculateEndDate: (startDate: string, days: number) => string;
  generateAlerts: (schedule: any) => Promise<void>;
  onSuccess?: () => void;
}

// Durées par défaut
const defaultDurations: Record<string, number> = {
  planification: 5,
  "plans-permis": 40,
  soumissions: 15,
  financement: 15,
  excavation: 5,
  fondation: 5,
  structure: 8,
  toiture: 2,
  "fenetres-portes": 2,
  isolation: 8,
  "plomberie-sous-dalle": 1,
  "dalle-sous-sol": 2,
  "murs-division": 3,
  "plomberie-roughin": 4,
  "electricite-roughin": 4,
  hvac: 7,
  exterieur: 18,
  gypse: 15,
  "revetements-sol": 7,
  "cuisine-sdb": 10,
  "finitions-int": 8,
  "electricite-finition": 3,
  "plomberie-finition": 3,
  "inspections-finales": 2,
};

export function GenerateScheduleDialog({
  open,
  onOpenChange,
  projectId,
  createSchedule,
  calculateEndDate,
  generateAlerts,
  onSuccess,
}: GenerateScheduleDialogProps) {
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  // Récupérer le projet pour obtenir starting_step_id
  const { data: project } = useQuery({
    queryKey: ["project-starting-step", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("starting_step_id")
        .eq("id", projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && open,
  });

  const startingStepId = project?.starting_step_id || "planification";
  const stepsToSchedule = getStepsFromStartingPoint(startingStepId);

  // Calculer les jours de préparation nécessaires (étapes de préparation à partir du point de départ)
  const preparationDays = useMemo(() => {
    return stepsToSchedule
      .filter(s => preparationStepIds.includes(s.id))
      .reduce((total, step) => total + (defaultDurations[step.id] || 5), 0);
  }, [stepsToSchedule]);

  // Calculer si la date visée est réalisable
  const dateAnalysis = useMemo(() => {
    if (!targetDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Si pas d'étapes de préparation, on peut commencer immédiatement
    if (preparationDays === 0) {
      return {
        prepEndDate: today,
        earliestWorkStart: today,
        isDatePossible: targetDate >= today,
        delayDays: 0,
      };
    }
    
    // Calculer la date de fin de préparation si on commence aujourd'hui
    let prepEndDate = today;
    let businessDaysAdded = 0;
    let currentDate = new Date(today);
    
    while (businessDaysAdded < preparationDays) {
      currentDate = addDays(currentDate, 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysAdded++;
      }
    }
    prepEndDate = currentDate;
    
    // Date la plus tôt possible pour le début des travaux
    const earliestWorkStart = addDays(prepEndDate, 1);
    
    // Vérifier si la date visée est réalisable
    const isDatePossible = targetDate >= earliestWorkStart;
    
    return {
      prepEndDate,
      earliestWorkStart,
      isDatePossible,
      delayDays: isDatePossible ? 0 : Math.ceil((earliestWorkStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }, [targetDate, preparationDays]);

  const handleGenerate = async () => {
    if (!targetDate) {
      toast.error("Veuillez sélectionner une date visée pour le début des travaux");
      return;
    }

    setIsGenerating(true);

    try {
      const targetDateStr = format(targetDate, "yyyy-MM-dd");
      const result = await generateProjectSchedule(projectId, targetDateStr, startingStepId);

      if (!result.success) {
        toast.error(result.error || "Erreur lors de la génération de l'échéancier");
        return;
      }

      if (result.warning) {
        toast.warning(result.warning, { duration: 8000 });
      } else {
        toast.success("Échéancier généré avec succès!");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Erreur lors de la génération de l'échéancier");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Générer l'échéancier
          </DialogTitle>
          <DialogDescription>
            La préparation (planification, financement, permis) commencera <strong>aujourd'hui</strong>.
            Choisissez la date visée pour le <strong>début des travaux</strong> (jour 1 de l'excavation).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Date visée pour le début des travaux
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !targetDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate
                      ? format(targetDate, "PPP", { locale: fr })
                      : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Alerte si la date est impossible */}
            {dateAnalysis && !dateAnalysis.isDatePossible && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Date impossible!</strong> La préparation nécessite {preparationDays} jours ouvrables.
                  La date la plus tôt pour débuter les travaux est le{" "}
                  <strong>{format(dateAnalysis.earliestWorkStart, "d MMMM yyyy", { locale: fr })}</strong>{" "}
                  (+{dateAnalysis.delayDays} jours).
                </AlertDescription>
              </Alert>
            )}

            {targetDate && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Résumé de l'échéancier :</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {preparationDays > 0 && (
                    <li>• Préparation: {preparationDays} jours ouvrables (commence aujourd'hui)</li>
                  )}
                  <li>• {stepsToSchedule.length} étapes seront créées</li>
                  <li>
                    • Durée totale:{" "}
                    {stepsToSchedule.reduce((sum, step) => sum + (defaultDurations[step.id] || 5), 0)}{" "}
                    jours ouvrables
                  </li>
                  {dateAnalysis?.isDatePossible && (
                    <li className="text-primary font-medium">
                      ✓ Date réalisable - travaux le {format(targetDate, "d MMM yyyy", { locale: fr })}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!targetDate || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Générer l'échéancier
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
