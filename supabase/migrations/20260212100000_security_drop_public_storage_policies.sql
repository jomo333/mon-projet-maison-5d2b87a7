-- Sécurité: supprimer toute politique d'accès public au storage qui pourrait rester
-- (noms exacts de la migration initiale 20260115183700)
DROP POLICY IF EXISTS "Public can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete attachments" ON storage.objects;
