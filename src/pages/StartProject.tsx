import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, Home, MapPin, HardHat, CheckCircle2, Loader2, Upload, FileImage, X, File as FileIcon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { stageToGuideStep, shouldOfferPlanUpload } from "@/lib/projectStageMapping";
import { usePdfToImage } from "@/hooks/use-pdf-to-image";
import { generateProjectSchedule, calculateTotalProjectDuration } from "@/lib/scheduleGenerator";

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
  targetStartDate: string;
}

interface UploadedPlan {
  file: File;
  previewUrl: string;
  isUploading: boolean;
  uploadedUrl?: string;
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
  const [uploadedPlans, setUploadedPlans] = useState<UploadedPlan[]>([]);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const { convertPdfToImages, isPdf, isConverting, progress: pdfProgress } = usePdfToImage();

  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: "",
    projectType: "",
    municipality: "",
    currentStage: "",
    targetStartDate: "",
  });

  // Calculate total steps based on whether plan upload is needed
  // Step 5 is now the date, step 6 is plan upload (if applicable)
  const showPlanUploadStep = shouldOfferPlanUpload(projectData.currentStage);
  const totalSteps = showPlanUploadStep ? 6 : 5;

  // Scroll to top when step changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

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
      case 5:
        // Target start date - always can proceed (optional but recommended)
        return true;
      case 6:
        // Plan upload step - can always proceed (plans are optional)
        return true;
      default:
        return false;
    }
  };

  const uploadPlanToStorage = async (file: File, projectId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const uniqueId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const fileName = `${uniqueId}.${fileExt}`;
      const filePath = `${user?.id}/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("plans")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("plans")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error uploading plan:", error);
      return null;
    }
  };

  const saveAttachmentToDb = async (
    projectId: string,
    fileName: string,
    fileUrl: string,
    fileType: string,
    fileSize: number
  ) => {
    const { error } = await supabase.from("task_attachments").insert({
      project_id: projectId,
      step_id: "plans-permis",
      task_id: "plans-architecture",
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileType,
      file_size: fileSize,
      category: "plan",
    });

    if (error) {
      console.error("Error saving attachment:", error);
      throw error;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPlans: UploadedPlan[] = [];

    for (const file of Array.from(files)) {
      const isValidType = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!isValidType) {
        toast.error(`${file.name} n'est pas un fichier valide (images ou PDF seulement)`);
        continue;
      }

      if (isPdf(file)) {
        // Convert PDF to images
        toast.info(`Conversion du PDF ${file.name}...`);
        try {
          const { images } = await convertPdfToImages(file, { scale: 2, maxPages: 10 });
          for (let i = 0; i < images.length; i++) {
            const imageBlob = images[i];
            const imageName = `${file.name.replace('.pdf', '')}_page_${i + 1}.png`;
            const imageFile = new File([imageBlob], imageName, { type: "image/png" });
            const previewUrl = URL.createObjectURL(imageBlob);
            newPlans.push({ file: imageFile, previewUrl, isUploading: false });
          }
          toast.success(`PDF converti en ${images.length} page(s)`);
        } catch (error) {
          toast.error(`Erreur lors de la conversion du PDF ${file.name}`);
        }
      } else {
        const previewUrl = URL.createObjectURL(file);
        newPlans.push({ file, previewUrl, isUploading: false });
      }
    }

    setUploadedPlans((prev) => [...prev, ...newPlans]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePlan = (index: number) => {
    setUploadedPlans((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const saveProject = async (): Promise<string | null> => {
    if (!user) {
      toast.error("Vous devez être connecté pour créer un projet");
      navigate("/auth");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectData.projectName,
          project_type: projectData.projectType,
          description: `Municipalité: ${projectData.municipality} | Étape: ${projectData.currentStage}`,
          status: projectData.currentStage === "finition" ? "en_cours" : projectData.currentStage,
          target_start_date: projectData.targetStartDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast.error("Erreur lors de la création du projet: " + error.message);
      return null;
    }
  };

  const uploadPlansAndFinish = async () => {
    if (!createdProjectId || uploadedPlans.length === 0) {
      finalizeAndRedirect(createdProjectId);
      return;
    }

    setIsSaving(true);

    try {
      for (let i = 0; i < uploadedPlans.length; i++) {
        const plan = uploadedPlans[i];
        setUploadedPlans((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, isUploading: true } : p))
        );

        const uploadedUrl = await uploadPlanToStorage(plan.file, createdProjectId);
        if (uploadedUrl) {
          await saveAttachmentToDb(
            createdProjectId,
            plan.file.name,
            uploadedUrl,
            plan.file.type,
            plan.file.size
          );
          setUploadedPlans((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, isUploading: false, uploadedUrl } : p
            )
          );
        }
      }

      toast.success("Plans téléversés avec succès!");
      await finalizeAndRedirect(createdProjectId);
    } catch (error: any) {
      console.error("Error uploading plans:", error);
      toast.error("Erreur lors du téléversement des plans");
    } finally {
      setIsSaving(false);
    }
  };

  const finalizeAndRedirect = async (projectId: string | null) => {
    if (projectId && projectData.targetStartDate) {
      // Générer l'échéancier automatiquement
      toast.info("Génération de l'échéancier...");
      const result = await generateProjectSchedule(
        projectId,
        projectData.targetStartDate,
        projectData.currentStage
      );
      
      if (result.success) {
        toast.success("Échéancier généré automatiquement!");
      } else {
        console.error("Schedule generation error:", result.error);
        // Ne pas bloquer la création du projet
      }
    }

    const guideStepId = stageToGuideStep[projectData.currentStage] || "planification";
    toast.success("Projet créé avec succès!");
    
    // Navigate to construction steps page with the selected step
    navigate(`/etapes?step=${guideStepId}&project=${projectId || ""}`);
  };

  const handleNext = async () => {
    if (currentStep === 4) {
      // After selecting stage, go to date selection
      setCurrentStep(5);
    } else if (currentStep === 5) {
      // After date selection, check if we need plan upload step
      if (shouldOfferPlanUpload(projectData.currentStage)) {
        // Save project first, then go to plan upload step
        setIsSaving(true);
        const projectId = await saveProject();
        setIsSaving(false);
        
        if (projectId) {
          setCreatedProjectId(projectId);
          setCurrentStep(6);
        }
      } else {
        // No plan upload needed, save and redirect
        setIsSaving(true);
        const projectId = await saveProject();
        
        if (projectId) {
          await finalizeAndRedirect(projectId);
        }
        setIsSaving(false);
      }
    } else if (currentStep === 6) {
      // Upload plans and finish
      await uploadPlansAndFinish();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipPlans = () => {
    finalizeAndRedirect(createdProjectId);
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

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                Quelle est votre date visée pour le début des travaux?
              </h2>
              <p className="text-muted-foreground">
                Cette date nous aidera à planifier votre échéancier et les étapes préparatoires
              </p>
            </div>
            <div className="max-w-md mx-auto space-y-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal py-6 text-lg",
                      !projectData.targetStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5" />
                    {projectData.targetStartDate
                      ? format(parseISO(projectData.targetStartDate), "PPP", { locale: fr })
                      : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={projectData.targetStartDate ? parseISO(projectData.targetStartDate) : undefined}
                    onSelect={(date) =>
                      setProjectData({
                        ...projectData,
                        targetStartDate: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {projectData.targetStartDate && (() => {
                const duration = calculateTotalProjectDuration(projectData.currentStage);
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">Échéancier automatique</p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        ~{duration.totalDays} jours ouvrables
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-2">
                      <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{duration.preparationDays}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">jours de préparation</p>
                        <p className="text-xs text-muted-foreground mt-1">avant le début des travaux</p>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-2xl font-bold text-primary">{duration.constructionDays}</p>
                        <p className="text-xs text-primary">jours de construction</p>
                        <p className="text-xs text-muted-foreground mt-1">à partir de la date visée</p>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded p-3 text-sm">
                      <p className="font-medium text-foreground mb-1">📅 Date visée = Jour 1 des travaux</p>
                      <p className="text-muted-foreground text-xs">
                        Les étapes de préparation (plans, permis, financement) seront planifiées <strong>avant</strong> cette date pour vous donner une vision claire des délais.
                      </p>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Planification et financement avant la date visée</li>
                      <li>Alertes pour les demandes de permis</li>
                      <li>Délais fournisseurs et fabrication calculés</li>
                    </ul>
                  </div>
                );
              })()}

              {!projectData.targetStartDate && (
                <p className="text-center text-sm text-muted-foreground">
                  Vous pourrez modifier cette date plus tard si nécessaire
                </p>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                Avez-vous déjà vos plans de construction?
              </h2>
              <p className="text-muted-foreground">
                Téléversez-les maintenant pour les utiliser dans l'analyse budgétaire IA
              </p>
            </div>

            {/* Upload area */}
            <div className="max-w-xl mx-auto space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Cliquez pour téléverser vos plans</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images ou PDF (max 10 pages par PDF)
                </p>
              </div>

              {isConverting && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Conversion du PDF... {Math.round(pdfProgress)}%</span>
                </div>
              )}

              {/* Uploaded plans preview */}
              {uploadedPlans.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{uploadedPlans.length} plan(s) prêt(s)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {uploadedPlans.map((plan, index) => (
                      <div
                        key={index}
                        className="relative group rounded-lg border overflow-hidden aspect-square"
                      >
                        {plan.file.type.startsWith("image/") ? (
                          <img
                            src={plan.previewUrl}
                            alt={plan.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {plan.isUploading && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        {plan.uploadedUrl && (
                          <div className="absolute top-1 left-1">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                        <button
                          onClick={() => removePlan(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-destructive-foreground" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-1 bg-background/80 truncate">
                          <span className="text-xs">{plan.file.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skip button */}
              <div className="text-center pt-4">
                <Button variant="ghost" onClick={handleSkipPlans} disabled={isSaving}>
                  Je n'ai pas encore de plans, passer cette étape
                </Button>
              </div>
            </div>
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
              disabled={currentStep === 1 || isSaving}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSaving || isConverting}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentStep === 6 ? "Téléversement..." : "Enregistrement..."}
                </>
              ) : (
                <>
                  {currentStep === 6 
                    ? (uploadedPlans.length > 0 ? "Téléverser et continuer" : "Continuer")
                    : currentStep === 5 
                      ? (shouldOfferPlanUpload(projectData.currentStage) ? "Continuer" : "Créer mon projet")
                      : "Continuer"
                  }
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
