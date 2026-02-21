import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Max-Age': '86400',
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

const SYSTEM_PROMPT = `Tu es un expert en lecture de factures et reçus au Québec. Tu dois extraire avec PRÉCISION les montants, le fournisseur et les matériaux.

## EXTRACTION DU FOURNISSEUR (supplier)

**FOURNISSEUR = l'entreprise VENDEUSE** (pas le client!). Cherche:
- Logo ou nom d'entreprise en HAUT de la facture (en-tête)
- Section "De:", "From:", "Vendeur:", "Fournisseur:"
- Pied de page avec coordonnées
- À côté des numéros TPS/TVQ ou RBQ

**À IGNORER (c'est le CLIENT):**
- Après "À:", "Bill to:", "Facturer à:", "Client:", "Destinataire:"
- Adresse de livraison ou de chantier

**Extrais le nom EXACT** de l'entreprise fournisseur (ex: "Canac", "Réno-Dépôt", "Rona", "Home Depot").

## EXTRACTION DES MONTANTS

**Montant AVANT taxes (amountHT):** Cherche ces libellés:
- "Sous-total", "Subtotal", "Total avant taxes"
- "Montant HT", "Amount before taxes"
- "Merchandise total", "Total marchandises"
- Si seul le TOTAL TTC est visible: calcule (total ÷ 1.14975) pour obtenir le HT (TPS 5% + TVQ 9.975%)

**Montants en dollars:** Accepte les deux formats:
- Français: 1 234,56 ou 1234.56
- Anglais: 1,234.56

**TPS (5%):** Cherche "TPS", "GST", "TVH"
**TVQ (9.975%):** Cherche "TVQ", "QST"

## EXTRACTION DE LA DATE

Cherche: "Date", "Date de facturation", "Invoice date", "Order date"
Format de sortie: YYYY-MM-DD (ex: 2025-02-19)

## EXTRACTION DES MATÉRIAUX / ITEMS (notes)

Dans "notes", liste les principaux articles achetés:
- Types de matériaux (ciment, bois, clous, peinture, etc.)
- Marques ou modèles si visibles
- Quantités si pertinentes (ex: "10 sacs de ciment", "2x4x8 pin")
- Sois concis mais informatif

## FORMAT DE RÉPONSE

Réponds UNIQUEMENT avec un JSON valide, SANS texte avant ou après:

{
  "amountHT": 0.00,
  "tps": 0.00,
  "tvq": 0.00,
  "totalTTC": 0.00,
  "confidence": "high|medium|low",
  "supplier": "Nom exact du fournisseur",
  "purchase_date": "YYYY-MM-DD",
  "notes": "Description des matériaux/items achetés",
  "currency": "CAD"
}

**Confidence:**
- "high" = toutes les données clés trouvées et claires
- "medium" = plupart trouvées, une incertitude
- "low" = données partielles

**Si vraiment aucune donnée lisible:** retourne confidence "none" et null pour les champs non trouvés.
**IMPORTANT:** Si le document est lisible et contient des prix, un nom de magasin ou une date, EXTRAIS-LES. Ne retourne JAMAIS "none" si tu vois des chiffres ou un total sur la facture. Même un montant approximatif est acceptable.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY ou LOVABLE_API_KEY requis. Configurez une clé dans Supabase > Project Settings > Edge Functions > Secrets." }),
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

    const userPrompt = `DOCUMENT À ANALYSER: ${fileName || "facture"}

Lis attentivement cette facture ou reçu. Extrait le prix (montant avant taxes), le nom du fournisseur, la date et les matériaux.

Retourne UNIQUEMENT le JSON (aucun texte avant ou après).`;

    let rawContent = "";

    // Même format que analyze-soumissions (qui fonctionne) : inlineData + mimeType en camelCase
    const geminiModel = Deno.env.get("GEMINI_MODEL_INVOICE") || "gemini-1.5-flash";

    if (GEMINI_API_KEY) {
      const geminiParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
        { text: userPrompt },
        { inlineData: { mimeType: fileData.mediaType, data: fileData.base64 } },
      ];
      const geminiBody = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: geminiParts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      };
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

      let geminiRes: Response | null = null;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
        geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        });
        if (geminiRes.ok) break;
        const errText = await geminiRes.text();
        const isQuota = geminiRes.status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(errText || "");
        if (!isQuota || attempt === maxRetries) {
          console.error("Gemini API error:", geminiRes.status, errText?.slice(0, 300));
          return new Response(
            JSON.stringify({ error: isQuota ? "Limite de requêtes atteinte. Réessayez dans 1 minute." : "Erreur du service IA." }),
            { status: geminiRes.status === 429 ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      const geminiData = await geminiRes!.json();
      rawContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // Fallback: Lovable AI Gateway
      const messageContent: any[] = [];
      if (fileData.isPdf) {
        messageContent.push({ type: "image_url", image_url: { url: `data:application/pdf;base64,${fileData.base64}` } });
      } else {
        messageContent.push({ type: "image_url", image_url: { url: `data:${fileData.mediaType};base64,${fileData.base64}` } });
      }
      messageContent.push({ type: "text", text: userPrompt });

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
      rawContent = aiData?.choices?.[0]?.message?.content || "";
    }

    // Parse JSON from response
    let extracted: any = null;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent?.slice(0, 500));
    }

    // Si amountHT manquant mais totalTTC présent, calculer le HT
    if (extracted && extracted.amountHT == null && extracted.totalTTC != null) {
      const ttc = Number(extracted.totalTTC);
      if (!isNaN(ttc) && ttc > 0) {
        extracted.amountHT = Math.round((ttc / 1.14975) * 100) / 100;
      }
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
