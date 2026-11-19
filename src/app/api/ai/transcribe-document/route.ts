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
      ? `Você é um professor titular e pesquisador sênior em medicina, biologia celular e fisiopatologia.
O usuário enviou um material didático (slides em PDF/PPTX ou documento de estudo) que frequentemente apresenta tópicos telegráficos, fragmentados e rasos.

SUA MISSÃO MANDATÓRIA (MODO EXTENSÃO E APROFUNDAMENTO ATIVADO):
Transformar esses slides ou notas em um Guia Médico de Referência Definitivo, com MÁXIMO NÍVEL DE PROFUNDIDADE CIENTÍFICA, ELEGÂNCIA ACADÊMICA E RIGOR FISIOPATOLÓGICO/FARMACOLÓGICO.

REGRA DE OURO INVIOLÁVEL DE FORMATAÇÃO:
1. PREFIRA TEXTO FLUIDO EM PARÁGRAFOS E SUBTÍTULOS (### e ####):
   - Escreva as explicações fisiopatológicas, clínicas, diagnósticas e farmacológicas em parágrafos corridos, coesos e bem estruturados (podendo destacar o termo inicial em negrito no próprio parágrafo, ex: "**Controle Pressórico Pré-Gestacional:** Mulheres com hipertensão arterial crônica devem...").
   - Use subtítulos (` + "`###`" + ` para seções principais e ` + "`####`" + ` para subdivisões como "#### Aspectos Pré-Natais Essenciais", "#### Medicações de Primeira Linha").
2. USO RESTRITO DE MARCADORES (BOLINHAS / BULLETS):
   - Use marcadores (` + "`* `" + `) APENAS QUANDO ESTRITAMENTE NECESSÁRIO para listas curtas e pontuais de itens enumerados (ex: parâmetros pontuais de monitoramento, periodicidade de consultas, critérios pontuais).
   - É TERMINANTEMENTE PROIBIDO transformar o documento inteiro em uma lista interminável de bolinhas (` + "`•`" + `) ou usar setas (` + "`->`" + `) em cada frase.
   - NUNCA coloque um subtítulo como marcador vazio com seta (ex: NUNCA escreva "- **Medicações de Primeira Linha** ->"; escreva "#### Medicações de Primeira Linha").
3. DESDUPLICAÇÃO, HIERARQUIA LIMPA E ORDEM FINAL (CASO CLÍNICO -> QUESTÕES):
   - NUNCA repita o mesmo título de slide ou página (ex: se vários slides se chamam "Chumbo - Toxicodinâmica", use esse título APENAS UMA VEZ e agrupe todo o conteúdo sob ele).
   - NUNCA transforme frases explicativas, consequências com setas ("Menor produção de heme -> menor síntese..."), definições ("Heme: pequena molécula..."), frases terminadas em dois-pontos ("O chumbo aumenta ROS porque:") ou linhas de tabela ("Inibe antioxidantes / Radicais livres se acumulam") em títulos grandes (## ou ###)! Use títulos (## e ###) ESTRITAMENTE para nomes curtos de seções temáticas reais.
   - NUNCA coloque linhas divisórias horizontais (---) após os tópicos.
   - ORDEM OBRIGATÓRIA DO DOCUMENTO:
     1º) Todo o conteúdo teórico unificado do documento;
     2º) O Caso Clínico (se houver caso clínico no documento, coloque-o após todo o conteúdo teórico);
     3º) As Questões / Perguntas / Exercícios do documento DEVEM OBRIGATORIAMENTE FICAR AO FINAL ABSOLUTO DO DOCUMENTO, DEPOIS DO CASO CLÍNICO!
   - NUNCA escreva "Slide 1", "Página 1", "Slide 2", etc.
4. EXTENSÃO FISIOPATOLÓGICA E FARMACOLÓGICA:
   - Aprofunde com mecanismos celulares/moleculares, vias de sinalização, receptores e enzimas em parágrafos claros.
   - Inclua correlações clínicas e opções terapêuticas detalhadas.
5. INTEGRAÇÃO VISUAL DE DIAGRAMAS E IMAGENS:
   - Se os slides contiverem figuras, esquemas anatômicos, desenhos ou fluxogramas, incorpore suas informações e descrições diretamente no texto.
6. PROIBIDO LATEX:
   - NUNCA use cifras de dólar ($). Use texto puro: '<=', '>=', '+/-'.

Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título Representativo e Formal do Tema (máximo 6 palavras)",
  "summary": "Texto integral da Transcrição Estruturada e Expandida em Markdown puro...",
  "transcription": "Texto integral da Transcrição Estruturada e Expandida em Markdown puro...",
  "keyPoints": [
    "Ponto-chave essencial 1",
    "Ponto-chave essencial 2",
    "Ponto-chave essencial 3",
    "Ponto-chave essencial 4"
  ]
}`
      : `Você é um especialista em medicina e transcrição médica acadêmica de alto rendimento.
O usuário enviou um material didático (slides em PDF/PPTX ou documento de estudo) que frequentemente apresenta tópicos telegráficos, fragmentados e rasos.

REGRA DE OURO INVIOLÁVEL DE FORMATAÇÃO E CONTEÚDO:
1. PREFIRA PARÁGRAFOS FLUIDOS E SUBTÍTULOS (### e ####):
   - Sintetize e contextualize os tópicos dos slides em parágrafos clínicos fluidos, completos e bem redigidos (ex: "**Controle Pressórico Pré-Gestacional:** Mulheres com HAC devem..." como parágrafo normal, sem bolinha).
   - Para divisões temáticas, use subtítulos (` + "`###`" + ` e ` + "`####`" + `, ex: "#### Aspectos Pré-Natais Essenciais", "#### Tratamento Farmacológico").
2. USO RESTRITO DE MARCADORES (BOLINHAS / BULLETS):
   - Use marcadores (` + "`* `" + `) APENAS QUANDO ESTRITAMENTE NECESSÁRIO para pequenas enumerações pontuais (ex: itens curtos de exame físico, periodicidade de consultas, critérios pontuais).
   - NÃO transforme todo o texto em marcadores com bolinhas e NÃO use setas (` + "`->`" + `) repetitivas em todas as linhas.
   - NUNCA crie marcadores vazios com seta para títulos (ex: jamais faça "- **Medicações de Primeira Linha** ->"; use "#### Medicações de Primeira Linha").
3. DESDUPLICAÇÃO, HIERARQUIA LIMPA E ORDEM FINAL (CASO CLÍNICO -> QUESTÕES):
   - NUNCA repita o mesmo título de slide ou página (se vários slides têm o mesmo cabeçalho como "Chumbo - Toxicodinâmica", una-os sob um único título sem repetir).
   - NUNCA transforme frases explicativas, consequências com setas ("Menor produção de heme -> ..."), definições ("Heme: pequena molécula..."), frases terminadas em dois-pontos ("O chumbo aumenta ROS porque:") ou linhas de tabela ("Inibe antioxidantes...") em títulos grandes (## ou ###)! Use títulos (## e ###) ESTRITAMENTE para nomes curtos de seções temáticas reais.
   - NUNCA coloque linhas divisórias horizontais (---) após os tópicos.
   - ORDEM OBRIGATÓRIA DO DOCUMENTO:
     1º) Todo o conteúdo teórico unificado do documento;
     2º) O Caso Clínico (se houver caso clínico no documento, coloque-o após todo o conteúdo teórico);
     3º) As Questões / Perguntas / Exercícios do documento DEVEM OBRIGATORIAMENTE FICAR AO FINAL ABSOLUTO DO DOCUMENTO, DEPOIS DO CASO CLÍNICO!
   - NUNCA escreva "Slide 1", "Página 1", etc.
4. INTEGRAÇÃO VISUAL DE DIAGRAMAS E IMAGENS:
   - Se os slides contiverem figuras, esquemas anatômicos, desenhos ou fluxogramas, incorpore suas informações diretamente na explicação.
5. PROIBIDO LATEX:
   - NUNCA use cifras de dólar ($). Use texto puro: '<=', '>=', '+/-'.

Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título do Documento (máximo 6 palavras)",
  "transcription": "Transcrição COMPLETA e ESTRUTURADA em Markdown puro com subtítulos ###/####, parágrafos fluidos e uso mínimo de marcadores (apenas quando necessário)...",
  "summary": "Breve síntese executiva introdutória...",
  "keyPoints": [
    "Ponto-chave 1",
    "Ponto-chave 2",
    "Ponto-chave 3",
    "Ponto-chave 4"
  ]
}`;

    const nonDigitalDocs = extractedDocs.filter((d) => !d.hasDigitalText);
    const docsToAttach = digitalDocs.length > 0 ? nonDigitalDocs : extractedDocs;

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
      const allExtractedText = digitalDocs.map((d) => d.fullText).join("\n\n");
      userPrompt = expand
        ? `Transcreva e aprofunde todo o documento/slides abaixo com parágrafos acadêmicos fluidos e subtítulos organizados (### e ####), usando marcadores com bolinhas APENAS quando estritamente necessário para listas curtas e eliminando repetições de títulos de slides:\n\n${allExtractedText}`
        : `Transcreva todo o documento/slides abaixo de forma organizada com parágrafos fluidos e subtítulos (### e ####), usando marcadores com bolinhas APENAS quando estritamente necessário para listas curtas e eliminando fragmentos rasos de slide:\n\n${allExtractedText}`;
    } else {
      userPrompt = expand
        ? `Transcreva e aprofunde todo o documento anexado com parágrafos acadêmicos fluidos e subtítulos organizados (### e ####), usando marcadores com bolinhas APENAS quando estritamente necessário para listas curtas.`
        : `Transcreva todo o documento anexado de forma organizada com parágrafos fluidos e subtítulos (### e ####), usando marcadores com bolinhas APENAS quando estritamente necessário para listas curtas.`;
    }

    let result: any = null;
    try {
      result = await generateJSONFromAI({
        systemPrompt,
        userPrompt,
        fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        maxOutputTokens: 65536,
        temperature: 0.3,
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

