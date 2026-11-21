/**
 * Rich Text and Markdown bidirectional conversion utilities
 * Converts Markdown <-> HTML for visual WYSIWYG editing, keeping 100% fidelity.
 */

// Helper to escape regex special chars
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeFirstAlpha(str: string): string {
  if (!str) return "";
  return str.replace(/^(\s*(?:\*\*)?\s*)([a-záàâãéêíóôõúç])/i, (_, prefix, ch) => prefix + ch.toUpperCase());
}

function stripLeadingArticles(str: string): string {
  return str
    .trim()
    .replace(/^(?:pelos|pelas|pelo|pela|dos|das|do|da|nos|nas|no|na|aos|às|ao|à|os|as|o|a|uns|umas|um|uma|seus|suas|seu|sua)\s+/i, "")
    .trim();
}

function splitSentencesRespectingParens(paragraph: string): string[] {
  const sentences: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    if (ch === "(" || ch === "[") parenDepth++;
    else if ((ch === ")" || ch === "]") && parenDepth > 0) parenDepth--;

    current += ch;

    if (parenDepth === 0 && ch === ".") {
      const nextChar = paragraph[i + 1];
      const afterSpace = paragraph.slice(i + 1).match(/^\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ*])/);
      if (!nextChar || afterSpace) {
        const beforeDot = current.slice(0, -1).trim();
        const lastWord = (beforeDot.split(/\s+/).pop() || "").replace(/[^a-zA-ZÀ-ÿ]/g, "").toLowerCase();
        const abbrevs = new Set(["ex", "dr", "dra", "fig", "aprox", "etc", "vs", "ref", "pag", "pág", "cap", "vol", "sr", "sra", "prof", "obs"]);
        if (!abbrevs.has(lastWord)) {
          sentences.push(current.trim());
          current = "";
          while (i + 1 < paragraph.length && /\s/.test(paragraph[i + 1])) {
            i++;
          }
        }
      }
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences;
}

function extractTrailingClauseAfterEnumeration(text: string): { coreList: string; trailing: string } {
  let parenDepth = 0;
  let inBold = false;
  let topLevelEIndex = -1;

  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 2) === "**") {
      inBold = !inBold;
      i++;
      continue;
    }
    if (inBold) continue;
    const ch = text[i];
    if (ch === "(" || ch === "[") parenDepth++;
    else if ((ch === ")" || ch === "]") && parenDepth > 0) parenDepth--;

    if (parenDepth === 0 && /^(\s+e\s+|\s+ou\s+)/i.test(text.slice(i))) {
      topLevelEIndex = i;
    }
  }

  if (topLevelEIndex !== -1) {
    // Look for a top-level comma AFTER topLevelEIndex
    parenDepth = 0;
    inBold = false;
    for (let j = topLevelEIndex + 3; j < text.length; j++) {
      if (text.slice(j, j + 2) === "**") {
        inBold = !inBold;
        j++;
        continue;
      }
      if (inBold) continue;
      const ch = text[j];
      if (ch === "(" || ch === "[") parenDepth++;
      else if ((ch === ")" || ch === "]") && parenDepth > 0) parenDepth--;

      if (parenDepth === 0 && ch === ",") {
        const afterComma = text.slice(j + 1).trim();
        if (afterComma.length > 5) {
          return {
            coreList: text.slice(0, j).trim(),
            trailing: afterComma.replace(/\.$/, "").trim(),
          };
        }
      }
    }
  }

  return { coreList: text.trim(), trailing: "" };
}

function splitTopLevelEnumeration(listStr: string): string[] {
  const commaParts: string[] = [];
  let current = "";
  let parenDepth = 0;
  let inBold = false;

  for (let i = 0; i < listStr.length; i++) {
    if (listStr.slice(i, i + 2) === "**") {
      inBold = !inBold;
      current += "**";
      i++;
      continue;
    }
    const ch = listStr[i];
    if (!inBold) {
      if (ch === "(" || ch === "[") parenDepth++;
      else if ((ch === ")" || ch === "]") && parenDepth > 0) parenDepth--;
    }

    if (!inBold && parenDepth === 0 && ch === ",") {
      if (current.trim()) commaParts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) commaParts.push(current.trim());

  const finalItems: string[] = [];
  for (let idx = 0; idx < commaParts.length; idx++) {
    const part = commaParts[idx];
    // Split on top-level " e " if it's the last comma part or if there are only 1-2 commaParts with bold items
    if (idx === commaParts.length - 1 || commaParts.length === 1) {
      let subCurrent = "";
      let pDepth = 0;
      let bState = false;
      let splitHappened = false;

      for (let k = 0; k < part.length; k++) {
        if (part.slice(k, k + 2) === "**") {
          bState = !bState;
          subCurrent += "**";
          k++;
          continue;
        }
        const c = part[k];
        if (!bState) {
          if (c === "(" || c === "[") pDepth++;
          else if ((c === ")" || c === "]") && pDepth > 0) pDepth--;
        }

        const eMatch = !bState && pDepth === 0 ? part.slice(k).match(/^(\s+e\s+)/i) : null;
        if (eMatch) {
          const left = subCurrent.trim();
          const right = part.slice(k + eMatch[1].length).trim();
          const canSplitE =
            commaParts.length >= 2 ||
            (left.includes("**") && right.includes("**"));
          if (canSplitE && left && right) {
            finalItems.push(left);
            subCurrent = "";
            k += eMatch[1].length - 1;
            splitHappened = true;
            continue;
          }
        }
        subCurrent += c;
      }
      if (subCurrent.trim()) finalItems.push(subCurrent.trim());
      if (splitHappened) continue;
    } else {
      finalItems.push(part);
    }
  }

  return finalItems.map((it) => it.replace(/\.$/, "").trim()).filter(Boolean);
}

function formatLeadSubjectAndPredicate(leadText: string): string {
  const cleaned = leadText.replace(/,\s*$/, "").trim();
  // Check if starts with [Artigo] **Estrutura**
  const boldStart = cleaned.match(/^(?:(?:o|a|os|as|um|uma|seus|suas|seu|sua)\s+)?(\*\*[^*]+\*\*(?:\s*\([^)]*\))?(?:\s+e\s+(?:o|a|os|as)?\s*\*\*[^*]+\*\*(?:\s*\([^)]*\))?)?)\s*(.*)$/i);
  if (boldStart) {
    const subject = capitalizeFirstAlpha(boldStart[1].trim());
    let rest = boldStart[2].trim();
    rest = rest.replace(/^(?:é\s+um[a]?\s+|é\s+o\s+|é\s+a\s+|é\s+|são\s+os\s+|são\s+as\s+|são\s+)/i, "");
    if (!rest) return subject;
    return `${subject}: ${rest}`;
  }

  // Unbolded subject (e.g. "A estrutura óssea do nariz" or "Suas cartilagens principais")
  const stripped = stripLeadingArticles(cleaned);
  return `**${capitalizeFirstAlpha(stripped)}**`;
}

