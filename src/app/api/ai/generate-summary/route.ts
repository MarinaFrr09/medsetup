import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { cleanLatexAndBadges } from "@/lib/text-sanitize";

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
Reorganizar todo o conteúdo e REESCREVER um Resumo Master no padrão ouro abaixo, com MÁXIMO NÍVEL DE REBUSCAMENTO ACADÊMICO e ESTRUTURAÇÃO HIERÁRQUICA:

ESTRUTURA PADRÃO OURO OBRIGATÓRIA (MODO EXPANDIDO):
1. DESDUPLICAÇÃO E UNIFICAÇÃO ABSOLUTA:
   - NUNCA repita o mesmo título de slide ou página (ex: crie APENAS UM título de seção '# Fatores de Risco e Prevenção' para todo o tema).
   - NUNCA escreva 'Slide 1', 'Página 1', etc.
2. PARÁGRAFO INTRODUTÓRIO CONTEXTUALIZADOR:
   - Imediatamente após o título, escreva um parágrafo narrativo fluido contextualizando o tema clínico/biológico (ex: 'O câncer de mama é uma doença multifatorial, resultado de uma complexa interação entre genética, fatores hormonais e estilo de vida.').
3. HIERARQUIA DE MARCADORES COM SETAS (->) E NEGRITO:
   - Tópico Principal (nível 1):
     * **Nome do Tópico ->** Explicação aprofundada com rigor científico.
     Exemplo:
     * **Idade Avançada ->** É o principal fator de risco, refletindo o acúmulo de exposições e alterações biológicas relacionadas ao envelhecimento.
     * **Fatores Endócrinos/História Reprodutiva ->** Estão primariamente ligados à exposição prolongada e intensa ao estímulo estrogênico, seja endógeno ou exógeno.
   - Subtópicos Indentados (nível 2, com 2 espaços de recuo):
     * **Subtópico ->** Detalhamento conceitual e bioquímico.
     Exemplo:
     * **Menarca precoce** (primeira menstruação antes dos 12 anos).
     * **Primeira gravidez após os 30 anos ou Nuliparidade** (mulher que nunca gestou). A gestação, em contraste, confere um efeito protetor significativo, em parte devido à alta produção de progesterona, que modula os receptores de estrógeno e diminui a atividade mitótica estrogênio-induzida. A progesterona aumenta a 17-hidroxidesidrogenase, convertendo estradiol em estrona, uma forma biologicamente menos potente...
   - Tópicos Conceituais & Mecanismos Moleculares Aprofundados:
     * **O Papel do Estrógeno na Oncogênese Mamária ->** ...
       * **Receptores de Estrógeno (ER) ->** Localizam-se principalmente no núcleo, mas também no citoplasma e membrana celular...
         * **ERα e ERβ ->** Compartilham similaridades estruturais e funcionais...
       * **Mecanismos de Ação do Estrógeno ->**
         * **Via Genômica ->** O estrógeno se liga a receptores intracelulares, formando um dímero... (Referência: DOI: 10.3390/ijerph18189834).
         * **Via Não-Genômica ->** Envolve a interação dos ER com outras vias de sinalização (PI3K/AKT, MAPK, TGF-α, IGF-1, TGF-β)...
4. REBUSCAMENTO ACADÊMICO MÁXIMO:
   - Use terminologia médica rigorosa: vias metabólicas, enzimas específicas, receptores, biomarcadores e cascatas moleculares.
   - Inclua correlações clínicas e referências científicas ou DOIs pertinentes.
5. REGRAS TÉCNICAS:
   - PROIBIDO LATEX: NUNCA use cifras de dólar ($). Use texto puro: '<=', '>=', '+/-', '->'.
   - PROIBIDO LISTAS NUMERADAS (sem 1., 2., 3.). Use APENAS a árvore hierárquica de bullets com asterisco (*).

Responda OBRIGATORIAMENTE em JSON válido:
{
  "summary": "Texto integral do Resumo Expandido em Markdown puro padrão ouro...",
  "keyPoints": ["Ponto-chave essencial 1", "Ponto-chave essencial 2", "Ponto-chave essencial 3", "Ponto-chave essencial 4"]
}`
      : `Atue como um transcritor e organizador acadêmico. Transcreva o conteúdo fielmente em forma de texto limpo e organizado.
REGRAS:
1. NUNCA repita o mesmo título de slide ou página (elimine cabeçalhos repetidos e agrupe o conteúdo sob um único título).
2. NUNCA escreva 'Slide 1', 'Página 1', etc.
3. Não invente expansões externas; transcreva o conteúdo fielmente.
4. Sem LaTeX ($). Use texto puro: '<=', '>=', '->'.

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
    rawSummary = cleanLatexAndBadges(rawSummary);

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
