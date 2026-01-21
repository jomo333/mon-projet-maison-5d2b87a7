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
    duration: "4-5 jours",
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
      },
      {
        id: "preapprobation-planification",
        title: "Pré-approbation hypothécaire",
        description: "Obtenez une pré-approbation de votre institution financière pour connaître votre capacité d'emprunt maximale.",
        tips: [
          "Comparez les offres de plusieurs banques et courtiers",
          "Une pré-approbation est généralement valide 90 à 120 jours",
          "Préparez vos preuves de revenus et relevés bancaires"
        ],
        documents: ["Talons de paie", "Avis de cotisation", "Relevés bancaires"]
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
    duration: "3 semaines",
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
        id: "test-sol",
        title: "Test de sol (étude géotechnique)",
        description: "Faites réaliser une étude géotechnique pour déterminer la capacité portante du sol et le type de fondation requis.",
        tips: [
          "Obligatoire pour obtenir le permis dans plusieurs municipalités",
          "Permet de déterminer le type de fondation approprié",
          "Identifie les risques de nappe phréatique élevée"
        ],
        documents: ["Rapport géotechnique", "Recommandations de fondation"]
      },
      {
        id: "services-publics",
        title: "Validation des services (eau, égouts)",
        description: "Vérifiez la disponibilité des services municipaux (aqueduc, égouts) ou planifiez les installations privées (puits, fosse septique, champ d'épuration).",
        tips: [
          "Contactez la municipalité pour connaître les services disponibles",
          "Si hors réseau: prévoir étude de sol pour installation septique",
          "Le champ d'épuration nécessite une superficie de terrain adéquate",
          "Un puits artésien peut nécessiter plusieurs forages"
        ],
        documents: ["Certificat de conformité septique", "Permis d'installation septique", "Analyse d'eau (puits)"]
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
      }
    ]
  },
  {
    id: "soumissions",
    title: "Soumissions",
    description: "Obtenez et comparez les soumissions des différents corps de métier.",
    phase: "pre-construction",
    phaseLabel: "Pré-construction",
    icon: "FileCheck",
    duration: "2-3 semaines",
    tasks: [
      {
        id: "obtenir-soumissions",
        title: "Obtenir les soumissions",
        description: "Demandez des soumissions détaillées aux différents corps de métier.",
        tips: [
          "Obtenez au moins 3 soumissions par spécialité",
          "Ne choisissez pas uniquement sur le prix le plus bas — utilisez l'analyse IA pour vous aider à comparer",
          "Vérifiez les références des entrepreneurs",
          "Demandez des preuves d'assurance responsabilité",
          "Vérifiez les licences RBQ des entrepreneurs (https://www.rbq.gouv.qc.ca/vous-etes/citoyen/verifier-la-licence-dun-entrepreneur/)",
          "Comparez les garanties et délais proposés"
        ],
        documents: ["Soumissions signées", "Preuves d'assurance", "Licences RBQ"]
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
    duration: "2 semaines",
    tasks: [
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

  // GROS ŒUVRE
  {
    id: "excavation-fondation",
    title: "Excavation et fondation",
    description: "Préparation du terrain et construction des fondations.",
    phase: "gros-oeuvre",
    phaseLabel: "Gros œuvre",
    icon: "Shovel",
    duration: "2 semaines",
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
        description: "Creusage pour le sous-sol et préparation du terrain.",
        tips: [
          "Prévoyez l'entreposage de la terre excavée ou prévoir un budget de transport",
          "Protégez l'excavation de la pluie et prévoyez une pompe pour évacuer l'eau en cas de forte pluie"
        ]
      },
      {
        id: "fondation",
        title: "Coulage des fondations",
        description: "Installation des coffrages et coulage du béton pour les semelles et murs.",
        tips: [
          "Cure du béton: attendez au moins 21 jours avant de charger",
          "Imperméabilisez les murs de fondation avec une membrane goudronnée ou membrane Delta-MS pour une imperméabilisation optimale"
        ]
      },
      {
        id: "drain-remblai",
        title: "Drain et remblai",
        description: "Installation du drain français et remblayage autour des fondations.",
        tips: [
          "Utilisez un drain de PVC perforé avec des cheminées pour un drainage durable et facile d'entretien"
        ],
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
    duration: "2 semaines",
    tasks: [
      {
        id: "plancher",
        title: "Plancher du rez-de-chaussée",
        description: "Installation des solives et du sous-plancher.",
        tips: [
          "Protégez le sous-plancher des intempéries durant la construction",
          "Vérifiez le niveau avant de continuer",
          "Utilisez des poutrelles ajourées pour faciliter le passage des fils électriques et des conduits de plomberie"
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
        tips: [
          "Utilisez des poutrelles ajourées pour faciliter le passage des fils électriques et des conduits de plomberie"
        ]
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
      },
      {
        id: "etancheite",
        title: "Étanchéité",
        description: "Installation des membranes d'étanchéité et protection contre les infiltrations.",
        tips: [
          "Assurez-vous que toutes les jonctions sont bien scellées",
          "Vérifiez l'étanchéité autour des ouvertures (fenêtres, portes)"
        ]
      }
    ]
  },
  {
    id: "toiture",
    title: "Toiture",
    description: "Installation de la membrane et du revêtement de toiture.",
    phase: "gros-oeuvre",
    phaseLabel: "Gros œuvre",
    icon: "Umbrella",
    duration: "2 jours",
    tasks: [
      {
        id: "membrane",
        title: "Membrane et bardeaux",
        description: "Pose de la membrane d'étanchéité et des bardeaux d'asphalte ou autre revêtement.",
        tips: [
          "Installez les solins autour des cheminées et évents",
          "La membrane autocollante est requise dans les zones à risque",
          "Appliquez une membrane autocollante dans les premiers 4 pieds des rebords du toit pour une meilleure protection",
          "Assurez-vous d'une bonne ventilation pour laisser évacuer la chaleur. Une mauvaise ventilation peut détériorer le revêtement prématurément",
          "Faites installer les moulures de départ pour le fascia sous la membrane autocollante pour un bon écoulement d'eau en cas de fuite au niveau du revêtement"
        ]
      },
    ]
  },
  {
    id: "fenetres-portes",
    title: "Fenêtres et portes extérieures",
    description: "Installation de la fenestration et des portes pour fermer l'enveloppe.",
    phase: "gros-oeuvre",
    phaseLabel: "Gros œuvre",
    icon: "DoorOpen",
    duration: "2 jours",
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
    id: "isolation",
    title: "Isolation et pare-vapeur",
    description: "Installation de l'isolation thermique et du pare-vapeur.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Thermometer",
    duration: "1 semaine",
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
          "Maintenez une ventilation adéquate du comble, utilisez un déflecteur dans le bas du pontage pour maximiser la ventilation"
        ]
      },
      {
        id: "pare-vapeur",
        title: "Pare-vapeur",
        description: "Installation du polyéthylène 6 mil sur le côté chaud de l'isolant.",
        tips: [
          "Scellez tous les joints et pénétrations",
          "Le test d'infiltrométrie vérifiera l'étanchéité",
          "Assurez-vous qu'il n'y a pas de perforation du pare-vapeur, réparez avec un ruban adhésif pare-vapeur"
        ],
        documents: ["Rapport de test d'infiltrométrie"]
      }
    ]
  },
  {
    id: "plomberie-roughin",
    title: "Plomberie - Rough-in",
    description: "Installation de la plomberie brute avant la fermeture des murs.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Droplets",
    duration: "4 jours",
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
    id: "dalle-sous-sol",
    title: "Coulage de dalle du sous-sol",
    description: "Coulage de la dalle de béton du sous-sol après l'installation de la plomberie brute.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Square",
    duration: "2-3 jours",
    tasks: [
      {
        id: "preparation-dalle",
        title: "Préparation du sol",
        description: "Nivellement, compaction et installation de la membrane pare-vapeur sous la dalle.",
        tips: [
          "Assurez-vous que le drainage est bien en place avant de couler",
          "Installez un isolant rigide sous la dalle et un pare-vapeur scellé pour réduire les pertes de chaleur et l'humidité"
        ]
      },
      {
        id: "coulage-dalle",
        title: "Coulage du béton",
        description: "Coulage et nivellement de la dalle de béton.",
        tips: [
          "Prévoyez les joints de contrôle pour éviter les fissures",
          "Cure du béton: gardez humide pendant 7 jours minimum"
        ]
      }
    ]
  },
  {
    id: "murs-division",
    title: "Murs de division",
    description: "Construction des murs de division intérieurs non porteurs.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "LayoutGrid",
    duration: "2-3 jours",
    tasks: [
      {
        id: "ossature-murs",
        title: "Ossature des murs",
        description: "Installation de l'ossature en bois ou en acier pour les murs de division.",
        tips: [
          "Utilisez des montants de 2x4 pour les murs non porteurs",
          "Prévoyez l'emplacement des portes et ouvertures",
          "Assurez-vous que les murs soient solidement attachés entre les planchers et les plafonds (un mur mal ancré pourrait créer des problèmes de plâtre qui craque)",
          "Prévoyez des murs de 2x6 pour la ventilation de la sécheuse et le passage des colonnes de drainage"
        ]
      },
      {
        id: "cadrage-portes",
        title: "Cadrage des portes",
        description: "Installation des cadres de porte dans les murs de division.",
        tips: [
          "Vérifiez le niveau et l'aplomb des cadres",
          "Prévoyez l'espace pour les portes coulissantes si désiré",
          "Assurez-vous de la bonne hauteur des ouvertures de porte selon l'épaisseur des revêtements de sol"
        ]
      }
    ]
  },
  {
    id: "electricite-roughin",
    title: "Électricité - Rough-in",
    description: "Installation du filage électrique brut avant la fermeture des murs.",
    phase: "second-oeuvre",
    phaseLabel: "Second œuvre",
    icon: "Zap",
    duration: "4 jours",
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
        documents: ["Certificat d'inspection électrique"],
        tips: [
          "Prendre des photos de tous les emplacements de boîtiers électriques avec des repères clairs pour localiser les boîtiers oubliés après la pose du gypse"
        ]
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
    duration: "2-3 jours",
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
        title: "Ventilateur récupérateur de chaleur (VRC) (échangeur d'air)",
        description: "Installation obligatoire pour assurer la qualité de l'air.",
        tips: [
          "Le VRC est obligatoire dans les constructions neuves",
          "Prévoyez des conduits vers chaque pièce"
        ]
      },
      {
        id: "conduits",
        title: "Conduits de ventilation",
        description: "Installation des conduits pour la hotte, sécheuse et ventilateurs de salles de bain.",
        tips: [
          "Le conduit doit être isolé au minimum dans les premiers 24 pouces de sa sortie vers un mur extérieur, même dans un plafond chauffé, et isolé au complet dans l'entretoit"
        ]
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
    duration: "10-12 jours",
    tasks: [
      {
        id: "pose-gypse",
        title: "Pose du gypse",
        description: "Installation des panneaux de gypse sur tous les murs et plafonds.",
        tips: [
          "Utilisez du gypse résistant à l'humidité dans les salles de bain",
          "Gypse 5/8 sur les murs du garage obligatoire pour la protection coupe-feu"
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
          "Un bon apprêt est essentiel. Après l'application de l'apprêt, faire une inspection de tous les murs et réparer les défauts visibles avec une lumière. Le contrôle se fait à 3 pieds de distance des murs. Remettre de l'apprêt sur toutes les réparations avant de peindre les couches de finition.",
          "Peignez les plafonds, les boiseries et les portes avant les murs"
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
    duration: "5-7 jours",
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
          "Ajouter un contreplaqué de 5/8\" vissé à tous les 6 pouces avant la pose de carrelage au sol. Un minimum de 1 1/4\" de substrat est recommandé.",
          "Utilisez une membrane d'étanchéité dans la douche",
          "Avez-vous pensé à l'option d'un plancher chauffant ?"
        ]
      }
    ]
  },
  {
    id: "cuisine-sdb",
    title: "Travaux ébénisterie",
    description: "Installation des armoires, comptoirs et appareils sanitaires.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "ChefHat",
    duration: "3-5 jours",
    tasks: [
      {
        id: "armoires",
        title: "Armoires de cuisine et vanités",
        description: "Installation des armoires et meubles-lavabos.",
        tips: [
          "Valider les mesures avec votre cuisiniste une fois les étapes du plâtre complétées"
        ]
      },
      {
        id: "comptoirs",
        title: "Comptoirs",
        description: "Installation des comptoirs de cuisine et salle de bain.",
        tips: [
          "Mesurage après l'installation des armoires",
          "Délai de fabrication: 2-4 semaines"
        ]
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
    duration: "1 semaine",
    tasks: [
      {
        id: "portes-int",
        title: "Portes intérieures",
        description: "Installation des portes, cadres et quincaillerie.",
        tips: [
          "Prévoir une porte coupe-feu à fermeture automatique entre le garage et la maison (exigence du code du bâtiment)"
        ]
      },
      {
        id: "moulures",
        title: "Moulures et plinthes",
        description: "Pose des plinthes, cadrages et moulures décoratives.",
      },
      {
        id: "escalier",
        title: "Escalier",
        description: "Finition de l'escalier (marches, contremarches, rampe).",
      }
    ]
  },
  {
    id: "electricite-finition",
    title: "Électricité - Finition",
    description: "Installation finale des appareils électriques après les finitions intérieures.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "Zap",
    duration: "3 jours",
    tasks: [
      {
        id: "prises-interrupteurs",
        title: "Prises et interrupteurs",
        description: "Installation des plaques de prises et interrupteurs.",
        tips: [
          "Vérifiez le fonctionnement de chaque circuit",
          "Utilisez des plaques assorties à votre décor"
        ]
      },
      {
        id: "luminaires",
        title: "Luminaires",
        description: "Installation de tous les luminaires (plafonniers, appliques, etc.).",
      },
      {
        id: "appareils-electriques",
        title: "Raccordement des appareils",
        description: "Branchement des électroménagers et équipements (cuisinière, sécheuse, etc.).",
      }
    ]
  },
  {
    id: "plomberie-finition",
    title: "Plomberie - Finition",
    description: "Installation finale des appareils sanitaires après les finitions intérieures.",
    phase: "finitions",
    phaseLabel: "Finitions",
    icon: "Droplets",
    duration: "3 jours",
    tasks: [
      {
        id: "robinetterie",
        title: "Robinetterie",
        description: "Installation des robinets (cuisine, salles de bain, buanderie).",
        tips: [
          "Vérifiez l'étanchéité de chaque raccord",
          "Privilégiez des robinetteries de marques reconnues offrant une garantie à vie. Avant l'achat, vérifiez la disponibilité des pièces de rechange auprès des distributeurs locaux : cela facilitera les réparations futures et évitera le coût d'un remplacement complet à long terme."
        ]
      },
      {
        id: "toilettes-lavabos",
        title: "Toilettes et lavabos",
        description: "Installation des toilettes, lavabos et vanités.",
      },
      {
        id: "douche-bain",
        title: "Douche et baignoire",
        description: "Raccordement final des douches et baignoires.",
        tips: [
          "Prévoir un installateur spécialisé pour les écrans de bain et les portes de douche"
        ]
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
    duration: "1 semaine",
    tasks: [
      {
        id: "revetement",
        title: "Revêtement extérieur",
        description: "Installation du parement (vinyle, fibrociment, brique, bois).",
        tips: [
          "Installez une membrane pare-air avant le revêtement",
          "Respectez les espacements de ventilation",
          "Toujours prévoir une lame d'air derrière le revêtement pour assurer une bonne circulation. Ne jamais installer de fourrures de bois à l'horizontale, car elles bloquent l'écoulement de l'air et de l'eau."
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
      },
      {
        id: "fascia-soffite",
        title: "Fascia et soffite",
        description: "Installation des bordures de toit et de la ventilation du comble.",
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
    duration: "2 jours",
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
