import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SoumissionDoc {
  file_name: string;
  file_url: string;
}

// Convertir un fichier en base64 pour l'envoyer à Gemini Vision
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
    
    // Convertir en base64
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

// Déterminer le type MIME basé sur l'extension
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

    console.log(`Analyzing ${documents.length} documents for ${tradeName}`);

    // Préparer les parties du message avec les documents en base64
    const messageParts: any[] = [];
    
    // Ajouter le texte d'introduction
    messageParts.push({
      type: "text",
      text: `Analyse les soumissions suivantes pour le corps de métier "${tradeName}" (${tradeDescription}).

Je vais te montrer ${documents.length} document(s) de soumission. Pour chaque document:
1. Identifie le nom du fournisseur/entreprise
2. **IMPORTANT: Extrait le numéro de téléphone de contact** (cherche dans l'en-tête, le pied de page, la signature, ou les coordonnées)
3. Extrait le montant total de la soumission
4. Liste les travaux inclus
5. Note les exclusions et conditions
6. Identifie les garanties offertes
7. Note les délais mentionnés

Ensuite, fournis:
- Un tableau comparatif clair avec les coordonnées
- Une analyse du rapport qualité-prix
- Ta recommandation avec justification
- Des points de négociation suggérés

Voici les documents:`
    });

    // Télécharger et ajouter chaque document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`Processing document ${i + 1}: ${doc.file_name}`);
      
      // Ajouter le nom du document
      messageParts.push({
        type: "text",
        text: `\n\n--- Document ${i + 1}: ${doc.file_name} ---`
      });
      
      const fileData = await fetchFileAsBase64(doc.file_url);
      
      if (fileData) {
        // Gemini supporte les PDFs et images directement
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
            text: `[Document ${doc.file_name} - Format non supporté pour l'analyse visuelle. Veuillez convertir en PDF ou image.]`
          });
        }
      } else {
        messageParts.push({
          type: "text",
          text: `[Impossible de charger le document ${doc.file_name}]`
        });
      }
    }

    // Ajouter l'instruction finale avec section contacts et options
    messageParts.push({
      type: "text",
      text: `

---

Maintenant, analyse tous ces documents et fournis:

## 📞 Coordonnées des Fournisseurs
**IMPORTANT: Pour chaque soumission, extrait les informations de contact trouvées dans le document.**
Utilise ce format exact pour chaque fournisseur (une ligne par fournisseur):
\`\`\`contacts
NOM_DOCUMENT|NOM_ENTREPRISE|TELEPHONE|MONTANT_PRINCIPAL
\`\`\`

Exemple:
\`\`\`contacts
soumission_abc.pdf|Construction ABC Inc.|514-555-1234|15000
devis_xyz.pdf|Entreprise XYZ|450-123-4567|18500
\`\`\`

## 📦 Options des Soumissions
**Si une soumission contient plusieurs options ou forfaits (ex: Option A, Option B, Forfait Bronze/Argent/Or, avec/sans X), liste-les ici.**
Utilise ce format exact (une ligne par option):
\`\`\`options
NOM_DOCUMENT|NOM_OPTION|MONTANT|DESCRIPTION_COURTE
\`\`\`

Exemple:
\`\`\`options
devis_climatisation.pdf|Option Standard|12500|Thermopompe murale simple
devis_climatisation.pdf|Option Premium|18500|Thermopompe centrale avec humidificateur
devis_climatisation.pdf|Option Deluxe|24000|Système complet avec échangeur d'air
\`\`\`

## 📋 Résumé des Soumissions
Pour chaque soumission, indique:
- Fournisseur
- Téléphone de contact
- Montant total (ou montants par option)
- Principaux travaux inclus
- Exclusions importantes

## 📊 Tableau Comparatif
| Critère | Document 1 | Document 2 | ... |
|---------|------------|------------|-----|
| Entreprise | | | |
| Téléphone | | | |
| Montant | | | |
| Options disponibles | | | |
| Délai | | | |
| Garantie | | | |

## 💰 Analyse Qualité-Prix
Évalue le rapport qualité-prix de chaque soumission et de chaque option.

## ✅ Recommandation
Quelle soumission et quelle option recommandes-tu et pourquoi?

## 🤝 Points de Négociation
Suggestions pour négocier de meilleures conditions.`
    });

    const systemPrompt = `Tu es un expert en construction résidentielle au Québec. Tu analyses des soumissions de sous-traitants pour aider les auto-constructeurs à choisir le meilleur fournisseur.

IMPORTANT:
- Lis attentivement CHAQUE document fourni
- **EXTRAIT OBLIGATOIREMENT le numéro de téléphone** de chaque fournisseur (cherche dans l'en-tête, le pied de page, la signature, les coordonnées, le logo, partout dans le document)
- **DÉTECTE LES OPTIONS**: Si une soumission propose plusieurs options, forfaits ou configurations (ex: "Option 1", "Forfait A", "Avec/Sans climatisation"), liste-les dans le bloc \`\`\`options\`\`\`
- Extrait les montants exacts en dollars pour chaque option
- Compare objectivement les offres
- Sois précis dans tes recommandations
- Réponds en français
- Inclus TOUJOURS les sections \`\`\`contacts\`\`\` et \`\`\`options\`\`\` (même vide si pas d'options)`;

    console.log("Sending request to AI with", messageParts.length, "parts");

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
