import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { ArrowLeft, Home, MapPin, Calendar, ChevronRight, AlertTriangle, X, Camera, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { useCompletedTasks } from "@/hooks/useCompletedTasks";
const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const stepFromUrl = searchParams.get("step");
  const projectFromUrl = searchParams.get("project");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(stepFromUrl);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [showPreviousStepsAlert, setShowPreviousStepsAlert] = useState(!!stepFromUrl);

  // Fetch project schedules
  const { schedules, isLoading: isLoadingSchedules, updateSchedule } = useProjectSchedule(projectFromUrl);

  // Fetch completed tasks
  const { isTaskCompleted, toggleTask } = useCompletedTasks(projectFromUrl);

  // Handle toggle task for individual tasks
  const handleToggleTask = (stepId: string, taskId: string, isCompleted: boolean) => {
    toggleTask({ stepId, taskId, isCompleted });
  };

  // Create a map of step_id to schedule data
  const scheduleByStepId = useMemo(() => {
    const map: Record<string, { 
      id: string;
      start_date: string | null; 
      end_date: string | null;
      status: string | null;
    }> = {};
    if (schedules) {
      schedules.forEach(schedule => {
        map[schedule.step_id] = {
          id: schedule.id,
          start_date: schedule.start_date,
          end_date: schedule.end_date,
          status: schedule.status,
        };
      });
    }
    return map;
  }, [schedules]);

  // Handle toggle complete for a step
  const handleToggleComplete = async (stepId: string, completed: boolean) => {
    const schedule = scheduleByStepId[stepId];
    if (schedule?.id) {
      await updateSchedule({
        id: schedule.id,
        status: completed ? 'completed' : 'pending',
      });
    }
  };

  // Update selected step when URL changes
  useEffect(() => {
    if (stepFromUrl && constructionSteps.find(s => s.id === stepFromUrl)) {
      setSelectedStepId(stepFromUrl);
      setShowPreviousStepsAlert(true);
    }
  }, [stepFromUrl]);

  // Mock project data (would come from state/context after wizard)
  const projectData = {
    projectName: "Mon projet maison",
    projectType: "Maison neuve",
    municipality: "Sherbrooke",
    currentStage: "planification",
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
              projectId={projectFromUrl || undefined}
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
          {/* Project header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {projectData.projectName}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    <span>{projectData.projectType}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{projectData.municipality}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Démarré le 15 janvier 2025</span>
                  </div>
                </div>
              </div>
              
              {/* Quick access buttons */}
              {projectFromUrl && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <Link to={`/galerie?project=${projectFromUrl}`}>
                      <Camera className="h-4 w-4" />
                      Photos & Documents
                    </Link>
                  </Button>
                </div>
              )}
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
                  isCompleted={stepSchedule?.status === 'completed'}
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
