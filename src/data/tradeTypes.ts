export interface TradeType {
  id: string;
  name: string;
  color: string;
}

export const tradeTypes: TradeType[] = [
  { id: "demolition", name: "Démolition", color: "#B45309" },
  { id: "excavation", name: "Excavation", color: "#8B4513" },
  { id: "fondation", name: "Fondation/Béton", color: "#6B7280" },
  { id: "charpente", name: "Charpentier", color: "#D97706" },
  { id: "toiture", name: "Couvreur", color: "#374151" },
  { id: "fenetre", name: "Fenêtres/Portes", color: "#0891B2" },
  { id: "electricite", name: "Électricien", color: "#FBBF24" },
  { id: "plomberie", name: "Plombier", color: "#3B82F6" },
  { id: "hvac", name: "Chauffage/Ventilation", color: "#EF4444" },
  { id: "isolation", name: "Isolation", color: "#EC4899" },
  { id: "gypse", name: "Plâtrier/Gypse", color: "#475569" },
  { id: "peinture", name: "Peintre", color: "#A855F7" },
  { id: "plancher", name: "Plancher", color: "#78350F" },
  { id: "ceramique", name: "Céramiste", color: "#14B8A6" },
  { id: "armoires", name: "Ébéniste/Armoires", color: "#A16207" },
  { id: "comptoirs", name: "Comptoirs", color: "#4338CA" },
  { id: "finitions", name: "Finition intérieure", color: "#059669" },
  { id: "exterieur", name: "Revêtement extérieur", color: "#0284C7" },
  { id: "amenagement", name: "Aménagement paysager", color: "#16A34A" },
  { id: "inspecteur", name: "Inspecteur", color: "#DC2626" },
  { id: "arpenteur", name: "Arpenteur", color: "#7C3AED" },
  { id: "entrepreneur-general", name: "Entrepreneur général", color: "#1E3A5F" },
  { id: "planification", name: "Planification", color: "#6366F1" },
  { id: "plans-permis", name: "Plans et permis", color: "#0EA5E9" },
  { id: "soumissions", name: "Soumissions", color: "#F59E0B" },
  { id: "financement", name: "Financement", color: "#10B981" },
  { id: "autre", name: "Autre", color: "#DC2626" },
];

export const getTradeColor = (tradeId: string): string => {
  const trade = tradeTypes.find(t => t.id === tradeId);
  return trade?.color || "#DC2626";
};

/** Couleur par step_id pour les 4 étapes de préparation (override même si trade_type="autre") */
const prepStepColors: Record<string, string> = {
  planification: "#6366F1",
  "plans-permis": "#0EA5E9",
  soumissions: "#F59E0B",
  financement: "#10B981",
};

export const getScheduleColor = (stepId: string, tradeType: string): string => {
  return prepStepColors[stepId] ?? getTradeColor(tradeType);
};

/** Couleur d'affichage : utilise trade_color si fourni (ex: tâches manuelles), sinon getScheduleColor */
export const getDisplayColor = (
  stepId: string,
  tradeType: string,
  tradeColor?: string | null
): string => {
  return tradeColor || getScheduleColor(stepId, tradeType);
};

export const getTradeName = (tradeId: string): string => {
  const trade = tradeTypes.find(t => t.id === tradeId);
  return trade?.name || "Autre";
};
