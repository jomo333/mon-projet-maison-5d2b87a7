import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { tradeTypes } from "@/data/tradeTypes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Download,
  Building2,
  FileCheck,
  Phone,
  Sparkles,
  X,
  UserCheck,
  Save
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SoumissionsManagerProps {
  projectId: string;
}

// Corps de métier pertinents pour les soumissions
const soumissionTrades = [
  { id: "excavation", name: "Excavation", description: "Creusage du terrain et préparation du sol" },
  { id: "fondation", name: "Fondation/Béton", description: "Coulage des fondations et dalles de béton" },
  { id: "charpente", name: "Charpentier", description: "Structure et ossature de la maison" },
  { id: "toiture", name: "Couvreur", description: "Installation du toit et bardeaux" },
  { id: "fenetre", name: "Fenêtres/Portes", description: "Fourniture et installation des fenêtres et portes" },
  { id: "electricite", name: "Électricien", description: "Installation électrique complète" },
  { id: "plomberie", name: "Plombier", description: "Plomberie et raccordements" },
  { id: "hvac", name: "Chauffage/Ventilation", description: "Système de chauffage et ventilation" },
  { id: "isolation", name: "Isolation", description: "Isolation des murs, plafonds et sous-sol" },
  { id: "gypse", name: "Plâtrier/Gypse", description: "Pose des panneaux de gypse" },
  { id: "peinture", name: "Peintre", description: "Peinture intérieure et extérieure" },
  { id: "plancher", name: "Plancher", description: "Installation des planchers" },
  { id: "ceramique", name: "Céramiste", description: "Pose de céramique salle de bain/cuisine" },
  { id: "armoires", name: "Ébéniste/Armoires", description: "Armoires de cuisine et salle de bain" },
  { id: "comptoirs", name: "Comptoirs", description: "Installation des comptoirs" },
  { id: "exterieur", name: "Revêtement extérieur", description: "Revêtement et finition extérieure" },
  { id: "amenagement", name: "Aménagement paysager", description: "Terrassement et aménagement extérieur" },
  { id: "entrepreneur-general", name: "Entrepreneur général", description: "Gestion complète du projet de construction (ex: D3 Constructions)" },
];

interface SoumissionStatus {
  tradeId: string;
  isCompleted: boolean;
  supplierName?: string;
  supplierPhone?: string;
}

interface AnalysisState {
  tradeId: string;
  isAnalyzing: boolean;
  result: string | null;
}

interface ExtractedContact {
  docName: string;
  supplierName: string;
  phone: string;
  amount: string;
}

interface ExtractedOption {
  docName: string;
  optionName: string;
  amount: string;
  description: string;
}

interface SupplierSelection {
  tradeId: string;
  tradeName: string;
}

interface SupplierFormData {
  name: string;
  phone: string;
  referenceName: string;
  amount: string;
  selectedDocId: string | null;
  selectedOption: string | null;
}

