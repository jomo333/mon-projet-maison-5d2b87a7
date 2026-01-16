-- 1) Supprimer les doublons d'échéancier (on garde la ligne la plus récente)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, step_id
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.project_schedules
)
DELETE FROM public.project_schedules
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Empêcher la recréation de doublons (1 ligne par étape et par projet)
CREATE UNIQUE INDEX IF NOT EXISTS project_schedules_project_id_step_id_unique
  ON public.project_schedules (project_id, step_id);
