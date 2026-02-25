import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileDown, FolderArchive, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface BudgetCategoryForPdf {
  name: string;
  budget: number;
  spent: number;
  items?: { name: string; cost: number; quantity: string; unit: string }[];
}

interface BudgetPdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetCategories: BudgetCategoryForPdf[];
  projectName: string | null;
  projectId: string | null;
  translateCategoryName: (name: string) => string;
  formatCurrency: (n: number) => string;
  userDisplayName: string | null;
  userEmail: string | null;
  profileAddress: string | null;
  profilePhone: string | null;
  userId: string | null;
  onProfileUpdated?: () => void;
  onSavedToDossiers?: () => void;
}

type PdfType = "preliminary" | "actual";

export function BudgetPdfExportDialog({
  open,
  onOpenChange,
  budgetCategories,
  projectName,
  translateCategoryName,
  formatCurrency,
  userDisplayName,
  userEmail,
  profileAddress,
  profilePhone,
  userId,
  onProfileUpdated,
  projectId,
  onSavedToDossiers,
}: BudgetPdfExportDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pdfType, setPdfType] = useState<PdfType>("preliminary");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<"choose" | "contact" | "success">("choose");
  const [address, setAddress] = useState(profileAddress ?? "");
  const [phone, setPhone] = useState(profilePhone ?? "");
  const [savingContact, setSavingContact] = useState(false);
  const [saveToDossiers, setSaveToDossiers] = useState(true);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [savedToDossiers, setSavedToDossiers] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("choose");
      setAddress(profileAddress ?? "");
      setPhone(profilePhone ?? "");
      setPdfPreviewUrl(null);
      setSavedToDossiers(false);
    }
  }, [open, profileAddress, profilePhone]);

  useEffect(() => {
    if (!open && pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  }, [open, pdfPreviewUrl]);

  const needContact = (!profileAddress?.trim() || !profilePhone?.trim());

  const handleSaveContact = async () => {
    if (!userId?.trim()) return;
    setSavingContact(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          address: address.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success(t("budget.pdf.contactSaved", "Coordonnées enregistrées"));
      onProfileUpdated?.();
      setStep("choose");
    } catch (e) {
      console.error(e);
      toast.error(t("common.error"));
    } finally {
      setSavingContact(false);
    }
  };

  const buildPdf = (
    type: PdfType,
    contact: { displayName: string; email: string; address: string; phone: string }
  ): { blob: Blob; fileName: string } => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    const title = type === "preliminary"
      ? t("budget.pdf.titlePreliminary", "Budget préliminaire – Présentation au prêteur")
      : t("budget.pdf.titleActual", "Budget réel dépensé – Suivi des coûts");
    const subtitle = projectName
      ? t("budget.pdf.project", "Projet") + " : " + projectName
      : "";

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Mon Projet Maison", margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(title, margin, y);
    y += 6;
    if (subtitle) {
      doc.setFontSize(10);
      doc.text(subtitle, margin, y);
      y += 6;
    }

    if (contact.address || contact.phone || contact.displayName || contact.email) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(t("budget.pdf.contactInfo", "Coordonnées du propriétaire"), margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      if (contact.displayName) doc.text(contact.displayName, margin, y), (y += 5);
      if (contact.address) doc.text(contact.address, margin, y), (y += 5);
      if (contact.phone) doc.text(t("budget.pdf.phone", "Tél.") + " : " + contact.phone, margin, y), (y += 5);
      if (contact.email) doc.text(t("budget.pdf.email", "Courriel") + " : " + contact.email, margin, y), (y += 5);
      y += 4;
    }

    const tableStartY = y;
    const rows: string[][] = [];
    const isActual = type === "actual";

    if (isActual) {
      rows.push([
        t("budget.pdf.category", "Catégorie"),
        t("budget.pdf.item", "Poste"),
        t("budget.pdf.budget", "Budget prévu"),
        t("budget.pdf.spent", "Dépensé"),
      ]);
    } else {
      rows.push([
        t("budget.pdf.category", "Catégorie"),
        t("budget.pdf.item", "Poste"),
        t("budget.pdf.budget", "Budget prévu"),
      ]);
    }

    for (const cat of budgetCategories) {
      const catLabel = translateCategoryName(cat.name);
      const items = cat.items && cat.items.length > 0
        ? cat.items
        : [{ name: catLabel, cost: cat.budget, quantity: "1", unit: "" }];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const cost = Number(item.cost) || 0;
        if (isActual) {
          rows.push([
            i === 0 ? catLabel : "",
            item.name,
            formatCurrency(cost),
            i === 0 ? formatCurrency(cat.spent) : "",
          ]);
        } else {
          rows.push([i === 0 ? catLabel : "", item.name, formatCurrency(cost)]);
        }
      }
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [rows[0]],
      body: rows.slice(1),
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      columnStyles: isActual
        ? { 0: { cellWidth: 38 }, 1: { cellWidth: 60 }, 2: { cellWidth: 32 }, 3: { cellWidth: 32 } }
        : { 0: { cellWidth: 45 }, 1: { cellWidth: 95 }, 2: { cellWidth: 40 } },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? tableStartY + 20;
    y = finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const totalBudgetStr = formatCurrency(budgetCategories.reduce((s, c) => s + (Number(c.budget) || 0), 0));
    const totalSpentStr = formatCurrency(budgetCategories.reduce((s, c) => s + (Number(c.spent) || 0), 0));
    if (isActual) {
      doc.text(t("budget.pdf.totalBudget", "Total budget prévu") + " : " + totalBudgetStr, margin, y);
      y += 6;
      doc.text(t("budget.pdf.totalSpent", "Total dépensé") + " : " + totalSpentStr, margin, y);
    } else {
      doc.text(t("budget.pdf.total", "Total prévu") + " : " + totalBudgetStr, margin, y);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      t("budget.pdf.disclaimer", "Document généré par Mon Projet Maison – À titre informatif. Consultez un professionnel pour toute décision financière."),
      margin,
      doc.internal.pageSize.getHeight() - 10,
      { maxWidth: pageW - 2 * margin }
    );

    const fileName =
      (type === "preliminary" ? "budget-preliminaire-" : "budget-reel-") +
      (projectName?.replace(/\s+/g, "-") || "projet") +
      ".pdf";
    const blob = doc.output("blob");
    return { blob, fileName };
  };

  const handleGenerate = async () => {
    if (needContact && step === "contact") {
      const addr = address.trim();
      const ph = phone.trim();
      if (!addr || !ph) {
        toast.error(t("budget.pdf.fillContact", "Veuillez remplir l'adresse et le numéro de téléphone."));
        return;
      }
      await handleSaveContact();
      return;
    }

    if (needContact && step === "choose") {
      setStep("contact");
      return;
    }

    setGenerating(true);
    try {
      const contact = {
        displayName: userDisplayName ?? "",
        email: userEmail ?? "",
        address: profileAddress ?? address.trim(),
        phone: profilePhone ?? phone.trim(),
      };
      const { blob, fileName } = buildPdf(pdfType, contact);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();

      let didSaveToDossiers = false;
      if (saveToDossiers && projectId && userId) {
        const path = `${userId}/${projectId}/bilan/${fileName}`;
        const { error: storageError } = await supabase.storage
          .from("task-attachments")
          .upload(path, blob, { contentType: "application/pdf", upsert: true });
        if (storageError) {
          toast.error(t("budget.pdf.saveError", "Erreur d'enregistrement") + ": " + storageError.message);
        } else {
          const { data: urlData } = supabase.storage.from("task-attachments").getPublicUrl(path);
          const taskId = pdfType === "preliminary" ? "bilan-preliminaire" : "bilan-reel";
          const { error: dbError } = await supabase.from("task_attachments").insert({
            project_id: projectId,
            step_id: "bilan",
            task_id: taskId,
            file_name: fileName,
            file_url: urlData.publicUrl,
            file_type: "application/pdf",
            file_size: blob.size,
            category: "bilan",
          });
          if (dbError) {
            toast.error(t("budget.pdf.saveError", "Erreur d'enregistrement") + ": " + dbError.message);
          } else {
            queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
            onSavedToDossiers?.();
            didSaveToDossiers = true;
          }
        }
      }

      setPdfPreviewUrl(url);
      setSavedToDossiers(didSaveToDossiers);
      setStep("success");
    } catch (e) {
      console.error(e);
      toast.error(t("common.error"));
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === "success" ? "sm:max-w-3xl max-h-[90vh] flex flex-col" : "sm:max-w-md"}>
        {step !== "success" && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              {t("budget.pdf.dialogTitle", "Créer un bilan PDF")}
            </DialogTitle>
            <DialogDescription>
              {step === "choose"
                ? t("budget.pdf.dialogDesc", "Choisissez le type de document à générer pour votre dossier financier.")
                : t("budget.pdf.contactDesc", "Complétez vos coordonnées pour les institutions. Elles seront enregistrées sur votre profil.")}
            </DialogDescription>
          </DialogHeader>
        )}

        {step === "choose" && (
          <RadioGroup value={pdfType} onValueChange={(v) => setPdfType(v as PdfType)} className="space-y-3">
            <div className="flex items-start space-x-3 border rounded-lg p-3">
              <RadioGroupItem value="preliminary" id="preliminary" />
              <Label htmlFor="preliminary" className="flex-1 cursor-pointer">
                <span className="font-medium">{t("budget.pdf.optionPreliminary", "Budget préliminaire")}</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("budget.pdf.optionPreliminaryDesc", "Budget établi par poste (IA) pour présentation au prêteur et préapprobation du financement.")}
                </p>
              </Label>
            </div>
            <div className="flex items-start space-x-3 border rounded-lg p-3">
              <RadioGroupItem value="actual" id="actual" />
              <Label htmlFor="actual" className="flex-1 cursor-pointer">
                <span className="font-medium">{t("budget.pdf.optionActual", "Budget réel dépensé")}</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("budget.pdf.optionActualDesc", "État des dépenses à jour par poste, avec vos coordonnées et le logo Mon Projet Maison.")}
                </p>
              </Label>
            </div>
          </RadioGroup>
        )}

        {step === "choose" && projectId && (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="save-to-dossiers"
              checked={saveToDossiers}
              onCheckedChange={(v) => setSaveToDossiers(!!v)}
            />
            <Label htmlFor="save-to-dossiers" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <FolderArchive className="h-4 w-4 text-muted-foreground" />
              {t("budget.pdf.saveToDossiers", "Enregistrer dans Mes Dossiers")}
            </Label>
          </div>
        )}

        {step === "success" && pdfPreviewUrl && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                {t("budget.pdf.previewTitle", "Aperçu du bilan")}
              </DialogTitle>
              <DialogDescription>
                {savedToDossiers
                  ? t("budget.pdf.savedToDossiersBilan", "Le PDF est maintenant dans Mes Dossiers > Bilan.")
                  : t("budget.pdf.downloaded", "PDF téléchargé")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-[400px] rounded-lg border bg-muted/30 overflow-hidden">
              <iframe
                title={t("budget.pdf.previewTitle", "Aperçu du bilan")}
                src={pdfPreviewUrl}
                className="w-full h-full min-h-[400px]"
              />
            </div>
          </div>
        )}

        {step === "contact" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("budget.pdf.contactRequired", "Pour les bilans (préliminaire et réel), les institutions demandent vos coordonnées. Renseignez-les ci-dessous (elles seront enregistrées).")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="pdf-address">{t("budget.pdf.address", "Adresse")}</Label>
              <Input
                id="pdf-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("budget.pdf.addressPlaceholder", "Numéro, rue, ville, code postal")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-phone">{t("budget.pdf.phone", "Téléphone")}</Label>
              <Input
                id="pdf-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("budget.pdf.phonePlaceholder", "514 555-1234")}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "success" ? (
            <Button onClick={() => handleClose(false)}>
              {t("common.close", "Fermer")}
            </Button>
          ) : (
            <>
              {step === "contact" && (
                <Button variant="outline" onClick={() => setStep("choose")} disabled={savingContact}>
                  {t("common.back", "Retour")}
                </Button>
              )}
              <Button onClick={handleGenerate} disabled={generating}>
                {generating || savingContact ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step === "contact" ? (
                  t("budget.pdf.saveAndContinue", "Enregistrer et continuer")
                ) : (
                  t("budget.pdf.generate", "Générer le PDF")
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
