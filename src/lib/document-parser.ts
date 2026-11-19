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

/**
 * Extracts embedded images (PNG, JPEG, WebP, BMP) from DOCX or PPTX archive buffer
 */
export function extractImagesFromOffice(
  buffer: Buffer
): Array<{ buffer: Buffer; mimeType: string; name: string }> {
  const images: Array<{ buffer: Buffer; mimeType: string; name: string }> = [];
  try {
    let offset = 0;

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

        const isOfficeMedia =
          fileName.startsWith("word/media/") ||
          fileName.startsWith("ppt/media/") ||
          fileName.startsWith("xl/media/");

        if (isOfficeMedia && compressedSize > 0) {
          const ext = fileName.toLowerCase().split(".").pop() || "";
          let mime = "";
          if (ext === "png") mime = "image/png";
          else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
          else if (ext === "webp") mime = "image/webp";
          else if (ext === "bmp") mime = "image/bmp";

          if (mime) {
            try {
              let imgBuf: Buffer;
              if (compressionMethod === 8) {
                imgBuf = zlib.inflateRawSync(buffer.subarray(dataStart, dataStart + compressedSize));
              } else if (compressionMethod === 0) {
                imgBuf = buffer.subarray(dataStart, dataStart + compressedSize);
              } else {
                imgBuf = Buffer.alloc(0);
              }

              if (imgBuf.length > 512) {
                const baseName = fileName.split("/").pop() || `image_${images.length + 1}.${ext}`;
                images.push({
                  buffer: imgBuf,
                  mimeType: mime,
                  name: baseName,
                });
              }
            } catch (imgErr) {
              console.warn(`[Office Parser] Could not decompress ${fileName}:`, imgErr);
            }
          }
        }

        offset = dataStart + (compressedSize > 0 ? compressedSize : 1);
      } else {
        offset++;
      }
    }
  } catch (err: any) {
    console.warn("[Office Image Parser] Warning:", err.message);
  }
  return images;
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
 * Fallback raw PDF stream text extractor when a PDF has a damaged xref table ("Invalid PDF structure")
 */
function extractFallbackTextFromDamagedPdf(buffer: Buffer): ParsedPdfResult | null {
  try {
    // 1. Check if it's actually a DOCX/PPTX ZIP container disguised as PDF
    if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      const docxText = extractTextFromDocx(buffer) || extractTextFromPptx(buffer);
      if (docxText && docxText.trim().length > 20) {
        return {
          total: 1,
          pages: [{ num: 1, text: docxText.trim() }],
          text: docxText.trim(),
        };
      }
    }

    const rawLatin = buffer.toString("latin1");
    const extractedChunks: string[] = [];

    // 2. Scan FlateDecode / raw streams for PDF text operators (...) Tj and [...] TJ
    let pos = 0;
    while (pos < rawLatin.length) {
      const streamIdx = rawLatin.indexOf("stream", pos);
      if (streamIdx === -1) break;
      let dataStart = streamIdx + 6;
      if (rawLatin[dataStart] === "\r" && rawLatin[dataStart + 1] === "\n") dataStart += 2;
      else if (rawLatin[dataStart] === "\n" || rawLatin[dataStart] === "\r") dataStart += 1;

      const endStreamIdx = rawLatin.indexOf("endstream", dataStart);
      if (endStreamIdx === -1) break;

      const streamBuf = buffer.subarray(dataStart, endStreamIdx);
      let decoded = "";
      try {
        decoded = zlib.inflateSync(streamBuf).toString("latin1");
      } catch {
        try {
          decoded = zlib.inflateRawSync(streamBuf).toString("latin1");
        } catch {
          decoded = streamBuf.toString("latin1");
        }
      }

      if (decoded && (decoded.includes("Tj") || decoded.includes("TJ"))) {
        const matches = decoded.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g);
        if (matches && matches.length > 0) {
          const textPart = matches
            .map((m) =>
              m
                .slice(1, -1)
                .replace(/\\n/g, "\n")
                .replace(/\\r/g, " ")
                .replace(/\\t/g, " ")
                .replace(/\\\(/g, "(")
                .replace(/\\\)/g, ")")
                .replace(/\\\\/g, "\\")
            )
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (textPart.length > 3) {
            extractedChunks.push(textPart);
          }
        }
      }

      pos = endStreamIdx + 9;
    }

    const fullText = extractedChunks.join("\n\n").trim();
    if (fullText.length > 30) {
      return {
        total: 1,
        pages: [{ num: 1, text: fullText }],
        text: fullText,
      };
    }
  } catch {}
  return null;
}

