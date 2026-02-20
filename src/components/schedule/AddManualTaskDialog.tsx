import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { fr, enCA } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarPlus, CalendarIcon, Layers, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { constructionSteps } from "@/data/constructionSteps";

/** Palette de couleurs pour les tâches manuelles (sans noms d'étapes) */
const TASK_COLOR_PALETTE = [
  "#6366F1", "#0EA5E9", "#F59E0B", "#10B981", "#EC4899",
  "#8B4513", "#3B82F6", "#DC2626", "#A855F7", "#14B8A6",
  "#475569", "#059669", "#0284C7", "#D97706", "#7C3AED",
];

export interface ManualTaskData {
  description: string;
  start_date: string;
  estimated_days: number;
  linked_step_id: string | null;
  is_overlay: boolean;
  trade_type: string;
  /** Couleur choisie (hex). Si fournie, remplace getTradeColor(trade_type). */
  trade_color?: string;
}

interface AddManualTaskDialogProps {
  projectId: string;
  onAdd: (task: ManualTaskData) => void | Promise<void>;
  calculateEndDate: (startDate: string, days: number) => string;
  /** Date présélectionnée (ex: jour cliqué sur le calendrier) */
  preselectedDate?: string | null;
  trigger?: React.ReactNode;
  /** Mode contrôlé : ouvert depuis l'extérieur (ex: clic sur un jour du calendrier) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddManualTaskDialog = ({
  projectId,
  onAdd,
  calculateEndDate,
  preselectedDate,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddManualTaskDialogProps) => {
  const { t, i18n } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const dateLocale = i18n.language === "en" ? enCA : fr;

  const [formData, setFormData] = useState<ManualTaskData>({
    description: "",
    start_date: preselectedDate || format(new Date(), "yyyy-MM-dd"),
    estimated_days: 1,
    linked_step_id: null,
    is_overlay: false,
    trade_type: "autre",
    trade_color: TASK_COLOR_PALETTE[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultFormData: ManualTaskData = {
    description: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    estimated_days: 1,
    linked_step_id: null,
    is_overlay: false,
    trade_type: "autre",
    trade_color: TASK_COLOR_PALETTE[0],
  };

  // Réinitialiser le formulaire et la date présélectionnée quand le dialogue s'ouvre
  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting && !nextOpen) return; // Empêcher la fermeture pendant l'envoi
    if (nextOpen) {
      setFormData({
        ...defaultFormData,
        start_date: preselectedDate || format(new Date(), "yyyy-MM-dd"),
      });
    }
    setOpen(nextOpen);
  };

  // Sync preselectedDate when dialog opens from external trigger (e.g. calendar day click)
  useEffect(() => {
    if (open && preselectedDate) {
      setFormData((prev) => ({ ...prev, start_date: preselectedDate }));
    } else if (open && !preselectedDate) {
      setFormData((prev) => ({ ...prev, start_date: format(new Date(), "yyyy-MM-dd") }));
    }
  }, [open, preselectedDate]);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formData.description.trim() || isSubmitting) return;

    const dataToSubmit = { ...formData };
    setIsSubmitting(true);
    setOpen(false); // Fermer immédiatement (ne pas rouvrir même en cas d'erreur)
    setFormData(defaultFormData);
    try {
      await onAdd(dataToSubmit);
    } catch {
      // Toast d'erreur géré par onAdd
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            {t("schedule.addManualTask", "Ajouter une tâche manuelle")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            {t("schedule.addManualTask", "Ajouter une tâche manuelle")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="manual-description">
              {t("schedule.manualTaskDescription", "Description de la tâche")} *
            </Label>
            <Textarea
              id="manual-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t(
                "schedule.manualTaskDescriptionPlaceholder",
                "Ex: Inspection pré-finition, Livraison matériaux..."
              )}
              rows={3}
            />
          </div>

          {/* Couleur de l'étape (pastilles uniquement, pas de nom) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t("schedule.taskColor", "Couleur de l'étape")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {TASK_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, trade_color: color })
                  }
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                    formData.trade_color === color
                      ? "border-foreground ring-2 ring-offset-2 ring-primary"
                      : "border-border hover:border-muted-foreground"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={t("schedule.selectColor", "Choisir cette couleur")}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Lien optionnel vers une étape */}
          <div className="space-y-2">
            <Label>{t("schedule.linkToStep", "Relier à une étape (optionnel)")}</Label>
            <Select
              value={formData.linked_step_id || "none"}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  linked_step_id: v === "none" ? null : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("schedule.selectStepOptional", "Aucune")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("schedule.noLink", "Aucune étape")}
                </SelectItem>
                {constructionSteps.map((step) => (
                  <SelectItem key={step.id} value={step.id}>
                    {step.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date de début et durée */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("scheduleDialog.startDate", "Date de début")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date
                      ? format(parseISO(formData.start_date), "PPP", {
                          locale: dateLocale,
                        })
                      : t("scheduleDialog.chooseDate", "Choisir une date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.start_date
                        ? parseISO(formData.start_date)
                        : undefined
                    }
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        start_date: date
                          ? format(date, "yyyy-MM-dd")
                          : formData.start_date,
                      })
                    }
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>
                {t("scheduleDialog.estimatedDays", "Durée (jours)")}
              </Label>
              <Input
                type="number"
                min={1}
                value={formData.estimated_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_days: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          {/* Travaux en simultané - ne déplace pas l'échéancier */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="is_overlay"
                checked={formData.is_overlay}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_overlay: checked === true })
                }
              />
              <div className="flex-1">
                <label
                  htmlFor="is_overlay"
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  <Layers className="h-4 w-4 text-primary" />
                  {t(
                    "schedule.simultaneousWork",
                    "Travaux en simultané"
                  )}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "schedule.simultaneousWorkDesc",
                    "Cette tâche ne déplacera pas les autres étapes. Elle s'affichera sur le calendrier sans modifier l'échéancier ni générer d'alertes de conflit."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!formData.description.trim() || isSubmitting}
          >
            {isSubmitting ? t("common.adding", "Ajout...") : t("common.add")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
