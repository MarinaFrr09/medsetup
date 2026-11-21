import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import {
  extractTextFromDocx,
  extractTextFromPptx,
  extractTextFromPdf,
  extractSlidesFromPptx,
} from "@/lib/document-parser";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cleanLatexAndBadges } from "@/lib/text-sanitize";
import { reduceExcessiveBulletsInTranscription } from "@/lib/rich-text-utils";
import { FAITHFUL_TRANSCRIPTION_RULES } from "@/lib/transcription-prompts";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

interface ExtractedDoc {
  name: string;
  ext: string;
  totalPages: number;
  pages: Array<{ num: number; text: string }>;
  fullText: string;
  hasDigitalText: boolean;
  buffer: Buffer;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const expand = formData.get("expand") === "true";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum documento foi enviado para transcrição." },
        { status: 400 }
      );
    }

    const uploadedFiles: Array<{ name: string; url: string; size: number; type: string }> = [];
    const extractedDocs: ExtractedDoc[] = [];

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true }).catch(() => {});

    for (const file of files) {
      if (file.size === 0) continue;

      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const ext = (file.name || "").toLowerCase().split(".").pop() || "";

      // Persist file copy to public/uploads
      try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}-${safeName}`;
        const filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        uploadedFiles.push({
          name: file.name,
          url: `/uploads/${fileName}`,
          size: file.size,
          type: file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream"),
        });
      } catch (err) {
        console.warn("Could not persist file to uploads folder:", err);
      }

      // 1. PDF: extrair texto digital integral página por página
      if (ext === "pdf" || file.type === "application/pdf") {
        const pdfData = await extractTextFromPdf(buffer);
        if (pdfData && pdfData.text && pdfData.text.trim().length > 30) {
          extractedDocs.push({
            name: file.name,
            ext: "pdf",
            totalPages: pdfData.total,
            pages: pdfData.pages,
            fullText: pdfData.text,
            hasDigitalText: true,
            buffer,
          });
          continue;
        }
      }

      // 2. PPTX: extrair slides individualmente
      if (ext === "pptx") {
        const slides = extractSlidesFromPptx(buffer);
        if (slides && slides.length > 0) {
          const fullText = slides.map((s) => s.text).join("\n\n");
          extractedDocs.push({
            name: file.name,
            ext: "pptx",
            totalPages: slides.length,
            pages: slides,
            fullText,
            hasDigitalText: true,
            buffer,
          });
          continue;
        }
      }

      // 3. Word (.docx): extrair texto limpo de parágrafos e tabelas
      if (ext === "docx") {
        const docxText = extractTextFromDocx(buffer);
        if (docxText && docxText.trim().length > 0) {
          extractedDocs.push({
            name: file.name,
            ext: "docx",
            totalPages: 1,
            pages: [{ num: 1, text: docxText }],
            fullText: docxText,
            hasDigitalText: true,
            buffer,
          });
          continue;
        }
      }

      // 4. TXT / Markdown / RTF
      if (ext === "txt" || ext === "rtf" || ext === "md" || file.type.startsWith("text/")) {
        const text = buffer.toString("utf8");
        if (text.trim().length > 0) {
          extractedDocs.push({
            name: file.name,
            ext: "txt",
            totalPages: 1,
            pages: [{ num: 1, text }],
            fullText: text,
            hasDigitalText: true,
            buffer,
          });
          continue;
        }
      }

      // 5. Scanned / Imagem / Fallback
      extractedDocs.push({
        name: file.name,
        ext,
        totalPages: 1,
        pages: [],
        fullText: "",
        hasDigitalText: false,
        buffer,
      });
    }

    // Digital docs filter
    const digitalDocs = extractedDocs.filter((d) => d.hasDigitalText);

    let totalPages = 0;
    let totalWords = 0;
    for (const doc of extractedDocs) {
      totalPages += doc.totalPages || 1;
      const w = (doc.fullText || "").split(/\s+/).filter(Boolean).length;
      totalWords += w;
    }

    const firstDoc = extractedDocs[0];
    const fallbackTitle = (firstDoc?.name || "Documento de Estudo")
      .replace(/\.[^/.]+$/, "")
      .replace(/^[0-9]+[_-]/, "")
      .replace(/[_-]/g, " ")
      .trim();

    // Pure Markdown output (never wrapped in JSON) to avoid JSON truncation/escaping errors on long PDFs
    const systemPrompt = expand
      ? `${FAITHFUL_TRANSCRIPTION_RULES}

