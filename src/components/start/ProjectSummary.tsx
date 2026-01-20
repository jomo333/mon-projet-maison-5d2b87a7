import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInBusinessDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CalendarIcon, 
  DollarSign, 
  Footprints, 
  ChevronRight,
  Clock,
  Hammer,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectSummaryProps {
  projectId: string;
  projectName: string;
  targetStartDate: string;
  currentStage: string;
  hasPlans: boolean;
}

interface ScheduleSummary {
  totalSteps: number;
  completedSteps: number;
  startDate: string | null;
  endDate: string | null;
  totalDays: number;
  nextStep: string | null;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  categories: number;
  minBudget: number;
  maxBudget: number;
}

export const ProjectSummary = ({
  projectId,
  projectName,
  targetStartDate,
  currentStage,
  hasPlans,
}: ProjectSummaryProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleSummary, setScheduleSummary] = useState<ScheduleSummary | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);

  useEffect(() => {
    const fetchSummaries = async () => {
      setIsLoading(true);
      try {
        // Fetch schedule data
        const { data: schedules } = await supabase
          .from("project_schedules")
          .select("*")
          .eq("project_id", projectId)
          .order("start_date");

        if (schedules && schedules.length > 0) {
          const completed = schedules.filter(s => s.status === "completed").length;
          const pending = schedules.find(s => s.status !== "completed");
          const dates = schedules
            .filter(s => s.start_date && s.end_date)
            .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
          
          const startDate = dates[0]?.start_date || null;
          const endDate = dates.length > 0 
            ? dates.reduce((max, s) => s.end_date! > max ? s.end_date! : max, dates[0].end_date!)
            : null;

          let totalDays = 0;
          if (startDate && endDate) {
            totalDays = differenceInBusinessDays(parseISO(endDate), parseISO(startDate));
          }

          setScheduleSummary({
            totalSteps: schedules.length,
            completedSteps: completed,
            startDate,
            endDate,
            totalDays,
            nextStep: pending?.step_name || null,
          });
        }

        // Fetch budget data
        const { data: budgets } = await supabase
          .from("project_budgets")
          .select("*")
          .eq("project_id", projectId);

        if (budgets) {
          const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.budget) || 0), 0);
          const totalSpent = budgets.reduce((sum, b) => sum + (Number(b.spent) || 0), 0);
          
          // Calculer min et max à partir des descriptions (si disponibles)
          let minBudget = 0;
          let maxBudget = 0;
          let hasExplicitRange = false;
          
          budgets.forEach(b => {
            if (b.description) {
              try {
                const range = JSON.parse(b.description);
                if (range.min && range.max) {
                  minBudget += range.min;
                  maxBudget += range.max;
                  hasExplicitRange = true;
                }
              } catch {
                // Description n'est pas un JSON, ignorer
              }
            }
          });
          
          // Si pas de fourchette explicite, appliquer ±15% (budget basé sur peu d'info)
          if (!hasExplicitRange && totalBudget > 0) {
            minBudget = Math.round(totalBudget * 0.85);
            maxBudget = Math.round(totalBudget * 1.15);
          }
          
          setBudgetSummary({
            totalBudget,
            totalSpent,
            categories: budgets.length,
            minBudget,
            maxBudget,
          });
        }
      } catch (error) {
        console.error("Error fetching summaries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();
  }, [projectId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      planification: "Planification",
      permis: "Permis",
      fondation: "Fondation",
      structure: "Structure",
      finition: "Finition",
    };
    return labels[stage] || stage;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold">
          Projet « {projectName} » créé!
        </h2>
        <p className="text-muted-foreground">
          Voici un aperçu de votre projet. Cliquez sur une section pour plus de détails.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Schedule Summary Card */}
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all group"
          onClick={() => navigate(`/echeancier?project=${projectId}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Échéancier
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : scheduleSummary ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {scheduleSummary.totalSteps}
                  </span>
                  <span className="text-muted-foreground">étapes planifiées</span>
                </div>
                
                {scheduleSummary.startDate && scheduleSummary.endDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parseISO(scheduleSummary.startDate), "d MMM", { locale: fr })} → {format(parseISO(scheduleSummary.endDate), "d MMM yyyy", { locale: fr })}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      ~{scheduleSummary.totalDays}j
                    </Badge>
                  </div>
                )}

                {scheduleSummary.completedSteps > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progression</span>
                      <span>{scheduleSummary.completedSteps}/{scheduleSummary.totalSteps}</span>
                    </div>
                    <Progress 
                      value={(scheduleSummary.completedSteps / scheduleSummary.totalSteps) * 100} 
                      className="h-2" 
                    />
                  </div>
                )}

                {scheduleSummary.nextStep && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Prochaine étape</p>
                    <p className="text-sm font-medium truncate">{scheduleSummary.nextStep}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Échéancier en cours de génération...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Summary Card */}
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all group"
          onClick={() => navigate(`/budget?project=${projectId}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Budget
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : budgetSummary ? (
              <div className="space-y-3">
                {budgetSummary.minBudget > 0 && budgetSummary.maxBudget > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(budgetSummary.minBudget)}
                      </span>
                      <span className="text-muted-foreground">à</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(budgetSummary.maxBudget)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Estimation préliminaire basée sur le type de projet
                    </p>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/budget?project=${projectId}`);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Perfectionner l'analyse
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-600">
                        À définir
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Définissez votre budget dans la page dédiée
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Aucun budget défini</span>
                </div>
                {hasPlans && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/budget?project=${projectId}&analyze=true`);
                    }}
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Analyser avec l'IA
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-center text-muted-foreground">
          Actions rapides
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate(`/echeancier?project=${projectId}`)}
          >
            <CalendarIcon className="h-5 w-5" />
            <span className="text-xs">Voir l'échéancier</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate(`/budget?project=${projectId}`)}
          >
            <DollarSign className="h-5 w-5" />
            <span className="text-xs">Gérer le budget</span>
          </Button>
          
          <Button
            variant="default"
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => {
              const guideStepMapping: Record<string, string> = {
                planification: "planification",
                permis: "plans-permis",
                fondation: "excavation-fondation",
                structure: "structure",
                finition: "gypse",
              };
              const stepId = guideStepMapping[currentStage] || "planification";
              navigate(`/etapes?step=${stepId}&project=${projectId}`);
            }}
          >
            <Footprints className="h-5 w-5" />
            <span className="text-xs">Prochaines étapes</span>
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <Hammer className="h-4 w-4 inline mr-1" />
          Étape actuelle: <strong>{getStageLabel(currentStage)}</strong>
          {targetStartDate && (
            <>
              {" · "}Date visée: <strong>{format(parseISO(targetStartDate), "d MMMM yyyy", { locale: fr })}</strong>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
