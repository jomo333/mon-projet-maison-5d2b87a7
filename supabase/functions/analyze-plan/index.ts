import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base de données des prix Québec 2025
const PRIX_QUEBEC_2025 = {
  bois: {
    "2x4x8_SPF": 4.50,
    "2x6x8_SPF": 7.25,
    "2x8x12_SPF": 16.80,
    "contreplaque_3_4_4x8": 52.00,
    "OSB_7_16_4x8": 24.50,
  },
  gypse: {
    "regulier_1_2_4x8": 18.50,
    "resistant_1_2_4x8": 22.00,
  },
  isolation: {
    "R20_fibre_verre_pi2": 0.85,
    "R30_fibre_verre_pi2": 1.15,
  },
  toiture: {
    "bardeau_asphalte_25ans_carre": 95.00,
    "membrane_Tyvek_pi2": 0.42,
  },
  beton: {
    "ciment_portland_30kg": 12.50,
    "beton_30MPa_m3": 165.00,
  },
  taux_CCQ_2025: {
    charpentier_menuisier: 48.50,
    electricien: 52.00,
    plombier: 54.00,
    frigoriste: 56.00,
    ferblantier: 50.00,
    briqueteur_macon: 49.00,
    platrier: 46.00,
    peintre: 42.00,
  }
};

const SYSTEM_PROMPT_EXTRACTION = `Tu es un ESTIMATEUR PROFESSIONNEL QUÉBÉCOIS CERTIFIÉ avec 25 ans d'expérience.

MISSION: Analyser ce document de construction avec une PRÉCISION EXTRÊME.

## EXTRACTION REQUISE

1. **MATÉRIAUX** - Pour CHAQUE matériau identifiable:
   - Description EXACTE (ex: "Bois 2x4 SPF #2")
   - Quantité PRÉCISE (mesure au 1/8 de pouce près)
   - Unités québécoises standard: pi² (pieds carrés), vg³ (verges cubes), ml (mètres linéaires), pcs (pièces)
   - Dimension complète (ex: "8 pieds", "4x8 pieds")
   - Localisation exacte dans le plan (ex: "Mur Nord - Page 3, Section A-A")

2. **MAIN-D'ŒUVRE** selon taux CCQ 2025:
   - Charpentier-menuisier: 48.50$/h
   - Électricien: 52.00$/h
   - Plombier: 54.00$/h
   - Frigoriste (CVAC): 56.00$/h
   - Ferblantier: 50.00$/h
   - Briqueteur-maçon: 49.00$/h
   - Plâtrier: 46.00$/h
   - Peintre: 42.00$/h

3. **PRIX UNITAIRES** CAD région Montréal 2025:
   - Bois 2x4x8 SPF: 4.50$
   - Bois 2x6x8 SPF: 7.25$
   - Bois 2x8x12 SPF: 16.80$
   - Contreplaqué 3/4" 4x8: 52.00$
   - OSB 7/16" 4x8: 24.50$
   - Gypse régulier 1/2" 4x8: 18.50$
   - Gypse résistant 1/2" 4x8: 22.00$
   - Isolation R20 fibre verre: 0.85$/pi²
   - Isolation R30 fibre verre: 1.15$/pi²
   - Bardeau asphalte 25 ans: 95.00$/carré (100 pi²)
   - Membrane Tyvek: 0.42$/pi²
   - Ciment Portland 30kg: 12.50$
   - Béton 30 MPa livré: 165.00$/m³

## RÈGLES CRITIQUES

- Sois ULTRA PRÉCIS sur les quantités. N'ARRONDIS JAMAIS à la baisse.
- Identifie TOUTE information manquante ou ambiguë
- Signale les incohérences entre vues/plans différents
- Vérifie que toutes surfaces sont calculées: planchers + murs + toiture
- Compare avec ratio typique: main-d'œuvre = 35-45% du coût total matériaux

## FORMAT DE RÉPONSE JSON STRICT

{
  "extraction": {
    "type_projet": "CONSTRUCTION_NEUVE | AGRANDISSEMENT | RENOVATION | SURELEVATION | GARAGE",
    "superficie_nouvelle_pi2": number,
    "nombre_etages": number,
    "plans_analyses": number,
    "categories": [
      {
        "nom": "Structure" | "Fondation" | "Enveloppe" | "Finition intérieure" | "Finition extérieure" | "Électricité" | "Plomberie" | "CVC",
        "items": [
          {
            "description": "Nom EXACT du matériau/travail",
            "quantite": number,
            "unite": "pi² | vg³ | ml | pcs | unité",
            "dimension": "dimension si applicable",
            "prix_unitaire": number,
            "total": number,
            "source": "Page X, Section Y",
            "confiance": "haute | moyenne | basse"
          }
        ],
        "sous_total_materiaux": number,
        "heures_main_oeuvre": number,
        "taux_horaire_CCQ": number,
        "sous_total_main_oeuvre": number,
        "sous_total_categorie": number
      }
    ],
    "elements_manquants": ["Liste des éléments non spécifiés dans les plans"],
    "ambiguites": ["Liste des informations ambiguës nécessitant clarification"],
    "incoherences": ["Incohérences détectées entre les vues"]
  },
  "totaux": {
    "total_materiaux": number,
    "total_main_oeuvre": number,
    "sous_total_avant_taxes": number,
    "contingence_5_pourcent": number,
    "sous_total_avec_contingence": number,
    "tps_5_pourcent": number,
    "tvq_9_975_pourcent": number,
    "total_ttc": number
  },
  "validation": {
    "surfaces_completes": boolean,
    "ratio_main_oeuvre_materiaux": number,
    "ratio_acceptable": boolean,
    "alertes": ["Alertes importantes pour l'estimateur"]
  },
  "recommandations": ["Recommandations basées sur l'analyse"],
  "resume_projet": "Description concise du projet analysé"
}`;

