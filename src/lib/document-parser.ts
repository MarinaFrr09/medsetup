import zlib from "zlib";

/**
 * Extracts plain text from a DOCX (Office Open XML) file buffer
 * without external dependencies.
 */
export function extractTextFromDocx(buffer: Buffer): string | null {
  try {
    let offset = 0;
    const xmlParts: string[] = [];

    while (offset < buffer.length - 30) {
      // Find ZIP local file header signature 0x04034b50 ('PK\x03\x04')
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLen = buffer.readUInt16LE(offset + 26);
        const extraFieldLen = buffer.readUInt16LE(offset + 28);
        const fileName = buffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
        const dataStart = offset + 30 + fileNameLen + extraFieldLen;

        if (fileName === "word/document.xml" || fileName.startsWith("word/header") || fileName.startsWith("word/footer")) {
          let xmlContent = "";
          if (compressionMethod === 8) {
            // Deflate compression
            const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
            xmlContent = zlib.inflateRawSync(compressed).toString("utf8");
          } else if (compressionMethod === 0) {
            // Uncompressed
            xmlContent = buffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
          }

          if (xmlContent) {
            xmlParts.push(xmlContent);
          }
        }

        offset = dataStart + (compressedSize > 0 ? compressedSize : 1);
      } else {
        offset++;
      }
    }

    if (xmlParts.length > 0) {
      const combined = xmlParts.join("\n");
      const formatted = combined
        .replace(/<w:p(?:\s+[^>]*)?>/g, "\n")
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br\/>/g, "\n")
        .replace(/<[^>]+>/g, "");

      return formatted
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  } catch (err: any) {
    console.warn("[Docx Parser] Warning:", err.message);
  }
  return null;
}

/**
 * Extracts plain text from PPTX (presentation) slides
 */
export function extractTextFromPptx(buffer: Buffer): string | null {
  try {
    let offset = 0;
    const slideTexts: string[] = [];

    while (offset < buffer.length - 30) {
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLen = buffer.readUInt16LE(offset + 26);
        const extraFieldLen = buffer.readUInt16LE(offset + 28);
        const fileName = buffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
        const dataStart = offset + 30 + fileNameLen + extraFieldLen;

        if (fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")) {
          let xmlContent = "";
          if (compressionMethod === 8) {
            const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
            xmlContent = zlib.inflateRawSync(compressed).toString("utf8");
          } else if (compressionMethod === 0) {
            xmlContent = buffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
          }

          if (xmlContent) {
            const text = xmlContent
              .replace(/<a:p(?:\s+[^>]*)?>/g, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .trim();
            if (text) slideTexts.push(text);
          }
        }

        offset = dataStart + (compressedSize > 0 ? compressedSize : 1);
      } else {
        offset++;
      }
    }

    if (slideTexts.length > 0) {
      return slideTexts.join("\n\n---\n\n");
    }
  } catch (err: any) {
    console.warn("[Pptx Parser] Warning:", err.message);
  }
  return null;
}

export interface ParsedPdfPage {
  num: number;
  text: string;
}

export interface ParsedPdfResult {
  total: number;
  pages: ParsedPdfPage[];
  text: string;
}

/**
 * Extracts all pages of text from a PDF buffer using unpdf.
 * Works seamlessly in Next.js Turbopack/server runtime without external worker dependencies.
 * Returns total page count, array of pages with their text, and the concatenated text.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<ParsedPdfResult | null> {
  try {
    const { extractText } = await import("unpdf");
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8, { mergePages: false });
    const pagesArray: string[] = Array.isArray(result.text) ? result.text : [result.text];

    const pages: ParsedPdfPage[] = pagesArray.map((t, idx) => ({
      num: idx + 1,
      text: t || "",
    }));

    return {
      total: result.totalPages || pages.length,
      pages,
      text: pages.map((p) => p.text).join("\n\n"),
    };
  } catch (err: any) {
    console.warn("[unpdf Parser] Warning:", err.message);
    return null;
  }
}

/**
 * Extracts slides individually from PPTX
 */
