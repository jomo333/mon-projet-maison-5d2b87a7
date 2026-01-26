/**
 * Mapping of keywords to task titles for grouping budget items under their corresponding guide tasks.
 * Task titles MUST match exactly the task.title values in src/data/constructionSteps.ts
 * 
 * The mapping is keyed by category name (or merged category name), and contains an array of
 * { taskTitle, keywords } objects. When displaying items, we check if the item name contains
 * any of the keywords (case-insensitive) to determine which task it belongs to.
 */

export interface TaskKeywordMapping {
  taskTitle: string;
  keywords: string[];
  exclusions?: string[]; // Keywords that should NOT match this task even if main keywords match
}

export type CategoryTaskMappings = Record<string, TaskKeywordMapping[]>;

export const categoryTaskMappings: CategoryTaskMappings = {
  // EXCAVATION - matches step "excavation"
  // IMPORTANT: Do NOT include foundation-related keywords here (béton, fondation, semelle, dalle, mur, imperméabilisation, drain)
  "Excavation": [
    {
      taskTitle: "Implantation de la maison",
      keywords: ["implantation", "arpenteur", "piquets", "bornage", "localisation", "arpentage"],
    },
    {
      taskTitle: "Creusage et excavation",
      keywords: [
        "excavation", "creusage", "terre", "transport terre", "pelle mécanique", "nivellement terrain",
        "déblai", "terrassement", "excavatrice", "camion terre", "excavation sous-sol"
      ],
    },
  ],
  
  // Keywords that should NEVER match Excavation - they belong to Fondation or Dalle
  // This is used as an exclusion list
  "_excavation_exclusions": [
    {
      taskTitle: "_exclusion",
      keywords: [
        "fondation", "semelle", "béton", "dalle", "mur de fondation", "imperméabilisation",
        "drain français", "coffrage", "coulage", "solage", "membrane", "goudron", "delta"
      ],
    },
  ],

  // FONDATION - matches step "fondation"
  // ONLY foundation walls and footings - dalle items go to "Coulage de dalle du sous-sol"
  "Fondation": [
    {
      taskTitle: "Semelle",
      keywords: [
        "semelle", "footing", "semelles", "coffrage semelle", "béton semelle", 
        "armature semelle", "acier semelle", "fer semelle", "semelles de fondation",
        "semelles béton"
      ],
      // Exclude dalle items
      exclusions: ["dalle", "plancher béton", "4 pouces", "4\"", "garage dalle"]
    },
    {
      taskTitle: "Coulage des fondations",
      keywords: [
        "mur de fondation", "mur fondation", "murs de fondation", "murs fondation",
        "fondation béton", "béton coulé", "coffrage mur", "coulage fondation",
        "solage", "8 pouces", "8\"", "10\"", "8' hauteur", "hauteur 8",
        "ml fondation", "pi lin fondation"
      ],
      // CRITICAL: Exclude ALL dalle-related items, drain/remblai, and generic concrete references
      exclusions: [
        "dalle", "dalle de béton", "dalle sous-sol", "dalle sous sol", "plancher béton", 
        "4 pouces", "4\"", "4 po", "garage dalle", "sous-sol 4",
        "drain", "remblai", "puisard", "drain français", "drain et remblai",
        "coffrage et finition", "25 mpa", "béton 25"
      ]
    },
    {
      taskTitle: "Imperméabilisation",
      keywords: [
        "imperméabilisation", "membrane fondation", "delta", "goudron", "membrane",
        "étanchéité fondation", "protection fondation", "bitume", "delta-ms"
      ],
      // Exclude drain items
      exclusions: ["drain français", "drain et remblai", "remblai", "puisard"]
    },
  ],

  // STRUCTURE ET CHARPENTE - matches step "structure"
  // IMPORTANT: Includes ALL structural elements: solives, fermes, contreplaqué plancher, charpente murs extérieurs, Tyvek, fourrures
  "Structure et charpente": [
    {
      taskTitle: "Plancher du rez-de-chaussée",
      keywords: [
        "solive", "solives", "plancher", "sous-plancher", "poutrelle", "rez-de-chaussée",
        "poutre", "lvl", "i-joist", "tji", "lam", "contreplaqué plancher", "osb plancher",
        "contreplaqué 5/8", "contreplaqué 3/4", "5/8''", "3/4''"
      ],
    },
    {
      taskTitle: "Érection des murs",
      keywords: [
        "mur extérieur", "colombage", "ossature", "2x4", "2x6", "2x8", "linteau",
        "montant", "lisse", "sablière", "clouage", "clou",
        "murs extérieurs", "charpente mur", "charpente murale", "périmètre"
      ],
      // Exclude interior partition items - they go to "Murs de division"
      exclusions: ["cloison", "cloisons", "intérieur", "intérieures", "partition", "division"]
    },
    {
      taskTitle: "Structure de l'étage",
      keywords: ["étage", "deuxième", "2e", "premier étage", "plancher étage"],
    },
    {
      taskTitle: "Installation des fermes de toit",
      keywords: [
        "ferme", "fermes", "chevron", "préfabriqué", "fermes de toit", "truss",
        "charpente toit", "toiture structure", "fermes préfabriquées"
      ],
    },
    {
      taskTitle: "Pontage de toit",
      keywords: ["pontage", "contreplaqué toit", "osb toit", "pontage toit", "decking"],
    },
    {
      taskTitle: "Étanchéité",
      keywords: [
        "étanchéité", "typar", "tyvek", "pare-air", "membrane étanchéité",
        "housewrap", "enveloppe", "pare-intempérie", "fourrure", "fourrures",
        "1x3", "fond de clouage", "strapping"
      ],
    },
  ],

  // TOITURE - matches step "toiture"
  // Only roofing covering materials - fascia/soffit/gouttières go to Revêtement extérieur
  "Toiture": [
    {
      taskTitle: "Membrane et bardeaux",
      keywords: [
        "membrane", "bardeau", "asphalte", "solin", "ventilation toit",
        "shingle", "bardeaux", "évent toit",
        "noue", "faîtière"
      ],
      // Exclude structural elements and exterior finish items
      exclusions: [
        "contreplaqué", "osb", "pontage", "plywood", "decking", "ferme", "fermes", "truss",
        "fascia", "soffite", "soffit", "gouttière", "gouttières", "descente", "descentes",
        "7/16", "5/8", "couverture osb", "aluminium"
      ]
    },
  ],

  // FENÊTRES ET PORTES EXTÉRIEURES - matches step "fenetres-portes"
  "Fenêtres et portes extérieures": [
    {
      taskTitle: "Installation des fenêtres",
      keywords: [
        "fenêtre", "vitrage", "pvc", "aluminium", "fenêtres", "vitres",
        "double vitrage", "triple vitrage", "châssis", "fenestration"
      ],
    },
    {
      taskTitle: "Portes extérieures",
      keywords: [
        "porte", "entrée", "garage", "patio", "porte-patio", "porte garage",
        "porte extérieure", "porte d'entrée", "portail"
      ],
    },
  ],

  // ISOLATION ET PARE-VAPEUR - matches step "isolation"
  "Isolation et pare-vapeur": [
    {
      taskTitle: "Isolation des murs",
      keywords: [
        "isolation mur", "mur", "laine", "mousse", "r-24", "uréthane",
        "isolant mur", "roxul", "rockwool", "fibre", "giclée", "polyuréthane",
        "r24", "r-20", "r20", "murs isolation", "murs extérieurs"
      ],
      // Exclude ceiling/attic insulation items
      exclusions: ["plafond", "r50", "r-50", "r41", "r-41", "r60", "r-60", "comble", "grenier", "toit", "entretoit"]
    },
    {
      taskTitle: "Isolation du toit/comble",
      keywords: [
        "comble", "grenier", "toit", "r-41", "plafond", "r41", "r-60", "r60",
        "entretoit", "soufflée", "cellulose toit", "isolation plafond",
        "r50", "r-50", "cellulose plafond", "cellulose"
      ],
    },
    {
      taskTitle: "Pare-vapeur",
      keywords: [
        "pare-vapeur", "polyéthylène", "6 mil", "poly", "vapeur", "étanchéité air",
        "membrane poly", "scellant", "ruban"
      ],
    },
    {
      taskTitle: "Fourrures de bois et fond de clouage",
      keywords: [
        "fourrure", "clouage", "bois", "fond de clouage", "strapping",
        "fourrures", "1x3", "support"
      ],
    },
  ],

  // PLOMBERIE SOUS DALLE - matches step "plomberie-sous-dalle"
  // Only plumbing items - concrete/dalle items go to "Coulage de dalle"
  "Plomberie sous dalle": [
    {
      taskTitle: "Plomberie sous dalle - première visite",
      keywords: [
        "plomberie", "drain", "tuyau", "égout", "renvoi",
        "rough-in sous-sol", "abs", "pvc drain", "coude", "té"
      ],
      // Exclude concrete/slab items - they go to "Coulage de dalle du sous-sol"
      exclusions: ["béton", "dalle", "coulage", "m3", "mètre cube", "styrofoam", "polystyrène", "isolant rigide", "granulaire", "pierre concassée", "membrane sol"]
    },
  ],

  // COULAGE DE DALLE DU SOUS-SOL - matches step "dalle-sous-sol"
  // ONLY slab/dalle items - foundation walls and footings go to "Fondation"
  "Coulage de dalle du sous-sol": [
    {
      taskTitle: "Préparation du sol",
      keywords: [
        "préparation", "nivellement", "compaction", "membrane sol", "isolant rigide",
        "styrofoam", "polystyrène", "granulaire", "pierre concassée", "0-3/4"
      ],
      // CRITICAL: Exclude foundation items
      exclusions: ["fondation", "semelle", "semelles", "mur de fondation", "murs fondation", "footing", "coffrage mur", "imperméabilisation", "8' hauteur", "ml fondation"]
    },
    {
      taskTitle: "Coulage du béton",
      keywords: [
        "dalle", "dalle sous-sol", "dalle 4", "4 pouces", "4\"", "coulage dalle",
        "joint", "cure", "plancher béton", "finition béton", "lissage", "garage dalle",
        "coffrage et finition"
      ],
      // CRITICAL: Exclude foundation items
      exclusions: ["fondation", "semelle", "semelles", "mur de fondation", "murs fondation", "footing", "coffrage mur", "imperméabilisation", "8' hauteur", "ml fondation", "périmètre"]
    },
  ],

  // MURS DE DIVISION - matches step "murs-division"
  // ONLY interior partition walls - ALL structural elements go to "Structure et charpente"
  "Murs de division": [
    {
      taskTitle: "Construire escalier",
      keywords: [
        "escalier", "marche", "rampe", "garde-corps", "limon", "contremarche",
        "main courante", "balustrade", "escalier structure"
      ],
    },
    {
      taskTitle: "Ossature des murs",
      keywords: [
        "cloison", "partition", "séparation", "mur intérieur", "murs intérieurs",
        "cloisons intérieures"
      ],
      // CRITICAL: Exclude ALL structural elements - they go to Structure et charpente
      exclusions: [
        "solive", "solives", "plancher", "sous-plancher", "poutre", "poteau", "poteaux",
        "ferme", "fermes", "toit", "contreplaqué", "osb", "2x10", "2x12", "lvl", 
        "i-joist", "tji", "sablière", "lisse haute", "plafond", "5/8", "3/4",
        "charpente murale", "murs extérieurs", "mur extérieur", "périmètre", "2x6"
      ]
    },
    {
      taskTitle: "Cadrage des portes",
      keywords: [
        "cadrage", "cadre", "porte intérieure", "ouverture", "encadrement",
        "jambage", "chambranle"
      ],
    },
  ],

  // PLOMBERIE (merged Rough-in + Finition) - matches steps "plomberie-roughin" + "plomberie-finition"
  "Plomberie": [
    {
      taskTitle: "Plomberie brute",
      keywords: [
        "tuyau", "drain", "alimentation", "cuivre", "pex", "abs", "égout", "rough",
        "tuyauterie", "conduite", "raccord", "coude", "té", "valve", "rough-in"
      ],
    },
    {
      taskTitle: "Chauffe-eau",
      keywords: [
        "chauffe-eau", "réservoir", "thermopompe", "eau chaude", "tank",
        "chauffe eau", "water heater"
      ],
    },
    {
      taskTitle: "Branchements municipaux",
      keywords: [
        "branchement", "aqueduc", "municipal", "raccord", "service",
        "entrée d'eau", "égout municipal", "ville"
      ],
    },
    {
      taskTitle: "Robinetterie",
      keywords: [
        "robinet", "robinetterie", "mitigeur", "mélangeur", "douchette",
        "pomme de douche", "faucet"
      ],
    },
    {
      taskTitle: "Toilettes et lavabos",
      keywords: [
        "toilette", "lavabo", "évier", "vanité", "wc", "cuvette",
        "bidet", "sink", "meuble-lavabo"
      ],
    },
    {
      taskTitle: "Douche et baignoire",
      keywords: [
        "douche", "bain", "baignoire", "base de douche", "receveur",
        "bain podium", "bain autoportant", "spa", "jacuzzi", "tourbillon"
      ],
    },
  ],

  // ÉLECTRICITÉ (merged Rough-in + Finition) - matches steps "electricite-roughin" + "electricite-finition"
  "Électricité": [
    {
      taskTitle: "Entrée électrique",
      keywords: [
        "panneau", "disjoncteur", "ampérage", "200a", "hydro", "entrée électrique",
        "panel", "breaker", "main", "service électrique", "100a", "mastique"
      ],
    },
    {
      taskTitle: "Filage brut",
      keywords: [
        "fil", "câble", "boîte", "électrique", "filage", "rough",
        "14/2", "12/2", "nmwu", "loomex", "bx", "conduit", "wire"
      ],
    },
    {
      taskTitle: "Inspection électrique",
      keywords: [
        "inspection", "certificat", "cmeq", "esie", "conformité"
      ],
    },
    {
      taskTitle: "Prises et interrupteurs",
      keywords: [
        "prise", "interrupteur", "plaque", "outlet", "switch", "dimmer",
        "gradateur", "usb", "gfci", "ddft"
      ],
    },
    {
      taskTitle: "Luminaires",
      keywords: [
        "luminaire", "plafonnier", "éclairage", "applique", "lampe",
        "spot", "encastré", "potlight", "led", "suspension", "lustre",
        "light", "fixture"
      ],
    },
    {
      taskTitle: "Raccordement des appareils",
      keywords: [
        "électroménager", "cuisinière", "sécheuse", "branchement",
        "hotte", "lave-vaisselle", "réfrigérateur", "micro-onde",
        "appareil", "appliance"
      ],
    },
  ],

  // CHAUFFAGE ET VENTILATION - matches step "hvac"
  "Chauffage et ventilation": [
    {
      taskTitle: "Système de chauffage",
      keywords: [
        "chauffage", "plinthe", "thermopompe", "radiant", "plancher chauffant",
        "fournaise", "chaudière", "btu", "heat pump", "électrique", "bi-énergie",
        "géothermie", "calorifère"
      ],
    },
    {
      taskTitle: "Ventilateur récupérateur de chaleur (VRC) (échangeur d'air)",
      keywords: [
        "vrc", "échangeur", "récupérateur", "air", "hrv", "erv", "vre",
        "ventilateur récupérateur", "échangeur d'air", "venmar", "lifebreath"
      ],
    },
    {
      taskTitle: "Conduits de ventilation",
      keywords: [
        "conduit", "ventilation", "hotte", "sécheuse", "salle de bain",
        "extracteur", "gaine", "duct", "grille", "diffuseur", "cfm"
      ],
    },
  ],

  // REVÊTEMENT EXTÉRIEUR - matches step "exterieur"
  // IMPORTANT: Exclude Tyvek, pare-air, fourrures - they belong to Structure et charpente
  "Revêtement extérieur": [
    {
      taskTitle: "Revêtement extérieur",
      keywords: [
        "revêtement", "vinyle", "brique", "pierre", "bois", "canexel", "crépi",
        "parement", "fibrociment", "siding", "maçonnerie", "stucco", "hardie",
        "cèdre", "aluminium", "extérieur mur"
      ],
      // Exclude items that belong to Structure et charpente
      exclusions: ["tyvek", "typar", "pare-air", "housewrap", "fourrure", "fourrures", "1x3", "strapping", "fond de clouage"]
    },
    {
      taskTitle: "Fascia et soffite",
      keywords: [
        "fascia", "soffite", "corniche", "bordure", "soffit", "aluminium bordure",
        "ventilé", "sous-face", "gouttière", "gouttières", "descente", "descente pluviale"
      ],
    },
    {
      taskTitle: "Balcons et terrasses",
      keywords: [
        "balcon", "terrasse", "galerie", "patio", "deck", "composite",
        "trex", "bois traité", "rampe extérieure", "garde-corps extérieur"
      ],
    },
    {
      taskTitle: "Aménagement paysager",
      keywords: [
        "aménagement", "paysager", "gazon", "entrée", "pavé", "plantation",
        "asphaltage", "asphalte", "béton extérieur", "muret", "terrassement",
        "nivelage", "pelouse", "arbre", "haie"
      ],
    },
  ],

  // GYPSE ET PEINTURE - matches step "gypse"
  "Gypse et peinture": [
    {
      taskTitle: "Pose du gypse",
      keywords: [
        "gypse", "placo", "plâtre", "drywall", "panneau", "gyproc",
        "sheetrock", "plaque", "cloison sèche", "1/2", "5/8"
      ],
    },
    {
      taskTitle: "Tirage de joints",
      keywords: [
        "joint", "tirage", "ruban", "composé", "plâtrage", "finition gypse",
        "mudding", "taping", "sablage", "niveau 4", "niveau 5"
      ],
    },
    {
      taskTitle: "Peinture",
      keywords: [
        "peinture", "peintre", "apprêt", "primer", "couche", "latex",
        "acrylique", "intérieur", "murs peinture", "plafond peinture",
        "gallon", "litre"
      ],
    },
  ],

  // REVÊTEMENTS DE SOL - matches step "revetements-sol"
  "Revêtements de sol": [
    {
      taskTitle: "Plancher de bois ou stratifié",
      keywords: [
        "plancher", "bois franc", "flottant", "stratifié", "laminé",
        "érable", "chêne", "merisier", "hickory", "engineered", "prélart",
        "vinyle planche", "lvp", "spc", "parquet"
      ],
    },
    {
      taskTitle: "Céramique",
      keywords: [
        "céramique", "tuile", "carrelage", "porcelaine", "mosaïque",
        "carreau", "tile", "ardoise", "marbre", "travertin", "pierre naturelle"
      ],
    },
  ],

  // TRAVAUX ÉBÉNISTERIE - matches step "cuisine-sdb"
  "Travaux ébénisterie": [
    {
      taskTitle: "Armoires de cuisine et vanités",
      keywords: [
        "armoire", "cuisine", "vanité", "cabinet", "meuble-lavabo",
        "armoires", "ébénisterie", "cabinetry", "rangement", "pharmacie",
        "garde-manger", "pantry"
      ],
    },
    {
      taskTitle: "Comptoirs",
      keywords: [
        "comptoir", "îlot", "quartz", "granit", "stratifié", "countertop",
        "surface solide", "corian", "dekton", "silestone", "butcher block",
        "bois comptoir"
      ],
    },
  ],

  // FINITIONS INTÉRIEURES - matches step "finitions-int"
  "Finitions intérieures": [
    {
      taskTitle: "Portes intérieures",
      keywords: [
        "porte", "intérieure", "poignée", "serrure", "porte chambre",
        "porte salle de bain", "porte coulissante", "porte pliante",
        "quincaillerie porte", "charnière"
      ],
    },
    {
      taskTitle: "Moulures et plinthes",
      keywords: [
        "moulure", "plinthe", "cadrage", "couronne", "corniche",
        "quart de rond", "cimaise", "lambris", "boiserie", "trim",
        "baseboard", "crown", "casing"
      ],
    },
    {
      taskTitle: "Escalier",
      keywords: [
        "escalier", "marche", "contremarche", "rampe", "finition escalier",
        "nez de marche", "main courante", "balustrade", "barreau"
      ],
    },
    {
      taskTitle: "Peinture de finition",
      keywords: [
        "peinture finition", "retouche", "couche finale", "touch-up",
        "dernière couche", "finition mur"
      ],
    },
  ],
};

