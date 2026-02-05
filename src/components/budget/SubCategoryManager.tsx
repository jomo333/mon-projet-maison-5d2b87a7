import { useState } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  DollarSign,
  Hammer,
} from "lucide-react";

export interface SubCategory {
  id: string;
  name: string;
  amount: number;
  supplierName?: string;
  supplierPhone?: string;
  hasDocuments?: boolean;
  hasAnalysis?: boolean;
  isDIY?: boolean; // Fait par moi-même
  materialCostOnly?: number; // Coût matériaux seulement
  orderLeadDays?: number; // Préavis de commande en jours
}

interface SubCategoryManagerProps {
  subCategories: SubCategory[];
  onAddSubCategory: (name: string, isDIY?: boolean) => void;
  onRemoveSubCategory: (id: string) => void;
  onSelectSubCategory: (id: string) => void;
  activeSubCategoryId: string | null;
  categoryName: string;
  projectPlans?: string[];
  onAnalyzeDIY?: () => void;
  analyzingDIY?: boolean;
}

// Default sub-categories suggestions based on category
const defaultSubCategorySuggestions: Record<string, string[]> = {
  "Électricité": ["Filage principal", "Luminaires", "Panneau électrique", "Prises et interrupteurs"],
  "Plomberie": ["Tuyauterie", "Robinetterie", "Chauffe-eau", "Accessoires salle de bain"],
  "Chauffage et ventilation (HVAC)": ["Thermopompe", "Échangeur d'air", "Conduits", "Plancher radiant"],
  "Finitions intérieures": ["Moulures", "Portes intérieures", "Escalier", "Garde-robes"],
  "Travaux ébénisterie (cuisine/SDB)": ["Armoires cuisine", "Vanités salle de bain", "Îlot", "Comptoirs"],
  "Fenêtres et portes": ["Fenêtres", "Porte d'entrée", "Porte de garage", "Portes patio"],
  "Revêtements de sol": ["Plancher bois franc", "Céramique", "Tapis", "Vinyle"],
  "Gypse et peinture": ["Gypse", "Tirage de joints", "Peinture intérieure", "Peinture extérieure"],
};

export function SubCategoryManager({
  subCategories,
  onAddSubCategory,
  onRemoveSubCategory,
  onSelectSubCategory,
  activeSubCategoryId,
  categoryName,
  projectPlans = [],
  onAnalyzeDIY,
  analyzingDIY = false,
}: SubCategoryManagerProps) {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState("");

  const suggestions = defaultSubCategorySuggestions[categoryName] || [];
  const totalAmount = subCategories.reduce((sum, sc) => sum + (sc.amount || 0), 0);

  // Always add as DIY since this mode is specifically for DIY work
  const handleAdd = (name: string) => {
    if (name.trim()) {
      onAddSubCategory(name.trim(), true); // Always DIY
      setNewSubCategoryName("");
      setShowAddDialog(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <Hammer className="h-4 w-4" />
          {t("subCategoryManager.diyItems", "Travaux fait par moi-même")}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
        >
          <Plus className="h-3 w-3" />
          {t("common.add")}
        </Button>
      </div>

      {subCategories.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/30 dark:bg-amber-950/20">
          <Hammer className="h-8 w-8 mx-auto mb-2 text-amber-400" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {t("subCategoryManager.noDiyItems", "Aucun travail DIY")}
          </p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            {t("subCategoryManager.addDiyHint", "Ajoutez les travaux que vous faites vous-même pour calculer le coût des matériaux (ex: Luminaires, Peinture...)")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {subCategories.map((subCat) => (
            <div
              key={subCat.id}
              onClick={() => onSelectSubCategory(subCat.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                activeSubCategoryId === subCat.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm truncate flex items-center gap-2">
                    <Hammer className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    {subCat.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {subCat.hasAnalysis && (
                      <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {t("subCategoryManager.analyzed", "Analysé")}
                      </Badge>
                    )}
                    {subCat.amount > 0 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {t("subCategoryManager.materials", "Matériaux")}: {formatCurrency(subCat.amount)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {subCat.amount > 0 && (
                  <span className="font-semibold text-primary">
                    {formatCurrency(subCat.amount)}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSubCategory(subCat.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}

          {/* Total */}
          {subCategories.length > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800 mt-2">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {t("subCategoryManager.totalDiyItems", "Total travaux DIY")}:
              </span>
              <span className="font-bold text-lg text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(totalAmount)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add DIY Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-600" />
              {t("subCategoryManager.addDiyTitle", "Ajouter un travail DIY")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Info banner */}
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
              <p className="text-xs text-muted-foreground">
                {t("subCategoryManager.diyInfoBanner", "L'IA analysera vos plans pour estimer le coût des matériaux nécessaires (sans main-d'œuvre).")}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subcat-name">{t("subCategoryManager.diyItemName", "Nom du travail")}</Label>
              <Input
                id="subcat-name"
                value={newSubCategoryName}
                onChange={(e) => setNewSubCategoryName(e.target.value)}
                placeholder={t("subCategoryManager.diyItemPlaceholder", "Ex: Luminaires, Peinture chambre...")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAdd(newSubCategoryName);
                  }
                }}
              />
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t("subCategoryManager.suggestions", "Suggestions")}:</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestions
                    .filter((s) => !subCategories.some((sc) => sc.name === s))
                    .map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-amber-100 hover:border-amber-400 dark:hover:bg-amber-950/50 dark:hover:border-amber-600 transition-colors"
                        onClick={() => handleAdd(suggestion)}
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
              onClick={() => handleAdd(newSubCategoryName)} 
              disabled={!newSubCategoryName.trim()}
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
