import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { balanceQuestionBatch } from "@/lib/question-balancer";
import { extractTextFromDocx, extractTextFromPptx, extractTextFromPdf } from "@/lib/document-parser";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let prompt = "";
    let count = 10;
    let difficulty = "medium";
    let type = "multiple_choice";
    const rawFiles: Array<{ data: string; mimeType: string; name?: string }> = [];

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      prompt = (formData.get("prompt") as string) || "";
      count = Number(formData.get("count")) || 10;
      difficulty = (formData.get("difficulty") as string) || "medium";
      type = (formData.get("type") as string) || "multiple_choice";

      const files = formData.getAll("files") as File[];
      for (const file of files) {
        if (!file || file.size === 0) continue;
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const ext = (file.name || "").toLowerCase().split(".").pop() || "";

        if (ext === "docx") {
          const text = extractTextFromDocx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: file.name,
            });
            continue;
          }
        }

        if (ext === "pptx") {
          const text = extractTextFromPptx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: file.name,
            });
            continue;
          }
        }

        if (ext === "pdf" || (file.type && file.type.includes("pdf"))) {
          try {
            const parsed = await extractTextFromPdf(buffer);
            if (parsed && parsed.text && parsed.text.trim().length > 80) {
              rawFiles.push({
                data: Buffer.from(parsed.text, "utf8").toString("base64"),
                mimeType: "text/plain",
                name: file.name,
              });
              continue;
            }
          } catch (e) {
            console.warn(`[Questions PDF Fast-Text] fallback for ${file.name}:`, e);
          }
        }

        let mime = file.type || "application/pdf";
        if (ext === "pdf" || mime.includes("pdf")) mime = "application/pdf";
        else if (ext === "png") mime = "image/png";
        else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
        else if (ext === "txt") mime = "text/plain";

        rawFiles.push({
          data: buffer.toString("base64"),
          mimeType: mime,
          name: file.name,
        });
      }
    } else {
      const body = await request.json();
      prompt = body.prompt || "";
      count = Number(body.count) || 10;
      difficulty = body.difficulty || "medium";
      type = body.type || "multiple_choice";

      const incomingFiles: Array<any> = [];
      if (body.fileAttachments && Array.isArray(body.fileAttachments)) {
        incomingFiles.push(...body.fileAttachments);
      } else if (body.fileAttachment?.data) {
        incomingFiles.push(body.fileAttachment);
      }

      for (const f of incomingFiles) {
        if (!f.data) continue;
        let cleanBase64 = f.data;
        if (cleanBase64.includes(";base64,")) {
          cleanBase64 = cleanBase64.split(";base64,")[1];
        }
        const buffer = Buffer.from(cleanBase64, "base64");
        const ext = (f.name || "").toLowerCase().split(".").pop() || "";

        if (ext === "docx") {
          const text = extractTextFromDocx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: f.name || "documento.docx",
            });
            continue;
          }
        }

        if (ext === "pptx") {
          const text = extractTextFromPptx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: f.name || "apresentacao.pptx",
            });
            continue;
          }
        }

        if (ext === "pdf" || (f.mimeType && f.mimeType.includes("pdf"))) {
          try {
            const parsed = await extractTextFromPdf(buffer);
            if (parsed && parsed.text && parsed.text.trim().length > 80) {
              rawFiles.push({
                data: Buffer.from(parsed.text, "utf8").toString("base64"),
                mimeType: "text/plain",
                name: f.name || "documento.pdf",
              });
              continue;
            }
          } catch (e) {
            console.warn(`[Questions JSON PDF Fast-Text] fallback:`, e);
          }
        }

        let mime = f.mimeType || "application/pdf";
        if (ext === "pdf") mime = "application/pdf";
        else if (ext === "png") mime = "image/png";
        else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
        else if (ext === "txt") mime = "text/plain";

        rawFiles.push({
          data: cleanBase64,
          mimeType: mime,
          name: f.name || "arquivo.pdf",
        });
      }
    }

    const hasFiles = rawFiles.length > 0;
    const finalPrompt = prompt?.trim()
      ? prompt.trim()
      : hasFiles
      ? "Formule questões detalhadas, profundas e completas baseadas estritamente no conteúdo dos documentos/PDFs anexados."
      : "";

    if (!finalPrompt && !hasFiles) {
      return NextResponse.json({ error: "Informe um tema ou anexe um ou mais documentos/PDFs." }, { status: 400 });
    }

    const requestedCount = Math.min(Math.max(1, Number(count) || 10), 100);

    const difficultyInstruction =
      difficulty === "all" || difficulty === "mixed"
        ? "Dificuldade: Mista (Todas as Dificuldades). Crie uma distribuição equilibrada: ~30% fáceis, ~40% médias e ~30% difíceis. No campo 'difficulty' de CADA questão individual, preencha obrigatoriamente com 'easy', 'medium' ou 'hard'."
        : difficulty === "easy"
        ? "Dificuldade: Fácil ('easy'). No campo 'difficulty', preencha com 'easy'."
        : difficulty === "hard"
        ? "Dificuldade: Difícil ('hard'). No campo 'difficulty', preencha com 'hard'."
        : "Dificuldade: Média ('medium'). No campo 'difficulty', preencha com 'medium'.";

    const fileListInstruction = hasFiles
      ? `\n\nCOBERTURA OBRIGATÓRIA DOS ${rawFiles.length} DOCUMENTO(S) ANEXADOS:
${rawFiles.map((f, i) => `${i + 1}. "${f.name || `Arquivo ${i + 1}`}"`).join("\n")}
- Você DEVE distribuir as questões proporcionalmente entre TODOS os ${rawFiles.length} documentos anexados, sem omitir nenhum.
- Se houver muitos documentos e poucas questões solicitadas (${requestedCount}), extraia o conceito mais crucial e indispensável de CADA documento.
- Misture e intercale temas e matérias dos documentos em ordem variada.`
      : "";

    const systemPrompt = `Você é um professor titular e membro sênior de bancas examinadoras de elite acadêmica (padrão USMLE, Revalida, Residência Médica e ENADE).
Sua missão é criar exatamente ${requestedCount} questões impecáveis, clinicamente/tecnicamente contextualizadas e com alto poder discriminatório do tipo ${
      type === "multiple_choice"
        ? "múltipla escolha com 5 alternativas (A a E)"
        : type === "true_false"
        ? "verdadeiro ou falso"
        : "dissertativa"
    }.

══════════════════════════════════════════════════════════════════════════════════
🚨 REGRA CRÍTICA DE OURO: PROIBIÇÃO DO "VÍCIO DA MAIOR ALTERNATIVA" (ANTI-LENGTH BIAS)
══════════════════════════════════════════════════════════════════════════════════
É TERMINANTEMENTE PROIBIDO que a alternativa correta seja a mais longa ou mais detalhada da questão!
Bancas de excelência acadêmica (Revalida, USMLE, Residência Médica) NUNCA deixam a resposta correta ser identificável pelo tamanho:

1. PARIDADE RIGOROSA DE EXTENSÃO:
   - Todas as alternativas de uma mesma questão DEVEM ter extensões equivalentes (mesmo número aproximado de palavras e caracteres, variação máxima de 15%).
   - Se a alternativa correta tem 12 palavras, os distratores DEVEM ter entre 10 e 15 palavras.
   - Se a correta cita dosagens, exames ou classes farmacológicas, os distratores DEVEM OBRIGATORIAMENTE conter dosagens e condutas completas com a mesma sofisticação técnica (proibido deixar distratores curtos e genéricos enquanto a correta é detalhada!).

2. PROIBIÇÃO DE JUSTIFICATIVAS OU MOTIVOS NA ALTERNATIVA:
   - NUNCA inclua explicações ou motivos dentro do texto da alternativa correta (PROIBIDO escrever ", visto que...", ", pois...", ", garantindo assim...", ", o que decorre de...").
   - A alternativa é apenas a afirmação ou conduta clínica pura. Toda explicação pertence EXCLUSIVAMENTE ao campo "explanation".

3. RANDOMIZAÇÃO ATIVA DE TAMANHO AO LONGO DA PROVA:
   - Para impossibilitar qualquer padrão de tamanho:
     * Em pelo menos 40% das questões, faça um DISTRATOR (alternativa incorreta) ser a opção MAIS LONGA e elaborada da questão!
     * Em pelo menos 30% das questões, faça a alternativa CORRETA ser a opção MAIS CURTA e direta de todas!
     * Nas demais questões, mantenha todas as alternativas rigorosamente do mesmo tamanho.
   - NUNCA crie uma questão onde a alternativa correta seja a mais extensa de todas!

4. RANDOMIZAÇÃO DO GABARITO:
   - Alterne de forma randômica e equilibrada a letra da resposta correta entre A, B, C, D e E.
══════════════════════════════════════════════════════════════════════════════════
${
  hasFiles
    ? `IMPORTANTE E MANDATÓRIO: Foram anexados ${rawFiles.length} documento(s)/PDF(s) como material de estudo base. Todas as questões, alternativas e justificativas DEVEM ser formuladas estritamente com base nos fatos, dados, ensinamentos e teorias contidos nos documentos anexados. Use a descrição do usuário apenas como refinamento/foco complementar.${fileListInstruction}`
    : ""
}
${difficultyInstruction}

Responda APENAS em JSON no seguinte formato:
{
  "questions": [
    {
      "question": "texto claro, aprofundado e contextualizado do enunciado (caso clínico, situação-problema ou problema conceitual)",
      "type": "${type}",
      "difficulty": "easy | medium | hard",
      "options": ${
        type === "multiple_choice"
          ? '[{"id": "a", "text": "alternativa A"}, {"id": "b", "text": "alternativa B"}, {"id": "c", "text": "alternativa C"}, {"id": "d", "text": "alternativa D"}, {"id": "e", "text": "alternativa E"}]'
          : type === "true_false"
          ? '[{"id": "true", "text": "Verdadeiro"}, {"id": "false", "text": "Falso"}]'
          : "[]"
      },
      "answer": "${type === "multiple_choice" ? "a | b | c | d | e" : type === "true_false" ? "true | false" : "resposta esperada"}",
      "explanation": "explicação detalhada do raciocínio e por que o gabarito está correto, demonstrando também com clareza o erro de cada um dos distratores fundamentado na literatura fornecida"
    }
  ]
}`;

    const shuffleArray = <T>(array: T[]): T[] => {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt: finalPrompt,
      fileAttachments: rawFiles,
      maxOutputTokens: 65536,
      temperature: 0.5,
    });

    const questionsList = Array.isArray(result?.questions)
      ? result.questions
      : Array.isArray(result?.questoes)
      ? result.questoes
      : Array.isArray(result)
      ? result
      : [];

    const balancedList = await balanceQuestionBatch(questionsList);
    const shuffledList = shuffleArray(balancedList);

    return NextResponse.json({ ...result, questions: shuffledList });
  } catch (error) {
    console.error("AI Generate Questions Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar questões";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