const SYSTEM_PROMPT_VALIDATION = `Tu es un VÉRIFICATEUR D'ESTIMATIONS senior. 

Ton rôle est de VALIDER l'extraction initiale et corriger les erreurs.

VÉRIFICATIONS À EFFECTUER:
1. Les quantités sont-elles cohérentes avec la superficie?
2. Les prix unitaires correspondent-ils au marché Québec 2025?
3. Y a-t-il des doublons (même élément compté 2 fois)?
4. Manque-t-il des éléments évidents (ex: isolation si murs présents)?
5. Le ratio main-d'œuvre/matériaux est-il réaliste (35-45%)?
6. Les taxes sont-elles bien calculées (TPS 5%, TVQ 9.975%)?

Corrige les erreurs et retourne le JSON validé avec les corrections appliquées.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode, finishQuality = "standard", stylePhotoUrls = [], imageUrls: bodyImageUrls, imageUrl: singleImageUrl } = body;
    
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured - ANTHROPIC_API_KEY missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Quality level descriptions
    const qualityDescriptions: Record<string, string> = {
      "economique": "ÉCONOMIQUE - Matériaux entrée de gamme: plancher flottant 8mm, armoires mélamine, comptoirs stratifiés, portes creuses",
      "standard": "STANDARD - Bon rapport qualité-prix: bois franc ingénierie, armoires semi-custom, quartz, portes MDF pleines",
      "haut-de-gamme": "HAUT DE GAMME - Finitions luxueuses: bois franc massif, armoires sur mesure, granite/marbre, portes massives"
    };

    let imageUrls: string[] = [];
    
    // Handle image URLs
    if (mode === "plan") {
      if (bodyImageUrls && Array.isArray(bodyImageUrls)) {
        imageUrls = bodyImageUrls;
      } else if (singleImageUrl) {
        imageUrls = [singleImageUrl];
      }
      if (stylePhotoUrls && Array.isArray(stylePhotoUrls) && stylePhotoUrls.length > 0) {
        imageUrls = [...imageUrls, ...stylePhotoUrls];
      }
    } else if (stylePhotoUrls && Array.isArray(stylePhotoUrls) && stylePhotoUrls.length > 0) {
      imageUrls = [...stylePhotoUrls];
    }

    console.log('Analyzing with 2-pass extraction:', { mode, imageCount: imageUrls.length, quality: finishQuality });

    // ============= PASSE 1: EXTRACTION =============
    let extractionPrompt: string;
    
    if (mode === "plan") {
      extractionPrompt = `Analyse ${imageUrls.length > 1 ? 'ces ' + imageUrls.length + ' plans' : 'ce plan'} de construction pour un projet AU QUÉBEC.

QUALITÉ DE FINITION: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}

