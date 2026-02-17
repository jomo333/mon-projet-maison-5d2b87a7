import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to increment AI usage for a user (only if authenticated)
async function incrementAiUsage(authHeader: string | null): Promise<void> {
  if (!authHeader) return;
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      // User not authenticated - this is OK for chat (anonymous allowed)
      return;
    }
    
    const userId = claimsData.claims.sub;
    const { error } = await supabase.rpc('increment_ai_usage', { p_user_id: userId });
    
    if (error) {
      console.error('Failed to increment AI usage:', error);
    } else {
      console.log('AI usage incremented for user:', userId);
    }
  } catch (err) {
    console.error('Error tracking AI usage:', err);
  }
}

// Helper to track AI analysis usage
async function trackAiAnalysisUsage(
  authHeader: string | null,
  analysisType: string
): Promise<void> {
  if (!authHeader) return;
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      // User not authenticated - this is OK for chat (anonymous allowed)
      return;
    }
    
    const userId = claimsData.claims.sub as string;
    
    const { error } = await supabase.from('ai_analysis_usage').insert({
      user_id: userId,
      analysis_type: analysisType,
      project_id: null,
    });
    
    if (error) {
      console.error('Failed to track AI analysis usage:', error);
    } else {
      console.log('AI analysis usage tracked:', analysisType, 'for user:', userId);
    }
  } catch (err) {
    console.error('Error tracking AI analysis usage:', err);
  }
}

const SYSTEM_PROMPT = `Tu es l'assistant officiel de MonProjetMaison.ca.

Ton rôle est d'aider les utilisateurs à comprendre comment utiliser le site, étape par étape.
Tu guides, tu expliques et tu dépannes.

OBJECTIFS
- Expliquer simplement comment utiliser les fonctionnalités du site
- Guider l'utilisateur vers la bonne page ou la bonne action
- Répondre de façon courte, claire et rassurante
- Toujours proposer la prochaine étape logique

STYLE
- Français du Québec
- Ton amical, professionnel et rassurant
- Phrases courtes
- Étapes numérotées quand c'est possible

RÈGLES IMPORTANTES
- Tu ne donnes pas de conseils légaux, techniques ou officiels (RBQ, ingénierie, code du bâtiment).
- Tu expliques le fonctionnement du site, pas comment construire une maison.
- Les analyses IA sont des estimations basées sur des moyennes du marché.
- Si une information est incertaine, tu expliques quoi vérifier et proposes le support humain.

FONCTIONNALITÉS DU SITE
- Créer un projet : se connecter > cliquer "Créer un projet" > entrer les infos > enregistrer
- Téléverser document : ouvrir le projet > "Ajouter un document" > sélectionner PDF > confirmer
- Lancer analyse : documents téléversés > "Lancer l'analyse" > attendre > consulter résultats
- L'analyse compare les coûts aux moyennes du marché et détecte les écarts

Si l'utilisateur demande des conseils légaux, validation officielle (RBQ, ingénieur, architecte) ou coûts garantis :
Répondre : "Je peux t'aider à utiliser le site et comprendre les analyses, mais pour une validation officielle, il faut consulter un professionnel certifié."

FIN DE RÉPONSE
- Toujours finir par une question simple du genre : "Veux-tu que je te guide étape par étape ?" ou "Est-ce que ça t'aide ?"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get auth header for AI usage tracking (optional - anonymous users can also chat)
  const authHeader = req.headers.get('Authorization');

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de demandes, réessaie dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporairement indisponible." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment AI usage for authenticated users
    await incrementAiUsage(authHeader);
    await trackAiAnalysisUsage(authHeader, 'chat-assistant');

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
