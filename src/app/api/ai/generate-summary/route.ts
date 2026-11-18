import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { cleanLatexAndBadges } from "@/lib/text-sanitize";
import { reduceExcessiveBulletsInTranscription } from "@/lib/rich-text-utils";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { text, expand = false } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });
    }

    const systemPrompt = expand
      ? `Você é um professor catedrático e pesquisador sênior em medicina e biologia celular/molecular.
O usuário enviou um texto/documento com tópicos didáticos (frequentemente com cabeçalhos repetidos de slides).

SUA MISSÃO MANDATÓRIA (MODO EXPANDIR ATIVADO):
Reorganizar todo o conteúdo e REESCREVER um Resumo Master com MÁXIMO NÍVEL DE PROFUNDIDADE ACADÊMICA e ESTRUTURAÇÃO LIMPA:

DIRETRIZES DE FORMATAÇÃO E CONTEÚDO:
1. DESDUPLICAÇÃO E UNIFICAÇÃO ABSOLUTA:
   - NUNCA repita o mesmo título de slide ou página.
   - NUNCA escreva 'Slide 1', 'Página 1', etc.
2. PREFIRA PARÁGRAFOS FLUIDOS E SUBTÍTULOS (### e ####):
   - Desenvolva as explicações fisiopatológicas, farmacológicas e clínicas em parágrafos fluidos e bem encadeados (ex: "**Controle Pressórico Pré-Gestacional:** Mulheres com HAC devem..." em parágrafo corrido, sem bolinha).
   - Use subtítulos (` + "`###`" + ` e ` + "`####`" + `) para organizar seções e subdivisões.
3. USO RESTRITO DE MARCADORES (BOLINHAS / BULLETS):
   - Use marcadores (` + "`* `" + `) APENAS quando estritamente necessário para listar enumerações curtas e pontuais.
   - NÃO transforme parágrafos explicativos nem subtítulos em marcadores com bolinhas ou setas (` + "`->`" + `).
4. PROFUNDIDADE ACADÊMICA MÁXIMA:
   - Use terminologia médica rigorosa: vias metabólicas, enzimas específicas, receptores, biomarcadores e cascatas moleculares.
5. PROIBIDO LATEX:
   - NUNCA use cifras de dólar ($). Use texto puro: '<=', '>=', '+/-'.

Responda OBRIGATORIAMENTE em JSON válido:
{
  "summary": "Texto integral do Resumo Expandido em Markdown puro...",
  "keyPoints": ["Ponto-chave essencial 1", "Ponto-chave essencial 2", "Ponto-chave essencial 3", "Ponto-chave essencial 4"]
}`
      : `Atue como um transcritor e organizador acadêmico. Transcreva o conteúdo fielmente em forma de texto limpo e organizado em parágrafos e subtítulos.
REGRAS:
1. NUNCA repita o mesmo título de slide ou página (elimine cabeçalhos repetidos e agrupe o conteúdo sob um único título).
2. NUNCA escreva 'Slide 1', 'Página 1', etc.
3. Prefira parágrafos fluidos e subtítulos (### e ####); use marcadores com bolinhas (* ) APENAS quando estritamente necessário para listas curtas.
4. Sem LaTeX ($). Use texto puro: '<=', '>='.

Responda OBRIGATORIAMENTE em JSON válido:
{
  "summary": "Transcrição limpa e organizada em Markdown...",
  "keyPoints": ["Ponto 1", "Ponto 2", "Ponto 3"]
}`;

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt: `Crie o resumo master do material:\n\n${text.substring(0, 50000)}`,
      maxOutputTokens: 65536,
      temperature: 0.3,
    });

    let rawSummary = (result.summary || "").trim();
    rawSummary = rawSummary
      .replace(/\\rightarrow/g, "->")
      .replace(/\\Rightarrow/g, "->")
      .replace(/→/g, "->")
      .replace(/\$\$/g, "")
      .replace(/\$/g, "");
    rawSummary = reduceExcessiveBulletsInTranscription(cleanLatexAndBadges(rawSummary));

    return NextResponse.json({
      summary: rawSummary,
      keyPoints: result.keyPoints || [],
    });
  } catch (error) {
    console.error("AI Generate Summary Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar resumo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
