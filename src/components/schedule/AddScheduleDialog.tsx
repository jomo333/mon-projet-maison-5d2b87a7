import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr, enCA } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { constructionSteps } from "@/data/constructionSteps";
import { tradeTypes, getTradeColor } from "@/data/tradeTypes";
import { ScheduleItem } from "@/hooks/useProjectSchedule";
import { supabase } from "@/integrations/supabase/client";
import { getStepsFromStartingPoint } from "@/lib/startingStepOptions";

interface AddScheduleDialogProps {
  projectId: string;
  onAdd: (schedule: Partial<ScheduleItem>) => void;
  calculateEndDate: (startDate: string, days: number) => string;
}

// Mapping des étapes vers les métiers par défaut
const stepTradeMapping: Record<string, string> = {
  planification: "planification",
  financement: "financement",
  "plans-permis": "plans-permis",
  soumissions: "soumissions",
  "excavation-fondation": "excavation",
  structure: "charpente",
  toiture: "toiture",
  "fenetres-portes": "fenetre",
  electricite: "electricite",
  plomberie: "plomberie",
  hvac: "hvac",
  isolation: "isolation",
  gypse: "gypse",
  "revetements-sol": "plancher",
  "cuisine-sdb": "armoires",
  "finitions-int": "finitions",
  exterieur: "exterieur",
  "inspections-finales": "inspecteur",
};

// Durées par défaut en jours (estimation)
const defaultDurations: Record<string, number> = {
  planification: 15,
  financement: 20,
  "plans-permis": 30,
  "excavation-fondation": 15,
  structure: 15,
  toiture: 7,
  "fenetres-portes": 5,
  electricite: 7,
  plomberie: 7,
  hvac: 7,
  isolation: 5,
  gypse: 15,
  "revetements-sol": 7,
  "cuisine-sdb": 10,
  "finitions-int": 10,
  exterieur: 15,
  "inspections-finales": 5,
};

