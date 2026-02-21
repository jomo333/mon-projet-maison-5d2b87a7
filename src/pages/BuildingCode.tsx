import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Loader2, AlertCircle, FileText, Lightbulb, MessageSquare, Send, User, Bot, CheckCircle, MapPin, Building2, HelpCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import {
  buildingCodeKnowledge as buildingCodeDB,
  type BuildingCodeEntry,
  type ImportanceLevel,
} from "@/data/buildingCodeKnowledge";

// Note: la base de données éducative est importée de buildingCodeKnowledge.ts

// Liste complète des municipalités du Québec (pour afficher la notice)
const allQuebecMunicipalities = [
  "Sherbrooke", "Montréal", "Québec", "Laval", "Gatineau", "Longueuil", "Trois-Rivières",
  "Lévis", "Saguenay", "Terrebonne", "Repentigny", "Brossard", "Saint-Jean-sur-Richelieu",
  "Drummondville", "Saint-Jérôme", "Granby", "Blainville", "Saint-Hyacinthe", "Shawinigan",
  "Rimouski", "Victoriaville", "Châteauguay", "Rouyn-Noranda", "Sept-Îles", "Alma",
  "Magog", "Joliette", "Thetford Mines", "Val-d'Or", "Sainte-Thérèse", "Baie-Comeau",
  "Saint-Georges", "Mascouche", "Mirabel", "Vaudreuil-Dorion", "Saint-Eustache"
];

