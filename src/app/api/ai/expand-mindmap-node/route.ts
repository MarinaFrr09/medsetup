import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { nodeLabel, mindMapTitle = "Mapa Mental", action = "expand" } = await request.json();

    if (!nodeLabel || nodeLabel.trim().length === 0) {
      return NextResponse.json({ error: "Nome do nó é obrigatório" }, { status: 400 });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "examples") {
      systemPrompt = `Você é um professor e preceptor acadêmico de alto nível.
Sua missão:
O usuário quer EXEMPLOS PRÁTICOS / CASOS CLÍNICOS / APLICAÇÕES REAIS do conceito "${nodeLabel}" (no contexto de "${mindMapTitle}").
Gere EXATAMENTE 3 exemplos práticos ou aplicações diretas, curtos, específicos e esclarecedores.
Cada item deve ser direto (no máximo 10 palavras por item).

Responda OBRIGATORIAMENTE em JSON:
{
  "subtopics": [
    { "label": "Exemplo Prático 1", "type": "note", "icon": "💡" },
    { "label": "Exemplo Prático 2", "type": "note", "icon": "💡" },
    { "label": "Exemplo Prático 3", "type": "note", "icon": "💡" }
  ]
}`;
      userPrompt = `Gere 3 exemplos práticos para o conceito "${nodeLabel}" no estudo de "${mindMapTitle}".`;
    } else if (action === "explain") {
      systemPrompt = `Você é um professor renomado por simplificar temas difíceis com maestria.
Sua missão:
O usuário quer uma EXPLICAÇÃO CLARA, DESCOMPLICADA E ESSENCIAL do conceito "${nodeLabel}" (no contexto de "${mindMapTitle}").
Gere 2 a 3 pontos essenciais explicando o conceito de forma simples, objetiva e memorável.
Cada item deve ter entre 5 e 12 palavras.

Responda OBRIGATORIAMENTE em JSON:
{
  "subtopics": [
    { "label": "Explicação essencial simplificada", "type": "note", "icon": "🎯" },
    { "label": "Ponto de atenção ou regra mnemônica", "type": "note", "icon": "⚠️" }
  ]
}`;
      userPrompt = `Explique de forma descomplicada o conceito "${nodeLabel}" no estudo de "${mindMapTitle}".`;
    } else {
      // Default: Expand subtopics as child detail notes
      systemPrompt = `Você é um professor e especialista em estruturação de mapas mentais acadêmicos.
Sua missão:
O usuário clicou no conceito "${nodeLabel}" (dentro do mapa mental sobre "${mindMapTitle}") e pediu para EXPANDIR COM IA.
Gere EXATAMENTE 3 subtópicos/desdobramentos conceituais essenciais, aprofundados e didáticos que decorrem diretamente deste conceito.
Desabrevie siglas médicas/acadêmicas pelo contexto.
Cada item deve ser claro, conciso e explicativo (entre 6 e 18 palavras).
Atribua a cada subtópico um ícone relevante (ex: 🎯, 💡, ⚠️, 🔬, 📌, 💊, ⭐).

Responda OBRIGATORIAMENTE em JSON no seguinte formato:
{
  "subtopics": [
    {
      "label": "Primeiro subtópico conceitual detalhado",
      "type": "note",
      "icon": "🎯"
    },
    {
      "label": "Segundo subtópico conceitual detalhado",
      "type": "note",
      "icon": "🔬"
    },
    {
      "label": "Terceiro subtópico conceitual detalhado",
      "type": "note",
      "icon": "📌"
    }
  ]
}`;
      userPrompt = `Gere 3 subtópicos essenciais e objetivos para o conceito: "${nodeLabel}" no contexto de "${mindMapTitle}".`;
    }

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
    });

    const subtopics = result.subtopics || [
      { label: `Aspecto chave de ${nodeLabel}`, type: "note", icon: "📌" },
      { label: `Fisiopatologia e Mecanismos`, type: "note", icon: "🔬" },
      { label: `Critérios e Conduta Prática`, type: "note", icon: "🎯" },
    ];

    return NextResponse.json({ subtopics: subtopics.slice(0, 3) });
  } catch (error: any) {
    console.error("Expand MindMap Node Error:", error);
    return NextResponse.json(
      {
        subtopics: [
          { label: "Classificação e Critérios", type: "note", icon: "📌" },
          { label: "Mecanismo e Fisiopatologia", type: "note", icon: "🔬" },
          { label: "Conduta e Aplicação Prática", type: "note", icon: "🎯" },
        ],
      },
      { status: 200 }
    );
  }
}
