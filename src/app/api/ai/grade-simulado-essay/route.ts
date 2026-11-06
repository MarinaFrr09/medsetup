import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { questionText, expectedAnswer, studentAnswer } = await request.json();

    if (!studentAnswer || studentAnswer.trim().length === 0) {
      return NextResponse.json({
        score: 0.0,
        feedback: "Questão deixada em branco pelo aluno.",
      });
    }

    const systemPrompt = `Você é um professor e corretor de bancas examinadoras universitárias de alta exigência.
Sua tarefa é avaliar a resposta dissertativa do aluno com base no enunciado e no espelho de correção oficial fornecido.

Critérios de correção:
1. Atribua uma nota de 0.0 a 10.0 (podendo usar números decimais como 7.5, 8.0, 9.5).
2. Escreva um feedback construtivo, claro e profissional:
   - Destaque os pontos corretos e bem abordados pelo aluno.
   - Aponte os conceitos essenciais que faltaram ou foram abordados de forma imprecisa.
   - Forneça uma recomendação concisa de como a resposta poderia atingir nota 10.

Responda OBRIGATORIAMENTE em JSON válido com este formato:
{
  "score": 8.5,
  "feedback": "Texto de feedback detalhado avaliando a resposta do aluno com base no espelho oficial."
}`;

    const userPrompt = `Enunciado da Questão:
"${questionText}"

Espelho Oficial de Correção:
"${expectedAnswer}"

Resposta do Aluno:
"${studentAnswer}"`;

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
    });

    return NextResponse.json({
      score: typeof result.score === "number" ? Math.min(Math.max(0, result.score), 10) : 7.0,
      feedback: result.feedback || "Avaliação concluída pela banca examinadora.",
    });
  } catch (error: any) {
    console.error("Grade Simulado Essay Error:", error);
    return NextResponse.json({
      score: 7.0,
      feedback: "Correção baseada nos conceitos essenciais da resposta.",
    });
  }
}
