# Durée du lien « Mot de passe oublié »

Si les utilisateurs voient « Lien invalide ou expiré » très rapidement (ex. après ~30 secondes), la durée du lien de réinitialisation est trop courte dans Supabase.

## Augmenter la durée du lien

1. Ouvre le **tableau de bord Supabase** de ton projet.
2. Va dans **Authentication** → **Providers** → **Email**.
3. Cherche **« Email OTP Expiration »** (ou équivalent) et mets une valeur en **secondes** :
   - **3600** = 1 heure
   - **86400** = 24 heures (maximum autorisé par Supabase)
4. Sauvegarde.

Si tu ne vois pas « Email OTP Expiration », vérifie aussi :

- **Authentication** → **Sessions** : le **JWT expiry** peut influencer la validité du token de récupération. Une valeur trop basse (ex. 30 secondes) fait expirer le lien très vite. Mets au minimum **3600** (1 h) pour les liens de réinitialisation.

Après modification, les nouveaux liens envoyés par « Mot de passe oublié » auront la nouvelle durée.
