import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { constructionSteps } from "@/data/constructionSteps";
import { getSignedUrl, getSignedUrlFromPublicUrl } from "@/hooks/useSignedUrl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Camera, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  FolderOpen,
  ArrowLeft,
  Download,
  File,
  FileImage,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Phone,
  User,
  Eye,
  X,
  FolderArchive,
  Sparkles,
  Trash2
} from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { toast } from "sonner";
import JSZip from "jszip";

const ProjectGallery = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const documentCategories = [
    { value: "all", label: t("gallery.allDocuments") },
    { value: "plan", label: t("gallery.documentCategories.plan") },
    { value: "devis", label: t("gallery.documentCategories.devis") },
    { value: "soumission", label: t("gallery.documentCategories.soumission") },
    { value: "contract", label: t("gallery.documentCategories.contract") },
    { value: "permit", label: t("gallery.documentCategories.permit") },
    { value: "permis", label: t("gallery.documentCategories.permit") },
    { value: "facture", label: t("gallery.documentCategories.facture") },
    { value: "photo", label: t("gallery.documentCategories.photo") },
    { value: "other", label: t("gallery.documentCategories.other") },
  ];

  // Corps de métier pour les soumissions
  const soumissionTrades = [
    { id: "excavation", name: t("trades.excavation") },
    { id: "fondation", name: t("trades.foundation") },
    { id: "charpente", name: t("trades.carpentry") },
    { id: "toiture", name: t("trades.roofing") },
    { id: "fenetre", name: t("trades.windows") },
    { id: "electricite", name: t("trades.electrical") },
    { id: "plomberie", name: t("trades.plumbing") },
    { id: "hvac", name: t("trades.hvac") },
    { id: "isolation", name: t("trades.insulation") },
    { id: "gypse", name: t("trades.drywall") },
    { id: "peinture", name: t("trades.painting") },
    { id: "plancher", name: t("trades.flooring") },
    { id: "ceramique", name: t("trades.tiling") },
    { id: "armoires", name: t("trades.cabinets") },
    { id: "comptoirs", name: t("trades.countertops") },
    { id: "exterieur", name: t("trades.exterior") },
    { id: "amenagement", name: t("trades.landscaping") },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectId = searchParams.get("project");
  const [activeTab, setActiveTab] = useState("photos");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewDocument, setPreviewDocument] = useState<{url: string; name: string; type: string} | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  
  // Signed URLs cache for photos and documents
  const [photoSignedUrls, setPhotoSignedUrls] = useState<Map<string, string>>(new Map());
  const [docSignedUrls, setDocSignedUrls] = useState<Map<string, string>>(new Map());

  // Load blob URL when preview document changes
  useEffect(() => {
    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      window.URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (!previewDocument) {
      setPreviewBlobUrl(null);
      return;
    }

    // PDFs are handled by <PDFViewer /> (it fetches internally). No need to create a blob URL here.
    if (previewDocument.type === "application/pdf") {
      setPreviewLoading(false);
      setPreviewBlobUrl(null);
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      setPreviewLoading(true);
      setPreviewBlobUrl(null);
      
      try {
        const response = await fetch(previewDocument.url);
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const blob = await response.blob();
        
        if (cancelled) return;
        
        const blobUrl = window.URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setPreviewBlobUrl(blobUrl);
      } catch (error) {
        console.error('Preview load error:', error);
        if (!cancelled) {
          // Fallback: open in new tab
          setPreviewBlobUrl(null);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [previewDocument?.url]);

  // Get fresh signed URL from a stored URL (which may be expired signed URL or path)
  const getFreshSignedUrl = async (fileUrl: string): Promise<string> => {
    // Extract the path from the URL
    const bucketMarker = "/task-attachments/";
    const signMarker = "/storage/v1/object/sign/task-attachments/";
    
    let path = "";
    
    if (fileUrl.includes(signMarker)) {
      // It's a signed URL - extract path after the sign marker
      const startIdx = fileUrl.indexOf(signMarker) + signMarker.length;
      const endIdx = fileUrl.indexOf("?");
      path = endIdx > 0 ? fileUrl.slice(startIdx, endIdx) : fileUrl.slice(startIdx);
    } else if (fileUrl.includes(bucketMarker)) {
      // It's a public URL
      const startIdx = fileUrl.indexOf(bucketMarker) + bucketMarker.length;
      const endIdx = fileUrl.indexOf("?");
      path = endIdx > 0 ? fileUrl.slice(startIdx, endIdx) : fileUrl.slice(startIdx);
    } else {
      // Assume it's already a path
      path = fileUrl;
    }
    
    if (!path) return fileUrl;
    
    // Decode the path in case it's URL encoded
    try {
      path = decodeURIComponent(path);
    } catch {
      // Already decoded
    }
    
    // Generate a fresh signed URL
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(path, 3600);
    
    if (error || !data?.signedUrl) {
      console.error("Failed to get signed URL:", error);
      return fileUrl;
    }
    
    return data.signedUrl;
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      // Get fresh signed URL first
      const freshUrl = await getFreshSignedUrl(fileUrl);
      const response = await fetch(freshUrl);
      if (!response.ok) throw new Error('Erreur de téléchargement');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      window.open(fileUrl, '_blank');
    }
  };

  // Preview document with fresh signed URL
  const openDocumentPreview = async (doc: { file_url: string; file_name: string; file_type: string }) => {
    const freshUrl = await getFreshSignedUrl(doc.file_url);
    setPreviewDocument({
      url: freshUrl,
      name: doc.file_name,
      type: doc.file_type,
    });
  };

  // Download all files as organized ZIP
  const downloadAllAsZip = async () => {
    if (!project || (!photos.length && !documents.length)) {
      toast.error(t("gallery.noFilesToDownload"));
      return;
    }

    setIsDownloadingAll(true);
    const zip = new JSZip();
    const projectName = project.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, "").trim() || "projet";
    const addedFiles = new Set<string>();

    try {
      // Add photos organized by step
      const photosFolder = zip.folder("Photos");
      if (photosFolder) {
        for (const photo of photos) {
          const stepName = getStepTitle(photo.step_id).replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, "").trim() || photo.step_id;
          const stepFolder = photosFolder.folder(stepName);
          
          if (stepFolder && !addedFiles.has(photo.file_url)) {
            const signedUrl = photoSignedUrls.get(photo.id) || await getSignedUrl("project-photos", photo.file_url);
            if (signedUrl) {
              try {
                const response = await fetch(signedUrl);
                if (response.ok) {
                  const blob = await response.blob();
                  stepFolder.file(photo.file_name, blob);
                  addedFiles.add(photo.file_url);
                }
              } catch (e) {
                console.error("Error downloading photo:", e);
              }
            }
          }
        }
      }

      // Add documents organized by category
      const docsFolder = zip.folder("Documents");
      if (docsFolder) {
        const categoryNames: Record<string, string> = {
          plan: "Plans",
          devis: "Devis",
          contract: "Contrats",
          permit: "Permis",
          permis: "Permis",
          facture: "Factures",
          photo: "Photos",
          other: "Autres",
          soumission: "Soumissions",
          analyse: "Analyses"
        };

        for (const doc of documents) {
          const categoryName = categoryNames[doc.category] || "Autres";
          const catFolder = docsFolder.folder(categoryName);
          
          if (catFolder && !addedFiles.has(doc.file_url)) {
            const signedUrl = docSignedUrls.get(doc.id) || await getSignedUrlFromPublicUrl(doc.file_url);
            const urlToUse = signedUrl || doc.file_url;
            
            try {
              const response = await fetch(urlToUse);
              if (response.ok) {
                const blob = await response.blob();
                catFolder.file(doc.file_name, blob);
                addedFiles.add(doc.file_url);
              }
            } catch (e) {
              console.error("Error downloading document:", e);
            }
          }
        }
      }

      // Generate ZIP and download
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}_dossiers.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t("gallery.downloadSuccess"));
    } catch (error) {
      console.error("ZIP download error:", error);
      toast.error(t("gallery.downloadError"));
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleProjectChange = (newProjectId: string) => {
    setSearchParams({ project: newProjectId });
  };

  // Fetch project info
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

  // Fetch all photos for project
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

  // Fetch all documents (task_attachments)
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

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photo: { id: string; file_url: string }) => {
      if (!user) throw new Error("Non authentifié");
      
      // Delete from storage
      await supabase.storage.from("project-photos").remove([photo.file_url]);

      // Delete from database
      const { error } = await supabase
        .from("project_photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-project-photos", projectId] });
      toast.success(t("toasts.photoDeleted", "Photo supprimée"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.photoError", "Erreur") + ": " + error.message);
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (doc: { id: string; file_url: string }) => {
      if (!user) throw new Error("Non authentifié");
      
      // Extract path from file_url
      const bucketMarker = "/task-attachments/";
      const markerIndex = doc.file_url.indexOf(bucketMarker);
      if (markerIndex >= 0) {
        const path = doc.file_url.slice(markerIndex + bucketMarker.length).split("?")[0];
        await supabase.storage.from("task-attachments").remove([path]);
      }

      // Delete from database
      const { error } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["soumission-docs-gallery", projectId] });
      toast.success(t("attachments.deleteSuccess", "Document supprimé"));
    },
    onError: (error: Error) => {
      toast.error(t("attachments.deleteError", "Erreur de suppression") + ": " + error.message);
    },
  });

  // Fetch soumission statuses (fournisseurs retenus)
  const { data: soumissionStatuses = [], isLoading: soumissionsLoading } = useQuery({
    queryKey: ["soumission-statuses-gallery", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("task_dates")
        .select("*")
        .eq("project_id", projectId)
        .eq("step_id", "soumissions")
        .like("task_id", "soumission-%");

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  // Fetch soumission documents
  const { data: soumissionDocs = [], isLoading: soumissionDocsLoading } = useQuery({
    queryKey: ["soumission-docs-gallery", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("project_id", projectId)
        .eq("step_id", "soumissions")
        .like("task_id", "soumission-%")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  // Generate signed URLs for photos
  useEffect(() => {
    const generatePhotoUrls = async () => {
      if (!photos.length || !user) return;
      
      const urlMap = new Map<string, string>();
      await Promise.all(
        photos.map(async (photo) => {
          // file_url is stored as a path, not a full URL - use getSignedUrl directly
          const signedUrl = await getSignedUrl("project-photos", photo.file_url);
          if (signedUrl) {
            urlMap.set(photo.id, signedUrl);
          }
        })
      );
      setPhotoSignedUrls(urlMap);
    };
    generatePhotoUrls();
  }, [photos, user]);

  // Generate signed URLs for documents
  useEffect(() => {
    const generateDocUrls = async () => {
      if (!documents.length || !user) return;
      
      const urlMap = new Map<string, string>();
      await Promise.all(
        documents.map(async (doc) => {
          const signedUrl = await getSignedUrlFromPublicUrl(doc.file_url);
          if (signedUrl && signedUrl !== doc.file_url) {
            urlMap.set(doc.id, signedUrl);
          }
        })
      );
      setDocSignedUrls(urlMap);
    };
    generateDocUrls();
  }, [documents, user]);

  // Group photos by step
  const photosByStep = photos.reduce((acc, photo) => {
    const stepId = photo.step_id;
    if (!acc[stepId]) {
      acc[stepId] = [];
    }
    acc[stepId].push(photo);
    return acc;
  }, {} as Record<string, typeof photos>);

  // Filter photos
  const filteredPhotos = selectedStep === "all" 
    ? photos 
    : photos.filter(p => p.step_id === selectedStep);

  // Filter documents - exclude soumissions (they appear in their own tab)
  const nonSoumissionDocs = documents.filter(d => 
    d.step_id !== "soumissions" && 
    d.category !== "soumission" && 
    d.category !== "analyse"
  );
  
  const filteredDocuments = selectedCategory === "all"
    ? nonSoumissionDocs
    : nonSoumissionDocs.filter(d => d.category === selectedCategory);

  // Parse supplier info from notes JSON
  const parseSupplierInfo = (notes: string | null) => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  // Get soumissions data - include ALL trades, not just those with data
  const getSoumissionsFromData = () => {
    const result: {
      id: string;
      name: string;
      status: typeof soumissionStatuses[0] | undefined;
      docs: typeof soumissionDocs;
      supplierInfo: ReturnType<typeof parseSupplierInfo>;
      isRetenu: boolean;
      supplierName: string | null;
      supplierPhone: string | null;
      contactPerson: string | null;
      contactPersonPhone: string | null;
      amount: string | null;
    }[] = [];

    // Start with ALL trades from the static list
    soumissionTrades.forEach(trade => {
      const taskId = `soumission-${trade.id}`;
      const status = soumissionStatuses.find(s => s.task_id === taskId);
      const docs = soumissionDocs.filter(d => d.task_id === taskId);
      const supplierInfo = status ? parseSupplierInfo(status.notes) : null;
      const isRetenu = supplierInfo?.isCompleted === true;

      result.push({
        id: trade.id,
        name: trade.name,
        status,
        docs,
        supplierInfo,
        isRetenu,
        supplierName: supplierInfo?.supplierName || null,
        supplierPhone: supplierInfo?.supplierPhone || null,
        contactPerson: supplierInfo?.contactPerson || null,
        contactPersonPhone: supplierInfo?.contactPersonPhone || null,
        amount: supplierInfo?.amount || null,
      });
    });

    // Also include any task_ids from data that are not in the static list
    const staticIds = new Set(soumissionTrades.map(t => t.id));
    const allTaskIds = new Set<string>();
    soumissionStatuses.forEach(s => allTaskIds.add(s.task_id));
    soumissionDocs.forEach(d => allTaskIds.add(d.task_id));

    allTaskIds.forEach(taskId => {
      const categoryId = taskId.replace('soumission-', '');
      if (!staticIds.has(categoryId)) {
        const status = soumissionStatuses.find(s => s.task_id === taskId);
        const docs = soumissionDocs.filter(d => d.task_id === taskId);
        const supplierInfo = status ? parseSupplierInfo(status.notes) : null;
        const isRetenu = supplierInfo?.isCompleted === true;

        // Format category name - capitalize and replace hyphens
        const formatCategoryName = (id: string) => {
          return id.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        };

        result.push({
          id: categoryId,
          name: formatCategoryName(categoryId),
          status,
          docs,
          supplierInfo,
          isRetenu,
          supplierName: supplierInfo?.supplierName || null,
          supplierPhone: supplierInfo?.supplierPhone || null,
          contactPerson: supplierInfo?.contactPerson || null,
          contactPersonPhone: supplierInfo?.contactPersonPhone || null,
          amount: supplierInfo?.amount || null,
        });
      }
    });

    // Sort by construction order (using soumissionTrades order), not alphabetically
    // Keep the order from soumissionTrades which is already in construction sequence
    const tradeOrderMap = new Map(soumissionTrades.map((t, i) => [t.id, i]));
    return result.sort((a, b) => {
      const orderA = tradeOrderMap.get(a.id) ?? 999;
      const orderB = tradeOrderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
  };

  const soumissionsData = getSoumissionsFromData();
  const retenuCount = soumissionsData.filter(s => s.isRetenu).length;
  const totalDocsCount = soumissionDocs.length;
  
  // Filter AI analyses documents
  const analysisDocs = soumissionDocs.filter(d => d.category === 'analyse');

  const getStepTitle = (stepId: string) => {
    const step = constructionSteps.find(s => s.id === stepId);
    return step?.title || stepId;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return FileImage;
    return File;
  };

  const canPreview = (fileType: string) => {
    return fileType.startsWith("image/") || fileType === "application/pdf" || fileType === "text/markdown";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (!projectId || projects.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-8">
          <div className="container">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-6">
              {t("gallery.title")}
            </h1>
            
            {projectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-display text-lg font-medium mb-2">
                    {t("gallery.noProject")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("gallery.createProjectFirst")}
                  </p>
                  <Button onClick={() => navigate("/mes-projets")}>
                    {t("projects.create")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">
                  {t("gallery.selectToView")}
                </p>
                <Select onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder={t("gallery.chooseProject")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
          {/* Header with project selector */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {t("gallery.title")}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {t("gallery.subtitle")}
                </p>
              </div>
            </div>
            
            {/* Project selector and download button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <label className="text-sm font-medium">{t("common.project")} :</label>
                <Select value={projectId} onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Download all button */}
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAllAsZip}
                disabled={isDownloadingAll || (!photos.length && !documents.length)}
                className="gap-2"
              >
                {isDownloadingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("gallery.downloading", "Téléchargement...")}
                  </>
                ) : (
                  <>
                    <FolderArchive className="h-4 w-4" />
                    {t("gallery.downloadAll", "Tout télécharger")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="photos" className="gap-2">
                <Camera className="h-4 w-4" />
                {t("gallery.photos")} ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                {t("gallery.documents")} ({nonSoumissionDocs.length})
              </TabsTrigger>
              <TabsTrigger value="soumissions" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {t("gallery.quotes")} ({retenuCount}/{soumissionTrades.length})
              </TabsTrigger>
            </TabsList>

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-6">
              {/* Step filter */}
              <div className="mb-6">
                <Select value={selectedStep} onValueChange={setSelectedStep}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder={t("gallery.filterByStep")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("gallery.allSteps")}</SelectItem>
                    {Object.keys(photosByStep).map((stepId) => (
                      <SelectItem key={stepId} value={stepId}>
                        {getStepTitle(stepId)} ({photosByStep[stepId].length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {photosLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : filteredPhotos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {t("gallery.noPhotos")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("projects.noPhotosDesc")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Grid view when "all" is selected - group by step */}
                  {selectedStep === "all" ? (
                    <div className="space-y-8">
                      {Object.entries(photosByStep).map(([stepId, stepPhotos]) => (
                        <div key={stepId}>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Badge variant="outline">{getStepTitle(stepId)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {stepPhotos.length} photo(s)
                            </span>
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {stepPhotos.map((photo) => {
                              const displayUrl = photoSignedUrls.get(photo.id) || photo.file_url;
                              return (
                                <div
                                  key={photo.id}
                                  className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                  onClick={() => setSelectedPhoto(displayUrl)}
                                >
                                  <img
                                    src={displayUrl}
                                    alt={photo.file_name}
                                    className="w-full h-full object-cover"
                                  />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-1 right-1 p-1.5 bg-destructive/90 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive-foreground" />
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t("common.confirmDelete", "Confirmer la suppression")}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t("gallery.deletePhotoConfirm", "Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.")}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t("common.cancel", "Annuler")}</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deletePhotoMutation.mutate({ id: photo.id, file_url: photo.file_url });
                                          }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          {t("common.delete", "Supprimer")}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Single step view
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {filteredPhotos.map((photo) => {
                        const displayUrl = photoSignedUrls.get(photo.id) || photo.file_url;
                        return (
                          <div
                            key={photo.id}
                            className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() => setSelectedPhoto(displayUrl)}
                          >
                            <img
                              src={displayUrl}
                              alt={photo.file_name}
                              className="w-full h-full object-cover"
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-1 right-1 p-1.5 bg-destructive/90 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3 text-destructive-foreground" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("common.confirmDelete", "Confirmer la suppression")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("gallery.deletePhotoConfirm", "Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel", "Annuler")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePhotoMutation.mutate({ id: photo.id, file_url: photo.file_url });
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t("common.delete", "Supprimer")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-6">
              {/* Category filter */}
              <div className="mb-6">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Filtrer par catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {documentsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Aucun document pour ce projet
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Téléversez des plans, devis et soumissions depuis les étapes
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => {
                    const FileIcon = getFileIcon(doc.file_type);
                    const isPreviewable = canPreview(doc.file_type);
                    return (
                      <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {documentCategories.find(c => c.value === doc.category)?.label || doc.category}
                              </Badge>
                              <span>{getStepTitle(doc.step_id)}</span>
                              {doc.file_size && (
                                <span>• {formatFileSize(doc.file_size)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isPreviewable && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Visualiser"
                                onClick={() => setPreviewDocument({
                                  url: doc.file_url,
                                  name: doc.file_name,
                                  type: doc.file_type
                                })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Télécharger"
                              onClick={async () => {
                                await downloadFile(doc.file_url, doc.file_name);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={t("common.delete", "Supprimer")}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("common.confirmDelete", "Confirmer la suppression")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("gallery.deleteDocConfirm", "Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel", "Annuler")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDocumentMutation.mutate({ id: doc.id, file_url: doc.file_url })}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t("common.delete", "Supprimer")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Soumissions Tab */}
            <TabsContent value="soumissions" className="mt-6">
              {soumissionsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Fournisseurs retenus */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Fournisseurs retenus ({retenuCount})
                    </h3>
                    {retenuCount === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center">
                          <p className="text-muted-foreground">
                            Aucun fournisseur retenu pour le moment
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Sélectionnez vos fournisseurs dans l'étape "Soumissions" du guide
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {soumissionsData.filter(s => s.isRetenu).map((trade) => (
                          <Card key={trade.id} className="border-green-200 bg-green-50/50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    {trade.name}
                                  </h4>
                                  {trade.supplierName && (
                                    <p className="text-sm mt-1 font-medium">
                                      {trade.supplierName}
                                    </p>
                                  )}
                                  {trade.contactPerson && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <User className="h-3 w-3" />
                                      {trade.contactPerson}
                                      {trade.contactPersonPhone && ` - ${trade.contactPersonPhone}`}
                                    </p>
                                  )}
                                  {trade.supplierPhone && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {trade.supplierPhone}
                                    </p>
                                  )}
                                </div>
                                {trade.amount && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    {parseFloat(trade.amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                                  </Badge>
                                )}
                              </div>
                              {trade.docs.length > 0 && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                  <p className="text-xs text-muted-foreground">Documents ({trade.docs.length})</p>
                                  <div className="space-y-1">
                                    {trade.docs.map((doc) => {
                                      const isPreviewable = canPreview(doc.file_type);
                                      return (
                                        <div key={doc.id} className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1">
                                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm truncate flex-1 hover:underline"
                                            title={doc.file_name}
                                          >
                                            {doc.file_name}
                                          </a>
                                          {isPreviewable && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              title="Visualiser"
                                              onClick={() => openDocumentPreview(doc)}
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            title="Télécharger"
                                            onClick={() => downloadFile(doc.file_url, doc.file_name)}
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                title={t("common.delete", "Supprimer")}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>{t("common.confirmDelete", "Confirmer la suppression")}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  {t("gallery.deleteDocConfirm", "Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.")}
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>{t("common.cancel", "Annuler")}</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => deleteDocumentMutation.mutate({ id: doc.id, file_url: doc.file_url })}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                  {t("common.delete", "Supprimer")}
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fournisseurs manquants - show all categories not retained */}
                  {soumissionsData.filter(s => !s.isRetenu).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      Fournisseurs manquants ({soumissionsData.filter(s => !s.isRetenu).length})
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {soumissionsData.filter(s => !s.isRetenu).map((trade) => (
                        <Card key={trade.id} className="border-dashed border-amber-300 dark:border-amber-700">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{trade.name}</span>
                              {trade.docs.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {trade.docs.length} doc(s)
                                </Badge>
                              )}
                            </div>
                            {trade.docs.length > 0 ? (
                              <div className="space-y-1">
                                {trade.docs.map((doc) => {
                                  const isPreviewable = canPreview(doc.file_type);
                                  return (
                                    <div key={doc.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1">
                                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <span
                                        className="text-sm truncate flex-1 cursor-pointer hover:underline"
                                        title={doc.file_name}
                                        onClick={() => openDocumentPreview(doc)}
                                      >
                                        {doc.file_name}
                                      </span>
                                      {isPreviewable && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          title="Visualiser"
                                          onClick={() => openDocumentPreview(doc)}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Télécharger"
                                        onClick={() => downloadFile(doc.file_url, doc.file_name)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Aucune soumission téléchargée
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Photo viewer dialog - mobile optimized */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-2 sm:p-6 overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm sm:text-base">Photo</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="flex items-center justify-center overflow-auto max-h-[calc(90vh-80px)]">
              <img
                src={selectedPhoto}
                alt="Photo agrandie"
                className="max-w-full max-h-[calc(90vh-100px)] w-auto h-auto object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document preview dialog */}
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{previewDocument?.name}</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={async () => {
                  if (!previewDocument) return;
                  await downloadFile(previewDocument.url, previewDocument.name);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
            {previewDocument?.type === "application/pdf" ? (
              <PDFViewer url={previewDocument.url} className="w-full h-full" />
            ) : previewLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement du document...</p>
              </div>
            ) : previewDocument?.type.startsWith("image/") && previewBlobUrl ? (
              <img
                src={previewBlobUrl}
                alt={previewDocument.name}
                className="w-full h-full object-contain"
              />
            ) : previewDocument?.type === "text/markdown" && previewBlobUrl ? (
              <iframe
                src={previewBlobUrl}
                className="w-full h-full border-0 bg-white"
                title={previewDocument.name}
              />
            ) : !previewLoading && previewDocument ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <File className="h-12 w-12" />
                <p>Erreur de chargement du document</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(previewDocument?.url, '_blank')}
                >
                  Ouvrir dans un nouvel onglet
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectGallery;
