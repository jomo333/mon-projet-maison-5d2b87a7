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

const SYSTEM_PROMPT_EXTRACTION = `Tu es un ESTIMATEUR PROFESSIONNEL QUÉBÉCOIS CERTIFIÉ avec 25 ans d'expérience en AUTOCONSTRUCTION.

MISSION: Analyser TOUS les plans de construction fournis simultanément pour produire une estimation COMPLÈTE pour un projet d'AUTOCONSTRUCTION (owner-builder, sans entrepreneur général).

## CONTEXTE AUTOCONSTRUCTION

Cette estimation est pour un autoconstructeur qui:
- Gère lui-même son projet (pas de frais de gestion d'entrepreneur 10-15%)
- Coordonne directement les sous-traitants
- Peut réaliser certaines tâches lui-même (finitions, peinture, etc.)
- Économise les marges de profit d'un entrepreneur général

## EXTRACTION REQUISE - TOUTES LES CATÉGORIES

Tu DOIS produire des estimations pour CHAQUE catégorie suivante, même si les plans ne montrent pas tous les détails:

1. **Fondation** - Semelles, murs de fondation, dalle de béton, imperméabilisation
2. **Structure** - Charpente, solives, colombages, poutres, poutrelles
3. **Toiture** - Fermes de toit, couverture, bardeaux, soffites, fascias
4. **Revêtement extérieur** - Parement, briques, pierre, vinyle
5. **Fenêtres et portes** - Toutes fenêtres, portes extérieures, portes intérieures
6. **Isolation et pare-air** - Isolation murs, plafonds, pare-vapeur, Tyvek
7. **Électricité** - Panneau, filage, prises, interrupteurs, luminaires
8. **Plomberie** - Tuyauterie, drains, robinetterie, chauffe-eau
9. **Chauffage/CVAC** - Système de chauffage, ventilation, climatisation
10. **Finition intérieure** - Gypse, peinture, moulures, planchers
11. **Cuisine** - Armoires, comptoirs, électroménagers
12. **Salle(s) de bain** - Vanités, toilettes, douches/bains

## RÈGLES CRITIQUES

- Analyse TOUTES les pages/images fournies ENSEMBLE
- Pour les éléments non visibles sur les plans, ESTIME en fonction de la superficie et du type de projet
- Utilise les prix du marché Québec 2025 pour AUTOCONSTRUCTION
- Ratio main-d'œuvre/matériaux: 35-50% selon le type de travail
- TOUJOURS inclure TPS 5% + TVQ 9.975%
- TOUJOURS ajouter contingence 5%
- Les coûts sont calculés PAR ÉTAGE (superficie habitable par niveau)

## COÛT TOTAL AUTOCONSTRUCTION AU QUÉBEC 2025 (référence globale par pi² habitable)

⚠️ IMPORTANT: Ces coûts sont pour l'AUTOCONSTRUCTION (sans frais de gestion entrepreneur 10-15%)

| Gamme | Coût global $/pi² | Description |
|-------|-------------------|-------------|
| Entrée de gamme | 160$ - 190$/pi² | Finis simples, matériaux économiques |
| Gamme intermédiaire | 190$ - 240$/pi² | Bon rapport qualité-prix, finis standards |
| Haut de gamme | 300$/pi²+ | Finis luxueux, personnalisation élevée |

**Estimation typique AUTOCONSTRUCTION Québec 2025**: 180$ à 240$/pi² pour une maison standard
**Fourchette large observée**: 180$ à 330$/pi² selon les matériaux et la complexité

## CE QUI EST INCLUS DANS CES COÛTS

✅ INCLUS:
- Structure de la maison (fondations, murs, toiture)
- Matériaux de construction
- Main-d'œuvre des sous-traitants (électricien, plombier, etc.)
- Finitions intérieures standards
- Contingence 5%
- Taxes TPS/TVQ

❌ NON INCLUS (à ajouter séparément si applicable):
- Achat du terrain
- Excavation / nivellement du terrain
- Raccordements aux services publics (eau, égouts, électricité)
- Aménagement paysager
- Permis et inspections

## PRIX DÉTAILLÉS PAR CATÉGORIE AUTOCONSTRUCTION QUÉBEC 2025 (par pi² de superficie habitable PAR ÉTAGE)

| Catégorie | Économique | Standard | Haut de gamme |
|-----------|------------|----------|---------------|
| Fondation | 30-40$ | 40-52$ | 52-70$ |
| Structure | 22-30$ | 30-44$ | 44-60$ |
| Toiture | 13-17$ | 17-26$ | 26-40$ |
| Revêtement | 13-22$ | 22-35$ | 35-60$ |
| Fenêtres/Portes | 17-26$ | 26-44$ | 44-70$ |
| Isolation | 7-10$ | 10-16$ | 16-22$ |
| Électricité | 13-17$ | 17-26$ | 26-44$ |
| Plomberie | 10-16$ | 16-24$ | 24-40$ |
| CVAC | 13-22$ | 22-35$ | 35-52$ |
| Gypse/Peinture | 10-16$ | 16-22$ | 22-30$ |
| Planchers | 7-13$ | 13-26$ | 26-52$ |
| Cuisine | 7k-13k$ | 13k-30k$ | 30k-70k$ |
| Salle de bain | 4k-9k$ | 9k-22k$ | 22k-44k$ |

**NOTE IMPORTANTE**: Les coûts par catégorie sont basés sur la superficie HABITABLE par étage.
Pour une maison de 2 étages de 1500 pi² par étage (3000 pi² total habitable), 
le coût de Structure à 30$/pi² = 3000 x 30$ = 90 000$.

**RÉDUCTION AUTOCONSTRUCTION**: Ces prix reflètent déjà une réduction de ~15% par rapport aux prix avec entrepreneur général.

## FORMAT DE RÉPONSE JSON STRICT

{
  "extraction": {
    "type_projet": "CONSTRUCTION_NEUVE | AGRANDISSEMENT | RENOVATION | GARAGE | GARAGE_AVEC_ETAGE",
    "superficie_nouvelle_pi2": number,
    "nombre_etages": number,
    "plans_analyses": number,
    "categories": [
      {
        "nom": "Nom de la catégorie",
        "items": [
          {
            "description": "Description du matériau/travail",
            "quantite": number,
            "unite": "pi² | vg³ | ml | pcs | unité | forfait",
            "dimension": "dimension si applicable",
            "prix_unitaire": number,
            "total": number,
            "source": "Page X ou Estimé",
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
    "elements_manquants": ["Éléments non spécifiés"],
    "ambiguites": ["Informations ambiguës"],
    "incoherences": ["Incohérences détectées"]
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
    "alertes": ["Alertes importantes"]
  },
  "recommandations": ["Recommandations"],
  "resume_projet": "Description du projet"
}`;

