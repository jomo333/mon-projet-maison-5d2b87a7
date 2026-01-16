// Mapping between project stages and guide step IDs
export const stageToGuideStep: Record<string, string> = {
  planification: "planification",
  permis: "plans-permis",
  fondation: "excavation-fondation", 
  structure: "charpente",
  finition: "finition-interieure",
};

// Stages that have plans available (past the permis stage)
export const stagesWithPlans = ["permis", "fondation", "structure", "finition"];

// Check if a stage should offer plan upload
export const shouldOfferPlanUpload = (stage: string): boolean => {
  return stagesWithPlans.includes(stage);
};
