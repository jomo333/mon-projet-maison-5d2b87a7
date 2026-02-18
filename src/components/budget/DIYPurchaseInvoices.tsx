import { useState, useRef } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
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
  Upload,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PurchaseInvoice | null>(null);

  // Dialog for manual invoice entry
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowAddDialog(true);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!pendingFile || !user) return;
    if (!newAmount || parseFloat(newAmount) <= 0) {
      toast.error("Veuillez entrer le montant de la facture");
      return;
    }

    setUploading(true);
    try {
      const amount = parseFloat(newAmount) || 0;
      const sanitizedName = sanitizeFileName(pendingFile.name);
      const storagePath = `${user.id}/factures-materiaux/${tradeId}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, pendingFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(storagePath);

      // Store amount and notes in file_name with separator
      const meta = JSON.stringify({ amount, notes: newDescription });
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
      toast.success(`Facture ajoutée : ${formatCurrency(amount)}`);

      setShowAddDialog(false);
      setPendingFile(null);
      setNewAmount("");
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
          >
            <Upload className="h-3 w-3" />
            Ajouter une facture
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-emerald-600" />
          Les montants de vos factures sont automatiquement ajoutés au <strong>coût réel</strong> de cette catégorie dans votre budget, et enregistrés dans <strong>Mes Dossiers</strong>.
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
          setNewAmount("");
          setNewDescription("");
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

            {/* Amount - required */}
            <div className="space-y-2">
              <Label htmlFor="invoice-amount" className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Montant de la facture <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invoice-amount"
                type="number"
                step="0.01"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                className="max-w-[200px]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Ce montant sera ajouté à votre coût réel budgétaire.
              </p>
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
              setNewAmount("");
              setNewDescription("");
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !newAmount || parseFloat(newAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              Enregistrer la facture
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
