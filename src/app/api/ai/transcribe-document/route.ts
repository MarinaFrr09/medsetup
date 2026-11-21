import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import {
  extractTextFromDocx,
  extractTextFromPptx,
  extractTextFromPdf,
  extractSlidesFromPptx,
  formatVerbatimDocumentMarkdown,
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

    // Prepare system instructions adhering strictly to the gold-standard medical transcription engine
    const systemPrompt = expand
      ? `${FAITHFUL_TRANSCRIPTION_RULES}

MODO EXTENSÃO E APROFUNDAMENTO ATIVADO:
- Seguindo EXATAMENTE a mesma estrutura limpa acima (## título principal + 1 frase introdutória + ### subseções + tópicos "* **Termo:** Explicação completa" com subtópicos recuados "  * "), aprofunde cada mecanismo fisiopatológico, farmacológico e correlação clínica com rigor de tratado médico, mantendo a organização hierárquica impecável.

Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título Representativo e Formal do Tema (máximo 6 palavras)",
  "summary": "Uma única frase neutra descrevendo o tema do material",
  "transcription": "Texto integral da Transcrição Estruturada e Expandida em Markdown puro seguindo exatamente a hierarquia acima...",
  "keyPoints": [
    "Ponto-chave essencial 1",
    "Ponto-chave essencial 2",
    "Ponto-chave essencial 3",
    "Ponto-chave essencial 4"
  ]
}`
      : `${FAITHFUL_TRANSCRIPTION_RULES}

Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título do Documento (máximo 6 palavras, baseado no título dos slides)",
  "transcription": "Transcrição ESTRUTURADA e COMPLETA em Markdown seguindo rigorosamente a hierarquia acima (## tema principal + frase introdutória, ### subseções, tópicos * **Termo:** explicação fluida e subtópicos recuados   * )...",
  "summary": "Uma única frase neutra descrevendo o tema do material (NÃO faz parte da transcrição)",
  "keyPoints": [
    "Ponto-chave 1",
    "Ponto-chave 2",
    "Ponto-chave 3",
    "Ponto-chave 4"
  ]
}`;

    const nonDigitalDocs = extractedDocs.filter((d) => !d.hasDigitalText);
    // In faithful mode, also send digital PDFs visually so the model can see bold/colored emphasis,
    // bullet indentation levels and figures exactly as in the original slides.
    const visualPdfDocs = !expand
      ? digitalDocs.filter((d) => d.ext === "pdf" && d.buffer.length <= 18 * 1024 * 1024)
      : [];
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
      userPrompt = expand
        ? `Transcreva e aprofunde todo o documento/slides abaixo seguindo rigorosamente o modelo hierárquico limpo (## tema principal unificado + 1 frase introdutória, ### subseções, tópicos "* **Termo:** explicação fluida e completa" e subtópicos recuados "  * "), sem omitir nenhum dado e sem repetir títulos de slides:\n\n${perPageText}`
        : `Transcreva e estruture TODO o conteúdo do documento/slides abaixo seguindo rigorosamente o modelo hierárquico limpo (## tema principal unificado + 1 frase introdutória, ### subseções, tópicos "* **Termo:** explicação fluida e completa" e subtópicos recuados "  * "), sem omitir nenhum dado, número ou mecanismo. ${
            visualPdfDocs.length > 0
              ? "O PDF original está anexado: use-o como referência visual para identificar títulos, subtítulos, hierarquia dos tópicos/subtópicos, negritos, destaques e figuras. "
              : ""
          }Os marcadores [[ SLIDE/PÁGINA N ]] servem apenas para sua orientação e NÃO devem aparecer na saída:\n\n${perPageText}`;
    } else {
      userPrompt = expand
        ? `Transcreva e aprofunde todo o documento anexado seguindo rigorosamente o modelo hierárquico limpo (## tema principal unificado + 1 frase introdutória, ### subseções, tópicos "* **Termo:** explicação fluida" e subtópicos recuados "  * ").`
        : `Transcreva e estruture integralmente o documento anexado seguindo rigorosamente o modelo hierárquico limpo (## tema principal unificado + 1 frase introdutória, ### subseções, tópicos "* **Termo:** explicação fluida" e subtópicos recuados "  * "), sem omitir nenhum dado.`;
    }

    let result: any = null;
    try {
      result = await generateJSONFromAI({
        systemPrompt,
        userPrompt,
        fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        maxOutputTokens: 65536,
        temperature: expand ? 0.3 : 0.1,
        keepPdfBinary: !expand && visualPdfDocs.length > 0,
      });
    } catch (aiErr: any) {
      console.warn("[transcribe-document] AI generation error:", aiErr?.message);
      if (digitalDocs.length > 0) {
        result = {
          title: fallbackTitle,
          transcription: "",
          summary: "",
          keyPoints: ["Documento transcrito com base no conteúdo textual integral do arquivo."],
        };
      } else {
        throw aiErr;
      }
    }

    // 1. Gera a Transcrição Fiel Integral como fallback de segurança
    let verbatimTranscription = "";
    if (digitalDocs.length > 0) {
      const allPages: Array<{ num: number; text: string }> = [];
      let pageNumCounter = 1;
      for (const d of digitalDocs) {
        for (const p of d.pages) {
          allPages.push({ num: pageNumCounter++, text: p.text });
        }
      }

      verbatimTranscription = formatVerbatimDocumentMarkdown({
        title: result.title || fallbackTitle,
        pages: allPages,
        documentType: firstDoc?.ext || "pdf",
      });
    }

    const genTrans = (result?.transcription || "").trim();
    const genSum = (result?.summary || "").trim();

    // Ensure finalTranscription is ALWAYS the longest, most comprehensive text generated
    let finalTranscription = "";
    if (genTrans.length >= genSum.length && genTrans.length > 50) {
      finalTranscription = genTrans;
    } else if (genSum.length > genTrans.length && genSum.length > 50) {
      finalTranscription = genSum;
    } else if (genTrans.length > 0) {
      finalTranscription = genTrans;
    } else if (verbatimTranscription) {
      finalTranscription = verbatimTranscription;
    }

    let rawSummary = (genSum && genSum.length < finalTranscription.length && genSum.length > 0)
      ? genSum
      : (genTrans && genTrans.length < finalTranscription.length && genTrans.length > 0)
      ? genTrans
      : finalTranscription.slice(0, 500) + "...";

    // Standardize text arrows & eliminate residual LaTeX dollar signs (ResumoPro engine)
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

    finalTranscription = sanitizeText(finalTranscription);
    rawSummary = sanitizeText(rawSummary);

    const finalWordCount = finalTranscription.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      title: result.title || fallbackTitle,
      transcription: finalTranscription,
      summary: rawSummary,
      keyPoints: Array.isArray(result.keyPoints) && result.keyPoints.length > 0 ? result.keyPoints : [],
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

