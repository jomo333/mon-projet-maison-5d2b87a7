import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { constructionSteps, phases } from "@/data/constructionSteps";
import { StepCard } from "@/components/guide/StepCard";
import { StepDetail } from "@/components/guide/StepDetail";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Home, Calendar, ChevronRight, AlertTriangle, X, Camera, FileText, HelpCircle } from "lucide-react";
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
const Dashboard = () => {
  const { user } = useAuth();
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

  // Fetch project schedules
  const {
    schedules,
    isLoading: isLoadingSchedules,
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

  // Déterminer si une étape est complétée (optimiste ou réel)
  const isStepCompleted = (stepId: string): boolean => {
    // L'état optimiste a priorité
    if (stepId in optimisticCompletedSteps) {
      return optimisticCompletedSteps[stepId];
    }
    // Sinon, vérifier l'état réel
    const schedule = scheduleByStepId[stepId];
    return schedule?.status === "completed";
  };

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

  // Calculate progress based on completed steps
  const completedStepsCount = useMemo(() => {
    return Object.values(scheduleByStepId).filter(s => s.status === 'completed').length;
  }, [scheduleByStepId]);

  const scheduledStepsCount = Object.keys(scheduleByStepId).length;
  const overallProgress = scheduledStepsCount > 0 
    ? (completedStepsCount / scheduledStepsCount) * 100 
    : 0;

  // Find the next step to work on (first non-completed step)
  const nextStepId = useMemo(() => {
    for (const step of constructionSteps) {
      const schedule = scheduleByStepId[step.id];
      if (schedule && schedule.status !== 'completed') {
        return step.id;
      }
    }
    return constructionSteps[0]?.id || 'planification';
  }, [scheduleByStepId]);

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
              Retour aux étapes
            </Button>

            {/* Alert for suggested step */}
            {showPreviousStepsAlert && currentStepIndex > 1 && (
              <Alert className="mb-6 border-warning/50 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Rappel important</AlertTitle>
                <AlertDescription className="flex items-start justify-between gap-4">
                  <span>
                    Assurez-vous que toutes les étapes précédentes ont bien été complétées avant de commencer celle-ci. 
                    Vous êtes actuellement à l'étape {currentStepIndex} sur {totalSteps}.
                    {currentStepIndex > 1 && (
                      <Button 
                        variant="link" 
                        className="px-1 h-auto text-warning underline"
                        onClick={() => {
                          setSelectedStepId(null);
                          setShowPreviousStepsAlert(false);
                        }}
                      >
                        Voir toutes les étapes
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
                <span>Étape {currentStepIndex} de {totalSteps}</span>
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
      <main className="flex-1 py-8">
        <div className="container">
          {!projectFromUrl && user && userProjects.length === 0 && (
            <Alert className="mb-8">
              <FileText className="h-4 w-4" />
              <AlertTitle>Aucun projet sélectionné</AlertTitle>
              <AlertDescription>
                Créez un projet pour débloquer les notes et le suivi des étapes.
                <Button asChild variant="link" className="px-1 h-auto">
                  <Link to="/start">Créer un projet</Link>
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
                    <span>{projectDisplay.type || "Projet"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {projectDisplay.createdAt
                        ? `Créé le ${projectDisplay.createdAt.toLocaleDateString("fr-CA")}`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Quick access buttons */}
              <div className="flex gap-2 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Comment utiliser cette page
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Comment utiliser cette page</DialogTitle>
                      <DialogDescription>
                        Voici les fonctionnalités disponibles pour gérer vos étapes de construction.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2 py-4">
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">📋 Filtrer par phase</h3>
                        <p className="text-sm text-muted-foreground">
                          Utilisez les badges pour afficher uniquement les étapes d'une phase spécifique (pré-construction, gros œuvre, second œuvre, finitions).
                        </p>
                      </div>
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">📖 Consulter une étape</h3>
                        <p className="text-sm text-muted-foreground">
                          Cliquez sur une carte pour voir les tâches détaillées, conseils pratiques et documents requis pour chaque étape.
                        </p>
                      </div>
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">✅ Marquer comme terminé</h3>
                        <p className="text-sm text-muted-foreground">
                          Cochez les étapes complétées directement sur les cartes pour suivre votre progression globale et devancer votre échéancier.
                        </p>
                      </div>
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm text-primary">📷 Photos & Documents</h3>
                        <p className="text-sm text-muted-foreground">
                          Enregistrez vos photos de chantier et documents importants liés au projet pour un meilleur suivi.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {projectFromUrl && (
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <Link to={`/galerie?project=${projectFromUrl}`}>
                      <Camera className="h-4 w-4" />
                      Photos & Documents
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Progress overview */}
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Progression globale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={overallProgress} className="flex-1 h-3" />
                <span className="text-lg font-semibold">{Math.round(overallProgress)}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {completedStepsCount} étape{completedStepsCount > 1 ? 's' : ''} terminée{completedStepsCount > 1 ? 's' : ''} sur {scheduledStepsCount}
                {nextStep && (
                  <> • Prochaine: <span className="font-medium text-foreground">{nextStep.title}</span></>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Current step highlight */}
          {nextStep && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Votre prochaine étape</h2>
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
                      Continuer
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Toutes les étapes de construction</h2>
            <p className="text-muted-foreground">
              Suivez ce guide pour mener à bien votre projet d'autoconstruction.
            </p>
          </div>

          {/* Phase filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge 
              variant={activePhase === null ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => setActivePhase(null)}
            >
              Toutes les phases
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
