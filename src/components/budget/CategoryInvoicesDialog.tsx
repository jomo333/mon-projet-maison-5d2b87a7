import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSignedUrl } from "@/hooks/useSignedUrl";
import { getSignedUrlFromPublicUrl } from "@/hooks/useSignedUrl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileOrPhotoUpload } from "@/components/ui/file-or-photo-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  FileText,
  Loader2,
  ExternalLink,
  DollarSign,
  Image as ImageIcon,
  Package,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { DIYPurchaseInvoices } from "./DIYPurchaseInvoices";
import { TaskSubmissionsTabs, getTasksForCategory } from "./TaskSubmissionsTabs";
import { cn } from "@/lib/utils";

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
  "Autre": "autre",
};

interface CategoryInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categoryName: string;
  categoryColor: string;
  currentSpent: number;
  manualTaskTitles?: string[];
  onSave: (spent: number) => void;
  onOpenSubmissions: () => void;
}

interface InvoiceDoc {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
  amount?: number;
  supplier?: string;
  purchase_date?: string;
}

function parseInvoiceMeta(fileName: string | null | undefined): { amount?: number; supplier?: string; purchase_date?: string } {
  if (!fileName) return {};
  try {
    const meta = JSON.parse(fileName);
    return {
      amount: typeof meta.amount === "number" ? meta.amount : undefined,
      supplier: meta.supplier,
      purchase_date: meta.purchase_date,
    };
  } catch {
    return {};
  }
}

