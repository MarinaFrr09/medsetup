"use client";

/**
 * Converts StudyFlow transcription Markdown into clean, highly compatible HTML
 * that Notion, Google Docs, Word, Apple Notes, and rich-text editors natively
 * convert into Headings, Paragraphs, Bulleted Lists, and Nested Sub-bullets.
 */
export function markdownToRichHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const htmlParts: string[] = [];
  let currentListLevel = 0; // 0 = no list, 1 = ul, 2 = nested ul

  const closeListsToLevel = (targetLevel: number) => {
    while (currentListLevel > targetLevel) {
      htmlParts.push("</ul>");
      currentListLevel--;
    }
  };

  const formatInline = (text: string) => {
    return text
      // Bold **text**
      .replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 700; color: #0F172A;">$1</strong>')
      // Italics *text* or _text_
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em style="font-style: italic; color: #475569;">$1</em>')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em style="font-style: italic; color: #475569;">$1</em>')
      // Underline <u>text</u>
      .replace(/<u>(.*?)<\/u>/gi, '<u style="text-decoration: underline;">$1</u>')
      // Arrow -> to styled arrow
      .replace(/\s*->\s*/g, ' <span style="color: #2563EB; font-weight: 700;">&rarr;</span> ');
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeListsToLevel(0);
      continue;
    }

    // Check for H1 (# Title)
    if (trimmed.startsWith("# ")) {
      closeListsToLevel(0);
      const title = trimmed.replace(/^#\s+/, "");
      htmlParts.push(
        `<h1 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 18px 0 8px 0; line-height: 1.3;">${formatInline(title)}</h1>`
      );
      continue;
    }

    // Check for H2 (## Section)
    if (trimmed.startsWith("## ")) {
      closeListsToLevel(0);
      const title = trimmed.replace(/^##\s+/, "");
      htmlParts.push(
        `<h2 style="font-size: 17px; font-weight: 700; color: #1E3A8A; margin: 16px 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; line-height: 1.35;">${formatInline(title)}</h2>`
      );
      continue;
    }

    // Check for H3 (### Subsection)
    if (trimmed.startsWith("### ")) {
      closeListsToLevel(0);
      const title = trimmed.replace(/^###\s+/, "");
      htmlParts.push(
        `<h3 style="font-size: 14.5px; font-weight: 700; color: #1E293B; margin: 12px 0 4px 0; line-height: 1.4;">${formatInline(title)}</h3>`
      );
      continue;
    }

    // Check for H4 (#### Minor title)
    if (trimmed.startsWith("#### ")) {
      closeListsToLevel(0);
      const title = trimmed.replace(/^####\s+/, "");
      htmlParts.push(
        `<h4 style="font-size: 13.5px; font-weight: 700; color: #334155; margin: 10px 0 4px 0;">${formatInline(title)}</h4>`
      );
      continue;
    }

    // Check for H5 or H6
    if (trimmed.startsWith("##### ") || trimmed.startsWith("###### ")) {
      closeListsToLevel(0);
      const title = trimmed.replace(/^#{5,6}\s+/, "");
      htmlParts.push(
        `<h5 style="font-size: 12.5px; font-weight: 600; color: #475569; margin: 8px 0 3px 0;">${formatInline(title)}</h5>`
      );
      continue;
    }

    // Check for Markdown table (| ... |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      closeListsToLevel(0);
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
        tableLines.push(lines[j].trim());
        j++;
      }
      i = j - 1; // Advance loop past the table

      const rows = tableLines
        .filter((l) => !/^\|[\s\-:|]+\|$/.test(l))
        .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

      if (rows.length > 0) {
        const headerRow = rows[0];
        const bodyRows = rows.slice(1);

        let tableHtml = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #CBD5E1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; text-align: left;">`;
        tableHtml += `<thead><tr style="background-color: #065F46; color: #FFFFFF;">`;
        for (const cell of headerRow) {
          tableHtml += `<th style="border: 1px solid #047857; padding: 10px 14px; font-weight: 700; color: #FFFFFF; background-color: #065F46; text-align: left;">${formatInline(cell)}</th>`;
        }
        tableHtml += `</tr></thead><tbody>`;

        for (let r = 0; r < bodyRows.length; r++) {
          const row = bodyRows[r];
          const bgColor = r % 2 === 1 ? "#F8FAFC" : "#FFFFFF";
          tableHtml += `<tr style="background-color: ${bgColor};">`;
          for (let c = 0; c < row.length; c++) {
            const cell = row[c] || "";
            const isFirst = c === 0;
            tableHtml += `<td style="border: 1px solid #E2E8F0; padding: 8px 12px; color: #1E293B; ${isFirst ? 'font-weight: 600; color: #0F172A;' : ''}">${formatInline(cell)}</td>`;
          }
          tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table>`;
        htmlParts.push(tableHtml);
      }
      continue;
    }

    // Check for blockquote (> )
    if (trimmed.startsWith("> ")) {
      closeListsToLevel(0);
      const quote = trimmed.replace(/^>\s+/, "");
      htmlParts.push(
        `<blockquote style="border-left: 3px solid #3B82F6; padding-left: 12px; margin: 8px 0; color: #475569; font-style: italic;">${formatInline(quote)}</blockquote>`
      );
      continue;
    }

    // Check for bullet lists (* or -)
    const bulletMatch = rawLine.match(/^(\s*)(?:[\*\-]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length;
      const content = bulletMatch[2];
      const targetLevel = indentSpaces >= 2 ? 2 : 1;

      if (currentListLevel < targetLevel) {
        while (currentListLevel < targetLevel) {
          htmlParts.push('<ul style="margin: 4px 0; padding-left: 20px; list-style-type: disc;">');
          currentListLevel++;
        }
      } else if (currentListLevel > targetLevel) {
        closeListsToLevel(targetLevel);
      }

      htmlParts.push(
        `<li style="margin: 4px 0; line-height: 1.5; color: #334155; font-size: 14px;">${formatInline(content)}</li>`
      );
      continue;
    }

    // Regular paragraph
    closeListsToLevel(0);
    htmlParts.push(
      `<p style="margin: 6px 0; line-height: 1.55; color: #334155; font-size: 14px;">${formatInline(trimmed)}</p>`
    );
  }

  closeListsToLevel(0);
  return htmlParts.join("\n");
}

export const markdownToNotionHtml = markdownToRichHtml;

/**
 * Cleans and standardizes Markdown for clean pasting as plain text across any application
 */
export function formatMarkdownForUniversalText(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    let l = line;
    // Standardize nested bullets to 2 spaces indentation
    if (/^\s{2,}[\*\-]\s+/.test(l)) {
      l = "  * " + l.replace(/^\s+[\*\-]\s+/, "");
    } else if (/^[\*\-]\s+/.test(l)) {
      l = "* " + l.replace(/^[\*\-]\s+/, "");
    }
    cleaned.push(l);
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export const formatMarkdownForNotionText = formatMarkdownForUniversalText;

/**
 * Sovereign multi-format clipboard copy:
 * Injects BOTH rich HTML and clean structured Markdown into the clipboard.
 * When pasted in Notion, Google Docs, Word, or Apple Notes, it formats automatically
 * with native headings, bolding, styled arrows, and clean nested lists.
 * When pasted in WhatsApp, Notepad, or plain text, it pastes cleanly without syntax errors.
 */
export async function copyRichText(markdown: string): Promise<boolean> {
  if (!markdown) return false;

  const plainText = formatMarkdownForUniversalText(markdown);
  const htmlText = markdownToRichHtml(markdown);

  try {
    if (
      typeof window !== "undefined" &&
      navigator.clipboard &&
      window.isSecureContext &&
      typeof ClipboardItem !== "undefined"
    ) {
      const blobText = new Blob([plainText], { type: "text/plain;charset=utf-8" });
      const blobHtml = new Blob([htmlText], { type: "text/html;charset=utf-8" });

      const item = new ClipboardItem({
        "text/plain": blobText,
        "text/html": blobHtml,
      });

      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn("ClipboardItem write failed, falling back to text/plain:", err);
  }

  // Fallback to text/plain
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(plainText);
      return true;
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = plainText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    }
  } catch (err) {
    console.error("Copy to clipboard failed:", err);
    return false;
  }
}

// Backwards compatibility alias
export const copyToNotion = copyRichText;

/**
 * Copies a single Markdown table as rich HTML table (for Word, Notion, Docs)
 * AND as Tab-Separated Values (TSV) + Markdown (for Excel, Google Sheets, Notepad).
 */
export async function copyTableRichText(tableMarkdown: string): Promise<boolean> {
  if (!tableMarkdown) return false;

  const lines = tableMarkdown.trim().split("\n");
  const rows = lines
    .filter((l) => !/^\|[\s\-:|]+\|$/.test(l.trim()))
    .map((l) => l.trim().split("|").slice(1, -1).map((c) => c.trim()));

  if (rows.length === 0) return false;

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);

  let tableHtml = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #CBD5E1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; text-align: left;">`;
  tableHtml += `<thead><tr style="background-color: #065F46; color: #FFFFFF;">`;
  for (const cell of headerRow) {
    const cleanCell = cell.replace(/\*\*/g, "");
    tableHtml += `<th style="border: 1px solid #047857; padding: 10px 14px; font-weight: 700; color: #FFFFFF; background-color: #065F46; text-align: left;">${cleanCell}</th>`;
  }
  tableHtml += `</tr></thead><tbody>`;

  for (let r = 0; r < bodyRows.length; r++) {
    const row = bodyRows[r];
    const bgColor = r % 2 === 1 ? "#F8FAFC" : "#FFFFFF";
    tableHtml += `<tr style="background-color: ${bgColor};">`;
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] || "").replace(/\*\*/g, "");
      const isFirst = c === 0;
      tableHtml += `<td style="border: 1px solid #E2E8F0; padding: 8px 12px; color: #1E293B; ${isFirst ? 'font-weight: 600; color: #0F172A;' : ''}">${cell}</td>`;
    }
    tableHtml += `</tr>`;
  }
  tableHtml += `</tbody></table>`;

  // TSV for spreadsheets (Excel / Google Sheets)
  const tsv = rows
    .map((r) => r.map((c) => c.replace(/\*\*/g, "").replace(/\t/g, " ")).join("\t"))
    .join("\n");

  try {
    if (
      typeof window !== "undefined" &&
      navigator.clipboard &&
      window.isSecureContext &&
      typeof ClipboardItem !== "undefined"
    ) {
      const blobText = new Blob([tsv], { type: "text/plain;charset=utf-8" });
      const blobHtml = new Blob([tableHtml], { type: "text/html;charset=utf-8" });

      const item = new ClipboardItem({
        "text/plain": blobText,
        "text/html": blobHtml,
      });

      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn("ClipboardItem write failed, falling back to text/plain:", err);
  }

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(tsv);
      return true;
    }
  } catch (err) {
    console.error("Copy table failed:", err);
  }

  return false;
}

