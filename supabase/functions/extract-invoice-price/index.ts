import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function validateAuth(authHeader: string | null): Promise<{ userId: string } | { error: string; status: number }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: "Authentification requise.", status: 401 };
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { error: "Session invalide.", status: 401 };
    return { userId: user.id };
  } catch {
    return { error: "Erreur d'authentification.", status: 500 };
  }
}

async function fetchFileAsBase64(url: string): Promise<{ base64: string; mediaType: string; isPdf: boolean } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    // Limit to 10MB
    if (arrayBuffer.byteLength > 10_000_000) return null;
    const base64 = encodeBase64(arrayBuffer);
    const contentType = resp.headers.get('content-type') || '';
    const isPdf = contentType.includes('pdf') || url.toLowerCase().includes('.pdf');
    let mediaType = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('webp')) mediaType = 'image/webp';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (isPdf) mediaType = 'application/pdf';
    return { base64, mediaType, isPdf };
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `Tu es un expert en lecture de factures au Québec. 
Ton rôle est d'extraire les montants financiers et les informations clés d'une facture ou d'un reçu.

RÈGLES IMPORTANTES:
- Cherche TOUJOURS le montant AVANT taxes (sous-total, subtotal, montant HT)
- Cherche la TPS (5%, Goods and Services Tax, GST)
- Cherche la TVQ (9.975%, Quebec Sales Tax, QST, PST)
- Si tu vois seulement un TOTAL, essaie de calculer le montant avant taxes
- Les montants peuvent être en format français (1 234,56) ou anglais (1,234.56)
- Pour le fournisseur (supplier): cherche le nom de l'entreprise vendeur (en-tête, logo, nom sur le document). Ne pas confondre avec le client.
- Pour la date (purchase_date): cherche la date de facturation/d'achat. Format retourné: YYYY-MM-DD si possible.
- Réponds UNIQUEMENT avec un JSON valide, pas de texte autour

Format de réponse obligatoire (JSON uniquement):
{
  "amountHT": 0.00,
  "tps": 0.00,
  "tvq": 0.00,
  "totalTTC": 0.00,
  "confidence": "high|medium|low",
  "supplier": "Nom du fournisseur/vendeur",
  "purchase_date": "YYYY-MM-DD ou null si non trouvée",
  "notes": "description courte des items principaux achetés",
  "currency": "CAD"
}

Si tu ne peux pas extraire les montants, retourne:
{
  "amountHT": null,
  "tps": null,
  "tvq": null,
  "totalTTC": null,
  "confidence": "none",
  "supplier": null,
  "purchase_date": null,
  "notes": "Impossible de lire les montants",
  "currency": "CAD"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const authResult = await validateAuth(authHeader);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { fileUrl, fileName } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "fileUrl est requis" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the file
    const fileData = await fetchFileAsBase64(fileUrl);
    if (!fileData) {
      return new Response(
        JSON.stringify({ error: "Impossible de charger le fichier" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = `Analyse cette facture${fileName ? ` (${fileName})` : ''} et extrait les montants. Retourne UNIQUEMENT le JSON demandé.`;

    // Build message content
    const messageContent: any[] = [];

    if (fileData.isPdf) {
      // For PDFs, send as document
      messageContent.push({
        type: "image_url",
        image_url: {
          url: `data:application/pdf;base64,${fileData.base64}`,
        },
      });
    } else {
      // For images
      messageContent.push({
        type: "image_url",
        image_url: {
          url: `data:${fileData.mediaType};base64,${fileData.base64}`,
        },
      });
    }

    messageContent.push({
      type: "text",
      text: userPrompt,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: messageContent },
        ],
        stream: false,
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques secondes." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants pour l'analyse IA." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const rawContent = aiData?.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let extracted: any = null;
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent);
    }

    if (!extracted) {
      return new Response(
        JSON.stringify({ 
          amountHT: null, tps: null, tvq: null, totalTTC: null, 
          confidence: "none", notes: "Impossible d'analyser la facture", currency: "CAD"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(extracted),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("extract-invoice-price error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
