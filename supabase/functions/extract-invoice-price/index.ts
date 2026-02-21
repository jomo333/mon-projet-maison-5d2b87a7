import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

// Même logique que analyze-soumissions (qui fonctionne bien)
function getMimeType(fileName: string): string {
  const ext = (fileName || "").toLowerCase().split(".").pop() || "";
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

async function fetchFileAsBase64(fileUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error("fetchFileAsBase64: HTTP", response.status);
      return null;
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 10_000_000) return null;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    return { base64, mimeType: contentType };
  } catch (e) {
    console.error("fetchFileAsBase64 error:", e instanceof Error ? e.message : e);
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

  // Vérifier le quota d'analyses IA avant d'appeler Gemini
  try {
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: limitCheck, error: limitError } = await serviceSupabase.rpc("check_ai_analysis_limit", {
      p_user_id: authResult.userId,
    });
    if (!limitError && limitCheck && typeof limitCheck === "object" && limitCheck.allowed === false) {
      return new Response(
        JSON.stringify({
          error: `Limite d'analyses IA atteinte (${limitCheck.current}/${limitCheck.limit}). Passez à un forfait supérieur ou achetez des analyses supplémentaires.`,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (limitErr) {
    console.error("Limit check failed:", limitErr);
  }

  try {
    const { fileUrl, fileName } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "fileUrl est requis" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Plusieurs clés API pour contourner les limites (250k tokens/min, 20 analyses/jour par clé)
    const keysRaw = [
      Deno.env.get("GEMINI_API_KEY"),
      Deno.env.get("GEMINI_API_KEY_2"),
      Deno.env.get("GEMINI_API_KEY_3"),
      Deno.env.get("GEMINI_API_KEY_4"),
      Deno.env.get("GEMINI_API_KEY_5"),
      Deno.env.get("GEMINI_API_KEY_6"),
      Deno.env.get("GEMINI_API_KEY_7"),
      Deno.env.get("GEMINI_API_KEY_8"),
      Deno.env.get("GEMINI_API_KEY_9"),
      Deno.env.get("GEMINI_API_KEY_10"),
      ...(Deno.env.get("GEMINI_API_KEYS") || "").split(",").map((k) => k.trim()).filter(Boolean),
    ];
    const GEMINI_API_KEYS = [...new Set(keysRaw.filter(Boolean))] as string[];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (GEMINI_API_KEYS.length === 0 && !LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY ou LOVABLE_API_KEY requis. Configurez une clé dans Supabase > Project Settings > Edge Functions > Secrets." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the file
    const fileData = await fetchFileAsBase64(fileUrl);
    if (!fileData) {
      console.error("fetchFileAsBase64 failed for url (redacted)");
      return new Response(
        JSON.stringify({ error: "Impossible de charger le fichier. Vérifiez que l'URL est accessible." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mimeType = getMimeType(fileName || "facture.pdf");
    const isSupported = mimeType === "application/pdf" || mimeType.startsWith("image/");
    if (!isSupported) {
      return new Response(
        JSON.stringify({ error: "Format non supporté. Utilisez PDF, JPG, PNG ou WebP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `ANALYSE DE FACTURE - Document: ${fileName || "facture"}

Ce document est une facture ou un reçu (même structure qu'une soumission). Extrait:
1. Fournisseur (nom entreprise en-tête/logo, PAS le client)
2. Montant AVANT taxes (sous-total, subtotal, ou total ÷ 1.14975)
3. TPS et TVQ si visibles
4. Date (YYYY-MM-DD)
5. Matériaux/items achetés

Retourne UNIQUEMENT le JSON, sans texte autour.`;

    let rawContent = "";

    const geminiModel = Deno.env.get("GEMINI_MODEL_INVOICE") || Deno.env.get("GEMINI_MODEL_SOUMISSIONS") || "gemini-1.5-flash";

    if (GEMINI_API_KEYS.length > 0) {
      // Même structure que analyze-soumissions : text + image_url data URL, puis conversion en geminiParts
      const messageParts: any[] = [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileData.base64}` } },
      ];
      const geminiParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
      for (const part of messageParts) {
        if (part.type === "text" && part.text) {
          geminiParts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url?.startsWith("data:")) {
          const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) geminiParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
      const geminiBody = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: geminiParts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      };
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

      let geminiRes: Response | null = null;
      let lastErrText = "";
      let lastStatus = 0;

      for (let keyIndex = 0; keyIndex < GEMINI_API_KEYS.length; keyIndex++) {
        const apiKey = GEMINI_API_KEYS[keyIndex];
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, attempt * 2000));
          }
          geminiRes = await fetch(`${geminiUrl}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody),
          });
          if (geminiRes.ok) break;
          lastErrText = await geminiRes.text();
          lastStatus = geminiRes.status;
          const isQuota = geminiRes.status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(lastErrText || "");
          if (isQuota && keyIndex < GEMINI_API_KEYS.length - 1) {
            console.log(`Gemini key ${keyIndex + 1} quota atteinte, essai avec clé suivante...`);
            break;
          }
          if (!isQuota || attempt === maxRetries) {
            let errMsg = "Erreur du service IA.";
            try {
              const errJson = JSON.parse(lastErrText || "{}");
              const detail = errJson?.error?.message || errJson?.error?.details?.[0]?.message || errJson?.message;
              if (detail) errMsg = `Gemini: ${String(detail).slice(0, 200)}`;
            } catch (_) {
              if (lastErrText && lastErrText.length < 300) errMsg = lastErrText;
            }
            console.error("Gemini API error:", lastStatus, lastErrText?.slice(0, 500));
            return new Response(
              JSON.stringify({ error: isQuota ? "Limite de requêtes atteinte. Réessayez dans 1 minute." : errMsg }),
              { status: lastStatus === 429 ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        if (geminiRes?.ok) break;
      }
      const geminiData = await geminiRes!.json().catch(() => ({}));
      rawContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!rawContent && geminiData?.candidates?.[0]?.finishReason) {
        const reason = geminiData.candidates[0].finishReason;
        if (reason === "SAFETY" || reason === "RECITATION") {
          return new Response(
            JSON.stringify({ error: "Le contenu a été bloqué par les filtres de sécurité." }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      // Fallback: Lovable AI Gateway
      const messageContent: any[] = [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileData.base64}` } },
      ];

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
      // Consomme 1 analyse même si parsing échoue (appel Gemini effectué)
      try {
        const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await svc.rpc("consume_ai_analysis", { p_user_id: authResult.userId });
      } catch (e) {
        console.error("consume_ai_analysis error:", e);
      }
      return new Response(
        JSON.stringify({ 
          amountHT: null, tps: null, tvq: null, totalTTC: null, 
          confidence: "none", notes: "Impossible d'analyser la facture", currency: "CAD"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Consomme 1 analyse IA (extraction réussie)
    try {
      const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await svc.rpc("consume_ai_analysis", { p_user_id: authResult.userId });
    } catch (e) {
      console.error("consume_ai_analysis error:", e);
    }

    return new Response(
      JSON.stringify(extracted),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("extract-invoice-price error:", msg, error);
    return new Response(
      JSON.stringify({ error: `Erreur: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