type PageExtraction = {
  type_projet?: string;
  superficie_nouvelle_pi2?: number;
  nombre_etages?: number;
  plans_analyses?: number;
  categories?: any[];
  elements_manquants?: string[];
  ambiguites?: string[];
  incoherences?: string[];
};

function stripMarkdownCodeFences(text: string) {
  return String(text || "")
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

function safeParseJsonFromModel(text: string): any | null {
  try {
    let clean = stripMarkdownCodeFences(text);
    const jsonStart = clean.indexOf("{");
    if (jsonStart > 0) clean = clean.substring(jsonStart);

    try {
      return JSON.parse(clean);
    } catch {
      // Basic repair if truncated
      let braceCount = 0;
      let bracketCount = 0;
      for (const ch of clean) {
        if (ch === "{") braceCount++;
        if (ch === "}") braceCount--;
        if (ch === "[") bracketCount++;
        if (ch === "]") bracketCount--;
      }
      let repaired = clean;
      while (bracketCount > 0) {
        repaired += "]";
        bracketCount--;
      }
      while (braceCount > 0) {
        repaired += "}";
        braceCount--;
      }
      return JSON.parse(repaired);
    }
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(url: string, maxBytes: number): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) return null;
    const base64 = encodeBase64(arrayBuffer);
    const contentType = resp.headers.get('content-type') || 'image/png';
    const mediaType = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'image/jpeg'
      : contentType.includes('webp')
        ? 'image/webp'
        : 'image/png';
    return { base64, mediaType };
  } catch {
    return null;
  }
}

