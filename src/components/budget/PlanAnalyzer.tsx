import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getSignedUrl } from "@/hooks/useSignedUrl";
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
import { mapAnalysisToStepCategories, type ProjectConfig } from "@/lib/budgetCategories";
import { compressImageFileToJpeg } from "@/lib/imageCompression";
import { getCategoryLabel } from "@/lib/budgetCategoryI18n";
import { translateRecommendations, translateWarnings } from "@/lib/budgetWarningsI18n";

import type { 
  BudgetCategory, 
  BudgetAnalysis, 
  PlanDocument, 
  StylePhoto 
} from "./types";

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

export interface PlanAnalyzerHandle {
  resetAnalysis: () => void;
}

export const PlanAnalyzer = forwardRef<PlanAnalyzerHandle, PlanAnalyzerProps>(function PlanAnalyzer({ 
  onBudgetGenerated, 
  projectId, 
  autoSelectPlanTab = false, 
  autoSelectManualTab = false,
  onGenerateSchedule, 
  besoinsNote,
  prefillProjectType,
  prefillFloors,
  prefillSquareFootage
}, ref) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
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
  const [garageFoundationType, setGarageFoundationType] = useState<"dalle-monolithique" | "fondation">("dalle-monolithique");
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

  // Project configuration for filtering categories (e.g., garage with monolithic slab excludes basement-related categories)
  const projectConfig: ProjectConfig = useMemo(() => ({
    projectType,
    garageFoundationType,
  }), [projectType, garageFoundationType]);

  // Always show the analysis result in the same ordered structure as "Détail par catégorie"
  // (includes all step-based postes like "Excavation" even if the AI didn't output them explicitly)
  // Filters out categories that don't apply to this project type (e.g., no "Coulée de dalle du sous-sol" for garage with monolithic slab)
  const orderedAnalysisCategories = useMemo(() => {
    if (!analysis?.categories) return [];
    return mapAnalysisToStepCategories(
      analysis.categories.map((cat) => ({
        name: cat.name,
        budget: cat.budget,
        description: cat.description,
        items: cat.items || [],
      })),
      undefined,
      projectConfig
    );
  }, [analysis, projectConfig]);

  const translatedWarnings = useMemo(() => {
    if (!analysis?.warnings?.length) return [];
    return translateWarnings(t, analysis.warnings);
  }, [analysis?.warnings, t]);

  const translatedRecommendations = useMemo(() => {
    if (!analysis?.recommendations?.length) return [];
    return translateRecommendations(t, analysis.recommendations);
  }, [analysis?.recommendations, t]);

  const translatedProjectSummary = useMemo(() => {
    const summary = analysis?.projectSummary || "";
    if (!summary) return summary;

    const mergedMatch = summary.match(/(?:Analyse fusionnée de|Merged analysis from)\s*(\d+)\s*plan\(s\)/i);
    const constructionMatch = summary.match(
      /(?:Construction neuve de|New construction of)\s*([\d\s]+)\s*(?:pi²|sq ft)\s*(?:sur|on)\s*(\d+)\s*(?:étage\(s\)|floor\(s\))/i
    );

    let out = "";
    if (mergedMatch) out += t("budgetAnalysis.mergedAnalysis", { count: Number(mergedMatch[1]) });
    if (constructionMatch) {
      const sqft = constructionMatch[1].replace(/\s/g, "");
      const floors = Number(constructionMatch[2]);
      if (out) out += " - ";
      out += t("budgetAnalysis.newConstruction", { sqft, floors });
    }

    return out || summary;
  }, [analysis?.projectSummary, t]);

  // Expose reset function to parent via ref
  // Track if we just reset to prevent auto-import from immediately re-triggering
  const justResetRef = useRef(false);
  
  // Helper to get/set auto-import blocked state in sessionStorage (persists across refresh)
  const getAutoImportBlockedForProject = (pid: string) => {
    try {
      return sessionStorage.getItem(`budget-auto-import-blocked-${pid}`) === "true";
    } catch {
      return false;
    }
  };
  
  const setAutoImportBlockedForProject = (pid: string, blocked: boolean) => {
    try {
      if (blocked) {
        sessionStorage.setItem(`budget-auto-import-blocked-${pid}`, "true");
      } else {
        sessionStorage.removeItem(`budget-auto-import-blocked-${pid}`);
      }
    } catch {
      // sessionStorage not available
    }
  };
  
  useImperativeHandle(ref, () => ({
    resetAnalysis: () => {
      setAnalysis(null);
      setSelectedPlanUrls([]);
      setImportedPlanSourceUrls([]);
      setManualReferenceImages([]);
      // Mark that we just reset - don't re-trigger auto-import
      justResetRef.current = true;
      // Keep the project marker so auto-import doesn't re-run for this project
      // autoImportedForProjectRef stays as-is (or we set it to projectId to block)
      if (projectId) {
        autoImportedForProjectRef.current = projectId;
        // Also persist to sessionStorage so it survives page refresh
        setAutoImportBlockedForProject(projectId, true);
      }
    },
    // Allow parent to clear the auto-import block (e.g., when user uploads new plans)
    clearAutoImportBlock: () => {
      if (projectId) {
        autoImportedForProjectRef.current = null;
        setAutoImportBlockedForProject(projectId, false);
      }
    },
  }));
  
  // Update additionalNotes when besoinsNote prop changes
  useEffect(() => {
    if (besoinsNote && !additionalNotes) {
      setAdditionalNotes(besoinsNote);
    }
  }, [besoinsNote]);

  // Fetch style photos for the project (category "style")
  const { data: stylePhotos = [] } = useQuery<StylePhoto[]>({
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
      return (data || []) as StylePhoto[];
    },
    enabled: !!projectId,
  });

  // Fetch uploaded plans/documents from project tasks AND project photos
  const { data: plans = [] } = useQuery<PlanDocument[]>({
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
        return (data || []) as PlanDocument[];
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

      let photos: PlanDocument[] = [];
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
      const attachmentsAsPlan: PlanDocument[] = (attachments || []).map(att => ({
        id: att.id,
        file_name: att.file_name,
        file_url: att.file_url,
        file_type: att.file_type,
        file_size: att.file_size,
        created_at: att.created_at,
        category: att.category,
        step_id: att.step_id,
      }));
      
      const allPlans = [...attachmentsAsPlan, ...photos];
      const uniquePlans = allPlans.filter((plan, index, self) =>
        index === self.findIndex(p => p.file_url === plan.file_url)
      );

      return uniquePlans;
    },
    enabled: true,
  });

  // Upload mutation
  const uploadPlanFile = async (file: File, opts: { silent?: boolean } = {}) => {
    if (!user) throw new Error("Non authentifié");
    
    const fileExt = file.name.split(".").pop();
    const uniqueId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    // Path format: user_id/budget-plans/filename
    const fileName = `${user.id}/budget-plans/${uniqueId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Generate signed URL
    const signedUrl = await getSignedUrl("task-attachments", fileName);
    if (!signedUrl) throw new Error("Failed to generate signed URL");

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
      file_url: signedUrl,
      file_type: file.type,
      file_size: file.size,
      category: "plan",
    };

    if (projectId) insertData.project_id = projectId;

    const { error: dbError } = await supabase.from("task_attachments").insert(insertData);
    if (dbError) throw dbError;

    if (!opts.silent) {
      queryClient.invalidateQueries({ queryKey: ["project-plans", projectId] });
      setSelectedPlanUrls((prev) => [...prev, signedUrl]);
      toast.success(t("toasts.planUploaded"));
    }

    return signedUrl;
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return await uploadPlanFile(file);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(t("toasts.planUploadError"));
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
      toast.success(t("toasts.planDeleted"));
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error(t("toasts.planDeleteError"));
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
        toast.info(t("toasts.convertingPdf"));

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

        const { images, pageCount } = await convertPdfToImages(pdfFile, { scale: 1.6, maxPages: 20 });

        if (pageCount > 20) {
          toast.warning(t("toasts.pdfTooManyPages", { count: pageCount }));
        }

        for (let i = 0; i < images.length; i++) {
          const imageBlob = images[i];
          const imageName = `${pdfFile.name.replace(/\.pdf$/i, "")}_page_${i + 1}.jpg`;
          const imageFile = new File([imageBlob], imageName, { type: "image/jpeg" });
          await uploadMutation.mutateAsync(imageFile);
        }

        setImportedPlanSourceUrls((prev) => [...prev, fileUrl]);
        toast.success(t("toasts.pdfConvertedAdded", { count: images.length }));
      } catch (error) {
        console.error("PDF import error:", error);
        toast.error(t("toasts.pdfError"));
      } finally {
        setIsUploading(false);
      }

      return;
    }

    toast.error(t("toasts.unsupportedFormat"));
  };

  // Auto-import: when user opens "Analyse de plan", preselect the most relevant file(s)
  // so the analysis isn't empty.
  useEffect(() => {
    if (analysisMode !== "plan") return;
    if (!projectId) return;
    if (selectedPlanUrls.length > 0) return;
    if (!plans || plans.length === 0) return;
    if (isUploading || isConverting) return;

    // Avoid repeating auto-import for the same project (check both ref and sessionStorage)
    if (autoImportedForProjectRef.current === projectId) return;
    if (getAutoImportBlockedForProject(projectId)) {
      autoImportedForProjectRef.current = projectId;
      return;
    }
    autoImportedForProjectRef.current = projectId;

    const isPdfPlan = (p: PlanDocument) => {
      const url = p?.file_url;
      const fileType = String(p?.file_type || "").toLowerCase();
      return fileType.includes("pdf") || (!!url && isPdfUrl(url));
    };

    const isImagePlan = (p: PlanDocument) => {
      const url = p?.file_url;
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
      .map((p) => p.file_url)
      .filter((u): u is string => typeof u === "string" && u.length > 0)
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
          toast.info(t("toasts.convertingPdf"));
          const { images, pageCount } = await convertPdfToImages(file, { scale: 1.6, maxPages: 20 });
          
          if (pageCount > 20) {
            toast.warning(t("toasts.pdfTooManyPages", { count: pageCount }));
          }
          
          // Upload each converted image
          for (let i = 0; i < images.length; i++) {
            const imageBlob = images[i];
            const imageName = `${file.name.replace('.pdf', '')}_page_${i + 1}.jpg`;
            const imageFile = new File([imageBlob], imageName, { type: "image/jpeg" });
            await uploadMutation.mutateAsync(imageFile);
          }
          
          toast.success(t("toasts.pdfConvertedSuccess", { count: images.length }));
        } else {
          const shouldCompress = file.type.startsWith("image/") && file.type !== "image/svg+xml";
          const toUpload = shouldCompress ? await compressImageFileToJpeg(file) : file;
          await uploadMutation.mutateAsync(toUpload);
        }
      }
    } catch (error) {
      console.error("Upload/conversion error:", error);
      toast.error(t("toasts.uploadError"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // State for batch progress
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; completed: number } | null>(null);

  const handleAnalyze = async () => {
    if (analysisMode === "plan" && selectedPlanUrls.length === 0) {
      toast.error(t("toasts.selectOrUploadPlan"));
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setBatchProgress(null);

    try {
      // Get style photo URLs to include in analysis
      const stylePhotoUrls = stylePhotos.map((p) => p.file_url);
      
      // Données manuelles enrichies (toujours incluses pour contexte)
      const isGarageProject = projectType === "garage" || projectType === "garage-etage";
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
        // Garage-specific: foundation type (monolithic slab vs standard foundation)
        garageFoundationType: isGarageProject ? garageFoundationType : undefined,
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
      
      const hasPlansSelected = selectedPlanUrls.length > 0;
      
      if (!hasPlansSelected) {
        // Mode manuel pur
        const currentLang = i18n.language?.startsWith("en") ? "en" : "fr";
        const body = {
          mode: "manual",
          lang: currentLang,
          ...manualData,
          stylePhotoUrls: stylePhotoUrls.length > 0 ? stylePhotoUrls : undefined,
          referenceImageUrls: manualReferenceImages.length > 0 ? manualReferenceImages : undefined,
        };

        const { data, error } = await supabase.functions.invoke('analyze-plan', { body });
        if (error) throw error;
        if (data.success && data.data) {
          setAnalysis(data.data);
          toast.success(t("toasts.analysisDone"));
        } else {
          throw new Error(data.error || "Échec de l'analyse");
        }
      } else {
        // IMPORTANT: older plans already stored can be huge PNGs and will trigger backend WORKER_LIMIT.
        // We re-download + recompress to JPEG, then analyze the optimized URLs.
        const ensureOptimizedUrls = async (urls: string[]) => {
          const optimized: string[] = [];
          let changed = false;

          for (const url of urls) {
            try {
              const isLikelyJpeg = /\.(jpe?g)(\?|#|$)/i.test(url);
              // Cheap check with HEAD (if supported) to avoid downloading already-small JPEG.
              let contentLength: number | null = null;
              try {
                const head = await fetch(url, { method: "HEAD" });
                if (head.ok) {
                  const len = head.headers.get("content-length");
                  if (len) contentLength = Number(len);
                }
              } catch {
                // ignore
              }

              if (isLikelyJpeg && contentLength !== null && contentLength > 0 && contentLength <= 3_000_000) {
                optimized.push(url);
                continue;
              }

              const res = await fetch(url);
              if (!res.ok) {
                optimized.push(url);
                continue;
              }
              const blob = await res.blob();

              const mime = blob.type || "image/png";
              const needsCompression = !mime.includes("jpeg") || blob.size > 3_000_000;
              if (!needsCompression) {
                optimized.push(url);
                continue;
              }

              const baseName = url.split("/").pop()?.split("?")[0]?.split("#")[0] || "plan";
              const file = new File([blob], baseName, { type: mime });
              const compressed = await compressImageFileToJpeg(file);
              const newUrl = await uploadPlanFile(compressed, { silent: true });
              optimized.push(newUrl);
              changed = true;
            } catch (e) {
              console.warn("Plan optimization failed, keeping original:", url, e);
              optimized.push(url);
            }
          }

          return { optimized, changed };
        };

        toast.info(t("toasts.optimizingPlans"));
        const { optimized: planUrlsForAnalysis, changed } = await ensureOptimizedUrls(selectedPlanUrls);
        if (changed) {
          // Update selection so next runs are faster and stable.
          setSelectedPlanUrls(planUrlsForAnalysis);
          toast.success(t("toasts.plansOptimized"));
        }

        // Mode plan: analyse par lots de 1 image pour éviter timeout CPU (WORKER_LIMIT)
        const BATCH_SIZE = 1;
        const totalImages = planUrlsForAnalysis.length;
        const totalBatches = Math.ceil(totalImages / BATCH_SIZE);
        
        // Types for batch results
        interface BatchResultRaw {
          categories?: Array<{
            nom?: string;
            name?: string;
            sous_total_categorie?: number;
            budget?: number;
            items?: Array<{
              description?: string;
              name?: string;
              total?: number;
              cost?: number;
              quantite?: number | string;
              quantity?: number | string;
              unite?: string;
              unit?: string;
            }>;
          }>;
          extraction?: {
            categories?: BatchResultRaw["categories"];
          };
          resume_projet?: string;
          totaux?: {
            total_ttc?: number;
          };
          recommandations?: string[];
          warnings?: string[];
        }
        
        // Collecter les résultats bruts de chaque batch pour fusion côté serveur
        const batchResults: BatchResultRaw[] = [];
        let failedBatches = 0;
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIdx = batchIndex * BATCH_SIZE;
          const endIdx = Math.min(startIdx + BATCH_SIZE, totalImages);
          const batchUrls = planUrlsForAnalysis.slice(startIdx, endIdx);
          
          setBatchProgress({
            current: batchIndex + 1,
            total: totalBatches,
            completed: startIdx,
          });
          
          toast.info(t("toasts.analyzingBatch", { current: batchIndex + 1, total: totalBatches, start: startIdx + 1, end: endIdx }));
          
          const currentLang = i18n.language?.startsWith("en") ? "en" : "fr";
          const body = {
            mode: "plan",
            lang: currentLang,
            imageUrls: batchUrls,
            finishQuality,
            manualContext: manualData,
            stylePhotoUrls: batchIndex === 0 && stylePhotoUrls.length > 0 ? stylePhotoUrls : undefined,
            referenceImageUrls: batchIndex === 0 && manualReferenceImages.length > 0 ? manualReferenceImages : undefined,
            // Indiquer au serveur qu'il s'agit d'un lot partiel
            batchInfo: {
              batchIndex,
              totalBatches,
              totalImages,
              isPartialBatch: totalBatches > 1,
            },
          };

          const { data, error } = await supabase.functions.invoke('analyze-plan', { body });
          
          if (error) {
            console.error(`Batch ${batchIndex + 1} error:`, error);
            toast.error(t("toasts.batchError", { batch: batchIndex + 1, message: error.message }));
            failedBatches++;
            // Continue avec les autres lots
            continue;
          }
          
          if (data.success && data.rawAnalysis) {
            batchResults.push(data.rawAnalysis as BatchResultRaw);
          } else if (data.success && data.data) {
            // Fallback si rawAnalysis n'est pas disponible
            batchResults.push({ categories: data.data.categories, extraction: data.data } as BatchResultRaw);
          } else {
            failedBatches++;
          }
        }
        
        setBatchProgress(null);
        
        // Show partial failure message if some batches failed
        const succeededBatches = totalBatches - failedBatches;
        if (failedBatches > 0 && succeededBatches > 0) {
          toast.warning(
            `${succeededBatches} plan(s) analysé(s) sur ${totalBatches}, ${failedBatches} en échec. ` +
            `Les résultats sont partiels.`
          );
        }
        
        if (batchResults.length === 0) {
          throw new Error(`Aucun lot n'a pu être analysé avec succès (${failedBatches} échec(s) sur ${totalBatches})`);
        }
        
        // Si un seul lot, utiliser directement le résultat
        if (batchResults.length === 1 && totalBatches === 1) {
          const singleResult = batchResults[0];
          // Appeler le serveur pour obtenir le format final
          const currentLang = i18n.language?.startsWith("en") ? "en" : "fr";
          const { data: finalData } = await supabase.functions.invoke('analyze-plan', {
            body: {
              mode: "merge",
              lang: currentLang,
              batchResults,
              finishQuality,
              manualContext: manualData,
              totalImages,
              materialChoices: {
                roofingType,
                exteriorSiding,
                flooringType,
                cabinetType,
                countertopType,
                heatingType,
                windowType,
                insulationType,
              },
            },
          });
          
          if (finalData?.success && finalData?.data) {
            setAnalysis(finalData.data);
          } else {
            // Utiliser le résultat brut transformé localement
            const categories = singleResult.extraction?.categories || singleResult.categories || [];
            setAnalysis({
              projectSummary: singleResult.resume_projet || `Analyse de ${totalImages} plan(s)`,
              estimatedTotal: singleResult.totaux?.total_ttc || 0,
              categories: categories.map((cat) => ({
                name: cat.nom || cat.name || "",
                budget: cat.sous_total_categorie || cat.budget || 0,
                description: `${cat.items?.length || 0} items`,
                items: (cat.items || []).map((item) => ({
                  name: item.description || item.name || "",
                  cost: item.total || item.cost || 0,
                  quantity: String(item.quantite || item.quantity || ""),
                  unit: item.unite || item.unit || "",
                })),
              })),
              recommendations: singleResult.recommandations || [],
              warnings: singleResult.warnings || [],
            });
          }
        } else {
          // Plusieurs lots: envoyer tous les résultats au serveur pour fusion
          toast.info(t("toasts.mergingResults"));
          
          const currentLang = i18n.language?.startsWith("en") ? "en" : "fr";
          const { data: mergedData, error: mergeError } = await supabase.functions.invoke('analyze-plan', {
            body: {
              mode: "merge",
              lang: currentLang,
              batchResults,
              finishQuality,
              manualContext: manualData,
              totalImages,
              materialChoices: {
                roofingType,
                exteriorSiding,
                flooringType,
                cabinetType,
                countertopType,
                heatingType,
                windowType,
                insulationType,
              },
            },
          });
          
          if (mergeError) throw mergeError;
          
          if (mergedData?.success && mergedData?.data) {
            setAnalysis(mergedData.data);
          } else {
            throw new Error(mergedData?.error || "Échec de la fusion des résultats");
          }
        }
        
        toast.success(t("toasts.analysisCompleteCount", { count: totalImages }));
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(t("toasts.analysisError"));
    } finally {
      setIsAnalyzing(false);
      setBatchProgress(null);
    }
  };

  const handleApplyBudget = () => {
    if (analysis?.categories) {
      onBudgetGenerated(analysis.categories);
      toast.success(t("toasts.budgetApplied"));
      
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
          <CardTitle className="font-display">{t("planAnalyzer.aiProjectAnalysis")}</CardTitle>
        </div>
        <CardDescription>
          {t("planAnalyzer.chooseMethod")}
        </CardDescription>
        <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>{t("planAnalyzer.importantNote")} :</strong> {t("planAnalyzer.disclaimer")}
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
                {t("planAnalyzer.tabs.manual")}
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <Image className="h-4 w-4" />
                {t("planAnalyzer.tabs.plan")}
            </TabsTrigger>
          </TabsList>
          
          {/* Manual Mode */}
          <TabsContent value="manual" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("planAnalyzer.manualConfigDesc")}
            </p>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("planAnalyzer.projectType")}</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maison-unifamiliale">{t("planAnalyzer.projectTypes.maisonUnifamiliale")}</SelectItem>
                    <SelectItem value="bungalow">{t("planAnalyzer.projectTypes.bungalow")}</SelectItem>
                    <SelectItem value="cottage">{t("planAnalyzer.projectTypes.cottage")}</SelectItem>
                    <SelectItem value="jumelee">{t("planAnalyzer.projectTypes.jumelee")}</SelectItem>
                    <SelectItem value="agrandissement">{t("planAnalyzer.projectTypes.agrandissement")}</SelectItem>
                    <SelectItem value="garage">{t("planAnalyzer.projectTypes.garage")}</SelectItem>
                    <SelectItem value="garage-etage">{t("planAnalyzer.projectTypes.garageEtage")}</SelectItem>
                    <SelectItem value="chalet">{t("planAnalyzer.projectTypes.chalet")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type de fondation pour garage détaché uniquement */}
              {(projectType === "garage" || projectType === "garage-etage") && (
                <div className="space-y-2">
                  <Label>{t("planAnalyzer.foundationType")}</Label>
                  <Select value={garageFoundationType} onValueChange={(v: "dalle-monolithique" | "fondation") => setGarageFoundationType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dalle-monolithique">{t("planAnalyzer.foundationTypes.dalleMonolithique")}</SelectItem>
                      <SelectItem value="fondation">{t("planAnalyzer.foundationTypes.fondation")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {garageFoundationType === "dalle-monolithique" 
                      ? t("planAnalyzer.monolithicDesc") 
                      : t("planAnalyzer.standardFoundationDesc")}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="sqft">{t("planAnalyzer.totalSqft")}</Label>
                <Input
                  id="sqft"
                  type="number"
                  value={squareFootage}
                  onChange={(e) => setSquareFootage(e.target.value)}
                  placeholder="1500"
                />
              </div>

              {/* Nombre d'étages - masqué pour garage détaché (mais visible pour garage avec étage) */}
              {projectType !== "garage" && (
                <div className="space-y-2">
                  <Label>{t("planAnalyzer.numberOfFloors")}</Label>
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
                      <SelectItem value="1">{t("planAnalyzer.floors.one")}</SelectItem>
                      <SelectItem value="2">{t("planAnalyzer.floors.two")}</SelectItem>
                      <SelectItem value="3">{t("planAnalyzer.floors.three")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Superficie fondation - masqué pour garage détaché */}
              {projectType !== "garage" && projectType !== "garage-etage" && (
                <div className="space-y-2">
                  <Label htmlFor="foundation">{t("planAnalyzer.foundationSqft")}</Label>
                  <Input
                    id="foundation"
                    type="number"
                    value={foundationSqft}
                    onChange={(e) => setFoundationSqft(e.target.value)}
                    placeholder="Ex: 1200"
                  />
                </div>
              )}

              {/* Superficie par étage - masqué pour garage détaché */}
              {projectType !== "garage" && projectType !== "garage-etage" && parseInt(numberOfFloors) > 1 && floorSqftDetails.map((_, index) => (
                <div key={index} className="space-y-2">
                  <Label>{t("planAnalyzer.floorSqft", { number: index + 1 })}</Label>
                  <Input
                    type="number"
                    value={floorSqftDetails[index]}
                    onChange={(e) => {
                      const newDetails = [...floorSqftDetails];
                      newDetails[index] = e.target.value;
                      setFloorSqftDetails(newDetails);
                    }}
                    placeholder={t("planAnalyzer.floorSqft", { number: index + 1 })}
                  />
                </div>
              ))}

              {/* Garage - masqué si le projet est déjà un garage */}
              {projectType !== "garage" && projectType !== "garage-etage" && (
                <div className="space-y-2">
                  <Label>{t("planAnalyzer.garage")}</Label>
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
                      {t("planAnalyzer.includeGarage")}
                    </label>
                  </div>
                </div>
              )}

              {/* Qualité des finitions - masqué pour les projets garage */}
              {projectType !== "garage" && projectType !== "garage-etage" && (
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label>{t("planAnalyzer.finishQuality")}</Label>
                  <Select value={finishQuality} onValueChange={(v) => setFinishQuality(v as "economique" | "standard" | "haut-de-gamme")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economique">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{t("planAnalyzer.qualityLevels.economique")}</span>
                          <span className="text-xs text-muted-foreground">{t("planAnalyzer.qualityLevels.economiqueDesc")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="standard">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{t("planAnalyzer.qualityLevels.standard")}</span>
                          <span className="text-xs text-muted-foreground">{t("planAnalyzer.qualityLevels.standardDesc")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="haut-de-gamme">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{t("planAnalyzer.qualityLevels.hautDeGamme")}</span>
                          <span className="text-xs text-muted-foreground">{t("planAnalyzer.qualityLevels.hautDeGammeDesc")}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("planAnalyzer.qualityNote")}
                  </p>
                </div>
              )}
              
              {/* Notes additionnelles (pré-remplies depuis la tâche Besoins) */}
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="additionalNotes">{t("planAnalyzer.needsNotes")}</Label>
                <textarea
                  id="additionalNotes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder={t("planAnalyzer.needsPlaceholder")}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {besoinsNote && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("planAnalyzer.prefilledFromStep1")}
                  </p>
                )}
              </div>
              
              {/* Reference Images Upload for Manual Mode */}
              <div className="space-y-3 sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      {t("planAnalyzer.referenceImages")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("planAnalyzer.referenceImagesDesc")}
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
                    <span className="ml-2">{t("planAnalyzer.add")}</span>
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
                        toast.success(t("toasts.imagesAdded"));
                      } catch (error) {
                        console.error("Upload error:", error);
                        toast.error(t("toasts.downloadError"));
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
                    {t("planAnalyzer.imagesAdded", { count: manualReferenceImages.length })}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Plan Analysis Mode */}
          <TabsContent value="plan" className="mt-4 space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-foreground">
                <strong>{t("planAnalyzer.enrichedAnalysis")}</strong> : {t("planAnalyzer.enrichedAnalysisDesc")}
              </p>
            </div>
            
            {/* PDF Conversion Progress */}
            {isConverting && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <FileImage className="h-5 w-5 animate-pulse" />
                  <span className="font-medium">{t("planAnalyzer.convertingPdf")}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{t("planAnalyzer.percentComplete", { percent: progress })}</p>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Section 1: Plans */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">1</Badge>
                  <Label className="text-base font-semibold">{t("planAnalyzer.constructionPlans")}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("planAnalyzer.plansFound")} : <span className="font-medium">{plans.length}</span> — {t("planAnalyzer.plansFoundDesc")}
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
                      {t("planAnalyzer.importLatestPlan")}
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value="none"
                    onValueChange={(v) => {
                      if (v !== "none") {
                        void addExistingPlanByUrl(v);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 min-w-[200px]">
                      <SelectValue placeholder={t("planAnalyzer.addExistingPlan")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("planAnalyzer.addExistingPlan")}</SelectItem>
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
                    {isConverting ? t("planAnalyzer.converting") : t("planAnalyzer.upload")}
                  </Button>

                  {selectedPlanUrls.length > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setSelectedPlanUrls([])}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                      {t("planAnalyzer.clear")}
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
                                {plan?.file_name || `${t("planAnalyzer.plan")} ${index + 1}`}
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
                      {t("startProject.plansReadyForAnalysis", { count: selectedPlanUrls.length })}
                    </p>
                  </div>
                )}

                {selectedPlanUrls.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t("startProject.noPlanSelected")}
                  </p>
                )}
              </div>

              {/* Section 2: Choix de matériaux et finitions */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">2</Badge>
                  <Label className="text-base font-semibold">{t("planAnalyzer.materialsAndFinishes")}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("planAnalyzer.materialsAndFinishesDesc")}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Qualité générale */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.generalFinishQuality")}</Label>
                    <Select value={finishQuality} onValueChange={(v) => setFinishQuality(v as "economique" | "standard" | "haut-de-gamme")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economique">{t("planAnalyzer.qualityLevels.economique")}</SelectItem>
                        <SelectItem value="standard">{t("planAnalyzer.qualityLevels.standard")}</SelectItem>
                        <SelectItem value="haut-de-gamme">{t("planAnalyzer.qualityLevels.hautDeGamme")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Revêtement extérieur */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.exteriorSiding")}</Label>
                    <Select value={exteriorSiding} onValueChange={setExteriorSiding}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vinyle">{t("planAnalyzer.sidingTypes.vinyle")}</SelectItem>
                        <SelectItem value="canexel">{t("planAnalyzer.sidingTypes.canexel")}</SelectItem>
                        <SelectItem value="bois">{t("planAnalyzer.sidingTypes.bois")}</SelectItem>
                        <SelectItem value="brique">{t("planAnalyzer.sidingTypes.brique")}</SelectItem>
                        <SelectItem value="pierre">{t("planAnalyzer.sidingTypes.pierre")}</SelectItem>
                        <SelectItem value="aluminium">{t("planAnalyzer.sidingTypes.aluminium")}</SelectItem>
                        <SelectItem value="mixte">{t("planAnalyzer.sidingTypes.mixte")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Toiture */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.roofType")}</Label>
                    <Select value={roofingType} onValueChange={setRoofingType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bardeau-asphalte">{t("planAnalyzer.roofTypes.bardeauAsphalte")}</SelectItem>
                        <SelectItem value="bardeau-architectural">{t("planAnalyzer.roofTypes.bardeauArchitectural")}</SelectItem>
                        <SelectItem value="metal">{t("planAnalyzer.roofTypes.metal")}</SelectItem>
                        <SelectItem value="elastomere">{t("planAnalyzer.roofTypes.elastomere")}</SelectItem>
                        <SelectItem value="tpo-epdm">{t("planAnalyzer.roofTypes.tpoEpdm")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fenêtres */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.windowType")}</Label>
                    <Select value={windowType} onValueChange={setWindowType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pvc-standard">{t("planAnalyzer.windowTypes.pvcStandard")}</SelectItem>
                        <SelectItem value="pvc-triple">{t("planAnalyzer.windowTypes.pvcTriple")}</SelectItem>
                        <SelectItem value="aluminium">{t("planAnalyzer.windowTypes.aluminium")}</SelectItem>
                        <SelectItem value="pvc-alu">{t("planAnalyzer.windowTypes.pvcAlu")}</SelectItem>
                        <SelectItem value="bois">{t("planAnalyzer.windowTypes.bois")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Isolation */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.insulationType")}</Label>
                    <Select value={insulationType} onValueChange={setInsulationType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="laine-standard">{t("planAnalyzer.insulationTypes.laineStandard")}</SelectItem>
                        <SelectItem value="laine-haute-densite">{t("planAnalyzer.insulationTypes.laineHauteDensite")}</SelectItem>
                        <SelectItem value="polyurethane">{t("planAnalyzer.insulationTypes.polyurethane")}</SelectItem>
                        <SelectItem value="cellulose">{t("planAnalyzer.insulationTypes.cellulose")}</SelectItem>
                        <SelectItem value="panneau-rigide">{t("planAnalyzer.insulationTypes.panneauRigide")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Chauffage / CVAC */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.heatingType")}</Label>
                    <Select value={heatingType} onValueChange={setHeatingType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plinthes">{t("planAnalyzer.heatingTypes.plinthes")}</SelectItem>
                        <SelectItem value="thermopompe-murale">{t("planAnalyzer.heatingTypes.thermopompeMurale")}</SelectItem>
                        <SelectItem value="thermopompe-centrale">{t("planAnalyzer.heatingTypes.thermopompeCentrale")}</SelectItem>
                        <SelectItem value="plancher-radiant">{t("planAnalyzer.heatingTypes.plancherRadiant")}</SelectItem>
                        <SelectItem value="plancher-radiant-hydro">{t("planAnalyzer.heatingTypes.plancherRadiantHydro")}</SelectItem>
                        <SelectItem value="bi-energie">{t("planAnalyzer.heatingTypes.biEnergie")}</SelectItem>
                        <SelectItem value="geothermie">{t("planAnalyzer.heatingTypes.geothermie")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Planchers */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.flooringType")}</Label>
                    <Select value={flooringType} onValueChange={setFlooringType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flottant-stratifie">{t("planAnalyzer.flooringTypes.flottantStratifie")}</SelectItem>
                        <SelectItem value="vinyle-luxe">{t("planAnalyzer.flooringTypes.vinyleLuxe")}</SelectItem>
                        <SelectItem value="bois-ingenierie">{t("planAnalyzer.flooringTypes.boisIngenierie")}</SelectItem>
                        <SelectItem value="bois-franc">{t("planAnalyzer.flooringTypes.boisFranc")}</SelectItem>
                        <SelectItem value="ceramique">{t("planAnalyzer.flooringTypes.ceramique")}</SelectItem>
                        <SelectItem value="beton-poli">{t("planAnalyzer.flooringTypes.betonPoli")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Armoires */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.cabinetType")}</Label>
                    <Select value={cabinetType} onValueChange={setCabinetType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="melamine">{t("planAnalyzer.cabinetTypes.melamine")}</SelectItem>
                        <SelectItem value="polyester">{t("planAnalyzer.cabinetTypes.polyester")}</SelectItem>
                        <SelectItem value="thermoplastique">{t("planAnalyzer.cabinetTypes.thermoplastique")}</SelectItem>
                        <SelectItem value="laque">{t("planAnalyzer.cabinetTypes.laque")}</SelectItem>
                        <SelectItem value="bois-massif">{t("planAnalyzer.cabinetTypes.boisMassif")}</SelectItem>
                        <SelectItem value="sur-mesure-haut-gamme">{t("planAnalyzer.cabinetTypes.surMesure")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Comptoirs */}
                  <div className="space-y-2">
                    <Label>{t("planAnalyzer.countertopType")}</Label>
                    <Select value={countertopType} onValueChange={setCountertopType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("planAnalyzer.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stratifie">{t("planAnalyzer.countertopTypes.stratifie")}</SelectItem>
                        <SelectItem value="quartz">{t("planAnalyzer.countertopTypes.quartz")}</SelectItem>
                        <SelectItem value="granit">{t("planAnalyzer.countertopTypes.granit")}</SelectItem>
                        <SelectItem value="marbre">{t("planAnalyzer.countertopTypes.marbre")}</SelectItem>
                        <SelectItem value="bois-boucher">{t("planAnalyzer.countertopTypes.blocBoucher")}</SelectItem>
                        <SelectItem value="beton">{t("planAnalyzer.countertopTypes.beton")}</SelectItem>
                        <SelectItem value="dekton">{t("planAnalyzer.countertopTypes.dekton")}</SelectItem>
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
                        {t("planAnalyzer.includeGarage")}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notes détaillées */}
                <div className="space-y-2">
                  <Label>{t("planAnalyzer.projectNotes")}</Label>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder={t("planAnalyzer.projectNotesPlaceholder")}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("planAnalyzer.moreDetailsNote")}
                  </p>
                </div>

                {/* Images de référence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      {t("planAnalyzer.inspirationImages")}
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
                          {t("planAnalyzer.add")}
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
                {batchProgress 
                  ? t("planAnalyzer.batchAnalysis", { current: batchProgress.current, total: batchProgress.total })
                  : t("planAnalyzer.analyzing")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {analysisMode === "manual" ? t("planAnalyzer.generateBudget") : t("planAnalyzer.analyzePlan")}
              </>
            )}
          </Button>
          
          {isAnalyzing && (
            <div className="space-y-2">
              {batchProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("planAnalyzer.batchAnalysisProgress", { current: batchProgress.current, total: batchProgress.total })}</span>
                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                  </div>
                  <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("planAnalyzer.plansProgress", { start: batchProgress.completed + 1, end: Math.min(batchProgress.completed + 3, selectedPlanUrls.length), total: selectedPlanUrls.length })}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground animate-pulse">
                ⏳ {batchProgress 
                  ? t("planAnalyzer.batchAnalysisNote", { count: selectedPlanUrls.length, batches: batchProgress.total })
                  : t("planAnalyzer.analysisNote")}
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {t("planAnalyzer.analysisResult")}
              </h3>
              <div className="flex flex-col items-end">
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {Math.round(analysis.estimatedTotal * 0.90).toLocaleString()} $ à {Math.round(analysis.estimatedTotal * 1.10).toLocaleString()} $
                </Badge>
                <span className="text-xs text-muted-foreground mt-1">{t("planAnalyzer.rangeNote")}</span>
              </div>
            </div>

            <p className="text-muted-foreground">{translatedProjectSummary}</p>

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
                        <span className="font-medium">{getCategoryLabel(t, cat.name)}</span>
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
                      <span className="font-medium text-amber-700 dark:text-amber-400">{t("planAnalyzer.contingencyBudget")}</span>
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
                      <span className="font-medium text-blue-700 dark:text-blue-400">{t("planAnalyzer.taxesLabel")}</span>
                    </div>
                    <span className="text-blue-700 dark:text-blue-400 font-medium text-sm">
                      {Math.round(taxes * 0.90).toLocaleString()} $ - {Math.round(taxes * 1.10).toLocaleString()} $
                    </span>
                  </div>
                </div>
              );
            })()}
            <p className="text-xs text-muted-foreground text-center">
              {t("planAnalyzer.summaryLine", { count: orderedAnalysisCategories.length })}
            </p>

            {/* Warnings */}
            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  {t("planAnalyzer.warningsTitle")}
                </div>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  {translatedWarnings.map((warning, i) => (
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
                  {t("planAnalyzer.recommendationsTitle")}
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  {translatedRecommendations.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              onClick={handleApplyBudget}
              className="w-full gap-2"
            >
              {t("planAnalyzer.applyBudget")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