export function CategoryInvoicesDialog({
  open,
  onOpenChange,
  projectId,
  categoryName,
  categoryColor,
  currentSpent,
  manualTaskTitles,
  onSave,
  onOpenSubmissions,
}: CategoryInvoicesDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tradeId = categoryToTradeId[categoryName] || categoryName.toLowerCase().replace(/\s+/g, "-");

  const categoryTasks = manualTaskTitles?.length
    ? manualTaskTitles.map((t) => ({ taskTitle: t, keywords: [t.toLowerCase()] }))
    : getTasksForCategory(categoryName);

  const [viewMode, setViewMode] = useState<"single" | "tasks" | "subcategories">("single");
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(categoryTasks[0]?.taskTitle ?? null);

  const getTaskId = () => {
    if (viewMode === "single") return `facture-${tradeId}`;
    if (viewMode === "tasks" && activeTaskTitle) {
      const sanitized = activeTaskTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
      return `facture-${tradeId}-task-${sanitized}`;
    }
    return `facture-${tradeId}`;
  };

  const currentTaskId = getTaskId();

  const sanitizeFileName = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");

  const sanitizePath = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["category-invoices", projectId, currentTaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("project_id", projectId)
        .eq("step_id", viewMode === "subcategories" ? "factures-materiaux" : "factures")
        .eq("task_id", viewMode === "subcategories" ? `facture-diy-${tradeId}` : currentTaskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => {
        const meta = parseInvoiceMeta(row.file_name);
        return { ...row, ...meta } as InvoiceDoc & { file_name: string; file_url: string; file_type: string };
      });
    },
    enabled: !!projectId && open && (viewMode !== "tasks" || !!activeTaskTitle),
  });

  const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Non authentifié");
      const safeName = sanitizeFileName(file.name) || `facture_${Date.now()}`;
      const subPath = viewMode === "subcategories" ? `factures-materiaux/${sanitizePath(tradeId)}` : `factures/${sanitizePath(tradeId)}`;
      const storagePath = `${user.id}/${projectId}/${subPath}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage.from("task-attachments").upload(storagePath, file);
      if (uploadError) throw uploadError;

      const signedUrl = await getSignedUrl("task-attachments", storagePath);
      if (!signedUrl) throw new Error("Failed to generate signed URL");

      const taskIdToUse = viewMode === "subcategories" ? `facture-diy-${tradeId}` : currentTaskId;
      const stepIdToUse = viewMode === "subcategories" ? "factures-materiaux" : "factures";

      const { error: dbError } = await supabase.from("task_attachments").insert({
        project_id: projectId,
        step_id: stepIdToUse,
        task_id: taskIdToUse,
        file_name: file.name,
        file_url: signedUrl,
        file_type: file.type,
        file_size: file.size,
        category: "facture",
      });
      if (dbError) throw dbError;
      return { stepId: stepIdToUse, taskId: taskIdToUse };
    },
    onSuccess: (_, __, ctx) => {
      queryClient.invalidateQueries({ queryKey: ["category-invoices", projectId, currentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["diy-invoices", projectId, tradeId] });
      queryClient.invalidateQueries({ queryKey: ["factures-materiaux", projectId] });
      toast.success(t("budget.invoices.invoiceAdded", "Facture ajoutée"));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_url: string }) => {
      const bucketMarker = "/task-attachments/";
      const idx = doc.file_url.indexOf(bucketMarker);
      if (idx >= 0) {
        const path = doc.file_url.slice(idx + bucketMarker.length).split("?")[0];
        await supabase.storage.from("task-attachments").remove([path]);
      }
      await supabase.from("task_attachments").delete().eq("id", doc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-invoices", projectId, currentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["diy-invoices", projectId, tradeId] });
      queryClient.invalidateQueries({ queryKey: ["factures-materiaux", projectId] });
      toast.success(t("budget.invoices.invoiceDeleted", "Facture supprimée"));
    },
  });

  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      await uploadMutation.mutateAsync(file);
    }
  };

  useEffect(() => {
    if (open && viewMode === "tasks" && categoryTasks.length > 0 && !activeTaskTitle) {
      setActiveTaskTitle(categoryTasks[0].taskTitle);
    }
  }, [open, viewMode, categoryTasks, activeTaskTitle]);

  const translateCategoryName = (name: string) => {
    const key = `budget.categories.${name}`;
    const tr = t(key);
    return tr === key ? name : tr;
  };

  const isImage = (type: string) => type?.startsWith("image/");
  const isPdf = (type: string) => type === "application/pdf";

  const LinkToSubmissions = () => (
    <Button
      variant="outline"
      size="sm"
      className="w-full sm:w-auto gap-2"
      onClick={() => {
        onOpenChange(false);
        onOpenSubmissions();
      }}
    >
      <ExternalLink className="h-4 w-4" />
      {t("budget.invoices.seeRetainedSubmissions", "Voir vos soumissions retenues")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] sm:w-[95vw] max-w-4xl h-[100dvh] sm:h-[90vh] max-h-[100dvh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: categoryColor }} />
            {translateCategoryName(categoryName)} – {t("budget.invoices.title", "Vos factures")}
          </DialogTitle>
          <DialogDescription>
            {t("budget.invoices.manageInvoicesDesc", "Ajoutez vos factures et consultez l'historique. Suivez vos soumissions retenues pour ne pas oublier d'ajouter les factures correspondantes.")}
          </DialogDescription>
        </DialogHeader>

        {/* Carte distincte : lien vers soumissions retenues (suivi du début) – pas d'onglets soumissions/contrat retenu */}
        <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
          <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {t("budget.invoices.followSubmissionHint", "Pour ne pas oublier d’ajouter une facture, suivez votre soumission retenue du début :")}
                </p>
              </div>
            </div>
            <LinkToSubmissions />
          </CardContent>
        </Card>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              setViewMode(v as "single" | "tasks" | "subcategories");
              if (v === "tasks" && categoryTasks.length > 0) setActiveTaskTitle(categoryTasks[0].taskTitle);
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="flex flex-wrap w-full gap-1 p-1 h-auto min-h-[44px]">
              <TabsTrigger value="single" className="flex-1 min-w-[calc(50%-4px)] sm:min-w-0 text-xs sm:text-sm py-2">
                {t("budget.invoices.singleMode", "Facture unique")}
              </TabsTrigger>
              {categoryTasks.length > 0 && (
                <TabsTrigger value="tasks" className="flex-1 min-w-[calc(50%-4px)] sm:min-w-0 text-xs sm:text-sm py-2">
                  {t("budget.invoices.byTask", "Par tâche")} ({categoryTasks.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="subcategories" className="flex-1 min-w-[calc(50%-4px)] sm:min-w-0 text-xs sm:text-sm py-2">
                {t("budget.invoices.diyMode", "Fait par moi-même")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-3">
                <p className="text-sm text-muted-foreground">
                  {t("budget.invoices.singleModeDesc", "Un seul fournisseur pour toute la catégorie. Ajoutez vos factures et consultez l'historique.")}
                </p>
              </div>
              <InvoiceSection
                invoices={invoices}
                isLoading={isLoading}
                uploadMutation={uploadMutation}
                deleteMutation={deleteMutation}
                onFilesSelected={handleFilesSelected}
                isImage={isImage}
                isPdf={isPdf}
                formatCurrency={formatCurrency}
                t={t}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-3">
                <p className="text-sm text-muted-foreground">
                  {t("budget.invoices.tasksModeDesc", "Ajoutez vos factures par tâche. Suivez vos soumissions retenues pour ne pas oublier d'ajouter les factures correspondantes.")}
                </p>
              </div>
              {categoryTasks.length > 0 && (
                <TaskInvoicesTabs
                  tasks={categoryTasks}
                  activeTaskTitle={activeTaskTitle}
                  onSelectTask={setActiveTaskTitle}
                  projectId={projectId}
                  tradeId={tradeId}
                  queryClient={queryClient}
                  formatCurrency={formatCurrency}
                  t={t}
                  user={user}
                />
              )}
            </TabsContent>

            <TabsContent value="subcategories" className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4">
              <DIYPurchaseInvoices
                projectId={projectId}
                categoryName={categoryName}
                tradeId={tradeId}
                currentSpent={currentSpent}
                onSpentUpdate={(amount) => onSave(amount)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceSection({
  invoices,
  isLoading,
  uploadMutation,
  deleteMutation,
  onFilesSelected,
  isImage,
  isPdf,
  formatCurrency,
  t,
}: {
  invoices: (InvoiceDoc & { file_type: string })[];
  isLoading: boolean;
  uploadMutation: { mutateAsync: (f: File) => Promise<unknown>; isPending: boolean };
  deleteMutation: { mutate: (doc: { id: string; file_url: string }) => void };
  onFilesSelected: (files: File[]) => void;
  isImage: (t: string) => boolean;
  isPdf: (t: string) => boolean;
  formatCurrency: (n: number) => string;
  t: (key: string, fallback?: string) => string;
}) {
  const total = invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  return (
    <Card className="border border-emerald-200 dark:border-emerald-800/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Receipt className="h-4 w-4" />
          {t("budget.invoices.invoiceHistory", "Historique des factures")}
        </CardTitle>
        <div className="pt-2">
          <FileOrPhotoUpload
            onFilesSelected={(fileList) => onFilesSelected(Array.from(fileList))}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            uploading={uploadMutation.isPending}
            fileLabel={t("budget.invoices.uploadInvoice", "Télécharger une facture")}
            photoLabel={t("budget.invoices.takePhoto", "Prendre une photo")}
          />
        </div>
      </CardHeader>
      <CardContent>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
          <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">{t("budget.invoices.noInvoiceYet", "Aucune facture enregistrée")}</p>
          <p className="text-xs mt-1">{t("budget.invoices.uploadHint", "Téléchargez vos factures pour suivre vos dépenses")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30"
            >
              <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                {isImage(inv.file_type) ? <ImageIcon className="h-5 w-5 text-emerald-600" /> : isPdf(inv.file_type) ? <FileText className="h-5 w-5 text-emerald-600" /> : <Receipt className="h-5 w-5 text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{inv.file_name}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0 text-xs text-muted-foreground">
                  {inv.supplier && <span>🏪 {inv.supplier}</span>}
                  {inv.purchase_date && <span>📅 {new Date(inv.purchase_date + "T12:00:00").toLocaleDateString("fr-CA")}</span>}
                  {(inv.amount ?? 0) > 0 && <span className="font-semibold text-emerald-600">{formatCurrency(inv.amount!)}</span>}
                  {!inv.purchase_date && <span>{new Date(inv.created_at).toLocaleDateString("fr-CA")}</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate({ id: inv.id, file_url: inv.file_url })}
              >
                {t("common.delete", "Supprimer")}
              </Button>
            </div>
          ))}
          {invoices.length > 1 && total > 0 && (
            <div className="flex justify-between pt-3 border-t">
              <span className="text-sm font-medium">{t("budget.invoices.total", "Total")}</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      )}
      </CardContent>
    </Card>
  );
}

function TaskInvoicesTabs({
  tasks,
  activeTaskTitle,
  onSelectTask,
  projectId,
  tradeId,
  queryClient,
  formatCurrency,
  t,
  user,
}: {
  tasks: { taskTitle: string; keywords: string[] }[];
  activeTaskTitle: string | null;
  onSelectTask: (title: string) => void;
  projectId: string;
  tradeId: string;
  queryClient: ReturnType<typeof import("@tanstack/react-query").useQueryClient>;
  formatCurrency: (n: number) => string;
  t: (key: string, fallback?: string) => string;
  user: { id: string } | null;
}) {
  const sanitized = activeTaskTitle
    ? activeTaskTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50)
    : "";
  const taskId = `facture-${tradeId}-task-${sanitized}`;

  const sanitizeFileName = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
  const sanitizePath = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["category-invoices", projectId, taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("project_id", projectId)
        .eq("step_id", "factures")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => {
        const meta = parseInvoiceMeta(row.file_name);
        return { ...row, ...meta } as InvoiceDoc & { file_type: string };
      });
    },
    enabled: !!projectId && !!activeTaskTitle,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Non authentifié");
      const safeName = sanitizeFileName(file.name) || `facture_${Date.now()}`;
      const storagePath = `${user.id}/${projectId}/factures/${sanitizePath(tradeId)}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from("task-attachments").upload(storagePath, file);
      if (uploadError) throw uploadError;
      const signedUrl = await getSignedUrl("task-attachments", storagePath);
      if (!signedUrl) throw new Error("Failed to generate signed URL");
      const { error: dbError } = await supabase.from("task_attachments").insert({
        project_id: projectId,
        step_id: "factures",
        task_id: taskId,
        file_name: file.name,
        file_url: signedUrl,
        file_type: file.type,
        file_size: file.size,
        category: "facture",
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-invoices", projectId, taskId] });
      toast.success(t("budget.invoices.invoiceAdded", "Facture ajoutée"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_url: string }) => {
      const bucketMarker = "/task-attachments/";
      const idx = doc.file_url.indexOf(bucketMarker);
      if (idx >= 0) {
        const path = doc.file_url.slice(idx + bucketMarker.length).split("?")[0];
        await supabase.storage.from("task-attachments").remove([path]);
      }
      await supabase.from("task_attachments").delete().eq("id", doc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-invoices", projectId, taskId] });
      toast.success(t("budget.invoices.invoiceDeleted", "Facture supprimée"));
    },
  });

  const handleFilesSelected = async (files: File[]) => {
    for (const f of files) await uploadMutation.mutateAsync(f);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tasks.map((task) => (
          <Button
            key={task.taskTitle}
            variant={activeTaskTitle === task.taskTitle ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectTask(task.taskTitle)}
          >
            {task.taskTitle}
          </Button>
        ))}
      </div>
      {activeTaskTitle && (
        <InvoiceSection
            invoices={invoices}
            isLoading={isLoading}
            uploadMutation={uploadMutation}
            deleteMutation={deleteMutation}
            onFilesSelected={handleFilesSelected}
            isImage={(type) => type?.startsWith("image/")}
            isPdf={(type) => type === "application/pdf"}
            formatCurrency={formatCurrency}
            t={t}
          />
      )}
    </div>
  );
}
