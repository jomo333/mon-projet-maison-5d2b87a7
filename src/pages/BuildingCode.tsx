import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Loader2, AlertCircle, FileText, Lightbulb, MessageSquare, Send, User, Bot, CheckCircle, MapPin, Building2, HelpCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Base de données locale du Code du Bâtiment
const buildingCodeDB = {
  structure: [
    {
      id: 'S1',
      question: 'Quelle est la hauteur maximale pour un bâtiment résidentiel?',
      reponse: 'La hauteur maximale dépend du zonage, généralement 12-15 mètres pour R1-R2, jusqu\'à 25 mètres pour R3-R4.',
      code: 'Article 3.2.1',
      importance: 'haute' as const,
      tags: ['hauteur', 'résidentiel', 'zonage', 'bâtiment']
    },
    {
      id: 'S2',
      question: 'Quelle distance minimale entre deux bâtiments?',
      reponse: 'Minimum 3 mètres entre bâtiments, 6 mètres si présence de fenêtres face à face.',
      code: 'Article 3.4.2',
      importance: 'haute' as const,
      tags: ['distance', 'espacement', 'bâtiment', 'fenêtre']
    },
    {
      id: 'S3',
      question: 'Quelle est l\'épaisseur minimale des dalles de béton?',
      reponse: '100mm minimum pour dalles résidentielles, 150mm pour commerciales.',
      code: 'Article 3.6.8',
      importance: 'haute' as const,
      tags: ['béton', 'dalle', 'épaisseur', 'fondation']
    },
    {
      id: 'S4',
      question: 'Quelle est la charge admissible pour un plancher résidentiel?',
      reponse: 'La charge vive minimale pour un plancher résidentiel est de 1.9 kPa (40 lb/pi²). Pour les balcons, elle est de 2.4 kPa.',
      code: 'Article 4.1.5.3',
      importance: 'haute' as const,
      tags: ['plancher', 'charge', 'résidentiel', 'structure']
    }
  ],
  securite: [
    {
      id: 'SEC1',
      question: 'Combien de sorties de secours sont requises?',
      reponse: 'Minimum 2 sorties pour bâtiments >300m². Pour <300m², 1 sortie peut suffire selon l\'occupation. La distance maximale de parcours jusqu\'à une sortie est de 45m pour les bâtiments non protégés par gicleurs.',
      code: 'Article 3.4.2.1',
      importance: 'critique' as const,
      tags: ['sortie', 'évacuation', 'sécurité', 'secours']
    },
    {
      id: 'SEC2',
      question: 'Largeur minimale des escaliers de secours?',
      reponse: '1100mm minimum pour usage résidentiel, 1400mm pour usage commercial. La largeur doit permettre l\'évacuation selon le nombre d\'occupants.',
      code: 'Article 3.4.3.2',
      importance: 'critique' as const,
      tags: ['escalier', 'largeur', 'secours', 'évacuation']
    },
    {
      id: 'SEC3',
      question: 'Hauteur minimale des garde-corps?',
      reponse: '1070mm (42 pouces) minimum pour balcons, terrasses et toits. 900mm (36 pouces) pour escaliers intérieurs. Les ouvertures ne doivent pas permettre le passage d\'une sphère de 100mm de diamètre.',
      code: 'Article 9.8.8.1',
      importance: 'critique' as const,
      tags: ['garde-corps', 'balcon', 'hauteur', 'sécurité', 'rampe', 'balustre']
    },
    {
      id: 'SEC4',
      question: 'Quelles sont les exigences pour les détecteurs de fumée?',
      reponse: 'Un détecteur de fumée doit être installé à chaque étage, y compris le sous-sol. Ils doivent être interconnectés si plus d\'un est requis. Dans les corridors de plus de 10m, un détecteur est requis tous les 10m.',
      code: 'Article 9.10.19',
      importance: 'critique' as const,
      tags: ['détecteur', 'fumée', 'alarme', 'incendie', 'sécurité']
    },
    {
      id: 'SEC5',
      question: 'Résistance au feu des séparations coupe-feu?',
      reponse: 'Les séparations coupe-feu entre logements doivent avoir une résistance au feu d\'au moins 1 heure. Entre un garage et un logement, la résistance requise est de 45 minutes minimum.',
      code: 'Article 9.10.9',
      importance: 'critique' as const,
      tags: ['feu', 'séparation', 'coupe-feu', 'résistance', 'incendie']
    }
  ],
  escaliers: [
    {
      id: 'ESC1',
      question: 'Quelles sont les dimensions des marches d\'escalier?',
      reponse: 'Giron (profondeur): minimum 235mm, maximum 355mm. Hauteur (contremarche): minimum 125mm, maximum 200mm. La formule 2H + G doit donner entre 600mm et 660mm.',
      code: 'Article 9.8.4.1',
      importance: 'haute' as const,
      tags: ['escalier', 'marche', 'giron', 'contremarche', 'dimension']
    },
    {
      id: 'ESC2',
      question: 'Quelle est la hauteur libre minimale dans un escalier?',
      reponse: 'La hauteur libre minimale est de 1950mm (6\'5") mesurée verticalement du nez de marche au plafond.',
      code: 'Article 9.8.2.1',
      importance: 'haute' as const,
      tags: ['escalier', 'hauteur', 'libre', 'dégagement']
    },
    {
      id: 'ESC3',
      question: 'Quand faut-il une main courante?',
      reponse: 'Une main courante est requise de chaque côté si l\'escalier a plus de 1100mm de largeur. Une main courante est toujours requise si l\'escalier a plus de 2 marches. Hauteur: entre 865mm et 965mm.',
      code: 'Article 9.8.7',
      importance: 'haute' as const,
      tags: ['main courante', 'escalier', 'rampe', 'hauteur']
    }
  ],
  isolation: [
    {
      id: 'ISO1',
      question: 'Quel coefficient R pour les murs extérieurs?',
      reponse: 'R minimum de 4.0 (RSI 0.70) pour murs extérieurs en zone climatique standard. Pour les zones froides (>6000 degrés-jours), R-20 à R-24 est recommandé.',
      code: 'Article 9.36.2.6',
      importance: 'moyenne' as const,
      tags: ['isolation', 'mur', 'thermique', 'coefficient', 'RSI']
    },
    {
      id: 'ISO2',
      question: 'Isolation requise pour les toitures?',
      reponse: 'R minimum de 6.0 (RSI 1.06) pour toitures et combles aménagés. Pour les plafonds sous combles non aménagés, R-50 à R-60 est recommandé pour une performance optimale.',
      code: 'Article 9.36.2.4',
      importance: 'moyenne' as const,
      tags: ['isolation', 'toiture', 'comble', 'plafond', 'thermique']
    },
    {
      id: 'ISO3',
      question: 'Isolation des fondations?',
      reponse: 'Les murs de fondation doivent être isolés à un minimum de R-12 (RSI 2.1) dans les zones froides. L\'isolation doit descendre jusqu\'à 600mm sous le niveau du sol ou jusqu\'à la semelle.',
      code: 'Article 9.36.2.8',
      importance: 'moyenne' as const,
      tags: ['fondation', 'isolation', 'sous-sol', 'thermique']
    },
    {
      id: 'ISO4',
      question: 'Exigences pour le pare-vapeur?',
      reponse: 'Un pare-vapeur avec une perméance maximale de 60 ng/(Pa·s·m²) doit être installé du côté chaud de l\'isolant. Il doit être continu et scellé aux joints.',
      code: 'Article 9.25.4',
      importance: 'moyenne' as const,
      tags: ['pare-vapeur', 'humidité', 'isolation', 'membrane']
    }
  ],
  plomberie: [
    {
      id: 'PLB1',
      question: 'Pression d\'eau minimale requise?',
      reponse: '200 kPa (30 PSI) minimum aux points d\'utilisation, 550 kPa (80 PSI) maximum. Un réducteur de pression est requis si la pression dépasse 550 kPa.',
      code: 'Article 2.6.1.6',
      importance: 'moyenne' as const,
      tags: ['pression', 'eau', 'plomberie']
    },
    {
      id: 'PLB2',
      question: 'Diamètre minimum des tuyaux d\'évacuation?',
      reponse: '50mm (2 pouces) pour lavabos et douches, 75mm (3 pouces) pour baignoires, 100mm (4 pouces) pour toilettes et colonnes de chute.',
      code: 'Article 2.4.10',
      importance: 'moyenne' as const,
      tags: ['tuyau', 'évacuation', 'diamètre', 'plomberie', 'drain']
    },
    {
      id: 'PLB3',
      question: 'Pente minimale des drains?',
      reponse: 'La pente minimale est de 1% (1:100) pour les drains de 75mm et plus, et 2% (1:50) pour les drains de moins de 75mm.',
      code: 'Article 2.4.6',
      importance: 'moyenne' as const,
      tags: ['pente', 'drain', 'évacuation', 'plomberie']
    },
    {
      id: 'PLB4',
      question: 'Ventilation des appareils sanitaires?',
      reponse: 'Chaque appareil sanitaire doit être ventilé. Le diamètre du tuyau de ventilation doit être au moins la moitié du diamètre du drain, minimum 32mm.',
      code: 'Article 2.5.4',
      importance: 'moyenne' as const,
      tags: ['ventilation', 'sanitaire', 'évent', 'plomberie']
    }
  ],
  electricite: [
    {
      id: 'ELEC1',
      question: 'Nombre de prises requises par pièce?',
      reponse: 'Minimum 1 prise par 4 mètres de mur dans les pièces habitables. Chaque mur de plus de 900mm doit avoir une prise. Aucun point le long du mur ne doit être à plus de 1.8m d\'une prise.',
      code: 'Article 26-712',
      importance: 'moyenne' as const,
      tags: ['prise', 'électricité', 'réceptacle']
    },
    {
      id: 'ELEC2',
      question: 'Hauteur standard des prises électriques?',
      reponse: '300-450mm du sol pour prises standard. 1100mm pour comptoirs de cuisine. Les prises de cuisine doivent être à moins de 1.8m de tout point du comptoir.',
      code: 'Article 26-712(d)',
      importance: 'moyenne' as const,
      tags: ['prise', 'hauteur', 'électricité']
    },
    {
      id: 'ELEC3',
      question: 'Circuits requis pour une cuisine?',
      reponse: 'Minimum 2 circuits de 20A pour les prises de comptoir, plus des circuits dédiés pour: cuisinière, réfrigérateur, lave-vaisselle, broyeur.',
      code: 'Article 26-724',
      importance: 'moyenne' as const,
      tags: ['cuisine', 'circuit', 'électricité', 'ampérage']
    },
    {
      id: 'ELEC4',
      question: 'Prises DDFT (GFCI) requises où?',
      reponse: 'Les prises DDFT sont requises dans: salles de bain, cuisines (à moins de 1.5m de l\'évier), buanderies, garages, extérieur, et à moins de 1.5m d\'un lavabo.',
      code: 'Article 26-700(11)',
      importance: 'haute' as const,
      tags: ['DDFT', 'GFCI', 'sécurité', 'électricité', 'salle de bain']
    }
  ],
  ventilation: [
    {
      id: 'VENT1',
      question: 'Ventilation requise pour salle de bain?',
      reponse: 'Une fenêtre ouvrable d\'au moins 0.35m² OU un ventilateur d\'extraction d\'au moins 50 L/s (25 cfm pour salle d\'eau, 50 cfm pour salle de bain complète).',
      code: 'Article 9.32.3.3',
      importance: 'moyenne' as const,
      tags: ['ventilation', 'salle de bain', 'extraction', 'fenêtre']
    },
    {
      id: 'VENT2',
      question: 'Ventilation de la cuisine?',
      reponse: 'Une hotte de cuisinière avec extraction d\'au moins 50 cfm est requise. Pour les cuisinières à gaz, minimum 100 cfm recommandé.',
      code: 'Article 9.32.3.5',
      importance: 'moyenne' as const,
      tags: ['ventilation', 'cuisine', 'hotte', 'extraction']
    },
    {
      id: 'VENT3',
      question: 'Échangeur d\'air requis?',
      reponse: 'Un système de ventilation mécanique principal (VRC ou VRE) est requis pour les maisons neuves. Le débit minimum est basé sur le nombre de chambres: 30 L/s pour 0-1 chambre, +7.5 L/s par chambre additionnelle.',
      code: 'Article 9.32.3.1',
      importance: 'moyenne' as const,
      tags: ['VRC', 'échangeur', 'ventilation', 'air']
    }
  ],
  fenestration: [
    {
      id: 'FEN1',
      question: 'Surface vitrée minimale par pièce?',
      reponse: 'La surface vitrée doit être au moins 5% de la surface de plancher de la pièce qu\'elle dessert. Pour les chambres, une fenêtre ouvrable est requise pour l\'évacuation d\'urgence.',
      code: 'Article 9.7.2.2',
      importance: 'moyenne' as const,
      tags: ['fenêtre', 'vitrage', 'éclairage', 'naturel']
    },
    {
      id: 'FEN2',
      question: 'Dimensions minimales des fenêtres d\'évacuation?',
      reponse: 'Ouverture minimale de 0.35m² avec aucune dimension inférieure à 380mm. Le seuil ne doit pas être à plus de 1000mm du plancher.',
      code: 'Article 9.9.10.1',
      importance: 'haute' as const,
      tags: ['fenêtre', 'évacuation', 'urgence', 'chambre']
    },
    {
      id: 'FEN3',
      question: 'Performance thermique des fenêtres?',
      reponse: 'Les fenêtres doivent avoir un coefficient U maximal de 2.0 W/(m²·K) pour les zones climatiques froides. Les fenêtres ENERGY STAR sont recommandées.',
      code: 'Article 9.36.2.3',
      importance: 'moyenne' as const,
      tags: ['fenêtre', 'thermique', 'coefficient', 'énergie']
    }
  ]
};