// Base de données des codes municipaux avec données disponibles et URLs
const municipalCodesDB: Record<string, {
  name: string;
  url: string;
  codes: Array<{
    id: string;
    topic: string;
    requirement: string;
    article: string;
    url?: string;
    tags: string[];
  }>;
}> = {
  "sherbrooke": {
    name: "Sherbrooke",
    url: "https://www.sherbrooke.ca/fr/vie-municipale/reglements",
    codes: [
      { id: "SHE1", topic: "Marge avant minimale", requirement: "6 mètres minimum pour zone résidentielle R1-R2", article: "Règlement 1-2015, art. 234", url: "https://www.sherbrooke.ca/fr/vie-municipale/reglements", tags: ["marge", "recul", "avant"] },
      { id: "SHE2", topic: "Marge latérale minimale", requirement: "1.5 mètres minimum, 3 mètres côté rue pour lots d'angle", article: "Règlement 1-2015, art. 235", url: "https://www.sherbrooke.ca/fr/vie-municipale/reglements", tags: ["marge", "latérale", "recul"] },
      { id: "SHE3", topic: "Hauteur maximale résidentielle", requirement: "10 mètres / 2 étages en zone R1, 12 mètres / 3 étages en R2", article: "Règlement 1-2015, art. 240", url: "https://www.sherbrooke.ca/fr/vie-municipale/reglements", tags: ["hauteur", "étage"] },
      { id: "SHE4", topic: "Stationnement résidentiel", requirement: "Minimum 1 case par logement + 1 case visiteur par 4 logements", article: "Règlement 1-2015, art. 310", url: "https://www.sherbrooke.ca/fr/vie-municipale/reglements", tags: ["stationnement", "parking"] },
      { id: "SHE5", topic: "Clôture hauteur maximale", requirement: "2 mètres en cour arrière, 1 mètre en cour avant", article: "Règlement 1-2015, art. 280", url: "https://www.sherbrooke.ca/fr/vie-municipale/reglements", tags: ["clôture", "hauteur"] },
      { id: "SHE6", topic: "Piscine clôture", requirement: "Clôture minimum 1.2m avec porte auto-verrouillante, distance 1m du lot", article: "Règlement 1-2015, art. 285", url: "https://www.sherbrooke.ca/fr/vie-municipale/reglements", tags: ["piscine", "clôture", "sécurité"] }
    ]
  },
  "montreal": {
    name: "Montréal",
    url: "https://montreal.ca/reglements-urbanisme",
    codes: [
      { id: "MTL1", topic: "Marge avant minimale", requirement: "Varie selon arrondissement - généralement 3 à 6 mètres", article: "Règlement d'urbanisme, chapitre 5", url: "https://montreal.ca/reglements-urbanisme", tags: ["marge", "recul", "avant"] },
      { id: "MTL2", topic: "Coefficient d'occupation du sol", requirement: "COS maximum de 0.5 à 2.0 selon la zone", article: "Règlement d'urbanisme, chapitre 4", url: "https://montreal.ca/reglements-urbanisme", tags: ["cos", "densité"] },
      { id: "MTL3", topic: "Arbres protection", requirement: "Permis requis pour abattre un arbre de plus de 10cm de diamètre", article: "Règlement 18-008, art. 8", url: "https://montreal.ca/reglements-urbanisme", tags: ["arbre", "protection", "permis"] },
      { id: "MTL4", topic: "Toiture végétalisée", requirement: "Obligatoire pour nouveaux bâtiments commerciaux >2000m²", article: "Règlement 20-020", url: "https://montreal.ca/reglements-urbanisme", tags: ["toiture", "végétale", "commercial"] },
      { id: "MTL5", topic: "Stationnement vélo", requirement: "1 support vélo par 300m² de surface commerciale", article: "Règlement d'urbanisme, chapitre 6", url: "https://montreal.ca/reglements-urbanisme", tags: ["vélo", "stationnement"] },
      { id: "MTL6", topic: "Clôture et haie", requirement: "Maximum 1m en cour avant, 2m en cour arrière", article: "Règlement d'urbanisme, chapitre 7", url: "https://montreal.ca/reglements-urbanisme", tags: ["clôture", "haie", "hauteur"] }
    ]
  },
  "quebec": {
    name: "Québec",
    url: "https://www.ville.quebec.qc.ca/citoyens/reglementation/",
    codes: [
      { id: "QC1", topic: "Marge avant minimale", requirement: "7.5 mètres en zone résidentielle unifamiliale", article: "Règlement R.V.Q. 1900, art. 145", url: "https://www.ville.quebec.qc.ca/citoyens/reglementation/", tags: ["marge", "recul", "avant"] },
      { id: "QC2", topic: "Protection du patrimoine", requirement: "Approbation requise pour modifications en secteur patrimonial", article: "Règlement R.V.Q. 2133", url: "https://www.ville.quebec.qc.ca/citoyens/reglementation/", tags: ["patrimoine", "historique"] },
      { id: "QC3", topic: "Implantation piscine", requirement: "Minimum 1.5m de la ligne de lot, clôture 1.2m obligatoire", article: "Règlement R.V.Q. 1900, art. 298", url: "https://www.ville.quebec.qc.ca/citoyens/reglementation/", tags: ["piscine", "clôture"] },
      { id: "QC4", topic: "Revêtement extérieur", requirement: "Minimum 30% de maçonnerie en façade principale en zone R2", article: "Règlement R.V.Q. 1900, art. 220", url: "https://www.ville.quebec.qc.ca/citoyens/reglementation/", tags: ["revêtement", "façade", "maçonnerie"] },
      { id: "QC5", topic: "Stationnement résidentiel", requirement: "1 case minimum par logement, maximum 2 en cour avant", article: "Règlement R.V.Q. 1900, art. 350", url: "https://www.ville.quebec.qc.ca/citoyens/reglementation/", tags: ["stationnement", "parking"] }
    ]
  },
  "laval": {
    name: "Laval",
    url: "https://www.laval.ca/Pages/Fr/Citoyens/reglements.aspx",
    codes: [
      { id: "LAV1", topic: "Marge avant minimale", requirement: "6 mètres minimum pour résidentiel unifamilial", article: "Règlement L-2000, art. 125", url: "https://www.laval.ca/Pages/Fr/Citoyens/reglements.aspx", tags: ["marge", "recul", "avant"] },
      { id: "LAV2", topic: "Superficie minimale terrain", requirement: "550m² minimum pour construction unifamiliale isolée", article: "Règlement L-2000, art. 110", url: "https://www.laval.ca/Pages/Fr/Citoyens/reglements.aspx", tags: ["terrain", "superficie", "lot"] },
      { id: "LAV3", topic: "Cabanon/remise", requirement: "Maximum 15m², hauteur 3m, marge latérale 1m", article: "Règlement L-2000, art. 180", url: "https://www.laval.ca/Pages/Fr/Citoyens/reglements.aspx", tags: ["cabanon", "remise", "accessoire"] },
      { id: "LAV4", topic: "Entrée de garage", requirement: "Largeur maximum 6m, recul 0.6m de la ligne de rue", article: "Règlement L-2000, art. 155", url: "https://www.laval.ca/Pages/Fr/Citoyens/reglements.aspx", tags: ["garage", "entrée", "pavage"] }
    ]
  },
  "gatineau": {
    name: "Gatineau",
    url: "https://www.gatineau.ca/portail/default.aspx?p=guichet_municipal/reglements_municipaux",
    codes: [
      { id: "GAT1", topic: "Marge avant minimale", requirement: "7 mètres en zone résidentielle de faible densité", article: "Règlement 502-2005, art. 215", url: "https://www.gatineau.ca/portail/default.aspx?p=guichet_municipal/reglements_municipaux", tags: ["marge", "recul", "avant"] },
      { id: "GAT2", topic: "Bâtiment accessoire", requirement: "Maximum 60m² ou 10% du terrain, le moindre des deux", article: "Règlement 502-2005, art. 245", url: "https://www.gatineau.ca/portail/default.aspx?p=guichet_municipal/reglements_municipaux", tags: ["accessoire", "cabanon", "garage"] },
      { id: "GAT3", topic: "Protection boisé", requirement: "Conservation obligatoire de 30% du couvert forestier sur lot boisé", article: "Règlement 502-2005, art. 310", url: "https://www.gatineau.ca/portail/default.aspx?p=guichet_municipal/reglements_municipaux", tags: ["boisé", "arbre", "conservation"] }
    ]
  },
  "longueuil": {
    name: "Longueuil",
    url: "https://www.longueuil.quebec/fr/reglements",
    codes: [
      { id: "LNG1", topic: "Marge avant minimale", requirement: "6 mètres pour unifamilial, 4.5 mètres pour jumelé", article: "Règlement CO-2008-417, art. 89", url: "https://www.longueuil.quebec/fr/reglements", tags: ["marge", "recul", "avant"] },
      { id: "LNG2", topic: "Hauteur maximale", requirement: "9 mètres / 2 étages en zone résidentielle de faible densité", article: "Règlement CO-2008-417, art. 95", url: "https://www.longueuil.quebec/fr/reglements", tags: ["hauteur", "étage"] },
      { id: "LNG3", topic: "Stationnement", requirement: "Minimum 1.5 case par logement", article: "Règlement CO-2008-417, art. 150", url: "https://www.longueuil.quebec/fr/reglements", tags: ["stationnement", "parking"] }
    ]
  },
  "trois-rivieres": {
    name: "Trois-Rivières",
    url: "https://www.v3r.net/services-aux-citoyens/reglements-municipaux",
    codes: [
      { id: "TR1", topic: "Marge avant minimale", requirement: "6 mètres en zone résidentielle", article: "Règlement 2005-Z-1, art. 178", url: "https://www.v3r.net/services-aux-citoyens/reglements-municipaux", tags: ["marge", "recul", "avant"] },
      { id: "TR2", topic: "Clôture", requirement: "Maximum 1.2m en cour avant, 2m en cour arrière", article: "Règlement 2005-Z-1, art. 210", url: "https://www.v3r.net/services-aux-citoyens/reglements-municipaux", tags: ["clôture", "hauteur"] },
      { id: "TR3", topic: "Remise/cabanon", requirement: "Maximum 20m², 4m de hauteur, 1m des limites de lot", article: "Règlement 2005-Z-1, art. 185", url: "https://www.v3r.net/services-aux-citoyens/reglements-municipaux", tags: ["remise", "cabanon", "accessoire"] }
    ]
  },
  "levis": {
    name: "Lévis",
    url: "https://www.ville.levis.qc.ca/services/reglements-municipaux/",
    codes: [
      { id: "LEV1", topic: "Marge avant minimale", requirement: "7 mètres pour construction principale", article: "Règlement RV-2018-17-31, art. 267", url: "https://www.ville.levis.qc.ca/services/reglements-municipaux/", tags: ["marge", "recul", "avant"] },
      { id: "LEV2", topic: "Implantation garage", requirement: "En retrait minimum de 1m par rapport à la façade principale", article: "Règlement RV-2018-17-31, art. 280", url: "https://www.ville.levis.qc.ca/services/reglements-municipaux/", tags: ["garage", "implantation"] },
      { id: "LEV3", topic: "Aménagement paysager", requirement: "Minimum 40% de la cour avant doit être végétalisée", article: "Règlement RV-2018-17-31, art. 310", url: "https://www.ville.levis.qc.ca/services/reglements-municipaux/", tags: ["paysager", "végétal", "avant"] }
    ]
  },
  "saguenay": {
    name: "Saguenay",
    url: "https://ville.saguenay.ca/services-aux-citoyens/reglementation",
    codes: [
      { id: "SAG1", topic: "Marge avant minimale", requirement: "6.5 mètres en zone résidentielle", article: "Règlement VS-R-2012-35, art. 156", url: "https://ville.saguenay.ca/services-aux-citoyens/reglementation", tags: ["marge", "recul", "avant"] },
      { id: "SAG2", topic: "Hauteur des bâtiments", requirement: "11 mètres maximum en zone résidentielle unifamiliale", article: "Règlement VS-R-2012-35, art. 162", url: "https://ville.saguenay.ca/services-aux-citoyens/reglementation", tags: ["hauteur", "étage"] }
    ]
  },
  "terrebonne": {
    name: "Terrebonne",
    url: "https://www.ville.terrebonne.qc.ca/services/reglements",
    codes: [
      { id: "TER1", topic: "Marge avant minimale", requirement: "6 mètres minimum", article: "Règlement 269-1, art. 234", url: "https://www.ville.terrebonne.qc.ca/services/reglements", tags: ["marge", "recul", "avant"] },
      { id: "TER2", topic: "Piscine", requirement: "Clôture 1.2m obligatoire, distance 1.5m des limites de propriété", article: "Règlement 269-1, art. 290", url: "https://www.ville.terrebonne.qc.ca/services/reglements", tags: ["piscine", "clôture"] }
    ]
  }
};