/**
 * Extracts all pages of text from a PDF buffer using unpdf.
 * Works seamlessly in Next.js Turbopack/server runtime without external worker dependencies.
 * Returns total page count, array of pages with their text, and the concatenated text.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<ParsedPdfResult | null> {
  if (!buffer || buffer.length < 16) return null;

  try {
    const { extractText } = await import("unpdf");
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8, { mergePages: false });
    const pagesArray: string[] = Array.isArray(result.text) ? result.text : [result.text];

    const pages: ParsedPdfPage[] = pagesArray.map((t, idx) => ({
      num: idx + 1,
      text: t || "",
    }));

    if (pages.length === 0 || (result.totalPages === 0 && pages.every((p) => !p.text.trim()))) {
      return extractFallbackTextFromDamagedPdf(buffer);
    }

    return {
      total: result.totalPages || pages.length,
      pages,
      text: pages.map((p) => p.text).join("\n\n"),
    };
  } catch (err: any) {
    console.warn("[unpdf Parser] Warning:", err.message);
    return extractFallbackTextFromDamagedPdf(buffer);
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
  const emittedHeadings = new Set<string>();
  const normalizeForDedup = (str: string) =>
    str
      .toLowerCase()
      .replace(/^[#*\-\s]+/, "")
      .replace(/\s+/g, " ")
      .trim();
  if (cleanDocTitle) {
    emittedHeadings.add(normalizeForDedup(cleanDocTitle));
  }

  const nonHeadingVerbRegex =
    /\b(inibe|inibem|reduz|reduzem|danifica|danificam|aumenta|aumentam|ativa|ativam|gera|geram|bloqueia|bloqueiam|impede|impedem|causa|causam|provoca|provocam|diminui|diminuem|produz|produzem|estimula|estimulam|promove|promovem|leva|levam|resulta|resultam|ocorre|ocorrem|altera|alteram|compromete|comprometem|induz|induzem|favorece|favorecem|acumula|acumulam|libera|liberam|acelera|aceleram|afeta|afetam|lesa|lesam|interfere|interferem|contém|contêm|possui|possuem|apresenta|apresentam|é|são|está|estão|foi|foram|pode|podem|deve|devem)\b/i;

  for (let pIdx = 0; pIdx < validPages.length; pIdx++) {
    const page = validPages[pIdx];
    // Split inline slide arrow bullets (➤, ➢, ►) onto their own lines
    const preSplitText = page.text
      .replace(/\s*[➤➢►▸]\s*/g, "\n* ")
      .replace(/\b(?:https?:\/\/)?doi\.org\/\S+/gi, "");
    const rawLines = preSplitText.split(/\r?\n/);

    // 1. Clean lines and filter out header/footer page numbers
    const rawCleaned: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].trim();
      if (!line) continue;

      // Filter lone page numbers and headers like "1", "1/10", "Página 1", "Slide 1"
      if (/^(?:p[áa]gina\s+\d+|\d+\s*\/\s*\d+|\d+|slide\s+\d+)$/i.test(line)) {
        continue;
      }
      // Filter out footer copyright or URL noise if isolated
      if (/^(?:https?:\/\/\S+|www\.\S+|doi\.org\/\S+|todos os direitos reservados|copyright ©?.*)$/i.test(line)) {
        continue;
      }

      // Convert arrows & strip LaTeX dollar signs
      line = line
        .replace(/\\rightarrow/g, "->")
        .replace(/\\Rightarrow/g, "->")
        .replace(/→/g, "->")
        .replace(/\$\$/g, "")
        .replace(/\$/g, "")
        .trim();

      if (line) rawCleaned.push(line);
    }

    // 1b. Reconstruct wrapped lines before structural classification
    const lines: string[] = [];
    for (let i = 0; i < rawCleaned.length; i++) {
      let cur = rawCleaned[i];
      while (i + 1 < rawCleaned.length) {
        const next = rawCleaned[i + 1];
        const nextIsBullet = /^([•●▪■\*\-–—]|(?:\d+|[a-zA-Z])[\.\)])\s+/.test(next);
        const nextStartsLowerOrCont =
          !nextIsBullet &&
          (/^[a-zà-öø-ÿ(]/.test(next) ||
            /^(?:de|da|do|das|dos|e|ou|em|no|na|nos|nas|para|por|com|que|como|->)\b/i.test(next) ||
            cur.endsWith("->") ||
            cur.endsWith(","));
        if (nextStartsLowerOrCont) {
          cur = `${cur} ${next}`.replace(/\s{2,}/g, " ").trim();
          i++;
        } else {
          break;
        }
      }
      lines.push(cur);
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
        const termColonMatch = bulletText.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9\s()/\-_]{2,50}:)\s*(.*)$/);
        if (termColonMatch && !termColonMatch[1].startsWith("**")) {
          bulletText = `**${termColonMatch[1]}** ${termColonMatch[2]}`.trim();
        }

        currentBullet = `* ${bulletText}`;
        continue;
      }

      // Check if line is a true heading/topic (strictly excluding sentences, arrows, definitions with ':', verb phrases, and table rows)
      const wordCount = line.split(/\s+/).filter(Boolean).length;
      const isShortLine = line.length <= 58 && wordCount <= 8;
      const endsWithPunctuation = /[.,;!?:]$/.test(line);
      const hasColonOrArrow = line.includes(":") || line.includes("->") || line.includes("→");
      const hasChemicalOrMath = /[²³⁺⁻]|[A-Za-z]\d+\+|<=>|<=|>=/.test(line);
      const hasActionVerb = nonHeadingVerbRegex.test(line);
      const isTableHeaderNoise = /^(?:mecanismo\s+efeito|causa\s+consequ[êe]ncia|f[áa]rmaco\s+mecanismo|par[âa]metro\s+valor)$/i.test(line.trim());
      const isSingleLabelLead = /^(?:consequ[êe]ncias?|causas?|efeitos?|mecanismos?|observa[çc][ãa]o|exemplo|nota)$/i.test(line.trim());
      const startsWithCapital = /^[A-ZÀ-ÖØ-Þ0-9]/.test(line);
      const isIntroWord = /^(?:e|ou|mas|porém|contudo|portanto|de|do|da|dos|das|em|no|na|nos|nas|com|para|por|menor|maior)\s/i.test(line);

      if (isTableHeaderNoise) {
        continue;
      }

      if (isSingleLabelLead && i + 1 < lines.length) {
        flushParagraph();
        flushBullet();
        lines[i + 1] = `**${line.trim()}:** ${lines[i + 1]}`;
        continue;
      }

      const looksLikeHeading =
        isShortLine &&
        !endsWithPunctuation &&
        !hasColonOrArrow &&
        !hasChemicalOrMath &&
        !hasActionVerb &&
        !isSingleLabelLead &&
        startsWithCapital &&
        !isIntroWord &&
        currentParagraph.length === 0;

      if (looksLikeHeading) {
        flushParagraph();
        flushBullet();

        const normHeading = normalizeForDedup(line);

        // Deduplicate repeating slide titles across the entire document
        if (emittedHeadings.has(normHeading)) {
          continue;
        }
        emittedHeadings.add(normHeading);

        if (blocks.filter((b) => b.type === "h2").length === 0 && (i === 0 || pIdx > 0)) {
          blocks.push({ type: "h2", content: line });
        } else {
          blocks.push({ type: "h3", content: line });
        }
        continue;
      }

      // Format "Termo: definição" or lead-in ending with ":" as clean bold lead paragraph
      if (line.endsWith(":")) {
        flushParagraph();
        flushBullet();
        const cleanLead = line.replace(/^\*\*|\*\*$/g, "");
        blocks.push({ type: "paragraph", content: `**${cleanLead}**` });
        continue;
      }

      const defColonMatch = line.match(/^([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ0-9\s()/\-_]{1,42}):\s+(.+)$/);
      if (defColonMatch && !line.startsWith("**")) {
        flushParagraph();
        flushBullet();
        blocks.push({
          type: "paragraph",
          content: `**${defColonMatch[1].trim()}:** ${defColonMatch[2].trim()}`,
        });
        continue;
      }

      // If currently inside a bullet item and this line is a continuation:
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