export function SoumissionsManager({ projectId }: SoumissionsManagerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { canUseAI } = usePlanLimits();
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [uploadingTrade, setUploadingTrade] = useState<string | null>(null);
  const [supplierInputs, setSupplierInputs] = useState<Record<string, SupplierFormData>>({});
  const [analysisStates, setAnalysisStates] = useState<Record<string, AnalysisState>>({});
  const [selectingSupplier, setSelectingSupplier] = useState<SupplierSelection | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const safeParseNotes = (raw: string | null | undefined): any => {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  // Charger les statuts des soumissions depuis task_dates
  const { data: soumissionStatuses, isLoading: loadingStatuses } = useQuery({
    queryKey: ['soumission-statuses', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dates')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .like('task_id', 'soumission-%');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Charger les documents de soumission
  const { data: soumissionDocs, isLoading: loadingDocs } = useQuery({
    queryKey: ['soumission-docs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .like('task_id', 'soumission-%');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Initialiser les inputs des fournisseurs
  useEffect(() => {
    if (soumissionStatuses) {
      const inputs: Record<string, SupplierFormData> = {};
      soumissionStatuses.forEach(status => {
        const tradeId = status.task_id.replace('soumission-', '');
        const notes = safeParseNotes(status.notes);
        inputs[tradeId] = {
          name: notes.supplierName || '',
          phone: notes.supplierPhone || '',
          referenceName: notes.referenceName || '',
          amount: notes.amount || '',
          selectedDocId: notes.selectedDocId || null,
          selectedOption: notes.selectedOption || null,
        };
      });
      setSupplierInputs(inputs);
    }
  }, [soumissionStatuses]);

  // Mutation pour sauvegarder le statut avec montant et option
  const saveStatusMutation = useMutation({
    mutationFn: async ({ tradeId, isCompleted, supplierName, supplierPhone, referenceName, amount, selectedDocId, selectedOption }: SoumissionStatus & { referenceName?: string; amount?: string; selectedDocId?: string; selectedOption?: string }) => {
      const notes = JSON.stringify({ supplierName, supplierPhone, referenceName, isCompleted, amount, selectedDocId, selectedOption });
      
      const { data: existing } = await supabase
        .from('task_dates')
        .select('id')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', `soumission-${tradeId}`)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('task_dates')
          .update({ notes })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_dates')
          .insert({
            project_id: projectId,
            step_id: 'soumissions',
            task_id: `soumission-${tradeId}`,
            notes,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soumission-statuses', projectId] });
    },
  });

  // Mutation pour uploader un document
  const uploadMutation = useMutation({
    mutationFn: async ({ tradeId, file }: { tradeId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/soumissions/${tradeId}/${Date.now()}_${file.name}`;
      
      // Upload vers le storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      // Sauvegarder dans la base de données
      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          project_id: projectId,
          step_id: 'soumissions',
          task_id: `soumission-${tradeId}`,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          category: 'soumission',
        });

      if (dbError) throw dbError;
      return urlData.publicUrl;
    },
    onSuccess: (_, { tradeId }) => {
      queryClient.invalidateQueries({ queryKey: ['soumission-docs', projectId] });
      toast({
        title: "Document ajouté",
        description: "La soumission a été téléchargée avec succès.",
      });
      setUploadingTrade(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document",
        variant: "destructive",
      });
      setUploadingTrade(null);
    },
  });

  // Mutation pour supprimer un document
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soumission-docs', projectId] });
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé.",
      });
    },
  });

  const handleFileUpload = (tradeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadingTrade(tradeId);
      uploadMutation.mutate({ tradeId, file: files[0] });
    }
    e.target.value = '';
  };

  const getTradeStatus = (tradeId: string) => {
    const status = soumissionStatuses?.find(s => s.task_id === `soumission-${tradeId}`);
    if (!status?.notes) return { isCompleted: false, supplierName: '', supplierPhone: '' };
    try {
      const notes = JSON.parse(status.notes);
      return {
        isCompleted: notes.isCompleted || false,
        supplierName: notes.supplierName || '',
        supplierPhone: notes.supplierPhone || '',
      };
    } catch {
      return { isCompleted: false, supplierName: '', supplierPhone: '' };
    }
  };

  const getTradeDocs = (tradeId: string) => {
    return soumissionDocs?.filter(d => d.task_id === `soumission-${tradeId}`) || [];
  };

  const handleToggleCompleted = (tradeId: string) => {
    const current = getTradeStatus(tradeId);
    const inputs = supplierInputs[tradeId] || { name: '', phone: '', referenceName: '', amount: '', selectedDocId: null };
    saveStatusMutation.mutate({
      tradeId,
      isCompleted: !current.isCompleted,
      supplierName: inputs.name || current.supplierName,
      supplierPhone: inputs.phone || current.supplierPhone,
      referenceName: inputs.referenceName,
      amount: inputs.amount,
      selectedDocId: inputs.selectedDocId || undefined,
    });
  };

  const handleSaveSupplier = (tradeId: string) => {
    const current = getTradeStatus(tradeId);
    const inputs = supplierInputs[tradeId] || { name: '', phone: '', referenceName: '', amount: '', selectedDocId: null };
    saveStatusMutation.mutate({
      tradeId,
      isCompleted: current.isCompleted,
      supplierName: inputs.name,
      supplierPhone: inputs.phone,
      referenceName: inputs.referenceName,
      amount: inputs.amount,
      selectedDocId: inputs.selectedDocId || undefined,
    });
    toast({
      title: "Fournisseur enregistré",
      description: `${inputs.name} a été enregistré.`,
    });
  };

  // Fonction pour analyser les soumissions d'un corps de métier
  const analyzeSoumissions = async (tradeId: string, tradeName: string, tradeDescription: string) => {
    const docs = getTradeDocs(tradeId);
    
    if (docs.length === 0) {
      toast({
        title: "Aucun document",
        description: "Veuillez d'abord télécharger des soumissions à analyser.",
        variant: "destructive",
      });
      return;
    }

    const limitCheck = canUseAI();
    if (!limitCheck.allowed) {
      sonnerToast.error(t("toasts.freePlanLimitReached", "Limite d'analyses IA atteinte."), {
        action: {
          label: t("toasts.limitReachedAction", "Acheter ou améliorer"),
          onClick: () => navigate("/forfaits#acheter-analyses"),
        },
      });
      return;
    }

    setAnalysisStates(prev => ({
      ...prev,
      [tradeId]: { tradeId, isAnalyzing: true, result: null }
    }));

    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Session invalide. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-soumissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            tradeName,
            tradeDescription,
            documents: docs.map(d => ({
              file_name: d.file_name,
              file_url: d.file_url,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          sonnerToast.error(t("toasts.freePlanLimitReached", "Limite d'analyses IA atteinte."), {
            action: {
              label: t("toasts.limitReachedAction", "Acheter ou améliorer"),
              onClick: () => navigate("/forfaits#acheter-analyses"),
            },
          });
          setAnalysisStates(prev => ({ ...prev, [tradeId]: { tradeId, isAnalyzing: false, result: null } }));
          return;
        }
        throw new Error(errorData.error || "Erreur lors de l'analyse");
      }

      if (!response.body) {
        throw new Error("Pas de réponse du serveur");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let analysisResult = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              analysisResult += content;
              setAnalysisStates(prev => ({
                ...prev,
                [tradeId]: { tradeId, isAnalyzing: true, result: analysisResult }
              }));
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setAnalysisStates(prev => ({
        ...prev,
        [tradeId]: { tradeId, isAnalyzing: false, result: analysisResult }
      }));

      window.dispatchEvent(new CustomEvent("subscription-refetch"));

      toast({
        title: "Analyse terminée",
        description: `L'analyse des soumissions pour ${tradeName} est prête.`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisStates(prev => ({
        ...prev,
        [tradeId]: { tradeId, isAnalyzing: false, result: null }
      }));
      toast({
        title: "Erreur d'analyse",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const clearAnalysis = (tradeId: string) => {
    setAnalysisStates(prev => {
      const newState = { ...prev };
      delete newState[tradeId];
      return newState;
    });
  };

  // State for tracking saved analyses and saving state
  const [savedAnalyses, setSavedAnalyses] = useState<Record<string, boolean>>({});
  const [savingAnalysis, setSavingAnalysis] = useState<string | null>(null);

  // Save analysis result to task_attachments for project gallery
  const saveAnalysisToGallery = async (tradeId: string, tradeName: string, analysisContent: string) => {
    if (!analysisContent || !session?.user?.id) return;
    
    setSavingAnalysis(tradeId);
    try {
      const blob = new Blob([analysisContent], { type: 'text/markdown' });
      const fileName = `Analyse_IA_${tradeName.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
      const storagePath = `${session.user.id}/${projectId}/soumissions/${tradeId}/analyses/${Date.now()}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(storagePath);

      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          project_id: projectId,
          step_id: 'soumissions',
          task_id: `soumission-${tradeId}`,
          file_name: `Analyse IA - ${tradeName}`,
          file_url: urlData.publicUrl,
          file_type: 'text/markdown',
          file_size: blob.size,
          category: 'analyse',
        });

      if (dbError) throw dbError;

      setSavedAnalyses(prev => ({ ...prev, [tradeId]: true }));
      queryClient.invalidateQueries({ queryKey: ['soumission-docs', projectId] });
      
      toast({
        title: t("gallery.analysisSaved"),
        description: t("gallery.analysisSavedDesc"),
      });
    } catch (error) {
      console.error("Error saving analysis:", error);
      toast({
        title: t("common.error"),
        description: t("gallery.analysisSaveError"),
        variant: "destructive",
      });
    } finally {
      setSavingAnalysis(null);
    }
  };

  // Parser les contacts extraits de l'analyse IA
  const parseExtractedContacts = (analysisResult: string | null, docs: typeof soumissionDocs): ExtractedContact[] => {
    if (!analysisResult) return [];
    
    const contacts: ExtractedContact[] = [];
    
    // Chercher le bloc ```contacts
    const contactsMatch = analysisResult.match(/```contacts\n([\s\S]*?)```/);
    if (contactsMatch) {
      const lines = contactsMatch[1].split('\n').filter(line => line.trim() && line.includes('|'));
      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          contacts.push({
            docName: parts[0],
            supplierName: parts[1],
            phone: parts[2],
            amount: parts[3],
          });
        }
      }
    }
    
    // Si pas de bloc contacts, essayer d'extraire du tableau comparatif
    if (contacts.length === 0 && docs) {
      const tableMatch = analysisResult.match(/\|\s*Téléphone\s*\|([^\n]+)\|/i);
      const entrepriseMatch = analysisResult.match(/\|\s*Entreprise\s*\|([^\n]+)\|/i);
      const montantMatch = analysisResult.match(/\|\s*Montant\s*\|([^\n]+)\|/i);
      
      if (tableMatch && entrepriseMatch) {
        const phones = tableMatch[1].split('|').map(p => p.trim());
        const names = entrepriseMatch[1].split('|').map(p => p.trim());
        const amounts = montantMatch ? montantMatch[1].split('|').map(p => p.trim()) : [];
        
        for (let i = 0; i < Math.min(names.length, docs.length); i++) {
          if (names[i] && names[i] !== '-' && names[i] !== '') {
            contacts.push({
              docName: docs[i]?.file_name || '',
              supplierName: names[i],
              phone: phones[i] || '',
              amount: amounts[i]?.replace(/[^\d]/g, '') || '',
            });
          }
        }
      }
    }
    
    return contacts;
  };

  // Parser les options extraites de l'analyse IA
  const parseExtractedOptions = (analysisResult: string | null): ExtractedOption[] => {
    if (!analysisResult) return [];
    
    const options: ExtractedOption[] = [];
    
    // Chercher le bloc ```options
    const optionsMatch = analysisResult.match(/```options\n([\s\S]*?)```/);
    if (optionsMatch) {
      const lines = optionsMatch[1].split('\n').filter(line => line.trim() && line.includes('|'));
      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          options.push({
            docName: parts[0],
            optionName: parts[1],
            amount: parts[2].replace(/[^\d.]/g, ''),
            description: parts[3] || '',
          });
        }
      }
    }
    
    // Si pas de bloc options, chercher des patterns d'options dans le texte
    if (options.length === 0) {
      // Chercher des patterns comme "Option A: 15000$" ou "Forfait Premium - 18500$"
      const optionPatterns = [
        /(?:Option|Forfait|Package|Choix)\s*([A-Za-z0-9\s]+)[:\-–]\s*(\d[\d\s,\.]*)\s*\$/gi,
        /([A-Za-z]+\s*(?:Standard|Premium|Deluxe|Basic|Pro|Gold|Silver|Bronze))[:\-–]?\s*(\d[\d\s,\.]*)\s*\$/gi,
      ];
      
      for (const pattern of optionPatterns) {
        let match;
        while ((match = pattern.exec(analysisResult)) !== null) {
          const optionName = match[1].trim();
          const amount = match[2].replace(/[\s,]/g, '');
          // Éviter les doublons
          if (!options.some(o => o.optionName === optionName)) {
            options.push({
              docName: '',
              optionName,
              amount,
              description: '',
            });
          }
        }
      }
    }
    
    console.log('Parsed options:', options);
    return options;
  };

  // Ouvrir le dialog de sélection du fournisseur
  const openSupplierSelection = (tradeId: string, tradeName: string) => {
    setSelectingSupplier({ tradeId, tradeName });
  };

  // Confirmer et enregistrer le fournisseur sélectionné avec budget
  const confirmSupplierSelection = async () => {
    if (!selectingSupplier) return;
    
    const { tradeId, tradeName } = selectingSupplier;
    const inputs = supplierInputs[tradeId] || { name: '', phone: '', referenceName: '', amount: '', selectedDocId: null, selectedOption: null };
    
    if (!inputs.name.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer le nom du fournisseur",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingBudget(true);
    
    try {
      // Sauvegarder le fournisseur avec l'option sélectionnée
      saveStatusMutation.mutate({
        tradeId,
        isCompleted: true,
        supplierName: inputs.name,
        supplierPhone: inputs.phone,
        referenceName: inputs.referenceName,
        amount: inputs.amount,
        selectedDocId: inputs.selectedDocId || undefined,
        selectedOption: inputs.selectedOption || undefined,
      });
      
      // Si un montant est fourni, l'enregistrer dans le budget
      if (inputs.amount && parseFloat(inputs.amount) > 0) {
        const amountValue = parseFloat(inputs.amount);
        
        // Vérifier si une catégorie budget existe pour ce corps de métier
        const { data: existingBudget } = await supabase
          .from('project_budgets')
          .select('*')
          .eq('project_id', projectId)
          .eq('category_name', tradeName)
          .maybeSingle();
        
        if (existingBudget) {
          // Mettre à jour le coût réel (spent)
          await supabase
            .from('project_budgets')
            .update({ 
              spent: amountValue,
              items: JSON.stringify([{
                name: inputs.name,
                amount: amountValue,
                type: 'soumission'
              }])
            })
            .eq('id', existingBudget.id);
        } else {
          // Créer une nouvelle catégorie budget
          const trade = soumissionTrades.find(t => t.id === tradeId);
          await supabase
            .from('project_budgets')
            .insert({
              project_id: projectId,
              category_name: tradeName,
              description: trade?.description || '',
              budget: 0, // Coût projeté à définir
              spent: amountValue, // Coût réel
              color: getTradeColor(tradeId),
              items: JSON.stringify([{
                name: inputs.name,
                amount: amountValue,
                type: 'soumission'
              }])
            });
        }
        
        queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
        
        toast({
          title: "Fournisseur et budget enregistrés",
          description: `${inputs.name} sélectionné. Montant de ${formatCurrency(amountValue)} ajouté au budget.`,
        });
      } else {
        toast({
          title: "Fournisseur retenu",
          description: `${inputs.name} a été sélectionné pour ${tradeName}.`,
        });
      }
    } catch (error) {
      console.error('Error saving supplier/budget:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSavingBudget(false);
      setSelectingSupplier(null);
    }
  };

  // Sélectionner un document et pré-remplir avec les contacts extraits
  const selectDocument = (tradeId: string, docId: string, docName: string, extractedContacts: ExtractedContact[]) => {
    // Chercher les contacts extraits pour ce document
    const matchedContact = extractedContacts.find(c => {
      const docNameNormalized = docName.toLowerCase().replace(/[_\-\s]/g, '');
      const contactDocNormalized = c.docName.toLowerCase().replace(/[_\-\s]/g, '');
      return docNameNormalized.includes(contactDocNormalized) || contactDocNormalized.includes(docNameNormalized);
    });
    
    let supplierName = matchedContact?.supplierName || '';
    let phone = matchedContact?.phone || '';
    let amount = matchedContact?.amount || '';
    
    // Si pas trouvé par correspondance exacte, essayer par index
    if (!matchedContact) {
      const docs = getTradeDocs(tradeId);
      const docIndex = docs.findIndex(d => d.id === docId);
      if (docIndex !== -1 && extractedContacts[docIndex]) {
        supplierName = extractedContacts[docIndex].supplierName;
        phone = extractedContacts[docIndex].phone;
        amount = extractedContacts[docIndex].amount;
      }
    }
    
    // Fallback: extraire du nom de fichier
    if (!supplierName) {
      supplierName = docName
        .replace(/\.pdf$/i, '')
        .replace(/\.docx?$/i, '')
        .replace(/\.xlsx?$/i, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\d{10,}/g, '')
        .trim();
    }
    
    setSupplierInputs(prev => ({
      ...prev,
      [tradeId]: {
        ...prev[tradeId],
        selectedDocId: docId,
        name: supplierName,
        phone: phone,
        amount: amount,
      }
    }));
  };

  const getTradeColor = (tradeId: string) => {
    const trade = tradeTypes.find(t => t.id === tradeId);
    return trade?.color || "#6B7280";
  };

  const completedCount = soumissionTrades.filter(t => getTradeStatus(t.id).isCompleted).length;

  if (loadingStatuses || loadingDocs) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <Building2 className="h-5 w-5 text-primary" />
          <span>Soumissions par corps de métier</span>
        </div>
        <Badge variant={completedCount === soumissionTrades.length ? "default" : "secondary"}>
          {completedCount}/{soumissionTrades.length} complétées
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Obtenez au moins 3 soumissions par spécialité et téléchargez-les pour les comparer.
      </p>

      {!canUseAI().allowed && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
            {canUseAI().message || "Limite d'analyses IA atteinte."}
          </p>
          <Button variant="default" size="sm" onClick={() => navigate("/forfaits#acheter-analyses")} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Acheter ou améliorer
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {soumissionTrades.map((trade) => {
          const status = getTradeStatus(trade.id);
          const docs = getTradeDocs(trade.id);
          const isExpanded = expandedTrade === trade.id;
          const inputs = supplierInputs[trade.id] || { name: '', phone: '' };

          return (
            <Card 
              key={trade.id}
              className={`transition-all ${status.isCompleted ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''}`}
            >
              <CardContent className="p-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedTrade(isExpanded ? null : trade.id)}
                >
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getTradeColor(trade.id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${status.isCompleted ? 'text-green-700 dark:text-green-400' : ''}`}>
                        {trade.name}
                      </span>
                      {status.isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                      {docs.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {docs.length} doc{docs.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {status.supplierName ? `✓ ${status.supplierName}` : trade.description}
                    </p>
                  </div>
                  <div 
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCompleted(trade.id);
                    }}
                  >
                    <Checkbox checked={status.isCompleted} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Infos fournisseur */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Fournisseur retenu
                        </label>
                        <Input
                          placeholder="Nom du fournisseur"
                          value={inputs.name}
                          onChange={(e) => setSupplierInputs(prev => ({
                            ...prev,
                            [trade.id]: { ...prev[trade.id], name: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Téléphone
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="514-555-1234"
                            value={inputs.phone}
                            onChange={(e) => setSupplierInputs(prev => ({
                              ...prev,
                              [trade.id]: { ...prev[trade.id], phone: e.target.value }
                            }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveSupplier(trade.id)}
                            disabled={saveStatusMutation.isPending}
                          >
                            {saveStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Documents de soumission */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documents de soumission
                        </span>
                        <label>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(trade.id, e)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            disabled={uploadingTrade === trade.id}
                          >
                            <span className="cursor-pointer">
                              {uploadingTrade === trade.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Ajouter
                            </span>
                          </Button>
                        </label>
                      </div>

                      {docs.length > 0 ? (
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div 
                              key={doc.id}
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate flex-1">{doc.file_name}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(doc.file_url);
                                    if (!response.ok) throw new Error('Erreur de téléchargement');
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = doc.file_name;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  } catch (error) {
                                    console.error('Download error:', error);
                                    // Fallback: ouvrir dans un nouvel onglet
                                    window.open(doc.file_url, '_blank');
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Aucune soumission téléchargée pour ce corps de métier.
                        </p>
                      )}
                    </div>

                    {/* Bouton d'analyse et résultats */}
                    <div className="space-y-3">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => analyzeSoumissions(trade.id, trade.name, trade.description)}
                        disabled={docs.length === 0 || analysisStates[trade.id]?.isAnalyzing || !canUseAI().allowed}
                        className="w-full gap-2"
                      >
                        {analysisStates[trade.id]?.isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyse en cours...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Analyser les soumissions
                          </>
                        )}
                      </Button>

                      {/* Résultat de l'analyse */}
                      {analysisStates[trade.id]?.result && (
                        <div className="relative border rounded-lg p-4 bg-gradient-to-br from-primary/5 to-primary/10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => clearAnalysis(trade.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Analyse IA - Rapport qualité-prix</span>
                          </div>
                          <ScrollArea className="h-[400px]">
                            <div className="prose prose-sm dark:prose-invert max-w-none pr-4 
                              prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-border
                              prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-th:text-left prose-th:font-semibold
                              prose-td:border prose-td:border-border prose-td:p-2
                              prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
                              prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1
                              prose-ul:my-2 prose-li:my-0.5
                              prose-p:my-2">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {analysisStates[trade.id].result}
                              </ReactMarkdown>
                            </div>
                          </ScrollArea>
                          
                          {/* Boutons d'action */}
                          <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                            {/* Bouton pour enregistrer l'analyse */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                              disabled={savingAnalysis === trade.id || savedAnalyses[trade.id]}
                              onClick={() => saveAnalysisToGallery(trade.id, trade.name, analysisStates[trade.id].result!)}
                            >
                              {savingAnalysis === trade.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {t("common.saving")}
                                </>
                              ) : savedAnalyses[trade.id] ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  {t("gallery.analysisSavedShort")}
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  {t("gallery.saveToGallery")}
                                </>
                              )}
                            </Button>
                            
                            {/* Bouton pour choisir le fournisseur */}
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full gap-2"
                              onClick={() => openSupplierSelection(trade.id, trade.name)}
                            >
                              <UserCheck className="h-4 w-4" />
                              Choisir le fournisseur retenu
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {status.supplierPhone && (
                      <a 
                        href={`tel:${status.supplierPhone}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        Appeler {status.supplierName || 'le fournisseur'}
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de sélection du fournisseur */}
      <Dialog open={!!selectingSupplier} onOpenChange={(open) => !open && setSelectingSupplier(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Sélectionner le fournisseur
            </DialogTitle>
            <DialogDescription>
              Choisissez la soumission retenue pour {selectingSupplier?.tradeName}.
            </DialogDescription>
          </DialogHeader>
          
          {selectingSupplier && (() => {
            const tradeDocs = getTradeDocs(selectingSupplier.tradeId);
            const extractedContacts = parseExtractedContacts(
              analysisStates[selectingSupplier.tradeId]?.result || null,
              tradeDocs
            );
            const extractedOptions = parseExtractedOptions(
              analysisStates[selectingSupplier.tradeId]?.result || null
            );
            
            // Grouper les options par document sélectionné
            const selectedDocName = tradeDocs.find(d => d.id === supplierInputs[selectingSupplier.tradeId]?.selectedDocId)?.file_name || '';
            const selectedDocIndex = tradeDocs.findIndex(d => d.id === supplierInputs[selectingSupplier.tradeId]?.selectedDocId);
            
            // Filtrer les options pour le document sélectionné
            const docOptions = extractedOptions.filter(opt => {
              // Si l'option n'a pas de nom de document, on l'affiche pour tous
              if (!opt.docName || opt.docName === '') return true;
              
              // Normaliser les noms pour la comparaison
              const optDocNormalized = opt.docName.toLowerCase().replace(/[_\-\s\d]/g, '');
              const selectedNormalized = selectedDocName.toLowerCase().replace(/[_\-\s\d]/g, '');
              
              // Correspondance partielle
              return optDocNormalized.includes(selectedNormalized) || 
                     selectedNormalized.includes(optDocNormalized) ||
                     // Correspondance par mots-clés
                     optDocNormalized.split(/[_\-\s]/).some(word => 
                       word.length > 3 && selectedNormalized.includes(word)
                     );
            });
            
            console.log('Selected doc:', selectedDocName, 'Options:', extractedOptions, 'Filtered:', docOptions);
            
            // Sélectionner une option
            const selectOption = (optionName: string, amount: string) => {
              setSupplierInputs(prev => ({
                ...prev,
                [selectingSupplier.tradeId]: {
                  ...prev[selectingSupplier.tradeId],
                  selectedOption: optionName,
                  amount: amount,
                }
              }));
            };
            
            return (
            <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {/* Afficher les contacts extraits si disponibles */}
              {(extractedContacts.length > 0 || extractedOptions.length > 0) && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Informations extraites par l'IA</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur une soumission pour pré-remplir automatiquement. 
                    {extractedOptions.length > 0 && " Des options sont disponibles pour certaines soumissions."}
                  </p>
                </div>
              )}
              
              {/* Liste des documents à cocher */}
              {tradeDocs.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">1. Choisissez la soumission retenue</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tradeDocs.map((doc, idx) => {
                      const contact = extractedContacts[idx];
                      const isSelected = supplierInputs[selectingSupplier.tradeId]?.selectedDocId === doc.id;
                      
                      // Vérifier si ce document a des options
                      const docNameNormalized = doc.file_name.toLowerCase().replace(/[_\-\s\d]/g, '');
                      const hasOptions = extractedOptions.some(opt => {
                        if (!opt.docName) return false;
                        const optDocNormalized = opt.docName.toLowerCase().replace(/[_\-\s\d]/g, '');
                        return optDocNormalized.includes(docNameNormalized) || docNameNormalized.includes(optDocNormalized);
                      });
                      
                      return (
                        <div 
                          key={doc.id}
                          className={`flex flex-col gap-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => selectDocument(selectingSupplier.tradeId, doc.id, doc.file_name, extractedContacts)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={isSelected}
                              className="pointer-events-none"
                            />
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate flex-1">{doc.file_name}</span>
                            {hasOptions && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                Options
                              </Badge>
                            )}
                          </div>
                          {contact && (contact.supplierName || contact.phone || contact.amount) && (
                            <div className="ml-10 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {contact.supplierName && (
                                <span className="bg-muted px-2 py-0.5 rounded">{contact.supplierName}</span>
                              )}
                              {contact.phone && (
                                <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              )}
                              {contact.amount && (
                                <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded">
                                  {formatCurrency(parseFloat(contact.amount))}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Options de la soumission sélectionnée */}
              {supplierInputs[selectingSupplier.tradeId]?.selectedDocId && docOptions.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                  <label className="text-sm font-medium flex items-center gap-2">
                    2. Choisissez l'option retenue
                    <Badge variant="secondary" className="text-xs">{docOptions.length} options</Badge>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Cette soumission propose plusieurs options. Sélectionnez celle que vous retenez :
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {docOptions.map((option, idx) => {
                      const isOptionSelected = supplierInputs[selectingSupplier.tradeId]?.selectedOption === option.optionName;
                      
                      return (
                        <div 
                          key={idx}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors bg-background ${
                            isOptionSelected 
                              ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => selectOption(option.optionName, option.amount)}
                        >
                          <Checkbox 
                            checked={isOptionSelected}
                            className="pointer-events-none mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{option.optionName}</span>
                              <span className="text-sm font-semibold text-primary shrink-0">
                                {formatCurrency(parseFloat(option.amount))}
                              </span>
                            </div>
                            {option.description && (
                              <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nom du fournisseur */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom du fournisseur *</label>
                <Input
                  placeholder="Ex: Construction ABC inc."
                  value={supplierInputs[selectingSupplier.tradeId]?.name || ''}
                  onChange={(e) => setSupplierInputs(prev => ({
                    ...prev,
                    [selectingSupplier.tradeId]: { 
                      ...prev[selectingSupplier.tradeId], 
                      name: e.target.value 
                    }
                  }))}
                />
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Téléphone</label>
                <Input
                  placeholder="Ex: 514-555-1234"
                  value={supplierInputs[selectingSupplier.tradeId]?.phone || ''}
                  onChange={(e) => setSupplierInputs(prev => ({
                    ...prev,
                    [selectingSupplier.tradeId]: { 
                      ...prev[selectingSupplier.tradeId], 
                      phone: e.target.value 
                    }
                  }))}
                />
              </div>

              {/* Contact de référence */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Contact de référence
                  <span className="text-xs text-muted-foreground">(client précédent à contacter)</span>
                </label>
                <Input
                  placeholder="Ex: Jean Dupont"
                  value={supplierInputs[selectingSupplier.tradeId]?.referenceName || ''}
                  onChange={(e) => setSupplierInputs(prev => ({
                    ...prev,
                    [selectingSupplier.tradeId]: { 
                      ...prev[selectingSupplier.tradeId], 
                      referenceName: e.target.value 
                    }
                  }))}
                />
              </div>

              {/* Montant de la soumission */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Montant de la soumission
                  <span className="text-xs text-muted-foreground">(sera ajouté au budget comme coût réel)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder={t("budget.amountPlaceholder")}
                    className="pl-7"
                    value={supplierInputs[selectingSupplier.tradeId]?.amount || ''}
                    onChange={(e) => setSupplierInputs(prev => ({
                      ...prev,
                      [selectingSupplier.tradeId]: { 
                        ...prev[selectingSupplier.tradeId], 
                        amount: e.target.value 
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
            </ScrollArea>
            );
          })()}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectingSupplier(null)}>
              Annuler
            </Button>
            <Button 
              onClick={confirmSupplierSelection}
              disabled={saveStatusMutation.isPending || isSavingBudget}
              className="gap-2"
            >
              {(saveStatusMutation.isPending || isSavingBudget) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmer et enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
