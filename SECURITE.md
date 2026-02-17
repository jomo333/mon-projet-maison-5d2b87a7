# Sécurité des données – Monprojetmaison.ca

## Isolation des données utilisateur

- **Projets, documents, photos** : chaque utilisateur ne peut voir et modifier que **ses propres** projets et fichiers. C’est appliqué par Supabase avec des règles **RLS** (Row Level Security) sur les tables et le stockage.
- **Abonnements et paiements** : visibles uniquement par l’utilisateur concerné (ou les admins).
- **Profils** : lecture/écriture limitée à son propre profil.

## Règles côté base de données (RLS)

- **`projects`** : `auth.uid() = user_id` pour SELECT, INSERT, UPDATE, DELETE.
- **`project_photos`, `task_attachments`, `project_budgets`, `task_dates`, etc.** : accès uniquement si le projet appartient à l’utilisateur (`EXISTS (SELECT 1 FROM projects WHERE ... AND projects.user_id = auth.uid())`).
- **Stockage (buckets)** : les chemins doivent commencer par l’ID utilisateur (`(storage.foldername(name))[1] = auth.uid()::text`). Aucun accès aux dossiers des autres utilisateurs.
- Les anciennes politiques « publiques » sur le storage ont été supprimées par la migration `20260212100000_security_drop_public_storage_policies.sql`.

## Défense en profondeur

- Sur la page projet, le client vérifie que `project.user_id === user.id` avant d’afficher les données. En cas de non-correspondance, le projet n’est pas affiché (comportement « non trouvé »).

## Headers de sécurité (Vercel)

- **X-Content-Type-Options: nosniff** – limite l’interprétation du type de contenu.
- **X-Frame-Options: DENY** – réduit le risque de clickjacking.
- **X-XSS-Protection: 1; mode=block** – atténuation XSS côté navigateur.
- **Referrer-Policy: strict-origin-when-cross-origin** – limite les informations envoyées dans le Referer.
- **Permissions-Policy** – désactive par défaut caméra, micro, géolocalisation.

## Bonnes pratiques côté hébergeur / projet

- Ne jamais exposer la clé **service_role** Supabase côté client (elle contourne RLS). Elle est utilisée uniquement dans les Edge Functions côté serveur.
- Conserver les secrets (Stripe, Supabase) dans les variables d’environnement (Vercel, Supabase Dashboard), jamais dans le code.
- Après déploiement, appliquer les migrations Supabase pour que les nouvelles politiques RLS soient actives : `supabase db push` ou déploiement des migrations via le dashboard.
