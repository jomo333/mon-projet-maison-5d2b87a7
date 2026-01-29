import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  FolderArchive
} from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { toast } from "sonner";

const ProjectGallery = () => {
  const { t, i18n } = useTranslation();

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

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
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

  // Download all files to a folder using File System Access API
  const downloadAllToFolder = async () => {
    if (!project || (!photos.length && !documents.length)) {
      toast.error(t("gallery.noFilesToDownload"));
      return;
    }

    // Check if File System Access API is supported
    if (!("showDirectoryPicker" in window)) {
      toast.error(t("gallery.browserNotSupported", "Votre navigateur ne supporte pas cette fonctionnalité. Utilisez Chrome ou Edge."));
      return;
    }

    setIsDownloadingAll(true);
    const addedFiles = new Set<string>();
    let downloadCount = 0;

    try {
      // Request access to a folder
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "downloads"
      });

      const projectName = project.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, "").trim() || "Projet";
      
      // Create main project folder
      const projectFolder = await dirHandle.getDirectoryHandle(projectName, { create: true });

      // Create Photos folder and subfolders by step
      if (photos.length > 0) {
        const photosFolder = await projectFolder.getDirectoryHandle("Photos", { create: true });
        
        for (const photo of photos) {
          const stepName = getStepTitle(photo.step_id).replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, "").trim() || photo.step_id;
          const stepFolder = await photosFolder.getDirectoryHandle(stepName, { create: true });
          
          if (!addedFiles.has(photo.file_url)) {
            const signedUrl = photoSignedUrls.get(photo.id) || await getSignedUrl("project-photos", photo.file_url);
            if (signedUrl) {
              try {
                const response = await fetch(signedUrl);
                if (response.ok) {
                  const blob = await response.blob();
                  const fileHandle = await stepFolder.getFileHandle(photo.file_name, { create: true });
                  const writable = await fileHandle.createWritable();
                  await writable.write(blob);
                  await writable.close();
                  addedFiles.add(photo.file_url);
                  downloadCount++;
                }
              } catch (e) {
                console.error("Error downloading photo:", e);
              }
            }
          }
        }
      }

      // Create Documents folder and subfolders by category
      if (documents.length > 0) {
        const docsFolder = await projectFolder.getDirectoryHandle("Documents", { create: true });
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
          const catFolder = await docsFolder.getDirectoryHandle(categoryName, { create: true });
          
          if (!addedFiles.has(doc.file_url)) {
            const signedUrl = docSignedUrls.get(doc.id) || await getSignedUrlFromPublicUrl(doc.file_url);
            const urlToUse = signedUrl || doc.file_url;
            
            try {
              const response = await fetch(urlToUse);
              if (response.ok) {
                const blob = await response.blob();
                const fileHandle = await catFolder.getFileHandle(doc.file_name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                addedFiles.add(doc.file_url);
                downloadCount++;
              }
            } catch (e) {
              console.error("Error downloading document:", e);
            }
          }
        }
      }

      toast.success(t("gallery.downloadSuccessCount", { count: downloadCount }));
    } catch (error: any) {
      if (error.name === "AbortError") {
        // User cancelled the folder picker
        return;
      }
      console.error("Download error:", error);
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

  // Get soumissions data by trade
  const getSoumissionsByTrade = () => {
    return soumissionTrades.map(trade => {
      const status = soumissionStatuses.find(s => s.task_id === `soumission-${trade.id}`);
      const docs = soumissionDocs.filter(d => d.task_id === `soumission-${trade.id}`);
      const supplierInfo = status ? parseSupplierInfo(status.notes) : null;
      const isRetenu = supplierInfo?.isCompleted === true;
      
      return {
        ...trade,
        status,
        docs,
        supplierInfo,
        isRetenu,
        supplierName: supplierInfo?.supplierName || null,
        supplierPhone: supplierInfo?.supplierPhone || null,
        amount: supplierInfo?.amount || null,
      };
    });
  };

  const soumissionsData = getSoumissionsByTrade();
  const retenuCount = soumissionsData.filter(s => s.isRetenu).length;
  const totalDocsCount = soumissionDocs.length;

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
                onClick={downloadAllToFolder}
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
                                <div>
                                  <h4 className="font-medium flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    {trade.name}
                                  </h4>
                                  {trade.supplierName && (
                                    <p className="text-sm mt-1 flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {trade.supplierName}
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
                                  <Badge variant="secondary" className="text-green-700">
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
                                              onClick={() => setPreviewDocument({
                                                url: doc.file_url,
                                                name: doc.file_name,
                                                type: doc.file_type,
                                              })}
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
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* En attente */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      En attente ({soumissionTrades.length - retenuCount})
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {soumissionsData.filter(s => !s.isRetenu).map((trade) => (
                        <Card key={trade.id} className="border-dashed">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{trade.name}</span>
                              {trade.docs.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {trade.docs.length} doc(s)
                                </Badge>
                              )}
                            </div>
                            {trade.docs.length > 0 && (
                              <div className="space-y-1">
                                {trade.docs.map((doc) => {
                                  const isPreviewable = canPreview(doc.file_type);
                                  return (
                                    <div key={doc.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1">
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
                                          onClick={() => setPreviewDocument({
                                            url: doc.file_url,
                                            name: doc.file_name,
                                            type: doc.file_type,
                                          })}
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
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
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
