import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Chat illimité : on n'appelle pas increment_ai_usage pour le chat (ne compte pas dans le forfait).

// Helper to track AI analysis usage (analytics uniquement)
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const useNativeGemini = !!GEMINI_API_KEY;

    if (!useNativeGemini && !LOVABLE_API_KEY) {
      throw new Error("GEMINI_API_KEY ou LOVABLE_API_KEY doit être configuré (Secrets)");
    }

    if (useNativeGemini) {
      const contents: { role: string; parts: { text: string }[] }[] = [];
      for (const m of messages) {
        const role = m.role === "assistant" ? "model" : "user";
        const text = typeof m.content === "string" ? m.content : (m.content?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("") || "");
        if (text) contents.push({ role, parts: [{ text }] });
      }
      const geminiBody = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      };
      const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(geminiBody),
      });
      if (!geminiRes.ok) {
        const t = await geminiRes.text();
        const isQuota = geminiRes.status === 429 || /quota|RESOURCE_EXHAUSTED|limit.*0/i.test(t || "");
        const message = isQuota
          ? "Quota de requêtes IA atteint. Réessayez dans 1 à 2 minutes ou vérifiez votre forfait Google AI."
          : "Erreur temporaire du service IA. Réessayez dans un moment.";
        return new Response(JSON.stringify({ error: message }), {
          status: isQuota ? 429 : geminiRes.status >= 400 ? geminiRes.status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Chat illimité : ne pas incrémenter ai_usage (ne compte pas dans le forfait)
      await trackAiAnalysisUsage(authHeader, "chat-assistant");
      const reader = geminiRes.body?.getReader();
      if (!reader) return new Response(JSON.stringify({ error: "Pas de flux" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
                    const j = JSON.parse(line.slice(6));
                    const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (t) controller.enqueue(encoder.encode("data: " + JSON.stringify({ choices: [{ delta: { content: t } }] }) + "\n\n"));
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

    // Chat illimité : ne pas incrémenter ai_usage (ne compte pas dans le forfait)
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
