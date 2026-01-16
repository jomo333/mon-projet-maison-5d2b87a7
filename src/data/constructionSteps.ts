export interface Task {
  id: string;
  title: string;
  description: string;
  tips?: string[];
  documents?: string[];
}

export interface Step {
  id: string;
  title: string;
  description: string;
  phase: "pre-construction" | "gros-oeuvre" | "second-oeuvre" | "finitions";
  phaseLabel: string;
  icon: string;
  duration: string;
  tasks: Task[];
}

export const constructionSteps: Step[] = [
  // PRÉ-CONSTRUCTION
  {
    id: "planification",
    title: "Planification du projet",
    description: "Définissez vos besoins, votre budget et vos objectifs avant de commencer.",
    phase: "pre-construction",
    phaseLabel: "Pré-construction",
    icon: "ClipboardList",
    duration: "2-4 semaines",
    tasks: [
      {
        id: "besoins",
        title: "Définir vos besoins",
        description: "Listez le nombre de chambres, salles de bain, espaces de rangement et caractéristiques souhaitées.",
        tips: [
          "Pensez à vos besoins futurs (famille qui s'agrandit, télétravail)",
          "Visitez des maisons modèles pour vous inspirer"
        ]
      },
      {
        id: "budget-initial",
        title: "Établir le budget préliminaire",
        description: "Calculez votre capacité financière incluant le terrain, la construction et les imprévus.",
        tips: [
          "Prévoyez 10-15% du budget pour les imprévus",
          "Incluez les frais de branchements (électricité, eau, égouts)"
        ]
      },
      {
        id: "terrain",
        title: "Recherche et achat du terrain",
        description: "Trouvez un terrain qui correspond à vos critères et vérifiez le zonage.",
        tips: [
          "Vérifiez les règlements d'urbanisme de la municipalité",
          "Faites faire une étude de sol avant l'achat"
        ],
        documents: ["Certificat de localisation", "Acte de vente", "Étude géotechnique"]
      }
    ]
  },
  {
    id: "financement",
    title: "Financement",
    description: "Obtenez votre financement et préparez votre montage financier.",
    phase: "pre-construction",
    phaseLabel: "Pré-construction",
    icon: "DollarSign",
    duration: "2-6 semaines",
    tasks: [
      {
        id: "preapprobation",
        title: "Pré-approbation hypothécaire",
        description: "Obtenez une pré-approbation pour connaître votre capacité d'emprunt.",
        tips: [
          "Magasinez plusieurs institutions financières",
          "Les prêts construction ont des conditions particulières"
        ]
      },
      {
        id: "pret-construction",
        title: "Prêt construction",
        description: "Négociez votre prêt construction avec déboursements progressifs.",
        tips: [
          "Les fonds sont débloqués par étapes selon l'avancement",
          "Prévoyez des fonds propres pour les premières dépenses"
        ],
        documents: ["Soumissions des entrepreneurs", "Plans et devis", "Budget détaillé"]
      }
    ]
  },
  {
    id: "plans-permis",
    title: "Plans et permis",
    description: "Faites préparer vos plans et obtenez tous les permis nécessaires.",
    phase: "pre-construction",
    phaseLabel: "Pré-construction",
    icon: "FileText",
    duration: "4-12 semaines",
    tasks: [
      {
        id: "plans-architecture",
        title: "Plans d'architecture",
        description: "Engagez un architecte ou technologue pour dessiner vos plans.",
        tips: [
          "Assurez-vous que les plans sont conformes au Code du bâtiment",
          "Incluez les plans de structure et mécanique"
        ],
        documents: ["Plans d'architecture", "Plans de structure", "Plans mécaniques"]
      },
      {
        id: "permis-construction",
        title: "Demande de permis de construction",
        description: "Soumettez votre demande à la municipalité avec tous les documents requis.",
        tips: [
          "Le délai varie selon les municipalités (2-8 semaines)",
          "Certaines municipalités exigent un engagement d'un professionnel"
        ],
        documents: ["Formulaire de demande", "Plans certifiés", "Certificat de localisation"]
      },
      {
        id: "soumissions",
        title: "Obtenir les soumissions",
        description: "Demandez des soumissions détaillées aux différents corps de métier.",
        tips: [
          "Obtenez au moins 3 soumissions par spécialité",
          "Vérifiez les licences RBQ des entrepreneurs"
        ]
      }
    ]
  },

  // GROS ŒUVRE
  {
    id: "excavation-fondation",
    title: "Excavation et fondation",
    description: "Préparation du terrain et construction des fondations.",
    phase: "gros-oeuvre",
    phaseLabel: "Gros œuvre",
    icon: "Shovel",
    duration: "2-4 semaines",
    tasks: [
      {
        id: "implantation",
        title: "Implantation de la maison",
        description: "L'arpenteur positionne la maison sur le terrain selon les plans.",
        tips: [
          "Respectez les marges de recul exigées",
          "Faites vérifier avant l'excavation"
        ],
        documents: ["Certificat d'implantation"]
      },
      {
        id: "excavation",
        title: "Excavation",
        description: "Creusage pour le sous-sol et installation du drain français.",
        tips: [
          "Prévoyez l'entreposage de la terre excavée",
          "Protégez l'excavation de la pluie"
        ]
      },
      {
        id: "fondation",
        title: "Coulage des fondations",
        description: "Installation des coffrages et coulage du béton pour les semelles et murs.",
        tips: [
          "Cure du béton: attendez au moins 7 jours avant de charger",
          "Imperméabilisez les murs de fondation"
        ]
      },
      {
        id: "drain-remblai",
        title: "Drain et remblai",
        description: "Installation du drain français et remblayage autour des fondations.",
        documents: ["Rapport d'inspection des fondations"]
      }
    ]
  },
  {
    id: "structure",
    title: "Structure et charpente",
    description: "Érection de la structure en bois ou acier de la maison.",
    phase: "gros-oeuvre",
    phaseLabel: "Gros œuvre",
    icon: "Home",
    duration: "2-4 semaines",
    tasks: [
      {
        id: "plancher",
        title: "Plancher du rez-de-chaussée",
        description: "Installation des solives et du sous-plancher.",
        tips: [
          "Protégez le sous-plancher des intempéries durant la construction",
          "Vérifiez le niveau avant de continuer"
        ]
      },
      {
        id: "murs",
        title: "Érection des murs",
        description: "Construction et levage des murs extérieurs et intérieurs porteurs.",
        tips: [
          "Respectez les ouvertures prévues aux plans",
          "Installez les linteaux au-dessus des ouvertures"
        ]
      },
      {
        id: "etage",
        title: "Structure de l'étage",
        description: "Si applicable, construction du plancher et des murs de l'étage.",
      },
      {
        id: "fermes-toit",
        title: "Installation des fermes de toit",
        description: "Pose des fermes préfabriquées ou construction de la charpente traditionnelle.",
        documents: ["Plans de fermes certifiés"]
      },
      {
        id: "pontage",
        title: "Pontage de toit",
        description: "Installation du contreplaqué sur les fermes de toit pour fermer la structure.",
        tips: [
          "Protégez le pontage des intempéries rapidement",
          "Vérifiez l'alignement des panneaux"
        ]
      }
    ]
  },
  {
    id: "toiture",
    title: "Toiture",
    description: "Installation du pontage, membrane et revêtement de toiture.",
    phase: "gros-oeuvre",
    phaseLabel: "Gros œuvre",
    icon: "Umbrella",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "membrane",
        title: "Membrane et bardeaux",
        description: "Pose de la membrane d'étanchéité et des bardeaux d'asphalte ou autre revêtement.",
        tips: [
          "Installez les solins autour des cheminées et évents",
          "La membrane autocollante est requise dans les zones à risque"
        ]
      },
      {
        id: "fascia-soffite",
        title: "Fascia et soffite",
        description: "Installation des bordures de toit et de la ventilation du comble.",
      }
    ]
  },
  {
    id: "fenetres-portes",
    title: "Fenêtres et portes extérieures",
    description: "Installation de la fenestration et des portes pour fermer l'enveloppe.",
    phase: "gros-oeuvre",
    phaseLabel: "Gros œuvre",
    icon: "DoorOpen",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "fenetres",
        title: "Installation des fenêtres",
        description: "Pose des fenêtres avec isolation et étanchéité du pourtour.",
        tips: [
          "Utilisez de la mousse isolante basse expansion",
          "Installez les solins de fenêtre correctement"
        ]
      },
      {
        id: "portes-ext",
        title: "Portes extérieures",
        description: "Installation des portes d'entrée, garage et patio.",
      }
    ]
  },

  // SECOND ŒUVRE
  {
    id: "electricite",
    title: "Électricité",
    description: "Installation du système électrique complet.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Zap",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "entree-electrique",
        title: "Entrée électrique",
        description: "Installation du panneau électrique et branchement Hydro-Québec.",
        tips: [
          "Prévoir suffisamment d'ampérage pour vos besoins futurs",
          "200A est le standard pour une maison moderne"
        ],
        documents: ["Demande de branchement Hydro-Québec"]
      },
      {
        id: "filage",
        title: "Filage brut",
        description: "Passage des fils dans les murs avant la pose du gypse.",
        tips: [
          "Planifiez l'emplacement des prises et interrupteurs",
          "Prévoyez des circuits dédiés (cuisine, salle de lavage)"
        ]
      },
      {
        id: "inspection-electrique",
        title: "Inspection électrique",
        description: "Inspection obligatoire avant de fermer les murs.",
        documents: ["Certificat d'inspection électrique"]
      }
    ]
  },
  {
    id: "plomberie",
    title: "Plomberie",
    description: "Installation des systèmes d'alimentation et d'évacuation d'eau.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Droplets",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "plomberie-brute",
        title: "Plomberie brute",
        description: "Installation des tuyaux d'alimentation et de drainage dans les murs.",
        tips: [
          "Le PEX est plus facile à installer que le cuivre",
          "Respectez les pentes de drainage"
        ]
      },
      {
        id: "chauffe-eau",
        title: "Chauffe-eau",
        description: "Installation du chauffe-eau (électrique, au gaz ou thermopompe).",
      },
      {
        id: "branchements",
        title: "Branchements municipaux",
        description: "Raccordement à l'aqueduc et aux égouts (ou installation septique).",
        documents: ["Permis de branchement", "Test d'étanchéité"]
      }
    ]
  },
  {
    id: "hvac",
    title: "Chauffage et ventilation",
    description: "Installation des systèmes de chauffage, climatisation et ventilation.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Wind",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "chauffage",
        title: "Système de chauffage",
        description: "Installation des plinthes électriques, plancher radiant ou thermopompe.",
        tips: [
          "Calculez les besoins de chauffage par pièce",
          "Une thermopompe peut réduire vos coûts de chauffage"
        ]
      },
      {
        id: "vrc",
        title: "Ventilateur récupérateur de chaleur (VRC)",
        description: "Installation obligatoire pour assurer la qualité de l'air.",
        tips: [
          "Le VRC est obligatoire dans les constructions neuves",
          "Prévoyez des conduits vers chaque pièce"
        ]
      },
      {
        id: "conduits",
        title: "Conduits de ventilation",
        description: "Installation des conduits pour la hotte, sécheuse et salles de bain.",
      }
    ]
  },
  {
    id: "isolation",
    title: "Isolation et pare-vapeur",
    description: "Installation de l'isolation thermique et du pare-vapeur.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Thermometer",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "isolation-murs",
        title: "Isolation des murs",
        description: "Pose de l'isolant dans les murs extérieurs (laine, cellulose ou mousse).",
        tips: [
          "R-24 minimum pour les murs au Québec",
          "Évitez les ponts thermiques"
        ]
      },
      {
        id: "isolation-toit",
        title: "Isolation du toit/comble",
        description: "Isolation du plafond du dernier étage ou de la toiture cathédrale.",
        tips: [
          "R-41 minimum pour les toits au Québec",
          "Maintenez une ventilation adéquate du comble"
        ]
      },
      {
        id: "pare-vapeur",
        title: "Pare-vapeur",
        description: "Installation du polyéthylène 6 mil sur le côté chaud de l'isolant.",
        tips: [
          "Scellez tous les joints et pénétrations",
          "Le test d'infiltrométrie vérifiera l'étanchéité"
        ],
        documents: ["Rapport de test d'infiltrométrie"]
      }
    ]
  },

  // FINITIONS
  {
    id: "gypse",
    title: "Gypse et peinture",
    description: "Finition des murs et plafonds intérieurs.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "PaintBucket",
    duration: "2-4 semaines",
    tasks: [
      {
        id: "pose-gypse",
        title: "Pose du gypse",
        description: "Installation des panneaux de gypse sur tous les murs et plafonds.",
        tips: [
          "Utilisez du gypse résistant à l'humidité dans les salles de bain",
          "Gypse 5/8 pour les plafonds"
        ]
      },
      {
        id: "tirage-joints",
        title: "Tirage de joints",
        description: "Application du composé à joints et sablage pour une finition lisse.",
        tips: [
          "3 couches minimum pour une belle finition",
          "Niveau 4 ou 5 selon la finition désirée"
        ]
      },
      {
        id: "peinture",
        title: "Peinture",
        description: "Application de l'apprêt et de la peinture sur murs et plafonds.",
        tips: [
          "Un bon apprêt est essentiel",
          "Peignez les plafonds avant les murs"
        ]
      }
    ]
  },
  {
    id: "revetements-sol",
    title: "Revêtements de sol",
    description: "Installation des planchers dans toutes les pièces.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "Square",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "plancher-bois",
        title: "Plancher de bois ou stratifié",
        description: "Installation dans les aires de vie.",
        tips: [
          "Acclimatez le bois 48-72h avant l'installation",
          "Laissez un espace d'expansion au périmètre"
        ]
      },
      {
        id: "ceramique",
        title: "Céramique",
        description: "Pose de la céramique dans les salles de bain, cuisine et entrée.",
        tips: [
          "Utilisez une membrane d'étanchéité dans la douche",
          "Prévoyez le chauffage au sol avant la pose"
        ]
      }
    ]
  },
  {
    id: "cuisine-sdb",
    title: "Cuisine et salles de bain",
    description: "Installation des armoires, comptoirs et appareils sanitaires.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "ChefHat",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "armoires",
        title: "Armoires de cuisine et vanités",
        description: "Installation des armoires et meubles-lavabos.",
      },
      {
        id: "comptoirs",
        title: "Comptoirs",
        description: "Installation des comptoirs de cuisine et salle de bain.",
        tips: [
          "Mesurage après l'installation des armoires",
          "Délai de fabrication: 2-4 semaines"
        ]
      },
      {
        id: "appareils-sanitaires",
        title: "Appareils sanitaires",
        description: "Installation des toilettes, lavabos, baignoire et douche.",
      },
      {
        id: "electromenagers",
        title: "Électroménagers",
        description: "Installation et branchement des électroménagers.",
      }
    ]
  },
  {
    id: "finitions-int",
    title: "Finitions intérieures",
    description: "Derniers détails pour compléter l'intérieur.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "Sparkles",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "portes-int",
        title: "Portes intérieures",
        description: "Installation des portes, cadres et quincaillerie.",
      },
      {
        id: "moulures",
        title: "Moulures et plinthes",
        description: "Pose des plinthes, cadrages et moulures décoratives.",
      },
      {
        id: "luminaires",
        title: "Luminaires et accessoires",
        description: "Installation des luminaires, prises finales et interrupteurs.",
      },
      {
        id: "escalier",
        title: "Escalier",
        description: "Finition de l'escalier (marches, contremarches, rampe).",
      }
    ]
  },
  {
    id: "exterieur",
    title: "Revêtement extérieur",
    description: "Finition de l'enveloppe extérieure de la maison.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "Building",
    duration: "2-4 semaines",
    tasks: [
      {
        id: "revetement",
        title: "Revêtement extérieur",
        description: "Installation du parement (vinyle, fibrociment, brique, bois).",
        tips: [
          "Installez une membrane pare-air avant le revêtement",
          "Respectez les espacements de ventilation"
        ]
      },
      {
        id: "balcons-terrasses",
        title: "Balcons et terrasses",
        description: "Construction des balcons, galeries et terrasses.",
      },
      {
        id: "amenagement",
        title: "Aménagement paysager",
        description: "Nivellement final, entrée de garage, gazon et plantations.",
      }
    ]
  },
  {
    id: "inspections-finales",
    title: "Inspections finales",
    description: "Dernières vérifications et obtention du certificat d'occupation.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "ClipboardCheck",
    duration: "1-2 semaines",
    tasks: [
      {
        id: "inspection-municipale",
        title: "Inspection municipale finale",
        description: "Inspection obligatoire pour obtenir le certificat d'occupation.",
        documents: ["Certificat d'occupation"]
      },
      {
        id: "inspection-garantie",
        title: "Inspection pré-réception",
        description: "Inspection complète pour identifier les déficiences.",
        tips: [
          "Engagez un inspecteur indépendant",
          "Documentez tout avec photos"
        ]
      },
      {
        id: "certificat-localisation",
        title: "Certificat de localisation final",
        description: "Nouveau certificat montrant la construction terminée.",
        documents: ["Certificat de localisation final"]
      }
    ]
  }
];

export const phases = [
  { id: "pre-construction", label: "Pré-construction", color: "bg-blue-500" },
  { id: "gros-oeuvre", label: "Gros œuvre", color: "bg-orange-500" },
  { id: "second-oeuvre", label: "Second œuvre", color: "bg-purple-500" },
  { id: "finitions", label: "Finitions", color: "bg-green-500" },
];
