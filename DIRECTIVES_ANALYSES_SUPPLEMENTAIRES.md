# Directives : Analyses IA supplémentaires

Option pour les forfaits **Essentiel** et **Gestion complète** : acheter 10 analyses pour 10 $ ou 20 analyses pour 15 $.

---

## 1. Supabase

### 1.1 Migration SQL

Exécuter la migration dans le **SQL Editor** du Dashboard Supabase (https://supabase.com/dashboard) :

Copier-coller le contenu de :
`supabase/migrations/20260219150000_user_ai_credits.sql`

Puis cliquer **Run**.

Cette migration crée :
- Table `user_ai_credits` (crédits bonus par utilisateur)
- Fonctions `get_bonus_ai_credits`, `add_bonus_ai_credits`, `admin_add_bonus_ai_credits`
- Mise à jour de `check_ai_analysis_limit` pour inclure les crédits bonus

---

## 2. Stripe

### 2.1 Créer les produits (one-time payment)

1. Stripe Dashboard → **Products** → **Add product**
2. **Produit 1** :
   - Name : `10 analyses IA supplémentaires`
   - Price : **One time** 10,00 $ CAD
   - Noter le **Price ID** (ex. `price_1ABC123...`)
3. **Produit 2** :
   - Name : `20 analyses IA supplémentaires`
   - Price : **One time** 15,00 $ CAD
   - Noter le **Price ID** (ex. `price_1DEF456...`)

### 2.2 Variable d'environnement Supabase

1. Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
2. Ajouter : **STRIPE_CREDITS_PRICE_JSON**
3. Valeur :
   ```json
   {"10": "price_xxx", "20": "price_yyy"}
   ```
   Remplacer `price_xxx` et `price_yyy` par tes Price ID Stripe.

### 2.3 Webhook Stripe

Le webhook existant gère déjà les achats de crédits. Vérifier que l’événement **checkout.session.completed** est bien configuré.

URL du webhook : `https://lqxbwqndxjdxqzftihic.supabase.co/functions/v1/stripe-webhook`

---

## 3. Déploiement des Edge Functions

```bash
supabase functions deploy create-checkout-credits
supabase functions deploy stripe-webhook
```

---

## 4. Utilisation

### Utilisateur (Essentiel / Gestion complète)

- Carte **Utilisation** (Mes projets) : boutons **10 analyses — 10 $** et **20 analyses — 15 $**
- Clic → redirection vers Stripe Checkout → paiement → crédits ajoutés automatiquement

### Admin

- **Admin** → **Abonnés** → menu Actions (⋮) d’un utilisateur Essentiel ou Gestion complète
- **Ajouter crédits analyses** → saisir le nombre → Confirmer

---

## 5. Récapitulatif des secrets Supabase

| Secret | Description |
|--------|-------------|
| STRIPE_SECRET_KEY | Clé secrète Stripe |
| STRIPE_WEBHOOK_SECRET | Secret du webhook Stripe |
| STRIPE_PRICE_TO_PLAN_JSON | price_id → plan_id (abonnements) |
| STRIPE_PLAN_TO_PRICE_JSON | plan_id → price_id (checkout forfaits) |
| **STRIPE_CREDITS_PRICE_JSON** | **{"10": "price_xxx", "20": "price_yyy"}** (crédits analyses) |