// Questions de clarification par sujet
const clarificationQuestions: Record<string, {
  trigger: string[];
  questions: string[];
}> = {
  "garde-corps": {
    trigger: ["garde-corps", "garde corps", "balustrade", "rampe", "balustre", "rambarde"],
    questions: [
      "Est-ce pour un escalier intérieur ou un balcon/terrasse?",
      "Quelle est la hauteur de chute (différence de niveau)?",
      "Y a-t-il des enfants dans le logement?"
    ]
  },
  "escalier": {
    trigger: ["escalier", "marche", "contremarche", "giron"],
    questions: [
      "Est-ce un escalier intérieur ou extérieur?",
      "Est-ce un escalier principal ou de service?",
      "Quelle est la largeur prévue de l'escalier?"
    ]
  },
  "isolation": {
    trigger: ["isolation", "isoler", "isolant", "thermique", "r-value", "rsi"],
    questions: [
      "S'agit-il des murs, du toit ou des fondations?",
      "Est-ce une construction neuve ou une rénovation?",
      "Dans quelle zone climatique êtes-vous?"
    ]
  },
  "ventilation": {
    trigger: ["ventilation", "ventiler", "aération", "vrc", "échangeur"],
    questions: [
      "Est-ce pour une salle de bain, cuisine ou le système principal?",
      "Avez-vous des fenêtres ouvrables dans cette pièce?",
      "Est-ce une construction neuve?"
    ]
  },
  "électricité": {
    trigger: ["électrique", "électricité", "prise", "circuit", "ddft", "gfci"],
    questions: [
      "Pour quelle pièce (cuisine, salle de bain, chambre)?",
      "Est-ce près d'un point d'eau?",
      "Combien d'appareils prévoyez-vous brancher?"
    ]
  },
  "municipal": {
    trigger: ["marge", "recul", "hauteur bâtiment", "zonage", "permis", "clôture", "stationnement"],
    questions: [
      "Quel type de zone (résidentielle, commerciale)?",
      "S'agit-il d'une nouvelle construction ou rénovation?",
      "Avez-vous consulté le règlement de zonage de votre municipalité?"
    ]
  }
};

