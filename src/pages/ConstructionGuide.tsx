import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { constructionSteps, phases } from "@/data/constructionSteps";
import { StepCard } from "@/components/guide/StepCard";
import { StepDetail } from "@/components/guide/StepDetail";
import { ScheduleDatesBanner } from "@/components/guide/ScheduleDatesBanner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, RotateCcw, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";

const ConstructionGuide = () => {
  const [searchParams] = useSearchParams();
  const stepFromUrl = searchParams.get("step");
  const projectId = searchParams.get("project");
  
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [showPlanificationAlert, setShowPlanificationAlert] = useState(false);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  // Check for planification alerts from localStorage
  useEffect(() => {
    if (projectId) {
      const planificationAlert = localStorage.getItem(`project_${projectId}_planification_alert`);
      const storedWarning = localStorage.getItem(`project_${projectId}_date_warning`);
      
      if (planificationAlert === "true") {
        setShowPlanificationAlert(true);
        // Clear the flag after showing
        localStorage.removeItem(`project_${projectId}_planification_alert`);
      }
      
      if (storedWarning) {
        setDateWarning(storedWarning);
        localStorage.removeItem(`project_${projectId}_date_warning`);
      }
    }
  }, [projectId]);

  // Fetch project data for type filtering
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Hook pour recalculer l'échéancier
  const { regenerateSchedule, isUpdating } = useProjectSchedule(projectId);

  // Set initial step from URL if provided
  useEffect(() => {
    if (stepFromUrl) {
      const step = constructionSteps.find(s => s.id === stepFromUrl);
      if (step) {
        setSelectedStepId(stepFromUrl);
      }
    }
  }, [stepFromUrl]);

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

            {/* Schedule dates banner */}
            <ScheduleDatesBanner currentStepId={selectedStepId} />

            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>Étape {currentStepIndex} de {totalSteps}</span>
              </div>
              <Progress value={(currentStepIndex / totalSteps) * 100} className="h-2" />
            </div>

            <StepDetail 
              step={selectedStep}
              projectId={projectId || undefined}
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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Guide de construction
              </h1>
              <p className="text-muted-foreground mt-1">
                Suivez ces étapes pour mener à bien votre projet d'autoconstruction.
              </p>
            </div>
            {projectId && (
              <Button
                variant="outline"
                onClick={async () => {
                  await regenerateSchedule();
                }}
                disabled={isUpdating}
                className="gap-2"
              >
                <RotateCcw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
                Recalculer
              </Button>
            )}
          </div>

          {/* Planification uncertainty alert */}
          {(showPlanificationAlert || dateWarning) && (
            <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-400">
                Échéancier préliminaire
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {dateWarning ? (
                  <span>{dateWarning}</span>
                ) : (
                  <span>
                    Votre date de début de travaux est basée sur une estimation préliminaire. 
                    Elle pourrait varier selon l'avancement de votre planification, l'obtention des permis 
                    et la disponibilité des entrepreneurs. Complétez les étapes de préparation pour affiner cette date.
                  </span>
                )}
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 text-amber-600 hover:text-amber-800"
                onClick={() => {
                  setShowPlanificationAlert(false);
                  setDateWarning(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Schedule dates banner */}
          <ScheduleDatesBanner currentStepId={null} />

          {/* Phase filters */}
          <div className="flex flex-wrap gap-2 mb-8">
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
            {filteredSteps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                stepNumber={constructionSteps.findIndex(s => s.id === step.id) + 1}
                onClick={() => setSelectedStepId(step.id)}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConstructionGuide;
