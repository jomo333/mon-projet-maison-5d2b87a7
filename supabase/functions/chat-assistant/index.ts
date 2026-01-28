import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
