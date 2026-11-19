import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { prompt, topic, count = 20, fileAttachment, fileAttachments } = await request.json();

    const rawFiles: Array<{ data: string; mimeType: string; name?: string }> = [];
    if (fileAttachments && Array.isArray(fileAttachments) && fileAttachments.length > 0) {
      rawFiles.push(...fileAttachments);
    } else if (fileAttachment && fileAttachment.data) {
      rawFiles.push(fileAttachment);
    }

    const hasFiles = rawFiles.length > 0;
    const rawPromptText = String(prompt || topic || "").trim();
    const finalPrompt = rawPromptText
      ? rawPromptText
      : hasFiles
      ? "Analise detalhadamente todos os documentos anexados e extraia os conceitos basilares, definições essenciais, terminologias e fórmulas para criar flashcards de alta qualidade para revisão acadêmica."
      : "";

    if (!finalPrompt && !hasFiles) {
      return NextResponse.json({ error: "Informe um tema ou anexe um ou mais documentos/PDFs." }, { status: 400 });
    }

    const fileListInstruction = hasFiles
      ? `\n\nCOBERTURA OBRIGATÓRIA DOS ${rawFiles.length} DOCUMENTO(S) ANEXADOS:
${rawFiles.map((f, i) => `${i + 1}. "${f.name || `Arquivo ${i + 1}`}"`).join("\n")}
- Você DEVE cobrir TODOS os ${rawFiles.length} documentos anexados de forma proporcional e equilibrada.
- Se houver muitos documentos e poucos flashcards solicitados (${count}), extraia o conceito mais crucial e indispensável de CADA documento.
- Misture e intercale conceitos e temas dos diferentes documentos.`
      : "";

    const systemPrompt = `Você é um professor e especialista em memorização ativa e repetição espaçada (spaced repetition).
Sua missão é criar exatamente ${count} flashcards de estudo com alto poder de retenção.
${
  hasFiles
    ? `IMPORTANTE E OBRIGATÓRIO: Foram anexados ${rawFiles.length} documento(s) como base. Todas as perguntas (frente) e respostas (verso) DEVEM ser extraídas estritamente dos documentos anexados. Use a descrição do usuário apenas como foco adicional, se houver.${fileListInstruction}`
    : ""
}
Cada flashcard deve conter:
- 'front': Pergunta ou conceito direto, desafiador, claro e 100% autossuficiente (frente do card)
- 'back': Resposta precisa, completa e explicativa (verso do card)

PROIBIÇÃO ABSOLUTA DE METARREFERÊNCIAS:
- NUNCA mencione "na vinheta clínica", "no Caso #...", "na Pista X/5", "no caso clínico apresentado", "segundo o texto", "conforme o documento", "de acordo com o material" ou "no debriefing".
- Formule TODAS as perguntas diretamente sobre o conteúdo médico/científico em si, sem nenhum direcionamento externo (ex: escreva "Quais são os sintomas cardinais clássicos do Tromboembolismo Pulmonar (TEP)?" e NUNCA "Quais sintomas foram apresentados na vinheta do Caso #...?").

Responda APENAS em JSON válido com esta exata estrutura:
{
  "flashcards": [
    {
      "front": "Pergunta ou conceito direto",
      "back": "Resposta ou explicação detalhada"
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
    });

    const rawCards = Array.isArray(result?.flashcards) ? result.flashcards : [];
    const shuffledCards = shuffleArray(rawCards);

    return NextResponse.json({ ...result, flashcards: shuffledCards });
  } catch (error) {
    console.error("AI Generate Flashcards Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar flashcards";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
