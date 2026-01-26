export interface TradeType {
  id: string;
  name: string;
  color: string;
}

export const tradeTypes: TradeType[] = [
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
  { id: "assurance", name: "Assurance", color: "#0D9488" },
  { id: "autre", name: "Autre", color: "#6B7280" },
];

export const getTradeColor = (tradeId: string): string => {
  const trade = tradeTypes.find(t => t.id === tradeId);
  return trade?.color || "#6B7280";
};

export const getTradeName = (tradeId: string): string => {
  const trade = tradeTypes.find(t => t.id === tradeId);
  return trade?.name || "Autre";
};
