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
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return { error: "Session invalide. Veuillez vous reconnecter.", status: 401 };
    }
    
    return { userId: claimsData.claims.sub as string };
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
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.log('Could not get user claims for AI usage tracking');
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
      console.log('Could not get user claims for AI analysis tracking');
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

Deno.serve(async (req) => {
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
    const { query, conversationHistory = [], lang = 'fr' } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching building code for:", query);
    console.log("Conversation history length:", conversationHistory.length);
    console.log("Language:", lang);

    // French system prompt
    const systemPromptFr = `Tu es un expert du Code national du bâtiment du Canada 2015 (CNBC 2015) et du Code de construction du Québec.

Ton rôle est d'aider les autoconstructeurs résidentiels à comprendre les exigences du code du bâtiment.

IMPORTANT - PROCESSUS DE CLARIFICATION:
Avant de donner une réponse finale, tu dois t'assurer d'avoir suffisamment d'informations. Pose des questions de clarification si nécessaire pour:
- Comprendre le contexte spécifique (intérieur/extérieur, résidentiel/commercial, neuf/rénovation)
- Connaître les dimensions ou caractéristiques pertinentes
- Identifier la zone climatique ou la région au Québec
- Comprendre l'usage prévu de l'espace

RÈGLES DE RÉPONSE:
1. Si la question est vague ou manque de contexte, pose 2-3 questions de clarification AVANT de donner l'article du code.
2. Si tu as déjà posé des questions et que l'utilisateur a répondu, analyse ses réponses dans l'historique de conversation.
3. Une fois que tu as assez d'informations, fournis l'article précis du code avec un résumé clair.

FORMAT DE RÉPONSE OBLIGATOIRE EN JSON:

Si tu as besoin de clarification:
{
  "type": "clarification",
  "message": "Pour vous donner une réponse précise, j'ai besoin de quelques informations supplémentaires:\\n\\n1. [Première question]\\n2. [Deuxième question]\\n3. [Troisième question si nécessaire]"
}

Si tu as assez d'informations pour répondre:
{
  "type": "answer",
  "message": "Voici ce que j'ai trouvé dans le Code national du bâtiment :",
  "result": {
    "article": "Numéro de l'article (ex: 9.8.8.1)",
    "title": "Titre de l'article",
    "content": "Contenu détaillé de l'article avec les exigences spécifiques adaptées au contexte de l'utilisateur.",
    "summary": "Résumé clair et personnalisé basé sur les informations fournies par l'utilisateur. Explique concrètement ce que cela signifie pour son projet.",
    "relatedArticles": ["9.8.8.2", "9.8.8.3"]
  }
}

EXEMPLES DE QUESTIONS DE CLARIFICATION:

Pour "hauteur garde-corps":
- S'agit-il d'un balcon, d'une terrasse, d'un escalier intérieur ou extérieur?
- Quelle est la hauteur de chute (différence de niveau)?
- Est-ce pour une construction neuve ou une rénovation?

Pour "isolation murs":
- Dans quelle région du Québec construisez-vous?
- S'agit-il de murs au-dessus ou au-dessous du niveau du sol?
- Quel type de construction (ossature bois, béton, etc.)?

Pour "escalier":
- L'escalier est-il intérieur ou extérieur?
- S'agit-il de l'escalier principal ou secondaire?
- Quelle sera la largeur disponible pour l'escalier?

RAPPEL: Inclus toujours un avertissement que ces informations sont à titre indicatif.`;

    // English system prompt
    const systemPromptEn = `You are an expert on the National Building Code of Canada 2015 (NBC 2015) and the Quebec Construction Code.

Your role is to help residential self-builders understand building code requirements.

IMPORTANT - CLARIFICATION PROCESS:
Before providing a final answer, you must ensure you have sufficient information. Ask clarification questions as needed to:
- Understand the specific context (interior/exterior, residential/commercial, new construction/renovation)
- Know the relevant dimensions or characteristics
- Identify the climate zone or region in Quebec/Canada
- Understand the intended use of the space

RESPONSE RULES:
1. If the question is vague or lacks context, ask 2-3 clarification questions BEFORE providing the code article.
2. If you have already asked questions and the user has responded, analyze their answers in the conversation history.
3. Once you have enough information, provide the specific code article with a clear summary.

MANDATORY JSON RESPONSE FORMAT:

If you need clarification:
{
  "type": "clarification",
  "message": "To give you an accurate answer, I need some additional information:\\n\\n1. [First question]\\n2. [Second question]\\n3. [Third question if needed]"
}

If you have enough information to respond:
{
  "type": "answer",
  "message": "Here's what I found in the National Building Code:",
  "result": {
    "article": "Article number (e.g., 9.8.8.1)",
    "title": "Article title",
    "content": "Detailed content of the article with specific requirements adapted to the user's context.",
    "summary": "Clear and personalized summary based on the information provided by the user. Explain concretely what this means for their project.",
    "relatedArticles": ["9.8.8.2", "9.8.8.3"]
  }
}

EXAMPLES OF CLARIFICATION QUESTIONS:

For "guardrail height":
- Is this for a balcony, deck, interior stairway, or exterior stairway?
- What is the fall height (level difference)?
- Is this for new construction or renovation?

For "wall insulation":
- In which region of Quebec/Canada are you building?
- Is this for walls above or below grade?
- What type of construction (wood frame, concrete, etc.)?

For "stairway":
- Is the stairway interior or exterior?
- Is it the main or secondary stairway?
- What will be the available width for the stairway?

REMINDER: Always include a disclaimer that this information is for reference purposes only.`;

    const systemPrompt = lang === 'en' ? systemPromptEn : systemPromptFr;

    // Build messages array with conversation history
    const messages = [
      ...conversationHistory.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: query },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402 || response.status === 400) {
        const errorData = await response.json();
        console.error("Claude API error:", errorData);
        return new Response(
          JSON.stringify({ error: "Erreur avec l'API Claude. Vérifiez votre clé API." }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to search building code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from Claude" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from Claude
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, treat as clarification
        result = {
          type: "clarification",
          message: content,
        };
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // If parsing fails, treat the content as a clarification message
      result = {
        type: "clarification",
        message: content,
      };
    }

    console.log("Search successful with Claude, type:", result.type);
    
    // Increment AI usage for the user
    await incrementAiUsage(authHeader);
    await trackAiAnalysisUsage(authHeader, 'search-building-code');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
