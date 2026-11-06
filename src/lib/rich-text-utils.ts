/**
 * Rich Text and Markdown bidirectional conversion utilities
 * Converts Markdown <-> HTML for visual WYSIWYG editing, keeping 100% fidelity.
 */

// Helper to escape regex special chars
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Converts Markdown into semantic, beautifully formatted HTML for WYSIWYG contenteditable.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "<p><br></p>";

  const lines = markdown.split("\n");
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
      htmlParts.push(`<h1 class="text-2xl font-extrabold text-gray-950 dark:text-white mt-6 mb-3 leading-tight">${formatInlineHtml(trimmed.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    // Heading 2
    if (trimmed.startsWith("## ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-5 mb-2 leading-tight">${formatInlineHtml(trimmed.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }

    // Heading 3
    if (trimmed.startsWith("### ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2 leading-snug">${formatInlineHtml(trimmed.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }

    // Heading 4
    if (trimmed.startsWith("#### ")) {
      closeListsAndBlocks();
      htmlParts.push(`<h4 class="text-base font-bold text-gray-800 dark:text-gray-200 mt-3 mb-1.5">${formatInlineHtml(trimmed.replace(/^####\s+/, ""))}</h4>`);
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

    // Bullet list
    const bulletMatch = rawLine.match(/^(\s*)(?:[\*\-]|\u2022)\s+(.*)$/);
    if (bulletMatch) {
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push('<ul class="list-disc list-outside pl-6 my-2 space-y-1 text-gray-800 dark:text-gray-200">');
        inUl = true;
      }
      htmlParts.push(`<li>${formatInlineHtml(bulletMatch[2])}</li>`);
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
    htmlParts.push(`<p class="my-2 leading-relaxed text-gray-800 dark:text-gray-200 text-sm sm:text-base">${formatInlineHtml(trimmed)}</p>`);
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
    // Color spans: <span style="color: #...">text</span>
    .replace(/&lt;span\s+style=["']color:\s*([^"']+)["']&gt;(.*?)&lt;\/span&gt;/gi, '<span style="color: $1;">$2</span>')
    // Highlights: <mark style="background-color: #...">text</mark> or <mark>text</mark>
    .replace(/&lt;mark(?:\s+[^&]*)?&gt;\s*&lt;\/mark&gt;/gi, "")
    .replace(/&lt;span(?:\s+[^&]*)?&gt;\s*&lt;\/span&gt;/gi, "")
    .replace(/&lt;mark\s+style=["']background-color:\s*([^"']+)["']&gt;(.*?)&lt;\/mark&gt;/gi, (_, bg, c) => c.trim() ? `<mark style="background-color: ${bg};" class="px-1 py-0.5 rounded">${c}</mark>` : '')
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
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === "li") {
            ulResult += `* ${traverseNode(child).trim()}\n`;
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
