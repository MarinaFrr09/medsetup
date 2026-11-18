import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isPlaceholderLabel(lbl: string): boolean {
  const lower = (lbl || "").toLowerCase().trim();
  if (!lower || lower.length < 4) return true;
  return /^(?:explica[çc][ãa]o essencial|ponto de aten[çc][ãa]o|regra mnem[ôo]nica|mecanismo t[ée]cnico e estruturas|repercuss[ãa]o fisiopatol[óo]gica e par[âa]metro|exemplo pr[áa]tico\s*\d*|primeiro subt[óo]pico|segundo subt[óo]pico|terceiro subt[óo]pico|classifica[çc][ãa]o e crit[ée]rios|mecanismo e fisiopatologia|conduta e aplica[çc][ãa]o|aspecto chave de| escreva aqui|insira aqui)/i.test(
    lower
  );
}

function extractSubtopicsList(data: any): Array<{ label: string; type?: string; icon?: string }> {
  if (!data) return [];
  const rawArr = Array.isArray(data)
    ? data
    : Array.isArray(data.subtopics)
    ? data.subtopics
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.nodes)
    ? data.nodes
    : Array.isArray(data.explanations)
    ? data.explanations
    : Array.isArray(data.examples)
    ? data.examples
    : [];

  const valid: Array<{ label: string; type?: string; icon?: string }> = [];
  for (const item of rawArr) {
    if (typeof item === "string" && !isPlaceholderLabel(item)) {
      valid.push({ label: item.replace(/\*\*/g, "").trim(), type: "note" });
    } else if (item && typeof item === "object") {
      const lbl = String(item.label || item.text || item.content || item.title || item.explanation || "")
        .replace(/\*\*/g, "")
        .trim();
      if (lbl && !isPlaceholderLabel(lbl)) {
        valid.push({
          label: lbl,
          type: item.type || "note",
          icon: item.icon,
        });
      }
    }
  }
  return valid;
}

