import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Home, MapPin, HardHat, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ProjectStage = 
  | "planification" 
  | "permis" 
  | "fondation" 
  | "structure" 
  | "finition";

interface ProjectData {
  projectName: string;
  projectType: string;
  municipality: string;
  currentStage: ProjectStage | "";
}

const projectTypes = [
  { value: "maison-neuve", label: "Maison neuve", icon: Home },
  { value: "agrandissement", label: "Agrandissement", icon: Home },
  { value: "renovation-majeure", label: "Rénovation majeure", icon: HardHat },
  { value: "chalet", label: "Chalet", icon: Home },
];

const projectStages = [
  { value: "planification", label: "Planification", description: "Je réfléchis à mon projet" },
  { value: "permis", label: "Demande de permis", description: "Je prépare ou attends mes permis" },
  { value: "fondation", label: "Fondation", description: "Les travaux de fondation sont en cours" },
  { value: "structure", label: "Structure", description: "La charpente et l'enveloppe" },
  { value: "finition", label: "Finition", description: "Finitions intérieures et extérieures" },
];

const StartProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const totalSteps = 4;
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to top when step changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);
  
  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: "",
    projectType: "",
    municipality: "",
    currentStage: "",
  });

  const progress = (currentStep / totalSteps) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return projectData.projectName.trim().length > 0;
      case 2:
        return projectData.projectType !== "";
      case 3:
        return projectData.municipality.trim().length > 0;
      case 4:
        return projectData.currentStage !== "";
      default:
        return false;
    }
  };

  const saveProject = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour créer un projet");
      navigate("/auth");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectData.projectName,
          project_type: projectData.projectType,
          description: `Municipalité: ${projectData.municipality} | Étape: ${projectData.currentStage}`,
          status: projectData.currentStage === "finition" ? "en_cours" : projectData.currentStage,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Projet créé avec succès!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast.error("Erreur lors de la création du projet: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      saveProject();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                Comment voulez-vous nommer votre projet?
              </h2>
              <p className="text-muted-foreground">
                Un nom qui vous aidera à l'identifier facilement
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <Label htmlFor="projectName" className="sr-only">Nom du projet</Label>
              <Input
                id="projectName"
                placeholder="Ex: Maison famille Tremblay"
                value={projectData.projectName}
                onChange={(e) => setProjectData({ ...projectData, projectName: e.target.value })}
                className="text-lg py-6 text-center"
                autoFocus
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                Quel type de projet réalisez-vous?
              </h2>
              <p className="text-muted-foreground">
                Sélectionnez le type qui correspond le mieux
              </p>
            </div>
            <RadioGroup
              value={projectData.projectType}
              onValueChange={(value) => setProjectData({ ...projectData, projectType: value })}
              className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto"
            >
              {projectTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Label
                    key={type.value}
                    htmlFor={type.value}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      projectData.projectType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="sr-only" />
                    <div className={`p-2 rounded-lg ${
                      projectData.projectType === type.value ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{type.label}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                Où se situe votre projet?
              </h2>
              <p className="text-muted-foreground">
                La municipalité où sera construit votre projet
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="municipality"
                  placeholder="Ex: Sherbrooke, Québec"
                  value={projectData.municipality}
                  onChange={(e) => setProjectData({ ...projectData, municipality: e.target.value })}
                  className="text-lg py-6 pl-10"
                  autoFocus
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                Où en êtes-vous rendu avec votre projet?
              </h2>
              <p className="text-muted-foreground">
                Sélectionnez l'étape actuelle de votre projet
              </p>
            </div>
            <RadioGroup
              value={projectData.currentStage}
              onValueChange={(value) => setProjectData({ ...projectData, currentStage: value as ProjectStage })}
              className="space-y-3 max-w-xl mx-auto"
            >
              {projectStages.map((stage, index) => (
                <Label
                  key={stage.value}
                  htmlFor={stage.value}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    projectData.currentStage === stage.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={stage.value} id={stage.value} className="sr-only" />
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    projectData.currentStage === stage.value 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{stage.label}</div>
                    <div className="text-sm text-muted-foreground">{stage.description}</div>
                  </div>
                  {projectData.currentStage === stage.value && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </Label>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div ref={topRef} className="container max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Étape {currentStep} de {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step content */}
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  {currentStep === totalSteps ? "Créer mon projet" : "Continuer"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StartProject;
