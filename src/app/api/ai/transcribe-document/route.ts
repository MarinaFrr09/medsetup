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

REGRA DE OURO INVIOLÁVEL: A TRANSCRIÇÃO NUNCA PODE SER RASA!
É TERMINANTEMENTE PROIBIDO apenas copiar marcadores telegráficos de slides. Cada tópico deve ser convertido em uma explicação médica estruturada, profunda e detalhada.

EXEMPLO DE REFERÊNCIA OBRIGATÓRIO (SIGA ESTRITAMENTE ESTE PADRÃO DE ESTRUTURA):
[Entrada típica de slides em PDF com notas rasas/telegráficas]:
Slide 1:
"Deve estar ancorado em um tripé:
- Exame clínico
- Exame de imagem
- Analise histopatológica
- É fundamental uma boa anamnese, exame físico e o complemento com exames de imagem para avaliar a necessidade de se biopsiar uma lesão.
- A biópsia de mama é indicada quando há achados suspeitos em exames de imagem, como a mamografia ou a ecografia mamária."

Slide 2:
"Diagnóstico
Biópsia percutânea
- Agulha grossa (core biópsia e biópsia a vácuo - mamotomia).
- Minimamente invasiva.
- Boa acurácia.
- Avaliação histopatológica e imuno-histoquímica.
- Possibilita a programação do tratamento.
- Lesões palpáveis quanto impalpáveis.
- Impalpáveis: um exame de imagem (ultrassonografia, mamografia ou ressonância) deve servir como guia para o procedimento.
[imagem da biópsia com agulha e nódulo]"

[Como você DEVE obrigatoriamente estruturar a transcrição]:
### Diagnóstico Definitivo

O diagnóstico definitivo do câncer de mama é fundamentado em um tripé indissociável:

- **Exame Clínico** -> Anamnese detalhada e exame físico das mamas e axilas.
- **Exames de Imagem** -> Mamografia, ultrassonografia e/ou ressonância magnética.
- **Análise Histopatológica** -> Biópsia da lesão, que é o padrão-ouro.
- **Biópsia Percutânea** -> Preferencial devido à sua mínima invasividade e boa acurácia.
  - **Core Biópsia** -> Utiliza agulha grossa para coletar cilindros de tecido.
  - **Biópsia a Vácuo (Mamotomia)** -> Coleta maior volume de tecido.
  - **Ambas** -> Permitem avaliação histopatológica e imuno-histoquímica, essenciais para caracterização molecular e planejamento terapêutico. Podem ser guiadas por ultrassom, mamografia (estereotaxia) ou RM para lesões não palpáveis.
- **Biópsia Cirúrgica** -> Indicada quando a biópsia percutânea não é tecnicamente viável.
- **Punção Aspirativa por Agulha Fina (PAAF)** -> Utilizada para avaliação citológica de linfonodos axilares, auxiliando no estadiamento inicial. Biópsias por agulha guiadas por ultrassom também podem ser realizadas em linfonodos.

### Patologia

DIRETRIZES DE CONTEÚDO E FORMA (MODO EXTENSÃO AVANÇADA):
1. DESDUPLICAÇÃO E UNIFICAÇÃO:
   - NUNCA repita o mesmo título de slide ou página. Una slides sequenciais sob o mesmo tema em uma única seção completa.
   - NUNCA escreva "Slide 1", "Página 1", "Slide 2", etc.
