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
    let imageUrls: string[] = [];

    if (mode === "plan") {
      // Plan analysis mode - analyze uploaded plan images (supports multiple)
      // Support both single imageUrl (legacy) and multiple imageUrls
      if (body.imageUrls && Array.isArray(body.imageUrls)) {
        imageUrls = body.imageUrls;
      } else if (body.imageUrl) {
        imageUrls = [body.imageUrl];
      }
      
      console.log('Analyzing plan images:', { imageCount: imageUrls.length });

      systemPrompt = `Tu es un expert en analyse de plans de construction et rénovation résidentielle au QUÉBEC, CANADA.
Tu dois analyser TOUS les plans fournis ENSEMBLE pour obtenir une vision complète du projet avant de générer une estimation budgétaire.

IMPORTANT - ANALYSE MULTI-PLANS:
- Tu recevras possiblement PLUSIEURS images de plans (plans d'étages, élévations, coupes, détails, etc.)
- ANALYSE TOUS LES PLANS ENSEMBLE pour comprendre le projet dans sa globalité
- NE DUPLIQUE PAS les coûts - chaque élément ne doit être compté qu'une seule fois
- Utilise les différentes vues pour obtenir des informations complémentaires:
  * Plans d'étages: superficies, disposition des pièces
  * Élévations: hauteurs, finitions extérieures, fenestration
  * Coupes: structure, isolation, fondations
  * Détails: spécifications techniques

ÉTAPE 1 - IDENTIFICATION DU TYPE DE PROJET (CRITIQUE):
Examine attentivement TOUS les plans pour déterminer s'il s'agit de:
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
  "projectSummary": "Description précise: type de projet + superficie de la NOUVELLE partie seulement + caractéristiques observées dans tous les plans",
  "estimatedTotal": number,
  "newSquareFootage": number (superficie de la NOUVELLE construction seulement),
  "plansAnalyzed": number (nombre de plans analysés),
  "categories": [
    {
      "name": "Nom de la catégorie",
      "budget": number,
      "description": "Description SPÉCIFIQUE des travaux basée sur ce que tu vois RÉELLEMENT dans les plans (dimensions, matériaux, configurations observées)",
      "items": [
        { 
          "name": "Nom PRÉCIS et DESCRIPTIF de l'élément basé sur les plans - DOIT inclure dimensions, matériaux et quantités observés", 
          "cost": number, 
          "quantity": "quantité exacte basée sur les plans", 
          "unit": "unité" 
        }
      ]
    }
  ],
  "recommendations": ["Recommandation 1", "Recommandation 2"],
  "warnings": ["Avertissement si applicable"]
}

IMPORTANT POUR LES ITEMS - PERSONNALISATION SELON LES PLANS ANALYSÉS:
- Chaque item DOIT avoir un nom DESCRIPTIF et SPÉCIFIQUE basé sur les plans
- OBLIGATOIRE: Inclure les dimensions, types de matériaux et quantités observés dans les plans
- Exemples de noms BONS et ACCEPTÉS:
  * "Semelles de béton 24\"x12\" - périmètre 120 pi.lin."
  * "Fenêtres coulissantes PVC 48\"x36\" - façade sud (3 unités)"
  * "Poutrelles de plancher TJI 11-7/8\" - portée 14 pi"
  * "Bardage de cèdre horizontal - 450 pi²"
  * "Porte-patio coulissante 6' - accès terrasse"
  * "Escalier droit 13 marches - contremarche 7\""
- Exemples de noms MAUVAIS et INTERDITS:
  * "Fenêtres" (trop vague)
  * "Structure" (non descriptif)
  * "Revêtement" (pas de spécification)
  * "Béton" (pas de dimension)
- Si tu vois des détails spécifiques sur les plans (type de toiture, style de fenêtres, matériaux notés), INCLUS-LES ABSOLUMENT dans les noms d'items

Catégories pour AGRANDISSEMENT: Fondations (nouvelle partie), Structure/Charpente, Toiture, Raccordement à l'existant, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures, Démolition (si applicable).

Catégories pour CONSTRUCTION NEUVE: Fondations, Structure/Charpente, Toiture, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures, Garage (si présent).`;

      userMessage = `Analyse ${imageUrls.length > 1 ? 'ces ' + imageUrls.length + ' plans' : 'ce plan'} de construction/rénovation pour un projet AU QUÉBEC.

${imageUrls.length > 1 ? `IMPORTANT - ANALYSE MULTI-PLANS (${imageUrls.length} images):
- Analyse TOUS les plans ENSEMBLE pour une vision complète
- Utilise les informations complémentaires de chaque vue (plan d'étage, élévation, coupe, etc.)
- NE DUPLIQUE PAS les coûts - chaque élément ne doit être compté qu'une seule fois
- Consolide les informations pour générer UN SEUL budget unifié

` : ''}IMPORTANT - IDENTIFICATION DU TYPE DE PROJET:
1. EXAMINE D'ABORD si le plan montre une construction NEUVE COMPLÈTE ou un AGRANDISSEMENT/EXTENSION
2. Cherche des indices: mentions "existant", lignes pointillées, structure à conserver, etc.
3. Si c'est un agrandissement, estime SEULEMENT la superficie de la NOUVELLE partie

ANALYSE DEMANDÉE:
- Identifier clairement le type de projet (agrandissement, construction neuve, rénovation, etc.)
- Estimer la superficie de la NOUVELLE construction seulement
- Générer un budget adapté au type de projet identifié
- IMPORTANT: Pour chaque item, utilise des noms TRÈS DESCRIPTIFS avec dimensions et spécifications visibles sur les plans

Génère une estimation budgétaire réaliste basée sur l'analyse ${imageUrls.length > 1 ? 'de tous les plans' : 'du plan'} et les coûts actuels au Québec (2024-2025).`;

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
      "description": "Description SPÉCIFIQUE des travaux adaptée à ce projet",
      "items": [
        { 
          "name": "Nom PRÉCIS et DESCRIPTIF incluant dimensions et spécifications calculées selon la superficie du projet", 
          "cost": number, 
          "quantity": "quantité calculée selon la superficie", 
          "unit": "unité" 
        }
      ]
    }
  ],
  "recommendations": ["Recommandation 1", "Recommandation 2"],
  "warnings": ["Avertissement si applicable"]
}

