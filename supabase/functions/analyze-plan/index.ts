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
    const { mode, finishQuality = "standard", stylePhotoUrls = [] } = body;
    
    // Quality level descriptions for the AI
    const qualityDescriptions: Record<string, string> = {
      "economique": `QUALITÉ ÉCONOMIQUE - Matériaux d'entrée de gamme:
- Planchers: Plancher flottant stratifié 8mm dans toutes les pièces, céramique de base dans salle de bain
- Armoires: Mélamine blanche ou bois, charnières standard, pas de tiroirs coulissants
- Comptoirs: Stratifié (Formica/Arborite)
- Quincaillerie: Poignées de base en métal chromé
- Portes intérieures: Portes creuses masonite blanches
- Moulures: Plinthes 3" MDF peintes, pas de cadrage élaboré
- Peinture: Latex standard, 2 couleurs maximum
- Salle de bain: Vanité préfabriquée mélamine, robinetterie de base chrome
- Électricité: Prises et interrupteurs blancs standards
- Éclairage: Luminaires de base (plafonniers simples)`,
      "standard": `QUALITÉ STANDARD - Bon rapport qualité-prix:
- Planchers: Bois franc ingénierie (chêne/érable) au salon/chambres, céramique 12"x24" aux salles de bain/entrée
- Armoires: Semi-custom en thermoplastique ou bois, tiroirs à fermeture douce, quincaillerie de qualité
- Comptoirs: Quartz (Silestone, Caesarstone) 
- Quincaillerie: Poignées en acier inoxydable brossé
- Portes intérieures: Portes pleines MDF peintes, modèle shaker
- Moulures: Plinthes 5", cadrages 3", moulure de couronne dans pièces principales
- Peinture: Latex premium, palette de couleurs variée
- Salle de bain: Vanité semi-custom, robinetterie Moen/Delta, douche céramique
- Électricité: Prises Decora, variateurs dans pièces principales
- Éclairage: Luminaires encastrés LED, suspensions design dans cuisine/salle à manger`,
      "haut-de-gamme": `QUALITÉ HAUT DE GAMME - Finitions luxueuses:
- Planchers: Bois franc massif 3/4" (chêne blanc, noyer, hickory), tuile grand format porcelaine/marbre aux SDB
- Armoires: Sur mesure en bois massif (érable, merisier, noyer), tiroirs Blum, intérieurs organisés
- Comptoirs: Granite, marbre ou quartz premium avec dosseret assorti
- Quincaillerie: Design haut de gamme (Top Knobs, Emtek)
- Portes intérieures: Portes massives avec moulures, ferrures haut de gamme
- Moulures: Plinthes 7"+, cadrages élaborés, caissons au plafond, lambris décoratifs
- Peinture: Benjamin Moore/Sherwin-Williams premium, faux-finis et accents
- Salle de bain: Vanité sur mesure, robinetterie Grohe/Kohler haut de gamme, douche à l'italienne
- Électricité: Système domotique, prises USB intégrées, variateurs centralisés
- Éclairage: Luminaires design signés, éclairage indirect, automatisation`
    };
    
    const qualityContext = qualityDescriptions[finishQuality] || qualityDescriptions["standard"];
    const qualityLabel = finishQuality === "economique" ? "ÉCONOMIQUE" : 
                        finishQuality === "haut-de-gamme" ? "HAUT DE GAMME" : "STANDARD";
    
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
    
    // Check if we have style reference photos
    const hasStylePhotos = stylePhotoUrls && Array.isArray(stylePhotoUrls) && stylePhotoUrls.length > 0;
    console.log('Style photos count:', hasStylePhotos ? stylePhotoUrls.length : 0);

    if (mode === "plan") {
      // Plan analysis mode - analyze uploaded plan images (supports multiple)
      // Support both single imageUrl (legacy) and multiple imageUrls
      if (body.imageUrls && Array.isArray(body.imageUrls)) {
        imageUrls = body.imageUrls;
      } else if (body.imageUrl) {
        imageUrls = [body.imageUrl];
      }
      
      // Add style photos to the image URLs for analysis
      if (hasStylePhotos) {
        imageUrls = [...imageUrls, ...stylePhotoUrls];
      }
      
      console.log('Analyzing plan images:', { planCount: body.imageUrls?.length || 1, styleCount: hasStylePhotos ? stylePhotoUrls.length : 0, totalImages: imageUrls.length });

      systemPrompt = `Tu es un expert en analyse de plans de construction et rénovation résidentielle au QUÉBEC, CANADA.
Tu dois analyser TOUS les plans fournis ENSEMBLE pour obtenir une vision complète du projet avant de générer une estimation budgétaire.

NIVEAU DE QUALITÉ DES FINITIONS CHOISI PAR LE CLIENT: ${qualityLabel}
${qualityContext}
${hasStylePhotos ? `
PHOTOS DE STYLE/INSPIRATION DU CLIENT:
Le client a fourni ${stylePhotoUrls.length} photo(s) d'inspiration montrant le style souhaité pour son projet.
ANALYSE CES PHOTOS ATTENTIVEMENT pour comprendre:
- Le style architectural désiré (moderne, traditionnel, contemporain, rustique, etc.)
- Les matériaux préférés (bois, pierre, métal, etc.)
- Les couleurs dominantes
- Le niveau de finition visé
- Les détails architecturaux importants (moulures, escaliers, fenestration, etc.)
ADAPTE ton estimation budgétaire pour refléter ce style, en choisissant des matériaux et finitions cohérents avec les inspirations fournies.
` : ''}
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
- Prix des matériaux selon les fournisseurs locaux (BMR, Canac, Rona, Patrick Morin)
- Coût moyen au Québec pour agrandissement: 300-450$/pi²
- Coût moyen au Québec pour construction neuve: 250-350$/pi² standard, 350-500$/pi² qualité supérieure

IMPORTANT - STRUCTURE DU BUDGET:
1. Calcule d'abord le SOUS-TOTAL de tous les travaux (sans taxes ni contingence)
2. Ajoute une catégorie "Contingence" = 5% du sous-total des travaux
3. Ajoute une catégorie "Taxes" avec:
   - TPS (5% du sous-total + contingence)
   - TVQ (9.975% du sous-total + contingence)
4. Le "estimatedTotal" = sous-total + contingence + taxes

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) avec cette structure:
{
  "projectType": "AGRANDISSEMENT" | "CONSTRUCTION_NEUVE" | "RENOVATION" | "SURELEVATION" | "GARAGE",
  "projectSummary": "Description précise: type de projet + superficie de la NOUVELLE partie seulement + caractéristiques observées dans tous les plans",
  "estimatedTotal": number,
  "newSquareFootage": number (superficie de la NOUVELLE construction seulement),
  "plansAnalyzed": number (nombre de plans analysés),
  "finishQuality": "${finishQuality}",
  "categories": [
    {
      "name": "Nom de la catégorie",
      "budget": number,
      "description": "Description SPÉCIFIQUE des travaux basée sur ce que tu vois RÉELLEMENT dans les plans (dimensions, matériaux, configurations observées)",
      "items": [
        { 
          "name": "Nom PRÉCIS et DESCRIPTIF - DOIT inclure la PIÈCE ou l'ÉTAGE concerné, le TYPE EXACT de matériau selon la qualité ${qualityLabel}, les dimensions et quantités", 
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

IMPORTANT POUR LES ITEMS - PERSONNALISATION DÉTAILLÉE PAR PIÈCE/ÉTAGE:
- Chaque item DOIT préciser la PIÈCE ou l'ÉTAGE concerné
- DOIT spécifier le TYPE EXACT de matériau selon la qualité ${qualityLabel} choisie
- DOIT justifier le coût par la qualité du matériau choisi

Exemples de noms EXCELLENTS pour catégorie "Finitions intérieures" selon qualité ${qualityLabel}:
${finishQuality === "economique" ? `
  * "Plancher flottant stratifié 8mm - Salon/salle à manger rez-de-chaussée (350 pi²)"
  * "Plancher flottant stratifié 8mm - Chambres étage (280 pi²)"  
  * "Céramique de base 12x12 - Salle de bain principale (45 pi²)"
  * "Armoires de cuisine mélamine blanche - 15 pi.lin. base + 12 pi.lin. haut"
  * "Comptoir stratifié Formica - Cuisine en L (25 pi.lin.)"
  * "Vanité préfabriquée mélamine 36\" - Salle de bain principale"
  * "Portes intérieures creuses masonite blanches (8 unités)"
  * "Plinthes MDF 3\" peintes - Tout le rez-de-chaussée (120 pi.lin.)"
  * "Robinetterie chrome de base - Cuisine et SDB (3 robinets)"` : 
finishQuality === "haut-de-gamme" ? `
  * "Plancher bois franc massif chêne blanc 3/4\" - Salon/salle à manger (350 pi²)"
  * "Plancher bois franc massif noyer 3/4\" - Chambres maîtresse (180 pi²)"
  * "Tuile porcelaine grand format 24x48 - Salle de bain principale (60 pi²)"
  * "Armoires cuisine sur mesure érable massif - 18 pi.lin. base + 15 pi.lin. haut + îlot 6'"
  * "Comptoir granite noir absolu poli 1.25\" - Cuisine + îlot (35 pi.lin.)"
  * "Vanité sur mesure merisier massif 60\" double vasque - SDB maîtresse"
  * "Portes intérieures massives shaker avec moulures (10 unités + ferrures Emtek)"
  * "Moulures élaborées: plinthes 7\", cadrages 5\", couronne 6\" - Pièces principales"
  * "Robinetterie Grohe/Kohler haut de gamme - Cuisine et 3 SDB (6 robinets)"
  * "Douche à l'italienne céramique grand format - SDB maîtresse (35 pi²)"` : `
  * "Plancher bois franc ingénierie chêne 5\" - Salon/salle à manger rez-de-chaussée (350 pi²)"
  * "Plancher bois franc ingénierie érable 5\" - Chambres étage (280 pi²)"
  * "Céramique porcelaine 12x24 - Salle de bain principale + secondaire (90 pi²)"
  * "Armoires semi-custom thermoplastique shaker - 16 pi.lin. base + 14 pi.lin. haut"
  * "Comptoir quartz Silestone 1.25\" - Cuisine en L + îlot (30 pi.lin.)"
  * "Vanité semi-custom 48\" simple vasque - SDB principale"
  * "Portes intérieures MDF pleines shaker peintes (9 unités)"
  * "Plinthes MDF 5\" + cadrages 3\" + couronne salon - Pièces principales (180 pi.lin.)"
  * "Robinetterie Moen/Delta - Cuisine et 2 SDB (4 robinets)"`}

Exemples de noms MAUVAIS et INTERDITS:
  * "Plancher" (pas de type ni de pièce)
  * "Armoires de cuisine" (pas de matériau ni dimensions)
  * "Comptoir" (pas de matériau ni longueur)
  * "Finitions" (beaucoup trop vague)

CATÉGORIES À EXCLURE (projet autoconstruction):
- NE PAS inclure: Gestion de projet, Administration, Supervision, Frais généraux d'entrepreneur, Profit d'entrepreneur, Honoraires de gestion
- NE PAS inclure: Frais divers, Imprévus, Divers et imprévus (déjà couverts par la Contingence 5%)
- L'autoconstructeur gère lui-même son projet, donc aucun frais de gestion ne doit apparaître
- La contingence de 5% couvre TOUS les imprévus et frais divers - ne pas créer de catégorie séparée

Catégories pour AGRANDISSEMENT: Fondations (nouvelle partie), Structure/Charpente, Toiture, Raccordement à l'existant, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures, Démolition (si applicable), Contingence (5%), Taxes (TPS + TVQ).

Catégories pour CONSTRUCTION NEUVE: Fondations, Structure/Charpente, Toiture, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures, Garage (si présent), Contingence (5%), Taxes (TPS + TVQ).`;

      userMessage = `Analyse ${imageUrls.length > 1 ? 'ces ' + imageUrls.length + ' plans' : 'ce plan'} de construction/rénovation pour un projet AU QUÉBEC.

QUALITÉ DE FINITION SÉLECTIONNÉE: ${qualityLabel}
Le client a choisi un niveau de finition ${qualityLabel.toLowerCase()}. Adapte TOUS les matériaux et coûts en conséquence.

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
- Générer un budget adapté au type de projet identifié ET au niveau de qualité ${qualityLabel}
- CRITIQUE: Pour chaque item de finition, précise:
  * La PIÈCE concernée (ex: "Salon", "Chambre maître", "SDB principale")
  * L'ÉTAGE si multi-niveaux (ex: "rez-de-chaussée", "étage")
  * Le TYPE EXACT de matériau selon la qualité ${qualityLabel} (ex: "plancher flottant 8mm" vs "bois franc massif chêne 3/4")
  * Les DIMENSIONS ou QUANTITÉS observées sur les plans

Génère une estimation budgétaire réaliste basée sur l'analyse ${imageUrls.length > 1 ? 'de tous les plans' : 'du plan'} et les coûts actuels au Québec (2024-2025) pour une finition ${qualityLabel.toLowerCase()}.`;

    } else {
      // Manual mode - use provided parameters
      const { 
        projectType, 
        squareFootage, 
        numberOfFloors, 
        hasGarage, 
        foundationSqft, 
        floorSqftDetails,
        additionalNotes
      } = body;

      console.log('Manual analysis:', { projectType, squareFootage, numberOfFloors, hasGarage, foundationSqft, additionalNotes: additionalNotes?.substring(0, 100), stylePhotos: hasStylePhotos ? stylePhotoUrls.length : 0 });
      
      // For manual mode, if we have style photos, add them to imageUrls for analysis
      if (hasStylePhotos) {
        imageUrls = [...stylePhotoUrls];
      }

      systemPrompt = `Tu es un expert en estimation de coûts de construction résidentielle au QUÉBEC, CANADA. 
Tu dois analyser les informations fournies sur un projet de construction et générer une estimation budgétaire détaillée.

NIVEAU DE QUALITÉ DES FINITIONS CHOISI PAR LE CLIENT: ${qualityLabel}
${qualityContext}
${hasStylePhotos ? `
PHOTOS DE STYLE/INSPIRATION DU CLIENT:
Le client a fourni ${stylePhotoUrls.length} photo(s) d'inspiration montrant le style souhaité pour son projet.
ANALYSE CES PHOTOS ATTENTIVEMENT pour comprendre:
- Le style architectural désiré (moderne, traditionnel, contemporain, rustique, etc.)
- Les matériaux préférés (bois, pierre, métal, etc.)
- Les couleurs dominantes
- Le niveau de finition visé
- Les détails architecturaux importants (moulures, escaliers, fenestration, etc.)
ADAPTE ton estimation budgétaire pour refléter ce style, en choisissant des matériaux et finitions cohérents avec les inspirations fournies.
` : ''}

IMPORTANT - CONTEXTE QUÉBÉCOIS:
- Tous les prix doivent refléter le marché québécois 2024-2025
- Inclure les coûts de main-d'œuvre québécois (salaires syndicaux CCQ si applicable)
- Tenir compte du climat québécois (isolation R-41 minimum pour les murs, R-60 pour le toit)
- Considérer les exigences du Code de construction du Québec
- Prix des matériaux selon les fournisseurs locaux (BMR, Canac, Rona, Patrick Morin)
- Coût moyen au Québec: 250-350$/pi² pour construction standard, 350-500$/pi² pour qualité supérieure

IMPORTANT - STRUCTURE DU BUDGET:
1. Calcule d'abord le SOUS-TOTAL de tous les travaux (sans taxes ni contingence)
2. Ajoute une catégorie "Contingence" = 5% du sous-total des travaux
3. Ajoute une catégorie "Taxes" avec:
   - TPS (5% du sous-total + contingence)
   - TVQ (9.975% du sous-total + contingence)
4. Le "estimatedTotal" = sous-total + contingence + taxes

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) avec cette structure:
{
  "projectSummary": "Description courte du projet incluant le niveau de qualité ${qualityLabel}",
  "estimatedTotal": number,
  "finishQuality": "${finishQuality}",
  "categories": [
    {
      "name": "Nom de la catégorie",
      "budget": number,
      "description": "Description SPÉCIFIQUE des travaux adaptée à ce projet et au niveau de qualité ${qualityLabel}",
      "items": [
        { 
          "name": "Nom PRÉCIS - DOIT inclure la PIÈCE/ÉTAGE, le TYPE EXACT de matériau selon qualité ${qualityLabel}, dimensions", 
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

IMPORTANT POUR LES ITEMS - DESCRIPTIONS DÉTAILLÉES PAR PIÈCE/ÉTAGE:
- Chaque item de finition DOIT préciser la PIÈCE ou l'ÉTAGE concerné
- DOIT spécifier le TYPE EXACT de matériau selon la qualité ${qualityLabel} choisie
- DOIT justifier le coût par la qualité du matériau choisi

Exemples de noms EXCELLENTS pour catégorie "Finitions intérieures" qualité ${qualityLabel}:
${finishQuality === "economique" ? `
  * "Plancher flottant stratifié 8mm - Salon/SAM rez-de-chaussée (estimé 350 pi²)"
  * "Plancher flottant stratifié 8mm - Chambres étage (estimé 280 pi²)"
  * "Céramique de base 12x12 - Salle de bain (estimé 45 pi²)"
  * "Armoires mélamine blanche - Cuisine (estimé 15 pi.lin. base + 12 haut)"
  * "Comptoir stratifié Formica - Cuisine (estimé 20 pi.lin.)"
  * "Vanité préfabriquée mélamine 36\" - SDB"
  * "Portes creuses masonite blanches (estimé 8 unités)"` : 
finishQuality === "haut-de-gamme" ? `
  * "Plancher bois franc massif chêne blanc 3/4\" - Salon/SAM (estimé 350 pi²)"
  * "Plancher bois franc massif noyer 3/4\" - Chambre maîtresse (estimé 180 pi²)"
  * "Tuile porcelaine grand format 24x48 - SDB principale (estimé 60 pi²)"
  * "Armoires sur mesure érable massif - Cuisine (estimé 18 base + 15 haut + îlot)"
  * "Comptoir granite noir absolu poli 1.25\" - Cuisine + îlot (estimé 35 pi.lin.)"
  * "Vanité sur mesure merisier 60\" double vasque - SDB maîtresse"
  * "Portes massives shaker avec ferrures Emtek (estimé 10 unités)"
  * "Moulures élaborées plinthes 7\", cadrages 5\", couronne - Pièces principales"` : `
  * "Plancher bois franc ingénierie chêne 5\" - Salon/SAM (estimé 350 pi²)"
  * "Plancher bois franc ingénierie érable 5\" - Chambres (estimé 280 pi²)"
  * "Céramique porcelaine 12x24 - Salle de bain (estimé 80 pi²)"
  * "Armoires semi-custom thermoplastique shaker - Cuisine (estimé 16 base + 14 haut)"
  * "Comptoir quartz Silestone 1.25\" - Cuisine (estimé 25 pi.lin.)"
  * "Vanité semi-custom 48\" - SDB principale"
  * "Portes MDF pleines shaker peintes (estimé 9 unités)"`}

Exemples de noms MAUVAIS:
  * "Plancher" (pas de type ni de pièce)
  * "Armoires" (pas de matériau ni dimensions)
  * "Comptoir" (pas de matériau)

CATÉGORIES À EXCLURE (projet autoconstruction):
- NE PAS inclure: Gestion de projet, Administration, Supervision, Frais généraux d'entrepreneur, Profit d'entrepreneur, Honoraires de gestion
- NE PAS inclure: Frais divers, Imprévus, Divers et imprévus (déjà couverts par la Contingence 5%)
- L'autoconstructeur gère lui-même son projet, donc aucun frais de gestion ne doit apparaître
- La contingence de 5% couvre TOUS les imprévus et frais divers - ne pas créer de catégorie séparée

Catégories typiques: Fondations, Structure/Charpente, Toiture, Fenêtres et Portes, Électricité, Plomberie, Chauffage/Ventilation, Isolation, Revêtements extérieurs, Finitions intérieures${hasGarage ? ', Garage' : ''}, Contingence (5%), Taxes (TPS + TVQ).`;

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
- QUALITÉ DE FINITION: ${qualityLabel}
- Région: Québec, Canada
${additionalNotes ? `
NOTES ADDITIONNELLES DU CLIENT (TRÈS IMPORTANT - tenir compte de ces besoins spécifiques):
${additionalNotes}
` : ''}
IMPORTANT - QUALITÉ ${qualityLabel}:
Le client a choisi un niveau de finition ${qualityLabel.toLowerCase()}. Adapte TOUS les matériaux de finition (planchers, armoires, comptoirs, portes, moulures, robinetterie) en conséquence.
${additionalNotes ? `
IMPORTANT - BESOINS DU CLIENT:
Analyse attentivement les notes du client ci-dessus et intègre ces besoins spécifiques dans ton estimation:
- Si le client mentionne un nombre de chambres, adapte les superficies et finitions
- Si le client mentionne des caractéristiques spéciales (sous-sol fini, cuisine ouverte, etc.), inclus les coûts correspondants
- Si le client mentionne des pièces spéciales (bureau, salle de cinéma, etc.), ajoute les catégories appropriées
` : ''}
Pour chaque item du budget, utilise des noms TRÈS DESCRIPTIFS avec:
- La PIÈCE ou l'ÉTAGE concerné (ex: "Salon rez-de-chaussée", "Chambres étage")
- Le TYPE EXACT de matériau selon la qualité ${qualityLabel}
- Les dimensions/quantités estimées selon la superficie

Génère une estimation budgétaire complète et réaliste basée sur les coûts actuels au Québec (2024-2025) pour une finition ${qualityLabel.toLowerCase()}.
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