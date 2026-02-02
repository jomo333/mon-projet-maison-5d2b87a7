
-- Allow admins to view all user consents
CREATE POLICY "Admins can view all consents"
ON public.user_consents
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
