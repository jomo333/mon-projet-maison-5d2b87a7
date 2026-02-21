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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user?.id) {
      // User not authenticated - this is OK for chat (anonymous allowed)
      return;
    }
    
    const userId = user.id;
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
    
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !user?.id) {
      // User not authenticated - this is OK for chat (anonymous allowed)
      return;
    }
    
    const userId = user.id;
    
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
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("GEMINI_API_KEY ou LOVABLE_API_KEY doit être configuré (Supabase → Edge Functions → Secrets)");
    }

    // Convertir format OpenAI (messages) vers format Gemini (contents)
    const contents: { role: string; parts: { text: string }[] }[] = [];
    let systemInstruction = SYSTEM_PROMPT;
    for (const msg of messages) {
      const role = msg.role === "assistant" ? "model" : msg.role === "system" ? "system" : "user";
      const text = typeof msg.content === "string" ? msg.content : (Array.isArray(msg.content) ? msg.content.map((p: { type?: string; text?: string }) => p.text || "").join("") : "");
      if (role === "system") {
        systemInstruction = text || systemInstruction;
      } else if (role === "user" || role === "model") {
        contents.push({ role, parts: [{ text }] });
      }
    }

    const geminiBody = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: contents.length ? contents : [{ role: "user", parts: [{ text: "Bonjour" }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    };

    // Utiliser GEMINI_MODEL_CHAT si défini (sinon Gemini 3 Flash par défaut)
    const geminiModel = Deno.env.get("GEMINI_MODEL_CHAT") || "gemini-3-flash-preview";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse`;
    const apiKey = GEMINI_API_KEY || LOVABLE_API_KEY;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText?.slice(0, 500));
      if (geminiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de demandes, réessaie dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Extraire le message d'erreur lisible de la réponse Gemini
      let errMsg = "Erreur du service IA";
      try {
        const errJson = JSON.parse(errText);
        const detail = errJson?.error?.message || errJson?.error?.status || errText?.slice(0, 150);
        if (detail) errMsg = `Erreur IA: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
      } catch {
        if (errText?.length) errMsg = `Erreur IA: ${errText.slice(0, 200)}`;
      }
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ne pas bloquer la réponse si le tracking échoue
    try {
      await incrementAiUsage(authHeader);
      await trackAiAnalysisUsage(authHeader, "chat-assistant");
    } catch (trackErr) {
      console.error("Tracking error (non-blocking):", trackErr);
    }

    const reader = geminiRes.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "Pas de flux de réponse" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
                    controller.enqueue(encoder.encode("data: " + JSON.stringify({ choices: [{ delta: { content: text } }] }) + "\n\n"));
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
    return new Response(stream, {
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
