import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

function extractAIResultText(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data.trim();
  if (Array.isArray(data)) {
    if (data.length > 0) return extractAIResultText(data[0]);
    return "";
  }
  if (typeof data === "object") {
    // Check known keys first
    const candidates = [
      data.result,
      data.expanded,
      data.expandedText,
      data.expanded_text,
      data.conteudo_expandido,
      data.texto_expandido,
      data.expansao,
      data.explicacao,
      data.explanation,
      data.conteudo,
      data.content,
      data.texto,
      data.text,
      data.resposta,
      data.response,
      data.markdown,
      data.summary,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) {
        return c.trim();
      }
    }
    // Search any string value with substantial length
    let longest = "";
    for (const val of Object.values(data)) {
      if (typeof val === "string" && val.trim().length > longest.length) {
        longest = val.trim();
      } else if (typeof val === "object" && val !== null) {
        const nested = extractAIResultText(val);
        if (nested.length > longest.length) longest = nested;
      }
    }
    return longest;
  }
  return "";
}

/** Remove headings (#), frases meta e adjetivos/advérbios opinativos vazios. */
function cleanResult(raw: string): string {
  return raw
    .replace(/^\s*#{1,6}\s+(.*)$/gm, "**$1**")
    .replace(/^\s*(?:Aqui está[^\n]*|Expandindo[^\n]*|Segue[^\n]*)\n+/i, "")
    .replace(/\b(?:altamente|extremamente|sumamente|imensamente)\s+/gi, "")
    .replace(/\s+e\s+(?:crucial|fundamental|essencial|indispensável|vital|primordial)\b/gi, "")
    .replace(/\b(?:é\s+(?:muito\s+)?(?:importante|necessário|fundamental|crucial|essencial|indispensável)\s+(?:destacar|ressaltar|notar|lembrar|compreender|observar|salientar)\s+que\s+)/gi, "")
    .replace(/\b(?:vale|cabe)\s+(?:destacar|ressaltar|lembrar|notar|salientar)\s+que\s+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isIncompleteOrTruncated(text: string, minChars: number): boolean {
  const t = (text || "").trim();
  if (!t || t.length < minChars) return true;
  // Must end with valid terminal punctuation (not cut off mid-word or mid-sentence like "...externas ou")
  if (!/[.!?:;)"'»\]\*]$/.test(t)) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawText = body.text || body.selectedText;
    const { action, context, prompt: customPrompt } = body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Nenhum texto foi selecionado para expansão." },
        { status: 400 }
      );
    }

    const selectedText = rawText.trim();
    const actionType = action === "explain" ? "explain" : "expand";
    const selectedWords = selectedText.split(/\s+/).length;
    const targetWords = Math.min(340, Math.max(150, selectedWords * 3));

    const contextBlock =
      context && context.trim() !== selectedText
        ? `\nContexto do documento (apenas para orientação temática; não repita literalmente):\n"${context.slice(0, 1200)}"`
        : "";

    let systemPrompt = "";
    let userPrompt = "";

    const strictObjectivityRules = `REGRAS DE OBJETIVIDADE CIENTÍFICA (OBRIGATÓRIO):
- ZERO OPINIÃO E ZERO ADJETIVAÇÃO VAZIA: É TERMINANTEMENTE PROIBIDO usar palavras subjetivas, opinativas ou intensificadores vagos como "altamente", "necessário", "crucial", "fundamental", "essencial", "indispensável", "extremamente", "vital", "primordial", "de suma importância", "muito importante", "cuidadoso", "rigoroso", "vale ressaltar", "é importante notar" ou "cabe destacar".
- APENAS FATOS E MECANISMOS TÉCNICOS: Não qualifique um processo dizendo que ele é "importante" ou "necessário"; descreva diretamente O QUE ocorre, COMO ocorre (mecanismo fisiológico, bioquímico, farmacológico ou físico-químico), QUAIS estruturas, receptores, enzimas, mediadores, gradientes ou variáveis atuam e QUAL a consequência anatomofuncional ou clínica direta.`;

    if (customPrompt && typeof customPrompt === "string") {
      systemPrompt = `Você é um autor de tratado médico-científico.
${customPrompt}
${strictObjectivityRules}
Escreva em português do Brasil, de forma técnica, densa e completa, sem cortar frases no meio.
Retorne JSON: {"result": "texto técnico expandido completo"}`;
      userPrompt = `Conteúdo base:\n"${selectedText}"${contextBlock}`;
    } else if (actionType === "expand") {
      systemPrompt = `Você é um autor de tratado médico-científico.
Sua tarefa é EXPANDIR O TEXTO selecionado com DETALHAMENTO TÉCNICO DENSO, OBJETIVO E FACTUAL.

${strictObjectivityRules}

REGRAS ESTRUTURAIS:
1. EXPANSÃO REAL COM DETALHES TÉCNICOS: O resultado deve ter cerca de ${Math.round(targetWords)} palavras (2,5 a 3,5 vezes o trecho original), acrescentando informações técnicas concretas: etapas do mecanismo, fatores físico-químicos ou fisiológicos determinantes (ex: lipossolubilidade, grau de ionização, pKa, fluxo sanguíneo, espessura epitelial, receptores, enzimas, transportadores), subdivisões e repercussão fisiopatológica/clínica direta.
2. TEXTO CORRIDO E DIRETO: Escreva em 1 a 2 parágrafos densos e objetivos. Se o trecho original iniciar com o nome do conceito (ex: "Fase de Exposição:"), mantenha o termo no início ("**Fase de Exposição:** ...").
3. SIGLAS: Escreva por extenso na primeira menção, com a sigla entre parênteses.
4. SEM FRASES META: Nunca inicie com "Aqui está" ou "Expandindo". Conclua todas as frases com ponto final.
5. Escreva em português do Brasil.

Retorne estritamente JSON válido: {"result": "texto expandido técnico e detalhado"}`;

      userPrompt = `Expanda com máximo detalhamento técnico, objetivo e sem adjetivos opinativos o trecho abaixo:
"${selectedText}"
${contextBlock}`;
    } else {
      systemPrompt = `Você é um autor de referência médica que explica conceitos com precisão técnica, objetividade e riqueza de detalhes.
Sua tarefa é EXPLICAR E DETALHAR o conceito ou trecho selecionado de forma puramente técnica, objetiva e aprofundada.

${strictObjectivityRules}

REGRAS ESTRUTURAIS:
1. DETALHAMENTO TÉCNICO E OBJETIVO (140 a 240 palavras): Em 1 a 2 parágrafos densos, defina exatamente o conceito, descreva passo a passo o mecanismo fisiológico/fisiopatológico/farmacológico (estruturas anatômicas, tipos celulares, receptores, enzimas, vias de sinalização ou propriedades físico-químicas envolvidas) e especifique a repercussão clínica ou diagnóstica concreta.
2. SEM LINGUAGEM OPINATIVA: Vá direto aos fatos científicos e mecanismos, sem adjetivos vagos ("altamente", "necessário", "crucial", "fundamental") e sem introduções genéricas.
3. SIGLAS: Escreva por extenso na primeira menção, com a sigla entre parênteses.
4. Conclua todas as frases com ponto final e escreva em português do Brasil.

Retorne estritamente JSON válido: {"result": "explicação técnica detalhada e objetiva"}`;

      userPrompt = `Explique e detalhe de forma estritamente técnica, objetiva e aprofundada (sem palavras opinativas como "altamente" ou "necessário") o seguinte trecho/conceito:
"${selectedText}"
${contextBlock}`;
    }

    const data = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
      maxOutputTokens: 16384,
      temperature: 0.4,
    });

    let result = cleanResult(extractAIResultText(data));
    const minRequiredLength =
      actionType === "expand"
        ? Math.max(selectedText.length + 60, 200)
        : Math.max(150, Math.min(selectedText.length + 50, 200));

    // Se o resultado vier truncado no meio da frase, idêntico ao selecionado ou menor que o esperado, tenta novamente
    if (
      !result ||
      result.trim() === selectedText ||
      isIncompleteOrTruncated(result, minRequiredLength)
    ) {
      const retryData = await generateJSONFromAI({
        systemPrompt: `Você é um autor de tratado médico. Reescreva e EXPANDA o texto acrescentando detalhes técnicos objetivos (mecanismo fisiopatológico/farmacológico, receptores, enzimas, propriedades físico-químicas, parâmetros e correlação clínica direta), em parágrafos completos com cerca de ${Math.round(targetWords)} palavras. PROIBIDO usar palavras subjetivas como "altamente", "necessário", "crucial", "fundamental" ou "essencial". Termine sempre com ponto final. Retorne JSON: {"result": "texto completo"}`,
        userPrompt: `Expanda e detalhe tecnicamente este trecho:\n"${selectedText}"`,
        maxOutputTokens: 16384,
        temperature: 0.4,
      });

      const retryResult = cleanResult(extractAIResultText(retryData));
      if (retryResult && retryResult.length > result.length && !isIncompleteOrTruncated(retryResult, 120)) {
        result = retryResult;
      } else if (retryResult && retryResult.length > result.length) {
        result = retryResult;
      }
    }

    // Se por algum motivo extremo o texto terminou sem pontuação final, fecha adequadamente
    if (result && !/[.!?:;)"'»\]\*]$/.test(result.trim())) {
      // Remove última palavra se for conjunção/preposição solta no final de frase truncada
      result = result
        .trim()
        .replace(/\s+(?:ou|e|de|do|da|dos|das|em|no|na|nos|nas|por|para|com|que|se|ao|à|como)$/i, "")
        .replace(/[,;:]$/, "") + ".";
    }

    if (!result || result.trim() === selectedText) {
      throw new Error("A IA não gerou uma expansão suficiente. Por favor, tente novamente.");
    }

    return NextResponse.json({
      result,
      resultText: result,
      expandedText: result,
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
