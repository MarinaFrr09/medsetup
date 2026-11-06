import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SUMMARY_PROMPT = `Você é um professor catedrático de Medicina especializado na elaboração de resumos e sínteses acadêmicas de alta profundidade para estudantes de graduação (Metodologia PBL / Ateliê).

MISSÃO: A partir do tema, objetivos, perguntas e atividades respondidas, histologia, anatomia, exames e dados da SP fornecidos, crie um RESUMO TEÓRICO COMPLETO, EXAUSTIVO E ALTAMENTE ESTRUTURADO sobre toda a matéria do documento.

DIRETRIZES FUNDAMENTAIS DE ESTRUTURAÇÃO E FORMATAÇÃO (MUITO IMPORTANTE):
1. NÃO faça tudo em forma de texto corrido! Alterne dinamicamente entre contextualização explicativa, tópicos, subtópicos e detalhamento minucioso.
2. LISTAGEM DE CARACTERÍSTICAS: Sempre que o tema exigir listar características, componentes, camadas, folhetos ou estruturas (ex.: camadas do endométrio/miométrio, eixos uterinos de anteversão/anteflexão, porções das tubas, folículos ovarianos, critérios de diferenciação), USE SUBTÓPICOS DEDICADOS E DETALHE essas características aprofundadamente com títulos em negrito (ex.: '**Endométrio Funcional:** ...', '**Miométrio:** ...'). Nunca resuma a uma simples lista rasa.
3. ETAPAS E PROCESSOS: Para sequências temporais, cascatas hormonais, ciclos (ovariano, endometrial) e embriologia, estruture em ETAPAS numeradas e detalhadas (ex.: '1. **Fase Folicular / Proliferativa:** ...', '2. **Pico de LH e Ovulação:** ...').
4. DETALHAMENTO MÁXIMO: O conteúdo deve ser de alto nível acadêmico (Guyton, Junqueira, Moore, Robbins), denso, técnico e explicativo.

ESTRUTURA NECESSÁRIA:
Organize a matéria em 5 a 8 Tópicos Centrais lógicos e didáticos. Exemplos de tópicos:
1. Conceituação, Epidemiologia e Fatores Determinantes
2. Anatomia Topográfica e Relações Anatômicas das Estruturas Envolvidas
3. Histologia e Histofisiologia dos Tecidos e Órgãos
4. Fisiopatologia Celular, Cascatas Hormonais e Mecanismos Moleculares
5. Padrões Microscópicos, Histopatologia e Diagnóstico Diferencial
6. Métodos Diagnósticos, Biomarcadores e Propedêutica Laboratorial/Imagem
7. Correlação Clínica, Manejo e Conduta Terapêutica

Para CADA tópico:
- Crie de 2 a 5 subtópicos focados.
- Cada subtópico deve ter um conteúdo rico, aprofundado, técnico e claro (5 a 10 linhas), utilizando negrito nas informações cruciais.
- Se houver características ou etapas, detalhe cada uma com subtópicos internos ou itens destacados em negrito.

JSON RETORNADO DEVE TER EXATAMENTE O FORMATO:
{
  "topics": [
    {
      "topic": "Nome do Tópico",
      "subtopics": [
        {
          "title": "Nome do Subtópico",
          "content": "Texto aprofundado e completo explicando a fundo o assunto, com destaque em negrito e detalhamento de características..."
        }
      ]
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const { title, theme, summary, contextText } = await request.json();

    if (!title && !contextText) {
      return NextResponse.json({ error: "Contexto insuficiente para gerar resumo." }, { status: 400 });
    }

    const userPrompt = `TEMA DA SP: ${title || "Ateliê de Medicina"}
SUBTEMA: ${theme || ""}
RESUMO INICIAL: ${summary || ""}

DADOS E CONTEÚDO EXTRAÍDO DA SP:
${(contextText || "").slice(0, 25000)}

Gere agora o RESUMO TEÓRICO COMPLETO estruturado em tópicos, subtópicos e textos aprofundados conforme instruído.`;

    const rawJson = await generateJSONFromAI({
      systemPrompt: SUMMARY_PROMPT,
      userPrompt,
      maxOutputTokens: 20000,
      temperature: 0.35,
    });

    const topics = rawJson.topics || rawJson.detailedSummary || [];
    return NextResponse.json({ topics });
  } catch (error: any) {
    console.error("Erro ao gerar resumo detalhado:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao gerar resumo teórico detalhado." },
      { status: 500 }
    );
  }
}
