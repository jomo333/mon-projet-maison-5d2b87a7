import { useEffect, useRef, useState } from "react";
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
}

export function PlanAnalyzer({ onBudgetGenerated, projectId, autoSelectPlanTab = false }: PlanAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"manual" | "plan">(autoSelectPlanTab ? "plan" : "manual");
  
  // Manual mode state
  const [projectType, setProjectType] = useState("maison-unifamiliale");
  const [squareFootage, setSquareFootage] = useState("1500");
  const [numberOfFloors, setNumberOfFloors] = useState("1");
  const [hasGarage, setHasGarage] = useState(false);
  const [foundationSqft, setFoundationSqft] = useState("");
  const [floorSqftDetails, setFloorSqftDetails] = useState<string[]>([""]);
  
  // Quality level state (shared between manual and plan modes)
  const [finishQuality, setFinishQuality] = useState<"economique" | "standard" | "haut-de-gamme">("standard");
  
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
      const body = analysisMode === "manual" 
        ? {
            mode: "manual",
            projectType: projectType === "maison-unifamiliale" ? "Maison unifamiliale" :
                         projectType === "jumelee" ? "Maison jumelée" :
                         projectType === "cottage" ? "Cottage" :
                         projectType === "bungalow" ? "Bungalow" : "Maison",
            squareFootage: parseInt(squareFootage) || 1500,
            numberOfFloors: parseInt(numberOfFloors) || 1,
            hasGarage,
            foundationSqft: parseInt(foundationSqft) || null,
            floorSqftDetails: floorSqftDetails.filter(s => s).map(s => parseInt(s)),
            finishQuality,
          }
        : {
            mode: "plan",
            imageUrls: selectedPlanUrls,
            finishQuality,
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
            </div>
          </TabsContent>
          
          {/* Plan Analysis Mode */}
          <TabsContent value="plan" className="mt-4 space-y-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Téléversez votre plan</strong> (image ou PDF). Les fichiers PDF seront automatiquement convertis en images pour l'analyse IA.
              </p>
            </div>
            
            {/* Quality Level Selector for Plan Mode */}
            <div className="space-y-2">
              <Label>Qualité des finitions intérieures</Label>
              <Select value={finishQuality} onValueChange={(v) => setFinishQuality(v as "economique" | "standard" | "haut-de-gamme")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economique">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">🏷️ Économique</span>
                      <span className="text-xs text-muted-foreground">Plancher flottant, armoires mélamine, comptoirs stratifiés</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="standard">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">⭐ Standard</span>
                      <span className="text-xs text-muted-foreground">Bois franc ingénierie, armoires semi-custom, quartz</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="haut-de-gamme">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">💎 Haut de gamme</span>
                      <span className="text-xs text-muted-foreground">Bois franc massif, armoires sur mesure, granite/marbre</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choisissez selon votre budget. Cela affecte les coûts des planchers, armoires, comptoirs et finitions.
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
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plans de construction (sélection multiple)</Label>
                <p className="text-xs text-muted-foreground">
                  Plans trouvés pour ce projet : <span className="font-medium">{plans.length}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Ajoutez tous les plans nécessaires (plans d'étages, élévations, coupes, etc.) pour une analyse complète.
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
                      Importer le dernier plan trouvé
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      (convertit automatiquement les PDF en images)
                    </span>
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
                    {isConverting ? "Conversion..." : "Téléverser des plans"}
                  </Button>

                  {selectedPlanUrls.length > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setSelectedPlanUrls([])}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                      Tout effacer
                    </Button>
                  )}
                </div>
              </div>

              {/* Selected plans list */}
              {selectedPlanUrls.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Plans sélectionnés ({selectedPlanUrls.length})</Label>
                  <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {selectedPlanUrls.map((url, index) => {
                      const plan = plans.find(p => p.file_url === url);
                      return (
                        <div 
                          key={url}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <span className="text-sm truncate max-w-[200px]">
                              {plan?.file_name || `Plan ${index + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              asChild
                            >
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setSelectedPlanUrls(prev => prev.filter(u => u !== url))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedPlanUrls.length > 0 && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{selectedPlanUrls.length} plan(s) sélectionné(s)</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    L'IA va analyser tous les plans ensemble pour extraire les dimensions et générer un budget consolidé sans doublons.
                  </p>
                </div>
              )}

              {selectedPlanUrls.length === 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Aucun plan sélectionné</span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                    Ajoutez un ou plusieurs plans (étages, élévations, coupes) pour une analyse complète.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

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

        {/* Results */}
        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Résultat de l'analyse
              </h3>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                <DollarSign className="h-4 w-4 mr-1" />
                {analysis.estimatedTotal.toLocaleString()} $
              </Badge>
            </div>

            <p className="text-muted-foreground">{analysis.projectSummary}</p>

            {/* Categories preview */}
            <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
              {analysis.categories.map((cat, index) => (
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
                  <span className="text-muted-foreground font-medium">
                    {cat.budget.toLocaleString()} $
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {analysis.categories.length} catégorie(s) au total
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
