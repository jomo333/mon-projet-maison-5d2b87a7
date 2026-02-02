export type ImportanceLevel = "critique" | "haute" | "moyenne";

export interface BuildingCodeEntry {
  id: string;
  question: string;
  reponse: string;
  importance: ImportanceLevel;
  tags: string[];
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
    },
    {
      id: "S2",
      question: "Quelle distance prévoir entre deux bâtiments?",
      reponse:
        "La distance minimale dépend du risque d'incendie et du règlement municipal (implantation), mais aussi des ouvertures (fenêtres/portes) sur les faces rapprochées. En pratique, plus vous êtes proche d'une limite, plus la conception des murs et ouvertures peut devenir contraignante.",
      importance: "haute",
      tags: ["distance", "implantation", "limite", "fenêtre", "séparation"],
    },
    {
      id: "S3",
      question: "Épaisseur minimale d'une dalle de béton sur sol?",
      reponse:
        "L'épaisseur et l'armature dépendent de l'usage (résidentiel vs charges plus élevées), du sol, du drainage et de la présence d'un garage (charges ponctuelles). Un bon point de départ: viser une dalle dimensionnée pour les charges prévues et validée si le sol est incertain.",
      importance: "haute",
      tags: ["béton", "dalle", "fondation", "garage", "structure"],
    },
  ],
  securite: [
    {
      id: "SEC1",
      question: "Hauteur minimale des garde-corps (balcon/terrasse/escalier)?",
      reponse:
        "Le principe: plus la hauteur de chute est importante, plus les exigences de garde-corps sont strictes. Typiquement, les balcons/terrasses demandent une hauteur de garde-corps plus grande que certains escaliers intérieurs. Autre point clé: les ouvertures doivent limiter le risque qu'un enfant passe à travers.",
      importance: "critique",
      tags: ["garde-corps", "balcon", "terrasse", "escalier", "sécurité", "balustre"],
    },
    {
      id: "SEC2",
      question: "Quand faut-il une main courante?",
      reponse:
        "Le principe: une main courante est requise dès que l'escalier présente un risque de chute (nombre de marches, largeur, usage). En autoconstruction, on oublie souvent la continuité, la solidité des ancrages et la prise en main (forme) — pas seulement la présence.",
      importance: "haute",
      tags: ["main courante", "escalier", "rampe", "sécurité"],
    },
    {
      id: "SEC3",
      question: "Détecteurs de fumée: où et comment les installer?",
      reponse:
        "En résidentiel, l'approche typique: au moins un par niveau, près des chambres, et idéalement interconnectés pour que l'alarme se propage. La position (plafond/mur), l'alimentation et la compatibilité entre appareils comptent autant que le nombre.",
      importance: "critique",
      tags: ["fumée", "détecteur", "alarme", "incendie", "sécurité"],
    },
  ],
  escaliers: [
    {
      id: "ESC1",
      question: "Dimensions typiques des marches d'escalier (giron/contremarche)?",
      reponse:
        "Le principe: confort + sécurité = marches régulières (uniformité) et proportions adaptées. Les erreurs fréquentes sont les variations d'une marche à l'autre, ou un giron trop court. Vérifiez aussi la hauteur libre et l'espace de tête.",
      importance: "haute",
      tags: ["escalier", "marche", "giron", "contremarche", "uniformité"],
    },
    {
      id: "ESC2",
      question: "Hauteur libre minimale dans un escalier: quoi vérifier?",
      reponse:
        "Le principe: personne ne doit se cogner la tête sur toute la ligne de foulée. Les points à vérifier: dessous de poutres, luminaires, retombées de plafond, et portes qui s'ouvrent sur l'escalier.",
      importance: "haute",
      tags: ["hauteur libre", "escalier", "dégagement", "plafond"],
    },
    {
      id: "ESC3",
      question: "Escalier extérieur: quelles précautions de conception?",
      reponse:
        "En extérieur, il faut anticiper l'eau, le gel, et l'entretien: drainage, surfaces antidérapantes, nez de marche non glissants, et protection des assemblages. La main courante et l'éclairage deviennent souvent plus importants qu'en intérieur.",
      importance: "moyenne",
      tags: ["escalier extérieur", "gel", "drainage", "antidérapant", "sécurité"],
    },
  ],
  isolation: [
    {
      id: "ISO1",
      question: "Isolation des murs: comment décider quoi viser?",
      reponse:
        "Le principe: l'objectif n'est pas seulement la valeur d'isolant, mais un ensemble performant (étanchéité à l'air, pare-air, gestion de la vapeur, ponts thermiques). Le bon niveau dépend de la région climatique, du type de mur et de vos objectifs de confort/énergie.",
      importance: "moyenne",
      tags: ["isolation", "mur", "pare-air", "pare-vapeur", "pont thermique"],
    },
    {
      id: "ISO2",
      question: "Isolation du toit/entretoit: erreurs fréquentes?",
      reponse:
        "Erreur fréquente: bloquer la ventilation de l'entretoit avec l'isolant ou négliger l'étanchéité à l'air au plafond. Pensez: déflecteurs, continuité du pare-air, scellage des pénétrations, et ventilation adéquate.",
      importance: "moyenne",
      tags: ["toit", "entretoit", "ventilation", "isolant", "étanchéité"],
    },
    {
      id: "ISO3",
      question: "Isolation des fondations: que vérifier?",
      reponse:
        "Le principe: limiter les pertes et la condensation. Points clés: gestion de l'humidité, continuité de l'isolation, et compatibilité des matériaux avec un sous-sol (murs froids). Les détails au pied de mur et autour des solives de rive sont souvent critiques.",
      importance: "moyenne",
      tags: ["fondation", "sous-sol", "humidité", "condensation", "isolation"],
    },
  ],
  plomberie: [
    {
      id: "PL1",
      question: "Ventilation de plomberie: pourquoi c'est important?",
      reponse:
        "Le principe: éviter le désiphonnage des siphons et les odeurs. En autoconstruction, on se trompe souvent de diamètre, de pente, ou on crée trop de coudes. Un plan de plomberie validé évite beaucoup de reprises.",
      importance: "haute",
      tags: ["plomberie", "vent", "siphon", "odeur", "drain"],
    },
    {
      id: "PL2",
      question: "Drainage autour des fondations: quoi prioriser?",
      reponse:
        "Le principe: éloigner l'eau du bâtiment. Les priorités typiques: pente du terrain, gouttières et rallonges, drainage périphérique si applicable, et gestion des eaux de surface. Un bon drainage réduit risques de moisissures et fissures.",
      importance: "haute",
      tags: ["drainage", "fondation", "eau", "gouttière", "humidité"],
    },
  ],
  electricite: [
    {
      id: "EL1",
      question: "Prises électriques: bonnes pratiques de placement?",
      reponse:
        "Les exigences exactes varient selon la pièce et le contexte, mais l'idée générale est de réduire l'usage de rallonges, protéger près de l'eau, et prévoir les charges (cuisine, atelier). Planifiez tôt: comptoirs, îlot, vanités et zones TV.",
      importance: "moyenne",
      tags: ["électricité", "prise", "cuisine", "salle de bain", "sécurité"],
    },
    {
      id: "EL2",
      question: "Tableau électrique: dimensionnement et évolutivité?",
      reponse:
        "Le principe: un panneau adapté aux charges actuelles et futures (thermopompe, chargeur EV, atelier). En autoconstruction, on sous-estime souvent les circuits dédiés et la place pour expansions.",
      importance: "haute",
      tags: ["panneau", "tableau", "circuits", "charge", "électricité"],
    },
  ],
  ventilation: [
    {
      id: "V1",
      question: "VRC/échangeur d'air: comment le penser?",
      reponse:
        "Le principe: assurer une qualité d'air stable et contrôler l'humidité. Vérifiez: débits par pièce, équilibrage, prises et rejets bien positionnés, et entretien accessible. L'étanchéité de l'enveloppe influence fortement les besoins.",
      importance: "haute",
      tags: ["vrc", "échangeur", "ventilation", "humidité", "air"],
    },
    {
      id: "V2",
      question: "Salle de bain: ventilation efficace?",
      reponse:
        "Le principe: extraire l'humidité à la source pour éviter moisissures. Points clés: conduit le plus court possible, clapet adéquat, isolation du conduit en zones froides et sortie extérieure bien étanche.",
      importance: "moyenne",
      tags: ["salle de bain", "ventilateur", "humidité", "moisissure", "conduit"],
    },
  ],
  fenestration: [
    {
      id: "FEN1",
      question: "Fenêtres: quoi regarder au-delà du prix?",
      reponse:
        "Le principe: performance + étanchéité + installation. Regardez: performance thermique, qualité des coupe-froid, drainage de l'eau, compatibilité avec le pare-air, et détail d'installation (solins). Une bonne fenêtre mal posée performe mal.",
      importance: "moyenne",
      tags: ["fenêtre", "porte", "étanchéité", "solin", "performance"],
    },
  ],
} satisfies Record<string, BuildingCodeEntry[]>;
