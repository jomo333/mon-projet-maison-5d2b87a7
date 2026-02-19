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
  productName?: string; // Product name to differentiate same supplier with different products
  documentRef?: string; // Document reference (e.g., "Doc 1", "Document 2")
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
  
  // Helper to normalize names for comparison
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };
  
  // Helper to check if a supplier+product combo already exists
  const isDuplicate = (supplierName: string, productName?: string): boolean => {
    const normalizedSupplier = normalizeName(supplierName);
    const normalizedProduct = productName ? normalizeName(productName) : '';
    return contacts.some(c => 
      normalizeName(c.supplierName) === normalizedSupplier &&
      normalizeName(c.productName || '') === normalizedProduct
    );
  };

  // Helper to extract the best amount from a text block - PRIORITIZE "avant taxes" for budget coherence
  const extractBestAmount = (text: string): string => {
    // Priority patterns - AVANT TAXES first (budget is excluding taxes)
    const priorityPatterns = [
      // Highest priority: explicit "avant taxes" / "HT" amounts
      /Sous-total\s*(?:avant\s*taxes|HT)\s*:?\s*\*?\*?\s*([0-9\s,\.]+)\s*\$?\*?\*?/i,
      /Montant\s*(?:total\s*)?avant\s*taxes\s*:?\s*\*?\*?\s*([0-9\s,\.]+)\s*\$?\*?\*?/i,
      /Prix\s*(?:total\s*)?avant\s*taxes\s*:?\s*\*?\*?\s*([0-9\s,\.]+)\s*\$?\*?\*?/i,
      /Total\s*(?:avant\s*taxes|HT)\s*:?\s*\*?\*?\s*([0-9\s,\.]+)\s*\$?\*?\*?/i,
      /Sous-total\s*:?\s*\*?\*?\s*([0-9\s,\.]+)\s*\$?\*?\*?/i,
      // Emoji pattern (often shows pre-tax)
      /💰\s*\*?\*?\s*([0-9]{1,3}(?:[\s,][0-9]{3})*(?:[,\.][0-9]{2})?)\s*\$?\*?\*?/,
      // Generic total (avoid TTC/avec taxes)
      /\*\*\s*Total\s*:?\s*([0-9\s,\.]+)\s*\$\s*\*\*/i,
      /Total\s*:?\s*\*?\*?\s*([0-9\s,\.]+)\s*\$\s*\*?\*?/i,
    ];
    
    for (const pattern of priorityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = parseCurrencyAmount(match[1].trim());
        const num = parseFloat(parsed);
        if (num > 50) { // Reasonable minimum for a quote
          console.log(`[DIY Extract] Found amount ${num} with priority pattern: ${pattern.source.substring(0, 40)}...`);
          return parsed;
        }
      }
    }
    
    // Fallback: find all amounts and return the largest one (likely the total)
    const allMatches = text.matchAll(/([0-9]{1,3}(?:[\s,][0-9]{3})*(?:[,\.][0-9]{2})?)\s*\$/g);
    let maxAmount = 0;
    let maxAmountStr = '';
    for (const m of allMatches) {
      const parsed = parseCurrencyAmount(m[1]);
      const num = parseFloat(parsed);
      if (num > maxAmount && num > 50) {
        maxAmount = num;
        maxAmountStr = parsed;
      }
    }
    if (maxAmountStr) {
      console.log(`[DIY Extract] Using fallback largest amount: ${maxAmount}`);
    }
    return maxAmountStr;
  };
  
  // STRATEGY 1: Look for document sections (## Document 1, ## Document 2, etc.)
  const documentSections = analysisResult.split(/(?=##\s*(?:📄\s*)?Document\s*\d)/i);
  
  if (documentSections.length > 1) {
    console.log(`[DIY Extract] Found ${documentSections.length - 1} document sections`);
    
    for (let i = 1; i < documentSections.length; i++) {
      const section = documentSections[i];
      const docNumMatch = section.match(/Document\s*(\d+)/i);
      const docRef = docNumMatch ? `Doc ${docNumMatch[1]}` : `Doc ${i}`;
      
      // Extract supplier name from 🏢 emoji or bold text
      let supplierName = '';
      const supplierPatterns = [
        /🏢\s*\*?\*?([^*\n📞💰]+?)(?:\s*\([^)]+\))?(?:\s*[-–—]|\*\*|\n)/,
        /\*\*Fournisseur\s*:?\*?\*?\s*([^\n*]+)/i,
        /Entreprise\s*:?\s*\*?\*?([^\n*]+)/i,
      ];
      
      for (const pattern of supplierPatterns) {
        const match = section.match(pattern);
        if (match && match[1]) {
          supplierName = match[1].trim().replace(/\*+/g, '').replace(/^\s*[-–—]\s*/, '');
          if (supplierName.length > 2 && supplierName.length < 60) break;
        }
      }
      
      // Extract phone
      const phoneMatch = section.match(/📞\s*(?:Téléphone\s*:?\s*)?([0-9\-\.\s\(\)]+)/);
      const phone = phoneMatch ? phoneMatch[1].trim() : '';
      
      // Extract product name
      let productName = '';
      const productPatterns = [
        /📦\s*(?:Produit\s*:?\s*)?([^\n📞💰]+)/i,
        /Produit\s*:?\s*\*?\*?([^*\n|]+)/i,
      ];
      for (const pattern of productPatterns) {
        const match = section.match(pattern);
        if (match && match[1]) {
          const candidate = match[1].trim().replace(/\*+/g, '');
          if (candidate.length > 2 && candidate.length < 100) {
            productName = candidate;
            break;
          }
        }
      }
      
      // Extract amount
      const amount = extractBestAmount(section);
      
      if (supplierName && !isDuplicate(supplierName, productName)) {
        contacts.push({
          supplierName,
          phone,
          amount,
          productName: productName || undefined,
          documentRef: docRef,
        });
        console.log(`[DIY Extract] Added from doc section: ${supplierName} - ${docRef} - ${amount}$`);
      }
    }
  }
  
  // STRATEGY 2: If no document sections found, try 🏢 blocks
  if (contacts.length === 0) {
    const companyBlocks = analysisResult.split(/(?=\*\*🏢)/);
    
    for (let blockIndex = 0; blockIndex < companyBlocks.length; blockIndex++) {
      const block = companyBlocks[blockIndex];
      if (!block.includes('🏢')) continue;
      
      // Try to extract document reference
      let docRef = '';
      const docPatterns = [
        /📄\s*(?:Document|Doc\.?)\s*:?\s*(\d+|[A-Za-z])/i,
        /\*\*(?:Document|Doc\.?)\s*(\d+|[A-Za-z])\*\*/i,
        /Document\s*#?\s*(\d+)/i,
      ];
      
      for (const pattern of docPatterns) {
        const match = block.match(pattern);
        if (match && match[1]) {
          docRef = `Doc ${match[1]}`;
          break;
        }
      }
      
      // Look backwards to find document header
      if (!docRef) {
        const blockStart = analysisResult.indexOf(block);
        if (blockStart > 0) {
          const textBefore = analysisResult.substring(Math.max(0, blockStart - 500), blockStart);
          const headerMatch = textBefore.match(/Document\s*(\d+)/gi);
          if (headerMatch && headerMatch.length > 0) {
            const lastMatch = headerMatch[headerMatch.length - 1];
            const numMatch = lastMatch.match(/(\d+)$/);
            if (numMatch) {
              docRef = `Doc ${numMatch[1]}`;
            }
          }
        }
      }
      
      // Fallback: use block index
      if (!docRef) {
        const validBlockIndex = companyBlocks.slice(0, blockIndex + 1).filter(b => b.includes('🏢')).length;
        docRef = `Doc ${validBlockIndex}`;
      }
      
      const nameMatch = block.match(/🏢\s*\*?\*?([^*\n(]+?)(?:\s*\([^)]+\))?(?:\s*[-–—]|\*\*)/);
      const phoneMatch = block.match(/📞\s*(?:Téléphone\s*:?\s*)?([0-9\-\.\s\(\)]+)/);
      
      // Extract product name
      let productName = '';
      const productPatterns = [
        /📦\s*(?:Produit\s*:?\s*)?([^\n📞💰]+)/i,
        /Produit\s*:?\s*\*?\*?([^*\n|]+)/i,
      ];
      for (const pattern of productPatterns) {
        const match = block.match(pattern);
        if (match && match[1]) {
          const candidate = match[1].trim().replace(/\*+/g, '');
          if (candidate.length > 2 && candidate.length < 100) {
            productName = candidate;
            break;
          }
        }
      }
      
      // Extract amount
      const amount = extractBestAmount(block);
      
      if (nameMatch) {
        const supplierName = nameMatch[1].trim().replace(/\*+/g, '');
        
        if (!isDuplicate(supplierName, productName)) {
          contacts.push({
            supplierName,
            phone: phoneMatch ? phoneMatch[1].trim() : '',
            amount: amount,
            productName: productName || undefined,
            documentRef: docRef,
          });
          console.log(`[DIY Extract] Added from 🏢 block: ${supplierName} - ${docRef} - ${amount}$`);
        }
      }
    }
  }
  
  // STRATEGY 3: Extract from comparison table if still no results
  if (contacts.length === 0) {
    const tableRows = analysisResult.matchAll(/\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*\*?\*?([0-9\s,\.]+)\s*\$\*?\*?\s*\|/g);
    let rowIndex = 0;
    for (const row of tableRows) {
      const col1 = row[1].trim();
      const col2 = row[2].trim();
      const amount = parseCurrencyAmount(row[3]);
      
      // Skip header rows
      if (col1.includes('---') || col1.toLowerCase().includes('fournisseur') || 
          col1.toLowerCase().includes('entreprise') || col1.toLowerCase().includes('critère')) {
        continue;
      }
      
      rowIndex++;
      if (amount && col1.length > 1) {
        const isCol1Product = col1.length > 20 || col1.includes(' de ') || col1.includes(' pour ');
        const supplierName = isCol1Product ? col2 : col1;
        const productName = isCol1Product ? col1 : (col2.length > 5 && !col2.match(/^\d/) ? col2 : '');
        
        if (!isDuplicate(supplierName, productName)) {
          contacts.push({
            supplierName: supplierName.charAt(0).toUpperCase() + supplierName.slice(1),
            phone: '',
            amount: amount,
            productName: productName || undefined,
            documentRef: `Doc ${rowIndex}`,
          });
        }
      }
    }
  }
  
  // STRATEGY 4: Simple two-column table fallback
  if (contacts.length === 0) {
    const simpleTableRows = analysisResult.matchAll(/\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*\*?\*?([0-9\s,\.]+)\s*\$\*?\*?\s*\|/g);
    let rowIndex = 0;
    for (const row of simpleTableRows) {
      const name = row[1].trim();
      const amt = parseCurrencyAmount(row[2]);
      if (name && !name.includes('Entreprise') && !name.includes('---') && !name.includes('Critère') && amt) {
        rowIndex++;
        if (!isDuplicate(name, undefined)) {
          contacts.push({
            supplierName: name.charAt(0).toUpperCase() + name.slice(1),
            phone: '',
            amount: amt,
            documentRef: `Doc ${rowIndex}`,
          });
        }
      }
    }
  }
  
  // Dédoublonnage par fournisseur : fusionner les entrées du même fournisseur (options = produits/montants distincts)
  const mergedBySupplier: ExtractedContact[] = [];
  const seenSupplier = new Set<string>();
  for (const c of contacts) {
    if (!c.supplierName || c.supplierName.length < 2) continue;
    const key = normalizeName(c.supplierName);
    if (seenSupplier.has(key)) {
      const existing = mergedBySupplier.find(m => normalizeName(m.supplierName) === key);
      if (existing) {
        if (!existing.amount && c.amount) existing.amount = c.amount;
        if (!existing.phone && c.phone) existing.phone = c.phone;
        const optName = c.productName || c.documentRef || "Option";
        const optAmount = c.amount || "";
        const existingOptions = existing.options || [];
        const alreadyHas = existingOptions.some(o =>
          normalizeName(o.name) === normalizeName(optName) && normalizeName(o.amount) === normalizeName(optAmount)
        );
        if (!alreadyHas && (optName !== "Option" || optAmount)) {
          existingOptions.push({ name: optName, amount: optAmount });
          existing.options = existingOptions;
        }
      }
    } else {
      seenSupplier.add(key);
      const opts = c.options?.length ? c.options : (c.productName && c.amount ? [{ name: c.productName, amount: c.amount }] : undefined);
      mergedBySupplier.push({ ...c, options: opts });
    }
  }

  console.log(`[DIY Extract] Total suppliers extracted (deduplicated): ${mergedBySupplier.length}`, mergedBySupplier);
  return mergedBySupplier.filter(c => c.supplierName && c.supplierName.length > 1);
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

    // Appeler dès qu'on a un fournisseur (montant peut être 0, modifiable dans le tableau)
    if (supplier) {
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

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Main Panel - Analysis Result */}
          <div className="flex-1 border-r overflow-hidden flex flex-col min-w-0">
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
          <div className="w-full md:w-[380px] md:min-w-[300px] flex flex-col bg-amber-50/30 dark:bg-amber-950/10 shrink-0">
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
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${
                        selectedSupplierIndex === index
                          ? 'border-amber-500 bg-amber-100/50 dark:bg-amber-900/30 shadow-lg'
                          : 'border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:bg-white dark:hover:bg-background'
                      }`}
                    >
                      {/* Document reference badge */}
                      {supplier.documentRef && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            📄 {supplier.documentRef}
                          </span>
                        </div>
                      )}
                      
                      {/* Header row with supplier name and amount */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {selectedSupplierIndex === index && (
                            <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                          <span className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                            🏢 {supplier.supplierName}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          {parseAmount(supplier.amount) > 0 ? (
                            <div className="font-bold text-lg text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {formatCurrency(parseAmount(supplier.amount))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">
                              Prix non disponible
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Product name - full width below for visibility */}
                      {supplier.productName && (
                        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 px-2 py-1.5 rounded mb-2">
                          <div className="flex items-start gap-1.5">
                            <span className="shrink-0">📦</span>
                            <span className="font-medium leading-tight line-clamp-2">{supplier.productName}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Phone number */}
                      {supplier.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{supplier.phone}</span>
                        </div>
                      )}

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
                  {/* Show product name in summary if available */}
                  {selectedSupplier?.productName && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-1 mt-1">
                      <span>📦</span>
                      {selectedSupplier.productName}
                    </p>
                  )}
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
