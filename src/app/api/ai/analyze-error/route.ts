import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      questionText,
      options,
      userAnswer,
      correctAnswer,
      explanation,
      subject,
    } = body;

    if (!questionText || !correctAnswer) {
      return NextResponse.json(
        { error: "Enunciado e gabarito da questão são obrigatórios." },
        { status: 400 }
      );
    }

    const optionsText = Array.isArray(options) && options.length > 0
      ? options.map((o: any) => `${(o.id || "").toUpperCase()}) ${o.text || ""}`).join("\n")
      : "Questão dissertativa ou sem alternativas registradas.";

    const systemPrompt = `Você é um preceptor médico sênior especialista em engenharia reversa de erros de provas médicas e bancas de residência (USP, UNICAMP, ENARE, Revalida, Anhembi).
Sua missão é dissecar cirurgicamente por que o estudante errou a questão médica e formular um registro de erro estruturado de altíssimo rendimento para estudo ativo.

REGRAS RÍGIDAS DE CONTEÚDO:
1. 'pontoCego' (Core Concept): Um único parágrafo curto e direto respondendo exatamente à pergunta: "O que exatamente eu não sabia ou interpretei errado?"
   - Seja incisivo, apontando o conceito fisiopatológico, diagnóstico ou terapêutico fundamental que faltou.
2. 'pegadinhaDistrator': O que tornou a alternativa errada atraente ou o que fez o aluno descartar a alternativa certa.
   - Explique o mecanismo do distrator (ex: semelhança de sintomas, falsa correlação, palavra excludente).
3. 'gatilhoMemoria' (Regra de Bolso): Uma frase curta e direta de fixação mental (máximo 2 linhas), no formato mnemônico ou 'X -> Y' de rápida leitura (ex: "HPV 16 e 18 inativam p53 e RB -> sem parada no checkpoint G1/S").
4. 'especialidade': A grande área médica (ex: "Clínica Médica", "Patologia", "Oncologia", "Cardiologia", "Cirurgia Geral", "Pediatria", "Ginecologia e Obstetrícia", "Farmacologia").
5. 'subtema': O subtema específico (ex: "Eletrocardiograma", "Carcinogênese e Neoplasias", "Mecanismos Moleculares", "Arritmias", "Insuficiência Cardíaca").
6. 'causaErro': Classifique estritamente em UMA das 5 categorias:
   - "conceitual" (não dominava o conceito / fisiopatologia básica)
   - "pegadinha" (caiu em distrator atraente ou armadilha)
   - "interpretacao" (erro ao interpretar dados do caso clínico)
   - "detalhe_conduta" (detalhe específico de protocolo / posologia / diretriz)
   - "falta_atencao" (desatenção ao comando)
7. 'referenciaFonte': Fonte provável ou informada (ex: "Simulado Acadêmico").

Responda OBRIGATORIAMENTE em JSON válido com esta estrutura:
{
  "pontoCego": "Texto do ponto cego...",
  "pegadinhaDistrator": "Texto da pegadinha/distrator...",
  "gatilhoMemoria": "Frase curta de fixação...",
  "especialidade": "Área médica",
  "subtema": "Subtema específico",
  "causaErro": "conceitual" | "pegadinha" | "interpretacao" | "detalhe_conduta" | "falta_atencao",
  "referenciaFonte": "Fonte da questão"
}`;

    const userPrompt = `Analise o erro cometido pelo aluno na seguinte questão:

DISCIPLINA INFORMADA: ${subject || "Medicina"}
ENUNCIADO DA QUESTÃO:
"""
${questionText}
"""

ALTERNATIVAS:
${optionsText}

RESPOSTA MARCADA PELO ALUNO (INCORRETA): ${userAnswer || "Não informada / errada"}
GABARITO OFICIAL (CORRETA): ${correctAnswer}

EXPLICAÇÃO OFICIAL / COMENTÁRIO:
${explanation || "Sem comentário adicional."}

Disseque o erro e gere o Ponto Cego, Pegadinha/Distrator, Gatilho de Memória (Regra de Bolso), Especialidade, Subtema e Causa do Erro em JSON.`;

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxOutputTokens: 2500,
    });

    if (!result || typeof result !== "object") {
      throw new Error("Falha ao analisar o erro com a IA.");
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Analyze Error API:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar análise do erro com a IA." },
      { status: 500 }
    );
  }
}
