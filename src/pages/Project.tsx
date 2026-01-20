import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { useCompletedTasks } from "@/hooks/useCompletedTasks";
import { 
  ArrowLeft, Home, MapPin, Calendar, ChevronRight, AlertTriangle, X, 
  Camera, FileText, FolderOpen, Loader2, ImageIcon, Download, Trash2
} from "lucide-react";
import { toast } from "sonner";

const Project = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const stepFromUrl = searchParams.get("step");
  const tabFromUrl = searchParams.get("tab") || "etapes";
  
  const [selectedStepId, setSelectedStepId] = useState<string | null>(stepFromUrl);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [showPreviousStepsAlert, setShowPreviousStepsAlert] = useState(!!stepFromUrl);
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery({
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
    enabled: !!projectId && !!user,
  });

  // Fetch all project photos
  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ["all-project-photos", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  // Fetch all project documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  // Fetch project schedules
  const { schedules, completeStep, uncompleteStep } = useProjectSchedule(projectId || null);

  // Fetch completed tasks
  const { isTaskCompleted, toggleTask } = useCompletedTasks(projectId || null);

  // Create a map of step_id to schedule data
  const scheduleByStepId = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        start_date: string | null;
        end_date: string | null;
        status: string | null;
        estimated_days?: number;
        actual_days?: number | null;
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
          estimated_days: schedule.estimated_days,
          actual_days: schedule.actual_days,
          is_manual_date: schedule.is_manual_date,
        };
      });
    }
    return map;
  }, [schedules]);

  // Handle toggle complete for a step
  // IMPORTANT: si l'utilisateur marque une étape comme "Terminée", on devance automatiquement
  // l'échéancier en se basant sur une fin réelle = aujourd'hui.
  const handleToggleComplete = async (stepId: string, completed: boolean) => {
    const schedule = scheduleByStepId[stepId];
    if (!schedule?.id) return;

    if (completed) {
      await completeStep(schedule.id);
    } else {
      // Restaurer l'échéancier original en utilisant les durées estimées
      await uncompleteStep(schedule.id);
    }
  };

  // Handle toggle task for individual tasks
  const handleToggleTask = (stepId: string, taskId: string, isCompleted: boolean) => {
    toggleTask({ stepId, taskId, isCompleted });
  };

  // Update selected step when URL changes
  useEffect(() => {
    if (stepFromUrl && constructionSteps.find(s => s.id === stepFromUrl)) {
      setSelectedStepId(stepFromUrl);
      setShowPreviousStepsAlert(true);
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

  // Group photos by step
  const photosByStep = photos.reduce((acc, photo) => {
    const stepId = photo.step_id;
    if (!acc[stepId]) {
      acc[stepId] = [];
    }
    acc[stepId].push(photo);
    return acc;
  }, {} as Record<string, typeof photos>);

  // Document categories
  const documentCategories = [
    { id: "plan", label: "Plans", icon: FileText },
    { id: "devis", label: "Devis", icon: FileText },
    { id: "soumission", label: "Soumissions", icon: FileText },
    { id: "contrat", label: "Contrats", icon: FileText },
    { id: "permis", label: "Permis", icon: FileText },
    { id: "facture", label: "Factures", icon: FileText },
    { id: "other", label: "Autres", icon: FolderOpen },
  ];

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Projet non trouvé</h1>
            <Button onClick={() => navigate("/mes-projets")}>
              Retour à mes projets
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Step detail view
  if (selectedStep && activeTab === "etapes") {
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
              projectId={projectId}
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
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/mes-projets")}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Mes projets
            </Button>
            
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                  {project.project_type && (
                    <div className="flex items-center gap-1">
                      <Home className="h-4 w-4" />
                      <span>{project.project_type}</span>
                    </div>
                  )}
                  {project.square_footage && (
                    <span>{project.square_footage} pi²</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Créé le {new Date(project.created_at).toLocaleDateString('fr-CA')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
              <TabsTrigger value="etapes" className="gap-2">
                <ChevronRight className="h-4 w-4" />
                Étapes
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-2">
                <Camera className="h-4 w-4" />
                Photos ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                Documents ({documents.length})
              </TabsTrigger>
            </TabsList>

            {/* Steps Tab */}
            <TabsContent value="etapes" className="space-y-6">
              {/* Phase filters */}
              <div className="flex flex-wrap gap-2">
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
                      isManualDate={stepSchedule?.is_manual_date}
                      onToggleComplete={handleToggleComplete}
                    />
                  );
                })}
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-6">
              {photosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : photos.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-display text-lg font-medium mb-2">
                      Aucune photo
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ajoutez des photos de suivi dans chaque étape de construction
                    </p>
                    <Button onClick={() => setActiveTab("etapes")}>
                      Aller aux étapes
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {Object.entries(photosByStep).map(([stepId, stepPhotos]) => {
                    const step = constructionSteps.find(s => s.id === stepId);
                    return (
                      <Card key={stepId}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{step?.title || stepId}</span>
                            <Badge variant="secondary">{stepPhotos.length} photos</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {stepPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer"
                                onClick={() => window.open(photo.file_url, "_blank")}
                              >
                                <img
                                  src={photo.file_url}
                                  alt={photo.file_name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-white text-sm">Voir</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              {documentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : documents.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-display text-lg font-medium mb-2">
                      Aucun document
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ajoutez des documents (plans, devis, soumissions) dans les tâches de chaque étape
                    </p>
                    <Button onClick={() => setActiveTab("etapes")}>
                      Aller aux étapes
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {documentCategories.map((category) => {
                    const categoryDocs = documents.filter(d => d.category === category.id);
                    if (categoryDocs.length === 0) return null;
                    
                    const CategoryIcon = category.icon;
                    return (
                      <Card key={category.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CategoryIcon className="h-5 w-5" />
                            {category.label}
                            <Badge variant="secondary">{categoryDocs.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {categoryDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{doc.file_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''} • 
                                      {new Date(doc.created_at).toLocaleDateString('fr-CA')}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                >
                                  <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Project;
