# Sécurité des données – MonProjetMaison.ca

Ce document décrit les mesures en place pour **protéger les données des utilisateurs** et **éviter qu’un utilisateur voie les projets ou documents d’un autre**.

---

## 1. Isolation des données (RLS – Row Level Security)

Supabase utilise **Row Level Security** sur les tables sensibles. Chaque requête est filtrée côté base de données : un utilisateur ne peut accéder qu’aux lignes autorisées par les politiques.

### Tables protégées par utilisateur

| Table / ressource | Règle |
|-------------------|--------|
| **projects** | Un utilisateur ne voit que ses projets (`user_id = auth.uid()`). |
| **project_budgets** | Accès uniquement aux budgets des projets dont il est propriétaire. |
| **project_photos** | Idem, via `projects.user_id = auth.uid()`. |
| **project_schedules**, **schedule_alerts**, **task_dates** | Idem, via le projet. |
| **task_attachments** | Uniquement les pièces jointes des projets dont l’utilisateur est propriétaire (`project_id` requis, projet détenu par l’utilisateur). |
| **completed_tasks** | Via le projet. |
| **subscriptions** | Un utilisateur ne voit que ses abonnements. |
| **payments** | Un utilisateur ne voit que ses paiements. |
| **profiles** | Un utilisateur ne voit que son profil. |
| **ai_usage**, **user_storage_usage** | Un utilisateur ne voit que ses propres données. |

### Tables accessibles à tous les utilisateurs connectés (données non personnelles)

- **plans** : lecture des forfaits actifs (pas de données personnelles).
- **reference_durations** : données de référence métier.

### Admin

- **admin_audit_log**, **user_roles** : accès réservé aux comptes **admin** (vérifiés via la fonction `is_admin(auth.uid())`).

---

## 2. Stockage (Storage)

Les buckets (fichiers) sont protégés par des **politiques RLS sur `storage.objects`** :

- **task-attachments**, **plans**, **project-photos** : accès **authentifié** uniquement, et uniquement aux objets dont le **premier segment du chemin = `auth.uid()`** (dossier par utilisateur).
- Les anciennes politiques « Public can view » ont été supprimées pour éviter l’accès anonyme aux fichiers.

Un utilisateur ne peut donc pas lire, modifier ou supprimer les fichiers d’un autre.

---

## 3. Edge Functions (Supabase)

Les fonctions côté serveur qui touchent aux données utilisateur :

- Vérifient l’**authentification** (`getUser` avec le token Bearer).
- Utilisent soit le **client Supabase avec le token utilisateur** (donc RLS s’applique), soit le **service role** uniquement pour des opérations précises (ex. webhook Stripe, sync Stripe) après contrôle admin ou contexte sécurisé.
- Les fonctions sensibles (ex. **sync-plan-to-stripe**, **get-user-emails**) vérifient le rôle **admin** via `is_admin()`.

Les métadonnées Stripe (plan_id, user_id) sont renvoyées par le front uniquement après création de session par une Edge Function authentifiée, pas exposées en clair aux autres utilisateurs.

---

## 4. Bonnes pratiques côté application

- **HTTPS** : le site est servi en HTTPS (Vercel/Supabase).
- **Secrets** : les clés Stripe (secret, webhook) et Supabase (service role) sont dans les **variables d’environnement / secrets** (Supabase Dashboard, Vercel), pas dans le code.
- **Authentification** : les routes sensibles (mes projets, forfaits, paramètres) sont protégées par **AuthGuard** ou équivalent ; les appels API passent le **token** utilisateur.
- **Pas de confiance côté client** : les vrais contrôles d’accès sont en **RLS** et en **Edge Functions** ; le front ne fait pas confiance à des paramètres pour « choisir » les données d’un autre utilisateur.

---

## 5. Ce que tu peux faire en plus (recommandations)

1. **Vérifier les politiques RLS** : dans le Dashboard Supabase → Authentication → Policies, s’assurer qu’il n’y a pas de politique « USING (true) » ou « TO public » sur les tables contenant des données personnelles ou des projets.
2. **Audit** : l’**admin_audit_log** enregistre les actions admin ; tu peux le consulter régulièrement.
3. **Mots de passe** : s’appuyer sur les paramètres Supabase Auth (complexité, expiration) et éventuellement activer 2FA pour les comptes admin.
4. **Sauvegardes** : utiliser les sauvegardes Supabase et les tester (restauration) pour limiter les pertes en cas d’incident.

---

## 6. Résumé

- **Projets et documents** : chaque utilisateur ne voit que **ses** projets et les données liées (budgets, photos, pièces jointes, échéanciers, etc.) grâce aux politiques RLS.
- **Fichiers** : le stockage est protégé par RLS avec un dossier par utilisateur (`auth.uid()` dans le chemin).
- **Paiements / abonnements** : isolés par `user_id` en RLS ; les Edge Functions qui créent des sessions ou modifient des abonnements vérifient l’auth et, le cas échéant, le rôle admin.

Les migrations SQL (notamment `20260215120000_security_task_attachments_strict_rls.sql`) renforcent encore l’isolation, en particulier pour les pièces jointes des projets.
