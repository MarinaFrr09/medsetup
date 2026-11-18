/**
 * Question Balancer & Anti-Length-Bias Randomization Engine
 * 
 * Solves the notorious "longest answer is the correct one" bias in LLM-generated MCQs.
 * Ensures:
 * 1. Explanatory trailing clauses are trimmed from correct options.
 * 2. Distractors and correct options have balanced lengths.
 * 3. Length profile is actively randomized across the exam (distractors are frequently the longest option).
 * 4. Option positions (A, B, C, D, E) are evenly and randomly distributed.
 */

import { generateJSONFromAI } from "@/lib/ai";

/**
 * Trims verbose trailing explanation clauses that LLMs often attach
 * to the correct answer (e.g. ", visto que...", ", caracterizada por...", etc.)
 */
export function trimExplanatoryClauses(text: string): string {
  if (!text) return "";
  let clean = text.trim();

  // Pattern matching common justification clauses attached to correct answers
  const trailingClauseRegex = /(?:,\s*(?:visto que|uma vez que|pois|já que|tendo em vista|o que decorre|o que justifica|com o objetivo de|a fim de|garantindo assim|garantindo|evitando assim|evitando|por se tratar de|devido a(?:o)?|sendo caracterizad[oa] por|caracterizad[oa] por|o que permite|com intuito de|cuja finalidade é|por ser o tratamento de escolha|sendo o padrão ouro|sendo a conduta padrão)[\s\S]*)$/i;

  const match = clean.match(trailingClauseRegex);
  if (match && match.index !== undefined && match.index >= 15) {
    const candidate = clean.slice(0, match.index).trim();
    // Ensure we don't leave an incomplete sentence or hanging punctuation
    if (candidate.length >= 15 && !/[:,;(\[]$/.test(candidate)) {
      clean = candidate;
    }
  }

  // Also remove trailing parentheses containing explanations like "(tratamento de escolha)" or "(primeira linha)"
  clean = clean.replace(/\s*\((?:tratamento de escolha|primeira linha|padrão ouro|droga de escolha|conduta padrão|visto que[^)]+|pois[^)]+)\)\.?$/i, "");

  // Remove trailing dangling commas or semicolons
  clean = clean.replace(/[,;:]+$/, "").trim();

  return clean;
}

export interface NormalizedOption {
  id: string;
  text: string;
  _isCorrect?: boolean;
}

/**
 * Normalizes options, trims giveaway explanation clauses, and applies Fisher-Yates shuffle.
 */
export function normalizeAndBalanceQuestion(q: any): any {
  if (!q || typeof q !== "object") return q;

  const isMC =
    q.type === "multiple_choice" ||
    q.type === "multiple-choice" ||
    (!q.type && Array.isArray(q.options) && q.options.length >= 2) ||
    (Array.isArray(q.alternativas) && q.alternativas.length >= 2);

  const rawOptionsList = q.options || q.alternativas || q.choices || q.respostas;
  if (!isMC || !Array.isArray(rawOptionsList) || rawOptionsList.length < 2) {
    return q;
  }

  const rawAns = String(q.answer || q.gabarito || q.resposta || q.correctAnswer || "").trim().toLowerCase();

  // 1. Normalize raw options into { id, text }
  const originalOptions: NormalizedOption[] = rawOptionsList.map((opt: any, idx: number) => {
    const defaultId = String.fromCharCode(97 + idx);
    if (typeof opt === "string") {
      return { id: defaultId, text: opt.trim() };
    }
    const optId = String(opt.id || opt.letra || defaultId).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    return {
      id: optId || defaultId,
      text: String(opt.text || opt.texto || opt.descricao || "").trim(),
    };
  });

  // 2. Identify correct option index
  let correctIndex = originalOptions.findIndex((o) => o.id === rawAns);
  if (correctIndex === -1) {
    correctIndex = originalOptions.findIndex((o) => o.text.toLowerCase() === rawAns);
  }
  if (correctIndex === -1 && rawAns.length === 1 && rawAns >= "a" && rawAns <= "z") {
    const code = rawAns.charCodeAt(0) - 97;
    if (code >= 0 && code < originalOptions.length) {
      correctIndex = code;
    }
  }
  if (correctIndex === -1) {
    correctIndex = 0;
  }

  // 3. Trim verbose explanatory clauses from the correct option
  originalOptions[correctIndex].text = trimExplanatoryClauses(originalOptions[correctIndex].text);

  // 4. Tag with correctness marker
  const tagged = originalOptions.map((opt, idx) => ({
    text: opt.text,
    _isCorrect: idx === correctIndex,
  }));

  // 5. Shuffle options with Fisher-Yates to randomize letter position
  for (let i = tagged.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
  }

  // 6. Re-index letters (a, b, c, d, e...)
  const letters = ["a", "b", "c", "d", "e", "f", "g"];
  let finalAnswer = "a";

  const finalOptions = tagged.map((item, idx) => {
    const letter = letters[idx] || String.fromCharCode(97 + idx);
    if (item._isCorrect) {
      finalAnswer = letter;
    }
    return {
      id: letter,
      text: item.text,
    };
  });

  return {
    ...q,
    options: finalOptions,
    answer: finalAnswer,
  };
}

/**
 * Checks if a question has a "longest answer is correct" bias.
 */
