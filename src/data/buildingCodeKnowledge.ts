export type ImportanceLevel = "critique" | "haute" | "moyenne";

export interface BuildingCodeEntry {
  id: string;
  question: string;
  reponse: string;
  importance: ImportanceLevel;
  tags: string[];
  // Nouvelles propriétés pour le format enrichi
  technicalChecks?: string[];
  commonMistakes?: string[];
  consultPro?: string[];
  searchSuggestions?: string[];
}

// Base locale "pédagogique" (sans citations, sans numéros d'articles).
// Objectif: orienter l'utilisateur sur les principes et vérifications typiques.
export const buildingCodeKnowledge = {
  structure: [
    {
      id: "S1",
      question: "Quelle est la hauteur maximale typique d'une maison?",
      reponse:
        "La hauteur permise dépend surtout du zonage et du type d'occupation. En résidentiel unifamilial, les limites sont souvent exprimées en nombre d'étages et en hauteur totale. Le meilleur réflexe: valider auprès du service d'urbanisme avant de finaliser les plans.",
      importance: "haute",
      tags: ["hauteur", "bâtiment", "zonage", "étages", "résidentiel"],
      technicalChecks: [
        "Vérifier le règlement de zonage de votre municipalité",
        "Confirmer le nombre d'étages permis dans votre zone",
        "Mesurer la hauteur depuis le niveau moyen du sol jusqu'au faîte",
        "Tenir compte des pentes de terrain qui peuvent affecter le calcul",
        "Vérifier si votre projet nécessite une dérogation"
      ],
      commonMistakes: [
        "Mesurer la hauteur à partir du mauvais point de référence",
        "Ne pas vérifier le règlement municipal avant la conception",
        "Ignorer les restrictions supplémentaires en zone patrimoniale"
      ],
      consultPro: [
        "Si le terrain a une pente importante",
        "Si vous êtes proche des limites de hauteur permises",
        "Si vous êtes en zone patrimoniale ou protégée"
      ],
      searchSuggestions: [
        "Recherche officielle : règlement zonage hauteur bâtiment Québec",
        "Recherche officielle : CNRC CNB hauteur résidentiel"
      ]
    },
    {
      id: "S2",
      question: "Quelle distance prévoir entre deux bâtiments?",
      reponse:
        "La distance minimale dépend du risque d'incendie et du règlement municipal (implantation), mais aussi des ouvertures (fenêtres/portes) sur les faces rapprochées. En pratique, plus vous êtes proche d'une limite, plus la conception des murs et ouvertures peut devenir contraignante.",
      importance: "haute",
      tags: ["distance", "implantation", "limite", "fenêtre", "séparation", "marge"],
      technicalChecks: [
        "Vérifier les marges minimales (avant, latérales, arrière) de votre zone",
        "Identifier les ouvertures non protégées sur les murs extérieurs",
        "Évaluer les exigences de protection incendie selon la distance",
        "Considérer les servitudes existantes sur le terrain",
        "Vérifier les règles spécifiques pour les bâtiments accessoires"
      ],
      commonMistakes: [
        "Ignorer les servitudes ou empiètements existants",
        "Sous-estimer l'impact des fenêtres sur les distances requises",
        "Oublier de vérifier les règles pour les garages et remises"
      ],
      consultPro: [
        "Si vous souhaitez construire proche des limites de propriété",
        "Si vous avez des fenêtres face à un voisin proche",
        "Si une servitude ou un droit de passage existe"
      ],
      searchSuggestions: [
        "Recherche officielle : marges implantation résidentiel Québec",
        "Recherche officielle : séparation spatiale bâtiment CNB"
      ]
    },
    {
      id: "S3",
      question: "Épaisseur minimale d'une dalle de béton sur sol?",
      reponse:
        "L'épaisseur et l'armature dépendent de l'usage (résidentiel vs charges plus élevées), du sol, du drainage et de la présence d'un garage (charges ponctuelles). Un bon point de départ: viser une dalle dimensionnée pour les charges prévues et validée si le sol est incertain.",
      importance: "haute",
      tags: ["béton", "dalle", "fondation", "garage", "structure"],
      technicalChecks: [
        "Évaluer la capacité portante du sol",
        "Prévoir une membrane pare-vapeur sous la dalle",
        "Planifier le drainage périphérique et sous-dalle si nécessaire",
        "Dimensionner l'armature selon l'usage prévu",
        "Prévoir les joints de contrôle aux bons intervalles",
        "Vérifier la résistance du béton requise (MPa)"
      ],
      commonMistakes: [
        "Couler sur un sol mal compacté ou instable",
        "Omettre l'isolation sous la dalle en climat froid",
        "Négliger le drainage, causant des problèmes d'humidité"
      ],
      consultPro: [
        "Si le sol est argileux, organique ou incertain",
        "Si vous prévoyez des charges lourdes (atelier, stationnement)",
        "Si la nappe phréatique est haute"
      ],
      searchSuggestions: [
        "Recherche officielle : dalle béton résidentiel exigences Québec",
        "Recherche officielle : CSA A23.3 béton calcul ouvrages"
      ]
    },
    {
      id: "S4",
      question: "Quelle est la charge admissible pour un plancher résidentiel?",
      reponse:
        "Les planchers résidentiels sont dimensionnés pour supporter un poids minimum d'occupation (personnes, mobilier). Les balcons et escaliers ont des exigences différentes. Les charges permanentes (poids des matériaux) s'ajoutent aux charges d'occupation.",
      importance: "haute",
      tags: ["plancher", "charge", "résidentiel", "structure", "solives"],
      technicalChecks: [
        "Dimensionner les solives selon la portée et l'espacement",
        "Vérifier les charges additionnelles (bain, piano, bibliothèque)",
        "S'assurer que le support des murs porteurs est adéquat",
        "Considérer les ouvertures (escaliers, trappes) dans le calcul",
        "Vérifier la flèche maximale permise pour le confort"
      ],
      commonMistakes: [
        "Sous-dimensionner pour des charges ponctuelles lourdes",
        "Créer des ouvertures sans renforcer la structure",
        "Négliger le calcul de la flèche (plancher qui \"rebondit\")"
      ],
      consultPro: [
        "Si vous modifiez la structure existante",
        "Si vous prévoyez des charges lourdes localisées",
        "Pour le calcul des portées longues"
      ],
      searchSuggestions: [
        "Recherche officielle : charges plancher résidentiel CNB",
        "Recherche officielle : dimensionnement solives bois Québec"
      ]
    }
  ],
  securite: [
    {
      id: "SEC1",
      question: "Hauteur minimale des garde-corps (balcon/terrasse/escalier)?",
      reponse:
        "Le principe: plus la hauteur de chute est importante, plus les exigences de garde-corps sont strictes. Typiquement, les balcons/terrasses demandent une hauteur de garde-corps plus grande que certains escaliers intérieurs. Autre point clé: les ouvertures doivent limiter le risque qu'un enfant passe à travers.",
      importance: "critique",
      tags: ["garde-corps", "balcon", "terrasse", "escalier", "sécurité", "balustre", "rampe"],
      technicalChecks: [
        "Mesurer la hauteur de chute depuis le plancher au sol en dessous",
        "Vérifier que les barreaux ou panneaux ne permettent pas le passage d'un enfant",
        "S'assurer de la solidité des ancrages dans la structure",
        "Vérifier que le haut du garde-corps est continu et permet une bonne prise",
        "Confirmer que le garde-corps résiste aux charges latérales requises"
      ],
      commonMistakes: [
        "Installer des barreaux horizontaux qui permettent l'escalade",
        "Sous-estimer les charges latérales que le garde-corps doit supporter",
        "Négliger l'ancrage dans des matériaux peu résistants"
      ],
      consultPro: [
        "Si la hauteur de chute dépasse un étage",
        "Si vous utilisez des matériaux non conventionnels (câbles, verre)",
        "Pour les garde-corps de piscine ou spa"
      ],
      searchSuggestions: [
        "Recherche officielle : garde-corps résidentiel exigences Québec",
        "Recherche officielle : sécurité balcon terrasse CNB"
      ]
    },
    {
      id: "SEC2",
      question: "Quand faut-il une main courante?",
      reponse:
        "Le principe: une main courante est requise dès que l'escalier présente un risque de chute (nombre de marches, largeur, usage). En autoconstruction, on oublie souvent la continuité, la solidité des ancrages et la prise en main (forme) — pas seulement la présence.",
      importance: "haute",
      tags: ["main courante", "escalier", "rampe", "sécurité"],
      technicalChecks: [
        "Vérifier la forme et le diamètre pour une bonne prise en main",
        "S'assurer de la continuité sur toute la volée",
        "Prévoir les prolongements aux extrémités (haut et bas)",
        "Vérifier la solidité des ancrages muraux ou des poteaux",
        "S'assurer que la hauteur de la main courante est appropriée"
      ],
      commonMistakes: [
        "Installer une main courante trop haute ou trop basse",
        "Négliger les prolongements aux extrémités",
        "Utiliser une forme de main courante difficile à saisir"
      ],
      consultPro: [
        "Pour les escaliers commerciaux ou à fort achalandage",
        "Si vous utilisez des matériaux spéciaux (verre, câbles)",
        "Pour les escaliers hélicoïdaux ou à géométrie complexe"
      ],
      searchSuggestions: [
        "Recherche officielle : main courante escalier exigences Québec",
        "Recherche officielle : accessibilité escalier norme CNB"
      ]
    },
    {
      id: "SEC3",
      question: "Détecteurs de fumée: où et comment les installer?",
      reponse:
        "En résidentiel, l'approche typique: au moins un par niveau, près des chambres, et idéalement interconnectés pour que l'alarme se propage. La position (plafond/mur), l'alimentation et la compatibilité entre appareils comptent autant que le nombre.",
      importance: "critique",
      tags: ["fumée", "détecteur", "alarme", "incendie", "sécurité", "avertisseur"],
      technicalChecks: [
        "Installer au plafond ou proche du plafond sur un mur",
        "Éviter les zones de courants d'air (ventilation, fenêtres)",
        "Interconnecter les détecteurs pour alerte simultanée",
        "Prévoir l'accès pour les tests et le remplacement des piles",
        "Vérifier la compatibilité entre détecteurs de différentes marques"
      ],
      commonMistakes: [
        "Installer trop près des cuisines (fausses alarmes fréquentes)",
        "Oublier d'interconnecter quand plusieurs détecteurs sont requis",
        "Ne pas remplacer les détecteurs à la fin de leur durée de vie"
      ],
      consultPro: [
        "Pour les grands logements ou configurations complexes",
        "Si vous intégrez un système d'alarme centralisé",
        "Pour les logements accessoires ou multi-résidentiels"
      ],
      searchSuggestions: [
        "Recherche officielle : avertisseur fumée résidentiel RBQ Québec",
        "Recherche officielle : détecteur fumée exigences CNB"
      ]
    },
    {
      id: "SEC4",
      question: "Combien de sorties de secours sont requises?",
      reponse:
        "Le nombre de sorties dépend de la superficie, du nombre d'occupants et de la présence de gicleurs. En résidentiel unifamilial, une seule sortie principale suffit généralement, mais les sous-sols aménagés et chambres au sous-sol peuvent avoir des exigences particulières.",
      importance: "critique",
      tags: ["sortie", "évacuation", "secours", "incendie", "sécurité"],
      technicalChecks: [
        "Vérifier les exigences pour les chambres au sous-sol (fenêtre d'évacuation)",
        "S'assurer que les portes de sortie s'ouvrent vers l'extérieur",
        "Prévoir un éclairage de secours si requis",
        "Vérifier les distances de parcours jusqu'aux sorties",
        "S'assurer que les sorties ne sont pas obstruées"
      ],
      commonMistakes: [
        "Aménager une chambre au sous-sol sans fenêtre d'évacuation",
        "Bloquer les sorties avec du rangement",
        "Installer des serrures difficiles à ouvrir de l'intérieur"
      ],
      consultPro: [
        "Pour les sous-sols aménagés avec chambres",
        "Pour les duplex, triplex ou multi-logements",
        "Si le bâtiment a plus de 2 étages"
      ],
      searchSuggestions: [
        "Recherche officielle : issues secours résidentiel CNB",
        "Recherche officielle : fenêtre évacuation sous-sol Québec"
      ]
    },
    {
      id: "SEC5",
      question: "Résistance au feu des séparations entre logements ou garage?",
      reponse:
        "Les séparations coupe-feu limitent la propagation du feu entre espaces. Entre un garage et le logement, ou entre deux logements contigus, des exigences de résistance au feu s'appliquent, incluant les portes, plafonds et murs.",
      importance: "critique",
      tags: ["feu", "séparation", "coupe-feu", "résistance", "incendie", "garage"],
      technicalChecks: [
        "Vérifier la continuité de la séparation (du plancher au toit ou plafond)",
        "S'assurer que les pénétrations (fils, tuyaux) sont scellées",
        "Installer des portes à fermeture automatique entre garage et logement",
        "Vérifier les exigences pour le plafond du garage sous un logement",
        "S'assurer que les matériaux ont les certifications appropriées"
      ],
      commonMistakes: [
        "Créer des ouvertures non protégées dans la séparation",
        "Oublier la porte coupe-feu entre garage et maison",
        "Ne pas sceller les pénétrations mécaniques et électriques"
      ],
      consultPro: [
        "Pour les constructions jumelées ou en rangée",
        "Si vous ajoutez un logement accessoire",
        "Pour les garages sous des espaces habitables"
      ],
      searchSuggestions: [
        "Recherche officielle : séparation coupe-feu garage logement Québec",
        "Recherche officielle : résistance au feu mur CNB"
      ]
    }
  ],
  escaliers: [
    {
      id: "ESC1",
      question: "Dimensions typiques des marches d'escalier (giron/contremarche)?",
      reponse:
        "Le principe: confort + sécurité = marches régulières (uniformité) et proportions adaptées. Les erreurs fréquentes sont les variations d'une marche à l'autre, ou un giron trop court. Vérifiez aussi la hauteur libre et l'espace de tête.",
      importance: "haute",
      tags: ["escalier", "marche", "giron", "contremarche", "uniformité", "dimension"],
      technicalChecks: [
        "Calculer la hauteur totale à franchir avec précision",
        "Appliquer la formule de confort (2 × hauteur + giron)",
        "Vérifier l'uniformité des marches (écart maximal de quelques mm)",
        "Prévoir le nez de marche si applicable",
        "S'assurer que le giron offre une surface d'appui suffisante"
      ],
      commonMistakes: [
        "Première ou dernière marche de hauteur différente",
        "Giron trop court pour le pied",
        "Ne pas tenir compte de l'épaisseur du revêtement de finition"
      ],
      consultPro: [
        "Pour les escaliers à limon central ou hélicoïdaux",
        "Si l'espace est très contraint",
        "Pour les escaliers de bois sur mesure"
      ],
      searchSuggestions: [
        "Recherche officielle : dimensions marches escalier résidentiel Québec",
        "Recherche officielle : calcul escalier norme CNB"
      ]
    },
    {
      id: "ESC2",
      question: "Hauteur libre minimale dans un escalier: quoi vérifier?",
      reponse:
        "Le principe: personne ne doit se cogner la tête sur toute la ligne de foulée. Les points à vérifier: dessous de poutres, luminaires, retombées de plafond, et portes qui s'ouvrent sur l'escalier.",
      importance: "haute",
      tags: ["hauteur libre", "escalier", "dégagement", "plafond"],
      technicalChecks: [
        "Mesurer la hauteur libre à chaque point de la ligne de foulée",
        "Vérifier les obstacles: poutres, conduits, luminaires",
        "S'assurer que les portes n'empiètent pas sur l'espace requis",
        "Prévoir les finitions de plafond dans le calcul",
        "Vérifier au niveau des paliers intermédiaires"
      ],
      commonMistakes: [
        "Oublier une poutre ou un conduit dans le parcours",
        "Ne pas anticiper l'épaisseur du revêtement de plafond",
        "Placer un luminaire qui réduit la hauteur libre"
      ],
      consultPro: [
        "Pour les escaliers sous combles ou toits en pente",
        "Si vous rénovez et modifiez la structure existante",
        "Pour les escaliers vers sous-sol avec faible hauteur"
      ],
      searchSuggestions: [
        "Recherche officielle : hauteur libre escalier CNB",
        "Recherche officielle : dégagement vertical escalier résidentiel"
      ]
    },
    {
      id: "ESC3",
      question: "Escalier extérieur: quelles précautions de conception?",
      reponse:
        "En extérieur, il faut anticiper l'eau, le gel, et l'entretien: drainage, surfaces antidérapantes, nez de marche non glissants, et protection des assemblages. La main courante et l'éclairage deviennent souvent plus importants qu'en intérieur.",
      importance: "moyenne",
      tags: ["escalier extérieur", "gel", "drainage", "antidérapant", "sécurité"],
      technicalChecks: [
        "Prévoir une pente pour l'évacuation de l'eau sur chaque marche",
        "Utiliser des matériaux résistants au gel-dégel",
        "Installer des surfaces antidérapantes",
        "Protéger les assemblages métalliques de la corrosion",
        "Prévoir un éclairage extérieur adéquat"
      ],
      commonMistakes: [
        "Utiliser des matériaux qui deviennent glissants mouillés",
        "Négliger le drainage et l'accumulation de glace",
        "Sous-dimensionner les ancrages pour les charges de neige"
      ],
      consultPro: [
        "Pour les escaliers en acier ou métaux exposés",
        "Si l'escalier est long ou à fort dénivelé",
        "Pour les zones à forte exposition (vent, sel de déglaçage)"
      ],
      searchSuggestions: [
        "Recherche officielle : escalier extérieur sécurité Québec",
        "Recherche officielle : antidérapant escalier norme"
      ]
    }
  ],
  isolation: [
    {
      id: "ISO1",
      question: "Isolation des murs: comment décider quoi viser?",
      reponse:
        "Le principe: l'objectif n'est pas seulement la valeur d'isolant, mais un ensemble performant (étanchéité à l'air, pare-air, gestion de la vapeur, ponts thermiques). Le bon niveau dépend de la zone climatique, du type de mur et de vos objectifs de confort/énergie.",
      importance: "moyenne",
      tags: ["isolation", "mur", "pare-air", "pare-vapeur", "pont thermique", "RSI"],
      technicalChecks: [
        "Identifier votre zone climatique (degrés-jours)",
        "Planifier la continuité du pare-air sur toute l'enveloppe",
        "Positionner correctement le pare-vapeur (côté chaud)",
        "Minimiser les ponts thermiques (ossature, fenêtres, fondations)",
        "Considérer l'ajout d'isolation extérieure pour performance accrue",
        "Vérifier la compatibilité des matériaux (condensation)"
      ],
      commonMistakes: [
        "Installer le pare-vapeur du mauvais côté",
        "Créer des ponts thermiques avec l'ossature",
        "Négliger l'étanchéité à l'air autour des fenêtres"
      ],
      consultPro: [
        "Pour les murs à double ossature ou haute performance",
        "Si vous utilisez de l'isolation extérieure",
        "Pour les rénovations de murs existants"
      ],
      searchSuggestions: [
        "Recherche officielle : isolation mur résidentiel Québec zone climatique",
        "Recherche officielle : pare-vapeur pare-air enveloppe CNB"
      ]
    },
    {
      id: "ISO2",
      question: "Isolation du toit/entretoit: erreurs fréquentes?",
      reponse:
        "Erreur fréquente: bloquer la ventilation de l'entretoit avec l'isolant ou négliger l'étanchéité à l'air au plafond. Pensez: déflecteurs, continuité du pare-air, scellage des pénétrations, et ventilation adéquate.",
      importance: "moyenne",
      tags: ["toit", "entretoit", "ventilation", "isolant", "étanchéité", "comble"],
      technicalChecks: [
        "Installer des déflecteurs pour maintenir la ventilation sous le toit",
        "Sceller le plafond (luminaires, trappes, cheminées)",
        "Prévoir une ventilation équilibrée (soffites et faîte)",
        "Vérifier que l'isolant ne bloque pas la circulation d'air",
        "Atteindre les niveaux d'isolation recommandés pour votre région"
      ],
      commonMistakes: [
        "Bloquer les soffites avec l'isolant soufflé",
        "Oublier de sceller la trappe d'accès au grenier",
        "Installer des luminaires encastrés non IC dans l'isolant"
      ],
      consultPro: [
        "Pour les toits cathédrale ou à faible pente",
        "Si vous constatez de la condensation ou du givre",
        "Pour les conversions de greniers en espace habitable"
      ],
      searchSuggestions: [
        "Recherche officielle : ventilation entretoit exigences Québec",
        "Recherche officielle : isolation comble toiture CNB"
      ]
    },
    {
      id: "ISO3",
      question: "Isolation des fondations: que vérifier?",
      reponse:
        "Le principe: limiter les pertes et la condensation. Points clés: gestion de l'humidité, continuité de l'isolation, et compatibilité des matériaux avec un sous-sol (murs froids). Les détails au pied de mur et autour des solives de rive sont souvent critiques.",
      importance: "moyenne",
      tags: ["fondation", "sous-sol", "humidité", "condensation", "isolation"],
      technicalChecks: [
        "Imperméabiliser l'extérieur des murs de fondation",
        "Prévoir un drainage périphérique efficace",
        "Isoler avec des matériaux résistants à l'humidité",
        "Traiter les ponts thermiques à la solive de rive",
        "Gérer la vapeur selon que l'isolation est intérieure ou extérieure"
      ],
      commonMistakes: [
        "Isoler un sous-sol qui a des problèmes d'infiltration d'eau",
        "Utiliser des matériaux sensibles à l'humidité",
        "Créer une barrière vapeur double (condensation piégée)"
      ],
      consultPro: [
        "Si le sous-sol montre des signes d'infiltration",
        "Pour l'isolation extérieure des fondations",
        "Pour les sous-sols à aménager en espace habitable"
      ],
      searchSuggestions: [
        "Recherche officielle : isolation fondation sous-sol Québec",
        "Recherche officielle : imperméabilisation mur fondation"
      ]
    },
    {
      id: "ISO4",
      question: "Pare-vapeur: où le placer et pourquoi?",
      reponse:
        "Le pare-vapeur contrôle la migration de l'humidité à travers les murs. En climat froid, il se place du côté chaud (intérieur). Un mauvais positionnement peut causer de la condensation dans le mur, menant à des moisissures et de la dégradation.",
      importance: "haute",
      tags: ["pare-vapeur", "humidité", "condensation", "moisissure", "isolation"],
      technicalChecks: [
        "Installer du côté chaud de l'isolant (intérieur en climat froid)",
        "Sceller tous les joints et les pénétrations",
        "Ne pas perforer inutilement après l'installation",
        "Coordonner avec le pare-air pour éviter les conflits",
        "Éviter de créer deux pare-vapeurs (un de chaque côté)"
      ],
      commonMistakes: [
        "Placer le pare-vapeur du mauvais côté du mur",
        "Utiliser du polyéthylène sur des murs extérieurs isolés en mousse",
        "Ne pas sceller autour des boîtes électriques"
      ],
      consultPro: [
        "Pour les assemblages de murs non conventionnels",
        "Si vous combinez isolation intérieure et extérieure",
        "Pour les rénovations de vieux bâtiments"
      ],
      searchSuggestions: [
        "Recherche officielle : pare-vapeur installation Québec",
        "Recherche officielle : contrôle humidité mur résidentiel CNB"
      ]
    }
  ],
  plomberie: [
    {
      id: "PL1",
      question: "Ventilation de plomberie: pourquoi c'est important?",
      reponse:
        "Le principe: éviter le désiphonnage des siphons et les odeurs. En autoconstruction, on se trompe souvent de diamètre, de pente, ou on crée trop de coudes. Un plan de plomberie validé évite beaucoup de reprises.",
      importance: "haute",
      tags: ["plomberie", "vent", "siphon", "odeur", "drain", "event"],
      technicalChecks: [
        "S'assurer que chaque appareil a un évent adéquat",
        "Respecter les diamètres minimaux des colonnes de ventilation",
        "Vérifier les distances maximales entre siphon et évent",
        "Éviter les configurations qui peuvent se bloquer (gel, débris)",
        "S'assurer que l'évent débouche au-dessus du toit"
      ],
      commonMistakes: [
        "Omettre l'évent sur un appareil éloigné",
        "Sous-dimensionner la colonne de ventilation",
        "Terminer l'évent trop proche de fenêtres ou prises d'air"
      ],
      consultPro: [
        "Pour les configurations de plomberie complexes",
        "Si vous ajoutez des appareils à une installation existante",
        "Pour les systèmes à valves d'admission d'air (AAV)"
      ],
      searchSuggestions: [
        "Recherche officielle : ventilation plomberie résidentielle Québec",
        "Recherche officielle : code plomberie évent siphon"
      ]
    },
    {
      id: "PL2",
      question: "Drainage autour des fondations: quoi prioriser?",
      reponse:
        "Le principe: éloigner l'eau du bâtiment. Les priorités typiques: pente du terrain, gouttières et rallonges, drainage périphérique si applicable, et gestion des eaux de surface. Un bon drainage réduit risques de moisissures et fissures.",
      importance: "haute",
      tags: ["drainage", "fondation", "eau", "gouttière", "humidité", "drain français"],
      technicalChecks: [
        "Créer une pente du terrain éloignant l'eau de la fondation",
        "Installer des gouttières avec rallonges (min 1.5m de la maison)",
        "Vérifier le drain français périphérique (si existant)",
        "S'assurer que le puisard et la pompe fonctionnent",
        "Imperméabiliser l'extérieur des murs de fondation"
      ],
      commonMistakes: [
        "Laisser le terrain en pente vers la maison",
        "Déverser les gouttières trop proche des fondations",
        "Négliger l'entretien du drain français avec le temps"
      ],
      consultPro: [
        "Si vous avez des infiltrations d'eau récurrentes",
        "Pour l'installation d'un nouveau drain français",
        "Si la nappe phréatique est haute"
      ],
      searchSuggestions: [
        "Recherche officielle : drainage fondation résidentielle Québec",
        "Recherche officielle : imperméabilisation sous-sol"
      ]
    }
  ],
  electricite: [
    {
      id: "EL1",
      question: "Prises électriques: bonnes pratiques de placement?",
      reponse:
        "Les exigences exactes varient selon la pièce et le contexte, mais l'idée générale est de réduire l'usage de rallonges, protéger près de l'eau, et prévoir les charges (cuisine, atelier). Planifiez tôt: comptoirs, îlot, vanités et zones TV.",
      importance: "moyenne",
      tags: ["électricité", "prise", "cuisine", "salle de bain", "sécurité", "DDFT"],
      technicalChecks: [
        "Prévoir des prises le long des murs à intervalles réguliers",
        "Installer des circuits dédiés pour les gros appareils",
        "Utiliser des prises DDFT/GFCI près de l'eau",
        "Prévoir suffisamment de prises sur les comptoirs de cuisine",
        "Considérer les besoins futurs (véhicule électrique, atelier)"
      ],
      commonMistakes: [
        "Sous-estimer le nombre de prises nécessaires",
        "Oublier les prises DDFT dans les zones humides",
        "Ne pas prévoir de circuits dédiés pour les gros appareils"
      ],
      consultPro: [
        "Pour les installations de plus de 200A",
        "Pour l'ajout de circuits dans une installation existante",
        "Pour les ateliers ou usages commerciaux"
      ],
      searchSuggestions: [
        "Recherche officielle : code électrique prises résidentielles Québec",
        "Recherche officielle : DDFT GFCI exigences installation"
      ]
    },
    {
      id: "EL2",
      question: "Tableau électrique: dimensionnement et évolutivité?",
      reponse:
        "Le principe: un panneau adapté aux charges actuelles et futures (thermopompe, chargeur EV, atelier). En autoconstruction, on sous-estime souvent les circuits dédiés et la place pour expansions.",
      importance: "haute",
      tags: ["panneau", "tableau", "circuits", "charge", "électricité", "ampères"],
      technicalChecks: [
        "Calculer la charge totale prévue (chauffage, climatisation, appareils)",
        "Prévoir des espaces libres pour futurs circuits",
        "Planifier l'emplacement accessible du panneau",
        "Considérer un panneau de 200A pour les maisons neuves",
        "Prévoir les circuits dédiés requis (cuisine, buanderie, garage)"
      ],
      commonMistakes: [
        "Installer un panneau trop petit pour les besoins futurs",
        "Ne pas prévoir de circuit pour le chargeur de véhicule électrique",
        "Surcharger des circuits existants plutôt que d'en ajouter"
      ],
      consultPro: [
        "Pour le dimensionnement du service d'entrée",
        "Si vous convertissez au chauffage électrique",
        "Pour les installations de plus de 200A"
      ],
      searchSuggestions: [
        "Recherche officielle : panneau électrique résidentiel capacité Québec",
        "Recherche officielle : code électrique circuits dédiés"
      ]
    }
  ],
  ventilation: [
    {
      id: "V1",
      question: "VRC/échangeur d'air: comment le penser?",
      reponse:
        "Le principe: assurer une qualité d'air stable et contrôler l'humidité. Vérifiez: débits par pièce, équilibrage, prises et rejets bien positionnés, et entretien accessible. L'étanchéité de l'enveloppe influence fortement les besoins.",
      importance: "haute",
      tags: ["vrc", "échangeur", "ventilation", "humidité", "air", "qualité"],
      technicalChecks: [
        "Dimensionner selon le nombre de chambres et la superficie",
        "Prévoir des prises d'air dans toutes les pièces principales",
        "Placer les bouches d'extraction dans les salles de bain et cuisine",
        "Équilibrer les débits d'alimentation et d'extraction",
        "Installer des conduits isolés dans les espaces non chauffés",
        "Prévoir un accès facile pour l'entretien des filtres"
      ],
      commonMistakes: [
        "Sous-dimensionner le VRC pour la maison",
        "Installer sans équilibrer les débits",
        "Négliger l'isolation des conduits dans l'entretoit"
      ],
      consultPro: [
        "Pour le calcul des débits et le dimensionnement",
        "Pour les maisons très étanches à l'air",
        "Si vous constatez des problèmes de condensation"
      ],
      searchSuggestions: [
        "Recherche officielle : VRC ventilation résidentielle Québec exigences",
        "Recherche officielle : qualité air intérieur habitation CNB"
      ]
    },
    {
      id: "V2",
      question: "Salle de bain: ventilation efficace?",
      reponse:
        "Le principe: extraire l'humidité à la source pour éviter moisissures. Points clés: conduit le plus court possible, clapet adéquat, isolation du conduit en zones froides et sortie extérieure bien étanche.",
      importance: "moyenne",
      tags: ["salle de bain", "ventilateur", "humidité", "moisissure", "conduit", "extraction"],
      technicalChecks: [
        "Choisir un ventilateur de capacité suffisante (CFM selon superficie)",
        "Tracer le conduit le plus court et le plus droit possible",
        "Installer un clapet anti-retour pour éviter l'air froid",
        "Isoler le conduit dans les espaces non chauffés",
        "Terminer avec un capuchon d'évacuation extérieur étanche"
      ],
      commonMistakes: [
        "Évacuer dans l'entretoit plutôt qu'à l'extérieur",
        "Utiliser un conduit trop long ou avec trop de coudes",
        "Ne pas isoler le conduit dans l'entretoit"
      ],
      consultPro: [
        "Pour les salles de bain sans fenêtre",
        "Si vous constatez de la condensation ou moisissure récurrente",
        "Pour les grands espaces (salle de bain principale avec douche séparée)"
      ],
      searchSuggestions: [
        "Recherche officielle : ventilateur salle de bain exigences Québec",
        "Recherche officielle : extraction humidité résidentielle"
      ]
    }
  ],
  fenestration: [
    {
      id: "FEN1",
      question: "Fenêtres: quoi regarder au-delà du prix?",
      reponse:
        "Le principe: performance + étanchéité + installation. Regardez: performance thermique, qualité des coupe-froid, drainage de l'eau, compatibilité avec le pare-air, et détail d'installation (solins). Une bonne fenêtre mal posée performe mal.",
      importance: "moyenne",
      tags: ["fenêtre", "porte", "étanchéité", "solin", "performance", "thermique"],
      technicalChecks: [
        "Vérifier le coefficient U et le facteur de gain solaire",
        "S'assurer de la certification ENERGY STAR pour votre zone",
        "Planifier l'intégration au pare-air de l'enveloppe",
        "Prévoir les solins et membranes autour du cadre",
        "Vérifier le système de drainage de la fenêtre"
      ],
      commonMistakes: [
        "Choisir des fenêtres non adaptées à la zone climatique",
        "Négliger l'installation et l'étanchéité du pourtour",
        "Oublier d'intégrer la fenêtre au pare-air continu"
      ],
      consultPro: [
        "Pour les fenêtres de grande dimension",
        "Pour les puits de lumière et fenêtres de toit",
        "Si vous remplacez des fenêtres dans un mur isolé"
      ],
      searchSuggestions: [
        "Recherche officielle : performance fenêtres ENERGY STAR Québec",
        "Recherche officielle : installation fenêtre étanchéité air"
      ]
    },
    {
      id: "FEN2",
      question: "Fenêtres d'évacuation (chambres): quelles dimensions?",
      reponse:
        "Les chambres à coucher doivent avoir une fenêtre permettant l'évacuation d'urgence. L'ouverture doit être assez grande pour qu'une personne puisse sortir, et le rebord ne doit pas être trop haut. Particulièrement important pour les chambres au sous-sol.",
      importance: "haute",
      tags: ["fenêtre", "évacuation", "urgence", "chambre", "sous-sol", "sécurité"],
      technicalChecks: [
        "Vérifier que l'ouverture libre est suffisante",
        "S'assurer que la hauteur du rebord est accessible",
        "Prévoir une margelle dégagée si au sous-sol",
        "S'assurer que la fenêtre s'ouvre facilement de l'intérieur",
        "Vérifier l'absence d'obstruction à l'extérieur"
      ],
      commonMistakes: [
        "Installer une fenêtre trop petite pour l'évacuation",
        "Placer le rebord trop haut pour y accéder",
        "Bloquer l'accès extérieur avec des puits ou margelles trop étroits"
      ],
      consultPro: [
        "Pour les chambres au sous-sol",
        "Si vous rénovez et modifiez les fenêtres existantes",
        "Pour les conversions de greniers en chambres"
      ],
      searchSuggestions: [
        "Recherche officielle : fenêtre évacuation chambre sous-sol Québec",
        "Recherche officielle : issue secours chambre résidentielle CNB"
      ]
    }
  ]
} satisfies Record<string, BuildingCodeEntry[]>;