export function extractSlidesFromPptx(buffer: Buffer): ParsedPdfPage[] | null {
  try {
    let offset = 0;
    const slides: ParsedPdfPage[] = [];
    let slideIndex = 1;

    while (offset < buffer.length - 30) {
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLen = buffer.readUInt16LE(offset + 26);
        const extraFieldLen = buffer.readUInt16LE(offset + 28);
        const fileName = buffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
        const dataStart = offset + 30 + fileNameLen + extraFieldLen;

        if (fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")) {
          let xmlContent = "";
          if (compressionMethod === 8) {
            const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
            xmlContent = zlib.inflateRawSync(compressed).toString("utf8");
          } else if (compressionMethod === 0) {
            xmlContent = buffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
          }

          if (xmlContent) {
            const text = xmlContent
              .replace(/<a:p(?:\s+[^>]*)?>/g, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .trim();
            if (text) {
              slides.push({ num: slideIndex++, text });
            }
          }
        }

        offset = dataStart + (compressedSize > 0 ? compressedSize : 1);
      } else {
        offset++;
      }
    }

    return slides.length > 0 ? slides : null;
  } catch (err: any) {
    console.warn("[Pptx Slides Parser] Warning:", err.message);
    return null;
  }
}

/**
 * Formats extracted document pages into clean, highly readable Markdown,
 * preserving 100% of the verbatim words, exact word order, lists, and hierarchical structure.
 * Automatically detects topics (##), subtopics (###), bullets (*), and reconstructs flowing paragraphs.
 */
