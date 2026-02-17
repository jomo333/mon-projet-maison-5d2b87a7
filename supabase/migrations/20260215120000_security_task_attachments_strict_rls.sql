-- Sécurité: les utilisateurs ne doivent voir que les pièces jointes de LEURS projets.
-- Supprimer l'accès aux lignes où project_id IS NULL (tout utilisateur connecté pouvait les voir).

DROP POLICY IF EXISTS "Authenticated users can view their project attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete their attachments" ON public.task_attachments;

-- SELECT: uniquement si le projet appartient à l'utilisateur (project_id requis)
CREATE POLICY "Users can view their project attachments only"
ON public.task_attachments FOR SELECT
TO authenticated
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = task_attachments.project_id AND p.user_id = auth.uid()
  )
);

-- INSERT: uniquement dans un projet appartenant à l'utilisateur
CREATE POLICY "Users can insert attachments to their projects only"
ON public.task_attachments FOR INSERT
TO authenticated
WITH CHECK (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = task_attachments.project_id AND p.user_id = auth.uid()
  )
);

-- UPDATE: idem (pour cohérence si utilisé plus tard)
CREATE POLICY "Users can update their project attachments only"
ON public.task_attachments FOR UPDATE
TO authenticated
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = task_attachments.project_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = task_attachments.project_id AND p.user_id = auth.uid()
  )
);

-- DELETE: uniquement sur ses projets
CREATE POLICY "Users can delete their project attachments only"
ON public.task_attachments FOR DELETE
TO authenticated
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = task_attachments.project_id AND p.user_id = auth.uid()
  )
);

COMMENT ON TABLE public.task_attachments IS 'RLS: accès uniquement aux pièces jointes des projets dont l''utilisateur est propriétaire.';
