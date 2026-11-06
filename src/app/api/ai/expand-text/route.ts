import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, action, context } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Nenhum texto foi selecionado para expansão." },
        { status: 400 }
      );
    }

    const selectedText = text.trim();
    const actionType = action === "explain" ? "explain" : "expand";

    let systemPrompt = "";
    let userPrompt = "";

    if (actionType === "expand") {
      systemPrompt = `Você é um preceptor médico e especialista acadêmico sênior em saúde e pedagogia médica.
Sua missão é EXPANDIR e APROFUNDAR o trecho de texto selecionado pelo estudante com máxima erudição e riqueza médica.

DIRETRIZES DE EXPANSÃO AVANÇADA:
1. Traga máxima riqueza de detalhes médicos, fisiopatológicos, bioquímicos, farmacológicos ou clínicos pertinentes ao trecho (+40% de profundidade).
2. EXPLIQUE TERMOS DENTRO DO MESMO PARÁGRAFO: Nunca cite termos celulares, receptores ou processos sem elucidar imediatamente no mesmo parágrafo seu significado e impacto clínico.
3. EXPANDA TODAS AS ABREVIAÇÕES E SIGLAS: Escreva por extenso com definição e função entre parênteses.
4. FORNEÇA EXEMPLOS PRÁTICOS E CONDUTAS: Inclua valores numéricos de corte, exemplos de fármacos com suas classes e condutas médicas diagnósticas ou terapêuticas.
5. Formate em Markdown acadêmico limpo (tópicos com negrito, subtópicos se couber, etapas numeradas para cascatas).
6. Mantenha o estilo e coerência com o texto original.
7. NUNCA inicie com frases meta como "Aqui está a expansão:", "Expandindo o texto:". Forneça DIRETO o conteúdo expandido pronto para o documento.

JSON DE RETORNO OBRIGATÓRIO:
{
  "result": "Conteúdo expandido completo e aprofundado em Markdown"
}`;

      userPrompt = `EXPANDA com profundidade médica o seguinte trecho selecionado, explicando termos no próprio parágrafo, expandindo siglas, trazendo exemplos e condutas:
"${selectedText}"
${context ? `\nContexto circundante do documento onde o trecho está inserido:\n"${context.slice(0, 1500)}"` : ""}`;
    } else {
      systemPrompt = `Você é um preceptor médico e especialista acadêmico sênior.
Sua missão é EXPLICAR com clareza didática, precisão e profundidade médica o termo, conceito, hipótese ou pergunta médica selecionada.

DIRETRIZES DE EXPLICAÇÃO COMPLETA:
1. Explique o que é, como funciona (mecanismo / fisiologia) e qual a sua relevância clínica ou prática.
2. Explique termos correlatos no mesmo parágrafo e expanda todas as siglas por extenso.
3. Traga exemplos práticos (valores de corte laboratoriais, apresentações clínicas ou fármacos) e a conduta médica associada.
4. Formate em Markdown limpo e didático pronto para fixação.
5. NUNCA inicie com frases meta como "Aqui está a explicação:". Forneça DIRETO a explicação pronta para o documento.

JSON DE RETORNO OBRIGATÓRIO:
{
  "result": "Explicação didática e aprofundada em Markdown"
}`;

      userPrompt = `EXPLIQUE de forma didática e profunda o seguinte conceito/termo selecionado, expandindo siglas e detalhando exemplos e condutas:
"${selectedText}"
${context ? `\nContexto circundante do documento onde o trecho está inserido:\n"${context.slice(0, 1500)}"` : ""}`;
    }

    const data = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
      maxOutputTokens: 3000,
      temperature: 0.4,
    });

    return NextResponse.json({
      result: data.result || selectedText,
      action: actionType,
    });
  } catch (error: any) {
    console.error("Expand text error:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao processar com a IA." },
      { status: 500 }
    );
  }
}
