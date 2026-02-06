import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  X,
  Hammer,
  ArrowLeft,
  ShoppingCart,
  Store,
  Phone,
  Check,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SupplierInfo {
  name: string;
  phone: string;
}

interface SupplierOption {
  name: string;
  amount: string;
  description?: string;
}

interface ExtractedContact {
  supplierName: string;
  phone: string;
  amount: string;
  options?: SupplierOption[];
}

interface DIYAnalysisViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  subCategoryName: string;
  analysisResult: string;
  onApplyEstimate?: (amount: number, supplier?: SupplierInfo) => void;
  initialSupplier?: SupplierInfo;
}

// Helper function to parse currency strings like "8 353,79 $", "25,652$", "25652"
const parseAmount = (amount: string | undefined): number => {
  if (!amount) return 0;
  
  let cleaned = amount.replace(/\$/g, '').trim();
  cleaned = cleaned.replace(/\s/g, '');
  
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');
  
  if (hasComma && !hasPeriod) {
    cleaned = cleaned.replace(',', '.');
  } else if (hasComma && hasPeriod) {
    const commaPos = cleaned.lastIndexOf(',');
    const periodPos = cleaned.lastIndexOf('.');
    
    if (commaPos > periodPos) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  cleaned = cleaned.replace(/[^\d.]/g, '');
  return Math.round(parseFloat(cleaned) || 0);
};

// Helper to parse French/English currency formats for extraction
const parseCurrencyAmount = (rawAmount: string): string => {
  let cleaned = rawAmount.trim();
  cleaned = cleaned.replace(/\s/g, '');
  
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');
  
  if (hasComma && !hasPeriod) {
    cleaned = cleaned.replace(',', '.');
  } else if (hasComma && hasPeriod) {
    const commaPos = cleaned.lastIndexOf(',');
    const periodPos = cleaned.lastIndexOf('.');
    
    if (commaPos > periodPos) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  return cleaned;
};

// Extract multiple suppliers from analysis result
const extractSuppliers = (analysisResult: string): ExtractedContact[] => {
  const contacts: ExtractedContact[] = [];
  
  // Helper to normalize supplier names for comparison
  const normalizeSupplierName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };
  
  // Helper to check if a supplier already exists and merge data if needed
  const addOrMergeSupplier = (newContact: ExtractedContact) => {
    const normalizedName = normalizeSupplierName(newContact.supplierName);
    const existingIndex = contacts.findIndex(
      c => normalizeSupplierName(c.supplierName) === normalizedName
    );
    
    if (existingIndex >= 0) {
      const existing = contacts[existingIndex];
      if (!existing.amount && newContact.amount) {
        existing.amount = newContact.amount;
      }
      if (!existing.phone && newContact.phone) {
        existing.phone = newContact.phone;
      }
      if (newContact.options && newContact.options.length > 0) {
        const existingOptions = existing.options || [];
        const existingOptionNames = new Set(existingOptions.map(o => normalizeSupplierName(o.name)));
        for (const opt of newContact.options) {
          if (!existingOptionNames.has(normalizeSupplierName(opt.name))) {
            existingOptions.push(opt);
          }
        }
        existing.options = existingOptions.length > 0 ? existingOptions : undefined;
      }
    } else {
      contacts.push(newContact);
    }
  };
  
  // Try to extract from the emoji-based format
  const companyBlocks = analysisResult.split(/(?=\*\*🏢)/);
  
  for (const block of companyBlocks) {
    if (!block.includes('🏢')) continue;
    
    const nameMatch = block.match(/🏢\s*\*?\*?([^*\n(]+?)(?:\s*\([^)]+\))?(?:\s*[-–—]|\*\*)/);
    const phoneMatch = block.match(/📞\s*(?:Téléphone\s*:?\s*)?([0-9\-\.\s\(\)]+)/);
    let amount = '';
    
    // Multiple patterns for amounts
    const amountMatch1 = block.match(/Montant\s*avant\s*taxes\s*:?\s*([0-9\s,\.]+)\s*\$/i);
    const amountMatch2 = block.match(/Prix\s*avant\s*taxes\s*:?\s*([0-9\s,\.]+)\s*\$/i);
    const amountMatch3 = block.match(/Sous-total\s*:?\s*([0-9\s,\.]+)\s*\$/i);
    const amountMatch4 = block.match(/Total\s*avec\s*taxes\s*:?\s*\*?\*?([0-9\s,\.]+)\s*\$\*?\*?/i);
    const amountMatch5 = block.match(/💰[^$]*?([0-9]{1,3}(?:[\s,][0-9]{3})*(?:[,\.][0-9]+)?)\s*\$/);
    
    if (amountMatch1) amount = parseCurrencyAmount(amountMatch1[1]);
    else if (amountMatch2) amount = parseCurrencyAmount(amountMatch2[1]);
    else if (amountMatch3) amount = parseCurrencyAmount(amountMatch3[1]);
    else if (amountMatch5) amount = parseCurrencyAmount(amountMatch5[1]);
    else if (amountMatch4) amount = parseCurrencyAmount(amountMatch4[1]);
    
    if (nameMatch) {
      const options: SupplierOption[] = [];
      
      // Look for option patterns
      const optionMatches = block.matchAll(/(?:Option|Forfait|Package|OPTION)\s*(?:SÉPARÉE\s*:?\s*)?([A-Za-zÀ-ÿ0-9\s]+?)\s*:?\s*([0-9\s,\.]+)\s*\$/gi);
      for (const match of optionMatches) {
        options.push({
          name: match[1].trim(),
          amount: parseCurrencyAmount(match[2]),
        });
      }
      
      addOrMergeSupplier({
        supplierName: nameMatch[1].trim().replace(/\*+/g, ''),
        phone: phoneMatch ? phoneMatch[1].trim() : '',
        amount: amount,
        options: options.length > 0 ? options : undefined,
      });
    }
  }
  
  // Try to extract amounts from comparison table for suppliers without amounts
  const tableAmounts: Record<string, string> = {};
  const tableRows = analysisResult.matchAll(/\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*\*?\*?([0-9\s,\.]+)\s*\$\*?\*?\s*\|/g);
  for (const row of tableRows) {
    const name = row[1].trim();
    const amt = parseCurrencyAmount(row[2]);
    if (name && !name.includes('Entreprise') && !name.includes('---') && !name.includes('Critère') && amt) {
      tableAmounts[name.toLowerCase()] = amt;
    }
  }
  
  // Fill in missing amounts from table
  for (const contact of contacts) {
    if (!contact.amount) {
      const key = contact.supplierName.toLowerCase();
      for (const [tableName, tableAmt] of Object.entries(tableAmounts)) {
        if (key.includes(tableName) || tableName.includes(key)) {
          contact.amount = tableAmt;
          break;
        }
      }
    }
  }
  
  // If no contacts found, try to extract from comparison table directly
  if (contacts.length === 0) {
    for (const [name, amt] of Object.entries(tableAmounts)) {
      addOrMergeSupplier({
        supplierName: name.charAt(0).toUpperCase() + name.slice(1),
        phone: '',
        amount: amt,
      });
    }
  }
  
  return contacts.filter(c => c.supplierName && c.supplierName.length > 1);
};

export function DIYAnalysisView({
  open,
  onOpenChange,
  categoryName,
  subCategoryName,
  analysisResult,
  onApplyEstimate,
  initialSupplier,
}: DIYAnalysisViewProps) {
  const { t } = useTranslation();
  
  // Extract suppliers from analysis
  const extractedSuppliers = useMemo(() => extractSuppliers(analysisResult), [analysisResult]);
  
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  
  // Manual input fields (for when no supplier is detected or user wants to override)
  const [manualSupplierName, setManualSupplierName] = useState("");
  const [manualSupplierPhone, setManualSupplierPhone] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  // Auto-select first supplier when analysis changes
  useEffect(() => {
    if (open) {
      if (extractedSuppliers.length > 0) {
        setSelectedSupplierIndex(0);
        setSelectedOptionIndex(null);
      } else {
        setSelectedSupplierIndex(null);
        setSelectedOptionIndex(null);
      }
      
      // Pre-fill manual fields from initial supplier
      if (initialSupplier?.name) {
        setManualSupplierName(initialSupplier.name);
        setManualSupplierPhone(initialSupplier.phone || "");
      }
    }
  }, [open, extractedSuppliers.length, initialSupplier?.name, initialSupplier?.phone]);

  const selectedSupplier = selectedSupplierIndex !== null ? extractedSuppliers[selectedSupplierIndex] : null;

  const handleSelectSupplier = (index: number) => {
    setSelectedSupplierIndex(index);
    setSelectedOptionIndex(null);
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOptionIndex(optionIndex);
  };

  const handleConfirmSelection = () => {
    if (!onApplyEstimate) return;

    let amount = 0;
    let supplier: SupplierInfo | undefined;

    if (selectedSupplier) {
      // Get amount from selected option or supplier
      const amountStr = selectedOptionIndex !== null && selectedSupplier.options?.[selectedOptionIndex]
        ? selectedSupplier.options[selectedOptionIndex].amount
        : selectedSupplier.amount;
      amount = parseAmount(amountStr);
      supplier = {
        name: selectedSupplier.supplierName,
        phone: selectedSupplier.phone || "",
      };
    } else if (manualSupplierName.trim()) {
      // Use manual input
      amount = parseAmount(manualAmount);
      supplier = {
        name: manualSupplierName.trim(),
        phone: manualSupplierPhone.trim(),
      };
    }

    if (amount > 0) {
      onApplyEstimate(amount, supplier);
    }
  };

  // Helper function to translate budget category names
  const translateCategoryName = (name: string): string => {
    const key = `budget.categories.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
  };

  // Calculate the selected amount for display
  const getSelectedAmount = (): number => {
    if (selectedSupplier) {
      const amountStr = selectedOptionIndex !== null && selectedSupplier.options?.[selectedOptionIndex]
        ? selectedSupplier.options[selectedOptionIndex].amount
        : selectedSupplier.amount;
      return parseAmount(amountStr);
    }
    return parseAmount(manualAmount);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] p-0 flex flex-col h-screen">
        <SheetHeader className="p-6 border-b bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Hammer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <SheetTitle className="text-xl">
                {t("diyAnalysisView.materialAnalysis")} - {translateCategoryName(categoryName)}
                {subCategoryName && (
                  <span className="text-amber-600 dark:text-amber-400"> / {subCategoryName}</span>
                )}
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Panel - Analysis Result */}
          <div className="flex-1 border-r overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Résumé détaillé des soumissions
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Analyse comparative des devis reçus
              </p>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-lg dark:prose-invert max-w-none
                [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                [&_table]:table-fixed
                [&_th]:bg-amber-100 [&_th]:dark:bg-amber-900/50 [&_th]:border [&_th]:border-amber-200 [&_th]:dark:border-amber-800 [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-amber-800 [&_th]:dark:text-amber-300 [&_th]:whitespace-normal [&_th]:break-words
                [&_td]:border [&_td]:border-amber-200 [&_td]:dark:border-amber-800 [&_td]:px-3 [&_td]:py-3 [&_td]:text-foreground [&_td]:whitespace-normal [&_td]:break-words [&_td]:align-top
                [&_tr:nth-child(even)]:bg-amber-50/50 [&_tr:nth-child(even)]:dark:bg-amber-950/30
                [&_tr:hover]:bg-amber-100/50 [&_tr:hover]:dark:bg-amber-900/30
                [&_p]:text-base [&_p]:leading-relaxed [&_p]:my-3
                [&_strong]:text-amber-700 [&_strong]:dark:text-amber-400 [&_strong]:font-semibold
                [&_h1]:text-2xl [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-amber-800 [&_h1]:dark:text-amber-300
                [&_h2]:text-xl [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-amber-700 [&_h2]:dark:text-amber-400
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-amber-600 [&_h3]:dark:text-amber-500
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
                [&_li]:text-base [&_li]:my-1
                [&_hr]:my-6 [&_hr]:border-amber-200 [&_hr]:dark:border-amber-800
                overflow-x-auto
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analysisResult}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Supplier Selection */}
          <div className="w-[380px] min-w-[380px] flex flex-col bg-amber-50/30 dark:bg-amber-950/10">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ShoppingCart className="h-5 w-5" />
                Fournisseur à retenir
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sélectionnez le fournisseur de votre choix
              </p>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {extractedSuppliers.length === 0 ? (
                  <>
                    <div className="text-center py-4 text-muted-foreground">
                      <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Aucun fournisseur détecté automatiquement</p>
                    </div>
                    
                    {/* Manual input form */}
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-background p-4 space-y-4">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <Store className="h-5 w-5" />
                        <span className="font-medium">Saisie manuelle</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="manual-supplier-name" className="text-sm">
                            Nom du fournisseur
                          </Label>
                          <Input
                            id="manual-supplier-name"
                            placeholder="Ex: Canac, Rona, Home Depot..."
                            value={manualSupplierName}
                            onChange={(e) => setManualSupplierName(e.target.value)}
                            className="border-amber-200 dark:border-amber-800"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="manual-supplier-phone" className="text-sm">
                            Téléphone (optionnel)
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="manual-supplier-phone"
                              placeholder="(XXX) XXX-XXXX"
                              value={manualSupplierPhone}
                              onChange={(e) => setManualSupplierPhone(e.target.value)}
                              className="pl-10 border-amber-200 dark:border-amber-800"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="manual-amount" className="text-sm">
                            Montant ($)
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="manual-amount"
                              placeholder="0.00"
                              value={manualAmount}
                              onChange={(e) => setManualAmount(e.target.value)}
                              className="pl-10 border-amber-200 dark:border-amber-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  extractedSuppliers.map((supplier, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectSupplier(index)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedSupplierIndex === index
                          ? 'border-amber-500 bg-amber-100/50 dark:bg-amber-900/30 shadow-lg'
                          : 'border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:bg-white dark:hover:bg-background'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {selectedSupplierIndex === index && (
                              <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            )}
                            <span className="truncate">🏢 {supplier.supplierName}</span>
                          </div>
                          {supplier.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-xl text-amber-600 dark:text-amber-400">
                            {formatCurrency(parseAmount(supplier.amount))}
                          </div>
                          {parseAmount(supplier.amount) > 0 && (
                            <div className="text-xs text-muted-foreground">avant taxes</div>
                          )}
                        </div>
                      </div>

                      {/* Options for selected supplier */}
                      {selectedSupplierIndex === index && supplier.options && supplier.options.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Options disponibles:</p>
                          <div className="grid gap-2">
                            {supplier.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOption(optIndex);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedOptionIndex === optIndex
                                    ? 'border-amber-500 bg-amber-200/50 dark:bg-amber-800/30'
                                    : 'border-amber-200 dark:border-amber-800 hover:border-amber-400 bg-white/50 dark:bg-background/50'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-sm">{option.name}</span>
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(parseAmount(option.amount))}
                                  </span>
                                </div>
                                {option.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* DIY Badge */}
                <div className="flex justify-center pt-4">
                  <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 px-4 py-2">
                    <Hammer className="h-4 w-4 mr-2" />
                    Fait par moi-même
                  </Badge>
                </div>
              </div>
            </ScrollArea>

            {/* Selection Summary & Confirm */}
            {(selectedSupplier || (manualSupplierName.trim() && parseAmount(manualAmount) > 0)) && (
              <div className="p-4 border-t bg-background">
                <div className="rounded-lg bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Fournisseur sélectionné:</p>
                  <p className="font-semibold text-lg">
                    {selectedSupplier ? selectedSupplier.supplierName : manualSupplierName}
                  </p>
                  {(selectedSupplier?.phone || manualSupplierPhone) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {selectedSupplier?.phone || manualSupplierPhone}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-muted-foreground">Montant retenu:</span>
                    <span className="font-bold text-xl text-amber-600 dark:text-amber-400">
                      {formatCurrency(getSelectedAmount())}
                    </span>
                  </div>
                </div>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
                  size="lg"
                  onClick={handleConfirmSelection}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Confirmer et enregistrer
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
