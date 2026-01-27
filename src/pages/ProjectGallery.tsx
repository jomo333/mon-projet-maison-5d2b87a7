import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { constructionSteps } from "@/data/constructionSteps";
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
  X
} from "lucide-react";

const documentCategories = [
  { value: "all", label: "Tous les documents" },
  { value: "plan", label: "Plans" },
  { value: "devis", label: "Devis" },
  { value: "soumission", label: "Soumissions" },
  { value: "contract", label: "Contrats" },
  { value: "permit", label: "Permis" },
  { value: "permis", label: "Permis" },
  { value: "facture", label: "Factures" },
  { value: "photo", label: "Photos" },
  { value: "other", label: "Autres" },
];

// Corps de métier pour les soumissions
const soumissionTrades = [
  { id: "excavation", name: "Excavation" },
  { id: "fondation", name: "Fondation/Béton" },
  { id: "charpente", name: "Charpentier" },
  { id: "toiture", name: "Couvreur" },
  { id: "fenetre", name: "Fenêtres/Portes" },
  { id: "electricite", name: "Électricien" },
  { id: "plomberie", name: "Plombier" },
  { id: "hvac", name: "Chauffage/Ventilation" },
  { id: "isolation", name: "Isolation" },
  { id: "gypse", name: "Plâtrier/Gypse" },
  { id: "peinture", name: "Peintre" },
  { id: "plancher", name: "Plancher" },
  { id: "ceramique", name: "Céramiste" },
  { id: "armoires", name: "Ébéniste/Armoires" },
  { id: "comptoirs", name: "Comptoirs" },
  { id: "exterieur", name: "Revêtement extérieur" },
  { id: "amenagement", name: "Aménagement paysager" },
];

const ProjectGallery = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectId = searchParams.get("project");
  const [activeTab, setActiveTab] = useState("photos");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewDocument, setPreviewDocument] = useState<{url: string; name: string; type: string} | null>(null);

  // Fetch all user projects
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

  // Filter documents
  const filteredDocuments = selectedCategory === "all"
    ? documents
    : documents.filter(d => d.category === selectedCategory);

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
    return fileType.startsWith("image/") || fileType === "application/pdf";
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
              Mes Dossiers
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
                    Aucun projet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Créez un projet pour commencer à télécharger des fichiers
                  </p>
                  <Button onClick={() => navigate("/mes-projets")}>
                    Créer un projet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">
                  Sélectionnez un projet pour voir ses fichiers
                </p>
                <Select onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Choisir un projet" />
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
                  Mes Dossiers
                </h1>
                <p className="text-muted-foreground mt-1">
                  Photos et documents de vos projets
                </p>
              </div>
            </div>
            
            {/* Project selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Projet :</label>
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
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="photos" className="gap-2">
                <Camera className="h-4 w-4" />
                Photos ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="soumissions" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Soumissions ({retenuCount}/{soumissionTrades.length})
              </TabsTrigger>
            </TabsList>

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-6">
              {/* Step filter */}
              <div className="mb-6">
                <Select value={selectedStep} onValueChange={setSelectedStep}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Filtrer par étape" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les étapes</SelectItem>
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
                      Aucune photo pour ce projet
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ajoutez des photos depuis les étapes de construction
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
                            {stepPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                onClick={() => setSelectedPhoto(photo.file_url)}
                              >
                                <img
                                  src={photo.file_url}
                                  alt={photo.file_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Single step view
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {filteredPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => setSelectedPhoto(photo.file_url)}
                        >
                          <img
                            src={photo.file_url}
                            alt={photo.file_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
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
                                try {
                                  const response = await fetch(doc.file_url);
                                  if (!response.ok) throw new Error('Erreur de téléchargement');
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = doc.file_name;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } catch (error) {
                                  console.error('Download error:', error);
                                  window.open(doc.file_url, '_blank');
                                }
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
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">{trade.docs.length} document(s)</p>
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
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{trade.name}</span>
                              {trade.docs.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {trade.docs.length} doc(s)
                                </Badge>
                              )}
                            </div>
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

      {/* Photo viewer dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Photo agrandie"
              className="w-full h-auto rounded-lg"
            />
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
                  try {
                    const response = await fetch(previewDocument.url);
                    if (!response.ok) throw new Error('Erreur de téléchargement');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = previewDocument.name;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (error) {
                    console.error('Download error:', error);
                    window.open(previewDocument.url, '_blank');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg bg-muted">
            {previewDocument?.type.startsWith("image/") ? (
              <img
                src={previewDocument.url}
                alt={previewDocument.name}
                className="w-full h-full object-contain"
              />
            ) : previewDocument?.type === "application/pdf" ? (
              <iframe
                src={previewDocument.url}
                className="w-full h-full border-0"
                title={previewDocument.name}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectGallery;
