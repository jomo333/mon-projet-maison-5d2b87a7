import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to validate authentication
async function validateAuth(authHeader: string | null): Promise<{ userId: string } | { error: string; status: number }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: "Authentification requise. Veuillez vous connecter.", status: 401 };
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth validation failed:', userError);
      return { error: "Session invalide. Veuillez vous reconnecter.", status: 401 };
    }
    
    return { userId: user.id };
  } catch (err) {
    console.error('Auth validation error:', err);
    return { error: "Erreur de validation de l'authentification.", status: 500 };
  }
}

// Helper to increment AI usage for a user
async function incrementAiUsage(authHeader: string | null): Promise<void> {
  if (!authHeader) return;
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('Could not get user for AI usage tracking');
      return;
    }
    
    const { error } = await supabase.rpc('increment_ai_usage', { p_user_id: user.id });
    
    if (error) {
      console.error('Failed to increment AI usage:', error);
    } else {
      console.log('AI usage incremented for user:', user.id);
    }
  } catch (err) {
    console.error('Error tracking AI usage:', err);
  }
}

// Helper to track AI analysis usage
async function trackAiAnalysisUsage(
  authHeader: string | null,
  analysisType: string,
  projectId?: string | null
): Promise<void> {
  if (!authHeader) return;
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !user) {
      console.log('Could not get user for AI analysis tracking');
      return;
    }
    
    const { error } = await serviceSupabase.from('ai_analysis_usage').insert({
      user_id: user.id,
      analysis_type: analysisType,
      project_id: projectId || null,
    });
    
    if (error) {
      console.error('Failed to track AI analysis usage:', error);
    } else {
      console.log('AI analysis usage tracked:', analysisType, 'for user:', user.id);
    }
  } catch (err) {
    console.error('Error tracking AI analysis usage:', err);
  }
}

interface SoumissionDoc {
  file_name: string;
  file_url: string;
}

// Convert file to base64 for Gemini Vision
async function fetchFileAsBase64(fileUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    console.log("Fetching file from:", fileUrl);
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error("Failed to fetch file:", response.status);
      return null;
    }
    
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    console.log(`File fetched: ${Math.round(buffer.byteLength / 1024)} KB, type: ${contentType}`);
    
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error("Error fetching file:", error);
    return null;
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