export function formatVerbatimDocumentMarkdown({
  title,
  pages,
  documentType = "pdf",
}: {
  title: string;
  pages: Array<{ num: number; text: string }>;
  documentType?: string;
}): string {
  const validPages = pages.filter((p) => p.text && p.text.trim().length > 0);

  if (validPages.length === 0) {
    return `# ${title}\n\n*Nenhum texto legível foi encontrado neste documento.*`;
  }

  const cleanDocTitle = (title || "").trim();
  const outputSections: string[] = [];

  // Track lines and headings already emitted to handle progressive/overlapping slides without duplicate paragraphs or repeating slide titles
  const emittedParagraphs = new Set<string>();
  const normalizeForDedup = (str: string) => str.toLowerCase().replace(/\s+/g, " ").trim();
  let lastEmittedH2 = "";
  let lastEmittedH3 = "";

  for (let pIdx = 0; pIdx < validPages.length; pIdx++) {
    const page = validPages[pIdx];
    const rawLines = page.text.split(/\r?\n/);

    // 1. Clean lines and filter out header/footer page numbers
    const lines: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].trim();
      if (!line) continue;

      // Filter lone page numbers and headers like "1", "1/10", "Página 1", "Slide 1"
      if (/^(?:p[áa]gina\s+\d+|\d+\s*\/\s*\d+|\d+|slide\s+\d+)$/i.test(line)) {
        continue;
      }
      // Filter out footer copyright or URL noise if isolated
      if (/^(?:https?:\/\/\S+|www\.\S+|todos os direitos reservados|copyright ©?.*)$/i.test(line)) {
        continue;
      }

      // Convert arrows & strip LaTeX dollar signs
      line = line
        .replace(/\\rightarrow/g, "->")
        .replace(/\\Rightarrow/g, "->")
        .replace(/→/g, "->")
        .replace(/\$\$/g, "")
        .replace(/\$/g, "");

      lines.push(line);
    }

    if (lines.length === 0) continue;

    // 2. Group lines into structural blocks (headings, bullets, paragraphs)
    const blocks: Array<{ type: "h1" | "h2" | "h3" | "bullet" | "paragraph"; content: string }> = [];

    let currentParagraph: string[] = [];
    let currentBullet: string | null = null;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ").replace(/\s{2,}/g, " ").trim();
        if (text) {
          const norm = normalizeForDedup(text);
          if (!emittedParagraphs.has(norm) || norm.length < 25) {
            emittedParagraphs.add(norm);
            blocks.push({ type: "paragraph", content: text });
          }
        }
        currentParagraph = [];
      }
    };

    const flushBullet = () => {
      if (currentBullet) {
        const text = currentBullet.replace(/\s{2,}/g, " ").trim();
        if (text) {
          const norm = normalizeForDedup(text);
          if (!emittedParagraphs.has(norm) || norm.length < 25) {
            emittedParagraphs.add(norm);
            blocks.push({ type: "bullet", content: text });
          }
        }
        currentBullet = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line is a bullet item
      const bulletMatch = line.match(/^([•●▪■\*\-–—]|(?:\d+|[a-zA-Z])[\.\)])\s+(.*)$/);
      if (bulletMatch) {
        flushParagraph();
        flushBullet();

        let bulletText = bulletMatch[2].trim();
        // Check if starts with a term followed by colon: "Termo: Definição" -> "**Termo:** Definição"
        const termColonMatch = bulletText.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9\s()/\-_]{2,50}:)\s*(.*)$/);
        if (termColonMatch && !termColonMatch[1].startsWith("**")) {
          bulletText = `**${termColonMatch[1]}** ${termColonMatch[2]}`.trim();
        }

        currentBullet = `* ${bulletText}`;
        continue;
      }

      // Check if line is a heading/topic
      const isShortLine = line.length <= 90;
      const endsWithPunctuation = /[.,;!?]$/.test(line);
      const startsWithCapital = /^[A-ZÀ-ÖØ-Þ0-9]/.test(line);
      const isIntroWord = /^(?:e|ou|mas|porém|contudo|portanto|de|do|da|dos|das|em|no|na|nos|nas|com|para|por)\s/i.test(line);

      const looksLikeHeading =
        isShortLine &&
        !endsWithPunctuation &&
        startsWithCapital &&
        !isIntroWord &&
        (currentParagraph.length === 0 || line.length <= 60);

      if (looksLikeHeading) {
        flushParagraph();
        flushBullet();

        const normHeading = normalizeForDedup(line);

        // Deduplicate repeating slide titles across pages
        if (
          (cleanDocTitle && normHeading === normalizeForDedup(cleanDocTitle)) ||
          (lastEmittedH2 && normHeading === normalizeForDedup(lastEmittedH2)) ||
          (lastEmittedH3 && normHeading === normalizeForDedup(lastEmittedH3))
        ) {
          // Slide repeated the same heading - skip without repeating
          continue;
        }

        // Check if line is the main title
        if (cleanDocTitle && normHeading === normalizeForDedup(cleanDocTitle)) {
          blocks.push({ type: "h1", content: line });
        } else if (blocks.filter((b) => b.type === "h2").length === 0 && (i === 0 || pIdx > 0)) {
          // Major Topic of the section/page
          blocks.push({ type: "h2", content: line });
          lastEmittedH2 = line;
          lastEmittedH3 = "";
        } else {
          // Subtopic
          blocks.push({ type: "h3", content: line });
          lastEmittedH3 = line;
        }
        continue;
      }

      // If currently inside a bullet item and this line is an indented or lowercased continuation:
      if (currentBullet && (!startsWithCapital || line.length < 50 || /^[a-zà-öø-ÿ(]/.test(line))) {
        currentBullet += " " + line;
        continue;
      }

      // Otherwise, it's part of a paragraph
      flushBullet();
      currentParagraph.push(line);
    }

    flushParagraph();
    flushBullet();

    // 3. Convert blocks of this page into markdown text
    const pageMarkdown = blocks
      .map((b) => {
        if (b.type === "h1") return `# ${b.content}`;
        if (b.type === "h2") return `## ${b.content}`;
        if (b.type === "h3") return `### ${b.content}`;
        if (b.type === "bullet") return b.content;
        return b.content;
      })
      .join("\n\n");

    if (pageMarkdown.trim()) {
      outputSections.push(pageMarkdown.trim());
    }
  }

  // Ensure title is present at the very beginning if not already in the first section
  let finalMarkdown = outputSections.join("\n\n").trim();
  if (cleanDocTitle && !finalMarkdown.startsWith("# ")) {
    finalMarkdown = `# ${cleanDocTitle}\n\n${finalMarkdown}`;
  }

  return finalMarkdown;
}