IMPORTANT POUR LES ITEMS - DESCRIPTIONS PERSONNALISÉES AU PROJET:
- Chaque item DOIT être SPÉCIFIQUE à ce projet (taille, nombre d'étages, type)
- OBLIGATOIRE: Calculer et inclure les dimensions basées sur la superficie fournie
- Exemples de noms BONS:
  * "Dalle de béton 4\" avec treillis armé - 1500 pi²"
  * "Murs extérieurs 2x6 @ 16\" c/c - périmètre estimé 180 pi.lin."
  * "Fermes de toit préfabriquées 4/12 - portée 28 pi (14 unités)"
  * "Panneau électrique 200A avec 40 circuits"
  * "Fenêtres PVC double vitrage Low-E - estimation 12 unités"
  * "Isolation R-24 murs + R-60 combles - 2800 pi²"
- Exemples de noms MAUVAIS:
  * "Murs" (pas de spécification)
  * "Charpente" (trop vague)
  * "Électricité" (pas de détail)
  * "Isolation" (pas de valeur R ni superficie)

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

IMPORTANT: Pour chaque item du budget, utilise des noms TRÈS DESCRIPTIFS avec:
- Les dimensions calculées selon la superficie fournie
- Les spécifications techniques (type de matériaux, épaisseurs, valeurs R, etc.)
- Les quantités estimées basées sur les paramètres du projet

Génère une estimation budgétaire complète et réaliste basée sur les coûts actuels au Québec (2024-2025).
${hasGarage ? 'IMPORTANT: Inclure une catégorie spécifique pour le Garage avec tous les coûts associés (dalle, structure, porte de garage, électricité, etc.).' : ''}`;
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (imageUrls.length > 0) {
      // Build content array with text and all images
      const contentArray: any[] = [
        { type: "text", text: userMessage }
      ];
      
      // Add all images to the content
      for (const url of imageUrls) {
        contentArray.push({ type: "image_url", image_url: { url } });
      }
      
      messages.push({
        role: "user",
        content: contentArray
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