export function checkQuestionLengthBias(q: any): { isCorrectLongest: boolean; ratio: number } {
  if (!q || !Array.isArray(q.options) || q.options.length < 2) {
    return { isCorrectLongest: false, ratio: 1.0 };
  }

  const ans = String(q.answer || "").toLowerCase().trim();
  const correctOpt = q.options.find((o: any) => String(o.id).toLowerCase() === ans);
  if (!correctOpt) return { isCorrectLongest: false, ratio: 1.0 };

  const distractors = q.options.filter((o: any) => String(o.id).toLowerCase() !== ans);
  if (distractors.length === 0) return { isCorrectLongest: false, ratio: 1.0 };

  const correctLen = correctOpt.text.length;
  const maxDistractorLen = Math.max(...distractors.map((d: any) => d.text.length));

  const isCorrectLongest = correctLen > maxDistractorLen;
  const ratio = maxDistractorLen > 0 ? correctLen / maxDistractorLen : 1.0;

  return { isCorrectLongest, ratio };
}

/**
 * Analyzes a batch of questions and, if systematic length bias is detected
 * (e.g. correct answer is the longest in > 40% of questions or ratio > 1.3),
 * performs an intelligent AI equalization pass on the biased questions.
 */
export async function balanceQuestionBatch(
  questions: any[],
  customApiKey?: string
): Promise<any[]> {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  // Pass 1: Local normalization and clause trimming
  const normalized = questions.map(normalizeAndBalanceQuestion);

  // Identify questions where multiple choice options have significant length bias
  const biasedIndices: number[] = [];
  let longestCount = 0;
  let mcCount = 0;

  normalized.forEach((q, idx) => {
    const isMC = q.type === "multiple_choice" || (Array.isArray(q.options) && q.options.length >= 2);
    if (isMC) {
      mcCount++;
      const { isCorrectLongest, ratio } = checkQuestionLengthBias(q);
      if (isCorrectLongest) {
        longestCount++;
      }
      // Flag question if correct answer is the longest by > 25%
      if (isCorrectLongest && ratio >= 1.25) {
        biasedIndices.push(idx);
      }
    }
  });

  // If there's an obvious systematic bias (correct is longest in >= 40% of MC questions or severe bias exists)
  const shouldEqualize = (mcCount > 0 && longestCount / mcCount >= 0.4) || biasedIndices.length > 0;

  if (shouldEqualize && biasedIndices.length > 0) {
    try {
      console.log(`[question-balancer] Detectado vício de tamanho em ${biasedIndices.length} questão(ões). Executando equalização psicométrica de alternativas...`);
      
      const questionsToFix = biasedIndices.map((i) => ({
        index: i,
        question: normalized[i].question,
        options: normalized[i].options,
        answer: normalized[i].answer,
        explanation: normalized[i].explanation,
      }));

      const equalizePrompt = `Você é um psicometrista e elaborador sênior de questões médicas (padrão Revalida/USMLE).
PROBLEMA A CORRIGIR: Nas questões a seguir, a alternativa correta é notavelmente a mais longa e detalhada, tornando a resposta óbvia para o aluno apenas pelo tamanho.

SUA MISSÃO MANDATÓRIA:
Reescreva e equalize as alternativas de cada uma das ${questionsToFix.length} questões abaixo para ELIMINAR COMPLETAMENTE o vício da maior alternativa:
1. Mantenha RIGOROSAMENTE o mesmo enunciado, a mesma essência clínica e o mesmo gabarito (a mesma opção correta).
2. EQUILÍBRIO DE EXTENSÃO:
   - Todas as alternativas da questão devem ter extensão e densidade técnica muito semelhantes (mesmo número aproximado de palavras).
   - Se a correta cita dosagens/condutas completas, os distratores DEVEM OBRIGATORIAMENTE conter condutas completas alternativas com o mesmo nível de detalhe!
3. RANDOMIZAÇÃO ATIVA DE TAMANHO:
   - Em pelo menos metade dessas questões, faça um DISTRATOR (alternativa incorreta) ser a opção MAIS LONGA e elaborada, enquanto a alternativa correta deve ser mais concisa e direta!
4. PROIBIDO JUSTIFICAR NA CORRETA:
   - Remova qualquer explicação ou justificativa de dentro do texto da alternativa correta. A alternativa é apenas a afirmação ou conduta direta.

Retorne estritamente o JSON:
{
  "equalizedQuestions": [
    {
      "index": 0,
      "options": [
        { "id": "a", "text": "..." },
        { "id": "b", "text": "..." },
        { "id": "c", "text": "..." },
        { "id": "d", "text": "..." }
      ],
      "answer": "a",
      "explanation": "..."
    }
  ]
}`;

      const res = await generateJSONFromAI({
        systemPrompt: equalizePrompt,
        userPrompt: JSON.stringify(questionsToFix, null, 2),
        customApiKey,
        maxOutputTokens: 16384,
        temperature: 0.2,
      });

      const fixedList = res?.equalizedQuestions || res?.questions || res;
      if (Array.isArray(fixedList)) {
        for (const fixed of fixedList) {
          const origIdx = typeof fixed.index === "number" ? fixed.index : -1;
          if (origIdx >= 0 && origIdx < normalized.length && Array.isArray(fixed.options) && fixed.options.length >= 2) {
            normalized[origIdx] = normalizeAndBalanceQuestion({
              ...normalized[origIdx],
              options: fixed.options,
              answer: fixed.answer || normalized[origIdx].answer,
              explanation: fixed.explanation || normalized[origIdx].explanation,
            });
          }
        }
        console.log(`[question-balancer] Equalização concluída com sucesso.`);
      }
    } catch (eqErr) {
      console.warn("[question-balancer] Equalização secundária com IA falhou ou foi ignorada, mantendo normalização algorítmica:", eqErr);
    }
  }

  // Final pass: Re-shuffle option letters so letters remain perfectly distributed across A, B, C, D, E
  return normalized.map(normalizeAndBalanceQuestion);
}