INSTRUCTIONS:
1. Examine ATTENTIVEMENT chaque plan/image fourni
2. Extrait TOUTES les quantités visibles avec précision au 1/8"
3. Identifie le type de projet (neuf, agrandissement, réno)
4. Calcule la superficie de la NOUVELLE construction seulement
5. Liste les éléments manquants ou ambigus
6. Applique les prix du marché Québec 2025

Retourne le JSON structuré tel que spécifié.`;
    } else {
      // Manual mode - with realistic Quebec 2025 cost benchmarks
      const { projectType, squareFootage, numberOfFloors, hasGarage, foundationSqft, floorSqftDetails, additionalNotes } = body;
      
      extractionPrompt = `Génère une estimation budgétaire RÉALISTE pour ce projet au QUÉBEC en 2025.

## PROJET À ESTIMER
- TYPE: ${projectType || 'Maison unifamiliale'}
- ÉTAGES: ${numberOfFloors || 1}
- SUPERFICIE TOTALE: ${squareFootage || 1500} pi²
${foundationSqft ? `- FONDATION: ${foundationSqft} pi²` : ''}
${floorSqftDetails?.length ? `- DÉTAIL ÉTAGES: ${floorSqftDetails.join(', ')} pi²` : ''}
- GARAGE: ${hasGarage ? 'Oui (attaché)' : 'Non'}
- QUALITÉ: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}
${additionalNotes ? `- NOTES CLIENT: ${additionalNotes}` : ''}

## COÛTS DE RÉFÉRENCE QUÉBEC 2025 (MATÉRIAUX + MAIN-D'ŒUVRE INCLUS)

### Par catégorie ($/pi² de superficie):
| Catégorie | Économique | Standard | Haut de gamme |
|-----------|------------|----------|---------------|
| Fondation (semelle + mur + dalle) | 35-45$/pi² | 45-60$/pi² | 60-80$/pi² |
| Structure (charpente bois) | 25-35$/pi² | 35-50$/pi² | 50-70$/pi² |
| Toiture complète | 15-20$/pi² | 20-30$/pi² | 30-45$/pi² |
| Revêtement extérieur | 15-25$/pi² | 25-40$/pi² | 40-70$/pi² |
| Fenêtres et portes | 20-30$/pi² | 30-50$/pi² | 50-80$/pi² |
| Isolation et pare-air | 8-12$/pi² | 12-18$/pi² | 18-25$/pi² |
| Électricité complète | 15-20$/pi² | 20-30$/pi² | 30-50$/pi² |
| Plomberie complète | 12-18$/pi² | 18-28$/pi² | 28-45$/pi² |
| Chauffage/CVAC | 15-25$/pi² | 25-40$/pi² | 40-60$/pi² |
| Gypse et peinture | 12-18$/pi² | 18-25$/pi² | 25-35$/pi² |
| Planchers | 8-15$/pi² | 15-30$/pi² | 30-60$/pi² |
| Cuisine (armoires + comptoirs) | 8000-15000$ | 15000-35000$ | 35000-80000$ |
| Salle de bain (par unité) | 5000-10000$ | 10000-25000$ | 25000-50000$ |

### Coûts fixes typiques:
- Excavation et terrassement: 8000-15000$
- Permis de construction: 1500-5000$
- Raccordements (eau, égout, électricité): 5000-15000$
- Entrée de garage/stationnement: 3000-8000$

### Taux main-d'œuvre CCQ 2025:
- Charpentier: 48.50$/h (ratio: 40-50% du coût matériaux)
- Électricien: 52.00$/h
- Plombier: 54.00$/h
- Maçon: 49.00$/h

## RÈGLES DE CALCUL OBLIGATOIRES

1. **CHAQUE catégorie DOIT inclure**: matériaux + main-d'œuvre
2. Utilise le MILIEU de la fourchette pour la qualité sélectionnée
3. Calcule: sous_total_materiaux + sous_total_main_oeuvre = sous_total_categorie
4. Le ratio main-d'œuvre/matériaux doit être entre 35-50%
5. Ajoute contingence 5% sur le sous-total
6. Calcule TPS 5% + TVQ 9.975% sur (sous-total + contingence)

