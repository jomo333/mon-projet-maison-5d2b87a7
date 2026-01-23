import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sparkles, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Download,
  Car,
  Upload,
  X,
  Settings,
  Image,
  FileImage
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePdfToImage } from "@/hooks/use-pdf-to-image";
import { mapAnalysisToStepCategories } from "@/lib/budgetCategories";

interface BudgetCategory {
  name: string;
  budget: number;
  description: string;
  items: { name: string; cost: number; quantity: string; unit: string }[];
}

interface BudgetAnalysis {
  projectSummary: string;
  estimatedTotal: number;
  categories: BudgetCategory[];
  recommendations: string[];
  warnings: string[];
}

interface PlanAnalyzerProps {
  onBudgetGenerated: (categories: BudgetCategory[]) => void;
  projectId?: string | null;
  /** When true, auto-select the "Analyse de plan" tab on mount */
  autoSelectPlanTab?: boolean;
  /** When true, auto-select the "Configuration manuelle" tab on mount */
  autoSelectManualTab?: boolean;
  /** Callback when user wants to generate schedule after analysis */
  onGenerateSchedule?: () => void;
  /** Pre-filled requirements note from step 1 */
  besoinsNote?: string;
  /** Pre-filled project type */
  prefillProjectType?: string;
  /** Pre-filled number of floors */
  prefillFloors?: string;
  /** Pre-filled square footage */
  prefillSquareFootage?: string;
}

