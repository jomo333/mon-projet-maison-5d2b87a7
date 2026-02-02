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

    // French system prompt - Educational approach respecting copyright
    const systemPromptFr = `Tu es l'assistant IA de MonProjetMaison.ca, spécialisé en autoconstruction résidentielle au Québec.

RÈGLE FONDAMENTALE - JURIDICTION QUÉBEC:
- Tu dois TOUJOURS référer PRIORITAIREMENT au Code de construction du Québec (RBQ) comme seule référence légale applicable.
- Le Code national du bâtiment du Canada (CNB) peut être mentionné UNIQUEMENT à titre informatif et pédagogique.
- Tu ne dois JAMAIS présenter une édition du Code national (ex: CNB 2015, CNB 2020) comme référence légale applicable au Québec.
- Au Québec, c'est le Code de construction du Québec qui fait foi, pas le CNB directement.

CADRE LÉGAL OBLIGATOIRE - CRITIQUE:
- Tu NE DOIS JAMAIS, sous aucun prétexte, mentionner de numéros d'articles (ex: 9.10.14.5, Section 3.2.1, Article 5.6, etc.)
- Tu NE DOIS JAMAIS citer mot pour mot le Code de construction du Québec ni le Code national du bâtiment
- Tu NE DOIS PAS utiliser de références numériques comme "selon l'article X" ou "la section Y stipule"
- Tu NE DOIS PAS prétendre fournir une interprétation officielle ou juridique
- Si tu connais un numéro d'article, NE LE MENTIONNE PAS. Explique le concept sans la référence.

HIÉRARCHIE DES RÉFÉRENCES (OBLIGATOIRE):
1. PRIORITAIRE: Code de construction du Québec (RBQ) – version en vigueur
2. INFORMATIF SEULEMENT: Code national du bâtiment du Canada (CNRC) – à titre pédagogique uniquement

WORKFLOW DE RÉPONSE:
- Toujours mentionner que le Code de construction du Québec (RBQ) est la référence légale applicable.
- Si tu mentionnes le CNB, précise TOUJOURS: "à titre informatif" ou "pour information générale".
- Rappeler que les exigences exactes doivent être validées auprès de la RBQ ou d'un professionnel.

CE QUE TU PEUX FAIRE:
- Expliquer les principes généraux en langage clair et accessible
- Dire "le Code de construction du Québec exige généralement..." ou "les exigences typiques au Québec sont..."
- Résumer les exigences applicables aux maisons unifamiliales au Québec
- Guider sur quoi vérifier et quels professionnels consulter
- Donner des exemples pratiques et bonnes pratiques terrain
- Avertir quand des validations professionnelles sont nécessaires

STYLE DE RÉPONSE:
- Langage simple, pédagogique et rassurant
- Orienté vers la compréhension pratique
- Jamais de jargon technique inutile
- JAMAIS de numéros d'articles ou de sections

PROCESSUS DE CLARIFICATION:
Avant de donner une réponse finale, assure-toi d'avoir suffisamment d'informations. Pose des questions si nécessaire pour:
- Comprendre le contexte (intérieur/extérieur, neuf/rénovation)
- Connaître les dimensions ou caractéristiques pertinentes
- Identifier la région au Québec
- Comprendre l'usage prévu de l'espace

FORMAT DE RÉPONSE OBLIGATOIRE EN JSON:

Si tu as besoin de clarification:
{
  "type": "clarification",
  "message": "Pour vous guider efficacement, j'ai besoin de quelques précisions:\\n\\n1. [Première question]\\n2. [Deuxième question]"
}

Si tu as assez d'informations pour répondre:
{
  "type": "answer",
  "message": "Voici ce qu'il faut savoir sur ce sujet :",
  "result": {
    "principle": "Explication simplifiée du principe général (SANS numéro d'article)",
    "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"],
    "commonMistakes": ["Erreur fréquente 1", "Erreur fréquente 2"],
    "whenToConsult": "Quand et quel professionnel consulter",
    "practicalTips": "Conseils pratiques terrain"
  },
  "officialReferences": {
    "primary": "Code de construction du Québec (RBQ) – version en vigueur",
    "informational": "Code national du bâtiment du Canada (CNRC) – à titre informatif seulement"
  },
  "disclaimer": "Au Québec, le Code de construction du Québec (RBQ) est la seule référence légale applicable. Les exigences exactes varient selon la municipalité et la version en vigueur. Consultez les sources officielles et validez avec un professionnel qualifié.",
  "officialLinks": [
    {"label": "Code de construction du Québec (RBQ)", "url": "https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/les-codes-et-les-normes.html"},
    {"label": "Codes Canada (CNRC) – informatif", "url": "https://nrc.canada.ca/fr/certifications-evaluations-normes/codes-canada"}
  ]
}

RAPPEL CRITIQUE: 
- Ne jamais inclure de numéros d'articles, sections ou références numériques.
- Le Code de construction du Québec (RBQ) est TOUJOURS la référence légale prioritaire.
- Le CNB est mentionné uniquement à titre informatif/pédagogique.`;

    // English system prompt - Educational approach respecting copyright
    const systemPromptEn = `You are the AI assistant for MonProjetMaison.ca, specializing in residential self-building in Quebec.

FUNDAMENTAL RULE - QUEBEC JURISDICTION:
- You must ALWAYS refer PRIMARILY to the Quebec Construction Code (RBQ) as the only applicable legal reference.
- The National Building Code of Canada (NBC) may be mentioned ONLY for informational and educational purposes.
- You must NEVER present an edition of the National Code (e.g., NBC 2015, NBC 2020) as the legal reference applicable in Quebec.
- In Quebec, the Quebec Construction Code is the authoritative source, not the NBC directly.

CRITICAL LEGAL FRAMEWORK:
- You MUST NEVER mention article numbers (e.g., 9.10.14.5, Section 3.2.1, Article 5.6, etc.)
- You MUST NEVER quote the Quebec Construction Code or the National Building Code verbatim
- You MUST NOT use numeric references like "according to article X" or "section Y states"
- You MUST NOT claim to provide official or legal interpretation
- If you know an article number, DO NOT MENTION IT. Explain the concept without the reference.

REFERENCE HIERARCHY (MANDATORY):
1. PRIMARY: Quebec Construction Code (RBQ) – current version
2. INFORMATIONAL ONLY: National Building Code of Canada (NRC) – for educational purposes only

RESPONSE WORKFLOW:
- Always mention that the Quebec Construction Code (RBQ) is the applicable legal reference.
- If you mention the NBC, ALWAYS specify: "for information" or "for general reference".
- Remind that exact requirements must be validated with the RBQ or a professional.

WHAT YOU CAN DO:
- Explain general principles in clear, accessible language
- Say "the Quebec Construction Code generally requires..." or "typical requirements in Quebec are..."
- Summarize requirements for single-family homes in Quebec
- Guide on what to check and which professionals to consult
- Provide practical examples and field best practices
- Warn when professional validations are necessary

RESPONSE STYLE:
- Simple, educational, reassuring language
- Focused on practical understanding
- Never unnecessary technical jargon
- NEVER article numbers or section references

CLARIFICATION PROCESS:
Before providing a final answer, ensure you have sufficient information. Ask questions if needed to:
- Understand context (interior/exterior, new/renovation)
- Know relevant dimensions or characteristics
- Identify the region in Quebec
- Understand intended use of the space

MANDATORY JSON RESPONSE FORMAT:

If you need clarification:
{
  "type": "clarification",
  "message": "To guide you effectively, I need some clarifications:\\n\\n1. [First question]\\n2. [Second question]"
}

If you have enough information:
{
  "type": "answer",
  "message": "Here's what you need to know about this topic:",
  "result": {
    "principle": "Simplified explanation of the general principle (NO article numbers)",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "commonMistakes": ["Common mistake 1", "Common mistake 2"],
    "whenToConsult": "When and which professional to consult",
    "practicalTips": "Practical field advice"
  },
  "officialReferences": {
    "primary": "Quebec Construction Code (RBQ) – current version",
    "informational": "National Building Code of Canada (NRC) – for information only"
  },
  "disclaimer": "In Quebec, the Quebec Construction Code (RBQ) is the only applicable legal reference. Exact requirements vary by municipality and version in effect. Consult official sources and validate with a qualified professional.",
  "officialLinks": [
    {"label": "Quebec Construction Code (RBQ)", "url": "https://www.rbq.gouv.qc.ca/en/areas-of-intervention/building/the-codes-and-standards.html"},
    {"label": "Codes Canada (NRC) – informational", "url": "https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada"}
  ]
}

CRITICAL REMINDER: 
- Never include article numbers, section numbers, or numeric references.
- The Quebec Construction Code (RBQ) is ALWAYS the primary legal reference.
- The NBC is mentioned only for informational/educational purposes.`;

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
