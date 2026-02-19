# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Déployer les Edge Functions Supabase (analyse-soumissions, etc.)

Si tu as installé le [Supabase CLI](https://supabase.com/docs/guides/cli), tu peux déployer les fonctions depuis le dossier du projet :

```bash
cd "c:\Users\Utilisateur\Desktop\mon-projet-maison-main (2)\mon-projet-maison-5d2b87a7"
supabase login
supabase link --project-ref lqxbwqndxjdxqzftihic
supabase functions deploy analyze-soumissions
supabase functions deploy chat-assistant
supabase functions deploy analyze-diy-materials
supabase functions deploy stripe-webhook
```

Remplace le chemin et le `project-ref` si besoin (le project ref est dans l’URL du dashboard Supabase).

### Clé API Gemini (obligatoire pour les fonctions IA)

Les fonctions **analyze-soumissions**, **chat-assistant** et **analyze-diy-materials** appellent directement l’API Google Gemini (plus de passerelle Lovable). Configure une seule variable :

- **`GEMINI_API_KEY`** (obligatoire) : clé API Google AI Studio (https://aistudio.google.com/apikey).
- **`GEMINI_MODEL_SOUMISSIONS`** (optionnel) : si tu as « quota atteint » alors qu’il te reste du quota, ajoute cette variable pour utiliser un autre modèle (quota séparé) : **`gemini-2.0-flash`** ou **`gemini-3-flash-preview`** (Gemini 3 Flash).

Sans `GEMINI_API_KEY`, les analyses IA et le chat renverront une erreur. En cas de 429, la fonction réessaie automatiquement 2 fois.

### Webhook Stripe (achats test ou réels → déverrouillage des forfaits)

Pour que les achats Stripe (mode test ou live) créent ou mettent à jour l’abonnement dans l’app (et déverrouillent les options du forfait), déploie la fonction `stripe-webhook` et configure Stripe :

1. **Déployer la fonction**  
   `supabase functions deploy stripe-webhook`

2. **Variables d’environnement** (Supabase Dashboard → Project Settings → Edge Functions → Secrets, ou `supabase secrets set`) :
   - `STRIPE_SECRET_KEY` : clé secrète Stripe (sk_test_… ou sk_live_…)
   - `STRIPE_WEBHOOK_SECRET` : secret du webhook Stripe (whsec_…)
   - `STRIPE_PRICE_TO_PLAN_JSON` : correspondance **price ID Stripe → UUID du plan** dans ta table `plans`. Exemple :
     ```json
     {"price_1234Essentiel": "uuid-du-plan-essentiel", "price_5678Pro": "uuid-du-plan-pro"}
     ```
     Les UUID des plans sont dans Supabase → Table Editor → `plans` → colonne `id`.

3. **Dans le Dashboard Stripe** (Developers → Webhooks) : ajouter un endpoint dont l’URL est  
   `https://lqxbwqndxjdxqzftihic.supabase.co/functions/v1/stripe-webhook`  
   et sélectionner les événements : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

4. **Lors de la création du Checkout Stripe** (côté front ou backend), passe l’email du client (ou `client_reference_id` = `user_id` Supabase) pour que le webhook puisse associer l’abonnement au bon utilisateur.

5. **Bouton « Acheter » / Checkout** : déploie aussi la fonction `create-checkout-session` et ajoute la variable :
   - `supabase functions deploy create-checkout-session`
   - `STRIPE_PLAN_TO_PRICE_JSON` : correspondance **UUID du plan (table plans) → Stripe price_id**. Exemple :
     ```json
     {"uuid-plan-essentiel": "price_xxxEssentiel", "uuid-plan-gestion-complete": "price_xxxGestion"}
     ```
   Sans cette variable, le bouton d’achat sur la page Forfaits ne pourra pas rediriger vers Stripe.

**Assignation manuelle par l’admin** : dans Admin → Abonnés, utiliser « Assigner un forfait » pour donner un forfait sans passer par Stripe. L’utilisateur devra éventuellement rafraîchir la page pour voir les options déverrouillées.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