MODO APROFUNDAMENTO MÁXIMO ATIVADO:
- Aprofunde ainda mais os mecanismos fisiopatológicos, farmacológicos e correlações clínicas, mantendo a mesma organização limpa (## Objetivos com 5 itens curtos -> conteúdo na ordem do PDF -> ## Questões sem duplicatas e com a resposta correta em negrito no final).`
      : FAITHFUL_TRANSCRIPTION_RULES;

    const nonDigitalDocs = extractedDocs.filter((d) => !d.hasDigitalText);
    // Also send digital PDFs visually (up to 18MB) so the model can see bold emphasis, figures & layout
    const visualPdfDocs = digitalDocs.filter((d) => d.ext === "pdf" && d.buffer.length <= 18 * 1024 * 1024);
    const docsToAttach =
      digitalDocs.length > 0 ? [...nonDigitalDocs, ...visualPdfDocs] : extractedDocs;

    const fileAttachments: Array<{ data: string; mimeType: string; name: string }> = [];
    for (const doc of docsToAttach) {
      const mime =
        doc.ext === "pdf"
          ? "application/pdf"
          : doc.ext === "png"
          ? "image/png"
          : doc.ext === "jpg" || doc.ext === "jpeg"
          ? "image/jpeg"
          : "application/octet-stream";

      fileAttachments.push({
        data: doc.buffer.toString("base64"),
        mimeType: mime,
        name: doc.name,
      });
    }

    let userPrompt = "";
    if (digitalDocs.length > 0) {
      const perPageText = digitalDocs
        .map((d) =>
          d.pages.length > 1
            ? d.pages.map((p) => `[[ SLIDE/PÁGINA ${p.num} ]]\n${p.text}`).join("\n\n")
            : d.fullText
        )
        .join("\n\n");
      userPrompt = `Transcreva, organize e detalhe todo o conteúdo do documento abaixo em Markdown puro, seguindo a ordem original do PDF, começando com "# Título" e "## Objetivos" (5 objetivos curtos de até 3 linhas), preservando todas as frases e dados do PDF com detalhamentos importantes, sem metadados administrativos (Facilitador, TBL, Turma, Páginas, Bibliografia) e reunindo todas as questões SEM REPETIÇÃO no final sob "## Questões" com a alternativa correta em negrito.${
        visualPdfDocs.length > 0
          ? " O PDF original está anexado como referência visual para hierarquia, negritos e figuras."
          : ""
      } Os marcadores [[ SLIDE/PÁGINA N ]] servem apenas para orientação e NÃO devem aparecer na saída:\n\n${perPageText}`;
    } else {
      userPrompt = `Transcreva, organize e detalhe integralmente o documento anexado em Markdown puro, seguindo a ordem original do arquivo, começando com "# Título" e "## Objetivos" (5 objetivos curtos de até 3 linhas), preservando todos os dados com detalhamentos importantes e reunindo todas as questões SEM REPETIÇÃO no final sob "## Questões" com a alternativa correta em negrito.`;
    }

    const aiResponse = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
      fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
      maxOutputTokens: 65536,
      temperature: expand ? 0.35 : 0.2,
      keepPdfBinary: visualPdfDocs.length > 0,
      rawText: true,
    });

    let rawMarkdown = String(aiResponse?.text || "").trim();
    // Strip accidental ```markdown fences if model added them
    rawMarkdown = rawMarkdown.replace(/^```(?:markdown|md)?\s*\n/i, "").replace(/\n```\s*$/i, "").trim();

    // Extract title from first "# Title" line if present
    let extractedTitle = fallbackTitle;
    const h1Match = rawMarkdown.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) {
      extractedTitle = h1Match[1].replace(/\*\*/g, "").trim();
      rawMarkdown = rawMarkdown.replace(/^#\s+.+\n?/, "").trim();
    }

    // Standardize text arrows & eliminate residual LaTeX dollar signs
    const sanitizeText = (txt: string) => {
      let t = txt
        .replace(/\\rightarrow/g, "->")
        .replace(/\\Rightarrow/g, "->")
        .replace(/→/g, "->")
        .replace(/\$\$/g, "")
        .replace(/\$/g, "");
      t = cleanLatexAndBadges(t);
      const filtered = t
        .split("\n")
        .filter((line: string) => !/^(?:#{1,6}\s+|\*\*)?P[áa]gina\s+\d+(?:\*\*)?\s*$/i.test(line.trim()))
        .join("\n");
      return reduceExcessiveBulletsInTranscription(filtered);
    };

    const finalTranscription = sanitizeText(rawMarkdown);
    const firstParagraph = finalTranscription
      .split("\n")
      .find((l) => l.trim().length > 40 && !/^[#*\d]/.test(l.trim())) || extractedTitle;

    const finalWordCount = finalTranscription.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      title: extractedTitle,
      transcription: finalTranscription,
      summary: firstParagraph.slice(0, 320),
      keyPoints: [],
      pageCount: totalPages,
      wordCount: finalWordCount || totalWords,
      expanded: expand,
      files: uploadedFiles,
    });
  } catch (error: any) {
    console.error("Document transcription API error:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao transcrever o documento com a IA." },
      { status: 500 }
    );
  }
}

