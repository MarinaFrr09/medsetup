import React from "react";
import { cleanFlashcardText } from "@/lib/text-sanitize";

export { cleanFlashcardText };

/**
 * Strips leading bracket tags from question text (e.g. "[Anatomia]", "[Histologia]", "[Caso 1]", "[SP]").
 * Also strips area colon prefixes like "Anatomia: " or "Caso 1: ".
 * Cleans any HTML tags and raw LaTeX artifacts.
 */
export function cleanQuestionTitle(text?: string): string {
  if (!text) return "";
  let clean = cleanFlashcardText(text)
    // Remove leading markdown bold headers like "**Questão 1:**" or "**Enunciado:**"
    .replace(/^\s*\*\*(?:Quest[ãa]o\s*\d+|Q\d+|\d+|Enunciado)\s*[:.\-–—]?\*\*\s*/i, "")
    // Remove leading numbering like "1.", "1 -", "Questão 1:", "Q1:", etc.
    .replace(/^\s*(?:Quest[ãa]o\s*\d+|Q\d+|\d+)\s*[:.\-–—]\s*/i, "")
    // Remove leading bracket tags like [Anatomia], [Caso 1], [SP], [Histologia], etc.
    .replace(/^\s*\[[^\]]+\]\s*/g, "")
    // Remove leading prefixes like "Anatomia:", "Caso 1:", "Histologia:"
    .replace(/^\s*(Anatomia|Histologia|Fisiopatologia|Fisiologia|Cl[ií]nica|Caso\s*\d*)\s*[:\-]\s*/gi, "")
    // Strip dangling trailing asterisks if present
    .replace(/\s*\*\*\s*$/, "")
    .trim();

  return clean;
}


/**
 * Shortens and cleans subject names for badges and folders.
 * Converts long academic descriptions like
 * "Fisiopatologia, diagnóstico morfológico e manejo clínico-laboratorial do Sangramento Uterino Anormal (SUA) e distúrbios do ciclo menstrual."
 * into concise titles like "Sangramento Uterino Anormal".
 */
export function formatQuestionSubject(subject?: string): string {
  if (!subject) return "";
  let s = subject.trim();

  // Strip generic prefixes
  s = s.replace(/^SP\s*\d*\s*[-—:]\s*/i, "");
  s = s.replace(/^Situação[- ]Problema\s*\d*\s*[-—:]\s*/i, "");
  s = s.replace(/^Ateliê\s*(SP)?\s*[-—:]\s*/i, "");

  // Match Sangramento Uterino Anormal
  if (/sangramento\s+uterino\s+anormal/i.test(s)) {
    return "Sangramento Uterino Anormal";
  }

  // If long description, extract the central theme
  if (s.length > 40) {
    // Look for preposition introducing the topic: "do X", "da X", "de X", "sobre X"
    const match = s.match(/(?:de|da|do|sobre)\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][^,.:;\n]+)/i);
    if (match && match[1]) {
      const core = match[1].trim().replace(/\s*\(.*?\)$/, "");
      if (core.length >= 4 && core.length < 40) {
        return core;
      }
    }

    // Split by punctuation and pick first meaningful chunk
    const parts = s.split(/[-—:;,]/);
    if (parts.length > 0 && parts[0].trim().length >= 4 && parts[0].trim().length <= 40) {
      return parts[0].trim();
    }

    return s.slice(0, 38).trim() + "...";
  }

  return s;
}

/**
 * Extracts a concise subject from title and theme.
 */
export function extractCleanSubject(title?: string, theme?: string): string {
  const rawTitle = (title || "").trim();
  if (rawTitle && !/^ateli[eê](\s+sp)?$/i.test(rawTitle)) {
    const cleaned = rawTitle
      .replace(/^SP\s*\d*\s*[-—:]\s*/i, "")
      .replace(/^Situação[- ]Problema\s*\d*\s*[-—:]\s*/i, "")
      .replace(/^Ateliê\s*(SP)?\s*[-—:]\s*/i, "")
      .trim();
    if (cleaned.length > 0 && cleaned.length < 60) {
      return cleaned;
    }
  }

  return formatQuestionSubject(theme || rawTitle || "Ateliê SP");
}

