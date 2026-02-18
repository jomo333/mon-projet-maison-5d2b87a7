import { useState } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { FileOrPhotoUpload } from "@/components/ui/file-or-photo-upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSignedUrl } from "@/hooks/useSignedUrl";
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
  CheckCircle2,
  Package,
  ExternalLink,
  Sparkles,
  AlertCircle,
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
}

interface DIYPurchaseInvoicesProps {
  projectId: string;
  categoryName: string;
  tradeId: string;
  onSpentUpdate: (amount: number) => void;
  currentSpent: number;
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export function DIYPurchaseInvoices({
  projectId,
  categoryName,
  tradeId,
  onSpentUpdate,
  currentSpent,
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionConfidence, setExtractionConfidence] = useState<"high" | "medium" | "low" | "none" | null>(null);

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

      // Parse amount and notes from file_name metadata
      return (data || []).map((row) => {
        let amount: number | undefined;
        let notes: string | undefined;
        try {
          const meta = JSON.parse(row.file_name.includes("||META||")
            ? row.file_name.split("||META||")[1]
            : "{}");
          amount = meta.amount;
          notes = meta.notes;
        } catch {}
        const displayName = row.file_name.includes("||META||")
          ? row.file_name.split("||META||")[0]
          : row.file_name;
        return { ...row, file_name: displayName, amount, notes } as PurchaseInvoice;
      });
    },
    enabled: !!projectId,
  });

  const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const extractPriceFromFile = async (file: File) => {
    setIsExtracting(true);
    setExtractionConfidence(null);
    try {
      // Upload file temporarily to get a URL for the AI to read
      if (!user) return;
      const sanitizedName = sanitizeFileName(file.name);
      const tempPath = `${user.id}/temp-extract/${Date.now()}_${sanitizedName}`;

      const { error: uploadErr } = await supabase.storage
        .from("task-attachments")
        .upload(tempPath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(tempPath);

      // Call the extraction edge function
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
          body: JSON.stringify({ fileUrl: urlData.publicUrl, fileName: file.name }),
        }
      );

      // Clean up temp file
      await supabase.storage.from("task-attachments").remove([tempPath]);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData?.error || "Impossible d'extraire le prix automatiquement");
        return;
      }

      const result = await response.json();

      if (result.confidence !== "none" && result.amountHT !== null) {
        setNewAmountHT(result.amountHT.toFixed(2));
        if (result.tps && result.tps > 0) setNewTPS(result.tps.toFixed(2));
        if (result.tvq && result.tvq > 0) setNewTVQ(result.tvq.toFixed(2));
        if (result.notes) setNewDescription(result.notes);
        setExtractionConfidence(result.confidence);
        toast.success("💡 Prix extrait automatiquement — vérifiez et ajustez si nécessaire");
      } else {
        toast.info("Prix non trouvé automatiquement — entrez le montant manuellement");
      }
    } catch (err) {
      console.error("Price extraction error:", err);
      // Silent fail — user can enter manually
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFilesSelected = (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setPendingFile(file);
    setShowAddDialog(true);
    // Auto-extract price from the file
    extractPriceFromFile(file);
  };

  const handleUpload = async () => {
    if (!pendingFile || !user) return;
    if (!newAmountHT || amountHTNum <= 0) {
      toast.error("Veuillez entrer le montant avant taxes de la facture");
      return;
    }

    setUploading(true);
    try {
      // Only the pre-tax amount (HT) is tracked in the budget
      const amount = amountHTNum;
      const sanitizedName = sanitizeFileName(pendingFile.name);
      const storagePath = `${user.id}/factures-materiaux/${tradeId}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, pendingFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(storagePath);

      // Store amount (HT) and taxes in file_name metadata — only HT goes to budget
      const meta = JSON.stringify({
        amount,          // montant avant taxes, seul montant enregistré au budget
        tps: tpsNum,
        tvq: tvqNum,
        totalTTC: totalTTC || amount,
        notes: newDescription,
      });
      const fileNameWithMeta = `${pendingFile.name}||META||${meta}`;

      const { error: dbError } = await supabase.from("task_attachments").insert({
        project_id: projectId,
        step_id: "factures-materiaux",
        task_id: `facture-diy-${tradeId}`,
        file_name: fileNameWithMeta,
        file_url: urlData.publicUrl,
        file_type: pendingFile.type,
        file_size: pendingFile.size,
        category: "facture",
      });

      if (dbError) throw dbError;

      // Update spent in budget
      const newTotal = totalInvoices + amount;
      onSpentUpdate(newTotal);

      queryClient.invalidateQueries({ queryKey });
      toast.success(`Facture ajoutée : ${formatCurrency(amount)} (avant taxes)`);

      setShowAddDialog(false);
      setPendingFile(null);
      setNewAmountHT("");
      setNewTPS("");
      setNewTVQ("");
      setNewDescription("");
    } catch (error) {
      console.error("Upload error:", error);
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
    // Try to get signed URL
    const bucketMarker = "/task-attachments/";
    const markerIndex = invoice.file_url.indexOf(bucketMarker);
    if (markerIndex >= 0) {
      const path = invoice.file_url.slice(markerIndex + bucketMarker.length).split("?")[0];
      const signed = await getSignedUrl("task-attachments", path);
      setPreviewUrl(signed || invoice.file_url);
    } else {
      setPreviewUrl(invoice.file_url);
    }
  };

  const isImage = (type: string) => type.startsWith("image/");
  const isPdf = (type: string) => type === "application/pdf";

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Receipt className="h-4 w-4" />
            Factures d'achat de matériaux
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enregistrez vos factures réelles pour suivre vos dépenses DIY
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            fileLabel="Fichier / PDF"
            photoLabel="Photo de facture"
            fileVariant="outline"
            photoVariant="outline"
            className="[&>button]:border-emerald-300 [&>button]:text-emerald-700 [&>button]:hover:bg-emerald-50 dark:[&>button]:border-emerald-700 dark:[&>button]:text-emerald-400 dark:[&>button]:hover:bg-emerald-950/50"
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-1.5">
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-emerald-600" />
          Les montants <strong>avant taxes</strong> sont automatiquement ajoutés au <strong>coût réel</strong> de cette catégorie dans votre budget.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <span className="shrink-0">⚠️</span>
          Le budget n'affiche pas les taxes (TPS/TVQ) — entrez toujours vos montants <strong>avant taxes</strong>.
        </p>
      </div>

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
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              {/* File icon */}
              <div className="shrink-0 w-9 h-9 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                {isImage(invoice.file_type) ? (
                  <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : isPdf(invoice.file_type) ? (
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{invoice.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {invoice.amount !== undefined && invoice.amount > 0 && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(invoice.amount)}
                    </span>
                  )}
                  {invoice.notes && (
                    <span className="text-xs text-muted-foreground truncate">
                      • {invoice.notes}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(invoice.created_at).toLocaleDateString("fr-CA")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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
                      className="h-8 w-8 text-destructive hover:text-destructive"
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
          setPendingFile(null);
          setNewAmountHT("");
          setNewTPS("");
          setNewTVQ("");
          setNewDescription("");
          setExtractionConfidence(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Enregistrer une facture
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* File info */}
            {pendingFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                {pendingFile.type.startsWith("image/") ? (
                  <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(pendingFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            )}

            {/* AI extraction status / result */}
            {isExtracting ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">Lecture automatique en cours…</p>
                  <p className="text-xs text-muted-foreground">L'IA analyse votre facture pour extraire le prix</p>
                </div>
              </div>
            ) : extractionConfidence && extractionConfidence !== "none" ? (
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                extractionConfidence === "high" 
                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30" 
                  : "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30"
              }`}>
                <Sparkles className={`h-4 w-4 shrink-0 ${extractionConfidence === "high" ? "text-emerald-600" : "text-amber-600"}`} />
                <div className="flex-1">
                  <p className={`text-xs font-medium ${extractionConfidence === "high" ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
                    {extractionConfidence === "high" ? "✅ Prix détecté automatiquement" : "⚠️ Prix détecté — vérifiez les montants"}
                  </p>
                  <p className="text-xs text-muted-foreground">Vérifiez et corrigez si nécessaire avant d'enregistrer</p>
                </div>
              </div>
            ) : extractionConfidence === "none" ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
                <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Prix non détecté — entrez le montant manuellement</p>
              </div>
            ) : null}

            {/* Important tax notice */}
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-start gap-1.5">
                ⚠️ Entrez le montant <strong>avant taxes</strong> — le budget n'affiche pas les taxes (TPS/TVQ). Vous pouvez indiquer les taxes séparément pour référence uniquement.
              </p>
            </div>

            {/* Amount before taxes - required */}
            <div className="space-y-2">
              <Label htmlFor="invoice-amount-ht" className="flex items-center gap-1 font-semibold">
                <DollarSign className="h-3.5 w-3.5" />
                Montant <strong>avant taxes</strong> <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invoice-amount-ht"
                type="number"
                step="0.01"
                min="0"
                value={newAmountHT}
                onChange={(e) => setNewAmountHT(e.target.value)}
                placeholder="0.00"
                className="max-w-[200px]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Ce montant sera enregistré dans votre budget (coût réel).
              </p>
            </div>

            {/* Taxes - optional, for reference only */}
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground">Taxes (pour référence, non comptabilisées au budget)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="invoice-tps" className="text-xs">TPS (5%)</Label>
                  <Input
                    id="invoice-tps"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTPS}
                    onChange={(e) => setNewTPS(e.target.value)}
                    placeholder={amountHTNum > 0 ? (amountHTNum * 0.05).toFixed(2) : "0.00"}
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
                    placeholder={amountHTNum > 0 ? (amountHTNum * 0.09975).toFixed(2) : "0.00"}
                  />
                </div>
              </div>
              {totalTTC > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total avec taxes : <span className="font-semibold">{formatCurrency(totalTTC)}</span>
                </p>
              )}
            </div>

            {/* Description - optional */}
            <div className="space-y-2">
              <Label htmlFor="invoice-description">
                Description <span className="text-muted-foreground text-xs">(optionnel)</span>
              </Label>
              <Input
                id="invoice-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ex: Ciment, Céramique salle de bain..."
                onKeyDown={(e) => { if (e.key === "Enter") handleUpload(); }}
              />
            </div>

            {/* Category info */}
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
              <p className="text-xs text-muted-foreground">
                📁 Sera enregistré dans <strong>Mes Dossiers → Factures matériaux</strong> sous la catégorie <strong>{categoryName}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setPendingFile(null);
              setNewAmountHT("");
              setNewTPS("");
              setNewTVQ("");
              setNewDescription("");
              setExtractionConfidence(null);
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || isExtracting || !newAmountHT || amountHTNum <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isExtracting ? (
                <Sparkles className="h-4 w-4 animate-pulse mr-2" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              {isExtracting ? "Lecture en cours…" : "Enregistrer la facture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => {
        if (!open) { setPreviewFile(null); setPreviewUrl(null); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
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
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewUrl && previewFile && isImage(previewFile.file_type) ? (
              <img
                src={previewUrl}
                alt={previewFile.file_name}
                className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg"
              />
            ) : previewUrl && previewFile && isPdf(previewFile.file_type) ? (
              <iframe
                src={previewUrl}
                className="w-full h-[60vh] rounded-lg border"
                title={previewFile.file_name}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p>Aperçu non disponible</p>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 justify-center mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir le fichier
                  </a>
                )}
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
