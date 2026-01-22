import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SoumissionDoc {
  file_name: string;
  file_url: string;
}

// Convert file to base64 for Gemini Vision
async function fetchFileAsBase64(fileUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    console.log("Fetching file from:", fileUrl);
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error("Failed to fetch file:", response.status);
      return null;
    }
    
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    console.log(`File fetched: ${Math.round(buffer.byteLength / 1024)} KB, type: ${contentType}`);
    
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error("Error fetching file:", error);
    return null;
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

const SYSTEM_PROMPT = `Tu es un expert en analyse de soumissions pour la construction résidentielle au Québec.

## TA MISSION
Analyser les soumissions et produire un RÉSUMÉ CLAIR et SIMPLE à lire.

## FORMAT DE RÉPONSE (OBLIGATOIRE)

### 📋 Résumé des soumissions

Pour CHAQUE document analysé, présente un bloc simple:

**🏢 [Nom de l'entreprise]**
- 📞 Téléphone: [numéro]
- 💰 Montant avant taxes: [montant] $
- 💵 Avec taxes (TPS+TVQ): [montant × 1.14975] $
- 📅 Validité: [date ou durée]
- ✅ Inclus: [liste courte des éléments principaux]
- ❌ Exclus: [éléments non inclus importants]

---

### 🏛️ Subventions applicables

Vérifie si le type de travaux peut bénéficier de subventions québécoises ou fédérales:

| Programme | Admissibilité | Montant potentiel |
|-----------|---------------|-------------------|
| Rénoclimat (efficacité énergétique) | Oui/Non/Peut-être | Jusqu'à X $ |
| Novoclimat (construction neuve) | Oui/Non | X $ |
| LogisVert (thermopompes, isolation) | Oui/Non | Jusqu'à X $ |
| Subvention mazout/propane | Oui/Non | X $ |
| Programme fédéral SCHL | Oui/Non | X $ |

**💡 Coût NET estimé après subventions:** [Montant - subventions] $

---

### 📊 Comparaison rapide

| Entreprise | Avant taxes | Avec taxes | Après subventions* |
|------------|-------------|------------|-------------------|
| Nom 1 | X $ | X $ | X $ |
| Nom 2 | Y $ | Y $ | Y $ |

*Estimation basée sur les subventions potentiellement applicables

---

### ⭐ Recommandation

**Meilleur choix:** [Nom de l'entreprise]
- **Pourquoi:** [1-2 phrases simples expliquant le choix]
- **Prix vs moyenne:** [X% au-dessus/en-dessous]
- **Économie potentielle avec subventions:** [montant] $

**Points à négocier:**
- Point 1
- Point 2

---

### ⚠️ Alertes

- [Alerte importante si applicable, ex: prix anormalement bas]

## RÈGLES IMPORTANTES

1. **PAS de blocs de code** - N'utilise JAMAIS \`\`\`contacts\`\`\` ou \`\`\`json\`\`\`
2. **Langage simple** - Écris comme si tu parlais à quelqu'un qui ne connaît pas la construction
3. **Émojis** - Utilise les émojis pour rendre le texte plus lisible
4. **Concis** - Maximum 2-3 phrases par point
5. **Montants AVANT TAXES** - Affiche toujours le montant avant taxes en premier, puis avec taxes
6. **Taxes québécoises** - TPS 5% + TVQ 9.975% = 14.975% total
7. **Subventions** - Mentionne TOUJOURS les programmes de subventions applicables selon le type de travaux

## PROGRAMMES DE SUBVENTIONS QUÉBEC 2025

Selon le type de travaux, voici les subventions potentielles:

- **Rénoclimat**: Isolation, fenêtres écoénergétiques, thermopompes - jusqu'à 20 000 $
- **LogisVert**: Thermopompes, chauffe-eau thermodynamiques - jusqu'à 7 500 $
- **Chauffez vert**: Remplacement système chauffage fossile - jusqu'à 1 850 $
- **Novoclimat 2.0**: Construction neuve certifiée - environ 2 000 $
- **Subvention fédérale**: Via programmes provinciaux - variable

## EXTRACTION DES DONNÉES

Cherche dans CHAQUE document:
- Nom de l'entreprise (souvent en haut ou dans le logo)
- Téléphone (en-tête, pied de page, signature)
- Montant total AVANT TAXES (chercher "sous-total" ou montant avant TPS/TVQ)
- Ce qui est inclus et exclu
- Garanties et délais

Si une info est introuvable, écris "Non spécifié".`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradeName, tradeDescription, documents, budgetPrevu } = await req.json() as {
      tradeName: string;
      tradeDescription: string;
      documents: SoumissionDoc[];
      budgetPrevu?: number;
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

    console.log(`Analyzing ${documents.length} documents for ${tradeName} with Gemini 2.5 Pro`);

    // Build message parts with documents
    const messageParts: any[] = [];
    
    messageParts.push({
      type: "text",
      text: `ANALYSE DE SOUMISSIONS - ${tradeName.toUpperCase()}
      
Corps de métier: ${tradeName}
Description: ${tradeDescription}
Nombre de documents: ${documents.length}
${budgetPrevu ? `Budget prévu par le client: ${budgetPrevu.toLocaleString('fr-CA')} $` : ''}

Analyse les ${documents.length} soumission(s) ci-dessous avec PRÉCISION.
Extrait les contacts, compare les prix, identifie les anomalies.

Documents à analyser:`
    });

    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`Processing document ${i + 1}: ${doc.file_name}`);
      
      messageParts.push({
        type: "text",
        text: `\n\n--- DOCUMENT ${i + 1}: ${doc.file_name} ---`
      });
      
      const fileData = await fetchFileAsBase64(doc.file_url);
      
      if (fileData) {
        const mimeType = getMimeType(doc.file_name);
        
        if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
          messageParts.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${fileData.base64}`
            }
          });
          console.log(`Added ${mimeType} document to analysis`);
        } else {
          messageParts.push({
            type: "text",
            text: `[Document ${doc.file_name} - Format non supporté. Convertir en PDF ou image.]`
          });
        }
      } else {
        messageParts.push({
          type: "text",
          text: `[Impossible de charger le document ${doc.file_name}]`
        });
      }
    }

    // Add final instructions
    messageParts.push({
      type: "text",
      text: `

---

Maintenant, analyse TOUS ces documents et fournis:

1. Le bloc \`\`\`contacts\`\`\` avec les coordonnées extraites
2. Le bloc \`\`\`options\`\`\` si des options/forfaits sont proposés
3. Le bloc \`\`\`comparaison_json\`\`\` avec l'analyse détaillée
4. Le tableau comparatif visuel
5. Ta recommandation finale avec justification

${budgetPrevu ? `
IMPORTANT: Compare chaque soumission au budget prévu de ${budgetPrevu.toLocaleString('fr-CA')} $.
Calcule l'écart en % et signale si le budget est dépassé.
` : ''}`
    });

    console.log("Sending request to Gemini 2.5 Pro with", messageParts.length, "parts");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: messageParts }
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
        JSON.stringify({ error: "Erreur lors de l'analyse: " + errorText }),
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