## FORMAT DE RÉPONSE
Retourne le JSON structuré avec des montants RÉALISTES reflétant les coûts de construction actuels au Québec.`;
    }

    // ============= CLAUDE MULTI-PASS VISION =============
    // Analyse chaque page séparément (1 image à la fois) puis fusionne.
    // Cela évite le dépassement mémoire (546) et gère toutes les pages.

    const MAX_IMAGE_SIZE = 1_800_000; // ~1.8MB limite par image

    // Helper to fetch an image and convert to base64 (one at a time to save memory)
    async function fetchImageAsBase64(url: string): Promise<{ base64: string; mediaType: string } | null> {
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.log(`Failed to fetch ${url}: ${resp.status}`);
          return null;
        }
        const arrayBuffer = await resp.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
          console.log(`Skipping large image (${arrayBuffer.byteLength} bytes): ${url}`);
          return null;
        }
        const base64 = encodeBase64(arrayBuffer);
        const contentType = resp.headers.get('content-type') || 'image/png';
        const mediaType = contentType.includes('jpeg') || contentType.includes('jpg')
          ? 'image/jpeg'
          : contentType.includes('webp')
            ? 'image/webp'
            : 'image/png';
        return { base64, mediaType };
      } catch (err) {
        console.log(`Error fetching image ${url}:`, err);
        return null;
      }
    }

    // Helper to call Claude with a single image and get partial extraction
    async function analyzeOnePage(
      apiKey: string,
      imageBase64: string,
      mediaType: string,
      pageNumber: number,
      totalPages: number,
      additionalContext: string,
    ): Promise<string | null> {
      const pagePrompt = `Tu analyses la PAGE ${pageNumber}/${totalPages} d'un ensemble de plans de construction au Québec.
${additionalContext}

QUALITÉ DE FINITION: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}

INSTRUCTIONS:
1. Extrait TOUTES les quantités et détails visibles sur CETTE PAGE uniquement.
2. Identifie le type de vue (plan fondation, élévation, coupe, etc.).
3. Liste les matériaux, dimensions, notes techniques.
4. Retourne un JSON partiel avec les données de CETTE PAGE:
{
  "page": ${pageNumber},
  "vue_type": "...",
  "elements_extraits": [
    { "description": "...", "quantite": number, "unite": "...", "dimension": "...", "prix_unitaire": number, "total": number }
  ],
  "notes_techniques": ["..."],
  "dimensions_cles": { ... }
}`;

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: SYSTEM_PROMPT_EXTRACTION,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: imageBase64 },
                },
                { type: 'text', text: pagePrompt },
              ],
            },
          ],
        }),
      });

      if (!claudeResp.ok) {
        const txt = await claudeResp.text();
        console.error(`Claude page ${pageNumber} error: ${claudeResp.status}`, txt);
        return null;
      }

      const data = await claudeResp.json();
      return data.content?.[0]?.text || null;
    }

    let finalContent: string;

    if (mode === 'plan' && imageUrls.length > 0) {
      // Multi-pass: analyze each page separately
      console.log(`Starting Claude multi-pass analysis for ${imageUrls.length} pages...`);
      const pageResults: string[] = [];
      const additionalContext = body.additionalNotes ? `NOTES CLIENT: ${body.additionalNotes}` : '';

      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        console.log(`Processing page ${i + 1}/${imageUrls.length}: ${url.substring(url.lastIndexOf('/') + 1)}`);

        const imgData = await fetchImageAsBase64(url);
        if (!imgData) {
          console.log(`Skipping page ${i + 1} (fetch failed or too large)`);
          continue;
        }

        const pageResult = await analyzeOnePage(
          anthropicKey,
          imgData.base64,
          imgData.mediaType,
          i + 1,
          imageUrls.length,
          additionalContext,
        );

        if (pageResult) {
          pageResults.push(pageResult);
          console.log(`Page ${i + 1} analyzed successfully`);
        } else {
          console.log(`Page ${i + 1} analysis returned empty`);
        }
      }

      if (pageResults.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Impossible d'analyser les plans. Vérifie que les images sont accessibles et pas trop lourdes.",
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Merge all page results into a unified budget with Claude
      console.log(`Merging ${pageResults.length} page analyses into unified budget...`);
      const mergePrompt = `Tu as reçu ${pageResults.length} analyses partielles de pages de plans de construction pour un projet au Québec.

NOTES CLIENT: ${body.additionalNotes || 'Aucune'}
QUALITÉ: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}

