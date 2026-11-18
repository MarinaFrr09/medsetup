import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SUMMARY_PROMPT = `Você é um professor catedrático de Medicina especializado na elaboração de resumos e sínteses acadêmicas de alta profundidade para estudantes de graduação (Metodologia PBL / Ateliê).

MISSÃO: A partir do tema, objetivos, perguntas e atividades respondidas, histologia, anatomia, exames e dados da SP fornecidos, crie um RESUMO TEÓRICO COMPLETO, EXAUSTIVO E ALTAMENTE ESTRUTURADO sobre toda a matéria do documento.

DIRETRIZES FUNDAMENTAIS DE ESTRUTURAÇÃO E FORMATAÇÃO (MUITO IMPORTANTE):
1. NÃO FAÇA BLOCOS DE TEXTO CORRIDO! Sempre que explicar estruturas anatômicas, divisões de órgãos, ossos, cartilagens, músculos, camadas histológicas, tipos, classificações ou características, prefira organizar em TÓPICOS COM BOLINHAS (\\n* **Estrutura / Conceito:** ...) e SUBTÓPICOS INDENTADOS COM BOLINHAS (\\n  * **Componente / Subdivisão:** ...) em vez de um parágrafo longo e contínuo.
2. LISTAGEM DE ESTRUTURAS E CARACTERÍSTICAS COM SUBTÓPICOS DE BOLINHAS: Por exemplo, ao descrever a estrutura óssea do nariz, a cavidade nasal ou a cavidade oral, inicie com 1 frase introdutória curta e coloque cada estrutura em um tópico com bolinha (\\n* **Estrutura óssea do nariz:**) e seus elementos em subtópicos indentados com bolinhas (\\n  * **Ossos nasais**\\n  * **Maxilas**\\n  * **Lâmina perpendicular do etmoide**\\n  * **Vômer**).
3. ETAPAS E PROCESSOS: Para sequências temporais, cascatas hormonais, reflexos neurais e ciclos fisiológicos, estruture em ETAPAS numeradas ou tópicos com bolinhas e subtópicos claros.
4. DETALHAMENTO MÁXIMO E ORGANIZADO: O conteúdo deve ser de alto nível acadêmico (Guyton, Junqueira, Moore, Robbins, Goodman & Gilman), denso, técnico, porém visualmente limpo e escaneável.

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
- Cada subtópico deve iniciar com 1 frase introdutória breve seguida de tópicos (\\n* **...**) e subtópicos com bolinhas (\\n  * **...**) detalhando as estruturas, tipos, mecanismos e características.

JSON RETORNADO DEVE TER EXATAMENTE O FORMATO:
{
  "topics": [
    {
      "topic": "Nome do Tópico",
      "subtopics": [
        {
          "title": "Nome do Subtópico",
          "content": "Frase introdutória contextualizando o subtópico.\\n* **Estrutura ou Conceito 1:** descrição clara:\\n  * **Subestrutura A:** característica detalhada.\\n  * **Subestrutura B:** característica detalhada.\\n* **Estrutura ou Conceito 2:** descrição detalhada."
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
