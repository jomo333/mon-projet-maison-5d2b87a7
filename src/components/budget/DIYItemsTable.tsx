import { useState } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

export interface DIYSupplierQuote {
  id: string;
  storeName: string;
  description: string;
  amount: number;
  notes?: string;
}

export interface DIYItem {
  id: string;
  name: string;
  totalAmount: number;
  quotes: DIYSupplierQuote[];
  orderLeadDays?: number;
  hasAnalysis?: boolean;
  notes?: string;
}

interface DIYItemsTableProps {
  items: DIYItem[];
  onAddItem: (name: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (item: DIYItem) => void;
  onAddQuote: (itemId: string, quote: Omit<DIYSupplierQuote, "id">) => void;
  onRemoveQuote: (itemId: string, quoteId: string) => void;
  onAnalyzeItem?: (itemId: string) => void;
  analyzingItemId?: string | null;
  categoryName: string;
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
  analyzingItemId,
  categoryName,
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

  const suggestions = defaultItemSuggestions[categoryName] || [];
  const totalAmount = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

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
            {t("diyItems.addHint", "Ajoutez les matériaux que vous achetez vous-même (ex: Céramique, Luminaires...)")}
          </p>
        </div>
      ) : (
        <>
          {/* Compact Table */}
          <div className="border rounded-lg overflow-hidden border-amber-200 dark:border-amber-800">
            <Table>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.hasAnalysis && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              <Sparkles className="h-3 w-3 mr-1" />
                              IA
                            </Badge>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {item.notes}
                          </p>
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
                      <TableCell>
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          {onAnalyzeItem && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                              onClick={() => onAnalyzeItem(item.id)}
                              disabled={analyzingItemId === item.id}
                            >
                              {analyzingItemId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Content */}
                    <CollapsibleContent asChild>
                      <TableRow className="bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/30">
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-4 space-y-4">
                            {/* Notes Section */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {t("diyItems.notesLabel", "Notes / Description")}
                              </label>
                              <Textarea
                                value={item.notes || ""}
                                onChange={(e) => onUpdateItem({ ...item, notes: e.target.value })}
                                placeholder={t("diyItems.notesPlaceholder", "Ex: Céramique 12x24 gris pour salle de bain, modèle X de chez Canac...")}
                                className="h-16 text-sm resize-none"
                              />
                            </div>

                            {/* Lead Time */}
                            <div className="flex items-center gap-3">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t("diyItems.orderLeadLabel", "Préavis commande")}:
                              </label>
                              <Input
                                type="number"
                                min={0}
                                value={item.orderLeadDays ?? ""}
                                onChange={(e) => onUpdateItem({ 
                                  ...item, 
                                  orderLeadDays: e.target.value ? parseInt(e.target.value) : undefined 
                                })}
                                placeholder="0"
                                className="w-20 h-8 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">jours</span>
                            </div>

                            {/* Quotes/Suppliers Table */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <Store className="h-3 w-3" />
                                  {t("diyItems.quotesLabel", "Devis fournisseurs")}
                                </label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAddingQuoteToItemId(item.id)}
                                  className="h-7 text-xs gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  {t("diyItems.addQuote", "Ajouter devis")}
                                </Button>
                              </div>

                              {item.quotes.length === 0 && addingQuoteToItemId !== item.id ? (
                                <p className="text-xs text-muted-foreground italic py-2">
                                  {t("diyItems.noQuotes", "Aucun devis ajouté")}
                                </p>
                              ) : (
                                <div className="border rounded-md overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="text-xs h-8">{t("diyItems.store", "Magasin")}</TableHead>
                                        <TableHead className="text-xs h-8">{t("diyItems.description", "Description")}</TableHead>
                                        <TableHead className="text-xs h-8 text-right">{t("diyItems.amount", "Montant")}</TableHead>
                                        <TableHead className="w-10 h-8"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.quotes.map((quote) => (
                                        <TableRow key={quote.id} className="hover:bg-muted/20">
                                          <TableCell className="py-2 text-sm font-medium">
                                            {quote.storeName || "-"}
                                          </TableCell>
                                          <TableCell className="py-2 text-sm text-muted-foreground">
                                            {quote.description || "-"}
                                          </TableCell>
                                          <TableCell className="py-2 text-sm text-right font-medium">
                                            {quote.amount > 0 ? formatCurrency(quote.amount) : "-"}
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-destructive hover:text-destructive"
                                              onClick={() => onRemoveQuote(item.id, quote.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}

                                      {/* Add Quote Row */}
                                      {addingQuoteToItemId === item.id && (
                                        <TableRow className="bg-amber-50/50 dark:bg-amber-950/20">
                                          <TableCell className="py-2">
                                            <Input
                                              value={newQuote.storeName}
                                              onChange={(e) => setNewQuote({ ...newQuote, storeName: e.target.value })}
                                              placeholder={t("diyItems.storePlaceholder", "Ex: Canac, Rona...")}
                                              className="h-8 text-sm"
                                            />
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <Input
                                              value={newQuote.description}
                                              onChange={(e) => setNewQuote({ ...newQuote, description: e.target.value })}
                                              placeholder={t("diyItems.descPlaceholder", "Ex: Céramique 12x24")}
                                              className="h-8 text-sm"
                                            />
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <Input
                                              type="number"
                                              value={newQuote.amount || ""}
                                              onChange={(e) => setNewQuote({ ...newQuote, amount: parseFloat(e.target.value) || 0 })}
                                              placeholder="0"
                                              className="h-8 text-sm text-right"
                                            />
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-primary"
                                                onClick={() => handleAddQuote(item.id)}
                                              >
                                                <Save className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => {
                                                  setAddingQuoteToItemId(null);
                                                  setNewQuote({ storeName: "", description: "", amount: 0 });
                                                }}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-2 border-t">
                              <Button
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
