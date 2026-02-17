# Lien « Mot de passe oublié »

## Le lien dans l’email pointe vers vercel.app au lieu du domaine

**Cause :** Supabase utilise la **Site URL** du projet, ou le code utilisait l’URL de la page (vercel.app) pour construire le lien.

**À faire :**

1. **Supabase** → **Authentication** → **URL Configuration**  
   - **Site URL** : mets ton domaine, ex. `https://monprojetmaison.ca`  
   - **Redirect URLs** : ajoute `https://monprojetmaison.ca/#/reset-password` (et `https://www.monprojetmaison.ca/#/reset-password` si tu utilises www).

2. **Variable d’environnement (Vercel / build)**  
   - Ajoute `VITE_APP_URL=https://monprojetmaison.ca` (sans slash final).  
   - L’app l’utilise pour le lien « Mot de passe oublié » : le mail redirigera toujours vers ce domaine, même si l’utilisateur était sur `*.vercel.app`.

---

## Durée du lien (lien expiré trop vite)

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
