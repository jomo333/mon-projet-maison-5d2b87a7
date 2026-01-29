-- Add starting_step_id column to projects table
-- This stores which step the user is starting from (e.g., 'soumissions', 'financement', etc.)
ALTER TABLE public.projects 
ADD COLUMN starting_step_id text DEFAULT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN public.projects.starting_step_id IS 'The step_id from constructionSteps where the user is starting their project (e.g., planification, soumissions, financement, excavation)';