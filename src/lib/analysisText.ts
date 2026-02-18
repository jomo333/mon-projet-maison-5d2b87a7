/**
 * Retire du texte d'analyse les blocs JSON bruts (contacts, comparaison_json, etc.)
 * pour n'afficher que le résumé formaté. À utiliser uniquement pour l'affichage ;
 * le texte complet reste utilisé pour l'extraction des contacts et la sauvegarde.
 */
export function stripJsonBlocksFromAnalysisText(htmlOrMarkdown: string): string {
  if (!htmlOrMarkdown?.trim()) return htmlOrMarkdown;

  let out = htmlOrMarkdown;

  // 1) Blocs markdown ```contacts ... ``` et ```comparaison_json ... ```
  out = out.replace(/```contacts\s*\n[\s\S]*?```/gi, "");
  out = out.replace(/```comparaison_json\s*\n[\s\S]*?```/gi, "");
  // Autres blocs code avec nom explicite contenant du JSON
  out = out.replace(/```(?:json|contacts|comparaison_json)\s*\n[\s\S]*?```/gi, "");

  // 2) JSON "nus" : blocs qui commencent par [ ou { (tableau contacts, objet comparaison)
  const stripStandaloneJsonBlocks = (text: string): string => {
    const lines = text.split("\n");
    const result: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      const isArrayStart = trimmed.startsWith("[");
      const isObjectStart = trimmed.startsWith("{") && (
        trimmed.includes("nom_entreprise") ||
        trimmed.includes("description_projet") ||
        trimmed.includes("entreprises") ||
        /^\s*\{\s*"[^"]+"\s*:/.test(trimmed)
      );
      if (isArrayStart || isObjectStart) {
        const open = isArrayStart ? "[" : "{";
        const close = isArrayStart ? "]" : "}";
        let depth = 0;
        let found = false;
        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          for (const ch of l) {
            if (ch === open) depth++;
            else if (ch === close) depth--;
          }
          if (depth === 0) {
            i = j + 1;
            found = true;
            break;
          }
        }
        if (!found) i = lines.length;
        continue;
      }
      result.push(line);
      i++;
    }
    return result.join("\n");
  };
  out = stripStandaloneJsonBlocks(out);

  // 3) Nettoyer lignes vides multiples laissées par les suppressions
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}