function formatSubBulletItem(item: string): string {
  const stripped = stripLeadingArticles(item.replace(/\.$/, "").trim());
  if (stripped.startsWith("**")) {
    return capitalizeFirstAlpha(stripped);
  }
  // If unbolded item like "parte respiratória (revestida por...)" or "vestíbulo"
  const parenIdx = stripped.search(/\s*[\(\[']/);
  if (parenIdx > 0) {
    const head = capitalizeFirstAlpha(stripped.slice(0, parenIdx).trim());
    const tail = stripped.slice(parenIdx).trim();
    return `**${head}** ${tail}`;
  }
  return `**${capitalizeFirstAlpha(stripped)}**`;
}

function convertSentenceToStructuredMarkdownLines(sentence: string): string[] {
  const cleanSent = sentence.replace(/\.$/, "").trim();
  if (!cleanSent) return [];

  // Look for top-level list connector
  const connectorRegex = /\b(inclui(?:ndo)?|incluem|compreende(?:ndo)?|compreendem|contendo|contém|contêm|possui(?:ndo)?|possuem|apresenta(?:ndo)?|apresentam|(?:é\s+|são\s+)?formad[ao]s?\s+(?:por|pelo|pela|pelos|pelas)|(?:é\s+|são\s+)?compost[ao]s?\s+(?:por|pelo|pela|pelos|pelas)|(?:é\s+|são\s+)?constituíd[ao]s?\s+(?:por|pelo|pela|pelos|pelas)|(?:é\s+|são\s+)?dividid[ao]s?\s+em|divide-se\s+em|dividem-se\s+em|são\s+(?=(?:o|a|os|as)\s+\*\*)|com\s+(?=\*\*))/i;

  // Find match at parenDepth === 0
  let parenDepth = 0;
  let inBold = false;
  let matchIndex = -1;
  let matchConnector = "";

  for (let i = 0; i < cleanSent.length; i++) {
    if (cleanSent.slice(i, i + 2) === "**") {
      inBold = !inBold;
      i++;
      continue;
    }
    if (inBold) continue;
    const ch = cleanSent[i];
    if (ch === "(" || ch === "[") parenDepth++;
    else if ((ch === ")" || ch === "]") && parenDepth > 0) parenDepth--;

    if (parenDepth === 0 && (i === 0 || /[\s,]/.test(cleanSent[i - 1]))) {
      const m = cleanSent.slice(i).match(connectorRegex);
      if (m && m.index === 0) {
        matchIndex = i;
        matchConnector = m[1];
        break;
      }
    }
  }

  if (matchIndex > 0) {
    const beforeConnector = cleanSent.slice(0, matchIndex).trim();
    const afterConnector = cleanSent.slice(matchIndex + matchConnector.length).trim();
    const { coreList, trailing } = extractTrailingClauseAfterEnumeration(afterConnector);
    const items = splitTopLevelEnumeration(coreList);

    // Check if valid bolded enumeration (2+ items where every item starts with optional article + **)
    const allBoldItems =
      items.length >= 2 &&
      items.every((it) => /^(?:(?:pelos|pelas|pelo|pela|dos|das|do|da|nos|nas|no|na|os|as|o|a|um|uma|seus|suas)\s+)*\*\*[^*]+\*\*/i.test(it));

    // Or valid unbolded structural division/inclusion list (3+ concise noun items)
    const isDivisionOrInclusion = /dividid|divide-se|inclui|compreende|compost|formad|constituíd/i.test(matchConnector);
    const allConciseStructuralItems =
      isDivisionOrInclusion &&
      items.length >= 3 &&
      items.every((it) => {
        const coreWordPart = stripLeadingArticles(it.replace(/\([\s\S]*?\)/g, "").replace(/'[^']*'/g, "")).trim();
        const wordCount = coreWordPart.split(/\s+/).filter(Boolean).length;
        return wordCount >= 1 && wordCount <= 5 && !/\b(é|são|está|estão|foi|foram|atua|atuam)\b/i.test(coreWordPart);
      });

    if (allBoldItems || allConciseStructuralItems) {
      let headerLine = formatLeadSubjectAndPredicate(beforeConnector);
      const cleanConn = matchConnector
        .replace(/^(?:é|são)\s+/i, "")
        .replace(/\s+(?:pelo|pela|pelos|pelas)$/i, " por")
        .trim()
        .toLowerCase();

      if (trailing) {
        headerLine += ` (${trailing})`;
      } else if (/dividid|divide-se/i.test(cleanConn) && !headerLine.toLowerCase().includes("dividid")) {
        headerLine += headerLine.includes(":") ? `, ${cleanConn}` : `: ${cleanConn}`;
      }

      if (!headerLine.endsWith(":")) {
        headerLine = headerLine.replace(/[.,;]+$/, "") + ":";
      }

      const out: string[] = [`* ${headerLine}`];
      for (const item of items) {
        out.push(`  * ${formatSubBulletItem(item)}`);
      }
      return out;
    }
  }

  // Single concept / structure sentence (Pattern D)
  const boldSubjectMatch = cleanSent.match(
    /^(?:(?:o|a|os|as|um|uma|seus|suas|seu|sua)\s+)?(\*\*[^*]+\*\*(?:\s*\([^)]*\))?(?:\s+e\s+(?:o|a|os|as)?\s*\*\*[^*]+\*\*(?:\s*\([^)]*\))?)?)\s+(.*)$/i
  );
  if (boldSubjectMatch) {
    const subj = capitalizeFirstAlpha(boldSubjectMatch[1].trim());
    let pred = boldSubjectMatch[2].trim();
    pred = pred.replace(/^(?:é\s+um[a]?\s+|é\s+o\s+|é\s+a\s+|é\s+|são\s+os\s+|são\s+as\s+|são\s+)/i, "");
    return [`* ${subj}: ${pred}.`];
  }

  return [`* ${capitalizeFirstAlpha(cleanSent)}.`];
}

/**
 * Automatically organizes dense continuous prose paragraphs that enumerate multiple
 * anatomical/histological/pharmacological structures, types, or characteristics into
 * clean Markdown bullets (`* `) and indented sub-bullets (`  * `).
 * Only activates when the paragraph genuinely contains a structural enumeration list.
 */
export function formatDenseProseParagraphsIntoBullets(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const outLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Do not touch headings, lists, blockquotes, tables, images, HTML blocks, or short lines
    if (
      !trimmed ||
      trimmed.length < 220 ||
      /^(?:#{1,6}\s|[\*\-•]\s|\d+[\.\)]\s|>\s|\||!\[|<\/?(?:div|table|ul|ol|li|blockquote|figure|h[1-6]))/i.test(trimmed)
    ) {
      outLines.push(rawLine);
      continue;
    }

    const boldMatches = trimmed.match(/\*\*[^*]+\*\*/g) || [];
    if (boldMatches.length < 4) {
      outLines.push(rawLine);
      continue;
    }

    const sentences = splitSentencesRespectingParens(trimmed);
    if (sentences.length < 3) {
      outLines.push(rawLine);
      continue;
    }

    // Check if at least one sentence actually contains a multi-item enumeration (produces sub-bullets)
    const convertedPerSentence = sentences.map((s) => ({
      raw: s,
      structured: convertSentenceToStructuredMarkdownLines(s),
    }));
    const hasTrueEnumeration = convertedPerSentence.some((item) => item.structured.length > 1);
    if (!hasTrueEnumeration) {
      outLines.push(rawLine);
      continue;
    }

    let proseBuffer: string[] = [];
    const flushProseBuffer = () => {
      if (proseBuffer.length > 0) {
        outLines.push(proseBuffer.join(" "));
        outLines.push("");
        proseBuffer = [];
      }
    };

    for (const item of convertedPerSentence) {
      if (item.structured.length > 1) {
        flushProseBuffer();
        outLines.push(...item.structured);
      } else {
        proseBuffer.push(item.raw);
      }
    }
    flushProseBuffer();
  }

  return outLines.join("\n");
}

/**
 * Repairs broken headings from slide/PDF transcriptions (where wrapped sentences,
 * causal chains with arrows, definitions with ':', or 2-column slide table rows
 * were mistakenly emitted as ## or ### headings), deduplicates repeated slide titles,
 * removes excessive horizontal dividers, and places Clinical Cases followed by Questions
 * at the very end of the document.
 */
export function repairTranscriptionHeadingsAndOrder(markdown: string): string {
  if (!markdown) return "";

  const nonHeadingVerbRegex =
    /\b(inibe|inibem|reduz|reduzem|danifica|danificam|aumenta|aumentam|ativa|ativam|gera|geram|bloqueia|bloqueiam|impede|impedem|causa|causam|provoca|provocam|diminui|diminuem|produz|produzem|estimula|estimulam|promove|promovem|leva|levam|resulta|resultam|ocorre|ocorrem|altera|alteram|compromete|comprometem|induz|induzem|favorece|favorecem|acumula|acumulam|libera|liberam|acelera|aceleram|afeta|afetam|lesa|lesam|interfere|interferem|contém|contêm|possui|possuem|apresenta|apresentam|é|são|está|estão|foi|foram|pode|podem|deve|devem)\b/i;

  // 1. Pre-split inline slide arrow bullets (➤, ➢, ►) and strip raw DOIs
  const preCleaned = markdown
    .replace(/\b(?:https?:\/\/)?doi\.org\/\S+/gi, "")
    .replace(/:\s*[➤➢►▸]\s*/g, ":\n* ")
    .replace(/\s+[➤➢►▸]\s*/g, "\n* ");

  const rawLines = preCleaned.split("\n");
  const compactNonEmpty: string[] = [];
  let skipAdminBlock = false;

  const isBibOrAdminSectionStart = (t: string) =>
    /^(?:#{1,6}\s+)?(?:\*\*)?(?:leitura\s+pr[ée]via|refer[êe]ncias?(?:\s+bibliogr[áa]ficas?)?|bibliografia(?:\s+recomendada|\s+b[áa]sica)?|fontes?\s+consultadas?|sugest[ãa]o\s+de\s+leitura)(?:\*\*)?:?\s*$/i.test(t);

  const isSingleAdminLine = (t: string) => {
    const plain = t.replace(/^[#*\-\s•]+/, "").replace(/\*\*/g, "").trim();
    if (!plain) return false;
    // TBL / Individual / Grupo / Facilitador / Professor
    if (/^(?:TBL\b|team[\s\-]based\s+learning\b)/i.test(plain)) return true;
    if (/^(?:individual|grupo)\s+[A-Z0-9]\b(?:\s*[-–—:].*)?$/i.test(plain)) return true;
    if (/^(?:teste\s+(?:individual|em\s+grupo)|iRAT|tRAT|gRAT)\b/i.test(plain)) return true;
    if (/^(?:facilitador(?:a)?|professor(?:a)?|docente|coordenador(?:a)?|relator(?:a)?|tutor(?:a)?|orientador(?:a)?)\s*:/i.test(plain)) return true;
    // Bibliographic / URL / ISBN / Minha Biblioteca artifacts
    if (/\bISBN\b|\bintegrada\.minhabiblioteca\b|\bminhabiblioteca\.com\b|\bepubcfi\b|Bvnd\.vst|Dispon[íi]vel\s+em\s*:|Acesso\s+em\s*:/i.test(plain)) return true;
    if (/^https?\s*:\s*\/\//i.test(plain)) return true;
    if (/^[A-ZÀ-ÖØ-Þ]{3,},\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+.*(?:\d{4}|E-book|Editora|Grupo\s+A|Porto\s+Alegre|Rio\s+de\s+Janeiro|S[ãa]o\s+Paulo)/i.test(plain)) return true;
    if (/^p[áa]ginas?\s+\d+\s*[–\-]\s*\d+/i.test(plain)) return true;
    if (/^cap[íi]tulo\s+\d+\s*[–\-]\s*.+$/i.test(plain) && plain.length < 90) return true;
    return false;
  };

  for (const l of rawLines) {
    const t = l.trim();
    // Strip standalone horizontal dividers (---) that were placed after every topic
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(t)) {
      continue;
    }
    if (isBibOrAdminSectionStart(t)) {
      skipAdminBlock = true;
      continue;
    }
    if (skipAdminBlock) {
      // Exit admin/bibliography block only when a genuine thematic heading starts
      if (/^#{1,3}\s+/.test(t) && !isBibOrAdminSectionStart(t) && !isSingleAdminLine(t)) {
        skipAdminBlock = false;
      } else {
        continue;
      }
    }
    if (isSingleAdminLine(t)) {
      continue;
    }
    compactNonEmpty.push(l);
  }

  // 2. Repair false headings & merge wrapped sentence continuations
  const repairedLines: string[] = [];
  const seenHeadings = new Set<string>();
  const normHeadingKey = (s: string) =>
    s
      .toLowerCase()
      .replace(/^[#*\-\s]+/, "")
      .replace(/[.:;!?]+$/, "")
      .replace(/\s+/g, " ")
      .trim();

  // Helper to find the next non-empty line index
  const findNextNonEmpty = (fromIdx: number): number => {
    for (let k = fromIdx + 1; k < compactNonEmpty.length; k++) {
      if (compactNonEmpty[k].trim().length > 0) return k;
    }
    return -1;
  };

  for (let i = 0; i < compactNonEmpty.length; i++) {
    const rawLine = compactNonEmpty[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      repairedLines.push("");
      continue;
    }

    // Check if single-word label like "Consequência" or "**Consequência**" before a line
    const singleLabelMatch = trimmed.match(
      /^(?:#{1,6}\s+)?(?:\*\*)?(consequ[êe]ncias?|causas?|efeitos?|mecanismos?|observa[çc][ãa]o|conclus[ãa]o)(?:\*\*)?:?\s*$/i
    );
    if (singleLabelMatch) {
      const nextIdx = findNextNonEmpty(i);
      if (nextIdx !== -1) {
        const nextLineClean = compactNonEmpty[nextIdx]
          .trim()
          .replace(/^#{1,6}\s+/, "");
        compactNonEmpty[nextIdx] = `**${capitalizeFirstAlpha(singleLabelMatch[1].trim())}:** ${nextLineClean}`;
        continue;
      }
    }

    // Check if line is a Markdown heading (# to ####)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const hashes = headingMatch[1];
      let hText = headingMatch[2].trim();

      // Remove table header noise like "### Mecanismo Efeito"
      if (/^(?:mecanismo\s+efeito|causa\s+consequ[êe]ncia|f[áa]rmaco\s+mecanismo|par[âa]metro\s+valor)$/i.test(hText)) {
        continue;
      }

      // Check if next non-empty line is a wrapped sentence continuation (e.g. "de hemoglobina..." or "(Fe2+) em seu centro.")
      const nextIdx = findNextNonEmpty(i);
      if (nextIdx !== -1) {
        const nextTrim = compactNonEmpty[nextIdx].trim();
        const nextIsHeadingOrBullet = /^(?:#{1,6}\s|[\*\-•]\s|\d+[\.\)]\s|\||>)/.test(nextTrim);
        const nextIsWrappedContinuation =
          !nextIsHeadingOrBullet &&
          (/^[a-zà-öø-ÿ(]/.test(nextTrim) ||
            /^(?:de|da|do|das|dos|e|ou|em|no|na|nos|nas|para|por|com|que|como|->|→)\b/i.test(nextTrim) ||
            hText.endsWith("->") ||
            hText.endsWith("→") ||
            hText.endsWith(","));

        if (nextIsWrappedContinuation) {
          let merged = `${hText} ${nextTrim}`.replace(/\s{2,}/g, " ").trim();
          const defColon = merged.match(/^([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ0-9\s()/\-_]{1,42}):\s+(.+)$/);
          if (defColon && !merged.startsWith("**")) {
            merged = `**${defColon[1].trim()}:** ${defColon[2].trim()}`;
          }
          repairedLines.push(merged);
          i = nextIdx;
          continue;
        }
      }

      // Check if heading ends with ":" (e.g. "## O chumbo aumenta ROS porque:") -> convert to bold lead-in paragraph
      if (hText.endsWith(":")) {
        const cleanLead = hText.replace(/^\*\*|\*\*$/g, "");
        repairedLines.push(`**${cleanLead}**`);
        continue;
      }

      // Check if heading is actually a sentence, arrow chain, definition, or 2-column slide table row
      const hasArrow = hText.includes("->") || hText.includes("→");
      const hasColonDefinition = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s()/\-_]{2,45}:\s+\S/.test(hText);
      const hasChemIon = /[²³⁺⁻]|[A-Za-z]\d+\+/.test(hText);
      const hasActionVerb = nonHeadingVerbRegex.test(hText);
      const wordCount = hText.split(/\s+/).filter(Boolean).length;

      if (hasArrow || hasColonDefinition || hasChemIon || hasActionVerb || wordCount > 10) {
        if (hasColonDefinition && !hText.startsWith("**")) {
          const idxColon = hText.indexOf(":");
          const term = hText.slice(0, idxColon).trim();
          const rest = hText.slice(idxColon + 1).trim();
          repairedLines.push(`**${term}:** ${rest}`);
          continue;
        }

        // Check if it's a 2-column slide table row like "Inibe antioxidantes Radicais livres se acumulam"
        // where a verb phrase is followed mid-line by a capitalized 2nd column clause
        const twoColMatch = hText.match(
          /^([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ0-9²³⁺⁻+\-]+(?:\s+(?:[a-zà-öø-ÿ0-9²³⁺⁻+\-]+|Ca²\+|Ca2\+|Fe²\+|Fe2\+|NADPH|ROS|ATP|GSH|DNA)){1,4})\s+([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ].+)$/
        );
        if (twoColMatch) {
          repairedLines.push(`* **${twoColMatch[1].trim()}:** ${twoColMatch[2].trim()}`);
          continue;
        }

        repairedLines.push(hText);
        continue;
      }

      // Deduplicate repeated slide titles (like "## Chumbo - Toxicodinâmica" repeated on every slide)
      const hKey = normHeadingKey(hText);
      if (hashes.length >= 2 && seenHeadings.has(hKey)) {
        continue;
      }
      if (hKey.length > 2) {
        seenHeadings.add(hKey);
      }

      repairedLines.push(`${hashes} ${hText}`);
      continue;
    }

    // For non-heading lines, check if a bullet or line has "Termo: descrição" without bold
    const bulletTermColon = trimmed.match(/^\*\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9\s()/\-_δΔαβγ]{2,55}):\s+(.+)$/);
    if (bulletTermColon && !bulletTermColon[1].includes("**")) {
      repairedLines.push(`* **${bulletTermColon[1].trim()}:** ${bulletTermColon[2].trim()}`);
      continue;
    }

    repairedLines.push(rawLine);
  }

  // 3. Reorder sections so Objectives ALWAYS come first, Theory next, Clinical Cases after theory, and Questions ALWAYS at the very end
  const fullJoined = repairedLines.join("\n");
  const sectionLines = fullJoined.split("\n");

  interface DocSection {
    kind: "objectives" | "theory" | "case" | "questions";
    lines: string[];
  }

  const sections: DocSection[] = [];
  let currentSec: DocSection = { kind: "theory", lines: [] };

  const isObjectivesHeading = (t: string) =>
    /^#{1,4}\s*(?:\*\*)?objetivos?(?:\s+de\s+aprendizagem|\s+da\s+aula|\s+do\s+estudo|\s+do\s+arquivo)?\b/i.test(t);

  const isCaseHeading = (t: string) =>
    /^#{1,4}\s*(?:\*\*)?(?:caso\s+cl[íi]nico|situa[çc][ãa]o[\s\-]problema|relato\s+de\s+caso|apresenta[çc][ãa]o\s+do\s+caso)\b/i.test(t);

  const isQuestionsHeading = (t: string) =>
    /^#{1,4}\s*(?:\*\*)?(?:quest[õo]es|perguntas|exerc[íi]cios|atividades?\s+(?:de\s+fixa[çc][ãa]o|do\s+roteiro|pr[áa]ticas?)|quest[ãa]o\s+\d+|pergunta\s+\d+|teste\s+seu\s+conhecimento|avalia[çc][ãa]o)\b/i.test(t);

  for (const line of sectionLines) {
    const t = line.trim();
    if (/^#{2,4}\s+/.test(t)) {
      if (isObjectivesHeading(t)) {
        if (currentSec.lines.length > 0) sections.push(currentSec);
        currentSec = { kind: "objectives", lines: [line] };
        continue;
      }
      if (isQuestionsHeading(t)) {
        if (currentSec.lines.length > 0) sections.push(currentSec);
        currentSec = { kind: "questions", lines: [line] };
        continue;
      }
      if (isCaseHeading(t)) {
        if (currentSec.lines.length > 0) sections.push(currentSec);
        currentSec = { kind: "case", lines: [line] };
        continue;
      }
      // If we were inside objectives, case, or questions and hit a new major H2 theoretical heading
      if (currentSec.kind !== "theory" && /^##\s+/.test(t)) {
        sections.push(currentSec);
        currentSec = { kind: "theory", lines: [line] };
        continue;
      }
    }
    currentSec.lines.push(line);
  }
  if (currentSec.lines.length > 0) {
    sections.push(currentSec);
  }

  const objectivesSections = sections.filter((s) => s.kind === "objectives");
  const theorySections = sections.filter((s) => s.kind === "theory");
  const caseSections = sections.filter((s) => s.kind === "case");
  const questionSections = sections.filter((s) => s.kind === "questions");

  const orderedSections = [...objectivesSections, ...theorySections, ...caseSections, ...questionSections];
  return orderedSections
    .map((s) => s.lines.join("\n").trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Conservative cleanup for PDF/slide transcriptions.
 * Preserves ALL hierarchical bullet points (`* ` and indented `  * ` sub-bullets)
 * while repairing false headings, wrapped lines, repeated slide titles, stray arrows,
 * and ordering (Theory -> Clinical Case -> Questions at the very end).
 */
export function reduceExcessiveBulletsInTranscription(markdown: string): string {
  if (!markdown) return "";

  const repairedMarkdown = repairTranscriptionHeadingsAndOrder(markdown);
  const lines = repairedMarkdown.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      out.push("");
      continue;
    }

    // Any heading: strip trailing arrow if present
    if (/^#{1,6}\s+/.test(trimmed)) {
      out.push(rawLine.replace(/\s*(?:->|→)\s*$/, ""));
      continue;
    }

    // Convert empty bullets with trailing arrow (e.g. "- **Medicações** ->") into clean subheadings
    const emptyArrowBullet = rawLine.match(
      /^(\s*)(?:[\*\-]|\u2022)\s+\*\*([^*]+?)\*\*\s*(?:->|→)\s*$/
    );
    if (emptyArrowBullet) {
      const cleanHeading = emptyArrowBullet[2]
        .replace(/\s*(?:->|→|:|—|–|-)+\s*$/, "")
        .trim();
      out.push("");
      out.push(`#### ${cleanHeading}`);
      out.push("");
      continue;
    }

    // Normalize bullet indentation cleanly (preserve top-level `* ` and nested `  * ` / `    * `)
    const bulletMatch = rawLine.match(/^(\s*)(?:[\*\-]|\u2022)\s+(.+)$/);
    if (bulletMatch) {
      const spaces = bulletMatch[1].replace(/\t/g, "  ").length;
      const prefix = spaces >= 4 ? "    * " : spaces >= 2 ? "  * " : "* ";
      const content = bulletMatch[2].trim();
      out.push(`${prefix}${content}`);
      continue;
    }

    out.push(rawLine);
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Converts Markdown into semantic, beautifully formatted HTML for WYSIWYG contenteditable.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "<p><br></p>";

  const cleanedMd = reduceExcessiveBulletsInTranscription(markdown);
  const structuredMd = formatDenseProseParagraphsIntoBullets(cleanedMd);
  const lines = structuredMd.split("\n");
  const htmlParts: string[] = [];

  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) {
      inTable = false;
      tableRows = [];
      return;
    }
    const html: string[] = ['<div class="my-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1A1D27]"><table class="w-full text-xs sm:text-sm text-left border-collapse min-w-[600px] divide-y divide-gray-200 dark:divide-gray-800">'];
    const headerRow = tableRows[0];
    html.push('<thead class="bg-[#065F46] text-white"><tr>');
    for (const cell of headerRow) {
      html.push(`<th class="px-4 py-3.5 font-bold border-b border-emerald-800 text-white tracking-wide min-w-[150px] whitespace-normal break-words">${formatInlineHtml(cell)}</th>`);
    }
    html.push("</tr></thead>");

    if (tableRows.length > 1) {
      html.push('<tbody class="divide-y divide-gray-100 dark:divide-gray-800">');
      for (let r = 1; r < tableRows.length; r++) {
        const row = tableRows[r];
        html.push(`<tr class="${r % 2 === 1 ? 'bg-gray-50/70 dark:bg-gray-800/30' : 'bg-white dark:bg-[#1A1D27]'} hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors">`);
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          html.push(`<td class="px-4 py-3 text-gray-800 dark:text-gray-200 min-w-[150px] whitespace-normal break-words align-top ${c === 0 ? 'font-semibold text-gray-950 dark:text-white' : ''}">${formatInlineHtml(cell)}</td>`);
        }
        html.push("</tr>");
      }
      html.push("</tbody>");
    }
    html.push("</table></div>");
    htmlParts.push(html.join(""));
    inTable = false;
    tableRows = [];
  };

  const closeListsAndBlocks = () => {
    if (inUl) {
      htmlParts.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlParts.push("</ol>");
      inOl = false;
    }
    if (inBlockquote) {
      htmlParts.push("</blockquote>");
      inBlockquote = false;
    }
    if (inTable) {
      flushTable();
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check table row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Check if separator row like | --- | --- |
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed)) {
        continue;
      }
      if (!inTable) {
        closeListsAndBlocks();
        inTable = true;
      }
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      closeListsAndBlocks();
      continue;
    }

    // Horizontal rule
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeListsAndBlocks();
      htmlParts.push('<hr class="my-5 border-gray-200 dark:border-gray-800" />');
      continue;
    }

    // Markdown Image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      closeListsAndBlocks();
      const alt = imgMatch[1] || "Imagem";
      const src = imgMatch[2];
      htmlParts.push(
        `<figure class="my-4 text-center select-none" contenteditable="false"><img src="${src}" alt="${alt}" class="max-h-96 max-w-full rounded-xl mx-auto object-contain border border-gray-200 dark:border-gray-800 shadow-sm" />${
          alt && alt !== "Imagem" ? `<figcaption class="text-xs text-gray-500 mt-1">${alt}</figcaption>` : ""
        }</figure>`
      );
      continue;
    }

    // Heading 1
    if (trimmed.startsWith("# ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h1 class="text-[21px] font-extrabold text-gray-950 dark:text-white mt-5 mb-2.5 leading-tight">${formatInlineHtml(trimmed.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    // Heading 2
    if (trimmed.startsWith("## ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h2 class="text-[18px] font-bold text-gray-900 dark:text-white mt-6 mb-2.5 pb-1.5 border-b border-gray-200/80 dark:border-gray-800 leading-tight">${formatInlineHtml(trimmed.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }

    // Heading 3
    if (trimmed.startsWith("### ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h3 class="text-[15.5px] font-bold text-gray-900 dark:text-gray-100 mt-5 mb-2 pb-1 border-b border-gray-200/70 dark:border-gray-800/80 leading-snug">${formatInlineHtml(trimmed.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }

    // Heading 4 & 5
    if (trimmed.startsWith("##### ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h5 class="text-[13.5px] font-bold text-gray-800 dark:text-gray-200 mt-2.5 mb-1">${formatInlineHtml(trimmed.replace(/^#####\s+/, ""))}</h5>`);
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h4 class="text-[14px] font-bold text-gray-800 dark:text-gray-200 mt-3 mb-1.5">${formatInlineHtml(trimmed.replace(/^####\s+/, ""))}</h4>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      if (!inBlockquote) {
        closeListsAndBlocks();
        htmlParts.push('<blockquote class="border-l-4 border-blue-500 pl-4 py-1.5 my-3 text-gray-700 dark:text-gray-300 italic bg-blue-50/40 dark:bg-blue-950/20 rounded-r-lg">');
        inBlockquote = true;
      }
      htmlParts.push(`<p>${formatInlineHtml(trimmed.replace(/^>\s+/, ""))}</p>`);
      continue;
    } else if (inBlockquote) {
      htmlParts.push("</blockquote>");
      inBlockquote = false;
    }

    // Bullet list (supporting nested sub-bullets with 2+ spaces indentation)
    const bulletMatch = rawLine.match(/^(\s*)(?:[\*\-]|\u2022)\s+(.*)$/);
    if (bulletMatch) {
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push('<ul class="list-disc list-outside pl-6 my-2.5 space-y-1.5 text-gray-800 dark:text-gray-200 marker:text-gray-300 dark:marker:text-gray-600">');
        inUl = true;
      }
      const indentSpaces = bulletMatch[1].replace(/\t/g, "  ").length;
      if (indentSpaces >= 4) {
        htmlParts.push(
          `<li data-indent="2" class="ml-12 list-disc marker:text-gray-300 dark:marker:text-gray-600 text-gray-700 dark:text-gray-300 leading-relaxed">${formatInlineHtml(bulletMatch[2])}</li>`
        );
      } else if (indentSpaces >= 2) {
        htmlParts.push(
          `<li data-indent="1" class="ml-6 list-disc marker:text-gray-300 dark:marker:text-gray-600 text-gray-700 dark:text-gray-300 leading-relaxed">${formatInlineHtml(bulletMatch[2])}</li>`
        );
      } else {
        htmlParts.push(`<li class="leading-relaxed">${formatInlineHtml(bulletMatch[2])}</li>`);
      }
      continue;
    }

    // Numbered list
    const numMatch = rawLine.match(/^(\s*)(\d+(?:\.[\w\d]+)*)\.?\s+(.*)$/);
    if (numMatch) {
      if (inUl) {
        htmlParts.push("</ul>");
        inUl = false;
      }
      const numLabel = numMatch[2];
      const isSimpleInt = /^\d+$/.test(numLabel);
      if (isSimpleInt) {
        if (!inOl) {
          htmlParts.push('<ol class="list-decimal list-outside pl-6 my-2 space-y-1 text-gray-800 dark:text-gray-200">');
          inOl = true;
        }
        htmlParts.push(`<li>${formatInlineHtml(numMatch[3])}</li>`);
      } else {
        if (inOl) {
          htmlParts.push("</ol>");
          inOl = false;
        }
        htmlParts.push(
          `<div class="my-1.5 flex items-start gap-2 pl-4"><span class="font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0 mt-0.5">${numLabel}</span><span class="flex-1 text-sm sm:text-base text-gray-800 dark:text-gray-200">${formatInlineHtml(numMatch[3])}</span></div>`
        );
      }
      continue;
    }

    // Regular paragraph
    closeListsAndBlocks();
    htmlParts.push(`<p class="my-2 leading-[1.65] text-gray-800 dark:text-gray-200 text-[13.5px]">${formatInlineHtml(trimmed)}</p>`);
  }

  closeListsAndBlocks();

  return htmlParts.join("") || "<p><br></p>";
}

/**
 * Formats inline Markdown (*bold*, _italic_, ~~strike~~, `code`, etc.) into HTML tags.
 */
export function formatInlineHtml(text: string): string {
  if (!text) return "";

  return text
    // Escape standard HTML angle brackets if not part of tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Restore markdown images that were inside text
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-h-60 rounded-lg inline-block my-1" />')
    // Bold **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-950 dark:text-white">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="font-bold text-gray-950 dark:text-white">$1</strong>')
    // Italics *text* or _text_ (excluding double asterisks)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic">$1</em>')
    // Underline <u>text</u> (unescape previously escaped tags)
    .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>')
    // Subscript / superscript
    .replace(/&lt;sub&gt;(.*?)&lt;\/sub&gt;/gi, '<sub>$1</sub>')
    .replace(/&lt;sup&gt;(.*?)&lt;\/sup&gt;/gi, '<sup>$1</sup>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Color spans: <span style="color: #...">text</span>
    .replace(/&lt;span\s+[^&]*?style=["'][^"']*?color:\s*([^"';]+)[^"']*["'][^&]*&gt;([\s\S]*?)&lt;\/span&gt;/gi, '<span style="color: $1;">$2</span>')
    // Highlights: <mark style="background-color: #...">text</mark> or <mark>text</mark>
    .replace(/&lt;mark(?:\s+[^&]*)?&gt;\s*&lt;\/mark&gt;/gi, "")
    .replace(/&lt;span(?:\s+[^&]*)?&gt;\s*&lt;\/span&gt;/gi, "")
    .replace(/&lt;mark\s+[^&]*?style=["'][^"']*?background-color:\s*([^"';]+)[^"']*["'][^&]*&gt;([\s\S]*?)&lt;\/mark&gt;/gi, (_, bg, c) => c.trim() ? `<mark style="background-color: ${bg};" class="px-1 py-0.5 rounded">${c}</mark>` : '')
    .replace(/&lt;mark&gt;(.*?)&lt;\/mark&gt;/gi, (_, c) => c.trim() ? `<mark style="background-color: #FEF08A;" class="px-1 py-0.5 rounded text-gray-950">${c}</mark>` : '')
    // Strikethrough ~~text~~
    .replace(/~~([^~]+)~~/g, '<del class="line-through text-gray-400">$1</del>')
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs text-blue-600 dark:text-blue-400">$1</code>');
}

/**
 * Converts DOM tree / HTML from visual editor back into clean, standardized Markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === "<p><br></p>" || html.trim() === "<br>") return "";

  if (typeof window === "undefined") {
    // Basic fallback if running server-side
    return html.replace(/<[^>]+>/g, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild || doc.body;

  function traverseNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Skip hidden elements or cursor placeholders
    if (el.classList.contains("hidden") || el.getAttribute("aria-hidden") === "true") {
      return "";
    }

    // Children content
    const getChildrenText = () => {
      let res = "";
      for (let i = 0; i < el.childNodes.length; i++) {
        res += traverseNode(el.childNodes[i]);
      }
      return res;
    };

    switch (tag) {
      case "h1":
        return `\n\n# ${getChildrenText().trim()}\n\n`;
      case "h2":
        return `\n\n## ${getChildrenText().trim()}\n\n`;
      case "h3":
        return `\n\n### ${getChildrenText().trim()}\n\n`;
      case "h4":
        return `\n\n#### ${getChildrenText().trim()}\n\n`;
      case "h5":
        return `\n\n##### ${getChildrenText().trim()}\n\n`;
      case "strong":
      case "b": {
        const text = getChildrenText().trim();
        return text ? `**${text}**` : "";
      }
      case "em":
      case "i": {
        const text = getChildrenText().trim();
        return text ? `*${text}*` : "";
      }
      case "u": {
        const text = getChildrenText().trim();
        return text ? `<u>${text}</u>` : "";
      }
      case "span":
      case "font": {
        const text = getChildrenText();
        if (!text || !text.trim()) return "";
        const color = el.style.color || el.getAttribute("color");
        const bgColor = el.style.backgroundColor;
        if (bgColor && bgColor !== "transparent") {
          return `<mark style="background-color: ${bgColor};">${text}</mark>`;
        }
        if (color) {
          return `<span style="color: ${color};">${text}</span>`;
        }
        return text;
      }
      case "mark": {
        const text = getChildrenText();
        if (!text || !text.trim()) return "";
        const bgColor = el.style.backgroundColor || "#FEF08A";
        return `<mark style="background-color: ${bgColor};">${text}</mark>`;
      }
      case "del":
      case "s":
      case "strike": {
        const text = getChildrenText().trim();
        return text ? `~~${text}~~` : "";
      }
      case "sub": {
        const text = getChildrenText();
        return text.trim() ? `<sub>${text}</sub>` : "";
      }
      case "sup": {
        const text = getChildrenText();
        return text.trim() ? `<sup>${text}</sup>` : "";
      }
      case "a": {
        const text = getChildrenText().trim();
        const href = el.getAttribute("href") || "";
        return text && href ? `[${text}](${href})` : text;
      }
      case "hr":
        return "\n\n---\n\n";
      case "code": {
        const text = getChildrenText();
        return `\`${text}\``;
      }
      case "blockquote": {
        const lines = getChildrenText().trim().split("\n");
        return `\n\n${lines.map((l) => `> ${l}`).join("\n")}\n\n`;
      }
      case "ul": {
        let ulResult = "\n";
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement;
            const childTag = childEl.tagName.toLowerCase();
            if (childTag === "li") {
              const indentAttr = Number(childEl.getAttribute("data-indent") || "0");
              const hasSquare = childEl.classList.contains("list-[square]") || childEl.classList.contains("ml-12");
              const hasCircle = childEl.classList.contains("list-[circle]") || childEl.classList.contains("ml-6");
              const indentLevel = indentAttr || (hasSquare ? 2 : hasCircle ? 1 : 0);
              const prefix = "  ".repeat(indentLevel);
              ulResult += `${prefix}* ${traverseNode(childEl).trim()}\n`;
            } else if (childTag === "ul") {
              const nestedLines = traverseNode(childEl).trim().split("\n");
              for (const nl of nestedLines) {
                if (nl.trim()) ulResult += `  ${nl}\n`;
              }
            }
          }
        }
        return ulResult + "\n";
      }
      case "ol": {
        let olResult = "\n";
        let index = 1;
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === "li") {
            olResult += `${index}. ${traverseNode(child).trim()}\n`;
            index++;
          }
        }
        return olResult + "\n";
      }
      case "li":
        return getChildrenText().trim();
      case "img": {
        const src = el.getAttribute("src") || "";
        const alt = el.getAttribute("alt") || "Imagem";
        return src ? `\n\n![${alt}](${src})\n\n` : "";
      }
      case "figure": {
        const img = el.querySelector("img");
        if (img) {
          const src = img.getAttribute("src") || "";
          const figcaption = el.querySelector("figcaption");
          const alt = figcaption?.textContent?.trim() || img.getAttribute("alt") || "Imagem";
          return src ? `\n\n![${alt}](${src})\n\n` : "";
        }
        return getChildrenText();
      }
      case "table": {
        const rows = Array.from(el.querySelectorAll("tr"));
        if (rows.length === 0) return "";
        let mdTable = "\n\n";

        const headers = Array.from(rows[0].querySelectorAll("th, td")).map((c) => (c.textContent || "").trim());
        if (headers.length > 0) {
          mdTable += `| ${headers.join(" | ")} |\n`;
          mdTable += `| ${headers.map(() => "---").join(" | ")} |\n`;
        }

        for (let r = 1; r < rows.length; r++) {
          const cells = Array.from(rows[r].querySelectorAll("td, th")).map((c) => (c.textContent || "").trim());
          if (cells.length > 0) {
            mdTable += `| ${cells.join(" | ")} |\n`;
          }
        }
        return mdTable + "\n\n";
      }
      case "p":
      case "div": {
        const text = getChildrenText().trim();
        return text ? `\n\n${text}\n\n` : "\n";
      }
      case "br":
        return "\n";
      default:
        return getChildrenText();
    }
  }

  const rawMd = traverseNode(root);

  // Normalize excessive newlines (max 2 consecutive)
  return rawMd
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