// Liste complète des municipalités du Québec (pour afficher la notice)
const allQuebecMunicipalities = [
  "Sherbrooke", "Montréal", "Québec", "Laval", "Gatineau", "Longueuil", "Trois-Rivières",
  "Lévis", "Saguenay", "Terrebonne", "Repentigny", "Brossard", "Saint-Jean-sur-Richelieu",
  "Drummondville", "Saint-Jérôme", "Granby", "Blainville", "Saint-Hyacinthe", "Shawinigan",
  "Rimouski", "Victoriaville", "Châteauguay", "Rouyn-Noranda", "Sept-Îles", "Alma",
  "Magog", "Joliette", "Thetford Mines", "Val-d'Or", "Sainte-Thérèse", "Baie-Comeau",
  "Saint-Georges", "Mascouche", "Mirabel", "Vaudreuil-Dorion", "Saint-Eustache"
];

// Base de données des codes municipaux avec données disponibles
const municipalCodesDB: Record<string, {
  name: string;
  codes: Array<{
    id: string;
    topic: string;
    requirement: string;
    article: string;
    tags: string[];
  }>;
}> = {
  "sherbrooke": {
    name: "Sherbrooke",
    codes: [
      { id: "SHE1", topic: "Marge avant minimale", requirement: "6 mètres minimum pour zone résidentielle R1-R2", article: "Règlement 1-2015, art. 234", tags: ["marge", "recul", "avant"] },
      { id: "SHE2", topic: "Marge latérale minimale", requirement: "1.5 mètres minimum, 3 mètres côté rue pour lots d'angle", article: "Règlement 1-2015, art. 235", tags: ["marge", "latérale", "recul"] },
      { id: "SHE3", topic: "Hauteur maximale résidentielle", requirement: "10 mètres / 2 étages en zone R1, 12 mètres / 3 étages en R2", article: "Règlement 1-2015, art. 240", tags: ["hauteur", "étage"] },
      { id: "SHE4", topic: "Stationnement résidentiel", requirement: "Minimum 1 case par logement + 1 case visiteur par 4 logements", article: "Règlement 1-2015, art. 310", tags: ["stationnement", "parking"] },
      { id: "SHE5", topic: "Clôture hauteur maximale", requirement: "2 mètres en cour arrière, 1 mètre en cour avant", article: "Règlement 1-2015, art. 280", tags: ["clôture", "hauteur"] },
      { id: "SHE6", topic: "Piscine clôture", requirement: "Clôture minimum 1.2m avec porte auto-verrouillante, distance 1m du lot", article: "Règlement 1-2015, art. 285", tags: ["piscine", "clôture", "sécurité"] }
    ]
  },
  "montreal": {
    name: "Montréal",
    codes: [
      { id: "MTL1", topic: "Marge avant minimale", requirement: "Varie selon arrondissement - généralement 3 à 6 mètres", article: "Règlement d'urbanisme, chapitre 5", tags: ["marge", "recul", "avant"] },
      { id: "MTL2", topic: "Coefficient d'occupation du sol", requirement: "COS maximum de 0.5 à 2.0 selon la zone", article: "Règlement d'urbanisme, chapitre 4", tags: ["cos", "densité"] },
      { id: "MTL3", topic: "Arbres protection", requirement: "Permis requis pour abattre un arbre de plus de 10cm de diamètre", article: "Règlement 18-008, art. 8", tags: ["arbre", "protection", "permis"] },
      { id: "MTL4", topic: "Toiture végétalisée", requirement: "Obligatoire pour nouveaux bâtiments commerciaux >2000m²", article: "Règlement 20-020", tags: ["toiture", "végétale", "commercial"] },
      { id: "MTL5", topic: "Stationnement vélo", requirement: "1 support vélo par 300m² de surface commerciale", article: "Règlement d'urbanisme, chapitre 6", tags: ["vélo", "stationnement"] },
      { id: "MTL6", topic: "Clôture et haie", requirement: "Maximum 1m en cour avant, 2m en cour arrière", article: "Règlement d'urbanisme, chapitre 7", tags: ["clôture", "haie", "hauteur"] }
    ]
  },
  "quebec": {
    name: "Québec",
    codes: [
      { id: "QC1", topic: "Marge avant minimale", requirement: "7.5 mètres en zone résidentielle unifamiliale", article: "Règlement R.V.Q. 1900, art. 145", tags: ["marge", "recul", "avant"] },
      { id: "QC2", topic: "Protection du patrimoine", requirement: "Approbation requise pour modifications en secteur patrimonial", article: "Règlement R.V.Q. 2133", tags: ["patrimoine", "historique"] },
      { id: "QC3", topic: "Implantation piscine", requirement: "Minimum 1.5m de la ligne de lot, clôture 1.2m obligatoire", article: "Règlement R.V.Q. 1900, art. 298", tags: ["piscine", "clôture"] },
      { id: "QC4", topic: "Revêtement extérieur", requirement: "Minimum 30% de maçonnerie en façade principale en zone R2", article: "Règlement R.V.Q. 1900, art. 220", tags: ["revêtement", "façade", "maçonnerie"] },
      { id: "QC5", topic: "Stationnement résidentiel", requirement: "1 case minimum par logement, maximum 2 en cour avant", article: "Règlement R.V.Q. 1900, art. 350", tags: ["stationnement", "parking"] }
    ]
  },
  "laval": {
    name: "Laval",
    codes: [
      { id: "LAV1", topic: "Marge avant minimale", requirement: "6 mètres minimum pour résidentiel unifamilial", article: "Règlement L-2000, art. 125", tags: ["marge", "recul", "avant"] },
      { id: "LAV2", topic: "Superficie minimale terrain", requirement: "550m² minimum pour construction unifamiliale isolée", article: "Règlement L-2000, art. 110", tags: ["terrain", "superficie", "lot"] },
      { id: "LAV3", topic: "Cabanon/remise", requirement: "Maximum 15m², hauteur 3m, marge latérale 1m", article: "Règlement L-2000, art. 180", tags: ["cabanon", "remise", "accessoire"] },
      { id: "LAV4", topic: "Entrée de garage", requirement: "Largeur maximum 6m, recul 0.6m de la ligne de rue", article: "Règlement L-2000, art. 155", tags: ["garage", "entrée", "pavage"] }
    ]
  },
  "gatineau": {
    name: "Gatineau",
    codes: [
      { id: "GAT1", topic: "Marge avant minimale", requirement: "7 mètres en zone résidentielle de faible densité", article: "Règlement 502-2005, art. 215", tags: ["marge", "recul", "avant"] },
      { id: "GAT2", topic: "Bâtiment accessoire", requirement: "Maximum 60m² ou 10% du terrain, le moindre des deux", article: "Règlement 502-2005, art. 245", tags: ["accessoire", "cabanon", "garage"] },
      { id: "GAT3", topic: "Protection boisé", requirement: "Conservation obligatoire de 30% du couvert forestier sur lot boisé", article: "Règlement 502-2005, art. 310", tags: ["boisé", "arbre", "conservation"] }
    ]
  },
  "longueuil": {
    name: "Longueuil",
    codes: [
      { id: "LNG1", topic: "Marge avant minimale", requirement: "6 mètres pour unifamilial, 4.5 mètres pour jumelé", article: "Règlement CO-2008-417, art. 89", tags: ["marge", "recul", "avant"] },
      { id: "LNG2", topic: "Hauteur maximale", requirement: "9 mètres / 2 étages en zone résidentielle de faible densité", article: "Règlement CO-2008-417, art. 95", tags: ["hauteur", "étage"] },
      { id: "LNG3", topic: "Stationnement", requirement: "Minimum 1.5 case par logement", article: "Règlement CO-2008-417, art. 150", tags: ["stationnement", "parking"] }
    ]
  },
  "trois-rivieres": {
    name: "Trois-Rivières",
    codes: [
      { id: "TR1", topic: "Marge avant minimale", requirement: "6 mètres en zone résidentielle", article: "Règlement 2005-Z-1, art. 178", tags: ["marge", "recul", "avant"] },
      { id: "TR2", topic: "Clôture", requirement: "Maximum 1.2m en cour avant, 2m en cour arrière", article: "Règlement 2005-Z-1, art. 210", tags: ["clôture", "hauteur"] },
      { id: "TR3", topic: "Remise/cabanon", requirement: "Maximum 20m², 4m de hauteur, 1m des limites de lot", article: "Règlement 2005-Z-1, art. 185", tags: ["remise", "cabanon", "accessoire"] }
    ]
  },
  "levis": {
    name: "Lévis",
    codes: [
      { id: "LEV1", topic: "Marge avant minimale", requirement: "7 mètres pour construction principale", article: "Règlement RV-2018-17-31, art. 267", tags: ["marge", "recul", "avant"] },
      { id: "LEV2", topic: "Implantation garage", requirement: "En retrait minimum de 1m par rapport à la façade principale", article: "Règlement RV-2018-17-31, art. 280", tags: ["garage", "implantation"] },
      { id: "LEV3", topic: "Aménagement paysager", requirement: "Minimum 40% de la cour avant doit être végétalisée", article: "Règlement RV-2018-17-31, art. 310", tags: ["paysager", "végétal", "avant"] }
    ]
  },
  "saguenay": {
    name: "Saguenay",
    codes: [
      { id: "SAG1", topic: "Marge avant minimale", requirement: "6.5 mètres en zone résidentielle", article: "Règlement VS-R-2012-35, art. 156", tags: ["marge", "recul", "avant"] },
      { id: "SAG2", topic: "Hauteur des bâtiments", requirement: "11 mètres maximum en zone résidentielle unifamiliale", article: "Règlement VS-R-2012-35, art. 162", tags: ["hauteur", "étage"] }
    ]
  },
  "terrebonne": {
    name: "Terrebonne",
    codes: [
      { id: "TER1", topic: "Marge avant minimale", requirement: "6 mètres minimum", article: "Règlement 269-1, art. 234", tags: ["marge", "recul", "avant"] },
      { id: "TER2", topic: "Piscine", requirement: "Clôture 1.2m obligatoire, distance 1.5m des limites de propriété", article: "Règlement 269-1, art. 290", tags: ["piscine", "clôture"] }
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

type ImportanceLevel = 'critique' | 'haute' | 'moyenne';

interface BuildingCodeEntry {
  id: string;
  question: string;
  reponse: string;
  code: string;
  importance: ImportanceLevel;
  tags: string[];
}

interface MunicipalCode {
  id: string;
  topic: string;
  requirement: string;
  article: string;
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
}

interface UserProject {
  id: string;
  name: string;
  municipality: string | null;
}

const BuildingCode = () => {
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
    { id: 'all', name: 'Tout' },
    { id: 'structure', name: 'Structure' },
    { id: 'securite', name: 'Sécurité' },
    { id: 'escaliers', name: 'Escaliers' },
    { id: 'isolation', name: 'Isolation' },
    { id: 'plomberie', name: 'Plomberie' },
    { id: 'electricite', name: 'Électricité' },
    { id: 'ventilation', name: 'Ventilation' },
    { id: 'fenestration', name: 'Fenêtres' },
    { id: 'municipal', name: 'Code municipal' }
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
      const searchText = `${entry.question} ${entry.reponse} ${entry.code} ${entry.tags.join(' ')}`.toLowerCase();
      
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

      // Vérifier si on a des données pour cette municipalité
      const hasData = hasMunicipalData(municipality);
      let confirmContent = `Parfait! Municipalité définie: **${municipality}**. `;
      
      if (hasData) {
        confirmContent += `J'ai des données spécifiques pour cette ville. Posez votre question.`;
      } else {
        confirmContent += `⚠️ Cette municipalité n'est pas dans notre base de données. Je vous fournirai les références du Code national du bâtiment 2015, mais **veuillez vérifier les exigences spécifiques auprès de votre municipalité**.`;
      }

      const confirmMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: confirmContent,
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

    await new Promise(resolve => setTimeout(resolve, 400));

    // Toujours chercher les codes du CNB
    const results = searchBuildingCode(query);
    
    // Chercher les codes municipaux
    let municipalResults: { codes: MunicipalCode[], name: string } | null = null;
    let allMunicipalResults: { codes: MunicipalCode[], municipalities: string[] } | null = null;
    let municipalNotice: string | undefined;

    if (userMunicipality) {
      // Chercher d'abord dans la municipalité spécifiée
      municipalResults = searchMunicipalCodes(query, userMunicipality);
      
      if (!municipalResults || municipalResults.codes.length === 0) {
        // Si pas de résultats spécifiques, chercher dans toutes les municipalités pour référence
        allMunicipalResults = searchAllMunicipalities(query);
        
        if (allMunicipalResults.codes.length > 0) {
          municipalNotice = `⚠️ Aucune donnée spécifique trouvée pour **${userMunicipality}**. Voici des exemples d'autres municipalités pour référence. **Veuillez contacter votre municipalité pour confirmer les exigences applicables.**`;
          municipalResults = {
            codes: allMunicipalResults.codes.slice(0, 5),
            name: `Exemples: ${allMunicipalResults.municipalities.slice(0, 3).join(', ')}`
          };
        } else {
          municipalNotice = `⚠️ **${userMunicipality}** n'est pas dans notre base de données. Veuillez contacter votre service d'urbanisme municipal pour les exigences locales.`;
        }
      }
    } else {
      // Si pas de municipalité définie, demander
      if (category === 'municipal' || ['marge', 'recul', 'zonage', 'clôture', 'stationnement'].some(t => query.toLowerCase().includes(t))) {
        const askLocationMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Pour rechercher les codes municipaux, j'ai besoin de connaître la municipalité de votre projet. Dans quelle ville/municipalité se situe votre construction?",
        };
        setMessages(prev => [...prev, askLocationMessage]);
        setAskingLocation(true);
        setIsSearching(false);
        return;
      }
    }

    // Chercher des questions de clarification
    const clarifications = findClarificationQuestions(query);

    // Générer le résumé
    const hasMunicipal = municipalResults ? hasMunicipalData(userMunicipality || '') : false;
    const summary = results.length > 0 ? generateSummary(results, municipalResults?.codes, hasMunicipal, municipalNotice) : undefined;

    // Construire le message de réponse
    let responseContent = "";
    
    if (results.length > 0 || (municipalResults && municipalResults.codes.length > 0)) {
      const totalCNB = results.length;
      const totalMunicipal = municipalResults?.codes.length || 0;
      
      responseContent = `📋 **Résumé de recherche**\n\n`;
      responseContent += `**📖 Code national du bâtiment 2015:** ${totalCNB} résultat${totalCNB > 1 ? 's' : ''}\n`;
      responseContent += `**🏛️ Codes municipaux:** ${totalMunicipal} résultat${totalMunicipal > 1 ? 's' : ''}\n\n`;
      
      if (summary && summary.keyPoints.length > 0) {
        responseContent += `**Points clés:**\n`;
        summary.keyPoints.forEach((point) => {
          responseContent += `• ${point}\n`;
        });
      }
    } else {
      responseContent = "Je n'ai pas trouvé de résultat correspondant à votre recherche. Essayez avec d'autres termes comme: garde-corps, escalier, isolation, ventilation, marge avant...";
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: responseContent,
      results: results.length > 0 ? results : undefined,
      municipalResults: municipalResults?.codes,
      municipalityName: municipalResults?.name,
      summary,
      municipalNotice,
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Ajouter des questions de clarification si pertinent
    if (clarifications && results.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const clarificationMessage: Message = {
        id: crypto.randomUUID(),
        role: "clarification",
        content: "💡 Pour affiner ma réponse, pourriez-vous préciser:",
        clarificationOptions: clarifications,
      };
      setMessages(prev => [...prev, clarificationMessage]);
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

  const exampleSearches = [
    "Hauteur garde-corps",
    "Dimensions escalier",
    "Isolation murs",
    "Marge avant minimale",
    "Prises électriques",
    "Sorties de secours"
  ];

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
            <h1 className="text-3xl font-bold mb-2">Code du bâtiment</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Recherchez des informations sur le Code national du bâtiment et les codes municipaux.
            </p>
          </div>

          {/* Disclaimer */}
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Avis important :</strong> Les informations fournies sont à titre indicatif seulement. 
                Consultez toujours un professionnel qualifié et les autorités locales.
              </p>
            </CardContent>
          </Card>

          {/* Project/Location Selection */}
          {userProjects.length > 0 && (
            <Card className="mb-4">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Projet sélectionné:</span>
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
                  <strong>Codes municipaux actifs:</strong> {userMunicipality}
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="ml-2 h-auto p-0"
                    onClick={() => {
                      setUserMunicipality(null);
                      setSelectedProject(null);
                    }}
                  >
                    Changer
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
                  Recherche intelligente
                </CardTitle>
                {messages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleNewSearch}>
                    Nouvelle recherche
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Posez votre question</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Je vous guiderai avec des questions pour trouver la meilleure réponse.
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
                          <div className="ml-11 space-y-3">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              📖 Code national du bâtiment 2015:
                            </div>
                            {message.results.map((result) => (
                              <Card key={result.id} className="border-l-4 border-l-primary">
                                <CardHeader className="py-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="flex items-start gap-2 text-sm">
                                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                      {result.question}
                                    </CardTitle>
                                    <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getImportanceColor(result.importance)}`}>
                                      {result.importance}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent className="py-0 pb-4">
                                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                    {result.reponse}
                                  </p>
                                  <div className="flex items-center gap-2 pt-2 border-t">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium text-primary">
                                      CNB 2015 - {result.code}
                                    </span>
                                  </div>
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
                              🏛️ Codes municipaux - {message.municipalityName}:
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
                  placeholder={askingLocation ? "Entrez votre municipalité..." : "Recherchez: garde-corps, escalier, marge avant..."}
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