async function analyzeOnePageWithClaude({
  apiKey,
  imageBase64,
  mediaType,
  finishQualityLabel,
  pageNumber,
  totalPages,
  additionalNotes,
  projectType,
}: {
  apiKey: string;
  imageBase64: string;
  mediaType: string;
  finishQualityLabel: string;
  pageNumber: number;
  totalPages: number;
  additionalNotes?: string;
  projectType?: string;
}): Promise<string | null> {
  // Build special instruction for "agrandissement" projects
  const isAgrandissement = projectType?.toLowerCase().includes('agrandissement');
  const agrandissementInstruction = isAgrandissement 
    ? `
INSTRUCTION CRITIQUE - AGRANDISSEMENT:
- Ce projet est un AGRANDISSEMENT (extension). 
- IGNORE COMPLÈTEMENT le bâtiment existant sur les plans.
- Analyse et estime UNIQUEMENT la partie NOUVELLE de la construction (l'extension).
- Ne prends PAS en compte les dimensions, superficies ou éléments de la maison existante.
- La "superficie_nouvelle_pi2" doit correspondre UNIQUEMENT à la superficie de l'agrandissement.
` 
    : '';

  const pagePrompt = `Tu analyses la PAGE ${pageNumber}/${totalPages} d'un ensemble de plans de construction au Québec.

QUALITÉ DE FINITION: ${finishQualityLabel}
${additionalNotes ? `NOTES CLIENT: ${additionalNotes}` : ''}
${agrandissementInstruction}
OBJECTIF:
- Extraire UNIQUEMENT ce qui est visible sur cette page (dimensions, quantités, matériaux).
${isAgrandissement ? '- Pour un AGRANDISSEMENT, extrais SEULEMENT les éléments de la partie NOUVELLE (extension), pas le bâtiment existant.' : ''}
- Si une catégorie n'est pas visible sur cette page, ne l\'invente pas.
- Retourne du JSON STRICT (sans texte autour), au format suivant:

{
  "extraction": {
    "type_projet": "CONSTRUCTION_NEUVE | AGRANDISSEMENT | RENOVATION | GARAGE | GARAGE_AVEC_ETAGE",
    "superficie_nouvelle_pi2": number,
    "nombre_etages": number,
    "plans_analyses": 1,
    "categories": [
      {
        "nom": string,
        "items": [
          {
            "description": string,
            "quantite": number,
            "unite": string,
            "dimension": string,
            "prix_unitaire": number,
            "total": number,
            "source": "Page ${pageNumber}",
            "confiance": "haute" | "moyenne" | "basse"
          }
        ],
        "sous_total_materiaux": number,
        "heures_main_oeuvre": number,
        "taux_horaire_CCQ": number,
        "sous_total_main_oeuvre": number,
        "sous_total_categorie": number
      }
    ],
    "elements_manquants": string[],
    "ambiguites": string[],
    "incoherences": string[]
  }
}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: SYSTEM_PROMPT_EXTRACTION,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: pagePrompt },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  return data.content?.[0]?.text || null;
}

function mid(min: number, max: number) {
  return (min + max) / 2;
}

function ensureAllMainCategoriesAndRecalc({
  mergedCategories,
  squareFootage,
  finishQuality,
}: {
  mergedCategories: any[];
  squareFootage: number;
  finishQuality: string;
}) {
  // Benchmarks ($/pi²) include materials+labour
  const perSqft: Record<string, { economique: [number, number]; standard: [number, number]; "haut-de-gamme": [number, number] }> = {
    "Fondation": { economique: [35, 45], standard: [45, 60], "haut-de-gamme": [60, 80] },
    "Structure": { economique: [25, 35], standard: [35, 50], "haut-de-gamme": [50, 70] },
    "Toiture": { economique: [15, 20], standard: [20, 30], "haut-de-gamme": [30, 45] },
    "Revêtement extérieur": { economique: [15, 25], standard: [25, 40], "haut-de-gamme": [40, 70] },
    "Fenêtres et portes": { economique: [20, 30], standard: [30, 50], "haut-de-gamme": [50, 80] },
    "Isolation et pare-air": { economique: [8, 12], standard: [12, 18], "haut-de-gamme": [18, 25] },
    "Électricité": { economique: [15, 20], standard: [20, 30], "haut-de-gamme": [30, 50] },
    "Plomberie": { economique: [12, 18], standard: [18, 28], "haut-de-gamme": [28, 45] },
    "Chauffage/CVAC": { economique: [15, 25], standard: [25, 40], "haut-de-gamme": [40, 60] },
    "Finition intérieure": { economique: [12, 18], standard: [18, 25], "haut-de-gamme": [25, 35] },
  };

  const fixed: Record<string, { economique: number; standard: number; "haut-de-gamme": number }> = {
    "Cuisine": { economique: mid(8000, 15000), standard: mid(15000, 35000), "haut-de-gamme": mid(35000, 80000) },
    // Assumption: 1 bathroom when unknown
    "Salle de bain": { economique: mid(5000, 10000), standard: mid(10000, 25000), "haut-de-gamme": mid(25000, 50000) },
  };

  const quality = (finishQuality === "economique" || finishQuality === "haut-de-gamme" || finishQuality === "standard")
    ? (finishQuality as "economique" | "standard" | "haut-de-gamme")
    : "standard";

  const normalize = (s: unknown) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const existingKeys = new Set(mergedCategories.map((c) => normalize(c.nom || c.name)));

  const required = [
    "Fondation",
    "Structure",
    "Toiture",
    "Revêtement extérieur",
    "Fenêtres et portes",
    "Isolation et pare-air",
    "Électricité",
    "Plomberie",
    "Chauffage/CVAC",
    "Finition intérieure",
    "Cuisine",
    "Salle de bain",
  ];

  const defaultLaborShare = 0.42; // within 35-50%

  for (const nom of required) {
    if (existingKeys.has(normalize(nom))) continue;

    let total = 0;
    if (perSqft[nom] && squareFootage > 0) {
      const [mn, mx] = perSqft[nom][quality];
      total = mid(mn, mx) * squareFootage;
    } else if (fixed[nom]) {
      total = fixed[nom][quality];
    }

    const sous_total_main_oeuvre = total * defaultLaborShare;
    const sous_total_materiaux = total - sous_total_main_oeuvre;

    mergedCategories.push({
      nom,
      items: [
        {
          description: "Estimation basée sur repères Québec 2025",
          quantite: 1,
          unite: "forfait",
          dimension: "",
          prix_unitaire: total,
          total,
          source: "Estimé",
          confiance: "basse",
        },
      ],
      sous_total_materiaux,
      heures_main_oeuvre: 0,
      taux_horaire_CCQ: 0,
      sous_total_main_oeuvre,
      sous_total_categorie: total,
    });
  }

  // Recompute subtotals consistently (and ensure labour isn't dropped)
  let totalMateriaux = 0;
  let totalMainOeuvre = 0;

  const normalizedCategories = mergedCategories.map((c) => {
    const itemsTotal = (c.items || []).reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0);
    let sousMat = Number(c.sous_total_materiaux);
    let sousMO = Number(c.sous_total_main_oeuvre);
    let sousCat = Number(c.sous_total_categorie);

    if (!Number.isFinite(sousMat) || sousMat <= 0) sousMat = itemsTotal;
    if (!Number.isFinite(sousMO) || sousMO < 0) sousMO = 0;

    // If category total missing, build it from materials + labour
    if (!Number.isFinite(sousCat) || sousCat <= 0) sousCat = sousMat + sousMO;

    // If labour missing but total suggests it, infer
    if (sousMO === 0 && sousCat > sousMat) sousMO = sousCat - sousMat;
    // If still missing, apply default labour share
    if (sousMO === 0 && sousMat > 0) sousMO = (sousMat * defaultLaborShare) / (1 - defaultLaborShare);

    sousCat = sousMat + sousMO;

    totalMateriaux += sousMat;
    totalMainOeuvre += sousMO;

    return {
      ...c,
      nom: c.nom || c.name,
      sous_total_materiaux: sousMat,
      sous_total_main_oeuvre: sousMO,
      sous_total_categorie: sousCat,
    };
  });

  const sousTotalAvantTaxes = normalizedCategories.reduce((sum: number, c: any) => sum + (Number(c.sous_total_categorie) || 0), 0);
  const contingence = sousTotalAvantTaxes * 0.05;
  const sousTotalAvecContingence = sousTotalAvantTaxes + contingence;
  const tps = sousTotalAvecContingence * 0.05;
  const tvq = sousTotalAvecContingence * 0.09975;
  const totalTtc = sousTotalAvecContingence + tps + tvq;

  const ratio = totalMateriaux > 0 ? totalMainOeuvre / totalMateriaux : null;
  const ratioAcceptable = ratio === null ? null : ratio >= 0.35 && ratio <= 0.5;

  return {
    categories: normalizedCategories,
    totaux: {
      total_materiaux: totalMateriaux,
      total_main_oeuvre: totalMainOeuvre,
      sous_total_avant_taxes: sousTotalAvantTaxes,
      contingence_5_pourcent: contingence,
      sous_total_avec_contingence: sousTotalAvecContingence,
      tps_5_pourcent: tps,
      tvq_9_975_pourcent: tvq,
      total_ttc: totalTtc,
    },
    validation: {
      surfaces_completes: false,
      ratio_main_oeuvre_materiaux: ratio,
      ratio_acceptable: ratioAcceptable,
      alertes: [],
    },
  };
}

function mergePageExtractions(pageExtractions: PageExtraction[]) {
  const normalizeKey = (s: unknown) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const catMap = new Map<string, any>();
  const missing = new Set<string>();
  const ambiguites = new Set<string>();
  const incoherences = new Set<string>();

  let typeProjet: string | undefined;
  let superficie: number | undefined;
  let etages: number | undefined;

  for (const ex of pageExtractions) {
    typeProjet = typeProjet || ex.type_projet;
    if (!superficie && Number(ex.superficie_nouvelle_pi2)) superficie = Number(ex.superficie_nouvelle_pi2);
    if (!etages && Number(ex.nombre_etages)) etages = Number(ex.nombre_etages);

    for (const e of ex.elements_manquants || []) missing.add(String(e));
    for (const e of ex.ambiguites || []) ambiguites.add(String(e));
    for (const e of ex.incoherences || []) incoherences.add(String(e));

    for (const cat of ex.categories || []) {
      const nom = cat.nom || cat.name || 'Autre';
      const key = normalizeKey(nom);
      const existing = catMap.get(key) || {
        nom,
        items: [],
        heures_main_oeuvre: 0,
        sous_total_main_oeuvre: 0,
        sous_total_materiaux: 0,
        taux_horaire_CCQ: Number(cat.taux_horaire_CCQ) || 0,
      };

      existing.heures_main_oeuvre += Number(cat.heures_main_oeuvre) || 0;
      existing.sous_total_main_oeuvre += Number(cat.sous_total_main_oeuvre) || 0;
      existing.sous_total_materiaux += Number(cat.sous_total_materiaux) || 0;
      existing.taux_horaire_CCQ = existing.taux_horaire_CCQ || Number(cat.taux_horaire_CCQ) || 0;

      // Merge items by description+unit+dimension
      const itemMap = new Map<string, any>();
      for (const it of existing.items) {
        const k = `${normalizeKey(it.description)}|${normalizeKey(it.unite)}|${normalizeKey(it.dimension)}`;
        itemMap.set(k, it);
      }
      for (const it of cat.items || []) {
        const desc = it.description;
        const unite = it.unite || it.unit;
        const dimension = it.dimension || '';
        const k = `${normalizeKey(desc)}|${normalizeKey(unite)}|${normalizeKey(dimension)}`;

        const quantite = Number(it.quantite) || 0;
        const prix = Number(it.prix_unitaire) || 0;
        const total = Number(it.total) || (quantite && prix ? quantite * prix : 0);

        const prev = itemMap.get(k);
        if (prev) {
          prev.quantite = (Number(prev.quantite) || 0) + quantite;
          prev.total = (Number(prev.total) || 0) + total;
          prev.prix_unitaire = Math.max(Number(prev.prix_unitaire) || 0, prix);
          prev.source = prev.source || it.source;
          itemMap.set(k, prev);
        } else {
          itemMap.set(k, {
            description: desc,
            quantite,
            unite,
            dimension,
            prix_unitaire: prix,
            total,
            source: it.source,
            confiance: it.confiance || 'moyenne',
          });
        }
      }
      existing.items = Array.from(itemMap.values());
      catMap.set(key, existing);
    }
  }

  return {
    typeProjet: typeProjet || 'GARAGE',
    superficie: superficie || 0,
    etages: etages || 1,
    categories: Array.from(catMap.values()),
    elements_manquants: Array.from(missing),
    ambiguites: Array.from(ambiguites),
    incoherences: Array.from(incoherences),
  };
}

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

    console.log('Analyzing:', { mode, imageCount: imageUrls.length, quality: finishQuality });

    // Build the prompt
    let extractionPrompt: string;
    
    // Check if project is an "agrandissement"
    const isAgrandissement = body.projectType?.toLowerCase().includes('agrandissement');
    const agrandissementInstruction = isAgrandissement
      ? `
INSTRUCTION CRITIQUE - AGRANDISSEMENT:
- Ce projet est un AGRANDISSEMENT (extension).
- IGNORE COMPLÈTEMENT le bâtiment existant sur les plans.
- Analyse et estime UNIQUEMENT la partie NOUVELLE de la construction (l'extension).
- Ne prends PAS en compte les dimensions, superficies ou éléments de la maison existante.
- La superficie doit correspondre UNIQUEMENT à la superficie de l'agrandissement.
`
      : '';
    
    if (mode === "plan") {
      // Mode plan: AUCUNE donnée manuelle - seulement les plans
      // Les données manuelles peuvent être obsolètes par rapport aux plans
      extractionPrompt = `Analyse ${imageUrls.length > 1 ? 'ces ' + imageUrls.length + ' plans' : 'ce plan'} de construction pour un projet AU QUÉBEC.

QUALITÉ DE FINITION: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}
${agrandissementInstruction}
INSTRUCTIONS CRITIQUES:
1. Examine TOUTES les pages/images fournies ensemble
2. EXTRAIS les dimensions, superficies et quantités DIRECTEMENT des plans
3. DÉDUIS le type de projet et le nombre d'étages à partir des plans
${isAgrandissement ? '4. Pour un AGRANDISSEMENT: analyse SEULEMENT la partie NOUVELLE, ignore le bâtiment existant' : ''}
5. Pour chaque catégorie NON VISIBLE, ESTIME les coûts basés sur la superficie EXTRAITE des plans
6. Tu DOIS retourner TOUTES les 12 catégories principales (Fondation, Structure, Toiture, Revêtement, Fenêtres, Isolation, Électricité, Plomberie, CVAC, Finition, Cuisine, Salle de bain)
7. Applique les prix du marché Québec 2025

Retourne le JSON structuré COMPLET avec TOUTES les catégories.`;
    } else {
      // Manual mode
      const { projectType, squareFootage, numberOfFloors, hasGarage, foundationSqft, floorSqftDetails, additionalNotes } = body;
      
      extractionPrompt = `Génère une estimation budgétaire COMPLÈTE pour ce projet au QUÉBEC en 2025.

## PROJET À ESTIMER
- TYPE: ${projectType || 'Maison unifamiliale'}
- ÉTAGES: ${numberOfFloors || 1}
- SUPERFICIE TOTALE: ${squareFootage || 1500} pi²
${foundationSqft ? `- FONDATION: ${foundationSqft} pi²` : ''}
${floorSqftDetails?.length ? `- DÉTAIL ÉTAGES: ${floorSqftDetails.join(', ')} pi²` : ''}
- GARAGE: ${hasGarage ? 'Oui (attaché)' : 'Non'}
- QUALITÉ: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}
${additionalNotes ? `- NOTES CLIENT: ${additionalNotes}` : ''}
${isAgrandissement ? `
INSTRUCTION CRITIQUE - AGRANDISSEMENT:
- Ce projet est un AGRANDISSEMENT. La superficie indiquée est celle de l'extension UNIQUEMENT.
- NE PAS estimer de coûts pour le bâtiment existant.
` : ''}

