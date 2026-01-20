import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SoumissionDoc {
  file_name: string;
  file_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradeName, tradeDescription, documents } = await req.json() as {
      tradeName: string;
      tradeDescription: string;
      documents: SoumissionDoc[];
    };

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun document à analyser" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Créer la liste des documents pour l'analyse
    const docsDescription = documents.map((doc, i) => 
      `Document ${i + 1}: "${doc.file_name}" (${doc.file_url})`
    ).join("\n");

    const systemPrompt = `Tu es un expert en construction résidentielle au Québec, spécialisé dans l'analyse des soumissions de sous-traitants.
Tu dois analyser les soumissions reçues pour un corps de métier spécifique et fournir une recommandation détaillée.

Ton analyse doit inclure:
1. Un résumé de chaque soumission (basé sur le nom du fichier et le contexte)
2. Une comparaison des points forts et faibles de chaque soumission
3. Une analyse du rapport qualité-prix
4. Une recommandation claire avec justification

Important: 
- Réponds en français
- Sois précis et professionnel
- Si tu ne peux pas voir le contenu des fichiers, base ton analyse sur les noms des fichiers et demande à l'utilisateur de te fournir plus de détails
- Propose des questions à poser aux fournisseurs pour mieux comparer`;

    const userPrompt = `Analyse les soumissions pour le corps de métier suivant:

**Corps de métier:** ${tradeName}
**Description:** ${tradeDescription}

**Documents de soumission reçus:**
${docsDescription}

Fournis une analyse détaillée avec:
1. Résumé de chaque soumission (basé sur les informations disponibles)
2. Tableau comparatif des points importants
3. Analyse du rapport qualité-prix
4. Recommandation finale
5. Questions à poser aux fournisseurs pour affiner la comparaison

Note: Si tu ne peux pas accéder au contenu des fichiers PDF/documents, indique-le clairement et propose une liste de critères sur lesquels l'utilisateur devrait comparer manuellement les soumissions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants, veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'analyse" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("analyze-soumissions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
