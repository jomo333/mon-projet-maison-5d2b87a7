import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getSignedUrl } from "@/hooks/useSignedUrl";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  Download,
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  DollarSign,
  Save,
  Maximize2,
  ArrowLeft,
  RefreshCw,
  Hammer,
} from "lucide-react";
import { toast } from "sonner";
import { AnalysisFullView } from "./AnalysisFullView";
import { DIYAnalysisView } from "./DIYAnalysisView";
import { SubCategoryManager, type SubCategory } from "./SubCategoryManager";

interface CategorySubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categoryName: string;
  categoryColor: string;
  currentBudget: number;
  currentSpent: number;
  onSave: (
    budget: number,
    spent: number,
    supplierInfo?: SupplierInfo,
    options?: { closeDialog?: boolean }
  ) => void;
}

interface SupplierInfo {
  name: string;
  phone: string;
  amount: number;
}

interface ExtractedContact {
  docName: string;
  supplierName: string;
  phone: string;
  amount: string;
  options?: SupplierOption[];
}

interface SupplierOption {
  name: string;
  amount: string;
  description?: string;
}

// Map category names to trade IDs for storage
const categoryToTradeId: Record<string, string> = {
  "Excavation et fondation": "excavation",
  "Structure et charpente": "charpente",
  "Toiture": "toiture",
  "Fenêtres et portes": "fenetre",
  "Isolation et pare-vapeur": "isolation",
  "Plomberie": "plomberie",
  "Électricité": "electricite",
  "Chauffage et ventilation (HVAC)": "hvac",
  "Revêtement extérieur": "exterieur",
  "Gypse et peinture": "gypse",
  "Revêtements de sol": "plancher",
  "Travaux ébénisterie (cuisine/SDB)": "armoires",
  "Finitions intérieures": "finitions",
};

