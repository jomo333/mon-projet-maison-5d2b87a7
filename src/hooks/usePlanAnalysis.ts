import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { compressImageFileToJpeg } from "@/lib/imageCompression";
import { usePlanLimits } from "@/hooks/usePlanLimits";

// ============ Types ============

export interface BudgetItem {
  name: string;
  cost: number;
  quantity: string;
  unit: string;
}

export interface BudgetCategory {
  name: string;
  budget: number;
  description: string;
  items: BudgetItem[];
}

export interface BudgetAnalysis {
  projectSummary: string;
  estimatedTotal: number;
  categories: BudgetCategory[];
  recommendations: string[];
  warnings: string[];
}

export interface ManualData {
  projectType: string;
  squareFootage: number | null;
  numberOfFloors: number | null;
  hasGarage: boolean;
  foundationSqft: number | null;
  floorSqftDetails: number[];
  finishQuality: "economique" | "standard" | "haut-de-gamme";
  additionalNotes?: string;
  garageFoundationType?: "dalle-monolithique" | "fondation";
  materialChoices: {
    exteriorSiding?: string;
    roofingType?: string;
    flooringType?: string;
    cabinetType?: string;
    countertopType?: string;
    heatingType?: string;
    windowType?: string;
    insulationType?: string;
  };
}

export interface BatchProgress {
  current: number;
  total: number;
  completed: number;
}

export interface BatchResult {
  categories?: RawAnalysisCategory[];
  extraction?: {
    categories?: RawAnalysisCategory[];
  };
  resume_projet?: string;
  totaux?: {
    total_ttc?: number;
  };
  recommandations?: string[];
  warnings?: string[];
}

interface RawAnalysisCategory {
  nom?: string;
  name?: string;
  sous_total_categorie?: number;
  budget?: number;
  items?: RawAnalysisItem[];
}

interface RawAnalysisItem {
  description?: string;
  name?: string;
  total?: number;
  cost?: number;
  quantite?: number | string;
  quantity?: number | string;
  unite?: string;
  unit?: string;
}

