import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { getDateLocale } from "@/lib/i18n";
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
import { ArrowLeft, ArrowRight, Home, MapPin, HardHat, CheckCircle2, Loader2, Upload, FileImage, X, File as FileIcon, CalendarIcon, DollarSign, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { stageToGuideStep, shouldOfferPlanUpload } from "@/lib/projectStageMapping";
import { usePdfToImage } from "@/hooks/use-pdf-to-image";
import { generateProjectSchedule, calculateTotalProjectDuration } from "@/lib/scheduleGenerator";
import { ProjectSummary } from "@/components/start/ProjectSummary";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { startingStepOptions, isPreparationStep } from "@/lib/startingStepOptions";
import { UpgradeBanner } from "@/components/subscription/UpgradeBanner";

interface ProjectData {
  projectName: string;
  projectType: string;
  municipality: string;
  currentStage: string; // Now uses step_id from constructionSteps
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
  { value: "garage-detache", label: "Garage détaché", icon: Home },
  { value: "chalet", label: "Chalet", icon: Home },
];

// Utiliser les options de startingStepOptions pour les choix d'étapes
// Ces options utilisent les mêmes ID que constructionSteps

type NextAction = "budget" | "schedule" | "steps" | "";

const StartProject = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreateProject, canUpload, refetch: refetchLimits } = usePlanLimits();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedPlans, setUploadedPlans] = useState<UploadedPlan[]>([]);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<NextAction>("");
  const [limitError, setLimitError] = useState<string | null>(null);
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
  // Step 5 is now the date, step 6 is plan upload (if applicable), step 7 is next action choice
  const showPlanUploadStep = shouldOfferPlanUpload(projectData.currentStage);
  const totalSteps = showPlanUploadStep ? 7 : 5;

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
      case 7:
        // Summary step - always can proceed (buttons inside component)
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

    // Check storage limit before adding files
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    const storageCheck = canUpload(totalSize);
    if (!storageCheck.allowed) {
      setLimitError(storageCheck.message);
      toast.error(storageCheck.message);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

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
      toast.error(t("toasts.mustBeLoggedIn"));
      navigate("/auth");
      return null;
    }

    // Check project limit before creating
    const projectCheck = canCreateProject();
    if (!projectCheck.allowed) {
      setLimitError(projectCheck.message);
      toast.error(projectCheck.message);
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
          status: isPreparationStep(projectData.currentStage) ? projectData.currentStage : "en_cours",
          target_start_date: projectData.targetStartDate || null,
          starting_step_id: projectData.currentStage || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Refresh limits after creating project
      await refetchLimits();
      
      return data.id;
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast.error(t("toasts.projectCreateError") + ": " + error.message);
      return null;
    }
  };

  // État pour le chargement de l'analyse
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");

  const generateScheduleAndBudget = async (projectId: string, hasPlans: boolean) => {
    setIsAnalyzing(true);
    
    try {
      // 1. Générer l'échéancier
      if (projectData.targetStartDate) {
        setAnalysisProgress("Génération de l'échéancier...");
        const result = await generateProjectSchedule(
          projectId,
          projectData.targetStartDate,
          projectData.currentStage
        );
        
        if (result.success) {
          if (result.warning) {
            toast.warning(result.warning);
          }
        } else {
          console.error("Schedule generation error:", result.error);
        }
      }

      // 2. Générer un budget estimé basé sur le type de projet
      setAnalysisProgress("Estimation du budget...");
      
      // Vérifier si un budget existe déjà
      const { data: existingBudget } = await supabase
        .from("project_budgets")
        .select("id")
        .eq("project_id", projectId)
        .limit(1);

      if (!existingBudget || existingBudget.length === 0) {
        // Estimations de base par type de projet (fourchette basse/haute)
        const budgetEstimates: Record<string, { min: number; max: number; categories: Record<string, { min: number; max: number }> }> = {
          "maison-neuve": {
            min: 250000,
            max: 450000,
            categories: {
              "Terrain et préparation": { min: 15000, max: 35000 },
              "Fondation": { min: 25000, max: 45000 },
              "Structure et charpente": { min: 45000, max: 80000 },
              "Toiture": { min: 12000, max: 25000 },
              "Fenêtres et portes": { min: 15000, max: 35000 },
              "Électricité": { min: 12000, max: 22000 },
              "Plomberie": { min: 15000, max: 28000 },
              "HVAC": { min: 12000, max: 25000 },
              "Isolation": { min: 8000, max: 18000 },
              "Gypse et peinture": { min: 18000, max: 32000 },
              "Revêtements de sol": { min: 12000, max: 28000 },
              "Cuisine et SDB": { min: 25000, max: 55000 },
              "Finitions": { min: 15000, max: 30000 },
              "Extérieur": { min: 12000, max: 25000 },
            }
          },
          "agrandissement": {
            min: 80000,
            max: 180000,
            categories: {
              "Fondation": { min: 8000, max: 20000 },
              "Structure et charpente": { min: 15000, max: 35000 },
              "Toiture": { min: 5000, max: 15000 },
              "Fenêtres et portes": { min: 5000, max: 15000 },
              "Électricité": { min: 5000, max: 12000 },
              "Plomberie": { min: 5000, max: 15000 },
              "HVAC": { min: 5000, max: 12000 },
              "Isolation": { min: 3000, max: 8000 },
              "Gypse et peinture": { min: 6000, max: 15000 },
              "Revêtements de sol": { min: 5000, max: 15000 },
              "Finitions": { min: 8000, max: 18000 },
              "Extérieur": { min: 5000, max: 12000 },
            }
          },
          "renovation-majeure": {
            min: 100000,
            max: 250000,
            categories: {
              "Démolition et préparation": { min: 8000, max: 20000 },
              "Structure et charpente": { min: 15000, max: 40000 },
              "Fenêtres et portes": { min: 10000, max: 30000 },
              "Électricité": { min: 10000, max: 25000 },
              "Plomberie": { min: 12000, max: 30000 },
              "HVAC": { min: 10000, max: 25000 },
              "Isolation": { min: 8000, max: 20000 },
              "Gypse et peinture": { min: 12000, max: 28000 },
              "Revêtements de sol": { min: 10000, max: 25000 },
              "Cuisine et SDB": { min: 25000, max: 60000 },
              "Finitions": { min: 10000, max: 25000 },
            }
          },
          "chalet": {
            min: 150000,
            max: 350000,
            categories: {
              "Terrain et préparation": { min: 12000, max: 30000 },
              "Fondation": { min: 18000, max: 40000 },
              "Structure et charpente": { min: 35000, max: 70000 },
              "Toiture": { min: 10000, max: 22000 },
              "Fenêtres et portes": { min: 12000, max: 28000 },
              "Électricité": { min: 10000, max: 20000 },
              "Plomberie": { min: 12000, max: 25000 },
              "HVAC": { min: 10000, max: 22000 },
              "Isolation": { min: 8000, max: 18000 },
              "Gypse et peinture": { min: 12000, max: 25000 },
              "Revêtements de sol": { min: 10000, max: 22000 },
              "Cuisine et SDB": { min: 18000, max: 40000 },
              "Finitions": { min: 10000, max: 22000 },
              "Extérieur": { min: 10000, max: 20000 },
            }
          },
          "garage-detache": {
            min: 35000,
            max: 80000,
            categories: {
              "Fondation": { min: 8000, max: 18000 },
              "Structure et charpente": { min: 12000, max: 25000 },
              "Toiture": { min: 5000, max: 12000 },
              "Portes de garage": { min: 3000, max: 8000 },
              "Électricité": { min: 2000, max: 6000 },
              "Revêtement extérieur": { min: 5000, max: 12000 },
            }
          },
        };

        const estimate = budgetEstimates[projectData.projectType] || budgetEstimates["maison-neuve"];
        
        const budgetInserts = Object.entries(estimate.categories).map(([name, range], index) => {
          const colors = ["#8B5CF6", "#6366F1", "#3B82F6", "#0EA5E9", "#14B8A6", "#EAB308", "#06B6D4", "#F97316", "#84CC16", "#A855F7", "#EC4899", "#F43F5E", "#10B981", "#22C55E"];
          // Stocker min et max dans la description pour affichage
          return {
            project_id: projectId,
            category_name: name,
            color: colors[index % colors.length],
            budget: Math.round((range.min + range.max) / 2), // Moyenne comme valeur par défaut
            spent: 0,
            description: JSON.stringify({ min: range.min, max: range.max }),
          };
        });

        await supabase.from("project_budgets").insert(budgetInserts);
      }

      setAnalysisProgress(t("startProject.analysisComplete"));
      toast.success(t("toasts.projectAnalyzed"));
      
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error(t("toasts.analysisError"));
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress("");
    }
  };

  const uploadPlansAndFinish = async () => {
    if (!createdProjectId) {
      setCurrentStep(7);
      return;
    }

    setIsSaving(true);

    try {
      // Upload plans if any
      if (uploadedPlans.length > 0) {
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
        toast.success(t("toasts.plansUploaded"));
      }

      // Générer échéancier et budget automatiquement
      await generateScheduleAndBudget(createdProjectId, uploadedPlans.length > 0);
      
      // Go to summary
      setCurrentStep(7);
    } catch (error: any) {
      console.error("Error uploading plans:", error);
      toast.error(t("toasts.uploadError"));
    } finally {
      setIsSaving(false);
    }
  };

  const finalizeAndRedirect = async (projectId: string | null, action?: NextAction) => {
    toast.success(t("toasts.projectCreated"));
    
    // Navigate based on selected action
    const selectedAction = action || nextAction;
    switch (selectedAction) {
      case "budget":
        navigate(`/budget?project=${projectId || ""}`);
        break;
      case "schedule":
        navigate(`/echeancier?project=${projectId || ""}`);
        break;
      case "steps":
      default:
        const guideStepId = stageToGuideStep[projectData.currentStage] || "planification";
        navigate(`/etapes?step=${guideStepId}&project=${projectId || ""}`);
        break;
    }
  };

  const handleNext = async () => {
    if (currentStep === 4) {
      // After selecting stage, go to date selection
      setCurrentStep(5);
    } else if (currentStep === 5) {
      // If planification stage, save project, generate schedule only, and redirect to steps page
      if (projectData.currentStage === "planification") {
        setIsSaving(true);
        setIsAnalyzing(true);
        setAnalysisProgress("Préparation de l'échéancier préliminaire...");
        
        const projectId = await saveProject();
        
        if (projectId) {
          // Generate schedule only (no budget) to evaluate date feasibility
          if (projectData.targetStartDate) {
            const result = await generateProjectSchedule(
              projectId,
              projectData.targetStartDate,
              projectData.currentStage
            );
            
            if (result.warning) {
              // Store warning in localStorage to display on steps page
              localStorage.setItem(`project_${projectId}_date_warning`, result.warning);
            }
          }
          
          // Mark that this is a new planification project with uncertain dates
          localStorage.setItem(`project_${projectId}_planification_alert`, "true");
          
          toast.success(t("toasts.projectCreated"));
          const guideStepId = stageToGuideStep[projectData.currentStage] || "planification";
          navigate(`/etapes?step=${guideStepId}&project=${projectId}`);
        }
        
        setIsAnalyzing(false);
        setIsSaving(false);
        return;
      }
      
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
        // No plan upload needed, save project and generate analysis
        setIsSaving(true);
        const projectId = await saveProject();
        
        if (projectId) {
          setCreatedProjectId(projectId);
          await generateScheduleAndBudget(projectId, false);
          setCurrentStep(7);
        }
        setIsSaving(false);
      }
    } else if (currentStep === 6) {
      // Upload plans and generate analysis
      await uploadPlansAndFinish();
    } else if (currentStep === 7) {
      // Finalize based on selected action
      await finalizeAndRedirect(createdProjectId);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipPlans = async () => {
    if (!createdProjectId) {
      setCurrentStep(7);
      return;
    }
    
    setIsSaving(true);
    // Générer échéancier et budget même sans plans
    await generateScheduleAndBudget(createdProjectId, false);
    setIsSaving(false);
    setCurrentStep(7);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                {t("startProject.projectName")}
              </h2>
              <p className="text-muted-foreground">
                {t("startProject.projectNameHelp")}
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <Label htmlFor="projectName" className="sr-only">{t("projects.projectName")}</Label>
              <Input
                id="projectName"
                placeholder={t("startProject.projectNamePlaceholder")}
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
                {t("startProject.projectType")}
              </h2>
              <p className="text-muted-foreground">
                {t("startProject.projectTypeHelp")}
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
                {t("startProject.municipality")}
              </h2>
              <p className="text-muted-foreground">
                {t("startProject.municipalityHelp")}
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="municipality"
                  placeholder={t("startProject.municipalityPlaceholder")}
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
                {t("startProject.currentStage")}
              </h2>
              <p className="text-muted-foreground">
                {t("startProject.currentStageHelp")}
              </p>
            </div>
            <RadioGroup
              value={projectData.currentStage}
              onValueChange={(value) => setProjectData({ ...projectData, currentStage: value })}
              className="space-y-3 max-w-xl mx-auto max-h-[50vh] overflow-y-auto pr-2"
            >
              {/* Pré-construction */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{t("startProject.phases.preConstruction")}</p>
                {startingStepOptions.filter(s => s.phase === "pre-construction").map((stage, index) => (
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
              </div>
              
              {/* Gros œuvre */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{t("startProject.phases.roughWork")}</p>
                {startingStepOptions.filter(s => s.phase === "gros-oeuvre").map((stage) => (
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
                      <HardHat className="h-4 w-4" />
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
              </div>
              
              {/* Second œuvre */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{t("startProject.phases.secondaryWork")}</p>
                {startingStepOptions.filter(s => s.phase === "second-oeuvre").map((stage) => (
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
                      <Footprints className="h-4 w-4" />
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
              </div>
              
              {/* Finitions */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{t("startProject.phases.finishing")}</p>
                {startingStepOptions.filter(s => s.phase === "finitions").map((stage) => (
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
                      ✓
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
              </div>
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">
                {t("startProject.targetDate")}
              </h2>
              <p className="text-muted-foreground">
                {t("startProject.targetDateHelp")}
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
                      ? format(parseISO(projectData.targetStartDate), "PPP", { locale: getDateLocale() })
                      : t("startProject.selectADate")}
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
                  {t("startProject.skipForNow")}
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
                {t("startProject.planUpload.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("startProject.planUpload.subtitle")}
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
                <p className="text-sm font-medium">{t("startProject.planUpload.uploadArea")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("startProject.planUpload.formats")}
                </p>
              </div>

              {isConverting && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("startProject.planUpload.converting")} {Math.round(pdfProgress)}%</span>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-primary font-medium">{analysisProgress || t("startProject.analyzing")}</span>
                </div>
              )}

              {/* Uploaded plans preview */}
              {uploadedPlans.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t("startProject.plansReady", { count: uploadedPlans.length })}</p>
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
                  {t("startProject.planUpload.skipPlans")}
                </Button>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <ProjectSummary
            projectId={createdProjectId || ""}
            projectName={projectData.projectName}
            targetStartDate={projectData.targetStartDate}
            currentStage={projectData.currentStage}
            hasPlans={uploadedPlans.length > 0}
          />
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
          {/* Progress - hide on step 7 */}
          {currentStep !== 7 && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>{t("common.step")} {currentStep} {t("common.of")} {totalSteps}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Step content */}
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation - hide on step 7 (summary has its own navigation) */}
          {currentStep !== 7 && (
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1 || isSaving}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isSaving || isConverting}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {currentStep === 6 ? t("common.upload") + "..." : t("startProject.creating")}
                  </>
                ) : (
                  <>
                    {currentStep === 6 
                      ? (uploadedPlans.length > 0 ? t("startProject.planUpload.continue") : t("common.next"))
                      : currentStep === 5 
                        ? (shouldOfferPlanUpload(projectData.currentStage) ? t("common.next") : t("startProject.projectCreated"))
                        : t("common.next")
                    }
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StartProject;