export function CategorySubmissionsDialog({
  open,
  onOpenChange,
  projectId,
  categoryName,
  categoryColor,
  currentBudget,
  currentSpent,
  onSave,
}: CategorySubmissionsDialogProps) {
  const { t } = useTranslation();
  
  // Helper function to translate budget category names
  const translateCategoryName = (name: string): string => {
    const key = `budget.categories.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
  };
  
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const [budget, setBudget] = useState(currentBudget.toString());
  const [spent, setSpent] = useState(currentSpent.toString());
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [extractedSuppliers, setExtractedSuppliers] = useState<ExtractedContact[]>([]);
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [supplierLeadDays, setSupplierLeadDays] = useState<number | null>(null);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  
  // DIY AI Analysis state
  const [analyzingDIY, setAnalyzingDIY] = useState(false);
  const [diyAnalysisResult, setDiyAnalysisResult] = useState<string | null>(null);
  const [showDIYAnalysis, setShowDIYAnalysis] = useState(false);
  
  // Signed URLs for documents
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  
  // Sub-category state
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(null);
  const [viewingSubCategory, setViewingSubCategory] = useState(false);

  const tradeId =
    categoryToTradeId[categoryName] ||
    categoryName.toLowerCase().replace(/\s+/g, "-");

  // Get the current task ID (main category or sub-category)
  const getCurrentTaskId = () => {
    if (activeSubCategoryId) {
      return `soumission-${tradeId}-sub-${activeSubCategoryId}`;
    }
    return `soumission-${tradeId}`;
  };

  const currentTaskId = getCurrentTaskId();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setBudget(currentBudget.toString());
      setSpent(currentSpent.toString());
      setAnalysisResult(null);
      setExtractedSuppliers([]);
      setSelectedSupplierIndex(null);
      setSelectedOptionIndex(null);
      setActiveSubCategoryId(null);
      setViewingSubCategory(false);
      setDiyAnalysisResult(null);
      setShowDIYAnalysis(false);
    }
  }, [open, currentBudget, currentSpent]);
  
  // Fetch sub-categories for this category
  const { data: savedSubCategories = [] } = useQuery({
    queryKey: ['sub-categories', projectId, tradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dates')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .like('task_id', `soumission-${tradeId}-sub-%`);
      
      if (error) throw error;
      
      return (data || []).map((item) => {
        const notes = item.notes ? JSON.parse(item.notes) : {};
        return {
          id: item.task_id.replace(`soumission-${tradeId}-sub-`, ''),
          name: notes.subCategoryName || 'Sans nom',
          amount: notes.amount ? parseFloat(notes.amount) : 0,
          supplierName: notes.supplierName,
          supplierPhone: notes.supplierPhone,
          hasDocuments: false,
          hasAnalysis: notes.hasAnalysis || false,
          isDIY: notes.isDIY || false,
          materialCostOnly: notes.materialCostOnly ? parseFloat(notes.materialCostOnly) : 0,
        } as SubCategory;
      });
    },
    enabled: !!projectId && open,
  });
  
  // Sync saved sub-categories to state
  useEffect(() => {
    if (savedSubCategories.length > 0) {
      setSubCategories(savedSubCategories);
    }
  }, [savedSubCategories]);
  
  // Check documents count for sub-categories
  const { data: subCategoryDocs = [] } = useQuery({
    queryKey: ['sub-category-docs-count', projectId, tradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('task_id')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .like('task_id', `soumission-${tradeId}-sub-%`)
        .neq('category', 'analyse');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && open && subCategories.length > 0,
  });
  
  // Update sub-categories with document info
  useEffect(() => {
    if (subCategoryDocs.length > 0 && subCategories.length > 0) {
      const docsMap = subCategoryDocs.reduce((acc, doc) => {
        const subId = doc.task_id.replace(`soumission-${tradeId}-sub-`, '');
        acc[subId] = (acc[subId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      setSubCategories(prev => prev.map(sc => ({
        ...sc,
        hasDocuments: (docsMap[sc.id] || 0) > 0,
      })));
    }
  }, [subCategoryDocs, tradeId]);

  // Fetch existing documents for this category or sub-category (excluding analysis summaries)
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['category-docs', projectId, currentTaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', currentTaskId)
        .neq('category', 'analyse'); // Exclude analysis summaries
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && open,
  });

  // Generate signed URLs for documents
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!documents.length || !user) return;
      
      const urlMap = new Map<string, string>();
      await Promise.all(
        documents.map(async (doc) => {
          const bucketMarker = "/task-attachments/";
          const markerIndex = doc.file_url.indexOf(bucketMarker);
          if (markerIndex >= 0) {
            const path = doc.file_url.slice(markerIndex + bucketMarker.length).split("?")[0];
            const signedUrl = await getSignedUrl("task-attachments", path);
            if (signedUrl) {
              urlMap.set(doc.id, signedUrl);
            }
          }
        })
      );
      setSignedUrls(urlMap);
    };
    generateSignedUrls();
  }, [documents, user]);

  // Fetch existing supplier status for current category/sub-category
  const { data: supplierStatus } = useQuery({
    queryKey: ['supplier-status', projectId, currentTaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dates')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', currentTaskId)
        .maybeSingle();
      
      if (error) throw error;
      if (data?.notes) {
        try {
          return JSON.parse(data.notes);
        } catch {
          return null;
        }
      }
      return null;
    },
    enabled: !!projectId && open,
  });

  // Set supplier info from saved status when changing category/sub-category
  useEffect(() => {
    if (supplierStatus) {
      setSupplierName(supplierStatus.supplierName || "");
      setSupplierPhone(supplierStatus.supplierPhone || "");
      setContactPerson(supplierStatus.contactPerson || "");
      setContactPersonPhone(supplierStatus.contactPersonPhone || "");
      setSupplierLeadDays(supplierStatus.supplierLeadDays ?? null);
      setSelectedAmount(supplierStatus.amount || "");
    } else {
      // Reset if no supplier status
      setSupplierName("");
      setSupplierPhone("");
      setContactPerson("");
      setContactPersonPhone("");
      setSupplierLeadDays(null);
      setSelectedAmount("");
    }
    // Reset analysis state when changing sub-category
    setAnalysisResult(null);
    setExtractedSuppliers([]);
    setSelectedSupplierIndex(null);
    setSelectedOptionIndex(null);
  }, [supplierStatus, currentTaskId]);

  // Sanitize filename for storage (remove spaces and special characters)
  const sanitizeFileName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_'); // Replace multiple underscores with single
  };

  // Upload mutation - uses currentTaskId for sub-category support
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Non authentifié");
      
      const sanitizedName = sanitizeFileName(file.name);
      const subPath = activeSubCategoryId ? `${tradeId}/sub-${activeSubCategoryId}` : tradeId;
      // Path format: user_id/project_id/soumissions/trade/filename
      const fileName = `${user.id}/${projectId}/soumissions/${subPath}/${Date.now()}_${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Generate signed URL
      const signedUrl = await getSignedUrl("task-attachments", fileName);
      if (!signedUrl) throw new Error("Failed to generate signed URL");

      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          project_id: projectId,
          step_id: 'soumissions',
          task_id: currentTaskId,
          file_name: file.name,
          file_url: signedUrl,
          file_type: file.type,
          file_size: file.size,
          category: 'soumission',
        });

      if (dbError) throw dbError;
      return signedUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-docs', projectId, currentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['sub-category-docs-count', projectId, tradeId] });
      toast.success(t("toasts.docUploaded"));
      setUploading(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(t("toasts.uploadError"));
      setUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-docs', projectId, currentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['sub-category-docs-count', projectId, tradeId] });
      toast.success(t("toasts.docDeleted"));
    },
  });

  // Delete supplier from database (for current category or sub-category)
  const handleDeleteSupplier = async () => {
    // Delete from database first
    const { error } = await supabase
      .from('task_dates')
      .delete()
      .eq('project_id', projectId)
      .eq('step_id', 'soumissions')
      .eq('task_id', currentTaskId);

    if (error) {
      console.error("Error deleting supplier:", error);
      toast.error(t("toasts.deleteError"));
      return;
    }

    // Reset local state to allow new analysis
    setSupplierName("");
    setSupplierPhone("");
    setContactPerson("");
    setContactPersonPhone("");
    setSelectedAmount("");
    setSelectedSupplierIndex(null);
    setSelectedOptionIndex(null);
    setAnalysisResult(null);
    setExtractedSuppliers([]);

    // If in sub-category, update the sub-category amount
    if (activeSubCategoryId) {
      setSubCategories(prev => prev.map(sc => 
        sc.id === activeSubCategoryId 
          ? { ...sc, amount: 0, supplierName: undefined, supplierPhone: undefined, hasAnalysis: false }
          : sc
      ));
      // Recalculate total spent from remaining sub-categories
      const newTotalSpent = subCategories
        .filter(sc => sc.id !== activeSubCategoryId)
        .reduce((sum, sc) => sum + (sc.amount || 0), 0);
      setSpent(newTotalSpent.toString());
    } else {
      setSpent("0");
      // Update budget spent to 0
      onSave(parseFloat(budget) || 0, 0, undefined, { closeDialog: false });
    }
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['supplier-status', projectId, currentTaskId] });
    queryClient.invalidateQueries({ queryKey: ['sub-categories', projectId, tradeId] });
    
    toast.success(t("toasts.supplierDeleted"));
    
    // Stay on the dialog for new analysis (don't close)
  };
  
  // Sub-category handlers
  const handleAddSubCategory = async (name: string, isDIY?: boolean) => {
    const id = Date.now().toString();
    const newSubCategory: SubCategory = {
      id,
      name,
      amount: 0,
      hasDocuments: false,
      hasAnalysis: false,
      isDIY: isDIY || false,
      materialCostOnly: 0,
    };
    
    // Save to database immediately
    const notes = JSON.stringify({
      subCategoryName: name,
      amount: "0",
      isDIY: isDIY || false,
      materialCostOnly: 0,
    });
    
    await supabase
      .from('task_dates')
      .insert({
        project_id: projectId,
        step_id: 'soumissions',
        task_id: `soumission-${tradeId}-sub-${id}`,
        notes,
      });
    
    setSubCategories(prev => [...prev, newSubCategory]);
    queryClient.invalidateQueries({ queryKey: ['sub-categories', projectId, tradeId] });
    
    // Automatically select the new sub-category
    setActiveSubCategoryId(id);
    setViewingSubCategory(true);
    
    toast.success(isDIY ? t("toasts.subCategoryAddedDiy", { name }) : t("toasts.subCategoryAdded", { name }));
  };
  
  const handleRemoveSubCategory = async (id: string) => {
    // Delete from database
    await supabase
      .from('task_dates')
      .delete()
      .eq('project_id', projectId)
      .eq('step_id', 'soumissions')
      .eq('task_id', `soumission-${tradeId}-sub-${id}`);
    
    // Delete associated documents
    await supabase
      .from('task_attachments')
      .delete()
      .eq('project_id', projectId)
      .eq('step_id', 'soumissions')
      .eq('task_id', `soumission-${tradeId}-sub-${id}`);
    
    const removedSubCat = subCategories.find(sc => sc.id === id);
    setSubCategories(prev => prev.filter(sc => sc.id !== id));
    
    // Update total spent
    if (removedSubCat) {
      const newTotalSpent = subCategories
        .filter(sc => sc.id !== id)
        .reduce((sum, sc) => sum + (sc.amount || 0), 0);
      setSpent(newTotalSpent.toString());
    }
    
    // If we were viewing this sub-category, go back
    if (activeSubCategoryId === id) {
      setActiveSubCategoryId(null);
      setViewingSubCategory(false);
    }
    
    queryClient.invalidateQueries({ queryKey: ['sub-categories', projectId, tradeId] });
    queryClient.invalidateQueries({ queryKey: ['sub-category-docs-count', projectId, tradeId] });
    
    toast.success(t("toasts.subcategoryDeleted"));
  };
  
  const handleSelectSubCategory = (id: string) => {
    setActiveSubCategoryId(id);
    setViewingSubCategory(true);
  };
  
  const handleBackToMainCategory = () => {
    setActiveSubCategoryId(null);
    setViewingSubCategory(false);
    setDiyAnalysisResult(null);
    setShowDIYAnalysis(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      uploadMutation.mutate(files[0]);
    }
    e.target.value = '';
  };

  // Fetch project plans for DIY analysis
  const { data: projectPlans = [] } = useQuery({
    queryKey: ['project-plans', projectId],
    queryFn: async () => {
      // Get plans from task_attachments (budget-plans folder)
      const { data: attachments, error: attachmentsError } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('project_id', projectId)
        .in('step_id', ['plans', 'budget-analysis']);
      
      if (attachmentsError) throw attachmentsError;
      
      // Also check for plans uploaded in budget-plans storage path
      const { data: storagePlans, error: storageError } = await supabase.storage
        .from('task-attachments')
        .list(`budget-plans`, { limit: 20 });
      
      const budgetPlanUrls: string[] = [];
      if (!storageError && storagePlans) {
        for (const file of storagePlans) {
          const { data: urlData } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(`budget-plans/${file.name}`);
          if (urlData?.publicUrl) {
            budgetPlanUrls.push(urlData.publicUrl);
          }
        }
      }
      
      // Combine all plan URLs
      const allPlanUrls = [
        ...(attachments || []).map(a => a.file_url),
        ...budgetPlanUrls,
      ].filter((url, index, self) => self.indexOf(url) === index); // dedupe
      
      return allPlanUrls;
    },
    enabled: !!projectId && open,
  });

  // Fetch project details for DIY analysis context
  const { data: projectDetails } = useQuery({
    queryKey: ['project-details', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && open,
  });

  // DIY AI Material Analysis
  const analyzeDIYMaterials = async () => {
    const currentSubCat = subCategories.find(sc => sc.id === activeSubCategoryId);
    if (!currentSubCat) {
      toast.error(t("toasts.selectSubcategory"));
      return;
    }

    setAnalyzingDIY(true);
    setDiyAnalysisResult("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-diy-materials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            categoryName,
            subCategoryName: currentSubCat.name,
            planUrls: projectPlans.slice(0, 3), // Max 3 plans
            projectDetails: projectDetails ? {
              squareFootage: projectDetails.square_footage,
              numberOfFloors: projectDetails.number_of_floors,
              projectType: projectDetails.project_type,
              notes: projectDetails.description,
            } : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error(t("toasts.rateLimit"));
          return;
        }
        if (response.status === 402) {
          toast.error(t("toasts.insufficientCredits"));
          return;
        }
        throw new Error(errorData.error || "Erreur lors de l'analyse");
      }

      if (!response.body) {
        throw new Error("Pas de réponse du serveur");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              result += content;
              setDiyAnalysisResult(result);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setDiyAnalysisResult(result);
      setShowDIYAnalysis(true);
      toast.success(t("toasts.diyAnalysisDone"));
      
      // Try to extract estimated cost from analysis
      const costMatch = result.match(/\*\*TOTAL ESTIMÉ\*\*[^$]*\*?\*?([0-9\s,]+(?:\.[0-9]+)?)\s*\$/i);
      if (costMatch) {
        const estimatedCost = parseFloat(costMatch[1].replace(/[\s,]/g, '')) || 0;
        if (estimatedCost > 0) {
          toast.info(t("toasts.estimatedMaterialCost", { amount: Math.round(estimatedCost).toLocaleString('fr-CA') }), {
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error("DIY Analysis error:", error);
      toast.error(error instanceof Error ? error.message : t("toasts.diyAnalysisError"));
    } finally {
      setAnalyzingDIY(false);
    }
  };

  // AI Analysis
  const analyzeDocuments = async () => {
    if (documents.length === 0) {
      toast.error(t("toasts.uploadPlansFirst"));
      return;
    }

    setAnalyzing(true);
    setAnalysisResult("");

    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Session invalide. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-soumissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            tradeName: categoryName,
            tradeDescription: `Soumissions pour ${categoryName}`,
            documents: documents.map(d => ({
              file_name: d.file_name,
              file_url: d.file_url,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'analyse");
      }

      if (!response.body) {
        throw new Error("Pas de réponse du serveur");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              result += content;
              setAnalysisResult(result);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setAnalysisResult(result);
      toast.success(t("toasts.analysisDone"));
      
      // Try to extract contacts from analysis
      const contacts = parseExtractedContacts(result);
      setExtractedSuppliers(contacts);
      
      // Don't auto-select, let user choose
      if (contacts.length > 0) {
        toast.info(t("toasts.suppliersDetected", { count: contacts.length }));
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : t("toasts.analysisError"));
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle supplier selection
  const handleSelectSupplier = (index: number) => {
    setSelectedSupplierIndex(index);
    setSelectedOptionIndex(null);
    const supplier = extractedSuppliers[index];
    if (supplier) {
      setSupplierName(supplier.supplierName);
      setSupplierPhone(supplier.phone);
      // Parse amount: remove spaces, keep digits and decimal point, then parse as float and round
      const cleanAmount = Math.round(parseFloat(supplier.amount.replace(/[\s,]/g, '').replace(/[^\d.]/g, '')) || 0).toString();
      setSelectedAmount(cleanAmount);
      setSpent(cleanAmount);
    }
  };

  // Handle option selection
  const handleSelectOption = (optionIndex: number) => {
    setSelectedOptionIndex(optionIndex);
    if (selectedSupplierIndex !== null) {
      const supplier = extractedSuppliers[selectedSupplierIndex];
      const option = supplier?.options?.[optionIndex];
      if (option) {
        // Parse amount: remove spaces, keep digits and decimal point, then parse as float and round
        const cleanAmount = Math.round(parseFloat(option.amount.replace(/[\s,]/g, '').replace(/[^\d.]/g, '')) || 0).toString();
        setSelectedAmount(cleanAmount);
        setSpent(cleanAmount);
      }
    }
  };

  // Parse contacts from AI analysis - supports multiple formats
  const parseExtractedContacts = (analysisResult: string): ExtractedContact[] => {
    const contacts: ExtractedContact[] = [];
    
    // Try to extract from the new emoji-based format
    // Look for patterns like "🏢 Nom Entreprise" followed by "📞 Téléphone:" and "💰 Montant:"
    const companyBlocks = analysisResult.split(/(?=\*\*🏢)/);
    
    for (const block of companyBlocks) {
      if (!block.includes('🏢')) continue;
      
      const nameMatch = block.match(/🏢\s*\*?\*?([^*\n]+)/);
      const phoneMatch = block.match(/📞\s*(?:Téléphone\s*:?\s*)?([0-9\-\.\s\(\)]+)/);
      
      // Multiple patterns for amounts - more flexible matching (supports decimals and spaces)
      let amount = '';
      
      // Pattern 1: Montant avant taxes: 30 833.04 $ or Montant avant taxes: 30 833 $
      const amountMatch1 = block.match(/Montant\s*avant\s*taxes\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/i);
      // Pattern 2: Prix avant taxes: X $ 
      const amountMatch2 = block.match(/Prix\s*avant\s*taxes\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/i);
      // Pattern 3: Sous-total: X $
      const amountMatch3 = block.match(/Sous-total\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/i);
      // Pattern 4: Total avec taxes: X $ (fallback - will use net price if available)
      const amountMatch4 = block.match(/Total\s*avec\s*taxes\s*:?\s*\*?\*?([0-9\s,]+(?:\.[0-9]+)?)\s*\$\*?\*?/i);
      // Pattern 5: Any number followed by $ in the pricing section
      const amountMatch5 = block.match(/💰[^$]*?([0-9]{1,3}(?:[\s,][0-9]{3})*(?:\.[0-9]+)?)\s*\$/);
      
      // Priority: before taxes > subtotal > with taxes
      if (amountMatch1) amount = amountMatch1[1].replace(/[\s,]/g, '');
      else if (amountMatch2) amount = amountMatch2[1].replace(/[\s,]/g, '');
      else if (amountMatch3) amount = amountMatch3[1].replace(/[\s,]/g, '');
      else if (amountMatch5) amount = amountMatch5[1].replace(/[\s,]/g, '');
      else if (amountMatch4) amount = amountMatch4[1].replace(/[\s,]/g, '');
      
      if (nameMatch) {
        // Try to extract options from the block
        const options: SupplierOption[] = [];
        
        // Look for option patterns like "Option A: X $" or "Forfait Premium: X $"
        const optionMatches = block.matchAll(/(?:Option|Forfait|Package|OPTION)\s*(?:SÉPARÉE\s*:?\s*)?([A-Za-zÀ-ÿ0-9\s]+?)\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/gi);
        for (const match of optionMatches) {
          options.push({
            name: match[1].trim(),
            amount: match[2].replace(/[\s,]/g, ''),
          });
        }
        
        contacts.push({
          docName: '',
          supplierName: nameMatch[1].trim().replace(/\*+/g, ''),
          phone: phoneMatch ? phoneMatch[1].trim() : '',
          amount: amount,
          options: options.length > 0 ? options : undefined,
        });
      }
    }
    
    // Try to extract amounts from comparison table for suppliers without amounts
    const tableAmounts: Record<string, string> = {};
    const tableRows = analysisResult.matchAll(/\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*\*?\*?([0-9\s,]+)\s*\$\*?\*?\s*\|/g);
    for (const row of tableRows) {
      const name = row[1].trim();
      const amt = row[2].replace(/[\s,]/g, '');
      if (name && !name.includes('Entreprise') && !name.includes('---') && !name.includes('Critère') && amt) {
        tableAmounts[name.toLowerCase()] = amt;
      }
    }
    
    // Fill in missing amounts from table
    for (const contact of contacts) {
      if (!contact.amount) {
        const key = contact.supplierName.toLowerCase();
        for (const [tableName, tableAmt] of Object.entries(tableAmounts)) {
          if (key.includes(tableName) || tableName.includes(key)) {
            contact.amount = tableAmt;
            break;
          }
        }
      }
    }
    
    // If no contacts found, try to extract from comparison table directly
    if (contacts.length === 0) {
      for (const [name, amt] of Object.entries(tableAmounts)) {
        contacts.push({
          docName: '',
          supplierName: name.charAt(0).toUpperCase() + name.slice(1),
          phone: '',
          amount: amt,
        });
      }
    }
    
    // Fallback: try old format with ```contacts block
    if (contacts.length === 0) {
      const contactsMatch = analysisResult.match(/```contacts\n([\s\S]*?)```/);
      if (contactsMatch) {
        const lines = contactsMatch[1].split('\n').filter(line => line.trim() && line.includes('|'));
        for (const line of lines) {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length >= 4) {
            contacts.push({
              docName: parts[0],
              supplierName: parts[1],
              phone: parts[2],
              amount: parts[3],
            });
          }
        }
      }
    }
    
    console.log("Extracted suppliers:", contacts);
    return contacts;
  };

  // Save analysis summary as a document
  const saveAnalysisSummary = async (summary: string) => {
    if (!summary) return null;
    
    // Create a text file blob from the summary
    const blob = new Blob([summary], { type: 'text/markdown' });
    const subCatName = activeSubCategoryId 
      ? subCategories.find(sc => sc.id === activeSubCategoryId)?.name || ''
      : '';
    const fileName = `Analyse_IA_${categoryName.replace(/[^a-zA-Z0-9]/g, '_')}${subCatName ? `_${subCatName.replace(/[^a-zA-Z0-9]/g, '_')}` : ''}_${new Date().toISOString().split('T')[0]}.md`;
    const sanitizedFileName = sanitizeFileName(fileName);
    const subPath = activeSubCategoryId ? `${tradeId}/sub-${activeSubCategoryId}` : tradeId;
    const storagePath = `${projectId}/soumissions/${subPath}/analyses/${Date.now()}_${sanitizedFileName}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(storagePath, blob);

    if (uploadError) {
      console.error("Error uploading analysis summary:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(storagePath);

    // Save to task_attachments
    const { error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        project_id: projectId,
        step_id: 'soumissions',
        task_id: currentTaskId,
        file_name: `Résumé analyse IA - ${categoryName}${subCatName ? ` (${subCatName})` : ''}`,
        file_url: urlData.publicUrl,
        file_type: 'text/markdown',
        file_size: blob.size,
        category: 'analyse',
      });

    if (dbError) {
      console.error("Error saving analysis to DB:", dbError);
      return null;
    }

    return urlData.publicUrl;
  };

  // Save everything
  const handleSave = async (saveAnalysis = false, keepDialogOpen = false) => {
    const budgetValue = parseFloat(budget) || 0;
    let finalSpentValue = parseFloat(spent) || parseFloat(selectedAmount) || 0;
    
    // If we're in a sub-category, update the sub-category data
    if (activeSubCategoryId && supplierName) {
      const subCatAmount = parseFloat(selectedAmount) || 0;
      const subCatName = subCategories.find(sc => sc.id === activeSubCategoryId)?.name || '';
      
      // Save sub-category supplier info
      const notes = JSON.stringify({
        subCategoryName: subCatName,
        supplierName,
        supplierPhone,
        contactPerson,
        contactPersonPhone,
        supplierLeadDays,
        amount: selectedAmount,
        hasAnalysis: !!analysisResult,
        isCompleted: true,
      });

      const { data: existing } = await supabase
        .from('task_dates')
        .select('id')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', currentTaskId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('task_dates')
          .update({ notes })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('task_dates')
          .insert({
            project_id: projectId,
            step_id: 'soumissions',
            task_id: currentTaskId,
            notes,
          });
      }
      
      // Update local sub-category state
      setSubCategories(prev => prev.map(sc => 
        sc.id === activeSubCategoryId 
          ? { ...sc, amount: subCatAmount, supplierName, supplierPhone, hasAnalysis: !!analysisResult }
          : sc
      ));
      
      // Calculate total spent from all sub-categories
      finalSpentValue = subCategories.reduce((sum, sc) => {
        if (sc.id === activeSubCategoryId) {
          return sum + subCatAmount;
        }
        return sum + (sc.amount || 0);
      }, 0);
      
      setSpent(finalSpentValue.toString());
    } else if (!activeSubCategoryId && supplierName) {
      // Main category - save supplier info
      const notes = JSON.stringify({
        supplierName,
        supplierPhone,
        contactPerson,
        contactPersonPhone,
        supplierLeadDays,
        amount: selectedAmount,
        isCompleted: true,
      });

      const { data: existing } = await supabase
        .from('task_dates')
        .select('id')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', currentTaskId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('task_dates')
          .update({ notes })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('task_dates')
          .insert({
            project_id: projectId,
            step_id: 'soumissions',
            task_id: currentTaskId,
            notes,
          });
      }
    }
    
    // Save analysis summary if requested
    if (saveAnalysis && analysisResult) {
      await saveAnalysisSummary(analysisResult);
      const subCatName = activeSubCategoryId 
        ? subCategories.find(sc => sc.id === activeSubCategoryId)?.name 
        : null;
      toast.success(`Le résumé a été enregistré dans vos dossiers sous "Soumissions > ${categoryName}${subCatName ? ` > ${subCatName}` : ''}"`, {
        duration: 5000,
      });
    }

    onSave(
      budgetValue,
      finalSpentValue,
      supplierName
        ? {
            name: supplierName,
            phone: supplierPhone,
            amount: finalSpentValue,
          }
        : undefined,
      { closeDialog: !keepDialogOpen }
    );
    
    queryClient.invalidateQueries({ queryKey: ['supplier-status', projectId, currentTaskId] });
    queryClient.invalidateQueries({ queryKey: ['category-docs', projectId, currentTaskId] });
    queryClient.invalidateQueries({ queryKey: ['sub-categories', projectId, tradeId] });
    
    if (!saveAnalysis) {
      toast.success(activeSubCategoryId ? "Sous-catégorie mise à jour" : "Catégorie mise à jour");
    }
    
    // Only close dialog if not keeping it open
    if (!keepDialogOpen) {
      onOpenChange(false);
    }
  };
  
  // Get current sub-category name for display
  const currentSubCategoryName = activeSubCategoryId 
    ? subCategories.find(sc => sc.id === activeSubCategoryId)?.name 
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {viewingSubCategory && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-1"
                onClick={handleBackToMainCategory}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: categoryColor }}
            />
            {translateCategoryName(categoryName)}
            {currentSubCategoryName && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-primary">{currentSubCategoryName}</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {viewingSubCategory 
              ? t("categorySubmissions.manageSubmissionsFor", { name: currentSubCategoryName })
              : t("categorySubmissions.manageBudgetAndSubmissions")
            }
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1 min-h-0">
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
            {/* Budget Section - Only show on main view */}
            {!viewingSubCategory && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget estimé ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spent">
                      Coût réel total ($)
                      {subCategories.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (somme des sous-catégories)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="spent"
                      type="number"
                      value={spent}
                      onChange={(e) => setSpent(e.target.value)}
                      placeholder="0"
                      readOnly={subCategories.length > 0}
                      className={subCategories.length > 0 ? "bg-muted" : ""}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Sub-Categories Section - Only show on main view */}
            {!viewingSubCategory && (
              <SubCategoryManager
                subCategories={subCategories}
                onAddSubCategory={handleAddSubCategory}
                onRemoveSubCategory={handleRemoveSubCategory}
                onSelectSubCategory={handleSelectSubCategory}
                activeSubCategoryId={activeSubCategoryId}
                categoryName={categoryName}
              />
            )}

            {/* DIY Mode Section - Show when viewing a DIY sub-category */}
            {viewingSubCategory && activeSubCategoryId && (() => {
              const currentSubCat = subCategories.find(sc => sc.id === activeSubCategoryId);
              if (!currentSubCat?.isDIY) return null;
              
              return (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
                      <Hammer className="h-5 w-5" />
                      Fait par moi-même
                    </h4>
                    <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                      Matériaux seulement
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Analysez automatiquement les coûts des matériaux basés sur vos plans ou entrez manuellement le montant.
                  </p>

                  {/* AI Analysis Button for DIY */}
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Analyse IA des matériaux
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                          {projectPlans.length > 0 
                            ? `Estimation basée sur ${projectPlans.length} plan(s) téléchargé(s)`
                            : "Téléchargez des plans dans l'analyse de budget pour une estimation précise"
                          }
                        </p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={analyzeDIYMaterials}
                        disabled={analyzingDIY}
                        className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {analyzingDIY ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {analyzingDIY ? "Analyse..." : "Analyser"}
                      </Button>
                    </div>
                  </div>

                  {/* DIY Analysis Result - Preview Card */}
                  {diyAnalysisResult && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-background p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium flex items-center gap-2 text-amber-800 dark:text-amber-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Analyse des matériaux terminée
                          </h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Liste détaillée des matériaux avec prix Québec 2025
                          </p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowDIYAnalysis(true)}
                          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Maximize2 className="h-4 w-4" />
                          Voir le résumé complet
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Material Cost Input */}
                  <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                    <Label htmlFor="material-cost" className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <DollarSign className="h-4 w-4" />
                      Coût total des matériaux
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="material-cost"
                        type="number"
                        value={currentSubCat.materialCostOnly || ''}
                        onChange={async (e) => {
                          const newCost = parseFloat(e.target.value) || 0;
                          // Update local state
                          setSubCategories(prev => prev.map(sc =>
                            sc.id === activeSubCategoryId
                              ? { ...sc, materialCostOnly: newCost, amount: newCost }
                              : sc
                          ));
                        }}
                        placeholder="0"
                        className="max-w-[200px]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const currentSubCat = subCategories.find(sc => sc.id === activeSubCategoryId);
                          if (!currentSubCat) return;
                          
                          const materialCost = currentSubCat.materialCostOnly || 0;
                          
                          // Save to database
                          const existingNotes = supplierStatus || {};
                          const updatedNotes = JSON.stringify({
                            ...existingNotes,
                            subCategoryName: currentSubCat.name,
                            amount: materialCost.toString(),
                            materialCostOnly: materialCost,
                            isDIY: true,
                            hasDIYAnalysis: !!diyAnalysisResult,
                          });
                          
                          await supabase
                            .from('task_dates')
                            .upsert({
                              project_id: projectId,
                              step_id: 'soumissions',
                              task_id: currentTaskId,
                              notes: updatedNotes,
                            }, { onConflict: 'project_id,step_id,task_id' });
                          
                          // Update sub-category with amount
                          setSubCategories(prev => prev.map(sc =>
                            sc.id === activeSubCategoryId
                              ? { ...sc, amount: materialCost }
                              : sc
                          ));
                          
                          // Update total spent
                          const newTotalSpent = subCategories
                            .map(sc => sc.id === activeSubCategoryId ? materialCost : sc.amount)
                            .reduce((sum, amt) => sum + (amt || 0), 0);
                          setSpent(newTotalSpent.toString());
                          
                          queryClient.invalidateQueries({ queryKey: ['sub-categories', projectId, tradeId] });
                          queryClient.invalidateQueries({ queryKey: ['supplier-status', projectId, currentTaskId] });
                          
                          toast.success(t("toasts.materialsCostSaved"));
                        }}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                  
                  {currentSubCat.materialCostOnly && currentSubCat.materialCostOnly > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Économie estimée: main-d'œuvre non facturée
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Documents Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Soumissions ({documents.length})
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById(`upload-${currentTaskId}`)?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2">Télécharger</span>
                  </Button>
                  <input
                    id={`upload-${currentTaskId}`}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {documents.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={analyzing}
                      onClick={analyzeDocuments}
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="ml-2">Analyser IA</span>
                    </Button>
                  )}
                </div>
              </div>

              {loadingDocs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune soumission téléchargée</p>
                  <p className="text-xs">Cliquez sur "Télécharger" pour ajouter des documents</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate">{doc.file_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Supplier Summary - Show when supplier is chosen - PRIORITY DISPLAY */}
            {supplierName && (
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-3 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2 text-lg text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    Fournisseur retenu
                    {currentSubCategoryName && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {currentSubCategoryName}
                      </Badge>
                    )}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteSupplier}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                    <Badge className="bg-primary text-primary-foreground">
                      Confirmé
                    </Badge>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">Entreprise:</span>
                      <span className="font-semibold">🏢 {supplierName}</span>
                    </div>
                    {supplierPhone && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">Téléphone:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {supplierPhone}
                        </span>
                      </div>
                    )}
                    {contactPerson && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">Contact:</span>
                        <span className="font-medium flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {contactPerson}
                          {contactPersonPhone && ` - ${contactPersonPhone}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Coût retenu</div>
                      <div className="font-bold text-2xl text-primary">
                        {parseInt(spent || selectedAmount || '0').toLocaleString('fr-CA')} $
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis Result - Compact Preview */}
            {analysisResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Analyse terminée
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullAnalysis(true)}
                    className="gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Voir le résumé de l'analyse
                  </Button>
                </div>
                <div className="rounded-lg border bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {extractedSuppliers.length} fournisseur(s) détecté(s)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {supplierName 
                          ? "Fournisseur sélectionné. Cliquez sur 'Voir le résumé' pour modifier."
                          : "Cliquez sur 'Voir le résumé' pour consulter l'analyse et sélectionner votre fournisseur"
                        }
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      IA
                    </Badge>
                  </div>
                </div>
                
                {/* Option to update estimated budget from analysis */}
                {extractedSuppliers.length > 0 && !viewingSubCategory && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Corriger le budget estimé (matériaux)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mettre à jour le budget prévu selon la moyenne des soumissions reçues
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Calculate average from extracted suppliers
                          const total = extractedSuppliers.reduce((sum, s) => sum + parseInt(s.amount || '0'), 0);
                          const average = Math.round(total / extractedSuppliers.length);
                          setBudget(average.toString());
                          toast.success(`Budget estimé mis à jour: ${average.toLocaleString('fr-CA')} $`);
                        }}
                        className="gap-2 shrink-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Appliquer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Supplier Selection Cards - shown after analysis */}
            {extractedSuppliers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Choisir le fournisseur retenu
                </h4>
                <div className="grid gap-3">
                  {extractedSuppliers.map((supplier, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectSupplier(index)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSupplierIndex === index
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {selectedSupplierIndex === index && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                            🏢 {supplier.supplierName}
                          </div>
                          {supplier.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-primary">
                            {parseInt(supplier.amount).toLocaleString('fr-CA')} $
                          </div>
                          <div className="text-xs text-muted-foreground">avant taxes</div>
                        </div>
                      </div>

                      {/* Options for this supplier */}
                      {selectedSupplierIndex === index && supplier.options && supplier.options.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <Label className="text-sm font-medium">Options disponibles:</Label>
                          <div className="grid gap-2">
                            {supplier.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOption(optIndex);
                                }}
                                className={`p-3 rounded border cursor-pointer transition-all ${
                                  selectedOptionIndex === optIndex
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{option.name}</span>
                                  <span className="font-bold text-primary">
                                    {parseInt(option.amount).toLocaleString('fr-CA')} $
                                  </span>
                                </div>
                                {option.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Supplier Entry or Selected Supplier Details */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {extractedSuppliers.length > 0 ? 'Fiche du fournisseur retenu' : 'Fournisseur retenu'}
              </h4>
              
              {selectedSupplierIndex !== null && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Sélectionné depuis l'analyse
                </Badge>
              )}

              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Nom du fournisseur</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="supplier-name"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Nom de l'entreprise"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-phone">Téléphone entreprise</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supplier-phone"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        placeholder="514-XXX-XXXX"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-amount">Montant retenu ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supplier-amount"
                        type="number"
                        value={selectedAmount}
                        onChange={(e) => {
                          setSelectedAmount(e.target.value);
                          setSpent(e.target.value);
                        }}
                        placeholder="0"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Person Section */}
                <div className="pt-3 border-t">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Personne à contacter (optionnel)
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="contact-person">Nom du contact</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contact-person"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="Jean Tremblay"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-person-phone">Téléphone direct</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contact-person-phone"
                          value={contactPersonPhone}
                          onChange={(e) => setContactPersonPhone(e.target.value)}
                          placeholder="514-XXX-XXXX"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplier Notice Section - Only show when supplier is selected */}
                {supplierName && (
                  <div className="mt-4 p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-full shrink-0">
                        <Phone className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-semibold text-amber-700 dark:text-amber-400 text-base">
                            {t("categorySubmissions.supplierNotice.title")}
                          </h4>
                          <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
                            {t("categorySubmissions.supplierNotice.description")}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-lead-days" className="text-amber-700 dark:text-amber-400 font-medium">
                            {t("categorySubmissions.supplierNotice.label")}
                          </Label>
                          <div className="relative max-w-xs">
                            <Input
                              id="supplier-lead-days"
                              type="number"
                              min={0}
                              value={supplierLeadDays ?? ""}
                              onChange={(e) => setSupplierLeadDays(e.target.value ? parseInt(e.target.value) : null)}
                              placeholder={t("categorySubmissions.supplierNotice.placeholder")}
                              className="border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/30"
                            />
                          </div>
                          <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                            {t("categorySubmissions.supplierNotice.tooltip")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {supplierStatus?.isCompleted && (
                  <Badge variant="secondary" className="w-fit bg-success/10 text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Fournisseur confirmé
                  </Badge>
                )}
              </div>
            </div>
          </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => handleSave(false)}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Full Analysis View */}
      <AnalysisFullView
        open={showFullAnalysis}
        onOpenChange={setShowFullAnalysis}
        categoryName={categoryName}
        categoryColor={categoryColor}
        analysisResult={analysisResult || ''}
        extractedSuppliers={extractedSuppliers}
        selectedSupplierIndex={selectedSupplierIndex}
        selectedOptionIndex={selectedOptionIndex}
        onSelectSupplier={handleSelectSupplier}
        onSelectOption={handleSelectOption}
        onConfirmSelection={async () => {
          await handleSave(true, true); // Save with analysis summary, keep dialog open
          setShowFullAnalysis(false); // Close the full view, return to main dialog
        }}
      />

      {/* DIY Analysis Full View */}
      <DIYAnalysisView
        open={showDIYAnalysis}
        onOpenChange={setShowDIYAnalysis}
        categoryName={categoryName}
        subCategoryName={currentSubCategoryName || ''}
        analysisResult={diyAnalysisResult || ''}
        onApplyEstimate={(amount) => {
          // Update the material cost
          if (activeSubCategoryId) {
            setSubCategories(prev => prev.map(sc =>
              sc.id === activeSubCategoryId
                ? { ...sc, materialCostOnly: amount, amount }
                : sc
            ));
            
            // Update total spent
            const newTotalSpent = subCategories
              .map(sc => sc.id === activeSubCategoryId ? amount : sc.amount)
              .reduce((sum, amt) => sum + (amt || 0), 0);
            setSpent(newTotalSpent.toString());
            
            toast.success(`Coût appliqué: ${amount.toLocaleString('fr-CA')} $`);
          }
          setShowDIYAnalysis(false);
        }}
      />
    </Dialog>
  );
}
