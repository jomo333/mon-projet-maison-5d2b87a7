const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, conversationHistory = [] } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching building code for:", query);
    console.log("Conversation history length:", conversationHistory.length);

    const systemPrompt = `Tu es un expert du Code national du bâtiment du Canada 2015 (CNBC 2015) et du Code de construction du Québec.

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

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: query },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to search building code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from AI
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

    console.log("Search successful, type:", result.type);
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
