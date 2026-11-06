import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
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
DIRETRIZ DE QUALIDADE: QUESTÕES RANDOMIZADAS E NÃO ÓBVIAS
══════════════════════════════════════════════════════════════════════════════════
O objetivo principal é que as questões sejam realistas, desafiadoras e sem padrões óbvios:

1. ALTERNATIVAS NÃO ÓBVIAS E DISTRATORES PLAUSÍVEIS:
   - Evite que a resposta correta se destaque visualmente ou logicamente das demais.
   - Os distratores (alternativas incorretas) devem ser inteligentes, plausíveis e verossímeis (conceitos reais, diagnósticos diferenciais autênticos ou condutas verdadeiras em outro contexto), e NUNCA opções bobas, simplistas ou absurdas.
   - Não use termos absolutistas denunciantes nos distratores ("sempre", "nunca", "exclusivamente").

2. EXTENSÃO E ESTRUTURA NATURALMENTE VARIADAS (SEM PADRÃO FIXO):
   - Não use uma métrica engessada, mas VARIE NATURALMENTE: em algumas questões a resposta correta pode ser mais concisa, em outras de tamanho médio, e em outras um distrator pode ser a opção mais longa.
   - Evite o vício de sempre fazer a resposta correta ser a mais extensa e explicativa da questão.

3. RANDOMIZAÇÃO DO GABARITO:
   - Alterne de forma randômica e variada a letra da resposta correta entre A, B, C, D e E.
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

    const normalizeAndBalanceQuestion = (q: any): any => {
      if (!q || typeof q !== "object") return q;

      const isMC =
        q.type === "multiple_choice" ||
        q.type === "multiple-choice" ||
        (!q.type && Array.isArray(q.options) && q.options.length >= 2);

      if (!isMC || !Array.isArray(q.options) || q.options.length < 2) {
        return q;
      }

      const rawAns = String(q.answer || "").trim().toLowerCase();

      // Normalize raw options into { id, text }
      const originalOptions: Array<{ id: string; text: string }> = q.options.map(
        (opt: any, idx: number) => {
          const defaultId = String.fromCharCode(97 + idx);
          if (typeof opt === "string") {
            return { id: defaultId, text: opt.trim() };
          }
          const optId = String(opt.id || opt.letra || defaultId).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
          return {
            id: optId || defaultId,
            text: String(opt.text || opt.texto || opt.descricao || "").trim(),
          };
        }
      );

      // Determine which option is currently the correct one
      let correctIndex = originalOptions.findIndex((o) => o.id === rawAns);
      if (correctIndex === -1) {
        correctIndex = originalOptions.findIndex((o) => o.text.toLowerCase() === rawAns);
      }
      if (correctIndex === -1 && rawAns.length === 1 && rawAns >= "a" && rawAns <= "z") {
        const code = rawAns.charCodeAt(0) - 97;
        if (code >= 0 && code < originalOptions.length) {
          correctIndex = code;
        }
      }
      if (correctIndex === -1) {
        correctIndex = 0;
      }

      // Tag each option with correctness marker before shuffling
      const tagged = originalOptions.map((opt, idx) => ({
        text: opt.text,
        _isCorrect: idx === correctIndex,
      }));

      // Shuffle options to completely prevent positional bias
      for (let i = tagged.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
      }

      // Re-index to a, b, c, d, e...
      const letters = ["a", "b", "c", "d", "e", "f", "g"];
      let finalAnswer = "a";

      const finalOptions = tagged.map((item, idx) => {
        const letter = letters[idx] || String.fromCharCode(97 + idx);
        if (item._isCorrect) {
          finalAnswer = letter;
        }
        return {
          id: letter,
          text: item.text,
        };
      });

      return {
        ...q,
        options: finalOptions,
        answer: finalAnswer,
      };
    };

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

    const balancedList = questionsList.map(normalizeAndBalanceQuestion);
    const shuffledList = shuffleArray(balancedList);

    return NextResponse.json({ ...result, questions: shuffledList });
  } catch (error) {
    console.error("AI Generate Questions Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar questões";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
