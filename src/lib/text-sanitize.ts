/**
 * Shared text sanitizer (safe for both server and client).
 * Cleans LaTeX math delimiters, converts symbols to plain text, and removes bracket badges.
 */
export function cleanLatexAndBadges(str: string): string {
  if (!str) return "";
  return str
    // Clean LaTeX inequalities and math syntax
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
    .replace(/\\mu\b/gi, "u")
    .replace(/\\pi\b/gi, "pi")
    .replace(/\\cdot\b/gi, ".")
    .replace(/\\infty\b/gi, "inf")
    .replace(/\\degree\b|\^\\circ\b/gi, "°")
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
    // Clean orphan dashes caused by emptied markup (e.g. "— — : " or "^— : ")
    .replace(/(?:^|\n)\s*[*•-]?\s*(?:—\s*)+\s*:\s*/gm, "\n* ")
    .replace(/\s*—\s*—\s*/g, " — ")
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
