/**
 * Mapping of keywords to task titles for grouping budget items under their corresponding guide tasks.
 * This is used to display analyzed items under the correct task heading in the budget category detail view.
 * 
 * The mapping is keyed by category name (or merged category name), and contains an array of
 * { taskTitle, keywords } objects. When displaying items, we check if the item name contains
 * any of the keywords (case-insensitive) to determine which task it belongs to.
 */

export interface TaskKeywordMapping {
  taskTitle: string;
  keywords: string[];
}

export type CategoryTaskMappings = Record<string, TaskKeywordMapping[]>;

export const categoryTaskMappings: CategoryTaskMappings = {
  // FONDATION - two tasks: Coulage des fondations & Drain et remblai
  "Fondation": [
    {
      taskTitle: "Coulage des fondations",
      keywords: [
        "semelle", "mur", "fondation", "béton", "coffrage", "coulage",
        "imperméabilisation", "membrane", "delta", "goudron", "coffrage"
      ],
    },
    {
      taskTitle: "Drain et remblai",
      keywords: [
        "drain", "français", "remblai", "pierre", "gravier", "nette"
      ],
    },
  ],

  // EXCAVATION
  "Excavation": [
    {
      taskTitle: "Implantation de la maison",
      keywords: ["implantation", "arpenteur", "piquets", "bornage"],
    },
    {
      taskTitle: "Creusage et excavation",
      keywords: ["excavation", "creusage", "terre", "transport", "pelle", "nivellement"],
    },
  ],

  // STRUCTURE
  "Structure et charpente": [
    {
      taskTitle: "Plancher du rez-de-chaussée",
      keywords: ["solive", "plancher", "sous-plancher", "poutrelle", "rez-de-chaussée"],
    },
    {
      taskTitle: "Érection des murs",
      keywords: ["mur", "colombage", "ossature", "2x4", "2x6", "linteau", "extérieur"],
    },
    {
      taskTitle: "Structure de l'étage",
      keywords: ["étage", "deuxième", "2e"],
    },
    {
      taskTitle: "Installation des fermes de toit",
      keywords: ["ferme", "toit", "chevron", "préfabriqué"],
    },
    {
      taskTitle: "Pontage de toit",
      keywords: ["pontage", "contreplaqué", "osb", "toit"],
    },
    {
      taskTitle: "Étanchéité",
      keywords: ["étanchéité", "typar", "tyvek", "pare-air"],
    },
  ],

  // TOITURE
  "Toiture": [
    {
      taskTitle: "Membrane et bardeaux",
      keywords: ["membrane", "bardeau", "asphalte", "solin", "fascia", "ventilation", "toit"],
    },
  ],

  // FENÊTRES ET PORTES
  "Fenêtres et portes extérieures": [
    {
      taskTitle: "Installation des fenêtres",
      keywords: ["fenêtre", "vitrage", "pvc", "aluminium"],
    },
    {
      taskTitle: "Portes extérieures",
      keywords: ["porte", "entrée", "garage", "patio"],
    },
  ],

  // ISOLATION
  "Isolation et pare-vapeur": [
    {
      taskTitle: "Isolation des murs",
      keywords: ["isolation", "mur", "laine", "cellulose", "mousse", "r-24", "uréthane"],
    },
    {
      taskTitle: "Isolation du toit/comble",
      keywords: ["comble", "grenier", "toit", "r-41", "plafond"],
    },
    {
      taskTitle: "Pare-vapeur",
      keywords: ["pare-vapeur", "polyéthylène", "6 mil", "poly"],
    },
    {
      taskTitle: "Fourrures de bois et fond de clouage",
      keywords: ["fourrure", "clouage", "bois"],
    },
  ],

  // PLOMBERIE SOUS DALLE
  "Plomberie sous dalle": [
    {
      taskTitle: "Plomberie sous dalle - première visite",
      keywords: ["plomberie", "drain", "tuyau", "sous-dalle", "égout"],
    },
  ],

  // COULAGE DALLE SOUS-SOL
  "Coulage de dalle du sous-sol": [
    {
      taskTitle: "Préparation du sol",
      keywords: ["préparation", "nivellement", "compaction", "membrane", "isolant rigide"],
    },
    {
      taskTitle: "Coulage du béton",
      keywords: ["dalle", "béton", "coulage", "joint", "cure", "sous-sol", "garage"],
    },
  ],

  // MURS DE DIVISION
  "Murs de division": [
    {
      taskTitle: "Construire escalier",
      keywords: ["escalier", "marche", "rampe", "garde-corps"],
    },
    {
      taskTitle: "Ossature des murs",
      keywords: ["ossature", "mur", "division", "montant", "2x4", "2x6"],
    },
    {
      taskTitle: "Cadrage des portes",
      keywords: ["cadrage", "cadre", "porte", "ouverture"],
    },
  ],

  // PLOMBERIE (merged)
  "Plomberie": [
    {
      taskTitle: "Plomberie brute",
      keywords: ["tuyau", "drain", "alimentation", "cuivre", "pex", "abs", "égout", "rough"],
    },
    {
      taskTitle: "Appareils sanitaires",
      keywords: ["toilette", "lavabo", "bain", "douche", "robinet", "évier", "chauffe-eau"],
    },
  ],

  // ÉLECTRICITÉ (merged)
  "Électricité": [
    {
      taskTitle: "Filage électrique",
      keywords: ["fil", "câble", "boîte", "électrique", "panneau", "disjoncteur", "rough"],
    },
    {
      taskTitle: "Luminaires et finition",
      keywords: ["luminaire", "prise", "interrupteur", "plafonnier", "éclairage"],
    },
  ],

  // VENTILATION
  "Ventilation": [
    {
      taskTitle: "Installation des conduits",
      keywords: ["conduit", "ventilation", "hvac", "chauffage", "thermopompe", "air"],
    },
    {
      taskTitle: "Échangeur d'air",
      keywords: ["échangeur", "vrc", "récupérateur"],
    },
  ],

  // REVÊTEMENT EXTÉRIEUR
  "Revêtement extérieur": [
    {
      taskTitle: "Revêtement mural",
      keywords: ["revêtement", "vinyle", "brique", "pierre", "bois", "canexel", "crépi"],
    },
    {
      taskTitle: "Fascia et soffite",
      keywords: ["fascia", "soffite", "corniche"],
    },
  ],

  // GYPSE
  "Gypse et joints": [
    {
      taskTitle: "Pose du gypse",
      keywords: ["gypse", "placo", "plâtre", "drywall", "panneau"],
    },
    {
      taskTitle: "Tirage de joints",
      keywords: ["joint", "tirage", "ruban", "composé", "finition"],
    },
  ],

  // PEINTURE
  "Peinture": [
    {
      taskTitle: "Peinture des plafonds et murs",
      keywords: ["peinture", "peintre", "apprêt", "primer", "couche"],
    },
  ],

  // TRAVAUX ÉBÉNISTERIE
  "Travaux ébénisterie": [
    {
      taskTitle: "Armoires de cuisine",
      keywords: ["armoire", "cuisine", "comptoir", "îlot", "cabinet"],
    },
    {
      taskTitle: "Vanités et rangements",
      keywords: ["vanité", "rangement", "pharmacie", "salle de bain"],
    },
  ],

  // CÉRAMIQUE
  "Céramique et planchers": [
    {
      taskTitle: "Céramique",
      keywords: ["céramique", "tuile", "carrelage", "porcelaine", "mosaïque"],
    },
    {
      taskTitle: "Planchers",
      keywords: ["plancher", "bois franc", "flottant", "vinyle", "laminé"],
    },
  ],

  // BALCONS
  "Balcons et terrasses": [
    {
      taskTitle: "Structure du balcon",
      keywords: ["balcon", "terrasse", "structure", "poutre", "solive"],
    },
    {
      taskTitle: "Membrane et revêtement",
      keywords: ["membrane", "revêtement", "composite", "trex", "bois traité"],
    },
  ],

  // FINITIONS INTÉRIEURES
  "Finitions intérieures": [
    {
      taskTitle: "Portes intérieures",
      keywords: ["porte", "intérieure", "poignée", "serrure"],
    },
    {
      taskTitle: "Moulures et plinthes",
      keywords: ["moulure", "plinthe", "cadrage", "couronne", "corniche"],
    },
    {
      taskTitle: "Quincaillerie",
      keywords: ["quincaillerie", "poignée", "penture", "charnière"],
    },
  ],
};

/**
 * Given a category name and an array of budget items, group the items under their corresponding tasks.
 * Returns a Map where keys are task titles and values are arrays of items for that task.
 * Items that don't match any task keywords are grouped under "Autres éléments".
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
      grouped.set(mapping.taskTitle, []);
    }
  }

  // Group for unmatched items
  const otherItems: typeof items = [];

  for (const item of items) {
    const itemNameLower = item.name.toLowerCase();
    let matched = false;

    if (mappings) {
      for (const mapping of mappings) {
        const matches = mapping.keywords.some((kw) =>
          itemNameLower.includes(kw.toLowerCase())
        );
        if (matches) {
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
