import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { useConstructionSteps, usePhases, stepIds } from "@/hooks/useConstructionSteps";
import { StepCard } from "@/components/guide/StepCard";
import { StepDetail } from "@/components/guide/StepDetail";
import { MeasurementAlertModal } from "@/components/guide/MeasurementAlertModal";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Home, Calendar, ChevronRight, AlertTriangle, X, Camera, FileText, HelpCircle, Phone, Bell } from "lucide-react";
import { format, parseISO, isPast, isToday, isBefore, addDays } from "date-fns";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { useCompletedTasks } from "@/hooks/useCompletedTasks";
import { useAuth } from "@/hooks/useAuth";
import { PlanUsageCard } from "@/components/subscription/PlanUsageCard";
import { getDateLocale } from "@/lib/i18n";
import { translateAlertMessage } from "@/lib/alertMessagesI18n";

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const constructionSteps = useConstructionSteps();
  const phases = usePhases();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepFromUrl = searchParams.get("step");
  const projectFromUrl = searchParams.get("project");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(stepFromUrl);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [showPreviousStepsAlert, setShowPreviousStepsAlert] = useState(!!stepFromUrl);
  
  // État local pour les mises à jour optimistes
  const [optimisticCompletedSteps, setOptimisticCompletedSteps] = useState<Record<string, boolean>>({});

  // Fetch project data
  const { data: project } = useQuery({
    queryKey: ["project", projectFromUrl],
    queryFn: async () => {
      if (!projectFromUrl) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectFromUrl)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectFromUrl,
  });

  // Fetch user's projects so we can auto-select one when dashboard is opened without ?project=
  const { data: userProjects = [] } = useQuery({
    queryKey: ["user-projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_type, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // If we have projects but no project in URL, pick the most recent one.
  useEffect(() => {
    if (projectFromUrl) return;
    if (!userProjects.length) return;
    const next = new URLSearchParams(searchParams);
    next.set("project", userProjects[0].id);
    setSearchParams(next, { replace: true });
  }, [projectFromUrl, userProjects, searchParams, setSearchParams]);

  // Use the project from URL, or fallback to the first user project
  const effectiveProjectId = projectFromUrl || (userProjects.length > 0 ? userProjects[0].id : null);

  // Fetch project schedules and alerts
  const {
    schedules,
    isLoading: isLoadingSchedules,
    alerts,
    completeStep,
    completeStepByStepId,
    uncompleteStep,
  } = useProjectSchedule(effectiveProjectId);

  // Fetch completed tasks
  const { isTaskCompleted, toggleTask } = useCompletedTasks(effectiveProjectId);

  // Handle toggle task for individual tasks
  const handleToggleTask = (stepId: string, taskId: string, isCompleted: boolean) => {
    toggleTask({ stepId, taskId, isCompleted });
  };

  // Create a map of step_id to schedule data
  const scheduleByStepId = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        start_date: string | null;
        end_date: string | null;
        status: string | null;
        is_manual_date: boolean;
      }
    > = {};
    if (schedules) {
      schedules.forEach((schedule) => {
        map[schedule.step_id] = {
          id: schedule.id,
          start_date: schedule.start_date,
          end_date: schedule.end_date,
          status: schedule.status,
          is_manual_date: schedule.is_manual_date,
        };
      });
    }
    return map;
  }, [schedules]);

  // Handle toggle complete for a step
  // IMPORTANT: si l'utilisateur marque une étape comme "Terminée", on devance automatiquement
  // l'échéancier en se basant sur une fin réelle = aujourd'hui.
  // Si aucun schedule n'existe, on le crée automatiquement
  const handleToggleComplete = async (stepId: string, completed: boolean) => {
    const schedule = scheduleByStepId[stepId];
    
    // Mise à jour optimiste immédiate
    setOptimisticCompletedSteps(prev => ({ ...prev, [stepId]: completed }));
    
    try {
      if (completed) {
        if (schedule?.id) {
          // Schedule existe, utiliser completeStep
          await completeStep(schedule.id);
        } else {
          // Pas de schedule, utiliser completeStepByStepId pour créer et recalculer
          await completeStepByStepId(stepId);
        }
      } else {
        // Restaurer l'échéancier original en utilisant les durées estimées
        if (schedule?.id) {
          await uncompleteStep(schedule.id);
        }
      }
    } catch (error) {
      // En cas d'erreur, annuler la mise à jour optimiste
      setOptimisticCompletedSteps(prev => {
        const newState = { ...prev };
        delete newState[stepId];
        return newState;
      });
    }
  };

  // Synchroniser l'état optimiste avec les données réelles
  useEffect(() => {
    if (schedules.length > 0) {
      // Nettoyer l'état optimiste une fois les données réelles chargées
      setOptimisticCompletedSteps({});
    }
  }, [schedules]);

  // Determine the starting step index based on project's starting_step_id
  const startingIndex = useMemo(() => {
    const startingStepId = project?.starting_step_id;
    if (!startingStepId) return -1;
    return stepIds.indexOf(startingStepId as typeof stepIds[number]);
  }, [project?.starting_step_id]);

  // Déterminer si une étape est complétée (optimiste, réel, ou avant starting_step_id)
  const isStepCompleted = useCallback((stepId: string): boolean => {
    // L'état optimiste a priorité
    if (stepId in optimisticCompletedSteps) {
      return optimisticCompletedSteps[stepId];
    }
    // Vérifier l'état réel du schedule
    const schedule = scheduleByStepId[stepId];
    if (schedule?.status === "completed") {
      return true;
    }
    // Marquer comme complété si avant le starting_step_id
    if (startingIndex > 0) {
      const stepIndex = stepIds.indexOf(stepId as typeof stepIds[number]);
      if (stepIndex >= 0 && stepIndex < startingIndex) {
        return true;
      }
    }
    return false;
  }, [optimisticCompletedSteps, scheduleByStepId, startingIndex]);

  // Update selected step when URL changes
  useEffect(() => {
    if (stepFromUrl && constructionSteps.find(s => s.id === stepFromUrl)) {
      setSelectedStepId(stepFromUrl);
      setShowPreviousStepsAlert(true);
    }
  }, [stepFromUrl]);

  // Scroll to top when a step is selected
  useEffect(() => {
    if (selectedStepId) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedStepId]);

  const projectDisplay = {
    name: project?.name || userProjects[0]?.name || "Mon projet",
    type: project?.project_type || userProjects[0]?.project_type || "",
    createdAt: project?.created_at ? new Date(project.created_at) : null,
  };

  const selectedStep = selectedStepId 
    ? constructionSteps.find(s => s.id === selectedStepId) 
    : null;

  const filteredSteps = activePhase 
    ? constructionSteps.filter(s => s.phase === activePhase)
    : constructionSteps;

  const totalSteps = constructionSteps.length;
  const currentStepIndex = selectedStep 
    ? constructionSteps.findIndex(s => s.id === selectedStepId) + 1
    : 0;

  // Calculate progress based on completed steps (including steps before starting_step_id)
  const completedStepsCount = useMemo(() => {
    const completedFromSchedules = new Set(
      Object.entries(scheduleByStepId)
        .filter(([_, s]) => s.status === 'completed')
        .map(([stepId]) => stepId)
    );
    
    // Add steps before starting step
    let count = completedFromSchedules.size;
    if (startingIndex > 0) {
      for (let i = 0; i < startingIndex; i++) {
        if (!completedFromSchedules.has(stepIds[i])) {
          count++;
        }
      }
    }
    return count;
  }, [scheduleByStepId, startingIndex]);

  const scheduledStepsCount = constructionSteps.length;
  const overallProgress = scheduledStepsCount > 0 
    ? (completedStepsCount / scheduledStepsCount) * 100 
    : 0;

  // Find the next step to work on (first non-completed step, considering starting_step_id)
  const nextStepId = useMemo(() => {
    for (const step of constructionSteps) {
      if (!isStepCompleted(step.id)) {
        return step.id;
      }
    }
    return constructionSteps[0]?.id || 'planification';
  }, [constructionSteps, isStepCompleted]);

  const nextStep = constructionSteps.find(s => s.id === nextStepId);

  if (selectedStep) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-8">
          <div className="container max-w-4xl">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedStepId(null)}
              className="mb-6 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("dashboard.backToSteps")}
            </Button>

            {/* Alert for suggested step */}
            {showPreviousStepsAlert && currentStepIndex > 1 && (
              <Alert className="mb-6 border-warning/50 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">{t("dashboard.reminder")}</AlertTitle>
                <AlertDescription className="flex items-start justify-between gap-4">
                  <span>
                    {t("dashboard.reminderText")}{" "}
                    {t("dashboard.stepOf", { current: currentStepIndex, total: totalSteps })}.
                    {currentStepIndex > 1 && (
                      <Button 
                        variant="link" 
                        className="px-1 h-auto text-warning underline"
                        onClick={() => {
                          setSelectedStepId(null);
                          setShowPreviousStepsAlert(false);
                        }}
                      >
                        {t("dashboard.viewAllSteps")}
                      </Button>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setShowPreviousStepsAlert(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{t("dashboard.stepOf", { current: currentStepIndex, total: totalSteps })}</span>
              </div>
              <Progress value={(currentStepIndex / totalSteps) * 100} className="h-2" />
            </div>

            <StepDetail 
              step={selectedStep}
              projectId={effectiveProjectId || undefined}
              projectType={project?.project_type}
              onNext={() => {
                const nextIndex = constructionSteps.findIndex(s => s.id === selectedStepId) + 1;
                if (nextIndex < constructionSteps.length) {
                  setSelectedStepId(constructionSteps[nextIndex].id);
                }
              }}
              onPrevious={() => {
                const prevIndex = constructionSteps.findIndex(s => s.id === selectedStepId) - 1;
                if (prevIndex >= 0) {
                  setSelectedStepId(constructionSteps[prevIndex].id);
                }
              }}
              hasNext={currentStepIndex < totalSteps}
              hasPrevious={currentStepIndex > 1}
              isTaskCompleted={isTaskCompleted}
              onToggleTask={handleToggleTask}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Alert Modal - visible au centre de l'écran */}
      <MeasurementAlertModal alerts={alerts} projectId={effectiveProjectId || undefined} />
      
      <main className="flex-1 py-8">
        <div className="container">
          {!projectFromUrl && user && userProjects.length === 0 && (
            <Alert className="mb-8">
              <FileText className="h-4 w-4" />
              <AlertTitle>{t("dashboard.noProjectSelected")}</AlertTitle>
              <AlertDescription>
                {t("dashboard.createProjectToUnlock")}
                <Button asChild variant="link" className="px-1 h-auto">
                  <Link to="/start">{t("dashboard.createProject")}</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Project header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {projectDisplay.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    <span>{projectDisplay.type || t("common.project")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {projectDisplay.createdAt
                        ? `${t("common.createdOn")} ${projectDisplay.createdAt.toLocaleDateString(i18n.language === "en" ? "en-CA" : "fr-CA")}`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Quick access buttons */}
              <div className="flex gap-2 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                      <HelpCircle className="h-4 w-4" />
                      {t("dashboard.howToUse")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t("dashboard.howToUse")}</DialogTitle>
                      <DialogDescription>
                        {t("dashboard.howToUseDesc")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2 py-4">
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">📋 {t("dashboard.tips.filterPhase")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.tips.filterPhaseDesc")}
                        </p>
                      </div>
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">📖 {t("dashboard.tips.viewStep")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.tips.viewStepDesc")}
                        </p>
                      </div>
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">✅ {t("dashboard.tips.markComplete")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.tips.markCompleteDesc")}
                        </p>
                      </div>
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">📷 {t("dashboard.tips.photosDocuments")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.tips.photosDocumentsDesc")}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {projectFromUrl && (
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <Link to={`/galerie?project=${projectFromUrl}`}>
                      <Camera className="h-4 w-4" />
                      {t("dashboard.photosDocuments")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Plan Usage and Progress overview */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t("dashboard.globalProgress")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Progress value={overallProgress} className="flex-1 h-3" />
                  <span className="text-lg font-semibold">{Math.round(overallProgress)}%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {completedStepsCount} {t("dashboard.stepsCompleted")} {scheduledStepsCount}
                  {nextStep && (
                    <> • {t("dashboard.nextStep")}: <span className="font-medium text-foreground">{nextStep.title}</span></>
                  )}
                </p>
              </CardContent>
            </Card>
            <PlanUsageCard />
          </div>

          {/* Supplier Call Alerts Section */}
          {(() => {
            const dateLocale = getDateLocale();
            const supplierAlerts = alerts.filter(
              a => (a.alert_type === "supplier_call" || a.alert_type === "contact_subcontractor") && !a.is_dismissed
            );
            const urgentAlerts = supplierAlerts.filter(a => {
              const alertDate = parseISO(a.alert_date);
              return isPast(alertDate) || isToday(alertDate) || isBefore(alertDate, addDays(new Date(), 7));
            });
            
            if (urgentAlerts.length === 0) return null;
            
            // Create a map of schedule_id to schedule data for supplier info
            const scheduleById = new Map(schedules.map(s => [s.id, s]));
            
            return (
              <div className="mb-8">
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <div className="p-2 bg-amber-500/20 rounded-full">
                        <Phone className="h-5 w-5" />
                      </div>
                      {t("dashboard.supplierAlerts.title")}
                      <Badge variant="destructive" className="ml-auto">
                        {urgentAlerts.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {urgentAlerts.map((alert) => {
                        const alertDate = parseISO(alert.alert_date);
                        const isOverdue = isPast(alertDate) && !isToday(alertDate);
                        const isTodays = isToday(alertDate);
                        
                        // Get supplier info from the linked schedule
                        const schedule = scheduleById.get(alert.schedule_id);
                        const supplierName = schedule?.supplier_name;
                        const supplierPhone = schedule?.supplier_phone;
                        const hasSupplierInfo = supplierName || supplierPhone;
                        
                        return (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                              isOverdue 
                                ? "border-destructive bg-destructive/10 animate-pulse" 
                                : isTodays 
                                  ? "border-amber-500 bg-amber-500/10" 
                                  : "border-amber-500/30 bg-background"
                            }`}
                          >
                            <div className={`p-2 rounded-full shrink-0 ${isOverdue ? "bg-destructive/20" : "bg-amber-500/20"}`}>
                              <Bell className={`h-4 w-4 ${isOverdue ? "text-destructive" : "text-amber-600"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={isOverdue ? "destructive" : "default"} className="text-xs">
                                  {isOverdue 
                                    ? t("dashboard.supplierAlerts.overdue") 
                                    : isTodays 
                                      ? t("dashboard.supplierAlerts.today") 
                                      : t("dashboard.supplierAlerts.upcoming")}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(alertDate, "EEEE d MMMM", { locale: dateLocale })}
                                </span>
                              </div>
                              <p className="text-sm font-medium">
                                {translateAlertMessage(alert.message, i18n.language)}
                              </p>
                              {hasSupplierInfo && (
                                <div className="mt-2 p-2 bg-background/80 rounded border border-amber-500/20">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-3.5 w-3.5 text-amber-600" />
                                    <span className="font-medium text-amber-700 dark:text-amber-400">
                                      {supplierName || t("dashboard.supplierAlerts.noName")}
                                    </span>
                                    {supplierPhone && (
                                      <>
                                        <span className="text-muted-foreground">•</span>
                                        <a 
                                          href={`tel:${supplierPhone}`} 
                                          className="text-primary hover:underline font-medium"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {supplierPhone}
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t">
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <Link to={`/echeancier?project=${effectiveProjectId}`}>
                          <Calendar className="h-4 w-4" />
                          {t("dashboard.supplierAlerts.viewSchedule")}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
          {/* Current step highlight */}
          {nextStep && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">{t("dashboard.nextStep")}</h2>
              <Card 
                className="cursor-pointer border-primary/50 bg-primary/5 hover:shadow-lg transition-all"
                onClick={() => setSelectedStepId(nextStep.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className="mb-2">{phases.find(p => p.id === nextStep.phase)?.label}</Badge>
                      <h3 className="text-xl font-semibold">{nextStep.title}</h3>
                      <p className="text-muted-foreground mt-1">{nextStep.description}</p>
                    </div>
                    <Button className="gap-2">
                      {t("common.next")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold">{t("dashboard.allSteps")}</h2>
            <p className="text-muted-foreground">
              {t("dashboard.allStepsDesc")}
            </p>
          </div>

          {/* Phase filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge 
              variant={activePhase === null ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => setActivePhase(null)}
            >
              {t("dashboard.allPhases")}
            </Badge>
            {phases.map((phase) => (
              <Badge 
                key={phase.id}
                variant={activePhase === phase.id ? "default" : "outline"}
                className="cursor-pointer px-4 py-2"
                onClick={() => setActivePhase(phase.id)}
              >
                {phase.label}
              </Badge>
            ))}
          </div>

          {/* Steps grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSteps.map((step) => {
              const stepSchedule = scheduleByStepId[step.id];
              return (
                <StepCard
                  key={step.id}
                  step={step}
                  stepNumber={constructionSteps.findIndex(s => s.id === step.id) + 1}
                  onClick={() => setSelectedStepId(step.id)}
                  scheduleStartDate={stepSchedule?.start_date}
                  scheduleEndDate={stepSchedule?.end_date}
                  isCompleted={isStepCompleted(step.id)}
                  isManualDate={stepSchedule?.is_manual_date}
                  onToggleComplete={projectFromUrl ? handleToggleComplete : undefined}
                />
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
