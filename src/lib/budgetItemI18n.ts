import type { TFunction } from "i18next";

/**
 * Mapping of French construction terms to English equivalents.
 * Used to translate budget item names that come from AI analysis.
 */
const TERM_TRANSLATIONS: Record<string, string> = {
  // Structural terms
  "solives": "joists",
  "solive": "joist",
  "fermes": "trusses",
  "ferme": "truss",
  "poutre": "beam",
  "poutres": "beams",
  "chevrons": "rafters",
  "chevron": "rafter",
  "colombages": "studs",
  "colombage": "stud",
  "montants": "studs",
  "montant": "stud",
  "lisse": "plate",
  "lisses": "plates",
  "sablière": "top plate",
  "sablières": "top plates",
  "charpente": "framing",
  "ossature": "frame",
  "pontage": "sheathing",
  "contreplaqué": "plywood",
  "osb": "OSB",
  
  // Floor/level terms
  "plafond": "ceiling",
  "plancher": "floor",
  "rez-de-chaussée": "main floor",
  "sous-sol": "basement",
  "étage": "floor",
  "comble": "attic",
  "entretoit": "attic",
  "toiture": "roof",
  "toit": "roof",
  
  // Wall terms
  "mur": "wall",
  "murs": "walls",
  "murale": "wall",
  "cloison": "partition",
  "cloisons": "partitions",
  "division": "partition",
  "extérieur": "exterior",
  "extérieurs": "exterior",
  "intérieur": "interior",
  "intérieurs": "interior",
  "érection": "erection",
  
  // Foundation terms
  "fondation": "foundation",
  "fondations": "foundations",
  "semelle": "footing",
  "semelles": "footings",
  "dalle": "slab",
  "béton": "concrete",
  "coffrage": "formwork",
  "armature": "rebar",
  "remblai": "backfill",
  "excavation": "excavation",
  "creusage": "digging",
  "drain": "drain",
  "imperméabilisation": "waterproofing",
  
  // Insulation terms
  "isolation": "insulation",
  "isolant": "insulation",
  "pare-vapeur": "vapour barrier",
  "pare-air": "air barrier",
  "cellulose": "cellulose",
  "laine": "wool",
  "polyuréthane": "polyurethane",
  "giclé": "spray foam",
  "uréthane": "urethane",
  "fourrure": "furring",
  "fourrures": "furring strips",
  
  // Plumbing terms
  "plomberie": "plumbing",
  "tuyauterie": "piping",
  "conduite": "pipe",
  "conduites": "pipes",
  "robinetterie": "faucets",
  "robinet": "faucet",
  "toilette": "toilet",
  "lavabo": "sink",
  "douche": "shower",
  "baignoire": "bathtub",
  "chauffe-eau": "water heater",
  "réservoir": "tank",
  "puisard": "sump",
  
  // Electrical terms
  "électricité": "electrical",
  "électrique": "electrical",
  "filage": "wiring",
  "câblage": "wiring",
  "panneau": "panel",
  "prise": "outlet",
  "prises": "outlets",
  "interrupteur": "switch",
  "interrupteurs": "switches",
  "luminaire": "light fixture",
  "luminaires": "light fixtures",
  "entrée électrique": "electrical service entry",
  
  // HVAC terms
  "chauffage": "heating",
  "ventilation": "ventilation",
  "climatisation": "air conditioning",
  "conduit": "duct",
  "conduits": "ducts",
  "échangeur": "exchanger",
  "thermopompe": "heat pump",
  "plinthe": "baseboard",
  "plinthes": "baseboards",
  "vrc": "HRV",
  "récupérateur": "recovery unit",
  
  // Exterior terms
  "revêtement": "cladding",
  "bardeau": "shingle",
  "bardeaux": "shingles",
  "membrane": "membrane",
  "fascia": "fascia",
  "soffite": "soffit",
  "gouttière": "gutter",
  "gouttières": "gutters",
  "balcon": "balcony",
  "terrasse": "deck",
  "fenêtre": "window",
  "fenêtres": "windows",
  "porte": "door",
  "portes": "doors",
  
  // Finishes
  "gypse": "drywall",
  "gyproc": "drywall",
  "tirage de joints": "taping and mudding",
  "joints": "joints",
  "peinture": "paint",
  "céramique": "ceramic tile",
  "plancher flottant": "floating floor",
  "stratifié": "laminate",
  "bois franc": "hardwood",
  "moulure": "trim",
  "moulures": "trim",
  "cadrage": "casing",
  "escalier": "staircase",
  
  // Cabinets
  "armoire": "cabinet",
  "armoires": "cabinets",
  "cuisine": "kitchen",
  "vanité": "vanity",
  "vanités": "vanities",
  "comptoir": "countertop",
  "comptoirs": "countertops",
  
  // Materials
  "bois": "wood",
  "acier": "steel",
  "aluminium": "aluminum",
  "pvc": "PVC",
  "vinyle": "vinyl",
  "pierre": "stone",
  "granit": "granite",
  "quartz": "quartz",
  
  // Measurements/common
  "estimé": "Estimated",
  "estimation": "estimate",
  "installation": "installation",
  "pose": "installation",
  "main-d'œuvre": "labor",
  "main d'œuvre": "labor",
  "matériaux": "materials",
  "fournitures": "supplies",
  "aucun élément": "No items",
  "aucun item": "No items",
  "structure": "structure",
  "finition": "finishing",
  
  // Dimensions (keep as-is but translate context)
  "c/c": "o.c.",  // center to center -> on center
  "p.c.": "o.c.",
  "pi²": "sq ft",
  "pieds carrés": "square feet",
  "pied carré": "square foot",
  "pi.lin.": "lin.ft.",
  "pied linéaire": "linear foot",
  "pieds linéaires": "linear feet",
};

/**
 * Translate a French budget item name to English.
 * Preserves technical specifications (dimensions, measurements).
 */
export function translateBudgetItemName(t: TFunction, itemName: string): string {
  // Check if we're in French mode - if so, return as-is
  const locale = t("common.locale");
  if (locale === "fr-CA" || locale === "fr") {
    return itemName;
  }
  
  if (!itemName) return itemName;
  
  let translated = itemName;
  
  // Sort terms by length (longest first) to avoid partial replacements
  const sortedTerms = Object.entries(TERM_TRANSLATIONS)
    .sort(([a], [b]) => b.length - a.length);
  
  for (const [fr, en] of sortedTerms) {
    // Create a case-insensitive regex that matches whole words
    const regex = new RegExp(`\\b${escapeRegex(fr)}\\b`, "gi");
    translated = translated.replace(regex, (match) => {
      // Preserve original case for first letter
      if (match[0] === match[0].toUpperCase()) {
        return en.charAt(0).toUpperCase() + en.slice(1);
      }
      return en;
    });
  }
  
  return translated;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Translate "No items associated" and similar empty state messages
 */
export function translateNoItemsMessage(t: TFunction, message: string): string {
  const locale = t("common.locale");
  if (locale === "fr-CA" || locale === "fr") {
    return message;
  }
  
  const noItemsPatterns: Record<string, string> = {
    "aucun élément associé": "No items associated",
    "aucun item associé": "No items associated",
    "aucun élément détecté": "No items detected",
    "aucun item détecté": "No items detected",
    "non associé": "Not associated",
  };
  
  const lowerMessage = message.toLowerCase().trim();
  for (const [fr, en] of Object.entries(noItemsPatterns)) {
    if (lowerMessage.includes(fr)) {
      return en;
    }
  }
  
  return message;
}
