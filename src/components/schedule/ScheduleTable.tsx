import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CalendarIcon,
  Edit,
  Trash2,
  Phone,
  Factory,
  Ruler,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FastForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleItem } from "@/hooks/useProjectSchedule";
import { tradeTypes, getTradeName, getTradeColor } from "@/data/tradeTypes";
import { constructionSteps } from "@/data/constructionSteps";

interface ScheduleTableProps {
  schedules: ScheduleItem[];
  onUpdate: (schedule: Partial<ScheduleItem> & { id: string }) => void | Promise<void>;
  onDelete: (id: string) => void;
  onComplete?: (scheduleId: string, actualDays?: number) => Promise<{ daysAhead: number; alertsCreated: number } | undefined>;
  conflicts: { date: string; trades: string[] }[];
  calculateEndDate: (startDate: string, days: number) => string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  scheduled: { label: "Planifié", variant: "outline" },
  in_progress: { label: "En cours", variant: "default" },
  completed: { label: "Terminé", variant: "default" },
};

export const ScheduleTable = ({
  schedules,
  onUpdate,
  onDelete,
  onComplete,
  conflicts,
  calculateEndDate,
}: ScheduleTableProps) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ScheduleItem>>({});
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeDays, setCompleteDays] = useState<number | undefined>(undefined);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasConflict = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule?.start_date) return false;
    return conflicts.some((c) => c.trades.includes(schedule.trade_type));
  };

  const handleEdit = (schedule: ScheduleItem) => {
    setEditingId(schedule.id);
    setEditData(schedule);
  };

  const handleSave = async () => {
    if (!editingId || !editData) return;
    
    setIsSaving(true);
    try {
      // Recalculer la date de fin si les jours ont changé
      let endDate = editData.end_date;
      if (editData.start_date && (editData.actual_days || editData.estimated_days)) {
        const days = editData.actual_days || editData.estimated_days || 1;
        endDate = calculateEndDate(editData.start_date, days);
      }

      await onUpdate({
        id: editingId,
        ...editData,
        end_date: endDate,
      });
    } finally {
      setIsSaving(false);
      setEditingId(null);
      setEditData({});
    }
  };

  const handleStartComplete = (schedule: ScheduleItem) => {
    setCompletingId(schedule.id);
    setCompleteDays(schedule.actual_days || schedule.estimated_days);
  };

  const handleConfirmComplete = async () => {
    if (!completingId || !onComplete) return;
    
    setIsCompleting(true);
    try {
      await onComplete(completingId, completeDays);
      setCompletingId(null);
      setCompleteDays(undefined);
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(parseISO(dateStr), "d MMM yyyy", { locale: fr });
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Étape</TableHead>
            <TableHead>Métier</TableHead>
            <TableHead className="text-center">Jours estimés</TableHead>
            <TableHead className="text-center">Jours réels</TableHead>
            <TableHead>Date début</TableHead>
            <TableHead>Date fin</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Alertes</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <>
              <TableRow
                key={schedule.id}
                className={cn(
                  hasConflict(schedule.id) && "bg-destructive/10",
                  expandedRow === schedule.id && "bg-muted/50"
                )}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedRow(
                        expandedRow === schedule.id ? null : schedule.id
                      )
                    }
                  >
                    {expandedRow === schedule.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  {schedule.step_name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTradeColor(schedule.trade_type) }}
                    />
                    {getTradeName(schedule.trade_type)}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {schedule.estimated_days}j
                </TableCell>
                <TableCell className="text-center">
                  {schedule.actual_days ? `${schedule.actual_days}j` : "-"}
                </TableCell>
                <TableCell>{formatDate(schedule.start_date)}</TableCell>
                <TableCell>{formatDate(schedule.end_date)}</TableCell>
                <TableCell>
                  {schedule.supplier_name || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusLabels[schedule.status]?.variant || "secondary"}
                  >
                    {statusLabels[schedule.status]?.label || schedule.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {schedule.supplier_schedule_lead_days > 0 && (
                      <Tooltip>
                        <TooltipTrigger><Phone className="h-4 w-4 text-blue-500" /></TooltipTrigger>
                        <TooltipContent>Appel prévu</TooltipContent>
                      </Tooltip>
                    )}
                    {schedule.fabrication_lead_days > 0 && (
                      <Tooltip>
                        <TooltipTrigger><Factory className="h-4 w-4 text-orange-500" /></TooltipTrigger>
                        <TooltipContent>Fabrication requise</TooltipContent>
                      </Tooltip>
                    )}
                    {schedule.measurement_required && (
                      <Tooltip>
                        <TooltipTrigger><Ruler className="h-4 w-4 text-purple-500" /></TooltipTrigger>
                        <TooltipContent>Mesures requises</TooltipContent>
                      </Tooltip>
                    )}
                    {hasConflict(schedule.id) && (
                      <Tooltip>
                        <TooltipTrigger><AlertTriangle className="h-4 w-4 text-destructive" /></TooltipTrigger>
                        <TooltipContent>Conflit de métier</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {onComplete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/90 hover:bg-muted"
                            onClick={() => handleStartComplete(schedule)}
                          >
                            {schedule.status === "completed" ? (
                              <FastForward className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {schedule.status === "completed"
                            ? "Ajuster l'échéancier (étape déjà terminée)"
                            : "Marquer terminé et devancer l'échéancier"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedRow === schedule.id && (
                <TableRow>
                  <TableCell colSpan={11} className="bg-muted/30 p-4">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Fournisseur
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>Nom: {schedule.supplier_name || "-"}</p>
                          <p>Téléphone: {schedule.supplier_phone || "-"}</p>
                          <p>
                            Délai d'appel: {schedule.supplier_schedule_lead_days} jours
                            avant
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Factory className="h-4 w-4" />
                          Fabrication
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            Délai: {schedule.fabrication_lead_days} jours
                          </p>
                          <p>
                            Lancer le:{" "}
                            {formatDate(schedule.fabrication_start_date)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Mesures
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            Requises:{" "}
                            {schedule.measurement_required ? "Oui" : "Non"}
                          </p>
                          {schedule.measurement_after_step_id && (
                            <p>
                              Après:{" "}
                              {constructionSteps.find(
                                (s) => s.id === schedule.measurement_after_step_id
                              )?.title || schedule.measurement_after_step_id}
                            </p>
                          )}
                          {schedule.measurement_notes && (
                            <p>Notes: {schedule.measurement_notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {schedule.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          {schedule.notes}
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
          {schedules.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={11}
                className="text-center py-8 text-muted-foreground"
              >
                Aucune étape planifiée. Ajoutez des étapes à votre échéancier.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Dialog d'édition */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'étape</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Métier</Label>
                <Select
                  value={editData.trade_type}
                  onValueChange={(value) => {
                    const trade = tradeTypes.find((t) => t.id === value);
                    setEditData({
                      ...editData,
                      trade_type: value,
                      trade_color: trade?.color || "#6B7280",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) =>
                    setEditData({ ...editData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="scheduled">Planifié</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jours estimés</Label>
                <Input
                  type="number"
                  min={1}
                  value={editData.estimated_days || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      estimated_days: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Jours réels (fournisseur)</Label>
                <Input
                  type="number"
                  min={1}
                  value={editData.actual_days || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      actual_days: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Temps proposé par le fournisseur"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editData.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData.start_date
                        ? format(parseISO(editData.start_date), "PPP", {
                            locale: fr,
                          })
                        : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        editData.start_date
                          ? parseISO(editData.start_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setEditData({
                          ...editData,
                          start_date: date
                            ? format(date, "yyyy-MM-dd")
                            : null,
                        })
                      }
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Date de fin (calculée)</Label>
                <Input
                  value={
                    editData.start_date
                      ? formatDate(
                          calculateEndDate(
                            editData.start_date,
                            editData.actual_days || editData.estimated_days || 1
                          )
                        )
                      : "-"
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium mb-4">Fournisseur</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nom du fournisseur</Label>
                  <Input
                    value={editData.supplier_name || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, supplier_name: e.target.value })
                    }
                    placeholder="Ex: ABC Construction"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={editData.supplier_phone || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, supplier_phone: e.target.value })
                    }
                    placeholder="514-555-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Appeler X jours avant</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editData.supplier_schedule_lead_days || 0}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        supplier_schedule_lead_days: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium mb-4">Fabrication</h4>
              <div className="space-y-2">
                <Label>Délai de fabrication (jours ouvrables)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editData.fabrication_lead_days || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      fabrication_lead_days: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Ex: 15 jours pour les armoires"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium mb-4">Mesures</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="measurement_required"
                    checked={editData.measurement_required}
                    onCheckedChange={(checked) =>
                      setEditData({
                        ...editData,
                        measurement_required: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="measurement_required">
                    Mesures requises par le fournisseur
                  </Label>
                </div>
                {editData.measurement_required && (
                  <>
                    <div className="space-y-2">
                      <Label>Prendre les mesures après quelle étape?</Label>
                      <Select
                        value={editData.measurement_after_step_id || ""}
                        onValueChange={(value) =>
                          setEditData({
                            ...editData,
                            measurement_after_step_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une étape" />
                        </SelectTrigger>
                        <SelectContent>
                          {constructionSteps.map((step) => (
                            <SelectItem key={step.id} value={step.id}>
                              {step.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes pour les mesures</Label>
                      <Textarea
                        value={editData.measurement_notes || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
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

            <div className="border-t pt-4 mt-2">
              <Label>Notes générales</Label>
              <Textarea
                value={editData.notes || ""}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
                placeholder="Notes additionnelles..."
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation pour compléter une étape */}
      <Dialog open={!!completingId} onOpenChange={(open) => !open && setCompletingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FastForward className="h-5 w-5 text-green-600" />
              Marquer l'étape comme terminée
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              En marquant cette étape comme terminée, l'échéancier sera automatiquement ajusté et vous recevrez des alertes si des sous-traitants doivent être contactés plus tôt.
            </p>
            
            <div className="space-y-2">
              <Label>Nombre de jours réels pour cette étape</Label>
              <Input
                type="number"
                min={1}
                value={completeDays || ""}
                onChange={(e) => setCompleteDays(parseInt(e.target.value) || undefined)}
                placeholder="Laissez vide pour utiliser aujourd'hui comme date de fin"
              />
              <p className="text-xs text-muted-foreground">
                Si l'étape a pris moins de jours que prévu, les étapes suivantes seront devancées.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompletingId(null)} disabled={isCompleting}>
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmComplete} 
              disabled={isCompleting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCompleting ? "Ajustement..." : "Terminer et ajuster l'échéancier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
