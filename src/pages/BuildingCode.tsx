import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Loader2, AlertCircle, FileText, Lightbulb, MessageSquare, Send, User, Bot, CheckCircle, MapPin, Building2, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Base de données locale du Code du Bâtiment avec contenu complet des articles
const buildingCodeDB = {
  structure: [
    {
      id: 'S1',
      question: 'Quelle est la hauteur maximale pour un bâtiment résidentiel?',
      reponse: 'La hauteur maximale dépend du zonage, généralement 12-15 mètres pour R1-R2, jusqu\'à 25 mètres pour R3-R4.',
      code: 'Article 3.2.1',
      articleContent: `**CNB 2015 - Article 3.2.1. Hauteur de bâtiment**

3.2.1.1. Limites de hauteur

1) La hauteur de bâtiment permise est fonction de l'usage principal du bâtiment et de sa classification quant à la construction combustible ou incombustible.

2) Pour les bâtiments d'habitation du groupe C:
   a) Construction combustible: hauteur maximale de 12 m (4 étages)
   b) Construction incombustible: hauteur maximale de 25 m (6 étages)

3) Les mesures de hauteur sont prises du niveau moyen du sol jusqu'au point le plus élevé du toit ou du parapet.`,
      importance: 'haute' as const,
      tags: ['hauteur', 'résidentiel', 'zonage', 'bâtiment']
    },
    {
      id: 'S2',
      question: 'Quelle distance minimale entre deux bâtiments?',
      reponse: 'Minimum 3 mètres entre bâtiments, 6 mètres si présence de fenêtres face à face.',
      code: 'Article 3.4.2',
      articleContent: `**CNB 2015 - Article 3.4.2. Séparation spatiale**

3.4.2.1. Distance limitative

1) La distance limitative est la distance mesurée à angle droit de la face d'un bâtiment jusqu'à la limite de propriété, au centre d'une rue ou d'une ruelle ou jusqu'à un bâtiment ou une face de bâtiment sur le même bien-fonds.

2) Distance minimale entre bâtiments:
   a) Minimum 3 m entre bâtiments non reliés
   b) Minimum 6 m si présence de baies non protégées face à face
   c) Distance réduite possible avec protection incendie appropriée`,
      importance: 'haute' as const,
      tags: ['distance', 'espacement', 'bâtiment', 'fenêtre']
    },
    {
      id: 'S3',
      question: 'Quelle est l\'épaisseur minimale des dalles de béton?',
      reponse: '100mm minimum pour dalles résidentielles, 150mm pour commerciales.',
      code: 'Article 3.6.8',
      articleContent: `**CNB 2015 - Article 3.6.8. Dalles de béton**

3.6.8.1. Épaisseur minimale des dalles

1) Les dalles de béton coulées en place doivent avoir une épaisseur minimale de:
   a) 100 mm pour usage résidentiel
   b) 150 mm pour usage commercial ou industriel léger
   c) 200 mm pour usage industriel lourd

2) L'armature doit être conforme à la norme CSA A23.3, «Calcul des ouvrages en béton».

3) Le béton doit avoir une résistance minimale à la compression de 20 MPa après 28 jours.`,
      importance: 'haute' as const,
      tags: ['béton', 'dalle', 'épaisseur', 'fondation']
    },
    {
      id: 'S4',
      question: 'Quelle est la charge admissible pour un plancher résidentiel?',
      reponse: 'La charge vive minimale pour un plancher résidentiel est de 1.9 kPa (40 lb/pi²). Pour les balcons, elle est de 2.4 kPa.',
      code: 'Article 4.1.5.3',
      articleContent: `**CNB 2015 - Article 4.1.5.3. Charges sur les planchers**

4.1.5.3. Charges vives sur les planchers

1) Les charges vives minimales sur les planchers doivent être conformes au tableau 4.1.5.3.:

   Usage                           | Charge (kPa) | (lb/pi²)
   --------------------------------|--------------|----------
   Logements résidentiels          | 1.9          | 40
   Balcons et terrasses            | 2.4          | 50
   Escaliers                       | 1.9          | 40
   Sorties                         | 4.8          | 100
   Corridors principaux            | 4.8          | 100

2) Ces charges ne comprennent pas le poids des cloisons qui doit être ajouté séparément.`,
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
      articleContent: `**CNB 2015 - Article 3.4.2.1. Nombre de sorties**

3.4.2.1. Nombre minimal de sorties

1) Chaque aire de plancher doit être desservie par au moins 2 sorties, sauf si les conditions suivantes sont respectées:
   a) L'aire de plancher a une superficie d'au plus 150 m² dans un bâtiment entièrement protégé par gicleurs
   b) L'aire de plancher a une superficie d'au plus 200 m² et la distance de parcours jusqu'à une issue ne dépasse pas 25 m

2) Distance maximale de parcours:
   a) 45 m pour bâtiments sans gicleurs
   b) 90 m pour bâtiments avec gicleurs

3) Les sorties doivent être situées de manière à minimiser la distance de parcours et être éloignées l'une de l'autre.`,
      importance: 'critique' as const,
      tags: ['sortie', 'évacuation', 'sécurité', 'secours']
    },
    {
      id: 'SEC2',
      question: 'Largeur minimale des escaliers de secours?',
      reponse: '1100mm minimum pour usage résidentiel, 1400mm pour usage commercial. La largeur doit permettre l\'évacuation selon le nombre d\'occupants.',
      code: 'Article 3.4.3.2',
      articleContent: `**CNB 2015 - Article 3.4.3.2. Largeur des escaliers d'issue**

3.4.3.2. Largeur minimale requise

1) Les escaliers d'issue doivent avoir une largeur libre minimale de:
   a) 1100 mm pour usage résidentiel (groupe C)
   b) 1400 mm pour usage commercial ou public
   c) 1500 mm pour les hôpitaux et établissements de soins

2) La largeur requise doit être maintenue sur toute la hauteur de l'escalier.

3) Pour les escaliers desservant plus de 2 étages, la largeur peut être augmentée selon la formule:
   L = 8 mm × nombre d'occupants desservis

4) Les escaliers doivent être munis de mains courantes de chaque côté.`,
      importance: 'critique' as const,
      tags: ['escalier', 'largeur', 'secours', 'évacuation']
    },
    {
      id: 'SEC3',
      question: 'Hauteur minimale des garde-corps?',
      reponse: '1070mm (42 pouces) minimum pour balcons, terrasses et toits. 900mm (36 pouces) pour escaliers intérieurs. Les ouvertures ne doivent pas permettre le passage d\'une sphère de 100mm de diamètre.',
      code: 'Article 9.8.8.1',
      articleContent: `**CNB 2015 - Article 9.8.8.1. Garde-corps**

9.8.8.1. Hauteur des garde-corps

1) Un garde-corps d'une hauteur d'au moins:
   a) 1070 mm doit être installé autour de toute surface de circulation extérieure, terrasse, balcon, porche, mezzanine ou galerie situés à plus de 600 mm au-dessus du niveau du sol adjacent ou du plancher
   b) 900 mm doit être installé de chaque côté d'un escalier intérieur et autour des paliers

2) La hauteur est mesurée verticalement jusqu'au sommet du garde-corps à partir:
   a) de la surface du plancher, terrasse ou sol
   b) du nez des marches dans le cas d'un escalier

9.8.8.2. Ouvertures dans les garde-corps

1) Les ouvertures dans un garde-corps doivent être dimensionnées de manière à empêcher le passage d'une sphère de 100 mm de diamètre.

2) Cette exigence s'applique à tous les garde-corps pour des usages résidentiels afin de protéger les enfants.`,
      importance: 'critique' as const,
      tags: ['garde-corps', 'balcon', 'hauteur', 'sécurité', 'rampe', 'balustre']
    },
    {
      id: 'SEC4',
      question: 'Quelles sont les exigences pour les détecteurs de fumée?',
      reponse: 'Un détecteur de fumée doit être installé à chaque étage, y compris le sous-sol. Ils doivent être interconnectés si plus d\'un est requis. Dans les corridors de plus de 10m, un détecteur est requis tous les 10m.',
      code: 'Article 9.10.19',
      articleContent: `**CNB 2015 - Article 9.10.19. Avertisseurs de fumée**

9.10.19.1. Exigences générales

1) Chaque logement doit être pourvu d'avertisseurs de fumée installés conformément au présent article.

2) Il faut installer au moins un avertisseur de fumée:
   a) à chaque étage, y compris le sous-sol
   b) à l'extérieur des chambres, à au plus 5 m de chaque porte de chambre

9.10.19.2. Interconnexion

1) Si plus d'un avertisseur de fumée est requis dans un logement, ils doivent être interconnectés de façon que le déclenchement de l'un actionne tous les autres.

9.10.19.3. Emplacement

1) Les avertisseurs doivent être installés:
   a) au plafond ou à au plus 300 mm du plafond
   b) à au moins 100 mm de toute intersection mur-plafond
   c) à au moins 1 m de luminaires ou ventilateurs`,
      importance: 'critique' as const,
      tags: ['détecteur', 'fumée', 'alarme', 'incendie', 'sécurité']
    },
    {
      id: 'SEC5',
      question: 'Résistance au feu des séparations coupe-feu?',
      reponse: 'Les séparations coupe-feu entre logements doivent avoir une résistance au feu d\'au moins 1 heure. Entre un garage et un logement, la résistance requise est de 45 minutes minimum.',
      code: 'Article 9.10.9',
      articleContent: `**CNB 2015 - Article 9.10.9. Séparations coupe-feu**

9.10.9.1. Degré de résistance au feu

1) Les séparations coupe-feu requises doivent avoir un degré de résistance au feu d'au moins:
   a) 1 heure entre logements contigus dans un même bâtiment
   b) 45 minutes entre un garage de stationnement et une aire habitable
   c) 45 minutes pour les murs extérieurs à moins de 1,2 m de la limite de propriété

9.10.9.6. Garage attaché

1) Le mur séparant un garage d'un logement doit:
   a) avoir un degré de résistance au feu de 45 minutes
   b) s'étendre jusqu'à la sous-face du plafond du garage
   c) comporter une porte à fermeture automatique homologuée d'au moins 20 minutes

2) Le plafond du garage sous un logement doit avoir un degré de résistance au feu de 45 minutes.`,
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
      articleContent: `**CNB 2015 - Article 9.8.4.1. Dimensions des marches**

9.8.4.1. Giron et contremarche

1) Le giron des marches doit être d'au moins 235 mm et d'au plus 355 mm.

2) La hauteur des contremarches doit être d'au moins 125 mm et d'au plus 200 mm.

3) La formule 2 × hauteur + giron doit donner un résultat entre 600 mm et 660 mm.

9.8.4.2. Uniformité des marches

1) La différence de hauteur entre les contremarches d'une même volée ne doit pas dépasser 6 mm.

2) La différence de giron entre les marches d'une même volée ne doit pas dépasser 6 mm.

**Exemple de calcul:**
- Contremarche de 180 mm, giron de 280 mm
- Vérification: 2 × 180 + 280 = 640 mm ✓ (entre 600 et 660)`,
      importance: 'haute' as const,
      tags: ['escalier', 'marche', 'giron', 'contremarche', 'dimension']
    },
    {
      id: 'ESC2',
      question: 'Quelle est la hauteur libre minimale dans un escalier?',
      reponse: 'La hauteur libre minimale est de 1950mm (6\'5") mesurée verticalement du nez de marche au plafond.',
      code: 'Article 9.8.2.1',
      articleContent: `**CNB 2015 - Article 9.8.2.1. Hauteur libre**

9.8.2.1. Dégagement vertical

1) La hauteur libre au-dessus d'un escalier, d'un palier ou d'une rampe d'accès doit être d'au moins 1950 mm.

2) Cette hauteur est mesurée verticalement à partir:
   a) du nez des marches, en suivant la ligne de foulée
   b) de la surface du palier

3) Aucun obstacle, y compris les portes, luminaires ou équipements mécaniques, ne doit réduire cette hauteur libre.

**Note:** Pour les escaliers résidentiels, une hauteur de 1950 mm permet le passage confortable des personnes et le transport d'objets encombrants.`,
      importance: 'haute' as const,
      tags: ['escalier', 'hauteur', 'libre', 'dégagement']
    },
    {
      id: 'ESC3',
      question: 'Quand faut-il une main courante?',
      reponse: 'Une main courante est requise de chaque côté si l\'escalier a plus de 1100mm de largeur. Une main courante est toujours requise si l\'escalier a plus de 2 marches. Hauteur: entre 865mm et 965mm.',
      code: 'Article 9.8.7',
      articleContent: `**CNB 2015 - Article 9.8.7. Mains courantes**

9.8.7.1. Exigences générales

1) Une main courante est exigée de chaque côté d'un escalier de plus de 1100 mm de largeur.

2) Une main courante est requise d'au moins un côté de tout escalier ayant plus de 2 contremarches (3 marches ou plus).

9.8.7.2. Hauteur des mains courantes

1) Les mains courantes doivent être à une hauteur d'au moins 865 mm et d'au plus 965 mm, mesurée verticalement à partir du nez des marches.

9.8.7.4. Forme et dimension

1) La main courante doit:
   a) avoir un diamètre de 30 mm à 43 mm si elle est circulaire
   b) permettre une prise ferme sur toute sa longueur
   c) se prolonger horizontalement d'au moins 300 mm au-delà de la première et de la dernière marche`,
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
      articleContent: `**CNB 2015 - Article 9.36.2.6. Isolation des murs**

9.36.2.6. Valeur RSI/R des murs hors-sol

1) Les murs hors-sol doivent avoir une valeur RSI totale minimale conforme au tableau 9.36.2.6.:

   Zone (degrés-jours) | RSI minimal | R minimal
   --------------------|-------------|----------
   < 5000              | 2.78        | 15.8
   5000 à 5999         | 2.97        | 16.9
   6000 à 6999         | 3.08        | 17.5
   ≥ 7000              | 3.85        | 21.9

2) La valeur RSI doit inclure tous les composants du mur, y compris:
   a) les revêtements intérieur et extérieur
   b) les espaces d'air
   c) les ponts thermiques

**Note pour le Québec:** La majorité du territoire québécois se situe dans les zones de 5000 à 7000 degrés-jours.`,
      importance: 'moyenne' as const,
      tags: ['isolation', 'mur', 'thermique', 'coefficient', 'RSI']
    },
    {
      id: 'ISO2',
      question: 'Isolation requise pour les toitures?',
      reponse: 'R minimum de 6.0 (RSI 1.06) pour toitures et combles aménagés. Pour les plafonds sous combles non aménagés, R-50 à R-60 est recommandé pour une performance optimale.',
      code: 'Article 9.36.2.4',
      articleContent: `**CNB 2015 - Article 9.36.2.4. Isolation des toits et plafonds**

9.36.2.4. Valeur RSI/R des plafonds et toits

1) Les plafonds sous des combles ou espaces non chauffés doivent avoir une valeur RSI minimale de:

   Zone (degrés-jours) | RSI minimal | R minimal
   --------------------|-------------|----------
   < 5000              | 8.67        | 49.2
   5000 à 5999         | 8.67        | 49.2
   6000 à 6999         | 8.67        | 49.2
   ≥ 7000              | 10.43       | 59.2

2) Pour les toits cathédrale ou plafonds avec pente, la valeur RSI minimale est de 5.02 (R-28.5).

3) L'isolation doit être continue et les joints bien scellés pour minimiser les infiltrations d'air.`,
      importance: 'moyenne' as const,
      tags: ['isolation', 'toiture', 'comble', 'plafond', 'thermique']
    },
    {
      id: 'ISO3',
      question: 'Isolation des fondations?',
      reponse: 'Les murs de fondation doivent être isolés à un minimum de R-12 (RSI 2.1) dans les zones froides. L\'isolation doit descendre jusqu\'à 600mm sous le niveau du sol ou jusqu\'à la semelle.',
      code: 'Article 9.36.2.8',
      articleContent: `**CNB 2015 - Article 9.36.2.8. Isolation des fondations**

9.36.2.8. Valeur RSI/R des murs de fondation

1) Les murs de fondation en contact avec le sol doivent avoir une valeur RSI minimale:

   Zone (degrés-jours) | RSI minimal | R minimal
   --------------------|-------------|----------
   < 5000              | 1.99        | 11.3
   5000 à 5999         | 2.11        | 12.0
   6000 à 6999         | 2.11        | 12.0
   ≥ 7000              | 2.98        | 16.9

2) L'isolation doit s'étendre:
   a) jusqu'à 600 mm sous le niveau du sol adjacent, ou
   b) jusqu'au dessus de la semelle de fondation

3) Les dalles de plancher sur sol doivent avoir une isolation périphérique de RSI 1.76 (R-10) sur une largeur de 600 mm.`,
      importance: 'moyenne' as const,
      tags: ['fondation', 'isolation', 'sous-sol', 'thermique']
    },
    {
      id: 'ISO4',
      question: 'Exigences pour le pare-vapeur?',
      reponse: 'Un pare-vapeur avec une perméance maximale de 60 ng/(Pa·s·m²) doit être installé du côté chaud de l\'isolant. Il doit être continu et scellé aux joints.',
      code: 'Article 9.25.4',
      articleContent: `**CNB 2015 - Article 9.25.4. Pare-vapeur**

9.25.4.1. Emplacement du pare-vapeur

1) Un pare-vapeur doit être installé du côté chaud de l'isolant thermique dans les murs, planchers et plafonds.

2) Le pare-vapeur doit avoir une perméance à la vapeur d'eau d'au plus 60 ng/(Pa·s·m²).

9.25.4.2. Continuité

1) Le pare-vapeur doit être:
   a) continu sur toute la surface à protéger
   b) scellé aux joints avec du ruban approprié ou du scellant acoustique
   c) scellé à son pourtour et aux pénétrations (fils, tuyaux, boîtes électriques)

**Matériaux acceptables:**
- Polyéthylène de 0.15 mm (6 mil) d'épaisseur
- Feuille d'aluminium
- Membrane pare-vapeur homologuée`,
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
      articleContent: `**CNB 2015 - Article 2.6.1.6. Pression d'alimentation en eau**

2.6.1.6. Pression minimale et maximale

1) La pression minimale aux points d'utilisation doit être d'au moins 200 kPa (30 lb/po²).

2) La pression maximale de service ne doit pas dépasser 550 kPa (80 lb/po²).

3) Si la pression de service dépasse 550 kPa:
   a) un réducteur de pression doit être installé
   b) le réducteur doit être situé en amont du premier point de distribution

4) Un clapet de non-retour doit être installé si la pression de l'eau de ville varie significativement.

**Note:** Une pression insuffisante peut affecter le fonctionnement des appareils, particulièrement les douches aux étages supérieurs.`,
      importance: 'moyenne' as const,
      tags: ['pression', 'eau', 'plomberie']
    },
    {
      id: 'PLB2',
      question: 'Diamètre minimum des tuyaux d\'évacuation?',
      reponse: '50mm (2 pouces) pour lavabos et douches, 75mm (3 pouces) pour baignoires, 100mm (4 pouces) pour toilettes et colonnes de chute.',
      code: 'Article 2.4.10',
      articleContent: `**CNB 2015 - Article 2.4.10. Dimensions des tuyaux d'évacuation**

2.4.10.1. Diamètres minimaux

1) Les diamètres minimaux des tuyaux d'évacuation sont:

   Appareil                      | Diamètre minimal
   ------------------------------|------------------
   Lavabo                        | 38 mm (1½")
   Douche                        | 50 mm (2")
   Baignoire                     | 38 mm (1½")
   Toilette                      | 75 mm (3") siphon, 100 mm (4") évacuation
   Machine à laver               | 50 mm (2")
   Évier de cuisine              | 38 mm (1½")
   Colonne de chute (résidentiel)| 75 mm (3") min, 100 mm (4") recommandé

2) La colonne de chute principale doit avoir un diamètre d'au moins 100 mm (4") si elle dessert plus de 2 toilettes.`,
      importance: 'moyenne' as const,
      tags: ['tuyau', 'évacuation', 'diamètre', 'plomberie', 'drain']
    },
    {
      id: 'PLB3',
      question: 'Pente minimale des drains?',
      reponse: 'La pente minimale est de 1% (1:100) pour les drains de 75mm et plus, et 2% (1:50) pour les drains de moins de 75mm.',
      code: 'Article 2.4.6',
      articleContent: `**CNB 2015 - Article 2.4.6. Pente des tuyaux d'évacuation**

2.4.6.1. Pentes minimales

1) Les tuyaux d'évacuation horizontaux doivent avoir une pente minimale de:
   a) 2% (1:50) pour les tuyaux de diamètre inférieur à 75 mm
   b) 1% (1:100) pour les tuyaux de diamètre de 75 mm et plus

2) La pente maximale ne doit pas dépasser le rapport de 1:1 (100%) sauf pour les tuyaux verticaux.

**Tableau récapitulatif:**

   Diamètre         | Pente minimale | Chute par mètre
   -----------------|----------------|----------------
   < 75 mm (3")     | 2% (1:50)      | 20 mm/m
   ≥ 75 mm (3")     | 1% (1:100)     | 10 mm/m

**Note:** Une pente insuffisante cause des obstructions, une pente excessive provoque une séparation solide/liquide.`,
      importance: 'moyenne' as const,
      tags: ['pente', 'drain', 'évacuation', 'plomberie']
    },
    {
      id: 'PLB4',
      question: 'Ventilation des appareils sanitaires?',
      reponse: 'Chaque appareil sanitaire doit être ventilé. Le diamètre du tuyau de ventilation doit être au moins la moitié du diamètre du drain, minimum 32mm.',
      code: 'Article 2.5.4',
      articleContent: `**CNB 2015 - Article 2.5.4. Ventilation des appareils**

2.5.4.1. Exigences générales

1) Chaque appareil sanitaire doit être raccordé à un tuyau de ventilation pour:
   a) permettre l'écoulement de l'air
   b) protéger le siphon contre le siphonnage

2) Le diamètre du tuyau de ventilation doit être:
   a) au moins la moitié du diamètre du drain desservi
   b) au minimum 32 mm (1¼")

2.5.4.2. Distance de ventilation

1) La distance maximale entre le siphon et le raccordement de ventilation est:

   Diamètre du drain | Distance maximale
   ------------------|------------------
   38 mm (1½")       | 1.5 m
   50 mm (2")        | 2.4 m
   75 mm (3")        | 3.0 m

2) L'évent doit dépasser le toit d'au moins 150 mm et être situé à au moins 3 m de toute ouverture.`,
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
      articleContent: `**Code canadien de l'électricité - Article 26-712. Prises de courant**

26-712 (a) Prises dans les pièces habitables

1) Dans chaque pièce habitable autre que les cuisines et salles de bain:
   a) Il faut une prise par section de mur de 900 mm ou plus
   b) Aucun point le long du mur ne doit être à plus de 1.8 m d'une prise
   c) Chaque mur de 1.5 m ou plus doit avoir au moins une prise

2) Les prises doivent être réparties uniformément autour du périmètre de la pièce.

**Règle pratique:** Dans une pièce typique, prévoir une prise tous les 3 à 4 mètres le long des murs.

26-712 (e) Portes et ouvertures

1) L'espace mural de chaque côté d'une porte compte comme section distincte si la largeur est de 900 mm ou plus.`,
      importance: 'moyenne' as const,
      tags: ['prise', 'électricité', 'réceptacle']
    },
    {
      id: 'ELEC2',
      question: 'Hauteur standard des prises électriques?',
      reponse: '300-450mm du sol pour prises standard. 1100mm pour comptoirs de cuisine. Les prises de cuisine doivent être à moins de 1.8m de tout point du comptoir.',
      code: 'Article 26-712(d)',
      articleContent: `**Code canadien de l'électricité - Article 26-712(d). Hauteur des prises**

26-712 (d) Hauteur d'installation

1) Prises murales standard:
   a) Hauteur recommandée: 300 mm à 450 mm du sol fini
   b) Hauteur accessible: pour les personnes à mobilité réduite, 400 mm à 1200 mm

2) Prises de comptoir de cuisine:
   a) Hauteur: entre 100 mm et 200 mm au-dessus de la surface du comptoir
   b) Distance: aucun point du comptoir ne doit être à plus de 900 mm d'une prise

3) Prises extérieures:
   a) Hauteur minimale: 300 mm au-dessus du sol
   b) Protégées par un couvercle étanche pendant l'utilisation

**Note:** Les prises derrière les appareils électroménagers peuvent être à une hauteur différente selon l'accès requis.`,
      importance: 'moyenne' as const,
      tags: ['prise', 'hauteur', 'électricité']
    },
    {
      id: 'ELEC3',
      question: 'Circuits requis pour une cuisine?',
      reponse: 'Minimum 2 circuits de 20A pour les prises de comptoir, plus des circuits dédiés pour: cuisinière, réfrigérateur, lave-vaisselle, broyeur.',
      code: 'Article 26-724',
      articleContent: `**Code canadien de l'électricité - Article 26-724. Circuits de cuisine**

26-724 Circuits pour prises de comptoir

1) Il faut au minimum 2 circuits distincts de 20 A pour les prises de comptoir de cuisine.

2) Ces circuits doivent être dédiés exclusivement aux prises de comptoir.

26-726 Circuits dédiés requis

1) Les appareils suivants exigent un circuit dédié:
   
   Appareil           | Calibre circuit | Tension
   -------------------|-----------------|--------
   Cuisinière         | 40 A            | 240 V
   Réfrigérateur      | 15 A            | 120 V
   Lave-vaisselle     | 15 A            | 120 V
   Broyeur            | 15 A            | 120 V
   Four à micro-ondes | 20 A            | 120 V
   Hotte de cuisine   | 15 A            | 120 V

2) Les prises desservant ces appareils doivent être facilement accessibles.`,
      importance: 'moyenne' as const,
      tags: ['cuisine', 'circuit', 'électricité', 'ampérage']
    },
    {
      id: 'ELEC4',
      question: 'Prises DDFT (GFCI) requises où?',
      reponse: 'Les prises DDFT sont requises dans: salles de bain, cuisines (à moins de 1.5m de l\'évier), buanderies, garages, extérieur, et à moins de 1.5m d\'un lavabo.',
      code: 'Article 26-700(11)',
      articleContent: `**Code canadien de l'électricité - Article 26-700(11). Protection DDFT**

26-700(11) Disjoncteur différentiel de fuite à la terre (DDFT/GFCI)

1) Les prises suivantes doivent être protégées par un dispositif DDFT:

   a) Salles de bain - toutes les prises
   b) Cuisine - prises situées à moins de 1.5 m d'un évier
   c) Buanderie - toutes les prises
   d) Garage et bâtiments annexes - toutes les prises
   e) Extérieur - toutes les prises
   f) Sous-sol non fini - toutes les prises
   g) Près d'une piscine ou spa - dans un rayon de 3 m

2) La protection DDFT peut être assurée par:
   a) Un disjoncteur DDFT au panneau électrique
   b) Une prise DDFT (première de la chaîne protège les suivantes)

**Fonctionnement:** Le DDFT coupe le courant en 1/40 de seconde si une différence de 5 mA est détectée entre les conducteurs.`,
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
      articleContent: `**CNB 2015 - Article 9.32.3.3. Ventilation des salles de bain**

9.32.3.3. Exigences de ventilation

1) Chaque salle de bain ou salle d'eau doit être ventilée par:
   a) une fenêtre ouvrable d'au moins 0.35 m² de surface libre, OU
   b) un ventilateur d'extraction raccordé à l'extérieur

2) Débits minimaux du ventilateur d'extraction:

   Type de pièce              | Débit minimal
   ---------------------------|----------------
   Salle d'eau (toilette seule)| 25 L/s (25 cfm)
   Salle de bain complète      | 50 L/s (50 cfm)
   Salle de bain avec bain et douche | 50 L/s (50 cfm)

3) Le conduit d'évacuation doit:
   a) être en matériau rigide ou flexible homologué
   b) être isolé dans les espaces non chauffés
   c) se terminer à l'extérieur avec un clapet anti-retour`,
      importance: 'moyenne' as const,
      tags: ['ventilation', 'salle de bain', 'extraction', 'fenêtre']
    },
    {
      id: 'VENT2',
      question: 'Ventilation de la cuisine?',
      reponse: 'Une hotte de cuisinière avec extraction d\'au moins 50 cfm est requise. Pour les cuisinières à gaz, minimum 100 cfm recommandé.',
      code: 'Article 9.32.3.5',
      articleContent: `**CNB 2015 - Article 9.32.3.5. Ventilation de cuisine**

9.32.3.5. Hotte de cuisinière

1) Une hotte de cuisinière avec ventilateur d'extraction est requise au-dessus de chaque surface de cuisson.

2) Débits minimaux recommandés:

   Type de cuisinière    | Débit minimal
   ----------------------|----------------
   Électrique standard   | 50 L/s (50 cfm)
   Gaz naturel          | 100 L/s (100 cfm)
   Professionnelle      | 150 L/s (150 cfm)

3) La hotte doit:
   a) couvrir toute la largeur de la surface de cuisson
   b) être installée à 600-750 mm au-dessus de la surface
   c) évacuer directement à l'extérieur (la recirculation est déconseillée)

4) Pour les hottes à recirculation:
   - Elles ne satisfont pas les exigences de ventilation
   - Une fenêtre ouvrable ou autre source d'air frais est requise`,
      importance: 'moyenne' as const,
      tags: ['ventilation', 'cuisine', 'hotte', 'extraction']
    },
    {
      id: 'VENT3',
      question: 'Échangeur d\'air requis?',
      reponse: 'Un système de ventilation mécanique principal (VRC ou VRE) est requis pour les maisons neuves. Le débit minimum est basé sur le nombre de chambres: 30 L/s pour 0-1 chambre, +7.5 L/s par chambre additionnelle.',
      code: 'Article 9.32.3.1',
      articleContent: `**CNB 2015 - Article 9.32.3.1. Ventilation principale**

9.32.3.1. Système de ventilation mécanique

1) Un système de ventilation mécanique principal est obligatoire pour toutes les habitations neuves.

2) Le débit d'air frais minimal est calculé selon:

   Nombre de chambres | Débit minimal
   -------------------|---------------
   0-1 chambre        | 30 L/s
   2 chambres         | 37.5 L/s
   3 chambres         | 45 L/s
   4 chambres         | 52.5 L/s
   5+ chambres        | +7.5 L/s par chambre additionnelle

3) Types de systèmes acceptables:
   a) VRC (ventilateur récupérateur de chaleur) - recommandé au Québec
   b) VRE (ventilateur récupérateur d'énergie)
   c) Système de ventilation équilibré

4) Le VRC doit avoir une efficacité de récupération de chaleur d'au moins 55% à -25°C pour les climats froids.`,
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
      articleContent: `**CNB 2015 - Article 9.7.2.2. Éclairage naturel**

9.7.2.2. Surface vitrée minimale

1) Chaque pièce habitable doit avoir des fenêtres dont la surface vitrée totale est d'au moins 5% de la surface de plancher de la pièce.

2) Exemple de calcul:
   - Chambre de 12 m² (130 pi²)
   - Surface vitrée requise: 12 × 5% = 0.6 m² (6.5 pi²)

3) Les exigences ne s'appliquent pas:
   a) aux salles de bain
   b) aux buanderies
   c) aux couloirs et vestibules
   d) aux cuisines (si ventilation mécanique adéquate)

4) L'éclairage artificiel peut compléter mais ne peut remplacer l'éclairage naturel dans les pièces habitables.`,
      importance: 'moyenne' as const,
      tags: ['fenêtre', 'vitrage', 'éclairage', 'naturel']
    },
    {
      id: 'FEN2',
      question: 'Dimensions minimales des fenêtres d\'évacuation?',
      reponse: 'Ouverture minimale de 0.35m² avec aucune dimension inférieure à 380mm. Le seuil ne doit pas être à plus de 1000mm du plancher.',
      code: 'Article 9.9.10.1',
      articleContent: `**CNB 2015 - Article 9.9.10.1. Fenêtres d'évacuation d'urgence**

9.9.10.1. Dimensions minimales

1) Chaque chambre à coucher doit avoir au moins une fenêtre d'évacuation d'urgence avec:
   a) une ouverture libre d'au moins 0.35 m² (3.77 pi²)
   b) aucune dimension de l'ouverture inférieure à 380 mm (15")

2) Hauteur du seuil:
   a) Le seuil de la fenêtre ne doit pas être à plus de 1000 mm (39") au-dessus du plancher
   b) Si le seuil est à plus de 1500 mm, des moyens d'accès (escabeau permanent) peuvent être requis

3) Type de fenêtre:
   a) Les fenêtres à battant, à auvent et à guillotine sont acceptables
   b) Les fenêtres coulissantes horizontales sont acceptables si l'ouverture est suffisante

**Exemple:** Une fenêtre de 600 mm × 600 mm = 0.36 m² satisfait les exigences (> 0.35 m² et dimensions > 380 mm).`,
      importance: 'haute' as const,
      tags: ['fenêtre', 'évacuation', 'urgence', 'chambre']
    },
    {
      id: 'FEN3',
      question: 'Performance thermique des fenêtres?',
      reponse: 'Les fenêtres doivent avoir un coefficient U maximal de 2.0 W/(m²·K) pour les zones climatiques froides. Les fenêtres ENERGY STAR sont recommandées.',
      code: 'Article 9.36.2.3',
      articleContent: `**CNB 2015 - Article 9.36.2.3. Performance thermique des fenêtres**

9.36.2.3. Coefficient U maximal

1) Les fenêtres, portes et lanterneaux doivent avoir un coefficient U maximal:

   Zone (degrés-jours) | U maximum W/(m²·K) | R équivalent
   --------------------|--------------------|--------------
   < 5000              | 2.20               | 0.45
   5000 à 5999         | 2.00               | 0.50
   6000 à 6999         | 1.80               | 0.56
   ≥ 7000              | 1.60               | 0.63

2) Caractéristiques recommandées pour le Québec:
   a) Double ou triple vitrage
   b) Gaz argon ou krypton entre les vitrages
   c) Intercalaire à rupture de pont thermique
   d) Revêtement à faible émissivité (Low-E)

3) La certification ENERGY STAR pour la zone climatique appropriée garantit la conformité.

**Note:** Au Québec, choisir des fenêtres ENERGY STAR zone 2 ou 3 selon la région.`,
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

type ImportanceLevel = 'critique' | 'haute' | 'moyenne';

interface BuildingCodeEntry {
  id: string;
  question: string;
  reponse: string;
  code: string;
  articleContent?: string;
  importance: ImportanceLevel;
  tags: string[];
}

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
            <h1 className="text-3xl font-bold mb-2">{t("buildingCode.title")}</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("buildingCode.subtitle")}
            </p>
          </div>

          {/* Disclaimer */}
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{t("buildingCode.disclaimer.title", "Important notice")}:</strong> {t("buildingCode.disclaimer.text", "The information provided is for reference only. Always consult a qualified professional and local authorities.")}
              </p>
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
                                  
                                  {/* Article complet du CNB */}
                                  {result.articleContent && (
                                    <Collapsible className="mt-3">
                                      <CollapsibleTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full justify-between gap-2">
                                          <span className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-primary" />
                                            <span className="font-medium">CNB 2015 - {result.code}</span>
                                          </span>
                                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="mt-3">
                                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
                                          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
                                            {result.articleContent}
                                          </pre>
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
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