/**
 * Check if an item should be excluded from a category based on exclusion keywords
 * For example, foundation items should not appear in Excavation
 */
function shouldExcludeFromCategory(categoryName: string, itemName: string): boolean {
  const itemNameLower = itemName.toLowerCase();
  
  // Global exclusions - items that should be excluded from ALL categories
  const globalExclusions = [
    "estimation basée sur repères", "repères québec", "estimé forfait"
  ];
  
  if (globalExclusions.some((kw) => itemNameLower.includes(kw.toLowerCase()))) {
    return true;
  }
  
  // Exclusion rules: items matching these keywords should NOT be in the specified category
  const exclusionRules: Record<string, string[]> = {
    "Excavation": [
      "fondation", "semelle", "béton", "dalle", "mur de fondation", "murs de fondation",
      "imperméabilisation", "drain français", "coffrage", "coulage", "solage",
      "membrane", "goudron", "delta", "8 pouces", "8\"", "périmètre principal",
      "mur fondation", "ml"
    ],
    "Structure et charpente": [
      "poutre de soutien acier", "colonnes d'acier", "colonne d'acier", "acier sous poutre",
      "solives de plancher rdc", "sous-plancher osb", "garage"
    ],
    "Toiture": [
      "fermes de toit", "ferme de toit", "préfabriquées", "contreplaqué toiture",
      "pontage", "5/8\" toit"
    ],
    "Fenêtres et portes extérieures": [
      "fenêtres sous-sol", "fenêtre sous-sol", "sous-sol estimé"
    ],
    "Plomberie": [
      "drain de plancher sous-sol", "drain plancher sous-sol", "tuyauterie drain principal",
      "drain principal", "sous-dalle"
    ],
  };
  
  const exclusions = exclusionRules[categoryName];
  if (!exclusions) return false;
  
  return exclusions.some((kw) => itemNameLower.includes(kw.toLowerCase()));
}