VOICI LES ANALYSES PAR PAGE:
${pageResults.map((r, i) => `\n--- PAGE ${i + 1} ---\n${r}`).join('\n')}

MISSION: Fusionne toutes ces données en UN SEUL JSON d'estimation budgétaire complet.
- Déduplique les éléments identiques (même matériau = additionner quantités)
- Calcule tous les sous-totaux par catégorie
- Applique les prix Québec 2025
- Calcule TPS 5% + TVQ 9.975%
- Retourne le JSON au format demandé (extraction, totaux, validation, recommandations, resume_projet)`;

      const mergeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: SYSTEM_PROMPT_EXTRACTION,
          messages: [{ role: 'user', content: mergePrompt }],
        }),
      });

      if (!mergeResp.ok) {
        const txt = await mergeResp.text();
        console.error('Claude merge error:', mergeResp.status, txt);
        return new Response(
          JSON.stringify({ success: false, error: `Claude merge failed: ${mergeResp.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const mergeData = await mergeResp.json();
      finalContent = mergeData.content?.[0]?.text || '';
      console.log('Multi-pass merge complete');
    } else {
      // Manual mode or no images: single call to Claude (text only)
      console.log('Analyzing with Claude (text mode)...');
      const textResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: SYSTEM_PROMPT_EXTRACTION,
          messages: [{ role: 'user', content: extractionPrompt }],
        }),
      });

      if (!textResp.ok) {
        const txt = await textResp.text();
        console.error('Claude text error:', textResp.status, txt);
        return new Response(
          JSON.stringify({ success: false, error: `Claude API failed: ${textResp.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const textData = await textResp.json();
      finalContent = textData.content?.[0]?.text || '';
      console.log('Claude text analysis complete');
    }

    if (!finalContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the final JSON - handle text before/after JSON and truncation
    let budgetData;
    try {
      // Remove markdown code blocks
      let cleanContent = finalContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Find JSON start - look for opening brace
      const jsonStart = cleanContent.indexOf('{');
      if (jsonStart > 0) {
        cleanContent = cleanContent.substring(jsonStart);
      }
      
      // Try to parse, if truncated try to fix
      try {
        budgetData = JSON.parse(cleanContent);
      } catch (firstTry) {
        // Response might be truncated - try to close JSON properly
        console.log('JSON appears truncated, attempting to repair...');
        
        // Count open braces and brackets
        let braceCount = 0;
        let bracketCount = 0;
        for (const char of cleanContent) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
        }
        
        // Add missing closures
        let repairedContent = cleanContent;
        while (bracketCount > 0) {
          repairedContent += ']';
          bracketCount--;
        }
        while (braceCount > 0) {
          repairedContent += '}';
          braceCount--;
        }
        
        try {
          budgetData = JSON.parse(repairedContent);
          console.log('JSON repair successful');
        } catch (secondTry) {
          // Last resort: create a minimal valid response
          console.error('JSON repair failed, creating fallback response');
          budgetData = {
            extraction: {
              type_projet: "ANALYSE_INCOMPLETE",
              superficie_nouvelle_pi2: 0,
              nombre_etages: 1,
              categories: [],
              elements_manquants: ["L'analyse a été interrompue - veuillez réessayer"]
            },
            totaux: { total_ttc: 0 },
            recommandations: ["Veuillez relancer l'analyse - la réponse a été tronquée"],
            resume_projet: "Analyse incomplète"
          };
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', finalContent?.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse budget data - please try again' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform to expected format for frontend compatibility
    const transformedData = transformToLegacyFormat(budgetData, finishQuality);

    console.log('Analysis complete');

    return new Response(
      JSON.stringify({ success: true, data: transformedData, rawAnalysis: budgetData }),
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

// Transform the new detailed format to legacy format for frontend compatibility
function transformToLegacyFormat(data: any, finishQuality: string): any {
  // Handle case where data is already in legacy format
  if (data.categories && Array.isArray(data.categories) && data.categories[0]?.budget !== undefined) {
    return data;
  }

  // Handle new extraction format
  const extraction = data.extraction || data;
  const totaux = data.totaux || {};
  const validation = data.validation || {};

  const categories = (extraction.categories || []).map((cat: any) => ({
    name: cat.nom || cat.name,
    budget: cat.sous_total_categorie || cat.budget || 0,
    description: `${cat.items?.length || 0} items - Main-d'œuvre: ${cat.heures_main_oeuvre || 0}h`,
    items: (cat.items || []).map((item: any) => ({
      name: `${item.description} (${item.source || 'N/A'})`,
      cost: item.total || item.cost || 0,
      quantity: String(item.quantite || item.quantity || ''),
      unit: item.unite || item.unit || ''
    }))
  }));

  // Add contingence and taxes as categories
  if (totaux.contingence_5_pourcent) {
    categories.push({
      name: "Contingence (5%)",
      budget: totaux.contingence_5_pourcent,
      description: "Provision pour imprévus",
      items: [{ name: "Contingence 5%", cost: totaux.contingence_5_pourcent, quantity: "1", unit: "forfait" }]
    });
  }

  if (totaux.tps_5_pourcent || totaux.tvq_9_975_pourcent) {
    const tps = totaux.tps_5_pourcent || 0;
    const tvq = totaux.tvq_9_975_pourcent || 0;
    categories.push({
      name: "Taxes",
      budget: tps + tvq,
      description: "TPS 5% + TVQ 9.975%",
      items: [
        { name: "TPS (5%)", cost: tps, quantity: "1", unit: "taxe" },
        { name: "TVQ (9.975%)", cost: tvq, quantity: "1", unit: "taxe" }
      ]
    });
  }

  const warnings = [
    ...(extraction.elements_manquants || []).map((e: string) => `⚠️ Élément manquant: ${e}`),
    ...(extraction.ambiguites || []).map((e: string) => `❓ Ambiguïté: ${e}`),
    ...(extraction.incoherences || []).map((e: string) => `⚡ Incohérence: ${e}`),
    ...(validation.alertes || [])
  ];

  // Ajouter avertissements automatiques pour travaux de préparation
  const projectType = (extraction.type_projet || "").toUpperCase();
  const isAttachedOrExtension = projectType.includes("AGRANDISSEMENT") || 
                                 projectType.includes("GARAGE") || 
                                 projectType.includes("JUMELÉ") ||
                                 projectType.includes("JUMELE") ||
                                 projectType.includes("ANNEXE");

  // Avertissements travaux de préparation (toujours affichés)
  warnings.push("🏗️ PRÉPARATION DU SITE: Vérifier les coûts d'excavation, nivellement, et accès chantier");
  warnings.push("🚧 PERMIS ET INSPECTIONS: Frais de permis de construction et inspections municipales à prévoir");
  warnings.push("📋 SERVICES PUBLICS: Confirmer les raccordements (eau, égout, électricité, gaz) et frais associés");

  // Avertissements spécifiques au jumelage à l'existant
  if (isAttachedOrExtension) {
    warnings.push("🔗 JUMELAGE STRUCTUREL: Travaux de connexion à la structure existante (linteaux, ancrages, renfort fondation)");
    warnings.push("⚡ RACCORDEMENT ÉLECTRIQUE: Extension du panneau existant et mise aux normes possiblement requise");
    warnings.push("🔌 RACCORDEMENT PLOMBERIE: Connexion aux systèmes existants (eau, drainage, chauffage)");
    warnings.push("🏠 IMPERMÉABILISATION: Joint d'étanchéité entre nouvelle et ancienne construction critique");
    warnings.push("🎨 HARMONISATION: Travaux de finition pour raccorder les matériaux extérieurs existants");
    warnings.push("🔥 COUPE-FEU: Vérifier les exigences de séparation coupe-feu entre garage et habitation");
  }

  return {
    projectType: extraction.type_projet || "CONSTRUCTION_NEUVE",
    projectSummary: data.resume_projet || `Projet de ${extraction.superficie_nouvelle_pi2 || 0} pi² - ${extraction.nombre_etages || 1} étage(s)`,
    estimatedTotal: totaux.total_ttc || totaux.sous_total_avant_taxes || 0,
    newSquareFootage: extraction.superficie_nouvelle_pi2 || 0,
    plansAnalyzed: extraction.plans_analyses || 1,
    finishQuality: finishQuality,
    categories,
    recommendations: data.recommandations || [],
    warnings,
    validation: {
      surfacesCompletes: validation.surfaces_completes,
      ratioMainOeuvre: validation.ratio_main_oeuvre_materiaux,
      ratioAcceptable: validation.ratio_acceptable
    },
    totauxDetails: totaux
  };
}