/**
 * Renders inline text, handling LaTeX formatting commands (\textbf, \textit, math symbols),
 * turning markdown bold (**text**) into <strong> tags, markdown italic (*text*) into <em>,
 * converting newlines into <br /> line breaks, and eliminating raw HTML tags, broken spans,
 * and LaTeX syntax.
 */
export function renderFormattedText(text?: string): React.ReactNode {
  if (!text) return null;

  // 1. Thoroughly clean all HTML tags, broken spans, and raw LaTeX math
  let clean = cleanFlashcardText(String(text));

  // 2. LaTeX styling commands -> Markdown
  clean = clean
    .replace(/\\textbf\{([^}]+)\}/gi, "**$1**")
    .replace(/\\mathbf\{([^}]+)\}/gi, "**$1**")
    .replace(/\\textit\{([^}]+)\}/gi, "*$1*")
    .replace(/\\emph\{([^}]+)\}/gi, "*$1*")
    .replace(/\\underline\{([^}]+)\}/gi, "$1")
    .replace(/\\text(?:rm|sf|tt|normal)?\{([^}]+)\}/gi, "$1")
    .replace(/\\mathrm\{([^}]+)\}/gi, "$1");

  // 3. LaTeX math symbols & entities
  clean = clean
    .replace(/\\pm\b/gi, "±")
    .replace(/\\times\b/gi, "×")
    .replace(/\\div\b/gi, "÷")
    .replace(/\\(leq|le)\b/gi, "≤")
    .replace(/\\(geq|ge)\b/gi, "≥")
    .replace(/\\(neq|ne)\b/gi, "≠")
    .replace(/\\approx\b/gi, "≈")
    .replace(/\\sim\b/gi, "~")
    .replace(/\\(to|rightarrow)\b/gi, "→")
    .replace(/\\leftarrow\b/gi, "←")
    .replace(/\\Rightarrow\b/gi, "⇒")
    .replace(/\\alpha\b/gi, "α")
    .replace(/\\beta\b/gi, "β")
    .replace(/\\gamma\b/gi, "γ")
    .replace(/\\delta\b/gi, "δ")
    .replace(/\\Delta\b/gi, "Δ")
    .replace(/\\mu\b/gi, "µ")
    .replace(/\\pi\b/gi, "π")
    .replace(/\\cdot\b/gi, "·")
    .replace(/\\infty\b/gi, "∞")
    .replace(/\\degree\b|\^\\circ\b/gi, "°");

  // 4. LaTeX math wrappers: $$...$$ and $...$
  clean = clean
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/(^|[^\\$])\$([^\$\n]+?)\$(?!\d)/g, "$1$2")
    .replace(/\\\[([\s\S]+?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$1");

  // 5. Superscripts & Subscripts
  clean = clean
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\^1\b/g, "¹")
    .replace(/\^0\b/g, "⁰")
    .replace(/CO_2\b/g, "CO₂")
    .replace(/H_2O\b/g, "H₂O")
    .replace(/O_2\b/g, "O₂");

  // 6. Convert double-underscore bold (__text__) to **text**
  clean = clean.replace(/(^|[\s(])__([^_]+?)__([\s).,;:!?]|$)/g, "$1**$2**$3");

  // 7. Clean orphan/trailing asterisks
  clean = clean.replace(/\s*\*\*\s*$/, "");

  // If there's an odd number of double asterisks, remove the last orphan **
  const doubleAsteriskMatches = clean.match(/\*\*/g);
  if (doubleAsteriskMatches && doubleAsteriskMatches.length % 2 !== 0) {
    const lastIdx = clean.lastIndexOf("**");
    clean = clean.slice(0, lastIdx) + clean.slice(lastIdx + 2);
  }

  // Quick path if no special tokens remain
  if (!clean.includes("**") && !clean.includes("*") && !clean.includes("\n")) {
    return clean;
  }

  // 8. Tokenize: bold (*** or **), italic (*), newline (\n)
  const parts = clean.split(/(\n|\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*)/g);

  return parts.map((part, idx) => {
    if (part === "\n") {
      return <br key={idx} />;
    }
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return (
        <strong key={idx} className="font-semibold text-gray-950 dark:text-white">
          <em className="italic">{part.slice(3, -3)}</em>
        </strong>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-gray-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic text-gray-800 dark:text-gray-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    // Clean any residual dangling double asterisks from plain text
    const cleanedText = part.replace(/\*\*/g, "");
    return <React.Fragment key={idx}>{cleanedText}</React.Fragment>;
  });
}

/**
 * Synthesizes short, active-recall answers for flashcards (avoiding giant paragraphs).
 * Keeps answers punchy, direct (1-2 sentences, max ~140 chars) while retaining medium difficulty medical facts.
 * Completely strips HTML tags, broken spans, and LaTeX syntax before trimming.
 */
export function shortenCardAnswer(text: string, maxLen = 140): string {
  if (!text) return "";
  let clean = cleanFlashcardText(text)
    .replace(/\*\*/g, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/^(Resposta|Conclusão|Definição|Descrição|Laudo|Achado)\s*[:\-]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLen) return clean;

  // Split into sentences
  const sentences = clean.split(/(?<=[.?!])\s+/);
  if (sentences.length > 0) {
    let candidate = sentences[0];
    if (candidate.length < 65 && sentences.length > 1) {
      const combined = `${candidate} ${sentences[1]}`;
      if (combined.length <= maxLen + 20) {
        return cleanFlashcardText(combined);
      }
    }
    if (candidate.length <= maxLen + 25) {
      return cleanFlashcardText(candidate);
    }
  }

  // Fallback cut at word boundary
  const trimmed = clean.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 45) {
    return cleanFlashcardText(trimmed.slice(0, lastSpace)) + ".";
  }
  return cleanFlashcardText(trimmed) + ".";
}


/**
 * Cleans clinical case presentation text, removing administrative/meeting headers like:
 * "2.4 - Quando o fluxo sai do controle. Coordenadora: Paula. Relatora: Maria Clara."
 * and preserves purely the clinical narrative.
 */
export function cleanClinicalCaseText(text?: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove combined coordinator/reporter in same sentence or line:
  cleaned = cleaned.replace(
    /Coordenador[a-z]*\s*:[^.\n;]+[.;]\s*Relator[a-z]*\s*:[^.\n;]+(?:[.\n;]|$)/gim,
    "\n"
  );

  // 2. Remove meeting role lines: Coordenador(a), Relator(a), Secretário(a), Subgrupo, Grupo, Facilitador, Docente
  cleaned = cleaned.replace(
    /(?:^|\n|[.;])\s*(?:Coordenador(?:a)?|Relator(?:a)?|Secret[aá]rio(?:a)?|Facilitador(?:a)?|Docente|Tutor(?:a)?|Subgrupo|Grupo|Membros?|Data)\s*[:\-]\s*[^.\n;]+(?:[.\n;]|$)/gim,
    "\n"
  );

  // 3. Remove numbered section headers at beginning of case like:
  // "2.4 - Quando o fluxo sai do controle." or "Atividade 2.4 - ..." or "Caso 2.4: ..."
  cleaned = cleaned.replace(
    /^\s*(?:Atividade|Caso\s*Cl[ií]nico|Caso|Situa[çc][ãa]o[- ]Problema)?\s*\d+(?:\.\d+)+\s*[-—:]\s*[^.\n]+[.\n]/i,
    ""
  );

  // 4. Remove standalone leading numbers like "2.4 - "
  cleaned = cleaned.replace(/^\s*\d+(?:\.\d+)+\s*[-—:]\s*/i, "");

  // 5. Clean extra blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

/**
 * Cleans clinical case title, stripping section numbers (e.g. "2.4 - ") and coordinator/reporter names.
 */
export function cleanClinicalCaseTitle(title?: string): string {
  if (!title) return "Caso Clínico";
  let cleaned = title.trim();

  // Strip coordinator/reporter if embedded in title
  cleaned = cleaned.replace(
    /(?:[.;,\s]|^)(?:Coordenador(?:a)?|Relator(?:a)?|Secret[aá]rio(?:a)?|Subgrupo|Grupo)\s*[:\-][^.;\n]+[.;]?/gi,
    ""
  );

  // Strip leading section numbers like "2.4 - " or "Atividade 2.4 - "
  cleaned = cleaned.replace(/^\s*(?:Atividade|Caso\s*Cl[ií]nico|Caso)?\s*\d+(?:\.\d+)*\s*[-—:]\s*/i, "");
  cleaned = cleaned.replace(/^Caso\s*Cl[ií]nico\s*[-—:]\s*/i, "");
  cleaned = cleaned.replace(/[.;\s]+$/, "").trim();

  return cleaned || "Caso Clínico";
}