const SYSTEM_PROMPT = `Tu es un assistant IA pour MonProjetMaison.ca, spécialisé en analyse de soumissions en construction résidentielle au Québec.
Tu aides l'utilisateur à valider des informations publiques afin d'éclairer sa prise de décision.

## ⚖️ CADRE LÉGAL OBLIGATOIRE

- Tu ne certifies JAMAIS un entrepreneur.
- Tu ne certifies JAMAIS la conformité fiscale d'un fournisseur.
- Tu ne remplaces pas la Régie du bâtiment du Québec (RBQ).
- La vérification est INFORMATIVE SEULEMENT, basée sur les données publiques.
- Tu dois TOUJOURS recommander une vérification officielle sur les sites officiels (RBQ, Revenu Québec, ARC).
- Tu ne donnes AUCUN avis légal, fiscal ou juridique.

## TA MISSION
Analyser les soumissions et produire un RÉSUMÉ CLAIR et COMPLET avec:
- Toutes les spécifications techniques
- Validation des licences RBQ
- Vérification des numéros de taxes (TPS/TVQ)

## FORMAT DE RÉPONSE (OBLIGATOIRE)

Tu DOIS générer DEUX blocs JSON obligatoires en plus du texte Markdown. Ces blocs sont ESSENTIELS.

### BLOC 1: \`\`\`contacts\`\`\` (OBLIGATOIRE)

Un bloc JSON avec la liste de TOUTES les entreprises extraites:

\`\`\`contacts
[
  {
    "nom_entreprise": "Nom exact de l'entreprise",
    "telephone": "514-123-4567",
    "courriel": "info@entreprise.com",
    "rbq": "1234-5678-90",
    "tps": "123456789RT0001",
    "tvq": "1234567890TQ0001"
  }
]
\`\`\`

**Règles pour le bloc contacts:**
- Un objet par entreprise/fournisseur
- Si une info est absente, mettre "" (chaîne vide) ou null
- Le numéro RBQ doit être au format XXXX-XXXX-XX
- TPS au format 123456789RT0001, TVQ au format 1234567890TQ0001

### BLOC 2: \`\`\`comparaison_json\`\`\` (OBLIGATOIRE)

Un bloc JSON avec la comparaison détaillée de TOUTES les entreprises:

\`\`\`comparaison_json
{
  "description_projet": "Résumé du projet en 2-3 lignes basé sur les soumissions analysées.",
  "entreprises": [
    {
      "nom_entreprise": "Nom exact de l'entreprise",
      "cout_avant_taxes": 12500.00,
      "specifications_techniques": "Liste détaillée: marque X, modèle Y, 24000 BTU, SEER 20, etc.",
      "garanties": "Pièces: 10 ans, Main-d'œuvre: 2 ans, Compresseur: 10 ans",
      "inclusions": "Installation complète, mise en service, formation, etc.",
      "exclusions": "Permis de construction, travaux électriques, etc.",
      "conditions": "Validité: 30 jours, Délai: 2-3 semaines, Paiement: 50% dépôt"
    }
  ]
}
\`\`\`

**Règles pour le bloc comparaison_json:**
- description_projet: 2-3 phrases résumant le projet (type de travaux, portée)
- cout_avant_taxes: nombre décimal (ex: 12500.00)
- specifications_techniques: TOUTES les specs extraites (marque, modèle, puissance, dimensions, efficacité, etc.)
- garanties: TOUTES les garanties mentionnées avec durées exactes
- inclusions: TOUT ce qui est inclus dans la soumission
- exclusions: TOUT ce qui est exclu ou non mentionné
- conditions: validité, délais, paiement, autres conditions

**AUCUN CHAMP NE PEUT ÊTRE VIDE.** Si une info n'est pas disponible, écrire "Non spécifié dans la soumission".

---

### 📋 Résumé des soumissions

Pour CHAQUE document analysé, présente un bloc DÉTAILLÉ:

**🏢 [Nom de l'entreprise]**
- 📞 Téléphone: [numéro]
- 📧 Courriel: [email si disponible]

---

### 🔍 Vérification de licence RBQ (information publique)

Pour CHAQUE entreprise mentionnée dans les soumissions:

| Entreprise | Numéro RBQ | Statut | Catégories | Action requise |
|------------|------------|--------|------------|----------------|
| [Nom] | [Numéro ou "Non fourni"] | 🟢/🟠/🔴 | [Catégories] | [Recommandation] |

**Légende des statuts:**
- 🟢 Licence active (information publique) - le numéro semble valide selon le format RBQ
- 🟠 Licence active – catégories à confirmer - numéro présent mais catégories non vérifiables
- 🔴 Licence inactive, introuvable ou non fournie - ATTENTION REQUISE

**⚠️ IMPORTANT - Texte légal obligatoire:**
> La vérification de la licence RBQ est effectuée à partir des informations publiques disponibles.
> Elle est fournie à titre informatif seulement et ne remplace pas la vérification officielle effectuée directement auprès de la Régie du bâtiment du Québec.
> 
> 🔗 **Vérifier les licences directement:** [Registre des détenteurs de licence RBQ](https://www.rbq.gouv.qc.ca/services-en-ligne/registre-des-detenteurs-de-licence/)

---

### 🧾 Vérification des numéros de taxes (information publique)

Pour CHAQUE entreprise mentionnée dans les soumissions:

| Entreprise | TPS (GST) | TVQ (QST) | Statut | Action requise |
|------------|-----------|-----------|--------|----------------|
| [Nom] | [Numéro ou "Non fourni"] | [Numéro ou "Non fourni"] | 🟢/🟠/🔴 | [Recommandation] |

**Légende des statuts:**
- 🟢 Numéros fournis et format valide (information publique)
- 🟠 Numéros fournis – validation recommandée
- 🔴 Numéros absents ou format invalide - ATTENTION REQUISE

**Formats attendus:**
- TPS (numéro d'entreprise fédéral): 9 chiffres + RT0001 (ex: 123456789RT0001)
- TVQ (numéro d'inscription Revenu Québec): 10 chiffres + TQ0001 (ex: 1234567890TQ0001)

**⚠️ IMPORTANT - Texte légal obligatoire:**
> La vérification des numéros de taxes est effectuée à partir des informations visibles sur les documents.
> Elle est fournie à titre informatif seulement et ne remplace pas la vérification officielle.
> 
> 🔗 **Vérifier les numéros de taxes:**
> - [Registre TPS/TVH - Agence du revenu du Canada](https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-entreprises/confirmer-numero-inscription-tps-tvh.html)
> - [Validation TVQ - Revenu Québec](https://www.revenuquebec.ca/fr/)

**⚠️ Signaux d'alerte fiscaux:**
- Taxes facturées SANS numéros de taxes visibles = ALERTE CRITIQUE
- Numéros incomplets ou format incorrect = À VÉRIFIER
- Aucune taxe facturée sur montant > 30 000$ = Vérifier si petit fournisseur exempté

---

### 💰 Tarification

Pour CHAQUE entreprise:

**💰 Tarification:**
- Montant avant taxes: [montant] $
- TPS (5%): [montant] $
- TVQ (9.975%): [montant] $
- **Total avec taxes: [montant × 1.14975] $**

**🔧 Spécifications techniques:**
- Puissance/Capacité: [BTU, kW, tonnes, etc. - TRÈS IMPORTANT]
- Marque et modèle: [détails complets]
- Efficacité énergétique: [SEER, HSPF, coefficient, etc.]
- Dimensions/Superficie couverte: [si applicable]
- Autres specs techniques: [voltage, débit, etc.]

**🛡️ Garanties:**
- Garantie pièces: [durée]
- Garantie main-d'œuvre: [durée]
- Garantie compresseur/moteur: [durée si applicable]
- Extension garantie disponible: [Oui/Non et conditions]

**📦 Ce qui est inclus:**
- [Liste détaillée des éléments inclus]

**❌ Exclusions:**
- [Éléments non inclus importants]

**📅 Conditions:**
- Validité de l'offre: [date ou durée]
- Délai d'exécution: [durée estimée]
- Conditions de paiement: [si mentionné]

---

### 🏛️ Subventions applicables

Vérifie si le type de travaux peut bénéficier de subventions québécoises ou fédérales:

| Programme | Admissibilité | Montant potentiel | Conditions |
|-----------|---------------|-------------------|------------|
| Rénoclimat (efficacité énergétique) | Oui/Non/Peut-être | Jusqu'à X $ | [conditions] |
| LogisVert (thermopompes, isolation) | Oui/Non | Jusqu'à X $ | [conditions] |
| Chauffez vert (remplacement fossile) | Oui/Non | X $ | [conditions] |
| Subvention Hydro-Québec | Oui/Non | X $ | [conditions] |
| Programme fédéral | Oui/Non | X $ | [conditions] |

---

### 📊 Comparaison technique et financière

| Critère | Entreprise 1 | Entreprise 2 | ... |
|---------|--------------|--------------|-----|
| **Licence RBQ** | 🟢/🟠/🔴 | 🟢/🟠/🔴 | |
| **Taxes TPS/TVQ** | 🟢/🟠/🔴 | 🟢/🟠/🔴 | |
| **Puissance (BTU/kW)** | X | Y | |
| **Marque/Modèle** | X | Y | |
| **Efficacité (SEER)** | X | Y | |
| **Prix avant taxes** | X $ | Y $ | |
| **Prix avec taxes** | X $ | Y $ | |
| **Subventions applicables** | X $ | Y $ | |
| **💵 COÛT NET FINAL** | **X $** | **Y $** | |
| **Garantie pièces** | X ans | Y ans | |
| **Garantie main-d'œuvre** | X ans | Y ans | |
| **Garantie compresseur** | X ans | Y ans | |
| **Score garantie /10** | X | Y | |

---

### ⭐ Recommandation

**🏆 Meilleur choix: [Nom de l'entreprise]**

**Pourquoi cette recommandation (par ordre d'importance):**

1. **Conformité RBQ:** [Statut de la licence - CRITÈRE PRIORITAIRE]
2. **Conformité fiscale:** [Statut des numéros de taxes]
3. **Coût net après subventions:** [montant] $ - [X% moins cher que la moyenne]
4. **Spécifications techniques:** [BTU/puissance appropriée pour les besoins]
5. **Garanties long terme:** [résumé des garanties - très important pour la durabilité]
6. **Rapport qualité/prix:** [évaluation]
7. **Fiabilité de la marque:** [commentaire sur la réputation]

**📊 Analyse du coût:**
- Prix avec taxes: [montant] $
- Subventions applicables: - [montant] $
- **Coût NET final: [montant] $**
- Économie vs concurrent le plus cher: [montant] $

**🛡️ Avantages garanties:**
- [Détail des garanties qui font la différence à long terme]
- [Coût potentiel de réparations évitées]

**Points à négocier avant de signer:**
- [Point 1]
- [Point 2]

---

### ⚠️ Alertes et mises en garde

**🔴 ALERTES CRITIQUES (Conformité):**
- [Soumissions sans numéro RBQ visible]
- [Soumissions facturant des taxes SANS numéros de taxes visibles]
- [Numéros RBQ ou taxes à vérifier impérativement avant signature]

**🟠 Autres alertes:**
- [Alerte sur les prix anormalement bas]
- [Garanties insuffisantes chez certains fournisseurs]
- [Équipements sous-dimensionnés ou sur-dimensionnés]
- [Marques moins fiables]

---

### 📋 Actions recommandées avant de signer

1. ✅ **Vérifier TOUTES les licences RBQ** sur le site officiel: [rbq.gouv.qc.ca](https://www.rbq.gouv.qc.ca/services-en-ligne/registre-des-detenteurs-de-licence/)
2. ✅ **Vérifier les numéros de taxes TPS/TVQ** sur les sites officiels
3. ✅ Demander une preuve d'assurance responsabilité
4. ✅ Confirmer les catégories de licence correspondent aux travaux
5. ✅ Obtenir un contrat écrit détaillé
6. ✅ Vérifier les références de l'entrepreneur

## ORDRE DE RÉPONSE OBLIGATOIRE (CRITIQUE)

Tu DOIS structurer ta réponse EXACTEMENT dans cet ordre:

**PARTIE 1 - EN PREMIER (tout le texte lisible pour l'utilisateur):**
1. Commence par: **📋 Résumé des soumissions**
2. Pour chaque entreprise: **🏢 Nom** puis **📞 Téléphone**, **📧 Courriel**
3. Puis la section **🔍 Vérification de licence RBQ** avec le tableau et la légende
4. Puis le **texte légal obligatoire** RBQ
5. Puis **🧾 Vérification des numéros de taxes** avec le tableau et la légende
6. Puis le **texte légal obligatoire** taxes
7. Puis **💰 Tarification** pour chaque entreprise
8. Puis le reste (spécifications, garanties, recommandation, etc.)

**PARTIE 2 - À LA FIN UNIQUEMENT (après tout le texte ci-dessus):**
9. En dernier, place le bloc \`\`\`contacts\`\`\` (JSON)
10. Puis le bloc \`\`\`comparaison_json\`\`\` (JSON)

NE JAMAIS mettre les blocs JSON au début. L'utilisateur doit voir d'abord le résumé formaté avec émojis et tableaux.

## RÈGLES IMPORTANTES

1. **BLOCS JSON OBLIGATOIRES** - Tu DOIS TOUJOURS générer les blocs \`\`\`contacts\`\`\` et \`\`\`comparaison_json\`\`\` **À LA FIN** de ta réponse, après tout le résumé formaté
2. **LICENCE RBQ OBLIGATOIRE** - Cherche TOUJOURS le numéro RBQ dans les documents (souvent en bas de page ou en-tête)
3. **NUMÉROS DE TAXES OBLIGATOIRES** - Cherche TOUJOURS les numéros TPS et TVQ sur les soumissions
4. **SPÉCIFICATIONS TECHNIQUES OBLIGATOIRES** - Extrait TOUJOURS: BTU, kW, SEER, tonnes, HP, etc.
5. **GARANTIES DÉTAILLÉES** - Analyse TOUTES les garanties (pièces, main-d'œuvre, compresseur, etc.)
6. **RECOMMANDATION BASÉE SUR:**
   - 1er critère: Conformité RBQ (PRIORITAIRE!)
   - 2e critère: Conformité fiscale (numéros de taxes)
   - 3e critère: Coût NET après subventions
   - 4e critère: Garanties long terme (très important!)
   - 5e critère: Spécifications techniques appropriées
   - 6e critère: Réputation de la marque
7. **Montants AVANT TAXES** - Affiche toujours le montant avant taxes, puis avec taxes, puis après subventions
8. **Taxes québécoises** - TPS 5% + TVQ 9.975% = 14.975% total
9. **Émojis** - Utilise les émojis pour rendre le texte plus lisible
10. **Concis mais complet** - Toutes les infos techniques importantes

## PROGRAMMES DE SUBVENTIONS QUÉBEC 2025

Selon le type de travaux, voici les subventions potentielles:

- **Rénoclimat**: Isolation, fenêtres écoénergétiques, thermopompes - jusqu'à 20 000 $
- **LogisVert**: Thermopompes murales 3 000$, centrales 5 000$, géothermie 7 500 $
- **Chauffez vert**: Remplacement système chauffage fossile - jusqu'à 1 850 $
- **Hydro-Québec**: Thermopompe - jusqu'à 1 500 $
- **Subvention fédérale Greener Homes**: Jusqu'à 5 000 $ (cumulable)

## EXTRACTION DES DONNÉES

⚠️ **RÈGLE CRITIQUE - DISTINCTION FOURNISSEUR vs CLIENT:**
Les soumissions contiennent DEUX types d'informations de contact:
1. **FOURNISSEUR/ENTREPRISE** (EN-TÊTE/LOGO) = Ce que tu dois extraire
2. **CLIENT/DESTINATAIRE** (souvent après "Soumission pour:", "À:", "Client:") = À IGNORER COMPLÈTEMENT

**Comment identifier le FOURNISSEUR:**
- Logo ou en-tête de la page (généralement en haut à gauche ou centré)
- Section "De:", "From:", "Entreprise:"
- Pied de page avec coordonnées
- À côté du numéro de licence RBQ
- À côté des numéros de taxes TPS/TVQ

**Comment identifier le CLIENT (à IGNORER):**
- Après "Soumission pour:", "À:", "Client:", "Destinataire:", "Facturer à:", "Bill to:"
- Adresse de chantier ou adresse de projet
- Nom de personne (prénom + nom) sans nom d'entreprise

**EXTRAIRE UNIQUEMENT les infos du FOURNISSEUR:**
- Nom de l'entreprise du FOURNISSEUR (dans le logo/en-tête, PAS le nom du client)
- Téléphone du FOURNISSEUR (en-tête, pied de page, signature de l'entreprise)
- Courriel du FOURNISSEUR
- **NUMÉRO DE LICENCE RBQ** (format: XXXX-XXXX-XX) - PRIORITAIRE! Chercher en-tête, pied de page
- **NUMÉROS DE TAXES TPS/TVQ** - Chercher près des montants de taxes ou en pied de page
  - TPS: format 123456789RT0001
  - TVQ: format 1234567890TQ0001
- Montant total AVANT TAXES (chercher "sous-total" ou montant avant TPS/TVQ)
- **SPÉCIFICATIONS TECHNIQUES: BTU, kW, SEER, HSPF, tonnes, CFM, HP, voltage, etc.**
- **TOUTES LES GARANTIES: pièces, main-d'œuvre, compresseur, échangeur, etc.**
- Ce qui est inclus et exclu
- Marque et modèle exact de l'équipement

Si une info est introuvable, écris "Non spécifié" et note-le comme un point négatif.
**Si le numéro RBQ n'est pas visible, c'est une ALERTE CRITIQUE à signaler.**
**Si des taxes sont facturées SANS numéros de taxes visibles, c'est une ALERTE CRITIQUE à signaler.**`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const authHeader = req.headers.get('Authorization');
  const authResult = await validateAuth(authHeader);
  
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: authResult.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { tradeName, tradeDescription, documents, budgetPrevu, detailed = false } = await req.json() as {
      tradeName: string;
      tradeDescription: string;
      documents: SoumissionDoc[];
      budgetPrevu?: number;
      detailed?: boolean;
    };

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun document à analyser" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY doit être configuré (Supabase → Edge Functions → Secrets)");
    }

    console.log(`Analyzing ${documents.length} documents for ${tradeName} via Gemini API`);

    // Build message parts with documents
    const messageParts: any[] = [];
    
    messageParts.push({
      type: "text",
      text: `ANALYSE DE SOUMISSIONS - ${tradeName.toUpperCase()}
      
Corps de métier: ${tradeName}
Description: ${tradeDescription}
Nombre de documents: ${documents.length}
${budgetPrevu ? `Budget prévu par le client: ${budgetPrevu.toLocaleString('fr-CA')} $` : ''}

Analyse les ${documents.length} soumission(s) ci-dessous avec PRÉCISION.
Extrait les contacts, compare les prix, identifie les anomalies.

Documents à analyser:`
    });

    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`Processing document ${i + 1}: ${doc.file_name}`);
      
      messageParts.push({
        type: "text",
        text: `\n\n--- DOCUMENT ${i + 1}: ${doc.file_name} ---`
      });
      
      const fileData = await fetchFileAsBase64(doc.file_url);
      
      if (fileData) {
        const mimeType = getMimeType(doc.file_name);
        
        if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
          messageParts.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${fileData.base64}`
            }
          });
          console.log(`Added ${mimeType} document to analysis`);
        } else {
          messageParts.push({
            type: "text",
            text: `[Document ${doc.file_name} - Format non supporté. Convertir en PDF ou image.]`
          });
        }
      } else {
        messageParts.push({
          type: "text",
          text: `[Impossible de charger le document ${doc.file_name}]`
        });
      }
    }

    // Add final instructions
    messageParts.push({
      type: "text",
      text: `

---

Maintenant, analyse TOUS ces documents.

**ORDRE OBLIGATOIRE de ta réponse:**
- COMMENCE par le résumé lisible: **📋 Résumé des soumissions**, puis pour chaque entreprise **🏢 Nom**, **📞**, **📧**, puis les tableaux **🔍 RBQ** et **🧾 Taxes** (avec textes légaux), puis **💰 Tarification**, spécifications, recommandation.
- À LA FIN seulement, ajoute les deux blocs JSON: \`\`\`contacts\`\`\` puis \`\`\`comparaison_json\`\`\`.

Ne mets jamais les blocs JSON en premier. Le lecteur doit voir d'abord le beau résumé formaté.

${budgetPrevu ? `
IMPORTANT: Compare chaque soumission au budget prévu de ${budgetPrevu.toLocaleString('fr-CA')} $.
Calcule l'écart en % et signale si le budget est dépassé.
` : ''}`
    });

    // Modèle : GEMINI_MODEL_SOUMISSIONS dans Supabase Secrets pour cibler un modèle (ex. gemini-2.0-flash ou gemini-3-flash-preview = quota séparé de 1.5)
    const defaultFlash = "gemini-1.5-flash";
    const defaultPro = "gemini-1.5-pro";
    const geminiModel = Deno.env.get("GEMINI_MODEL_SOUMISSIONS") || (detailed ? defaultPro : defaultFlash);
    console.log("Sending request to", geminiModel, "with", messageParts.length, "parts");
    const geminiParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
    for (const part of messageParts) {
      if (part.type === "text" && part.text) {
        geminiParts.push({ text: part.text });
      } else if (part.type === "image_url" && part.image_url?.url?.startsWith("data:")) {
        const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          geminiParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }
    const geminiBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: geminiParts }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.2 },
    };
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse`;
    const maxRetries = 2;
    let geminiRes: Response | null = null;
    let lastErrText = "";
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delayMs = attempt * 3000;
        console.log("Quota/rate limit (429), retry in", delayMs / 1000, "s, attempt", attempt);
        await new Promise((r) => setTimeout(r, delayMs));
      }
      geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(geminiBody),
      });
      if (geminiRes.ok) break;
      lastErrText = await geminiRes.text();
      const isQuota = geminiRes.status === 429 || /quota|RESOURCE_EXHAUSTED|limit.*0/i.test(lastErrText || "");
      if (!isQuota || attempt === maxRetries) break;
    }
    if (!geminiRes!.ok) {
      const errText = lastErrText;
      console.error("Gemini API error:", geminiRes!.status, errText);
      const isQuota = geminiRes!.status === 429 || /quota|RESOURCE_EXHAUSTED|limit.*0/i.test(errText || "");
      const isModelNotFound = geminiRes!.status === 404 || /not found|invalid model|model.*does not exist/i.test(errText || "");
      let message: string;
      if (isQuota) {
        message = "Quota / limite de requêtes atteinte pour ce modèle. Réessayez dans 1 à 2 minutes, ou configurez un autre modèle (Supabase → Edge Functions → Secrets → GEMINI_MODEL_SOUMISSIONS = gemini-2.0-flash ou gemini-3-flash-preview pour utiliser le quota Gemini 2/3 Flash).";
      } else if (isModelNotFound) {
        message = "Modèle IA non disponible. Définissez GEMINI_MODEL_SOUMISSIONS dans Supabase (ex: gemini-1.5-flash, gemini-2.0-flash).";
      } else if (geminiRes!.status === 403 || /API key|permission|forbidden/i.test(errText || "")) {
        message = "Clé API invalide ou sans accès. Vérifiez GEMINI_API_KEY dans Supabase (Edge Functions → Secrets).";
      } else {
        message = "Erreur temporaire du service IA. Réessayez dans un moment. (Détail: " + (errText?.slice(0, 200) || geminiRes!.status) + ")";
      }
      return new Response(JSON.stringify({ error: message }), {
        status: isQuota ? 429 : geminiRes!.status >= 400 ? geminiRes!.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await incrementAiUsage(authHeader);
    await trackAiAnalysisUsage(authHeader, "analyze-soumissions", null);
    const successRes = geminiRes as Response;
    const reader = successRes.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "Pas de flux de réponse" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const json = JSON.parse(line.slice(6));
                  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    const openAiChunk = JSON.stringify({ choices: [{ delta: { content: text } }] });
                    controller.enqueue(encoder.encode("data: " + openAiChunk + "\n\n"));
                  }
                } catch (_) {}
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("analyze-soumissions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