// Types BuildingCodeEntry / ImportanceLevel importés depuis src/data/buildingCodeKnowledge.ts


interface MunicipalCode {
  id: string;
  topic: string;
  requirement: string;
  article: string;
  url?: string;
  tags: string[];
}

interface SearchSummary {
  totalResults: number;
  categories: string[];
  mainTopic: string;
  keyPoints: string[];
  hasMunicipalData: boolean;
  municipalityNotice?: string;
}

// AI response structure from edge function
interface AIResult {
  principle: string;
  keyPoints: string[];
  commonMistakes: string[];
  whenToConsult: string;
  practicalTips: string;
}

interface AIResponse {
  type: "answer" | "clarification";
  message: string;
  result?: AIResult;
  officialReferences?: {
    primary: string;
    informational: string;
  };
  disclaimer?: string;
  officialLinks?: Array<{ label: string; url: string }>;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "clarification";
  content: string;
  results?: BuildingCodeEntry[];
  municipalResults?: MunicipalCode[];
  municipalityName?: string;
  summary?: SearchSummary;
  clarificationOptions?: string[];
  municipalNotice?: string;
  aiResponse?: AIResponse;
}

interface UserProject {
  id: string;
  name: string;
  municipality: string | null;
}

const BuildingCode = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [category, setCategory] = useState("all");
  const [userMunicipality, setUserMunicipality] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<UserProject | null>(null);
  const [askingLocation, setAskingLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger les projets de l'utilisateur
  useEffect(() => {
    const loadUserProjects = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description")
        .eq("user_id", user.id);

      if (data && !error) {
        const projects = data.map(p => {
          // Extraire la municipalité de la description
          const match = p.description?.match(/Municipalité:\s*([^|]+)/);
          return {
            id: p.id,
            name: p.name,
            municipality: match ? match[1].trim() : null
          };
        });
        setUserProjects(projects);
        
        // Sélectionner automatiquement le premier projet avec une municipalité
        const projectWithMunicipality = projects.find(p => p.municipality);
        if (projectWithMunicipality) {
          setSelectedProject(projectWithMunicipality);
          setUserMunicipality(projectWithMunicipality.municipality);
        }
      }
    };

    loadUserProjects();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const categories = [
    { id: 'all', name: t('buildingCode.categories.all', 'All') },
    { id: 'structure', name: t('buildingCode.categories.structure') },
    { id: 'securite', name: t('buildingCode.categories.safety') },
    { id: 'escaliers', name: t('buildingCode.categories.stairs') },
    { id: 'isolation', name: t('buildingCode.categories.insulation') },
    { id: 'plomberie', name: t('buildingCode.categories.plumbing') },
    { id: 'electricite', name: t('buildingCode.categories.electrical') },
    { id: 'ventilation', name: t('buildingCode.categories.ventilation') },
    { id: 'fenestration', name: t('buildingCode.categories.windows', 'Windows') },
    { id: 'municipal', name: t('buildingCode.categories.municipal', 'Municipal code') }
  ];

  const findClarificationQuestions = (query: string): string[] | null => {
    const lowerQuery = query.toLowerCase();
    for (const [, data] of Object.entries(clarificationQuestions)) {
      if (data.trigger.some(t => lowerQuery.includes(t))) {
        return data.questions;
      }
    }
    return null;
  };

  const searchBuildingCode = (query: string): BuildingCodeEntry[] => {
    const allEntries: BuildingCodeEntry[] = category === 'all' || category === 'municipal'
      ? Object.values(buildingCodeDB).flat()
      : (buildingCodeDB[category as keyof typeof buildingCodeDB] as BuildingCodeEntry[]) || [];

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const scored = allEntries.map(entry => {
      let score = 0;
      const searchText = `${entry.question} ${entry.reponse} ${entry.tags.join(' ')}`.toLowerCase();
      
      searchTerms.forEach(term => {
        if (searchText.includes(term)) {
          score += 1;
          if (entry.question.toLowerCase().includes(term)) score += 2;
          if (entry.tags.some(tag => tag.includes(term))) score += 2;
        }
      });

      return { entry, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.entry);
  };

  const searchMunicipalCodes = (query: string, municipality: string): { codes: MunicipalCode[], name: string } | null => {
    const normalizedMuni = municipality.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let matchedCity: string | null = null;
    for (const city of Object.keys(municipalCodesDB)) {
      if (normalizedMuni.includes(city)) {
        matchedCity = city;
        break;
      }
    }

    if (!matchedCity) return null;

    const cityData = municipalCodesDB[matchedCity];
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const scored = cityData.codes.map(code => {
      let score = 0;
      const searchText = `${code.topic} ${code.requirement} ${code.tags.join(' ')}`.toLowerCase();
      
      searchTerms.forEach(term => {
        if (searchText.includes(term)) {
          score += 1;
          if (code.topic.toLowerCase().includes(term)) score += 2;
          if (code.tags.some(tag => tag.includes(term))) score += 2;
        }
      });

      // Si aucun terme spécifique, retourner tout
      if (searchTerms.length === 0) score = 1;

      return { code, score };
    });

    return {
      codes: scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.code),
      name: cityData.name
    };
  };

  // Vérifier si la municipalité a des données dans notre base
  const hasMunicipalData = (municipality: string): boolean => {
    const normalizedMuni = municipality.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return Object.keys(municipalCodesDB).some(city => normalizedMuni.includes(city) || city.includes(normalizedMuni));
  };

  // Chercher dans toutes les municipalités
  const searchAllMunicipalities = (query: string): { codes: MunicipalCode[], municipalities: string[] } => {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const allResults: MunicipalCode[] = [];
    const foundMunicipalities: string[] = [];

    for (const [cityKey, cityData] of Object.entries(municipalCodesDB)) {
      const scored = cityData.codes.map(code => {
        let score = 0;
        const searchText = `${code.topic} ${code.requirement} ${code.tags.join(' ')}`.toLowerCase();
        
        searchTerms.forEach(term => {
          if (searchText.includes(term)) {
            score += 1;
            if (code.topic.toLowerCase().includes(term)) score += 2;
            if (code.tags.some(tag => tag.includes(term))) score += 2;
          }
        });

        if (searchTerms.length === 0) score = 1;
        return { code: { ...code, id: `${code.id}_${cityKey}` }, score, cityName: cityData.name };
      });

      const cityResults = scored.filter(s => s.score > 0);
      if (cityResults.length > 0) {
        foundMunicipalities.push(cityData.name);
        allResults.push(...cityResults.map(s => s.code));
      }
    }

    return { codes: allResults, municipalities: [...new Set(foundMunicipalities)] };
  };

  const generateSummary = (
    results: BuildingCodeEntry[], 
    municipalResults?: MunicipalCode[],
    hasMunicipal?: boolean,
    municipalityNotice?: string
  ): SearchSummary => {
    const categories = [...new Set(results.map(r => {
      for (const [cat, entries] of Object.entries(buildingCodeDB)) {
        if ((entries as BuildingCodeEntry[]).some(e => e.id === r.id)) {
          return cat;
        }
      }
      return 'autre';
    }))];

    const keyPoints = results.slice(0, 3).map(r => {
      const shortAnswer = r.reponse.split('.')[0] + '.';
      return shortAnswer;
    });

    if (municipalResults && municipalResults.length > 0) {
      keyPoints.push(`${municipalResults.length} exigence(s) municipale(s) applicable(s)`);
    }

    return {
      totalResults: results.length + (municipalResults?.length || 0),
      categories,
      mainTopic: results[0]?.question || "Recherche générale",
      keyPoints,
      hasMunicipalData: hasMunicipal ?? false,
      municipalityNotice
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isSearching) return;

    // Si on demande la localisation
    if (askingLocation) {
      const municipality = input.trim();
      setUserMunicipality(municipality);
      setAskingLocation(false);
      
      const locationMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: municipality,
      };
      setMessages(prev => [...prev, locationMessage]);

      const hasData = hasMunicipalData(municipality);
      const confirmContent = hasData 
        ? t("buildingCode.municipalitySet", { municipality, extra: t("buildingCode.hasData") })
        : t("buildingCode.municipalitySet", { municipality, extra: t("buildingCode.noMunicipalData") });

      const confirmMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `✅ **${municipality}** - ${confirmContent || municipality}`,
      };
      setMessages(prev => [...prev, confirmMessage]);
      setInput("");
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input.trim();
    setInput("");
    setIsSearching(true);

    // Build conversation history for AI context
    const conversationHistory = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.content }));

    try {
      // Get user session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: t("buildingCode.results.authRequired", "Vous devez être connecté pour utiliser cette fonctionnalité."),
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsSearching(false);
        return;
      }

      // Call the AI edge function with user's access token
      const { data, error } = await supabase.functions.invoke('search-building-code', {
        body: {
          query,
          conversationHistory,
          lang: i18n.language === 'en' ? 'en' : 'fr',
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: t("buildingCode.results.errorOccurred", "Une erreur s'est produite. Veuillez réessayer."),
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsSearching(false);
        return;
      }

      const aiResponse = data as AIResponse;
      window.dispatchEvent(new CustomEvent("subscription-refetch"));

      if (aiResponse.type === "clarification") {
        // AI needs more information
        const clarificationMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiResponse.message,
        };
        setMessages(prev => [...prev, clarificationMessage]);
      } else {
        // AI has an answer
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiResponse.message,
          aiResponse,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: t("buildingCode.results.errorOccurred", "Une erreur s'est produite. Veuillez réessayer."),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClarificationClick = (question: string) => {
    setInput(question);
  };

  const handleNewSearch = () => {
    setMessages([]);
    setInput("");
    setAskingLocation(false);
  };

  const handleProjectSelect = (project: UserProject) => {
    setSelectedProject(project);
    if (project.municipality) {
      setUserMunicipality(project.municipality);
    }
  };

  const getImportanceColor = (importance: ImportanceLevel) => {
    switch(importance) {
      case 'critique': return 'text-red-600 bg-red-50 border-red-200';
      case 'haute': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const exampleSearches = (t("buildingCode.examples", {
    returnObjects: true,
    defaultValue: [
      "Hauteur garde-corps",
      "Dimensions escalier",
      "Isolation murs",
      "Marge avant minimale",
      "Prises électriques",
      "Sorties de secours",
    ],
  }) as string[]).filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("buildingCode.title")}</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("buildingCode.subtitle")}
            </p>
          </div>

          {/* Disclaimer - Full Legal Notice */}
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-3">
                  <p>
                    <strong className="text-foreground">{t("buildingCode.disclaimer.title", "Avis important")}</strong>
                  </p>
                  <p>{t("buildingCode.disclaimer.intro")}</p>
                  <p>{t("buildingCode.disclaimer.notOfficial")}</p>
                  <p>{t("buildingCode.disclaimer.noAdvice")}</p>
                  <p>{t("buildingCode.disclaimer.recommendation")}</p>
                  <p className="font-medium">{t("buildingCode.disclaimer.liability")}</p>
                  <a
                    href={i18n.language === 'en' ? "https://www.rbq.gouv.qc.ca/en/laws-regulations-and-codes/construction-code-and-safety-code/construction-code/" : "https://www.rbq.gouv.qc.ca/lois-reglements-et-codes/code-de-construction-et-code-de-securite/code-de-construction/"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 underline underline-offset-4 text-primary"
                  >
                    {t("buildingCode.officialLinkLabel", "Consulter le texte officiel du Code du bâtiment")}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project/Location Selection */}
          {userProjects.length > 0 && (
            <Card className="mb-4">
              <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("buildingCode.selectedProject", "Selected project")}:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userProjects.map(project => (
                    <Button
                      key={project.id}
                      variant={selectedProject?.id === project.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleProjectSelect(project)}
                      className="gap-2"
                    >
                      {project.name}
                      {project.municipality && (
                        <span className="text-xs opacity-75">({project.municipality})</span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Municipality indicator */}
          {userMunicipality && (
            <Card className="mb-4 border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm">
                  <strong>{t("buildingCode.activeMunicipalCodes", "Active municipal codes")}:</strong> {userMunicipality}
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="ml-2 h-auto p-0"
                    onClick={() => {
                      setUserMunicipality(null);
                      setSelectedProject(null);
                    }}
                  >
                    {t("buildingCode.change", "Change")}
                  </Button>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Category Filter */}
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={category === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t("buildingCode.smartSearch", "Smart search")}
                </CardTitle>
                {messages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleNewSearch}>
                    {t("buildingCode.newSearch", "New search")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t("buildingCode.askQuestion")}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {t("buildingCode.guideYou")}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {exampleSearches.map((example) => (
                      <Button
                        key={example}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(example)}
                        className="text-xs"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-3">
                        {/* User or Assistant message */}
                        {message.role !== "clarification" && (
                          <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                            {message.role === "assistant" && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                            {message.role === "user" && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Clarification questions */}
                        {message.role === "clarification" && (
                          <div className="ml-11">
                            <Card className="border-primary/30 bg-primary/5">
                              <CardContent className="py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <HelpCircle className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">{message.content}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {message.clarificationOptions?.map((option, i) => (
                                    <Button
                                      key={i}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleClarificationClick(option)}
                                      className="text-xs"
                                    >
                                      {option}
                                    </Button>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Building Code results */}
                        {message.results && message.results.length > 0 && (
                          <div className="ml-11 space-y-4">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              📖 {t("buildingCode.results.buildingCodeSummary")}:
                            </div>
                            {message.results.map((result) => (
                              <Card key={result.id} className="border-l-4 border-l-primary">
                                <CardHeader className="py-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="flex items-start gap-2 text-sm">
                                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                      {result.question}
                                    </CardTitle>
                                    <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getImportanceColor(result.importance)}`}>
                                      {result.importance}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent className="py-0 pb-4 space-y-4">
                                  {/* Résumé éducatif */}
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {result.reponse}
                                  </p>
                                  
                                  {/* À vérifier techniquement */}
                                  {result.technicalChecks && result.technicalChecks.length > 0 && (
                                    <div className="bg-muted/50 rounded-lg p-3">
                                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                                        ✅ {t("buildingCode.results.technicalChecks")}
                                      </h4>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {result.technicalChecks.map((check, i) => (
                                          <li key={i} className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>{check}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {/* Erreurs fréquentes */}
                                  {result.commonMistakes && result.commonMistakes.length > 0 && (
                                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                                      <h4 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
                                        ⚠️ {t("buildingCode.results.commonMistakes")}
                                      </h4>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {result.commonMistakes.map((mistake, i) => (
                                          <li key={i} className="flex items-start gap-2">
                                            <span className="text-destructive mt-0.5">•</span>
                                            <span>{mistake}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {/* Quand consulter un pro */}
                                  {result.consultPro && result.consultPro.length > 0 && (
                                    <div className="bg-accent/50 rounded-lg p-3">
                                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                                        👷 {t("buildingCode.results.consultProfessional")}
                                      </h4>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {result.consultPro.map((condition, i) => (
                                          <li key={i} className="flex items-start gap-2">
                                            <span className="text-accent-foreground mt-0.5">→</span>
                                            <span>{condition}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {/* Recherches suggérées */}
                                  {result.searchSuggestions && result.searchSuggestions.length > 0 && (
                                    <div className="pt-2 border-t">
                                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                        🔗 {t("buildingCode.results.suggestedLinks")}
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {result.searchSuggestions.map((suggestion, i) => (
                                          <a
                                            key={i}
                                            href={`https://www.google.com/search?q=${encodeURIComponent(suggestion.replace('Recherche officielle : ', ''))}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                          >
                                            {suggestion.replace('Recherche officielle : ', '')}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Avertissement obligatoire */}
                                  <p className="text-[10px] text-muted-foreground/70 italic pt-2 border-t">
                                    ⚖️ {t("buildingCode.results.disclaimer")}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* Municipal Notice */}
                        {message.municipalNotice && (
                          <div className="ml-11">
                            <Card className="border-amber-500/50 bg-amber-500/10">
                              <CardContent className="py-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-foreground">{message.municipalNotice}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Municipal Code results */}
                        {message.municipalResults && message.municipalResults.length > 0 && (
                          <div className="ml-11 space-y-3">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              🏛️ {t("buildingCode.results.municipalCodes")} - {message.municipalityName}:
                            </div>
                            {message.municipalResults.map((result) => (
                              <Card key={result.id} className="border-l-4 border-l-orange-500">
                                <CardHeader className="py-3">
                                  <CardTitle className="flex items-start gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                    {result.topic}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="py-0 pb-4">
                                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                    {result.requirement}
                                  </p>
                                  <div className="flex items-center gap-2 pt-2 border-t">
                                    <FileText className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium text-orange-600">
                                      {result.article}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* AI Response Results */}
                        {message.aiResponse?.result && (
                          <div className="ml-11 space-y-4">
                            <Card className="border-l-4 border-l-primary">
                              <CardContent className="py-4 space-y-4">
                                {/* Principle */}
                                <div>
                                  <h4 className="text-sm font-semibold text-foreground mb-2">
                                    📖 {t("buildingCode.results.principle", "Principle")}
                                  </h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {message.aiResponse.result.principle}
                                  </p>
                                </div>

                                {/* Key Points */}
                                {message.aiResponse.result.keyPoints && message.aiResponse.result.keyPoints.length > 0 && (
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                                      ✅ {t("buildingCode.results.technicalChecks")}
                                    </h4>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                      {message.aiResponse.result.keyPoints.map((point, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-primary mt-0.5">•</span>
                                          <span>{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Common Mistakes */}
                                {message.aiResponse.result.commonMistakes && message.aiResponse.result.commonMistakes.length > 0 && (
                                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
                                      ⚠️ {t("buildingCode.results.commonMistakes")}
                                    </h4>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                      {message.aiResponse.result.commonMistakes.map((mistake, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-destructive mt-0.5">•</span>
                                          <span>{mistake}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* When to Consult */}
                                {message.aiResponse.result.whenToConsult && (
                                  <div className="bg-accent/50 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                                      👷 {t("buildingCode.results.consultProfessional")}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {message.aiResponse.result.whenToConsult}
                                    </p>
                                  </div>
                                )}

                                {/* Practical Tips */}
                                {message.aiResponse.result.practicalTips && (
                                  <div className="bg-primary/5 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                                      💡 {t("buildingCode.results.practicalTips", "Practical tips")}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {message.aiResponse.result.practicalTips}
                                    </p>
                                  </div>
                                )}

                                {/* Official Links */}
                                {message.aiResponse.officialLinks && message.aiResponse.officialLinks.length > 0 && (
                                  <div className="pt-2 border-t">
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                      🔗 {t("buildingCode.results.suggestedLinks")}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {message.aiResponse.officialLinks.map((link, i) => (
                                        <a
                                          key={i}
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                        >
                                          {link.label}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Disclaimer */}
                                {message.aiResponse.disclaimer && (
                                  <p className="text-[10px] text-muted-foreground/70 italic pt-2 border-t">
                                    ⚖️ {message.aiResponse.disclaimer}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    ))}

                    {isSearching && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Input */}
              <div className="flex gap-3 mt-4 pt-4 border-t">
                <Input
                  placeholder={askingLocation ? t("buildingCode.enterMunicipality") : t("buildingCode.searchPlaceholder")}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={isSearching}
                />
                <Button onClick={handleSend} disabled={isSearching || !input.trim()}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BuildingCode;