export function PlanAnalyzer({ 
  onBudgetGenerated, 
  projectId, 
  autoSelectPlanTab = false, 
  autoSelectManualTab = false,
  onGenerateSchedule, 
  besoinsNote,
  prefillProjectType,
  prefillFloors,
  prefillSquareFootage
}: PlanAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"manual" | "plan">(
    autoSelectManualTab ? "manual" : (autoSelectPlanTab ? "plan" : "manual")
  );
  
  // Manual mode state - use prefilled values if provided
  const [projectType, setProjectType] = useState(prefillProjectType || "maison-unifamiliale");
  const [squareFootage, setSquareFootage] = useState(prefillSquareFootage || "1500");
  const [numberOfFloors, setNumberOfFloors] = useState(prefillFloors || "1");
  const [hasGarage, setHasGarage] = useState(false);
  const [foundationSqft, setFoundationSqft] = useState("");
  const [floorSqftDetails, setFloorSqftDetails] = useState<string[]>([""]);
  
  // Additional notes from user (e.g., from besoins task)
  const [additionalNotes, setAdditionalNotes] = useState(besoinsNote || "");
  
  // Quality level state (shared between manual and plan modes)
  const [finishQuality, setFinishQuality] = useState<"economique" | "standard" | "haut-de-gamme">("standard");
  
  // Material/finish selections (details not shown on plans)
  const [exteriorSiding, setExteriorSiding] = useState("");
  const [roofingType, setRoofingType] = useState("");
  const [flooringType, setFlooringType] = useState("");
  const [cabinetType, setCabinetType] = useState("");
  const [countertopType, setCountertopType] = useState("");
  const [heatingType, setHeatingType] = useState("");
  const [windowType, setWindowType] = useState("");
  const [insulationType, setInsulationType] = useState("");
  
  // Manual mode reference images (to help the AI analysis)
  const [manualReferenceImages, setManualReferenceImages] = useState<string[]>([]);
  const [isUploadingManualImage, setIsUploadingManualImage] = useState(false);
  const manualImageInputRef = useRef<HTMLInputElement>(null);
  
  // Plan mode state - now supports multiple plans
  const [selectedPlanUrls, setSelectedPlanUrls] = useState<string[]>([]);
  // Used to avoid re-importing the same existing file (especially PDFs that we convert)
  const [importedPlanSourceUrls, setImportedPlanSourceUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const autoImportedForProjectRef = useRef<string | null>(null);
  
  // PDF conversion hook
  const { convertPdfToImages, isPdf, isConverting, progress } = usePdfToImage();

  // Always show the analysis result in the same ordered structure as "Détail par catégorie"
  // (includes all step-based postes like "Excavation" even if the AI didn't output them explicitly)
  const orderedAnalysisCategories = useMemo(() => {
    if (!analysis?.categories) return [];
    return mapAnalysisToStepCategories(
      analysis.categories.map((cat) => ({
        name: cat.name,
        budget: cat.budget,
        description: cat.description,
        items: cat.items || [],
      }))
    );
  }, [analysis]);
  
  // Update additionalNotes when besoinsNote prop changes
  useEffect(() => {
    if (besoinsNote && !additionalNotes) {
      setAdditionalNotes(besoinsNote);
    }
  }, [besoinsNote]);

  // Fetch style photos for the project (category "style")
  const { data: stylePhotos = [] } = useQuery({
    queryKey: ["style-photos", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("task_attachments")
        .select("id, file_url, file_name")
        .eq("project_id", projectId)
        .eq("step_id", "planification")
        .eq("task_id", "besoins")
        .eq("category", "style")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch uploaded plans/documents from project tasks AND project photos
  const { data: plans = [] } = useQuery({
    queryKey: ["project-plans", projectId],
    queryFn: async () => {
      if (!projectId) {
        // No project selected: fetch all plans with category "plan" (legacy behavior)
        const { data, error } = await supabase
          .from("task_attachments")
          .select("*")
          .eq("category", "plan")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }

      // Fetch ALL attachments for this project (any category – user may have selected "other")
      const { data: attachments, error: attachmentsError } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (attachmentsError) throw attachmentsError;

      // Also get plans from project_photos for the project
      const { data: projectPhotos, error: photosError } = await supabase
        .from("project_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      let photos: any[] = [];
      if (!photosError && projectPhotos) {
        photos = projectPhotos.map(photo => ({
          id: photo.id,
          file_name: photo.file_name,
          file_url: photo.file_url,
          file_type: photo.file_url?.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? "image/jpeg" : "application/pdf",
          file_size: photo.file_size,
          created_at: photo.created_at,
          category: "plan",
          step_id: photo.step_id,
        }));
      }

      // Merge and deduplicate by file_url
      const allPlans = [...(attachments || []), ...photos];
      const uniquePlans = allPlans.filter((plan, index, self) =>
        index === self.findIndex(p => p.file_url === plan.file_url)
      );

      console.log("[PlanAnalyzer] projectId", projectId, {
        attachments: attachments?.length ?? 0,
        photos: photos.length,
        unique: uniquePlans.length,
      });

      return uniquePlans;
    },
    enabled: true,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `budget-plans/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(fileName);

      const insertData: {
        step_id: string;
        task_id: string;
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: number;
        category: string;
        project_id?: string;
      } = {
        step_id: "budget",
        task_id: "plan-upload",
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: "plan",
      };

      // Include project_id if available
      if (projectId) {
        insertData.project_id = projectId;
      }

      const { error: dbError } = await supabase.from("task_attachments").insert(insertData);

      if (dbError) throw dbError;
      
      return urlData.publicUrl;
    },
    onSuccess: (publicUrl) => {
      queryClient.invalidateQueries({ queryKey: ["project-plans", projectId] });
      setSelectedPlanUrls(prev => [...prev, publicUrl]);
      toast.success("Plan téléversé avec succès!");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléversement du plan");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (plan: { id: string; file_url: string }) => {
      const path = plan.file_url.split("/task-attachments/")[1];
      
      if (path) {
        await supabase.storage.from("task-attachments").remove([path]);
      }

      const { error } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", plan.id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-plans", projectId] });
      setSelectedPlanUrls(prev => prev.filter(url => url !== variables.file_url));
      toast.success("Plan supprimé");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const isPdfUrl = (url: string) => /\.pdf(\?|#|$)/i.test(url);
  const isImageUrl = (url: string) => /\.(png|jpg|jpeg|gif|webp)(\?|#|$)/i.test(url);

  const addExistingPlanByUrl = async (fileUrl: string) => {
    if (!fileUrl || fileUrl === "none") return;
    if (importedPlanSourceUrls.includes(fileUrl)) return;

    const plan = plans.find((p) => p.file_url === fileUrl);
    const fileName = plan?.file_name || "plan";
    const fileType = (plan?.file_type || "").toLowerCase();

    const looksLikePdf = fileType.includes("pdf") || isPdfUrl(fileUrl);
    const looksLikeImage = fileType.startsWith("image/") || isImageUrl(fileUrl);

    // Images can be used as-is
    if (looksLikeImage) {
      if (!selectedPlanUrls.includes(fileUrl)) {
        setSelectedPlanUrls((prev) => [...prev, fileUrl]);
      }
      setImportedPlanSourceUrls((prev) => [...prev, fileUrl]);
      return;
    }

    // For PDFs already uploaded elsewhere: download -> convert -> upload images so the IA can use URLs
    if (looksLikePdf) {
      setIsUploading(true);
      try {
        toast.info("Conversion du PDF en images...");

        const marker = "/task-attachments/";
        const markerIndex = fileUrl.indexOf(marker);
        const storagePath = markerIndex >= 0 ? fileUrl.slice(markerIndex + marker.length).split("?")[0].split("#")[0] : null;

        // Prefer authenticated download via storage API (more reliable than fetch/CORS)
        let blob: Blob;
        if (storagePath) {
          const { data, error } = await supabase.storage.from("task-attachments").download(storagePath);
          if (error) throw error;
          blob = data;
        } else {
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error("Impossible de récupérer le PDF");
          blob = await res.blob();
        }

        const pdfFile = new File([blob], fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`, {
          type: blob.type || "application/pdf",
        });

        const { images, pageCount } = await convertPdfToImages(pdfFile, { scale: 2, maxPages: 20 });

        if (pageCount > 20) {
          toast.warning(`Le PDF contient ${pageCount} pages. Seules les 20 premières ont été converties.`);
        }

        for (let i = 0; i < images.length; i++) {
          const imageBlob = images[i];
          const imageName = `${pdfFile.name.replace(/\.pdf$/i, "")}_page_${i + 1}.png`;
          const imageFile = new File([imageBlob], imageName, { type: "image/png" });
          await uploadMutation.mutateAsync(imageFile);
        }

        setImportedPlanSourceUrls((prev) => [...prev, fileUrl]);
        toast.success(`PDF converti en ${images.length} image(s) et ajouté à la sélection.`);
      } catch (error) {
        console.error("PDF import error:", error);
        toast.error("Erreur lors de la conversion du PDF");
      } finally {
        setIsUploading(false);
      }

      return;
    }

    toast.error("Format non supporté (utilisez une image ou un PDF)");
  };

  // Auto-import: when user opens "Analyse de plan", preselect the most relevant file(s)
  // so the analysis isn't empty.
  useEffect(() => {
    if (analysisMode !== "plan") return;
    if (!projectId) return;
    if (selectedPlanUrls.length > 0) return;
    if (!plans || plans.length === 0) return;
    if (isUploading || isConverting) return;

    // Avoid repeating auto-import for the same project.
    if (autoImportedForProjectRef.current === projectId) return;
    autoImportedForProjectRef.current = projectId;

    const isPdfPlan = (p: any) => {
      const url = p?.file_url as string | undefined;
      const fileType = String(p?.file_type || "").toLowerCase();
      return fileType.includes("pdf") || (!!url && isPdfUrl(url));
    };

    const isImagePlan = (p: any) => {
      const url = p?.file_url as string | undefined;
      const fileType = String(p?.file_type || "").toLowerCase();
      return fileType.startsWith("image/") || (!!url && isImageUrl(url));
    };

    // Prefer a PDF if available (we'll convert it into images automatically)
    const pdf = plans.find(isPdfPlan);
    if (pdf?.file_url) {
      void addExistingPlanByUrl(pdf.file_url);
      return;
    }

    // Otherwise, preselect a handful of the latest images (often the PDF pages already converted)
    const imageUrls = plans
      .filter(isImagePlan)
      .map((p: any) => p?.file_url)
      .filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
      .slice(0, 10);

    if (imageUrls.length > 0) {
      setSelectedPlanUrls(imageUrls);
      setImportedPlanSourceUrls((prev) => [...prev, ...imageUrls]);
    }
  }, [
    analysisMode,
    projectId,
    plans,
    selectedPlanUrls.length,
    isUploading,
    isConverting,
  ]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Check if it's a PDF and needs conversion
        if (isPdf(file)) {
          toast.info("Conversion du PDF en images...");
          const { images, pageCount } = await convertPdfToImages(file, { scale: 2, maxPages: 20 });
          
          if (pageCount > 20) {
            toast.warning(`Le PDF contient ${pageCount} pages. Seules les 20 premières ont été converties.`);
          }
          
          // Upload each converted image
          for (let i = 0; i < images.length; i++) {
            const imageBlob = images[i];
            const imageName = `${file.name.replace('.pdf', '')}_page_${i + 1}.png`;
            const imageFile = new File([imageBlob], imageName, { type: "image/png" });
            await uploadMutation.mutateAsync(imageFile);
          }
          
          toast.success(`PDF converti en ${images.length} image(s) avec succès!`);
        } else {
          await uploadMutation.mutateAsync(file);
        }
      }
    } catch (error) {
      console.error("Upload/conversion error:", error);
      toast.error("Erreur lors du traitement du fichier");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAnalyze = async () => {
    if (analysisMode === "plan" && selectedPlanUrls.length === 0) {
      toast.error("Veuillez sélectionner ou téléverser au moins un plan");
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      // Get style photo URLs to include in analysis
      const stylePhotoUrls = stylePhotos.map((p: any) => p.file_url);
      
      // NOUVELLE LOGIQUE: Combiner TOUTES les données disponibles pour une analyse plus précise
      // Les plans sont la source principale, mais les données manuelles fournissent un contexte précieux
      const hasPlansSelected = selectedPlanUrls.length > 0;
      
      // Données manuelles enrichies (toujours incluses pour contexte)
      const manualData = {
        projectType: projectType === "maison-unifamiliale" ? "Maison unifamiliale" :
                     projectType === "jumelee" ? "Maison jumelée" :
                     projectType === "cottage" ? "Cottage" :
                     projectType === "bungalow" ? "Bungalow" :
                     projectType === "agrandissement" ? "Agrandissement" :
                     projectType === "garage" ? "Garage détaché" :
                     projectType === "garage-etage" ? "Garage avec étage aménagé" :
                     projectType === "renovation" ? "Rénovation majeure" : "Maison",
        squareFootage: parseInt(squareFootage) || null,
        numberOfFloors: parseInt(numberOfFloors) || null,
        hasGarage,
        foundationSqft: parseInt(foundationSqft) || null,
        floorSqftDetails: floorSqftDetails.filter(s => s).map(s => parseInt(s)),
        finishQuality,
        additionalNotes: additionalNotes || undefined,
        // Matériaux et finitions spécifiques (non visibles sur les plans)
        materialChoices: {
          exteriorSiding: exteriorSiding || undefined,
          roofingType: roofingType || undefined,
          flooringType: flooringType || undefined,
          cabinetType: cabinetType || undefined,
          countertopType: countertopType || undefined,
          heatingType: heatingType || undefined,
          windowType: windowType || undefined,
          insulationType: insulationType || undefined,
        },
      };
      
      const body = hasPlansSelected
        ? {
            // Mode plan ENRICHI: plans + données manuelles complémentaires
            mode: "plan",
            imageUrls: selectedPlanUrls,
            finishQuality,
            // NOUVEAU: Inclure les données manuelles comme contexte complémentaire
            // L'IA utilisera les plans comme source principale mais les données manuelles
            // aident à préciser le contexte (type de projet, notes spécifiques, etc.)
            manualContext: manualData,
            stylePhotoUrls: stylePhotoUrls.length > 0 ? stylePhotoUrls : undefined,
            referenceImageUrls: manualReferenceImages.length > 0 ? manualReferenceImages : undefined,
          }
        : {
            // Mode manuel pur: utiliser toutes les données entrées par l'utilisateur
            mode: "manual",
            ...manualData,
            stylePhotoUrls: stylePhotoUrls.length > 0 ? stylePhotoUrls : undefined,
            referenceImageUrls: manualReferenceImages.length > 0 ? manualReferenceImages : undefined,
          };

      const { data, error } = await supabase.functions.invoke('analyze-plan', {
        body,
      });

      if (error) throw error;

      if (data.success && data.data) {
        setAnalysis(data.data);
        toast.success("Analyse terminée avec succès!");
      } else {
        throw new Error(data.error || "Échec de l'analyse");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erreur lors de l'analyse du plan");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyBudget = () => {
    if (analysis?.categories) {
      onBudgetGenerated(analysis.categories);
      toast.success("Budget appliqué avec succès!");
      
      // Propose de générer l'échéancier si callback disponible
      if (onGenerateSchedule && projectId) {
        setTimeout(() => {
          onGenerateSchedule();
        }, 500);
      }
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="font-display">Analyse IA du projet</CardTitle>
        </div>
        <CardDescription>
          Choisissez votre méthode d'analyse pour générer un budget personnalisé
        </CardDescription>
        <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Note importante :</strong> Les estimations fournies par l'IA sont basées sur des coûts moyens du marché et servent à la planification. Elles aident à mieux estimer les coûts et à structurer le projet, mais ne remplacent pas les soumissions professionnelles, qui demeurent essentielles pour établir le coût réel de chaque étape des travaux.
            </span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection Tabs */}
        <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as "manual" | "plan")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuration manuelle
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <Image className="h-4 w-4" />
              Analyse de plan
            </TabsTrigger>
          </TabsList>
          
          {/* Manual Mode */}
          <TabsContent value="manual" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Entrez les détails de votre projet pour obtenir une estimation budgétaire basée sur les paramètres.
            </p>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de projet</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maison-unifamiliale">Maison unifamiliale</SelectItem>
                    <SelectItem value="bungalow">Bungalow</SelectItem>
                    <SelectItem value="cottage">Cottage (2 étages)</SelectItem>
                    <SelectItem value="jumelee">Maison jumelée</SelectItem>
                    <SelectItem value="agrandissement">Agrandissement</SelectItem>
                    <SelectItem value="garage">Garage détaché</SelectItem>
                    <SelectItem value="garage-etage">Garage avec étage aménagé</SelectItem>
                    <SelectItem value="renovation">Rénovation majeure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sqft">Superficie totale (pi²)</Label>
                <Input
                  id="sqft"
                  type="number"
                  value={squareFootage}
                  onChange={(e) => setSquareFootage(e.target.value)}
                  placeholder="1500"
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre d'étages</Label>
                <Select 
                  value={numberOfFloors} 
                  onValueChange={(v) => {
                    setNumberOfFloors(v);
                    const floors = parseInt(v) || 1;
                    setFloorSqftDetails(Array(floors).fill(""));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 étage (plain-pied)</SelectItem>
                    <SelectItem value="2">2 étages</SelectItem>
                    <SelectItem value="3">3 étages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foundation">Superficie fondation (pi²)</Label>
                <Input
                  id="foundation"
                  type="number"
                  value={foundationSqft}
                  onChange={(e) => setFoundationSqft(e.target.value)}
                  placeholder="Ex: 1200"
                />
              </div>

              {parseInt(numberOfFloors) > 1 && floorSqftDetails.map((_, index) => (
                <div key={index} className="space-y-2">
                  <Label>Superficie étage {index + 1} (pi²)</Label>
                  <Input
                    type="number"
                    value={floorSqftDetails[index]}
                    onChange={(e) => {
                      const newDetails = [...floorSqftDetails];
                      newDetails[index] = e.target.value;
                      setFloorSqftDetails(newDetails);
                    }}
                    placeholder={`Superficie étage ${index + 1}`}
                  />
                </div>
              ))}

              <div className="space-y-2">
                <Label>Garage</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Checkbox
                    id="garage"
                    checked={hasGarage}
                    onCheckedChange={(checked) => setHasGarage(checked === true)}
                  />
                  <label
                    htmlFor="garage"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Car className="h-4 w-4" />
                    Inclure un garage
                  </label>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>Qualité des finitions intérieures</Label>
                <Select value={finishQuality} onValueChange={(v) => setFinishQuality(v as "economique" | "standard" | "haut-de-gamme")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economique">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">🏷️ Économique</span>
                        <span className="text-xs text-muted-foreground">Matériaux de base, plancher flottant, armoires mélamine, comptoirs stratifiés</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="standard">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">⭐ Standard</span>
                        <span className="text-xs text-muted-foreground">Bois franc ingénierie, armoires semi-custom, comptoirs quartz</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="haut-de-gamme">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">💎 Haut de gamme</span>
                        <span className="text-xs text-muted-foreground">Bois franc massif, armoires sur mesure, comptoirs granite/marbre</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ce choix affecte les coûts des planchers, armoires, comptoirs, quincaillerie et finitions.
                </p>
              </div>
              
              {/* Notes additionnelles (pré-remplies depuis la tâche Besoins) */}
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="additionalNotes">Notes sur vos besoins (optionnel)</Label>
                <textarea
                  id="additionalNotes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Ex: Cuisine ouverte sur salon, 3 chambres dont 1 suite parentale, sous-sol fini avec salle de cinéma..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {besoinsNote && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Pré-rempli depuis vos besoins définis à l'étape 1
                  </p>
                )}
              </div>
              
              {/* Reference Images Upload for Manual Mode */}
              <div className="space-y-3 sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Images de référence (optionnel)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajoutez des photos ou croquis pour aider l'analyse (plans, inspiration, etc.)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploadingManualImage}
                    onClick={() => manualImageInputRef.current?.click()}
                  >
                    {isUploadingManualImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2">Ajouter</span>
                  </Button>
                  <input
                    ref={manualImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      
                      setIsUploadingManualImage(true);
                      try {
                        for (const file of Array.from(files)) {
                          const fileExt = file.name.split(".").pop();
                          const fileName = `manual-reference/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                          
                          const { error: uploadError } = await supabase.storage
                            .from("task-attachments")
                            .upload(fileName, file);
                          
                          if (uploadError) throw uploadError;
                          
                          const { data: urlData } = supabase.storage
                            .from("task-attachments")
                            .getPublicUrl(fileName);
                          
                          setManualReferenceImages(prev => [...prev, urlData.publicUrl]);
                        }
                        toast.success("Image(s) ajoutée(s) avec succès");
                      } catch (error) {
                        console.error("Upload error:", error);
                        toast.error("Erreur lors du téléchargement");
                      } finally {
                        setIsUploadingManualImage(false);
                        if (manualImageInputRef.current) {
                          manualImageInputRef.current.value = "";
                        }
                      }
                    }}
                  />
                </div>
                
                {/* Display uploaded reference images */}
                {manualReferenceImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {manualReferenceImages.map((url, index) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img
                          src={url}
                          alt={`Référence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setManualReferenceImages(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Supprimer l'image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {manualReferenceImages.length > 0 && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {manualReferenceImages.length} image(s) ajoutée(s) pour l'analyse
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Plan Analysis Mode */}
          <TabsContent value="plan" className="mt-4 space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-foreground">
                <strong>💡 Analyse enrichie</strong> : Téléversez vos plans ET ajoutez des informations complémentaires pour obtenir l'estimation la plus précise possible.
              </p>
            </div>
            
            {/* PDF Conversion Progress */}
            {isConverting && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <FileImage className="h-5 w-5 animate-pulse" />
                  <span className="font-medium">Conversion du PDF en cours...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress}% terminé</p>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Section 1: Plans */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">1</Badge>
                  <Label className="text-base font-semibold">Plans de construction</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Plans trouvés : <span className="font-medium">{plans.length}</span> — Ajoutez tous les plans (étages, élévations, coupes) pour une analyse complète.
                </p>

                {plans.length > 0 && selectedPlanUrls.length === 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const latest = plans[0]?.file_url;
                        if (latest) void addExistingPlanByUrl(latest);
                      }}
                      disabled={isUploading || isConverting}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Importer le dernier plan
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Select
                    value="none"
                    onValueChange={(v) => {
                      if (v !== "none") {
                        void addExistingPlanByUrl(v);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 min-w-[200px]">
                      <SelectValue placeholder="Ajouter un plan existant..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ajouter un plan existant...</SelectItem>
                      {plans
                        .filter((plan) => {
                          const url = plan.file_url;
                          if (!url) return false;

                          const fileType = (plan.file_type || "").toLowerCase();
                          const isImage =
                            fileType.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)(\?|#|$)/i.test(url);
                          const isPdf = fileType.includes("pdf") || /\.pdf(\?|#|$)/i.test(url);

                          return (
                            (isImage || isPdf) &&
                            !selectedPlanUrls.includes(url) &&
                            !importedPlanSourceUrls.includes(url)
                          );
                        })
                        .map((plan) => (
                          <SelectItem key={plan.id} value={plan.file_url}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {plan.file_name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    multiple
                  />

                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isConverting}
                    className="gap-2"
                  >
                    {isUploading || isConverting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isConverting ? "Conversion..." : "Téléverser"}
                  </Button>

                  {selectedPlanUrls.length > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setSelectedPlanUrls([])}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                      Effacer
                    </Button>
                  )}
                </div>

                {/* Selected plans list */}
                {selectedPlanUrls.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid gap-2 max-h-[150px] overflow-y-auto">
                      {selectedPlanUrls.map((url, index) => {
                        const plan = plans.find(p => p.file_url === url);
                        return (
                          <div 
                            key={url}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                                {index + 1}
                              </span>
                              <span className="text-sm truncate max-w-[180px]">
                                {plan?.file_name || `Plan ${index + 1}`}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setSelectedPlanUrls(prev => prev.filter(u => u !== url))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {selectedPlanUrls.length} plan(s) prêt(s) pour l'analyse
                    </p>
                  </div>
                )}

                {selectedPlanUrls.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Aucun plan sélectionné
                  </p>
                )}
              </div>

              {/* Section 2: Choix de matériaux et finitions */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">2</Badge>
                  <Label className="text-base font-semibold">Choix de matériaux et finitions (recommandé)</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ces détails ne sont généralement pas visibles sur les plans. Précisez-les pour une estimation plus réaliste.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Qualité générale */}
                  <div className="space-y-2">
                    <Label>Qualité générale des finitions</Label>
                    <Select value={finishQuality} onValueChange={(v) => setFinishQuality(v as "economique" | "standard" | "haut-de-gamme")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economique">🏷️ Économique</SelectItem>
                        <SelectItem value="standard">⭐ Standard</SelectItem>
                        <SelectItem value="haut-de-gamme">💎 Haut de gamme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Revêtement extérieur */}
                  <div className="space-y-2">
                    <Label>Revêtement extérieur</Label>
                    <Select value={exteriorSiding} onValueChange={setExteriorSiding}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vinyle">Vinyle</SelectItem>
                        <SelectItem value="canexel">Canexel / Fibrociment</SelectItem>
                        <SelectItem value="bois">Bois naturel</SelectItem>
                        <SelectItem value="brique">Brique</SelectItem>
                        <SelectItem value="pierre">Pierre / Placage de pierre</SelectItem>
                        <SelectItem value="aluminium">Aluminium</SelectItem>
                        <SelectItem value="mixte">Mixte (plusieurs matériaux)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Toiture */}
                  <div className="space-y-2">
                    <Label>Type de toiture</Label>
                    <Select value={roofingType} onValueChange={setRoofingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bardeau-asphalte">Bardeau d'asphalte</SelectItem>
                        <SelectItem value="bardeau-architectural">Bardeau architectural</SelectItem>
                        <SelectItem value="metal">Tôle / Métal</SelectItem>
                        <SelectItem value="elastomere">Membrane élastomère (toit plat)</SelectItem>
                        <SelectItem value="tpo-epdm">TPO / EPDM (toit plat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fenêtres */}
                  <div className="space-y-2">
                    <Label>Type de fenêtres</Label>
                    <Select value={windowType} onValueChange={setWindowType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pvc-standard">PVC standard</SelectItem>
                        <SelectItem value="pvc-triple">PVC triple vitrage</SelectItem>
                        <SelectItem value="aluminium">Aluminium</SelectItem>
                        <SelectItem value="pvc-alu">Hybride PVC/Alu</SelectItem>
                        <SelectItem value="bois">Bois massif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Isolation */}
                  <div className="space-y-2">
                    <Label>Type d'isolation</Label>
                    <Select value={insulationType} onValueChange={setInsulationType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="laine-standard">Laine isolante standard</SelectItem>
                        <SelectItem value="laine-haute-densite">Laine haute densité</SelectItem>
                        <SelectItem value="polyurethane">Polyuréthane giclé</SelectItem>
                        <SelectItem value="cellulose">Cellulose soufflée</SelectItem>
                        <SelectItem value="panneau-rigide">Panneaux rigides (SIP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Chauffage / CVAC */}
                  <div className="space-y-2">
                    <Label>Système de chauffage</Label>
                    <Select value={heatingType} onValueChange={setHeatingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plinthes">Plinthes électriques</SelectItem>
                        <SelectItem value="thermopompe-murale">Thermopompe murale</SelectItem>
                        <SelectItem value="thermopompe-centrale">Thermopompe centrale</SelectItem>
                        <SelectItem value="plancher-radiant">Plancher radiant électrique</SelectItem>
                        <SelectItem value="plancher-radiant-hydro">Plancher radiant hydronique</SelectItem>
                        <SelectItem value="bi-energie">Bi-énergie (fournaise + thermopompe)</SelectItem>
                        <SelectItem value="geothermie">Géothermie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Planchers */}
                  <div className="space-y-2">
                    <Label>Type de plancher principal</Label>
                    <Select value={flooringType} onValueChange={setFlooringType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flottant-stratifie">Flottant stratifié</SelectItem>
                        <SelectItem value="vinyle-luxe">Vinyle de luxe (LVP)</SelectItem>
                        <SelectItem value="bois-ingenierie">Bois d'ingénierie</SelectItem>
                        <SelectItem value="bois-franc">Bois franc massif</SelectItem>
                        <SelectItem value="ceramique">Céramique / Porcelaine</SelectItem>
                        <SelectItem value="beton-poli">Béton poli</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Armoires */}
                  <div className="space-y-2">
                    <Label>Type d'armoires cuisine</Label>
                    <Select value={cabinetType} onValueChange={setCabinetType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="melamine">Mélamine</SelectItem>
                        <SelectItem value="polyester">Polymère / Polyester</SelectItem>
                        <SelectItem value="thermoplastique">Thermoplastique</SelectItem>
                        <SelectItem value="laque">Laque / Acrylique</SelectItem>
                        <SelectItem value="bois-massif">Bois massif</SelectItem>
                        <SelectItem value="sur-mesure-haut-gamme">Sur mesure haut de gamme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Comptoirs */}
                  <div className="space-y-2">
                    <Label>Type de comptoirs</Label>
                    <Select value={countertopType} onValueChange={setCountertopType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stratifie">Stratifié</SelectItem>
                        <SelectItem value="quartz">Quartz</SelectItem>
                        <SelectItem value="granit">Granit</SelectItem>
                        <SelectItem value="marbre">Marbre</SelectItem>
                        <SelectItem value="bois-boucher">Bloc de boucher (bois)</SelectItem>
                        <SelectItem value="beton">Béton</SelectItem>
                        <SelectItem value="dekton">Dekton / Ultra-compact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Garage checkbox */}
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center space-x-2 h-10">
                      <Checkbox
                        id="garage-plan"
                        checked={hasGarage}
                        onCheckedChange={(checked) => setHasGarage(checked === true)}
                      />
                      <label htmlFor="garage-plan" className="text-sm font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Inclure un garage
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notes détaillées */}
                <div className="space-y-2">
                  <Label>Notes sur le projet (optionnel)</Label>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Ex: Cuisine ouverte avec îlot, 3 chambres, sous-sol fini, thermopompe murale, plancher chauffant salle de bain, balcon 12x10..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Plus vous donnez de détails, plus l'estimation sera précise (matériaux souhaités, équipements spéciaux, etc.)
                  </p>
                </div>

                {/* Images de référence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Images d'inspiration (optionnel)
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploadingManualImage}
                      onClick={() => manualImageInputRef.current?.click()}
                    >
                      {isUploadingManualImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Ajouter
                        </>
                      )}
                    </Button>
                  </div>
                  {manualReferenceImages.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {manualReferenceImages.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                          <img src={url} alt={`Réf ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setManualReferenceImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || (analysisMode === "plan" && selectedPlanUrls.length === 0)}
            className="w-full sm:w-auto gap-2"
            variant="accent"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {analysisMode === "manual" ? "Générer le budget" : "Analyser le plan"}
              </>
            )}
          </Button>
          
          {isAnalyzing && (
            <p className="text-sm text-muted-foreground animate-pulse">
              ⏳ L'analyse peut prendre quelques minutes selon la complexité des plans...
            </p>
          )}
        </div>

        {/* Results */}
        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Résultat de l'analyse
              </h3>
              <div className="flex flex-col items-end">
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {Math.round(analysis.estimatedTotal * 0.90).toLocaleString()} $ à {Math.round(analysis.estimatedTotal * 1.10).toLocaleString()} $
                </Badge>
                <span className="text-xs text-muted-foreground mt-1">Fourchette ±10%</span>
              </div>
            </div>

            <p className="text-muted-foreground">{analysis.projectSummary}</p>

            {/* Categories preview */}
            {(() => {
              const subTotal = orderedAnalysisCategories.reduce((s, c) => s + (Number(c.budget) || 0), 0);
              const contingence = subTotal * 0.05;
              const tps = (subTotal + contingence) * 0.05;
              const tvq = (subTotal + contingence) * 0.09975;
              const taxes = tps + tvq;

              return (
                <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
                  {orderedAnalysisCategories.map((cat, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <span className="text-muted-foreground font-medium text-sm">
                        {Math.round(cat.budget * 0.90).toLocaleString()} $ - {Math.round(cat.budget * 1.10).toLocaleString()} $
                      </span>
                    </div>
                  ))}

                  {/* Budget imprévu 5% */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-center font-medium">
                        %
                      </span>
                      <span className="font-medium text-amber-700 dark:text-amber-400">Budget imprévu (5%)</span>
                    </div>
                    <span className="text-amber-700 dark:text-amber-400 font-medium text-sm">
                      {Math.round(contingence * 0.90).toLocaleString()} $ - {Math.round(contingence * 1.10).toLocaleString()} $
                    </span>
                  </div>

                  {/* Taxes (TPS + TVQ) */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-medium">
                        $
                      </span>
                      <span className="font-medium text-blue-700 dark:text-blue-400">Taxes (TPS 5% + TVQ 9,975%)</span>
                    </div>
                    <span className="text-blue-700 dark:text-blue-400 font-medium text-sm">
                      {Math.round(taxes * 0.90).toLocaleString()} $ - {Math.round(taxes * 1.10).toLocaleString()} $
                    </span>
                  </div>
                </div>
              );
            })()}
            <p className="text-xs text-muted-foreground text-center">
              {orderedAnalysisCategories.length} poste(s) + Contingence + Taxes • Fourchette ±10%
            </p>

            {/* Warnings */}
            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Avertissements
                </div>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  {analysis.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium mb-1">
                  <Sparkles className="h-4 w-4" />
                  Recommandations
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              onClick={handleApplyBudget}
              className="w-full gap-2"
            >
              Appliquer ce budget
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