2. PARÁGRAFO INTRODUTÓRIO CONTEXTUALIZADOR:
   - Imediatamente após o título de cada seção (### [Título]), escreva uma frase narrativa ou parágrafo fluido contextualizando e fundamentando o raciocínio clínico.
3. HIERARQUIA DE MARCADORES COM SETAS (->):
   - Nível 1: - **[Conceito / Exame / Procedimento / Fator]** -> Explicação aprofundada com rigor científico, indicações, padrão-ouro e relevância.
   - Nível 2 (Indentado com 2 espaços "  - "): - **[Subtópico / Variação / Técnica]** -> Detalhes específicos, indicações e métodos práticos.
   - Nível 2 Comparativo / Síntese: - **Ambas / Critérios Comuns** -> Características compartilhadas, objetivos e método de guia.
   - Nível 1 Alternativas / Complementos: - **[Conduta Alternativa / Exame Adicional]** -> Cenários de indicação clínica e relevância.
4. EXTENSÃO FISIOPATOLÓGICA E FARMACOLÓGICA:
   - Aprofunde com mecanismos celulares/moleculares, vias de sinalização, receptores e enzimas.
   - Inclua correlações clínicas e opções terapêuticas detalhadas (classes medicamentosas, mecanismos e indicações).
5. INTEGRAÇÃO VISUAL DE DIAGRAMAS E IMAGENS:
   - Se os slides contiverem figuras, esquemas anatômicos, desenhos ou fluxogramas, incorpore suas informações e descrições diretamente na explicação dos tópicos.
6. PROIBIDO LATEX:
   - NUNCA use cifras de dólar ($). Use texto puro: '<=', '>=', '+/-', '->'.

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

REGRA DE OURO INVIOLÁVEL: A TRANSCRIÇÃO NUNCA PODE SER RASA!
É TERMINANTEMENTE PROIBIDO apenas copiar os marcadores fragmentados dos slides (ex: copiar apenas "Agulha grossa", "Minimamente invasiva", "Boa acurácia").
Você DEVE OBRIGATORIAMENTE sintetizar e contextualizar cada tópico do slide em notas clínicas aprofundadas, fluidas e estruturadas, transformando fragmentos soltos em explicações médicas completas e de alto rendimento.

EXEMPLO DE REFERÊNCIA OBRIGATÓRIO (SIGA ESTRITAMENTE ESTE PADRÃO DE ESTRUTURA):
[Entrada típica de slides em PDF com notas rasas/telegráficas]:
Slide 1:
"Deve estar ancorado em um tripé:
- Exame clínico
- Exame de imagem
- Analise histopatológica
- É fundamental uma boa anamnese, exame físico e o complemento com exames de imagem para avaliar a necessidade de se biopsiar uma lesão.
- A biópsia de mama é indicada quando há achados suspeitos em exames de imagem, como a mamografia ou a ecografia mamária."

Slide 2:
"Diagnóstico
Biópsia percutânea
- Agulha grossa (core biópsia e biópsia a vácuo - mamotomia).
- Minimamente invasiva.
- Boa acurácia.
- Avaliação histopatológica e imuno-histoquímica.
- Possibilita a programação do tratamento.
- Lesões palpáveis quanto impalpáveis.
- Impalpáveis: um exame de imagem (ultrassonografia, mamografia ou ressonância) deve servir como guia para o procedimento.
[imagem da biópsia com agulha e nódulo]"

[Como você DEVE obrigatoriamente estruturar a transcrição]:
### Diagnóstico Definitivo

O diagnóstico definitivo do câncer de mama é fundamentado em um tripé indissociável:

- **Exame Clínico** -> Anamnese detalhada e exame físico das mamas e axilas.
- **Exames de Imagem** -> Mamografia, ultrassonografia e/ou ressonância magnética.
- **Análise Histopatológica** -> Biópsia da lesão, que é o padrão-ouro.
- **Biópsia Percutânea** -> Preferencial devido à sua mínima invasividade e boa acurácia.
  - **Core Biópsia** -> Utiliza agulha grossa para coletar cilindros de tecido.
  - **Biópsia a Vácuo (Mamotomia)** -> Coleta maior volume de tecido.
  - **Ambas** -> Permitem avaliação histopatológica e imuno-histoquímica, essenciais para caracterização molecular e planejamento terapêutico. Podem ser guiadas por ultrassom, mamografia (estereotaxia) ou RM para lesões não palpáveis.
- **Biópsia Cirúrgica** -> Indicada quando a biópsia percutânea não é tecnicamente viável.
- **Punção Aspirativa por Agulha Fina (PAAF)** -> Utilizada para avaliação citológica de linfonodos axilares, auxiliando no estadiamento inicial. Biópsias por agulha guiadas por ultrassom também podem ser realizadas em linfonodos.

### Patologia

DIRETRIZES DE FORMATAÇÃO E CONTEÚDO:
1. DESDUPLICAÇÃO E UNIFICAÇÃO:
   - NUNCA repita o mesmo título de slide ou página (se vários slides têm o mesmo cabeçalho, una-os em uma única seção completa).
   - NUNCA escreva "Slide 1", "Página 1", etc.
2. PARÁGRAFO INTRODUTÓRIO CONTEXTUALIZADOR:
   - Imediatamente após o título de cada seção (### [Título]), escreva uma frase narrativa ou parágrafo fluido contextualizando e fundamentando o raciocínio clínico.
3. HIERARQUIA DE MARCADORES COM SETAS (->):
   - Nível 1: - **[Conceito / Exame / Procedimento / Fator]** -> Explicação aprofundada, indicação clínica, relevância e raciocínio médico.
   - Nível 2 (Subitens indentados com 2 espaços "  - "): - **[Subtópico / Variação / Técnica]** -> Detalhes específicos, indicações e métodos práticos.
   - Nível 2 Comparativo / Síntese: - **Ambas / Critérios Comuns** -> Características compartilhadas, objetivos e método de guia.
   - Nível 1 Alternativas / Complementos: - **[Conduta Alternativa / Exame Adicional]** -> Cenários de indicação clínica e relevância.
4. INTEGRAÇÃO VISUAL DE DIAGRAMAS E IMAGENS:
   - Se os slides contiverem figuras, esquemas anatômicos, desenhos ou fluxogramas, incorpore suas informações e descrições diretamente na explicação dos tópicos.
5. PROIBIDO LATEX:
   - NUNCA use cifras de dólar ($). Use texto puro: '<=', '>=', '+/-', '->'.

Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título do Documento (máximo 6 palavras)",
  "transcription": "Transcrição COMPLETA, EXTENSA E ESTRUTURADA no padrão ouro em Markdown puro com tópicos ###, introduções narrativas, marcadores 'Termo -> Explicação detalhada' e subitens hierárquicos...",
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
        ? `Transcreva e aprofunde todo o documento/slides abaixo no padrão ouro com 'Termo -> Explicação detalhada', parágrafos introdutórios e árvore hierárquica, eliminando repetições de títulos de slides e adicionando máxima extensão fisiopatológica/farmacológica:\n\n${allExtractedText}`
        : `Transcreva todo o documento/slides abaixo no padrão ouro estruturado com 'Termo -> Explicação detalhada', parágrafos introdutórios e subitens hierárquicos, garantindo profundidade médica e eliminando qualquer fragmento raso de slide:\n\n${allExtractedText}`;
    } else {
      userPrompt = expand
        ? `Transcreva e aprofunde todo o documento anexado no padrão ouro com 'Termo -> Explicação detalhada', parágrafos introdutórios e árvore hierárquica, eliminando repetições de páginas/slides e adicionando máxima extensão fisiopatológica/farmacológica.`
        : `Transcreva todo o documento anexado no padrão ouro estruturado com 'Termo -> Explicação detalhada', parágrafos introdutórios e subitens hierárquicos, garantindo profundidade médica e eliminando qualquer fragmento raso de slide.`;
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
      return t
        .split("\n")
        .filter((line: string) => !/^(?:#{1,6}\s+|\*\*)?P[áa]gina\s+\d+(?:\*\*)?\s*$/i.test(line.trim()))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
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

