import { useState } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { FileOrPhotoUpload } from "@/components/ui/file-or-photo-upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSignedUrlFromPublicUrl } from "@/hooks/useSignedUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Receipt,
  Trash2,
  Loader2,
  Plus,
  FileText,
  Image as ImageIcon,
  DollarSign,
  Eye,
  Download,
  Package,
  ExternalLink,
  Sparkles,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

interface PurchaseInvoice {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
  notes?: string;
  amount?: number;
  supplier?: string;
  purchase_date?: string;
}

interface DIYPurchaseInvoicesProps {
  projectId: string;
  categoryName: string;
  tradeId: string;
  onSpentUpdate: (amount: number) => void;
  currentSpent: number;
  /** Postes "Fait par moi" sélectionnés dans le tableau budget (affichés pour suivi) */
  diyItemNames?: string[];
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

/** Sanitise un segment de chemin pour Supabase Storage (évite Invalid key avec é, è, etc.) */
function sanitizeStoragePath(segment: string): string {
  return segment
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200) || "unknown";
}

/** Format fournisseur pour le nom de fichier : minuscules, sans espaces ni accents (ex: canac, renodepot) */
function supplierToFileName(supplier: string): string {
  return supplier
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 30) || "facture";
}

/** Date YYYY-MM-DD → DD-MM-YY pour le nom de fichier */
function dateToFileName(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y?.slice(-2) || ""}`;
}

export function DIYPurchaseInvoices({
  projectId,
  categoryName,
  tradeId,
  onSpentUpdate,
  currentSpent,
  diyItemNames = [],
}: DIYPurchaseInvoicesProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PurchaseInvoice | null>(null);

  // Dialog for manual invoice entry
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAmountHT, setNewAmountHT] = useState(""); // montant avant taxes
  const [newTPS, setNewTPS] = useState("");            // TPS (5%)
  const [newTVQ, setNewTVQ] = useState("");            // TVQ (9.975%)
  const [newDescription, setNewDescription] = useState("");
  const [newSupplier, setNewSupplier] = useState("");  // nom du fournisseur
  const [newPurchaseDate, setNewPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]); // date d'achat
  // Auto-calculate taxes
  const amountHTNum = parseFloat(newAmountHT) || 0;
  const tpsNum = parseFloat(newTPS) || 0;
  const tvqNum = parseFloat(newTVQ) || 0;
  const totalTTC = amountHTNum + tpsNum + tvqNum;

  const queryKey = ["diy-invoices", projectId, tradeId];

  // Fetch invoices for this trade category
  const { data: invoices = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("project_id", projectId)
        .eq("step_id", "factures-materiaux")
        .eq("task_id", `facture-diy-${tradeId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Parse amount, notes, supplier and purchase_date from file_name metadata
      return (data || []).map((row) => {
        let amount: number | undefined;
        let notes: string | undefined;
        let supplier: string | undefined;
        let purchase_date: string | undefined;
        try {
          const meta = JSON.parse(row.file_name.includes("||META||")
            ? row.file_name.split("||META||")[1]
            : "{}");
          amount = meta.amount;
          notes = meta.notes;
          supplier = meta.supplier || undefined;
          purchase_date = meta.purchase_date || undefined;
        } catch {}
        const displayName = row.file_name.includes("||META||")
          ? row.file_name.split("||META||")[0]
          : row.file_name;
        return { ...row, file_name: displayName, amount, notes, supplier, purchase_date } as PurchaseInvoice;
      });
    },
    enabled: !!projectId,
  });

  const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Upload direct : télécharger ou photo → enregistrement immédiat, puis Analyser sur la carte
  const handleFilesSelected = async (files: FileList) => {
    const file = files[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      // Sur mobile (iOS/Android), le FileList peut être invalidé quand l'app passe en arrière-plan
      // pendant la capture photo. Copier le fichier en mémoire immédiatement.
      const fileBuffer = await file.arrayBuffer();
      const ext = file.name?.match(/\.(heic|heif|jpg|jpeg|png|webp|pdf)$/i)?.[1]?.toLowerCase()
        || (file.type?.includes("pdf") ? "pdf" : file.type?.includes("heic") ? "heic" : "jpg");
      const baseName = file.name?.trim() && sanitizeFileName(file.name) !== ""
        ? sanitizeFileName(file.name).replace(/\.[^.]+$/, "") || `facture_${Date.now()}`
        : `facture_${Date.now()}`;
      const safeName = `${baseName}.${ext}`;
      const fileToUpload = new File([fileBuffer], safeName, {
        type: file.type || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
      });

      const storagePath = `${user.id}/factures-materiaux/${sanitizeStoragePath(tradeId)}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(storagePath);

      const { data: inserted, error: insertErr } = await supabase
        .from("task_attachments")
        .insert({
          project_id: projectId,
          step_id: "factures-materiaux",
          task_id: `facture-diy-${tradeId}`,
          file_name: file.name || safeName,
          file_url: urlData.publicUrl,
          file_type: fileToUpload.type || "application/octet-stream",
          file_size: fileToUpload.size,
          category: "facture",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey });

      const newInvoice: PurchaseInvoice = {
        ...inserted,
        file_name: inserted.file_name,
        amount: undefined,
        supplier: undefined,
        purchase_date: undefined,
        notes: undefined,
      };
      openEditDialog(newInvoice);
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(msg?.includes("Payload too large") || msg?.includes("413")
        ? "Photo trop volumineuse. Réduisez la taille ou prenez une photo de moins bonne qualité."
        : msg?.includes("Failed to fetch") || msg?.includes("NetworkError")
        ? "Problème de connexion. Vérifiez votre réseau et réessayez."
        : `Erreur lors du téléchargement: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  // Analyser une facture existante (IA lit fournisseur, date, prix)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const extractFromExistingInvoice = async (invoice: PurchaseInvoice) => {
    setAnalyzingId(invoice.id);
    try {
      let fileUrl = invoice.file_url;
      const signed = await getSignedUrlFromPublicUrl(invoice.file_url);
      if (signed) fileUrl = signed;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-invoice-price`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fileUrl, fileName: invoice.file_name }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error || "Impossible d'analyser la facture";
        const hint = response.status === 500
          ? " Vérifiez que GEMINI_API_KEY est configurée dans Supabase (Edge Functions > Secrets)."
          : "";
        toast.error(msg + hint);
        return;
      }

      const result = await response.json();
      if (result.confidence === "none" || result.amountHT == null) {
        toast.info("Prix non détecté — utilisez « Modifier » pour saisir manuellement");
        window.dispatchEvent(new CustomEvent("subscription-refetch"));
        return;
      }

      const supplierPart = result.supplier?.trim() || null;
      const datePart = result.purchase_date || null;
      const amount = Number(result.amountHT) || 0;
      const fileExt = invoice.file_name.split(".").pop() || "pdf";
      let displayName = invoice.file_name;
      if (supplierPart && datePart) {
        displayName = `${supplierToFileName(supplierPart)}${dateToFileName(datePart)}.${fileExt}`;
      } else if (supplierPart) {
        displayName = `${supplierToFileName(supplierPart)}.${fileExt}`;
      }

      const meta = JSON.stringify({
        amount,
        tps: result.tps || 0,
        tvq: result.tvq || 0,
        totalTTC: result.totalTTC || amount,
        notes: result.notes || "",
        supplier: supplierPart,
        purchase_date: datePart,
      });
      const fileNameWithMeta = `${displayName}||META||${meta}`;

      const { error } = await supabase
        .from("task_attachments")
        .update({ file_name: fileNameWithMeta })
        .eq("id", invoice.id);

      if (error) throw error;

      const newTotal = totalInvoices - (invoice.amount || 0) + amount;
      onSpentUpdate(newTotal);
      queryClient.invalidateQueries({ queryKey });
      if (editingInvoice?.id === invoice.id) {
        setShowAddDialog(false);
        setEditingInvoice(null);
      }
      toast.success("Champs remplis automatiquement — vérifiez et modifiez si besoin");
      window.dispatchEvent(new CustomEvent("subscription-refetch"));
    } catch (err) {
      console.error("Extract error:", err);
      const msg = (err instanceof Error && err.message?.includes("fetch"))
        ? "Connexion au service d'analyse impossible. Vérifiez CORS et GEMINI_API_KEY dans Supabase."
        : "Erreur lors de l'analyse";
      toast.error(msg);
    } finally {
      setAnalyzingId(null);
    }
  };

  const openEditDialog = (invoice: PurchaseInvoice) => {
    setEditingInvoice(invoice);
    setNewAmountHT(invoice.amount ? String(invoice.amount) : "");
    setNewTPS("");
    setNewTVQ("");
    setNewDescription(invoice.notes || "");
    setNewSupplier(invoice.supplier || "");
    setNewPurchaseDate(invoice.purchase_date || new Date().toISOString().split("T")[0]);
    setShowAddDialog(true);
  };
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;
    if (!newAmountHT || amountHTNum <= 0) {
      toast.error("Veuillez entrer le montant avant taxes de la facture");
      return;
    }

    setUploading(true);
    try {
      const amount = amountHTNum;
      const supplierPart = newSupplier.trim() || null;
      const datePart = newPurchaseDate || null;
      const fileExt = editingInvoice.file_name.split(".").pop() || "pdf";
      let displayName = editingInvoice.file_name;
      if (supplierPart && datePart) {
        displayName = `${supplierToFileName(supplierPart)}${dateToFileName(datePart)}.${fileExt}`;
      } else if (supplierPart) {
        displayName = `${supplierToFileName(supplierPart)}.${fileExt}`;
      }

      const meta = JSON.stringify({
        amount,
        tps: tpsNum,
        tvq: tvqNum,
        totalTTC: totalTTC || amount,
        notes: newDescription,
        supplier: supplierPart,
        purchase_date: datePart,
      });
      const fileNameWithMeta = `${displayName}||META||${meta}`;

      const { error } = await supabase
        .from("task_attachments")
        .update({ file_name: fileNameWithMeta })
        .eq("id", editingInvoice.id);

      if (error) throw error;

      const newTotal = totalInvoices - (editingInvoice.amount || 0) + amount;
      onSpentUpdate(newTotal);

      queryClient.invalidateQueries({ queryKey });
      toast.success("Facture mise à jour");
      setShowAddDialog(false);
      setEditingInvoice(null);
      setNewAmountHT("");
      setNewTPS("");
      setNewTVQ("");
      setNewDescription("");
      setNewSupplier("");
      setNewPurchaseDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Erreur lors du téléchargement de la facture");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (invoice: PurchaseInvoice) => {
    try {
      // Delete from storage
      const bucketMarker = "/task-attachments/";
      const markerIndex = invoice.file_url.indexOf(bucketMarker);
      if (markerIndex >= 0) {
        const path = invoice.file_url.slice(markerIndex + bucketMarker.length).split("?")[0];
        await supabase.storage.from("task-attachments").remove([path]);
      }

      // Delete from DB
      await supabase.from("task_attachments").delete().eq("id", invoice.id);

      // Update spent
      const newTotal = totalInvoices - (invoice.amount || 0);
      onSpentUpdate(Math.max(0, newTotal));

      queryClient.invalidateQueries({ queryKey });
      toast.success("Facture supprimée");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handlePreview = async (invoice: PurchaseInvoice) => {
    setPreviewFile(invoice);
    setPreviewUrl(null); // reset pendant le chargement
    try {
      const signed = await getSignedUrlFromPublicUrl(invoice.file_url);
      setPreviewUrl(signed || invoice.file_url);
    } catch {
      setPreviewUrl(invoice.file_url);
    }
  };

  const isImage = (type: string) => type.startsWith("image/");
  const isPdf = (type: string) => type === "application/pdf";

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Receipt className="h-4 w-4" />
            Factures d'achat de matériaux
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enregistrez vos factures réelles pour suivre vos dépenses DIY
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {totalInvoices > 0 && (
            <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
              <DollarSign className="h-3 w-3 mr-1" />
              {formatCurrency(totalInvoices)}
            </Badge>
          )}
          <FileOrPhotoUpload
            onFilesSelected={handleFilesSelected}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            uploading={uploading}
            fileLabel="Télécharger la facture"
            photoLabel="Prendre une photo"
            fileVariant="outline"
            photoVariant="outline"
            className="[&>button]:border-primary [&>button]:text-primary [&>button]:hover:bg-primary/5"
          />
        </div>
      </div>

      {/* Postes Fait par moi sélectionnés dans le tableau budget */}
      {diyItemNames.length > 0 && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-3">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1.5">
            Postes Fait par moi pour cette catégorie :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {diyItemNames.map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="text-xs font-normal border-emerald-400 text-emerald-700 dark:text-emerald-400"
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Invoice list */}
      {isLoading ? (
        <div className="text-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/20">
          <Package className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Aucune facture enregistrée
          </p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Photographiez ou téléchargez vos factures d'achat de matériaux pour suivre vos dépenses réelles
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              {/* File icon + info (grouped for mobile) */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-9 h-9 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  {isImage(invoice.file_type) ? (
                    <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : isPdf(invoice.file_type) ? (
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{invoice.file_name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  {invoice.supplier && (
                    <span className="text-xs font-semibold text-foreground truncate">
                      🏪 {invoice.supplier}
                    </span>
                  )}
                  {invoice.purchase_date && (
                    <span className="text-xs text-muted-foreground">
                      📅 {new Date(invoice.purchase_date + "T12:00:00").toLocaleDateString("fr-CA")}
                    </span>
                  )}
                  {invoice.amount !== undefined && invoice.amount > 0 && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(invoice.amount)} HT
                    </span>
                  )}
                  {invoice.notes && !invoice.supplier && (
                    <span className="text-xs text-muted-foreground truncate">
                      • {invoice.notes}
                    </span>
                  )}
                  {!invoice.purchase_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString("fr-CA")}
                    </span>
                  )}
                </div>
              </div>
            </div>

              {/* Actions */}
              <div className="flex items-center justify-end sm:justify-start gap-1 shrink-0 self-end sm:self-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                  onClick={() => extractFromExistingInvoice(invoice)}
                  disabled={!!analyzingId}
                  title="Utilisez le bouton Analyser pour remplir les champs du fichier"
                >
                  {analyzingId === invoice.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                  onClick={() => openEditDialog(invoice)}
                  title="Modifier"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                  onClick={() => handlePreview(invoice)}
                  title="Aperçu"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 text-destructive hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. La facture et son montant seront retirés de votre budget.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(invoice)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {/* Total */}
          {invoices.length > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-emerald-200 dark:border-emerald-800">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Total des factures ({invoices.length}) :
              </span>
              <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(totalInvoices)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add Invoice Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingInvoice(null);
          setNewAmountHT("");
          setNewTPS("");
          setNewTVQ("");
          setNewDescription("");
          setNewSupplier("");
          setNewPurchaseDate(new Date().toISOString().split("T")[0]);
        }
      }}>
        <DialogContent className="w-[100vw] sm:w-auto sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg" aria-describedby="edit-invoice-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-600" />
              {editingInvoice && (editingInvoice.amount == null || editingInvoice.amount === 0)
                ? "Compléter la facture"
                : "Modifier la facture"}
            </DialogTitle>
            <DialogDescription id="edit-invoice-desc" className="sr-only">
              Remplissez les champs ou utilisez l'IA pour extraire automatiquement les informations de la facture.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Colonne gauche */}
            <div className="space-y-3">
              {/* Action requise + Bouton Analyser */}
              {editingInvoice && (editingInvoice.amount == null || editingInvoice.amount === 0) && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                  <p className="text-sm font-medium text-primary">
                    Action requise pour cette facture
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Utilisez l'IA pour remplir automatiquement les champs, ou saisissez-les manuellement à droite.
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => extractFromExistingInvoice(editingInvoice)}
                    disabled={!!analyzingId}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {analyzingId === editingInvoice.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyse en cours…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyser avec l'IA
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* File info */}
              {editingInvoice && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  {editingInvoice.file_type?.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{editingInvoice.file_name}</p>
                  </div>
                </div>
              )}

              {/* Montant + Taxes */}
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-2">
                  ⚠️ Montant <strong>avant taxes</strong> (obligatoire)
                </p>
                <div className="space-y-2">
                  <Input
                    id="invoice-amount-ht"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAmountHT}
                    onChange={(e) => setNewAmountHT(e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="invoice-tps" className="text-xs">TPS (5%)</Label>
                      <Input
                        id="invoice-tps"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newTPS}
                        onChange={(e) => setNewTPS(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="invoice-tvq" className="text-xs">TVQ (9.975%)</Label>
                      <Input
                        id="invoice-tvq"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newTVQ}
                        onChange={(e) => setNewTVQ(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {totalTTC > 0 && (
                    <p className="text-xs">Total TTC : <span className="font-semibold">{formatCurrency(totalTTC)}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invoice-supplier">🏪 Fournisseur</Label>
                <Input
                  id="invoice-supplier"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="Ex: Canac, Rona, Réno-Dépôt..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-date">📅 Date d'achat</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={newPurchaseDate}
                  onChange={(e) => setNewPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-description">
                  Items achetés <span className="text-muted-foreground text-xs">(optionnel)</span>
                </Label>
                <Input
                  id="invoice-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Ciment, Céramique..."
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); }}
                />
              </div>
              {(newSupplier.trim() || newPurchaseDate) && editingInvoice && (
                <div className="p-2 rounded border bg-muted/20 text-xs">
                  📁 {newSupplier.trim() && newPurchaseDate
                    ? `${supplierToFileName(newSupplier)}${dateToFileName(newPurchaseDate)}.${editingInvoice.file_name.split(".").pop() || "pdf"}`
                    : newSupplier.trim()
                      ? `${supplierToFileName(newSupplier)}.${editingInvoice.file_name.split(".").pop() || "pdf"}`
                      : editingInvoice.file_name}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                📁 Catégorie : <strong>{categoryName}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingInvoice(null);
              setNewAmountHT("");
              setNewTPS("");
              setNewTVQ("");
              setNewDescription("");
              setNewSupplier("");
              setNewPurchaseDate(new Date().toISOString().split("T")[0]);
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={uploading || !editingInvoice || !newAmountHT || amountHTNum <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => {
        if (!open) { setPreviewFile(null); setPreviewUrl(null); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh]" aria-describedby="preview-invoice-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 truncate">
              <Receipt className="h-4 w-4 shrink-0 text-emerald-600" />
              {previewFile?.file_name}
              {previewFile?.amount && (
                <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-300">
                  {formatCurrency(previewFile.amount)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription id="preview-invoice-desc" className="sr-only">
              Aperçu du fichier de la facture.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {!previewUrl ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Chargement de l'aperçu…</p>
              </div>
            ) : previewFile && isImage(previewFile.file_type) ? (
              <img
                src={previewUrl}
                alt={previewFile.file_name}
                className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg"
              />
            ) : previewFile && isPdf(previewFile.file_type) ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-[60vh] rounded-lg border"
                title={previewFile.file_name}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p>Aperçu non disponible</p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 justify-center mt-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir le fichier
                </a>
              </div>
            )}
          </div>
          {previewFile?.notes && (
            <p className="text-sm text-muted-foreground border-t pt-3">
              📝 {previewFile.notes}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
