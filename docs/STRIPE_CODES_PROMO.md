# Configurer les codes promo sur Stripe

## Dans l’app (admin)

1. Aller dans **Admin → Promotions**.
2. Cliquer sur **Nouveau code promo**.
3. Renseigner :
   - **Code** : ex. `WELCOME20` (affiché au client sur la page de paiement).
   - **Type** : pourcentage ou montant fixe (CAD).
   - **Valeur** : ex. 20 (%) ou 10 (CAD).
   - **Durée** : une fois, répétée (N mois), ou toujours.
   - **Utilisations max** et **Expiration** (optionnels).
4. Créer le code. Il est enregistré dans Stripe et utilisable immédiatement sur le checkout forfaits.

Les clients voient un champ « Code promo » sur la page Stripe Checkout et peuvent saisir le code avant de payer.

---

## Dans le tableau de bord Stripe

Si vous préférez créer ou modifier les codes directement dans Stripe :

1. Se connecter à [dashboard.stripe.com](https://dashboard.stripe.com).
2. **Produits** → **Coupons** (ou **Promotion codes** selon la vue).
3. **Créer un coupon** :
   - Choisir **Pourcentage** ou **Montant fixe**.
   - Renseigner la réduction et la **Durée** (une fois, plusieurs mois, ou pour toujours).
   - Optionnel : nombre max d’utilisations, date d’expiration.
4. **Créer un code promotionnel** (lien sous le coupon ou onglet **Promotion codes**) :
   - Associer le coupon créé.
   - Saisir le **code client** (ex. `WELCOME20`) que les clients taperont au checkout.

Les codes créés dans le dashboard Stripe sont aussi proposés automatiquement sur la page de paiement (le checkout a `allow_promotion_codes: true`).

---

## Technique

- **Checkout** : la fonction `create-checkout-session` crée une session Stripe avec `allow_promotion_codes: true`, donc le champ code promo apparaît sur la page Stripe.
- **Création depuis l’admin** : l’Edge Function `stripe-promotion-codes` (POST) crée un **Coupon** puis un **Promotion Code** dans Stripe via l’API.
- **Liste** : l’Edge Function `stripe-promotion-codes` (GET) renvoie les codes promotionnels actifs.

Variables d’environnement requises (Supabase) : `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` pour la vérification admin.
