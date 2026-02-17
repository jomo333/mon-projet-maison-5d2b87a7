import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

// Prix des matériaux Québec 2025
const PRIX_MATERIAUX_QUEBEC_2025 = {
  bois: {
    "2x4x8_SPF": { prix: 4.50, unite: "pièce" },
    "2x4x10_SPF": { prix: 5.75, unite: "pièce" },
    "2x6x8_SPF": { prix: 7.25, unite: "pièce" },
    "2x6x10_SPF": { prix: 9.50, unite: "pièce" },
    "2x8x12_SPF": { prix: 16.80, unite: "pièce" },
    "2x10x12_SPF": { prix: 22.50, unite: "pièce" },
    "contreplaque_3_4_4x8": { prix: 52.00, unite: "feuille" },
    "OSB_7_16_4x8": { prix: 24.50, unite: "feuille" },
    "OSB_5_8_4x8": { prix: 32.00, unite: "feuille" },
  },
  gypse: {
    "regulier_1_2_4x8": { prix: 18.50, unite: "feuille" },
    "regulier_1_2_4x12": { prix: 26.00, unite: "feuille" },
    "resistant_humidite_1_2_4x8": { prix: 22.00, unite: "feuille" },
    "type_x_5_8_4x8": { prix: 24.00, unite: "feuille" },
  },
  isolation: {
    "R12_fibre_verre_pi2": { prix: 0.55, unite: "pi²" },
    "R20_fibre_verre_pi2": { prix: 0.85, unite: "pi²" },
    "R24_fibre_verre_pi2": { prix: 1.05, unite: "pi²" },
    "R30_fibre_verre_pi2": { prix: 1.15, unite: "pi²" },
    "R40_fibre_verre_pi2": { prix: 1.45, unite: "pi²" },
    "mousse_giclée_pi2_1po": { prix: 2.50, unite: "pi²" },
    "laine_minerale_R22_pi2": { prix: 1.25, unite: "pi²" },
  },
  toiture: {
    "bardeau_asphalte_25ans_carre": { prix: 95.00, unite: "carré (100 pi²)" },
    "bardeau_asphalte_30ans_carre": { prix: 125.00, unite: "carré (100 pi²)" },
    "membrane_Tyvek_pi2": { prix: 0.42, unite: "pi²" },
    "papier_feutre_15lb_rouleau": { prix: 35.00, unite: "rouleau" },
    "solin_aluminium_pied": { prix: 3.50, unite: "pied linéaire" },
  },
  beton: {
    "ciment_portland_30kg": { prix: 12.50, unite: "sac" },
    "beton_premix_30kg": { prix: 8.50, unite: "sac" },
    "beton_30MPa_m3": { prix: 165.00, unite: "m³" },
    "armature_10M_20pi": { prix: 12.00, unite: "barre" },
    "treillis_4x8": { prix: 18.00, unite: "feuille" },
  },
  electricite: {
    "fil_14_2_NMD90_75m": { prix: 95.00, unite: "bobine" },
    "fil_12_2_NMD90_75m": { prix: 125.00, unite: "bobine" },
    "boite_electrique_simple": { prix: 2.50, unite: "unité" },
    "boite_electrique_double": { prix: 4.00, unite: "unité" },
    "prise_standard_15A": { prix: 3.50, unite: "unité" },
    "interrupteur_simple": { prix: 4.00, unite: "unité" },
    "panneau_200A": { prix: 350.00, unite: "unité" },
    "disjoncteur_15A": { prix: 8.00, unite: "unité" },
    "disjoncteur_20A": { prix: 10.00, unite: "unité" },
  },
  plomberie: {
    "tuyau_PEX_1_2_100pi": { prix: 65.00, unite: "rouleau" },
    "tuyau_PEX_3_4_100pi": { prix: 95.00, unite: "rouleau" },
    "tuyau_ABS_3po_10pi": { prix: 28.00, unite: "longueur" },
    "tuyau_ABS_4po_10pi": { prix: 42.00, unite: "longueur" },
    "robinet_lavabo": { prix: 85.00, unite: "unité" },
    "robinet_douche": { prix: 150.00, unite: "unité" },
    "toilette_standard": { prix: 250.00, unite: "unité" },
  },
  finition: {
    "peinture_latex_3.78L": { prix: 45.00, unite: "gallon" },
    "peinture_primer_3.78L": { prix: 35.00, unite: "gallon" },
    "compose_a_joints_20kg": { prix: 22.00, unite: "seau" },
    "ruban_a_joints_rouleau": { prix: 8.00, unite: "rouleau" },
    "moulure_base_mdf_pied": { prix: 1.25, unite: "pied linéaire" },
    "moulure_couronne_pied": { prix: 2.50, unite: "pied linéaire" },
  },
  plancher: {
    "plancher_flottant_pi2": { prix: 3.50, unite: "pi²" },
    "plancher_vinyle_pi2": { prix: 4.50, unite: "pi²" },
    "plancher_bois_franc_pi2": { prix: 8.50, unite: "pi²" },
    "ceramique_12x12_pi2": { prix: 5.00, unite: "pi²" },
    "ceramique_12x24_pi2": { prix: 6.50, unite: "pi²" },
    "sous_plancher_pi2": { prix: 0.45, unite: "pi²" },
  },
};

