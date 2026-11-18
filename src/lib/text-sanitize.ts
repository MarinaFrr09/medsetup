/**
 * Shared text sanitizer (safe for both server and client).
 * Cleans LaTeX math delimiters, converts symbols to plain text, and removes bracket badges.
 */
export function cleanLatexAndBadges(str: string): string {
  if (!str) return "";
  return str
    // Clean LaTeX inequalities and math syntax
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/gi, "$1/$2")
    .replace(/\\sqrt\{([^}]+)\}/gi, "√($1)")
    .replace(/\\begin\{[a-zA-Z*]+\}([\s\S]*?)\\end\{[a-zA-Z*]+\}/gi, "$1")
    .replace(/\$\s*\\le\s*(\d+)\s*\$/gi, "<= $1")
    .replace(/\\le\b/gi, "<=")
    .replace(/\$\s*\\ge\s*(\d+)\s*\$/gi, ">= $1")
    .replace(/\\ge\b/gi, ">=")
    .replace(/\$\s*<\s*(\d+)\s*\$/gi, "< $1")
    .replace(/\$\s*>\s*(\d+)\s*\$/gi, "> $1")
    .replace(/\$\s*\\pm\s*/gi, "+/- ")
    .replace(/\\pm\b/gi, "+/-")
    .replace(/\$\s*\\times\s*/gi, "x ")
    .replace(/\\times\b/gi, "x")
    .replace(/\\div\b/gi, "/")
    .replace(/\\approx\b/gi, "~")
    .replace(/\\(neq|ne)\b/gi, "!=")
    .replace(/\\(to|rightarrow)\b/gi, "->")
    .replace(/\\leftarrow\b/gi, "<-")
    .replace(/\\Rightarrow\b/gi, "=>")
    .replace(/\\alpha\b/gi, "alfa")
    .replace(/\\beta\b/gi, "beta")
    .replace(/\\gamma\b/gi, "gama")
    .replace(/\\delta\b/gi, "delta")
    .replace(/\\Delta\b/gi, "Delta")
    .replace(/\\mu\s*g\b/gi, "mcg")
    .replace(/\\mu\b/gi, "u")
    .replace(/\\pi\b/gi, "pi")
    .replace(/\\cdot\b/gi, ".")
    .replace(/\\sim\b/gi, "~")
    .replace(/\\infty\b/gi, "inf")
    .replace(/\\degree\b|\^\\circ\b/gi, "°")
    .replace(/_\{([^}]+)\}/g, "$1")
    .replace(/\^\{([^}]+)\}/g, "$1")
    .replace(/\\([%&#_])/g, "$1")
    // Convert LaTeX text commands to markdown formatting
    .replace(/\\textbf\{([^}]+)\}/gi, "**$1**")
    .replace(/\\mathbf\{([^}]+)\}/gi, "**$1**")
    .replace(/\\textit\{([^}]+)\}/gi, "*$1*")
    .replace(/\\emph\{([^}]+)\}/gi, "*$1*")
    .replace(/\\underline\{([^}]+)\}/gi, "$1")
    .replace(/\\text(?:rm|sf|tt|normal)?\{([^}]+)\}/gi, "$1")
    .replace(/\\mathrm\{([^}]+)\}/gi, "$1")
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1") // unwrap $$math$$
    .replace(/\\\[([\s\S]+?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$1")
    .replace(/\$([^\$]+)\$/g, "$1") // unwrap any remaining $math$
    .replace(/\$/g, "") // remove stray dollar signs
    // Map non-WinAnsi symbols and superscripts to safe standard characters
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")
    .replace(/[±]/g, "+/-")
    .replace(/[×]/g, "x")
    .replace(/[²]/g, "²")
    .replace(/[³]/g, "³")
    .replace(/[¹]/g, "1")
    .replace(/[º°]/g, "°")
    .replace(/[ª]/g, "a")
    .replace(/\u00A0/g, " ") // Non-breaking space to regular space
    // Strip repetitive badge bracket tags (e.g. [Fisiológico], [Patológico], [Correlação Clínica])
    .replace(/^(\s*[*•-]\s*)\[(fisiológico|fisiologico|patológico|patologico|correlação clínica|correlacao clinica|diagnóstico|diagnostico|alerta|atenção|atencao)\]\s*/gim, "$1")
    .replace(/\[(fisiológico|fisiologico|patológico|patologico|correlação clínica|correlacao clinica)\]\s*/gi, "")
    // Strip empty HTML tags like <mark></mark>, <span></span>, <u></u>, <strong></strong>
    .replace(/<mark(?:\s+[^>]*)?>\s*<\/mark>/gi, "")
    .replace(/<span(?:\s+[^>]*)?>\s*<\/span>/gi, "")
    .replace(/<(?:strong|b|em|i|u|del|code)>\s*<\/(?:strong|b|em|i|u|del|code)>/gi, "")
    .replace(/\[\s*\]/g, "")
    // Clean orphan dashes, stray commas, and gaps caused by emptied markup (e.g. "— — : ", " , , , e .", "de , resultando em ,")
    .replace(/(?:^|\n)\s*[*•-]?\s*(?:—\s*)+\s*:\s*/gm, "\n* ")
    .replace(/\s*—\s*—\s*/g, " — ")
    .replace(/\s+,\s*/g, ", ")
    .replace(/(?:\s*,\s*){2,}/g, ", ")
    .replace(/,\s*e\s*\./gi, ".")
    .replace(/\s*,\s*\./g, ".")
    .replace(/\b(de|em|com|por|para|ao|à)\s*,\s*/gi, "$1 ")
    .replace(/\b(resultando em|exemplo de|quadro de)\s*,\s*/gi, "$1 ")
    .replace(/\b(e|ou)\s*,\s*/gi, "$1 ")
    .replace(/:\s*,\s*/g, ": ")
    .replace(/\(\s*ex\s*:\s*,\s*/gi, "(ex: ")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/,\s*\)/g, ")")
    .replace(/^(\s*[*•-]\s*),\s*/gm, "$1")
    // Strip unnecessary boilerplate contextualization attribution prefixes
    .replace(/(?:^|\n)\s*(?:\*\*)?(?:Contextualização\s+(?:Fisiopatológica[,\s]*Histológica\s+e\s+Epidemiológica\s+Abrangente|Fisiopatológica[^\n:*]*|Histológica[^\n:*]*|Epidemiológica[^\n:*]*|Abrangente|Objetiva|Clínica)|Contextualização)(?:\*\*)?\s*:\s*/gim, "\n\n")
    // Remove numerical prefix from topic headings like "1. Síndrome..." or "2. Síndrome..."
    .replace(/^(\s*#{1,6}\s*|\s*|\s*[*•-]\s*)\d+\.\s+(Síndrome\b|Grandes\s+Síndromes\b|Pilares\b|Pilar\b|Eixo\b)/gim, "$1$2")
    // Normalize "Mega Aprofundamento..." to "Aprofundamento"
    .replace(/Mega Aprofundamento no Tema\s*(?:\([^)]*\))?/gi, "Aprofundamento")
    // Normalize "CORRELAÇÕES (MORFOLOGIA ... EXAMES)" to "Integração"
    .replace(/##\s*CORRELAÇÕES\s*(?:\([^)]*\))?/gi, "## Integração")
    .replace(/CORRELAÇÕES\s*\(\s*MORFOLOGIA\s*(?:!["”]|↔|<->|->|!)\s*CLÍNICA\s*(?:!["”]|↔|<->|->|!)\s*EXAMES\s*\)/gi, "Integração")
    .replace(/CORRELAÇÕES\s*\(\s*MORFOLOGIA.*?EXAMES\s*\)/gi, "Integração")
    // Map arrows and fix corrupted jsPDF encodings like !" or !”
    .replace(/[↔⇔]/g, " <-> ")
    .replace(/\s*!["”]\s*/g, " <-> ")
    // Clean orphan unicode surrogates and corrupted glyphs like Ü| in text/PDF
    .replace(/(?:Ü\||\u00DC\||\u00DC\u00A6)\s*/g, "")
    .replace(/[💡⚠️]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .trim();
}

/**
 * Strips HTML tags, truncated HTML tags, LaTeX commands, and cleans formatting
 * for flashcard front and back texts.
 */
export function cleanFlashcardText(text?: string): string {
  if (!text) return "";
  let clean = String(text);

  // 1. Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&plusmn;/gi, "±")
    .replace(/&times;/gi, "×")
    .replace(/&divide;/gi, "÷")
    .replace(/&deg;/gi, "°");

  // 2. Remove paired HTML tags while preserving their inner content
  clean = clean
    .replace(/<mark(?:\s+[^>]*)?>([\s\S]*?)<\/mark>/gi, "$1")
    .replace(/<span(?:\s+[^>]*)?>([\s\S]*?)<\/span>/gi, "$1")
    .replace(/<u(?:\s+[^>]*)?>([\s\S]*?)<\/u>/gi, "$1")
    .replace(/<strong(?:\s+[^>]*)?>([\s\S]*?)<\/strong>/gi, "$1")
    .replace(/<b(?:\s+[^>]*)?>([\s\S]*?)<\/b>/gi, "$1")
    .replace(/<em(?:\s+[^>]*)?>([\s\S]*?)<\/em>/gi, "$1")
    .replace(/<i(?:\s+[^>]*)?>([\s\S]*?)<\/i>/gi, "$1")
    .replace(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi, "$1\n")
    .replace(/<div(?:\s+[^>]*)?>([\s\S]*?)<\/div>/gi, "$1\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // 3. Remove all remaining complete HTML tags
  clean = clean.replace(/<[^>]+>/g, "");

  // 4. Remove truncated / cut-off HTML tags at string end or start (e.g. "<span.", "<span style=...", "</span", "<span")
  clean = clean
    .replace(/<\/?[a-zA-Z][^>]*$/g, "")
    .replace(/<\/?[a-zA-Z][^>]*\.?$/g, "")
    .replace(/<[^>]*$/g, "")
    .replace(/^[^<]*>/g, "");

  // 5. LaTeX commands with arguments -> clean readable text
  clean = clean
    .replace(/\\textbf\{([^}]+)\}/gi, "$1")
    .replace(/\\mathbf\{([^}]+)\}/gi, "$1")
    .replace(/\\textit\{([^}]+)\}/gi, "$1")
    .replace(/\\emph\{([^}]+)\}/gi, "$1")
    .replace(/\\underline\{([^}]+)\}/gi, "$1")
    .replace(/\\text(?:rm|sf|tt|normal)?\{([^}]+)\}/gi, "$1")
    .replace(/\\mathrm\{([^}]+)\}/gi, "$1")
    .replace(/\\mathit\{([^}]+)\}/gi, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/gi, "($1 / $2)")
    .replace(/\\sqrt\{([^}]+)\}/gi, "√($1)")
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/gi, "[$1]√($2)");

  // 6. LaTeX math environments and delimiter wrappers
  clean = clean
    .replace(/\\begin\{[^}]+\}/gi, "")
    .replace(/\\end\{[^}]+\}/gi, "")
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/\\\[([\s\S]+?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$1")
    .replace(/(^|[^\\$])\$([^\$\n]+?)\$(?!\d)/g, "$1$2")
    .replace(/\$([^\$]+)\$/g, "$1")
    .replace(/\$/g, "");

  // 7. LaTeX math symbols & operators
  clean = clean
    .replace(/\\(le|leq)\b/gi, "≤")
    .replace(/\\(ge|geq)\b/gi, "≥")
    .replace(/\\(ne|neq)\b/gi, "≠")
    .replace(/\\approx\b/gi, "≈")
    .replace(/\\sim\b/gi, "~")
    .replace(/\\pm\b/gi, "±")
    .replace(/\\mp\b/gi, "∓")
    .replace(/\\times\b/gi, "×")
    .replace(/\\div\b/gi, "÷")
    .replace(/\\cdot\b/gi, "·")
    .replace(/\\(to|rightarrow)\b/gi, "→")
    .replace(/\\leftarrow\b/gi, "←")
    .replace(/\\Rightarrow\b/gi, "⇒")
    .replace(/\\Leftarrow\b/gi, "⇐")
    .replace(/\\Leftrightarrow\b/gi, "⇔")
    .replace(/\\alpha\b/gi, "α")
    .replace(/\\beta\b/gi, "β")
    .replace(/\\gamma\b/gi, "γ")
    .replace(/\\delta\b/gi, "δ")
    .replace(/\\Delta\b/gi, "Δ")
    .replace(/\\mu\b/gi, "µ")
    .replace(/\\pi\b/gi, "π")
    .replace(/\\theta\b/gi, "θ")
    .replace(/\\lambda\b/gi, "λ")
    .replace(/\\sigma\b/gi, "σ")
    .replace(/\\Sigma\b/gi, "Σ")
    .replace(/\\omega\b/gi, "ω")
    .replace(/\\Omega\b/gi, "Ω")
    .replace(/\\degree\b|\^\\circ\b/gi, "°")
    .replace(/\\infty\b/gi, "∞")
    .replace(/\\%/g, "%")
    .replace(/\\&/g, "&")
    .replace(/\\#/g, "#")
    .replace(/\\_/g, "_");

  // 8. Chemical formulas and medical superscripts/subscripts
  clean = clean
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\^1\b/g, "¹")
    .replace(/\^0\b/g, "⁰")
    .replace(/CO_2\b/g, "CO₂")
    .replace(/H_2O\b/g, "H₂O")
    .replace(/O_2\b/g, "O₂")
    .replace(/HCO_3\b/g, "HCO₃")
    .replace(/Na\+/g, "Na⁺")
    .replace(/K\+/g, "K⁺")
    .replace(/Ca\{?2\+\}?/g, "Ca²⁺");

  // 9. Remove stray backslashes before regular letters (e.g. \text, \rm)
  clean = clean.replace(/\\([a-zA-Z])/g, "$1");

  // 10. Clean leftover brackets badges like [Fisiológico]
  clean = clean
    .replace(/^(\s*[*•-]\s*)\[(fisiológico|fisiologico|patológico|patologico|correlação clínica|correlacao clinica|diagnóstico|diagnostico|alerta|atenção|atencao)\]\s*/gim, "$1")
    .replace(/\[(fisiológico|fisiologico|patológico|patologico|correlação clínica|correlacao clinica)\]\s*/gi, "");

  // 11. Normalize multiple spaces and trailing commas or incomplete punctuation from slicing
  clean = clean
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[,;:\s]+$/, "")
    .trim();

  return clean;
}

