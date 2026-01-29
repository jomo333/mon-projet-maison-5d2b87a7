// Mapping between project stages and guide step IDs
export const stageToGuideStep: Record<string, string> = {
  planification: "planification",
  "plans-permis": "plans-permis",
  soumissions: "soumissions",
  financement: "financement",
  excavation: "excavation",
  fondation: "fondation",
  structure: "structure",
  toiture: "toiture",
  "fenetres-portes": "fenetres-portes",
  isolation: "isolation",
  "plomberie-roughin": "plomberie-roughin",
  "electricite-roughin": "electricite-roughin",
  gypse: "gypse",
  "revetements-sol": "revetements-sol",
  "cuisine-sdb": "cuisine-sdb",
  "finitions-int": "finitions-int",
  // Legacy mappings for backwards compatibility
  permis: "plans-permis",
  finition: "finitions-int",
};

// Steps that have plans available (past the permis stage)
// If starting_step_id is past plans-permis, offer plan upload
export const stagesWithPlans = [
  "soumissions", "financement", "excavation", "fondation", "structure", 
  "toiture", "fenetres-portes", "isolation", "plomberie-roughin", 
  "electricite-roughin", "gypse", "revetements-sol", "cuisine-sdb", "finitions-int"
];

// Check if a stage should offer plan upload
export const shouldOfferPlanUpload = (stage: string): boolean => {
  if (!stage) return false;
  return stagesWithPlans.includes(stage);
};