const SYSTEM_PROMPT_DIY = `Tu es un ESTIMATEUR DE MATÉRIAUX spécialisé pour les projets DIY au Québec.

## MISSION
Analyser les plans de construction pour produire une LISTE DÉTAILLÉE des matériaux nécessaires pour une catégorie spécifique, avec les quantités et prix du marché Québec 2025.

## RÈGLES IMPORTANTES
- Focus sur les MATÉRIAUX SEULEMENT (pas de main-d'œuvre)
- Utilise les prix du marché Québec 2025
- Ajoute 10-15% de surplus pour les pertes/coupes
- Inclure TPS 5% + TVQ 9.975% au total final
- Liste chaque item avec quantité, prix unitaire et sous-total

## FORMAT DE RÉPONSE STRUCTURÉ

Réponds en format Markdown clair avec:

### 📋 Résumé du projet DIY

**Catégorie analysée:** [nom de la catégorie]
**Superficie concernée:** [X pi²]
**Type de travaux:** [description courte]

---

### 📦 Liste détaillée des matériaux

| Matériau | Quantité | Prix unitaire | Sous-total |
|----------|----------|---------------|------------|
| [Item 1] | [qté] [unité] | [prix] $ | [total] $ |
| [Item 2] | [qté] [unité] | [prix] $ | [total] $ |
| ... | ... | ... | ... |

---

### 💰 Sommaire des coûts

| Poste | Montant |
|-------|---------|
| **Sous-total matériaux** | [X] $ |
| **Surplus recommandé (10-15%)** | [X] $ |
| **TPS (5%)** | [X] $ |
| **TVQ (9.975%)** | [X] $ |
| **TOTAL ESTIMÉ** | **[X] $** |

---

### 💡 Conseils pour le projet DIY

- [Conseil 1 spécifique à la catégorie]
- [Conseil 2 pour économiser]
- [Conseil 3 sur les outils nécessaires]

---

### ⚠️ Points d'attention

- [Élément à ne pas oublier]
- [Vérification à faire avant d'acheter]
- [Permis ou normes à respecter si applicable]

---

### 🛒 Où acheter au Québec

Liste les magasins recommandés: Canac, Home Depot, Rona, BMR, Patrick Morin avec avantages de chacun.
`;

async function fetchImageAsBase64(url: string, maxBytes: number): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) return null;
    const base64 = encodeBase64(arrayBuffer);
    const contentType = resp.headers.get('content-type') || 'image/png';
    const mediaType = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'image/jpeg'
      : contentType.includes('webp')
        ? 'image/webp'
        : 'image/png';
    return { base64, mediaType };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const authHeader = req.headers.get('Authorization');
  const authResult = await validateAuth(authHeader);
  
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { categoryName, subCategoryName, planUrls, projectDetails } = body;

    if (!categoryName) {
      return new Response(
        JSON.stringify({ error: "Le nom de la catégorie est requis" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build user prompt with context
    let userPrompt = `Analyse les plans de construction fournis et génère une liste détaillée des matériaux nécessaires pour la catégorie "${categoryName}"`;
    
    if (subCategoryName) {
      userPrompt += ` (sous-catégorie: "${subCategoryName}")`;
    }
    
    userPrompt += ".\n\n";

    if (projectDetails) {
      userPrompt += "## Détails du projet:\n";
      if (projectDetails.squareFootage) {
        userPrompt += `- Superficie: ${projectDetails.squareFootage} pi²\n`;
      }
      if (projectDetails.numberOfFloors) {
        userPrompt += `- Nombre d'étages: ${projectDetails.numberOfFloors}\n`;
      }
      if (projectDetails.projectType) {
        userPrompt += `- Type de projet: ${projectDetails.projectType}\n`;
      }
      if (projectDetails.notes) {
        userPrompt += `- Notes additionnelles: ${projectDetails.notes}\n`;
      }
      userPrompt += "\n";
    }

    userPrompt += `Voici les prix de référence Québec 2025 pour cette catégorie:\n${JSON.stringify(PRIX_MATERIAUX_QUEBEC_2025, null, 2)}\n\n`;
    userPrompt += "Génère une estimation détaillée des matériaux basée sur les plans fournis.";

    // Build message content with images
    const messageContent: any[] = [];

    // Add plan images if provided
    if (planUrls && planUrls.length > 0) {
      const maxBytesPerImage = 2_800_000;
      let imagesAdded = 0;
      const maxImages = 3;

      for (const url of planUrls) {
        if (imagesAdded >= maxImages) break;
        
        const img = await fetchImageAsBase64(url, maxBytesPerImage);
        if (img) {
          messageContent.push({
            type: "image_url",
            image_url: {
              url: `data:${img.mediaType};base64,${img.base64}`,
            },
          });
          imagesAdded++;
        }
      }
    }

    messageContent.push({
      type: "text",
      text: userPrompt,
    });

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_DIY },
          { role: "user", content: messageContent },
        ],
        stream: true,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, veuillez réessayer plus tard." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment AI usage for the user
    await incrementAiUsage(authHeader);
    await trackAiAnalysisUsage(authHeader, 'analyze-diy-materials', null);

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error in analyze-diy-materials:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