/**
 * Given a category name and an array of budget items, group the items under their corresponding tasks.
 * Returns a Map where keys are task titles and values are arrays of items for that task.
 * Items that don't match any task keywords are grouped under "Autres éléments".
 * Items that should belong to another category (e.g., foundation items in excavation) are excluded.
 */
export function groupItemsByTask(
  categoryName: string,
  items: { name: string; cost: number; quantity: string; unit: string }[]
): Map<string, typeof items> {
  const mappings = categoryTaskMappings[categoryName];
  const grouped = new Map<string, typeof items>();

  // Initialize groups for each known task
  if (mappings) {
    for (const mapping of mappings) {
      // Skip internal exclusion mappings
      if (mapping.taskTitle.startsWith("_")) continue;
      grouped.set(mapping.taskTitle, []);
    }
  }

  // Group for unmatched items
  const otherItems: typeof items = [];

  for (const item of items) {
    const itemNameLower = item.name.toLowerCase();
    
    // Skip items that should be excluded from this category
    if (shouldExcludeFromCategory(categoryName, item.name)) {
      continue; // Don't add to this category at all
    }
    
    let matched = false;

    if (mappings) {
      for (const mapping of mappings) {
        // Skip internal exclusion mappings
        if (mapping.taskTitle.startsWith("_")) continue;
        
        const matches = mapping.keywords.some((kw) =>
          itemNameLower.includes(kw.toLowerCase())
        );
        
        // Check exclusions - if item matches any exclusion keyword, skip this task
        const excluded = mapping.exclusions?.some((ex) =>
          itemNameLower.includes(ex.toLowerCase())
        ) ?? false;
        
        if (matches && !excluded) {
          grouped.get(mapping.taskTitle)!.push(item);
          matched = true;
          break; // Only assign to first matching task
        }
      }
    }

    if (!matched) {
      otherItems.push(item);
    }
  }

  // Add "Autres éléments" only if there are unmatched items
  if (otherItems.length > 0) {
    grouped.set("Autres éléments", otherItems);
  }

  // Remove empty task groups
  for (const [key, value] of grouped.entries()) {
    if (value.length === 0) {
      grouped.delete(key);
    }
  }

  return grouped;
}

/**
 * Get the list of task titles for a given category name.
 * Returns an empty array if the category has no defined tasks.
 */
export function getTasksForCategory(categoryName: string): string[] {
  const mappings = categoryTaskMappings[categoryName];
  if (!mappings) return [];
  return mappings.map((m) => m.taskTitle);
}