export const AddScheduleDialog = ({
  projectId,
  onAdd,
  calculateEndDate,
}: AddScheduleDialogProps) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const dateLocale = i18n.language === 'en' ? enCA : fr;

  // Récupérer le projet pour obtenir starting_step_id
  const { data: project } = useQuery({
    queryKey: ["project-starting-step", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("starting_step_id")
        .eq("id", projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && open,
  });

  // Filtrer les étapes disponibles selon le point de départ
  const availableSteps = getStepsFromStartingPoint(project?.starting_step_id);

  const [formData, setFormData] = useState({
    step_id: "",
    step_name: "",
    trade_type: "",
    trade_color: "",
    estimated_days: 1,
    start_date: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_schedule_lead_days: 21,
    fabrication_lead_days: 0,
    measurement_required: false,
    measurement_after_step_id: "",
    measurement_notes: "",
    notes: "",
  });

  const handleStepChange = (stepId: string) => {
    const step = constructionSteps.find((s) => s.id === stepId);
    const defaultTrade = stepTradeMapping[stepId] || "autre";
    const defaultDuration = defaultDurations[stepId] || 5;

    setFormData({
      ...formData,
      step_id: stepId,
      step_name: step?.title || "",
      trade_type: defaultTrade,
      trade_color: getTradeColor(defaultTrade),
      estimated_days: defaultDuration,
    });
  };

  const handleTradeChange = (tradeId: string) => {
    setFormData({
      ...formData,
      trade_type: tradeId,
      trade_color: getTradeColor(tradeId),
    });
  };

  const handleSubmit = () => {
    if (!formData.step_id || !formData.trade_type) return;

    const endDate = formData.start_date
      ? calculateEndDate(formData.start_date, formData.estimated_days)
      : null;

    const hasStartDate = !!formData.start_date;

    onAdd({
      project_id: projectId,
      step_id: formData.step_id,
      step_name: formData.step_name,
      trade_type: formData.trade_type,
      trade_color: formData.trade_color,
      estimated_days: formData.estimated_days,
      start_date: formData.start_date || null,
      end_date: endDate,
      is_manual_date: hasStartDate,
      supplier_name: formData.supplier_name || null,
      supplier_phone: formData.supplier_phone || null,
      supplier_schedule_lead_days: formData.supplier_schedule_lead_days,
      fabrication_lead_days: formData.fabrication_lead_days,
      measurement_required: formData.measurement_required,
      measurement_after_step_id: formData.measurement_after_step_id || null,
      measurement_notes: formData.measurement_notes || null,
      notes: formData.notes || null,
      status: hasStartDate ? "scheduled" : "pending",
    });

    setOpen(false);
    setFormData({
      step_id: "",
      step_name: "",
      trade_type: "",
      trade_color: "",
      estimated_days: 1,
      start_date: "",
      supplier_name: "",
      supplier_phone: "",
      supplier_schedule_lead_days: 21,
      fabrication_lead_days: 0,
      measurement_required: false,
      measurement_after_step_id: "",
      measurement_notes: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("schedule.addStep")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("scheduleDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Sélection de l'étape */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("scheduleDialog.constructionStep")}</Label>
              <Select value={formData.step_id} onValueChange={handleStepChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("scheduleDialog.selectStep")} />
                </SelectTrigger>
                <SelectContent>
                  {availableSteps.map((step) => (
                    <SelectItem key={step.id} value={step.id}>
                      {step.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("scheduleDialog.trade")}</Label>
              <Select
                value={formData.trade_type}
                onValueChange={handleTradeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("scheduleDialog.selectTrade")} />
                </SelectTrigger>
                <SelectContent>
                  {tradeTypes.map((trade) => (
                    <SelectItem key={trade.id} value={trade.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: trade.color }}
                        />
                        {trade.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Durée et dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("scheduleDialog.estimatedDays")}</Label>
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
            <div className="space-y-2">
              <Label>{t("scheduleDialog.startDate")}</Label>
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
                      : t("scheduleDialog.chooseDate")}
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
                        start_date: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Fournisseur */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">{t("scheduleDialog.supplier")}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("scheduleDialog.supplierName")}</Label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_name: e.target.value })
                  }
                  placeholder="Ex: ABC Construction"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("scheduleDialog.supplierPhone")}</Label>
                <Input
                  value={formData.supplier_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_phone: e.target.value })
                  }
                  placeholder="514-555-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("scheduleDialog.callDaysBefore")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.supplier_schedule_lead_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_schedule_lead_days:
                        parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Fabrication */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">{t("scheduleDialog.fabrication")}</h4>
            <div className="space-y-2">
              <Label>{t("scheduleDialog.fabricationLeadDays")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.fabrication_lead_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fabrication_lead_days: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Ex: 15 jours pour les armoires"
              />
            </div>
          </div>

          {/* Mesures */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">{t("scheduleDialog.measurements")}</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="measurement_required"
                  checked={formData.measurement_required}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      measurement_required: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="measurement_required">
                  {t("scheduleDialog.measurementRequired")}
                </Label>
              </div>
              {formData.measurement_required && (
                <>
                  <div className="space-y-2">
                    <Label>{t("scheduleDialog.measurementAfter")}</Label>
                    <Select
                      value={formData.measurement_after_step_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          measurement_after_step_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("scheduleDialog.selectStep")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSteps.map((step) => (
                          <SelectItem key={step.id} value={step.id}>
                            {step.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("scheduleDialog.measurementNotes")}</Label>
                    <Textarea
                      value={formData.measurement_notes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          measurement_notes: e.target.value,
                        })
                      }
                      placeholder="Ex: Mesurer après le gypse mais avant la peinture"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-4">
            <Label>{t("scheduleDialog.generalNotes")}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder={t("scheduleDialog.notesPlaceholder")}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.step_id || !formData.trade_type}
          >
            {t("common.add")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
