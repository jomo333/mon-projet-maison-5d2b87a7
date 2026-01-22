import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileText,
  CheckCircle2,
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
}

interface SubCategoryManagerProps {
  subCategories: SubCategory[];
  onAddSubCategory: (name: string, isDIY?: boolean) => void;
  onRemoveSubCategory: (id: string) => void;
  onSelectSubCategory: (id: string) => void;
  activeSubCategoryId: string | null;
  categoryName: string;
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
}: SubCategoryManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [isDIYMode, setIsDIYMode] = useState(false);

  const suggestions = defaultSubCategorySuggestions[categoryName] || [];
  const totalAmount = subCategories.reduce((sum, sc) => sum + (sc.amount || 0), 0);

  const handleAdd = (name: string, diy?: boolean) => {
    if (name.trim()) {
      onAddSubCategory(name.trim(), diy ?? isDIYMode);
      setNewSubCategoryName("");
      setIsDIYMode(false);
      setShowAddDialog(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          Sous-catégories
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Ajouter
        </Button>
      </div>

      {subCategories.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground border rounded-lg border-dashed bg-muted/20">
          <p className="text-sm">Aucune sous-catégorie</p>
          <p className="text-xs mt-1">
            Ajoutez des sous-catégories pour gérer plusieurs soumissions (ex: Luminaires, Filage...)
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
                  <span className="font-medium text-sm truncate">{subCat.name}</span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {subCat.isDIY && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                        <Hammer className="h-3 w-3 mr-1" />
                        Fait par moi-même
                      </Badge>
                    )}
                    {subCat.supplierName && !subCat.isDIY && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {subCat.supplierName}
                      </Badge>
                    )}
                    {subCat.hasDocuments && !subCat.supplierName && !subCat.isDIY && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Documents
                      </Badge>
                    )}
                    {subCat.hasAnalysis && (
                      <Badge variant="outline" className="text-xs text-primary border-primary/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Analysé
                      </Badge>
                    )}
                    {subCat.isDIY && subCat.materialCostOnly !== undefined && subCat.materialCostOnly > 0 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Matériaux: {subCat.materialCostOnly.toLocaleString("fr-CA")} $
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {subCat.amount > 0 && (
                  <span className="font-semibold text-primary">
                    {subCat.amount.toLocaleString("fr-CA")} $
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
            <div className="flex items-center justify-between pt-2 border-t mt-2">
              <span className="text-sm font-medium text-muted-foreground">
                Total sous-catégories:
              </span>
              <span className="font-bold text-lg text-primary flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {totalAmount.toLocaleString("fr-CA")} $
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add Sub-Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une sous-catégorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subcat-name">Nom de la sous-catégorie</Label>
              <Input
                id="subcat-name"
                value={newSubCategoryName}
                onChange={(e) => setNewSubCategoryName(e.target.value)}
                placeholder="Ex: Luminaires, Panneau électrique..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAdd(newSubCategoryName);
                  }
                }}
              />
            </div>

            {/* DIY Option */}
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
              <Checkbox
                id="diy-mode"
                checked={isDIYMode}
                onCheckedChange={(checked) => setIsDIYMode(checked === true)}
              />
              <div className="flex-1">
                <Label 
                  htmlFor="diy-mode" 
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  <Hammer className="h-4 w-4 text-amber-600" />
                  Fait par moi-même
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Analyse du coût des matériaux seulement (sans main-d'œuvre)
                </p>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Suggestions:</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestions
                    .filter((s) => !subCategories.some((sc) => sc.name === s))
                    .map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
                        onClick={() => handleAdd(suggestion, isDIYMode)}
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
              Annuler
            </Button>
            <Button onClick={() => handleAdd(newSubCategoryName)} disabled={!newSubCategoryName.trim()}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