export async function POST(request: NextRequest) {
  try {
    const { nodeLabel, mindMapTitle = "Mapa Mental", parentLabel = "", action = "expand" } = await request.json();

    if (!nodeLabel || nodeLabel.trim().length === 0) {
      return NextResponse.json({ error: "Nome do nó é obrigatório" }, { status: 400 });
    }

    const cleanConcept = nodeLabel.trim();
    const contextInfo = parentLabel
      ? `Tema do Mapa: "${mindMapTitle}" | Ramo Pai: "${parentLabel}" | Conceito Selecionado: "${cleanConcept}"`
      : `Tema do Mapa: "${mindMapTitle}" | Conceito Selecionado: "${cleanConcept}"`;

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "examples") {
      systemPrompt = `Você é um preceptor médico especialista.
Sua tarefa é gerar EXATAMENTE 3 exemplos clínicos, fármacos representativos, situações práticas ou manifestações concretas diretamente relacionadas ao conceito "${cleanConcept}" (${contextInfo}).

REGRAS OBRIGATÓRIAS:
1. CONTEÚDO REAL E ESPECÍFICO: Escreva os exemplos médicos reais (fármacos, patologias, achados clínicos ou casos práticos de "${cleanConcept}"). NUNCA escreva frases genéricas como "Exemplo Prático 1".
2. OBJETIVIDADE TÉCNICA: Cada item deve ter entre 10 e 22 palavras, com detalhes técnicos objetivos e sem adjetivos opinativos ("altamente", "necessário", "crucial").
3. Desabrevie siglas na primeira menção.

Formato JSON obrigatório (substitua os valores pelo conteúdo médico real sobre "${cleanConcept}"):
{
  "subtopics": [
    { "label": "<escreva aqui o 1º exemplo clínico/farmacológico real e detalhado sobre ${cleanConcept}>", "type": "note", "icon": "💡" },
    { "label": "<escreva aqui o 2º exemplo clínico/farmacológico real e detalhado sobre ${cleanConcept}>", "type": "note", "icon": "💊" },
    { "label": "<escreva aqui o 3º exemplo clínico/farmacológico real e detalhado sobre ${cleanConcept}>", "type": "note", "icon": "🔬" }
  ]
}`;
      userPrompt = `Gere 3 exemplos clínicos/práticos reais e específicos para o conceito "${cleanConcept}" (${contextInfo}).`;
    } else if (action === "explain") {
      systemPrompt = `Você é um autor de tratado médico-científico.
Sua tarefa é EXPLICAR de forma direta, técnica, objetiva e esclarecedora o que é e como funciona o conceito "${cleanConcept}" (${contextInfo}).

REGRAS OBRIGATÓRIAS:
1. EXPLICAÇÃO REAL DO CONCEITO: Gere 2 balões explicativos contendo a explicação científica real de "${cleanConcept}":
   - Balão 1 (🎯): Definição direta e mecanismo fisiológico, bioquímico, anatômico ou farmacológico exato de "${cleanConcept}" (quais enzimas, receptores, estruturas ou processos atuam).
   - Balão 2 (🔬): Consequência funcional, efeito fisiopatológico ou aplicação clínica direta decorrente de "${cleanConcept}".
2. PROIBIDO COPIAR TÍTULOS GENÉRICOS: NUNCA devolva rótulos vagos como "Explicação essencial simplificada", "Ponto de atenção ou regra mnemônica" ou "Mecanismo técnico". Escreva a explicação real do assunto "${cleanConcept}".
3. ZERO OPINIÃO: Proibido usar palavras vagas como "altamente", "necessário", "crucial", "fundamental" ou "essencial".
4. Cada balão deve ter entre 14 e 28 palavras com explicação clara e completa.

Formato JSON obrigatório:
{
  "subtopics": [
    { "label": "<escreva aqui a definição e o mecanismo exato de ${cleanConcept}>", "type": "note", "icon": "🎯" },
    { "label": "<escreva aqui o efeito fisiopatológico/clínico direto de ${cleanConcept}>", "type": "note", "icon": "🔬" }
  ]
}`;
      userPrompt = `Explique tecnicamente o que é, como ocorre o mecanismo e qual o efeito de "${cleanConcept}" (${contextInfo}).`;
    } else {
      systemPrompt = `Você é um especialista em estruturação de mapas mentais médicos.
Sua tarefa é EXPANDIR o conceito "${cleanConcept}" (${contextInfo}) em EXATAMENTE 3 subtópicos/desdobramentos técnicos e detalhados.

REGRAS OBRIGATÓRIAS:
1. CONTEÚDO MÉDICO ESPECÍFICO: Cada um dos 3 balões deve detalhar uma etapa do mecanismo, receptor/enzima, subdivisão anatômica/farmacológica ou repercussão clínica específica de "${cleanConcept}".
2. PROIBIDO RÓTULOS GENÉRICOS: NUNCA escreva frases vazias como "Primeiro subtópico conceitual", "Classificação e Critérios" ou "Mecanismo e Fisiopatologia". Escreva o fato científico completo sobre "${cleanConcept}".
3. ZERO OPINIÃO: Proibido usar palavras como "altamente", "necessário", "crucial", "fundamental" ou "essencial".
4. Cada item deve ter entre 12 e 25 palavras, desabreviando siglas pelo contexto.

Formato JSON obrigatório:
{
  "subtopics": [
    { "label": "<escreva aqui o 1º desdobramento técnico específico de ${cleanConcept}>", "type": "note", "icon": "🎯" },
    { "label": "<escreva aqui o 2º desdobramento técnico específico de ${cleanConcept}>", "type": "note", "icon": "🔬" },
    { "label": "<escreva aqui o 3º desdobramento técnico específico de ${cleanConcept}>", "type": "note", "icon": "📌" }
  ]
}`;
      userPrompt = `Expanda o conceito "${cleanConcept}" (${contextInfo}) em 3 desdobramentos técnicos, objetivos e detalhados.`;
    }

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
      maxOutputTokens: 16384,
      temperature: 0.4,
    });

    let subtopics = extractSubtopicsList(result);

    if (subtopics.length === 0) {
      const retryResult = await generateJSONFromAI({
        systemPrompt: `Explique e detalhe tecnicamente o conceito médico "${cleanConcept}" (${contextInfo}). Retorne JSON com a chave "subtopics" contendo uma lista de objetos {"label": "explicação técnica real e detalhada sobre ${cleanConcept}", "type": "note", "icon": "🎯"}. NUNCA use textos genéricos ou placeholders.`,
        userPrompt: `Detalhe tecnicamente "${cleanConcept}" em ${action === "explain" ? "2" : "3"} pontos objetivos e completos.`,
        maxOutputTokens: 16384,
        temperature: 0.5,
      });
      subtopics = extractSubtopicsList(retryResult);
    }

    if (subtopics.length === 0) {
      return NextResponse.json(
        { error: "A IA não conseguiu gerar a explicação neste momento. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ subtopics: subtopics.slice(0, 3) });
  } catch (error: any) {
    console.error("Expand MindMap Node Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar a IA para este balão." },
      { status: 500 }
    );
  }
}