INSTRUCTIONS CRITIQUES:
1. Tu DOIS retourner TOUTES les 12 catégories principales
2. Utilise les prix du MILIEU de la fourchette pour la qualité sélectionnée
3. Inclus matériaux ET main-d'œuvre pour chaque catégorie
4. Calcule contingence 5% + TPS 5% + TVQ 9.975%

Retourne le JSON structuré COMPLET.`;
    }

    let finalContent: string;

    if (mode === 'plan' && imageUrls.length > 0) {
      // IMPORTANT: Do NOT accumulate base64 images in memory (WORKER_LIMIT). Process sequentially.
      console.log(`Starting sequential plan analysis for ${imageUrls.length} images...`);

      const maxBytesPerImage = 2_800_000; // ~2.8MB to stay safe
      const pageExtractions: PageExtraction[] = [];
      let skipped = 0;

      const finishQualityLabel = qualityDescriptions[finishQuality] || qualityDescriptions["standard"];

      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        console.log(`Processing image ${i + 1}/${imageUrls.length}...`);

        const img = await fetchImageAsBase64(url, maxBytesPerImage);
        if (!img) {
          skipped++;
          console.log(`Skipping image ${i + 1} (fetch failed or too large)`);
          continue;
        }

        const pageText = await analyzeOnePageWithClaude({
          apiKey: anthropicKey,
          imageBase64: img.base64,
          mediaType: img.mediaType,
          finishQualityLabel,
          pageNumber: i + 1,
          totalPages: imageUrls.length,
          additionalNotes: body.additionalNotes,
          projectType: body.projectType,
        });

        const parsed = pageText ? safeParseJsonFromModel(pageText) : null;
        const extraction = (parsed?.extraction || parsed) as PageExtraction | undefined;
        if (extraction && Array.isArray(extraction.categories)) {
          pageExtractions.push(extraction);
          console.log(`Image ${i + 1} analyzed (categories: ${extraction.categories.length})`);
        } else {
          console.log(`Image ${i + 1} returned non-parseable JSON`);
        }
      }

      if (pageExtractions.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Impossible d'analyser les plans. Images trop lourdes/illisibles ou erreur IA.",
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const merged = mergePageExtractions(pageExtractions);
      const sqftFallback = Number(body.squareFootage) || 0;
      const sqft = merged.superficie || sqftFallback;

      const completed = ensureAllMainCategoriesAndRecalc({
        mergedCategories: merged.categories,
        squareFootage: sqft,
        finishQuality,
      });

      // Generate descriptive project summary based on analysis (not user notes)
      const typeProjetDisplay = merged.typeProjet
        .replace('_', ' ')
        .toLowerCase()
        .replace(/^\w/, (c: string) => c.toUpperCase());
      
      const plansCount = imageUrls.length - skipped;
      const resumeProjet = `Analyse de ${plansCount} plan(s) - ${typeProjetDisplay} de ${sqft} pi² sur ${merged.etages} étage(s)`;

      const budgetData = {
        extraction: {
          type_projet: merged.typeProjet,
          superficie_nouvelle_pi2: sqft,
          nombre_etages: merged.etages,
          plans_analyses: plansCount,
          categories: completed.categories,
          elements_manquants: merged.elements_manquants,
          ambiguites: merged.ambiguites,
          incoherences: merged.incoherences,
        },
        totaux: completed.totaux,
        validation: completed.validation,
        recommandations: [
          "Analyse multi-pages: extraction séquentielle + complétion automatique des catégories manquantes.",
        ],
        resume_projet: resumeProjet,
      };

      finalContent = JSON.stringify(budgetData);
      console.log('Plan analysis complete - categories:', budgetData.extraction.categories.length);
    } else {
      // Manual mode or no images: text-only call
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
        JSON.stringify({ success: false, error: 'Réponse vide de l\'IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the final JSON
    let budgetData;
    try {
      let cleanContent = finalContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const jsonStart = cleanContent.indexOf('{');
      if (jsonStart > 0) {
        cleanContent = cleanContent.substring(jsonStart);
      }
      
      try {
        budgetData = JSON.parse(cleanContent);
      } catch (firstTry) {
        console.log('JSON appears truncated, attempting to repair...');
        
        let braceCount = 0;
        let bracketCount = 0;
        for (const char of cleanContent) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
        }
        
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
        JSON.stringify({ success: false, error: 'Échec de l\'analyse - veuillez réessayer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform to expected format for frontend compatibility
    const transformedData = transformToLegacyFormat(budgetData, finishQuality);

    console.log('Analysis complete - categories:', transformedData.categories?.length || 0);

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
  if (data.categories && Array.isArray(data.categories) && data.categories[0]?.budget !== undefined) {
    return data;
  }

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

  const projectType = (extraction.type_projet || "").toUpperCase();
  const isAttachedOrExtension = projectType.includes("AGRANDISSEMENT") || 
                                 projectType.includes("GARAGE") || 
                                 projectType.includes("JUMELÉ") ||
                                 projectType.includes("JUMELE") ||
                                 projectType.includes("ANNEXE");

  warnings.push("🏗️ PRÉPARATION DU SITE: Vérifier les coûts d'excavation, nivellement, et accès chantier");
  warnings.push("🚧 PERMIS ET INSPECTIONS: Frais de permis de construction et inspections municipales à prévoir");
  warnings.push("📋 SERVICES PUBLICS: Confirmer les raccordements (eau, égout, électricité, gaz) et frais associés");

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
