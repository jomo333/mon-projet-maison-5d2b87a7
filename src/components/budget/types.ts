// Types for budget analysis components

export interface BudgetItem {
  name: string;
  cost: number;
  quantity: string;
  unit: string;
}

export interface BudgetCategory {
  name: string;
  budget: number;
  description: string;
  items: BudgetItem[];
}

export interface BudgetAnalysis {
  projectSummary: string;
  estimatedTotal: number;
  categories: BudgetCategory[];
  recommendations: string[];
  warnings: string[];
}

// Attachment/Plan types from Supabase
export interface TaskAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
  category: string;
  step_id: string;
  task_id: string;
  project_id: string | null;
}

export interface ProjectPhoto {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
  description: string | null;
  project_id: string;
  step_id: string;
}

// Combined plan type (from task_attachments or project_photos)
export interface PlanDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
  category: string;
  step_id: string;
}

// Style photo for analysis
export interface StylePhoto {
  id: string;
  file_url: string;
  file_name: string;
}