export interface AnalysisResult {
  success: boolean;
  analysis: BudgetAnalysis | null;
  batchStats: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// ============ Helper Functions ============

async function uploadPlanFile(
  file: File,
  projectId: string | null | undefined
): Promise<string> {
  // Check if a file with the same name already exists for this project
  if (projectId) {
    const { data: existingFile } = await supabase
      .from("task_attachments")
      .select("file_url")
      .eq("project_id", projectId)
      .eq("step_id", "budget")
      .eq("file_name", file.name)
      .eq("category", "plan")
      .maybeSingle();

    if (existingFile) {
      // File already exists, return existing URL instead of creating duplicate
      return existingFile.file_url;
    }
  }

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

  if (projectId) insertData.project_id = projectId;

  const { error: dbError } = await supabase.from("task_attachments").insert(insertData);
  if (dbError) throw dbError;

  return urlData.publicUrl;
}

async function ensureOptimizedUrls(
  urls: string[],
  projectId: string | null | undefined
): Promise<{ optimized: string[]; changed: boolean }> {
  const optimized: string[] = [];
  let changed = false;

  for (const url of urls) {
    try {
      const isLikelyJpeg = /\.(jpe?g)(\?|#|$)/i.test(url);
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
      const newUrl = await uploadPlanFile(compressed, projectId);
      optimized.push(newUrl);
      changed = true;
    } catch (e) {
      console.warn("Plan optimization failed, keeping original:", url, e);
      optimized.push(url);
    }
  }

  return { optimized, changed };
}

function transformRawToAnalysis(
  raw: BatchResult,
  totalImages: number
): BudgetAnalysis {
  const categories = raw.extraction?.categories || raw.categories || [];
  return {
    projectSummary: raw.resume_projet || `Analyse de ${totalImages} plan(s)`,
    estimatedTotal: raw.totaux?.total_ttc || 0,
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
    recommendations: raw.recommandations || [],
    warnings: raw.warnings || [],
  };
}

// ============ Hook ============

interface UsePlanAnalysisOptions {
  projectId?: string | null;
  onUrlsOptimized?: (urls: string[]) => void;
}

export function usePlanAnalysis(options: UsePlanAnalysisOptions = {}) {
  const { projectId, onUrlsOptimized } = options;
  const { t } = useTranslation();
  const { canUseAI, refetch: refetchLimits } = usePlanLimits();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  const analyzeManual = async (
    manualData: ManualData,
    stylePhotoUrls: string[],
    referenceImageUrls: string[]
  ): Promise<AnalysisResult> => {
    // Check AI limit before analyzing
    const aiCheck = canUseAI();
    if (!aiCheck.allowed) {
      setLimitError(aiCheck.message);
      toast.error(aiCheck.message);
      throw new Error(aiCheck.message);
    }
    
    setIsAnalyzing(true);
    setLimitError(null);
    
    try {
      const body = {
        mode: "manual",
        ...manualData,
        stylePhotoUrls: stylePhotoUrls.length > 0 ? stylePhotoUrls : undefined,
        referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
      };

      const { data, error } = await supabase.functions.invoke("analyze-plan", { body });
      
      if (error) throw error;
      
      if (data.success && data.data) {
        return {
          success: true,
          analysis: data.data as BudgetAnalysis,
          batchStats: { total: 1, succeeded: 1, failed: 0 },
        };
      }
      
      // Refresh limits after successful analysis
      await refetchLimits();
      
      throw new Error(data.error || "Échec de l'analyse");
    } catch (error) {
      console.error("Manual analysis error:", error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzePlans = async (
    planUrls: string[],
    manualData: ManualData,
    stylePhotoUrls: string[],
    referenceImageUrls: string[]
  ): Promise<AnalysisResult> => {
    if (planUrls.length === 0) {
      throw new Error("Aucun plan sélectionné");
    }

    // Check AI limit before analyzing
    const aiCheck = canUseAI();
    if (!aiCheck.allowed) {
      setLimitError(aiCheck.message);
      toast.error(aiCheck.message);
      throw new Error(aiCheck.message);
    }

    setIsAnalyzing(true);
    setLimitError(null);
    setBatchProgress(null);

    try {
      // Optimize images first
      toast.info(t("toasts.optimizingPlans"));
      const { optimized: planUrlsForAnalysis, changed } = await ensureOptimizedUrls(planUrls, projectId);
      
      if (changed) {
        onUrlsOptimized?.(planUrlsForAnalysis);
        toast.success(t("toasts.plansOptimized"));
      }

      // Batch analysis - 1 image at a time to avoid timeouts
      const BATCH_SIZE = 1;
      const totalImages = planUrlsForAnalysis.length;
      const totalBatches = Math.ceil(totalImages / BATCH_SIZE);
      
      const batchResults: BatchResult[] = [];
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

        const body = {
          mode: "plan",
          imageUrls: batchUrls,
          finishQuality: manualData.finishQuality,
          manualContext: manualData,
          stylePhotoUrls: batchIndex === 0 && stylePhotoUrls.length > 0 ? stylePhotoUrls : undefined,
          referenceImageUrls: batchIndex === 0 && referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          batchInfo: {
            batchIndex,
            totalBatches,
            totalImages,
            isPartialBatch: totalBatches > 1,
          },
        };

        const { data, error } = await supabase.functions.invoke("analyze-plan", { body });

        if (error) {
          console.error(`Batch ${batchIndex + 1} error:`, error);
          toast.error(t("toasts.batchError", { batch: batchIndex + 1, message: error.message }));
          failedBatches++;
          continue;
        }

        if (data.success && data.rawAnalysis) {
          batchResults.push(data.rawAnalysis as BatchResult);
        } else if (data.success && data.data) {
          batchResults.push({ categories: data.data.categories, extraction: data.data } as BatchResult);
        } else {
          failedBatches++;
        }
      }

      setBatchProgress(null);

      // Report partial failures to user
      const succeededBatches = totalBatches - failedBatches;
      if (failedBatches > 0 && succeededBatches > 0) {
        toast.warning(t("toasts.partialAnalysis", { succeeded: succeededBatches, total: totalBatches, failed: failedBatches }));
      }

      if (batchResults.length === 0) {
        return {
          success: false,
          analysis: null,
          batchStats: { total: totalBatches, succeeded: 0, failed: failedBatches },
        };
      }

      // Merge results
      let finalAnalysis: BudgetAnalysis;

      if (batchResults.length === 1 && totalBatches === 1) {
        // Single batch - try server merge for proper formatting
        const { data: finalData } = await supabase.functions.invoke("analyze-plan", {
          body: {
            mode: "merge",
            batchResults,
            finishQuality: manualData.finishQuality,
            manualContext: manualData,
            totalImages,
            materialChoices: manualData.materialChoices,
          },
        });

        if (finalData?.success && finalData?.data) {
          finalAnalysis = finalData.data as BudgetAnalysis;
        } else {
          finalAnalysis = transformRawToAnalysis(batchResults[0], totalImages);
        }
      } else {
        // Multiple batches - server merge required
        toast.info(t("toasts.mergingResults"));

        const { data: mergedData, error: mergeError } = await supabase.functions.invoke("analyze-plan", {
          body: {
            mode: "merge",
            batchResults,
            finishQuality: manualData.finishQuality,
            manualContext: manualData,
            totalImages,
            materialChoices: manualData.materialChoices,
          },
        });

        if (mergeError) throw mergeError;

        if (mergedData?.success && mergedData?.data) {
          finalAnalysis = mergedData.data as BudgetAnalysis;
        } else {
          throw new Error(mergedData?.error || "Échec de la fusion des résultats");
        }
      }

      // Refresh limits after successful analysis
      await refetchLimits();
      
      return {
        success: true,
        analysis: finalAnalysis,
        batchStats: {
          total: totalBatches,
          succeeded: succeededBatches,
          failed: failedBatches,
        },
      };
    } catch (error) {
      console.error("Plan analysis error:", error);
      throw error;
    } finally {
      setIsAnalyzing(false);
      setBatchProgress(null);
    }
  };

  return {
    isAnalyzing,
    batchProgress,
    limitError,
    analyzeManual,
    analyzePlans,
  };
}
