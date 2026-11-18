/**
 * Utility to replace or insert text within markdown documents based on user DOM selection.
 * Handles differences between rendered DOM text (stripped of formatting) and raw markdown tokens.
 */

export function cleanFormattingForSearch(str: string): string {
  return str
    .replace(/\*\*/g, "")
    .replace(/[*_~`#]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Replaces selectedText or inserts replacement directly below the selected section in markdown.
 */
export function replaceInMarkdown(
  markdown: string,
  selectedText: string,
  replacement: string,
  mode: "replace" | "insertBelow"
): string {
  if (!markdown || !selectedText || !replacement) return markdown || "";

  const selTrim = selectedText.trim();
  const repTrim = replacement.trim();

  // 1. Direct exact match (e.g. if plain text or exactly matches)
  if (markdown.includes(selTrim)) {
    if (mode === "replace") {
      return markdown.replace(selTrim, repTrim);
    } else {
      const idx = markdown.indexOf(selTrim);
      const after = idx + selTrim.length;
      return markdown.slice(0, after) + "\n\n" + repTrim + "\n\n" + markdown.slice(after);
    }
  }

  // 1.1 Case-insensitive direct match
  const lowerMd = markdown.toLowerCase();
  const lowerSel = selTrim.toLowerCase();
  const matchIdx = lowerMd.indexOf(lowerSel);
  if (matchIdx !== -1) {
    if (mode === "replace") {
      return markdown.slice(0, matchIdx) + repTrim + markdown.slice(matchIdx + lowerSel.length);
    } else {
      const after = matchIdx + lowerSel.length;
      return markdown.slice(0, after) + "\n\n" + repTrim + "\n\n" + markdown.slice(after);
    }
  }

  // 2. Line/paragraph-based fuzzy match
  const lines = markdown.split("\n");
  const cleanSel = cleanFormattingForSearch(selTrim);

  // Single-line match
  let matchedStart = -1;
  let matchedEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const cleanL = cleanFormattingForSearch(lines[i]);
    if (!cleanL) continue;

    if (
      cleanL === cleanSel ||
      cleanL.includes(cleanSel) ||
      (cleanL.length >= 30 && cleanSel.includes(cleanL) && cleanL.length >= cleanSel.length * 0.65)
    ) {
      matchedStart = i;
      matchedEnd = i;
      break;
    }
  }

  // Multi-line range match
  if (matchedStart === -1) {
    for (let i = 0; i < lines.length; i++) {
      let combined = "";
      for (let j = i; j < Math.min(i + 15, lines.length); j++) {
        const c = cleanFormattingForSearch(lines[j]);
        if (c) combined += (combined ? " " : "") + c;
        if (
          combined.includes(cleanSel) ||
          (combined.length >= 40 && cleanSel.includes(combined) && combined.length >= cleanSel.length * 0.75)
        ) {
          matchedStart = i;
          matchedEnd = j;
          break;
        }
      }
      if (matchedStart !== -1) break;
    }
  }

  if (matchedStart !== -1 && matchedEnd !== -1) {
    if (mode === "replace") {
      // Preserve list prefix (e.g. "1. " or "* ") if the replacement doesn't have it
      const origLine = lines[matchedStart];
      const listPrefixMatch = origLine.match(/^(\s*(?:\d+\.|\*|-)\s+)/);
      let finalRep = repTrim;
      if (listPrefixMatch && !/^\s*(?:\d+\.|\*|-)\s+/.test(finalRep)) {
        finalRep = listPrefixMatch[1] + finalRep;
      }
      lines.splice(matchedStart, matchedEnd - matchedStart + 1, finalRep);
      return lines.join("\n");
    } else {
      // Insert below
      lines.splice(matchedEnd + 1, 0, "", repTrim, "");
      return lines.join("\n");
    }
  }

  // 3. Fallback: match by leading sentence / phrase (first 35 characters)
  if (cleanSel.length > 25) {
    const anchor = cleanSel.slice(0, 35).toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (cleanFormattingForSearch(lines[i]).toLowerCase().includes(anchor)) {
        if (mode === "replace") {
          lines[i] = repTrim;
          return lines.join("\n");
        } else {
          lines.splice(i + 1, 0, "", repTrim, "");
          return lines.join("\n");
        }
      }
    }
  }

  // 4. Ultimate fallback: Append
  return markdown + "\n\n" + repTrim;
}
