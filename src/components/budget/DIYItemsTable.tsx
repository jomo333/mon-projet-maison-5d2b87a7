import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Hammer,
  Store,
  DollarSign,
  Save,
  Sparkles,
  Package,
  Clock,
  FileText,
  Loader2,
  Upload,
  Download,
  Lock,
  Crown,
  Info,
} from "lucide-react";

export interface DIYSupplierQuote {
  id: string;
  storeName: string;
  description: string;
  amount: number;
  notes?: string;
}

export interface DIYItemDocument {
  id: string;
  file_name: string;
  file_url: string;
}

export interface DIYItem {
  id: string;
  name: string;
  totalAmount: number;
  quotes: DIYSupplierQuote[];
  orderLeadDays?: number;
  hasAnalysis?: boolean;
  notes?: string;
  documents?: DIYItemDocument[];
}

export interface DIYSelectedSupplier {
  name: string;
  phone?: string;
  orderLeadDays?: number;
}

interface DIYItemsTableProps {
  items: DIYItem[];
  onAddItem: (name: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (item: DIYItem) => void;
  onAddQuote: (itemId: string, quote: Omit<DIYSupplierQuote, "id">) => void;
  onRemoveQuote: (itemId: string, quoteId: string) => void;
  onAnalyzeItem?: (itemId: string) => void;
  canAnalyze?: boolean;
  onUpgradeClick?: () => void;
  analyzingItemId?: string | null;
  categoryName: string;
  selectedSupplier?: DIYSelectedSupplier;
  onUpdateSupplier?: (supplier: DIYSelectedSupplier) => void;
  // New props for document handling
  onUploadDocument?: (itemId: string, file: File) => Promise<void>;
  onDeleteDocument?: (itemId: string, docId: string) => Promise<void>;
  uploadingItemId?: string | null;
}

// Default suggestions based on category
const defaultItemSuggestions: Record<string, string[]> = {
  "Électricité": ["Luminaires", "Panneau électrique", "Prises et interrupteurs", "Filage"],
  "Plomberie": ["Robinetterie", "Toilettes", "Lavabos", "Douche/Baignoire"],
  "Chauffage et ventilation (HVAC)": ["Thermopompe", "VRC", "Conduits", "Plinthes électriques"],
  "Finitions intérieures": ["Moulures", "Portes intérieures", "Escalier", "Garde-robes"],
  "Travaux ébénisterie (cuisine/SDB)": ["Armoires cuisine", "Vanités", "Îlot", "Comptoirs"],
  "Fenêtres et portes": ["Fenêtres", "Porte entrée", "Porte garage", "Portes patio"],
  "Revêtements de sol": ["Plancher bois franc", "Céramique", "Vinyle", "Tapis"],
  "Gypse et peinture": ["Gypse", "Peinture intérieure", "Peinture extérieure"],
  "Revêtement extérieur": ["Revêtement", "Fascia/Soffite", "Balcon/Terrasse"],
  "Toiture": ["Bardeaux", "Membrane", "Gouttières"],
  "Isolation et pare-vapeur": ["Laine isolante", "Styromousse", "Pare-vapeur"],
};

export function DIYItemsTable({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onAddQuote,
  onRemoveQuote,
  onAnalyzeItem,
  canAnalyze = true,
  onUpgradeClick,
  analyzingItemId,
  categoryName,
  selectedSupplier,
  onUpdateSupplier,
  onUploadDocument,
  onDeleteDocument,
  uploadingItemId,
}: DIYItemsTableProps) {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [addingQuoteToItemId, setAddingQuoteToItemId] = useState<string | null>(null);
  const [newQuote, setNewQuote] = useState<Omit<DIYSupplierQuote, "id">>({
    storeName: "",
    description: "",
    amount: 0,
  });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const prevItemsLengthRef = useRef(items.length);

  const suggestions = defaultItemSuggestions[categoryName] || [];
  const totalAmount = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  // Auto-expand newly added items
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && items.length > 0) {
      // A new item was added - expand it automatically
      const newestItem = items[items.length - 1];
      setExpandedItemId(newestItem.id);
    }
    prevItemsLengthRef.current = items.length;
  }, [items]);

  const handleUpdateSupplierField = (field: keyof DIYSelectedSupplier, value: string | number | undefined) => {
    if (onUpdateSupplier) {
      onUpdateSupplier({
        ...selectedSupplier,
        name: selectedSupplier?.name || "",
        [field]: value,
      });
    }
  };

  const handleAddItem = (name: string) => {
    if (name.trim()) {
      onAddItem(name.trim());
      setNewItemName("");
      setShowAddDialog(false);
    }
  };

  const handleAddQuote = (itemId: string) => {
    if (newQuote.storeName.trim() || newQuote.description.trim()) {
      onAddQuote(itemId, newQuote);
      setNewQuote({ storeName: "", description: "", amount: 0 });
      setAddingQuoteToItemId(null);
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Hammer className="h-4 w-4" />
          {t("diyItems.title", "Matériaux à acheter (DIY)")}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
        >
          <Plus className="h-3 w-3" />
          {t("diyItems.addItem", "Ajouter un item")}
        </Button>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/30 dark:bg-amber-950/20">
          <Package className="h-8 w-8 mx-auto mb-2 text-amber-400" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {t("diyItems.noItems", "Aucun item DIY")}
          </p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            {t(
              "diyItems.addHint",
              "Ajoutez les matériaux que vous achetez vous-même (ex: Céramique, Luminaires...)"
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Compact Table - scroll horizontal sur mobile si besoin */}
          <div className="border rounded-lg overflow-x-auto overflow-y-visible border-amber-200 dark:border-amber-800 [-webkit-overflow-scrolling:touch]">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-50/50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-amber-700 dark:text-amber-400">
                    {t("diyItems.item", "Item")}
                  </TableHead>
                  <TableHead className="text-amber-700 dark:text-amber-400 text-center">
                    {t("diyItems.quotes", "Devis")}
                  </TableHead>
                  <TableHead className="text-amber-700 dark:text-amber-400 text-center">
                    {t("diyItems.leadTime", "Préavis")}
                  </TableHead>
                  <TableHead className="text-amber-700 dark:text-amber-400 text-right">
                    {t("diyItems.total", "Total")}
                  </TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <Collapsible key={item.id} open={expandedItemId === item.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <TableCell className="w-8">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {expandedItemId === item.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[180px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.hasAnalysis && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              <Sparkles className="h-3 w-3 mr-1" />
                              IA
                            </Badge>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.notes}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {item.quotes.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orderLeadDays ? (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.orderLeadDays}j
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-700 dark:text-amber-400">
                        {item.totalAmount > 0 ? formatCurrency(item.totalAmount) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveItem(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <div className="bg-amber-50/20 dark:bg-amber-950/10 border-t border-amber-200 dark:border-amber-800 min-w-0">
                            <div className="p-4 space-y-4 min-w-0 break-words">
                              {/* Item Notes */}
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {t("diyItems.itemNotes", "Notes")}
                                </label>
                                <Textarea
                                  value={item.notes || ""}
                                  onChange={(e) => onUpdateItem({ ...item, notes: e.target.value })}
                                  placeholder={t(
                                    "diyItems.itemNotesPlaceholder",
                                    "Notes (dimensions, modèle, couleur, etc.)"
                                  )}
                                  className="min-h-[60px]"
                                />
                              </div>

                              {/* Documents Section */}
                              {onUploadDocument && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      {t("diyItems.documents", "Soumissions")}
                                      {item.documents && item.documents.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-xs">
                                          {item.documents.length}
                                        </Badge>
                                      )}
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="file"
                                        ref={(el) => { fileInputRefs.current[item.id] = el; }}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            await onUploadDocument(item.id, file);
                                            e.target.value = "";
                                          }
                                        }}
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRefs.current[item.id]?.click()}
                                        disabled={uploadingItemId === item.id}
                                        className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
                                      >
                                        {uploadingItemId === item.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Upload className="h-3 w-3" />
                                        )}
                                        {t("diyItems.uploadDoc", "Télécharger")}
                                      </Button>
                                      {onAnalyzeItem && item.documents && item.documents.length > 0 && (
                                        canAnalyze ? (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => onAnalyzeItem(item.id)}
                                            disabled={analyzingItemId === item.id}
                                            className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                          >
                                            {analyzingItemId === item.id ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Sparkles className="h-3 w-3" />
                                            )}
                                            {t("diyItems.analyzeAI", "Analyser IA")}
                                          </Button>
                                        ) : (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onUpgradeClick}
                                            className="gap-1"
                                            title={t("premiumFeatures.quoteAnalysisTooltip")}
                                          >
                                            <Lock className="h-3 w-3" />
                                            <Crown className="h-3 w-3" />
                                            {t("diyItems.analyzeAI", "Analyser IA")}
                                            <Info className="h-3 w-3 opacity-70" />
                                          </Button>
                                        )
                                      )}
                                    </div>
                                  </div>

                                  {(!item.documents || item.documents.length === 0) ? (
                                    <div className="text-xs text-muted-foreground border rounded-lg border-dashed p-3 text-center">
                                      {t("diyItems.noDocuments", "Aucune soumission téléchargée")}
                                      <p className="text-xs opacity-75 mt-1">
                                        {t("diyItems.uploadHint", "Téléchargez vos soumissions pour lancer l'analyse IA")}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {item.documents.map((doc) => (
                                        <div
                                          key={doc.id}
                                          className="flex items-center justify-between p-2 rounded-lg border bg-background"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                                            <span className="text-sm truncate">{doc.file_name}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => window.open(doc.file_url, '_blank')}
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                            {onDeleteDocument && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => onDeleteDocument(item.id, doc.id)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}




                              {/* Order lead days per item */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm font-medium">
                                      {t("diyItems.orderLeadDays", "Préavis de commande")} (jours)
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground italic">
                                    {t("diyItems.orderLeadDaysHint", "Valeur en jours, pas en semaines ni en mois.")}
                                  </p>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.orderLeadDays ?? ""}
                                  onChange={(e) =>
                                    onUpdateItem({
                                      ...item,
                                      orderLeadDays: e.target.value ? parseInt(e.target.value) : undefined,
                                    })
                                  }
                                  placeholder="0"
                                  className="w-28"
                                />
                              </div>

                              {/* Save item */}
                              <div className="flex justify-end">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    // Calculate total from quotes
                                    const quotesTotal = item.quotes.reduce((sum, q) => sum + (q.amount || 0), 0);
                                    onUpdateItem({ ...item, totalAmount: quotesTotal });
                                  }}
                                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  <Save className="h-4 w-4" />
                                  {t("common.save")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {t("diyItems.totalMaterials", "Total matériaux DIY")}:
            </span>
            <span className="font-bold text-lg text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </>
      )}

      {/* Selected Supplier Card removed - DIY mode doesn't need supplier selection */}

      {/* Add Quote Dialog */}
      <Dialog open={!!addingQuoteToItemId} onOpenChange={(open) => !open && setAddingQuoteToItemId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-amber-600" />
              {t("diyItems.addQuoteTitle", "Ajouter un devis")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("diyItems.storeName", "Magasin")}</label>
              <Input
                value={newQuote.storeName}
                onChange={(e) => setNewQuote(prev => ({ ...prev, storeName: e.target.value }))}
                placeholder={t("diyItems.storePlaceholder", "Ex: Canac")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("diyItems.description", "Description")}</label>
              <Input
                value={newQuote.description}
                onChange={(e) => setNewQuote(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t("diyItems.descriptionPlaceholder", "Ex: céramique 12x24")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("diyItems.amount", "Montant")}</label>
              <Input
                type="number"
                value={newQuote.amount}
                onChange={(e) => setNewQuote(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingQuoteToItemId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (addingQuoteToItemId) {
                  handleAddQuote(addingQuoteToItemId);
                }
              }}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="h-4 w-4" />
              {t("diyItems.addQuote", "Ajouter")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-600" />
              {t("diyItems.addDialogTitle", "Ajouter un item DIY")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("diyItems.itemName", "Nom de l'item")}</label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t("diyItems.itemPlaceholder", "Ex: Céramique salle de bain, Luminaires...")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddItem(newItemName);
                  }
                }}
              />
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">{t("diyItems.suggestions", "Suggestions")}:</label>
                <div className="flex flex-wrap gap-2">
                  {suggestions
                    .filter((s) => !items.some((item) => item.name === s))
                    .map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-amber-100 hover:border-amber-400 dark:hover:bg-amber-950/50 transition-colors"
                        onClick={() => handleAddItem(suggestion)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {suggestion}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => handleAddItem(newItemName)}
              disabled={!newItemName.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
