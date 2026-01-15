import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode } = body;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt: string;
    let userMessage: string;
    let imageUrl: string | null = null;

    if (mode === "plan") {
      // Plan analysis mode - analyze uploaded plan image
      imageUrl = body.imageUrl;
      
      console.log('Analyzing plan image:', { hasImage: !!imageUrl });

      systemPrompt = `Tu es un expert en analyse de plans de construction et rénovation résidentielle au QUÉBEC, CANADA.
Tu dois analyser l'image du plan fourni et IDENTIFIER PRÉCISÉMENT LE TYPE DE PROJET avant de générer une estimation budgétaire.

ÉTAPE 1 - IDENTIFICATION DU TYPE DE PROJET (CRITIQUE):
Examine attentivement le plan pour déterminer s'il s'agit de:
1. CONSTRUCTION NEUVE COMPLÈTE: Nouvelle maison sur terrain vierge
2. AGRANDISSEMENT/EXTENSION: Ajout à une structure existante (rallonge, nouvelle aile)
3. RÉNOVATION MAJEURE: Modification substantielle d'une structure existante
4. SURÉLÉVATION: Ajout d'un étage sur structure existante
5. CONSTRUCTION DE GARAGE: Garage détaché ou attaché

INDICES À RECHERCHER:
- Mentions "existant", "à démolir", "à conserver" = RÉNOVATION/AGRANDISSEMENT
- Lignes pointillées représentant structure existante = AGRANDISSEMENT
- Plan partiel sans fondation complète = AGRANDISSEMENT
- Notes indiquant "rallonge", "extension", "ajout" = AGRANDISSEMENT
- Plan complet avec toutes les pièces et fondations = CONSTRUCTION NEUVE

ÉTAPE 2 - ANALYSE SELON LE TYPE:
Pour AGRANDISSEMENT/EXTENSION:
- Estimer SEULEMENT la superficie de la nouvelle partie
- NE PAS inclure les coûts de la maison existante
- Inclure les coûts de raccordement à l'existant
- Prévoir la démolition partielle si nécessaire

Pour CONSTRUCTION NEUVE:
- Estimer la superficie totale
- Inclure tous les coûts d'une construction complète

IMPORTANT - CONTEXTE QUÉBÉCOIS:
- Tous les prix doivent refléter le marché québécois 2024-2025
- Inclure les coûts de main-d'œuvre québécois (salaires syndicaux CCQ si applicable)
- Tenir compte du climat québécois (isolation R-41 minimum pour les murs, R-60 pour le toit)
- Considérer les exigences du Code de construction du Québec
- Inclure la TPS (5%) et TVQ (9.975%) dans le total estimé
- Prix des matériaux selon les fournisseurs locaux (BMR, Canac, Rona, Patrick Morin)
- Coût moyen au Québec pour agrandissement: 300-450$/pi²
- Coût moyen au Québec pour construction neuve: 250-350$/pi² standard, 350-500$/pi² qualité supérieure

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) avec cette structure:
{
  "projectType": "AGRANDISSEMENT" | "CONSTRUCTION_NEUVE" | "RENOVATION" | "SURELEVATION" | "GARAGE",
  "projectSummary": "Description précise: type de projet + superficie de la NOUVELLE partie seulement + caractéristiques",
  "estimatedTotal": number,
  "newSquareFootage": number (superficie de la NOUVELLE construction seulement),
  "categories": [
    {
      "name": "Nom de la catégorie",
      "budget": number,
      "description": "Description des travaux",
      "items": [
        { "name": "Item", "cost": number, "quantity": "quantité", "unit": "unité" }
      ]
    }
  ],
  "recommendations": ["Recommandation 1", "Recommandation 2"],
  "warnings": ["Avertissement si applicable"]
}

Catégories pour AGRANDISSEMENT: Fondations (nouvelle partie), Structure/Charpente, Toiture, Raccordement à l'existant, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures, Démolition (si applicable).

Catégories pour CONSTRUCTION NEUVE: Fondations, Structure/Charpente, Toiture, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures, Garage (si présent).`;

      userMessage = `Analyse ce plan de construction/rénovation pour un projet AU QUÉBEC.

IMPORTANT - IDENTIFICATION DU TYPE DE PROJET:
1. EXAMINE D'ABORD si le plan montre une construction NEUVE COMPLÈTE ou un AGRANDISSEMENT/EXTENSION
2. Cherche des indices: mentions "existant", lignes pointillées, structure à conserver, etc.
3. Si c'est un agrandissement, estime SEULEMENT la superficie de la NOUVELLE partie

ANALYSE DEMANDÉE:
- Identifier clairement le type de projet (agrandissement, construction neuve, rénovation, etc.)
- Estimer la superficie de la NOUVELLE construction seulement
- Générer un budget adapté au type de projet identifié

Génère une estimation budgétaire réaliste basée sur l'analyse du plan et les coûts actuels au Québec (2024-2025).`;

    } else {
      // Manual mode - use provided parameters
      const { 
        projectType, 
        squareFootage, 
        numberOfFloors, 
        hasGarage, 
        foundationSqft, 
        floorSqftDetails 
      } = body;

      console.log('Manual analysis:', { projectType, squareFootage, numberOfFloors, hasGarage, foundationSqft });

      systemPrompt = `Tu es un expert en estimation de coûts de construction résidentielle au QUÉBEC, CANADA. 
Tu dois analyser les informations fournies sur un projet de construction et générer une estimation budgétaire détaillée.

IMPORTANT - CONTEXTE QUÉBÉCOIS:
- Tous les prix doivent refléter le marché québécois 2024-2025
- Inclure les coûts de main-d'œuvre québécois (salaires syndicaux CCQ si applicable)
- Tenir compte du climat québécois (isolation R-41 minimum pour les murs, R-60 pour le toit)
- Considérer les exigences du Code de construction du Québec
- Inclure la TPS (5%) et TVQ (9.975%) dans le total estimé
- Prix des matériaux selon les fournisseurs locaux (BMR, Canac, Rona, Patrick Morin)
- Coût moyen au Québec: 250-350$/pi² pour construction standard, 350-500$/pi² pour qualité supérieure

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) avec cette structure:
{
  "projectSummary": "Description courte du projet",
  "estimatedTotal": number,
  "categories": [
    {
      "name": "Nom de la catégorie",
      "budget": number,
      "description": "Description des travaux",
      "items": [
        { "name": "Item", "cost": number, "quantity": "quantité", "unit": "unité" }
      ]
    }
  ],
  "recommendations": ["Recommandation 1", "Recommandation 2"],
  "warnings": ["Avertissement si applicable"]
}

Catégories typiques: Fondations, Structure/Charpente, Toiture, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures${hasGarage ? ', Garage' : ''}.`;

      // Build floor details string
      let floorDetailsStr = '';
      if (floorSqftDetails && floorSqftDetails.length > 0) {
        floorDetailsStr = floorSqftDetails
          .map((sqft: number, i: number) => `  - Étage ${i + 1}: ${sqft} pi²`)
          .join('\n');
      }

      userMessage = `Analyse ce projet de construction AU QUÉBEC et génère un budget détaillé avec les prix du marché québécois:
- Type de projet: ${projectType || 'Maison unifamiliale'}
- Nombre d'étages: ${numberOfFloors || 1}
- Superficie totale approximative: ${squareFootage || 1500} pieds carrés
${foundationSqft ? `- Superficie de la fondation: ${foundationSqft} pi²` : ''}
${floorDetailsStr ? `- Détail par étage:\n${floorDetailsStr}` : ''}
- Garage: ${hasGarage ? 'Oui (simple ou double selon la superficie)' : 'Non'}
- Région: Québec, Canada

Génère une estimation budgétaire complète et réaliste basée sur les coûts actuels au Québec (2024-2025).
${hasGarage ? 'IMPORTANT: Inclure une catégorie spécifique pour le Garage avec tous les coûts associés (dalle, structure, porte de garage, électricité, etc.).' : ''}`;
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userMessage },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let budgetData;
    try {
      // Clean up the response in case it has markdown formatting
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      budgetData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse budget data', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis complete:', budgetData.projectSummary);

    return new Response(
      JSON.stringify({ success: true, data: budgetData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error analyzing plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze plan';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
