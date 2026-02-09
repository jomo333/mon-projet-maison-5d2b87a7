import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, Clock, ArrowRight, Calendar, 
  TrendingUp, ListTodo, AlertCircle
} from "lucide-react";
import { useConstructionSteps } from "@/hooks/useConstructionSteps";
import { useTranslation } from "react-i18next";

interface ScheduleData {
  step_id: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface ProjectOverviewTabProps {
  schedules: ScheduleData[];
  onNavigateToStep: (stepId: string) => void;
}

export const ProjectOverviewTab = ({ schedules, onNavigateToStep }: ProjectOverviewTabProps) => {
  const { t } = useTranslation();
  const constructionSteps = useConstructionSteps();
  // Calculate progress statistics
  const stats = useMemo(() => {
    const totalSteps = constructionSteps.length;
    const completedSteps = schedules.filter(s => s.status === 'completed').length;
    const inProgressSteps = schedules.filter(s => s.status === 'in_progress').length;
    const pendingSteps = totalSteps - completedSteps - inProgressSteps;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      totalSteps,
      completedSteps,
      inProgressSteps,
      pendingSteps,
      progressPercent,
    };
  }, [schedules]);

  // Find next step to work on
  const nextStep = useMemo(() => {
    // Get completed step IDs
    const completedStepIds = new Set(
      schedules.filter(s => s.status === 'completed').map(s => s.step_id)
    );

    // Find first step that is not completed
    for (const step of constructionSteps) {
      if (!completedStepIds.has(step.id)) {
        const schedule = schedules.find(s => s.step_id === step.id);
        return {
          ...step,
          startDate: schedule?.start_date,
          endDate: schedule?.end_date,
          status: schedule?.status,
        };
      }
    }
    return null;
  }, [schedules]);

  // Get upcoming steps (next 3 after the current one)
  const upcomingSteps = useMemo(() => {
    const completedStepIds = new Set(
      schedules.filter(s => s.status === 'completed').map(s => s.step_id)
    );

    const upcoming = constructionSteps
      .filter(step => !completedStepIds.has(step.id))
      .slice(1, 4); // Skip the first (next step) and take 3

    return upcoming.map(step => {
      const schedule = schedules.find(s => s.step_id === step.id);
      return {
        ...step,
        startDate: schedule?.start_date,
      };
    });
  }, [schedules]);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("projectOverview.globalProgress")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("projectOverview.projectProgress")}</span>
            <span className="font-semibold">{stats.progressPercent}%</span>
          </div>
          <Progress value={stats.progressPercent} className="h-3" />
          
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.completedSteps}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("projectOverview.completed")}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                <Clock className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.inProgressSteps}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("projectOverview.inProgress")}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <ListTodo className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.pendingSteps}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("projectOverview.upcoming")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Step */}
      {nextStep ? (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              {t("projectOverview.nextStep")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {t("projectOverview.stepNumber", { number: constructionSteps.findIndex(s => s.id === nextStep.id) + 1 })}
                  </Badge>
                  {nextStep.status === 'in_progress' && (
                    <Badge variant="secondary">{t("projectOverview.inProgress")}</Badge>
                  )}
                </div>
                <h3 className="text-lg font-semibold">{nextStep.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {nextStep.description}
                </p>
                {nextStep.startDate && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t("projectOverview.scheduledFor", { date: new Date(nextStep.startDate).toLocaleDateString(t("common.locale")) })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">
                {t("projectOverview.congratulations")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("projectOverview.allStepsCompleted")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Steps */}
      {upcomingSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("projectOverview.upcomingSteps")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSteps.map((step) => (
                <div 
                  key={step.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onNavigateToStep(step.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {constructionSteps.findIndex(s => s.id === step.id) + 1}
                    </div>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      {step.startDate && (
                        <p className="text-xs text-muted-foreground">
                          {t("projectOverview.scheduledFor", { date: new Date(step.startDate).toLocaleDateString(t("common.locale")) })}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick tip if no schedule */}
      {schedules.length === 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {t("projectOverview.noScheduleTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("projectOverview.noScheduleDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
