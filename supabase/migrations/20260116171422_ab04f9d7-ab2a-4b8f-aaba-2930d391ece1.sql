-- Create table for completed tasks
CREATE TABLE public.completed_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, step_id, task_id)
);

-- Enable Row Level Security
ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their project completed tasks"
ON public.completed_tasks
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = completed_tasks.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create completed tasks for their projects"
ON public.completed_tasks
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = completed_tasks.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their project completed tasks"
ON public.completed_tasks
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = completed_tasks.project_id
  AND projects.user_id = auth.uid()
));