import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import {
  extractTextFromDocx,
  extractTextFromPptx,
  extractTextFromPdf,
} from "@/lib/document-parser";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

const PROGRESSIVE_5CLUE_SYSTEM_PROMPT = `Você é um Professor Titular de Clínica Médica, Cirurgia, Pediatria, Ginecologia/Obstetrícia e Emergência, criador de desafios diagnósticos médicos baseados em 5 Pistas Progressivas.

SUA MISSÃO:
Criar um CASO CLÍNICO PONTUAL DE DIAGNÓSTICO EM 5 PISTAS PROGRESSIVAS, onde o estudante tenta adivinhar o diagnóstico a cada pista revelada, seguido de um DEBRIEFING DETALHADO ao final.

ESTRUTURA OBRIGATÓRIA DAS 5 PISTAS ("clues", array com exatamente 5 strings):
- Pista 1 (clues[0] — "Vinheta clínica"): Apresentação inicial concisa (1 a 2 frases) contendo perfil do paciente (idade, sexo, ocupação ou contexto), local de atendimento (pronto-socorro, ambulatório, enfermaria) e queixa principal com tempo de evolução, intrigante mas ainda ampla.
- Pista 2 (clues[1] — "Pista 2/5"): História da Doença Atual (HDA) detalhada, circunstâncias do início, fatores desencadeantes/epidemiológicos, evolução dos sintomas e antecedentes relevantes. NUNCA mencione o nome do diagnóstico aqui.
- Pista 3 (clues[2] — "Pista 3/5"): Sinais vitais completos e achados do exame físico direcionado, incluindo sinais semiológicos clássicos, mas sem entregar o diagnóstico de forma explícita.
- Pista 4 (clues[3] — "Pista 4/5"): Resultados de exames laboratoriais, líquor, ECG ou exames de imagem com valores numéricos realistas e valores de referência entre parênteses — ex: "CPK 25.000 U/L (referência: 39 a 308 U/L)".
- Pista 5 (clues[4] — "Pista 5/5"): Conduta terapêutica/emergencial instituída e evolução clínica nas horas/dias seguintes, descrevendo o tratamento específico sem citar o nome literal da doença (ex: "infusão intravenosa imediata de 20 ampolas do soro específico...").

REGRAS MANDATÓRIAS:
1. Se um PDF ou texto de material do aluno foi anexado, o caso clínico DEVE ser fiel ao tema/doença abordado no documento anexado.
2. Se for geração aleatória sem PDF, escolha uma doença relevante de qualquer área da Medicina (Clínica Médica, Cardiologia, Pneumologia, Gastroenterologia, Nefrologia, Endocrinologia, Neurologia, Infectologia, Hematologia, Reumatologia, Toxicologia/Emergência, Cirurgia, Pediatria ou Ginecologia e Obstetrícia), respeitando o nível de dificuldade solicitado ("Fácil", "Médio" ou "Difícil").
3. Inclua "suggestedDistractors": lista de 8 diagnósticos diferenciais plausíveis em português (para enriquecer a lista de seleção do aluno sem revelar a resposta).
4. O Debriefing ("debriefing") deve ser completo, didático e aprofundado, explicando fisiopatologia, o raciocínio por trás de cada uma das 5 pistas, diagnósticos diferenciais e tratamento com doses/condutas.

Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "diagnosis": "Nome Oficial e Conciso do Diagnóstico (ex: 'Acidente crotálico', 'Dissecção aguda de aorta', 'Púrpura trombocitopênica trombótica')",
  "acceptedSynonyms": ["sinonimo 1", "sinonimo 2", "sigla se houver"],
  "specialty": "Área da Medicina (ex: Emergência / Toxicologia, Cardiologia, Neurologia, Pediatria, GO, Cirurgia, etc.)",
  "difficulty": "Fácil | Médio | Difícil",
  "clues": [
    "Texto da Vinheta clínica (1 a 2 frases concisas)",
    "Texto da Pista 2/5 (HDA detalhada, história e contexto epidemiológico)",
    "Texto da Pista 3/5 (Sinais vitais e exame físico direcionado com sinais semiológicos)",
    "Texto da Pista 4/5 (Exames laboratoriais/complementares com valores de referência entre parênteses)",
    "Texto da Pista 5/5 (Conduta instituída e evolução clínica sem citar o nome literal da doença)"
  ],
  "suggestedDistractors": [
    "Diagnóstico Diferencial 1",
    "Diagnóstico Diferencial 2",
    "Diagnóstico Diferencial 3",
    "Diagnóstico Diferencial 4",
    "Diagnóstico Diferencial 5",
    "Diagnóstico Diferencial 6"
  ],
  "debriefing": {
    "overview": "Explicação fisiopatológica e clínica completa da doença e do caso (1 a 2 parágrafos densos).",
    "clueBreakdown": [
      "Explicação detalhada do que a Vinheta clínica indicava",
      "Explicação detalhada dos achados da Pista 2/5",
      "Explicação detalhada dos sinais físicos da Pista 3/5",
      "Explicação detalhada dos exames complementares da Pista 4/5",
      "Explicação detalhada da conduta e desfecho da Pista 5/5"
    ],
    "differentials": [
      {
        "name": "Diagnóstico Diferencial A",
        "distinction": "Por que se assemelha ao caso e qual achado clínico/laboratorial permite descartá-lo"
      },
      {
        "name": "Diagnóstico Diferencial B",
        "distinction": "Por que se assemelha ao caso e qual achado clínico/laboratorial permite descartá-lo"
      },
      {
        "name": "Diagnóstico Diferencial C",
        "distinction": "Por que se assemelha ao caso e qual achado clínico/laboratorial permite descartá-lo"
      }
    ],
    "management": "Conduta médica padrão-ouro detalhada (medidas imediatas, fármacos, doses, antídotos ou cirurgia e monitoramento).",
    "pearls": [
      "Pérola clínica de alto rendimento 1",
      "Pérola clínica de alto rendimento 2",
      "Pérola clínica de alto rendimento 3"
    ]
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let specialty = "Aleatória (Todas as Áreas da Medicina)";
    let difficulty = "Aleatório (Fácil a Difícil)";
    let topic = "";
    let materialContext = "";
    let avoidDiagnoses: string[] = [];
    const inlineParts: Array<{ mimeType: string; data: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      specialty = String(formData.get("specialty") || specialty);
      difficulty = String(formData.get("difficulty") || difficulty);
      topic = String(formData.get("topic") || "");
      materialContext = String(formData.get("materialContext") || "");
      const avoidRaw = String(formData.get("avoidDiagnoses") || "");
      if (avoidRaw) {
        try {
          avoidDiagnoses = JSON.parse(avoidRaw);
        } catch {}
      }

      const uploadedFiles = [
        ...formData.getAll("files"),
        ...formData.getAll("file"),
      ].filter((item): item is File => item instanceof File && item.size > 0);

      for (const file of uploadedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fName = file.name.toLowerCase();

        if (fName.endsWith(".pdf")) {
          const pdfRes = await extractTextFromPdf(buffer);
          const pdfText =
            typeof pdfRes === "string" ? pdfRes : pdfRes?.text || "";
          if (pdfText && pdfText.trim().length > 100) {
            materialContext += `\n\n=== CONTEÚDO EXTRAÍDO DO PDF (${file.name}) ===\n${pdfText.slice(0, 35000)}`;
          } else {
            inlineParts.push({
              mimeType: "application/pdf",
              data: buffer.toString("base64"),
            });
          }
        } else if (fName.endsWith(".docx") || fName.endsWith(".doc")) {
          const docText = (await extractTextFromDocx(buffer)) || "";
          materialContext += `\n\n=== CONTEÚDO DO DOCUMENTO (${file.name}) ===\n${docText.slice(0, 35000)}`;
        } else if (fName.endsWith(".pptx") || fName.endsWith(".ppt")) {
          const pptText = (await extractTextFromPptx(buffer)) || "";
          materialContext += `\n\n=== CONTEÚDO DOS SLIDES (${file.name}) ===\n${pptText.slice(0, 35000)}`;
        } else if (file.type.startsWith("image/")) {
          inlineParts.push({
            mimeType: file.type,
            data: buffer.toString("base64"),
          });
        } else {
          const txt = buffer.toString("utf-8");
          materialContext += `\n\n=== ARQUIVO (${file.name}) ===\n${txt.slice(0, 35000)}`;
        }
      }
    } else {
      const body = await req.json();
      specialty = body.specialty || specialty;
      difficulty = body.difficulty || difficulty;
      topic = body.topic || "";
      materialContext = body.materialContext || "";
      if (Array.isArray(body.avoidDiagnoses)) {
        avoidDiagnoses = body.avoidDiagnoses;
      }
    }

    const hasMaterial =
      materialContext.trim().length > 20 || inlineParts.length > 0;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;

    const prompt = `Gere um Caso Clínico Pontual Interativo de 5 Pistas Progressivas em JSON.
${
  hasMaterial
    ? `MODO BASEADO EM PDF/MATERIAL DO ESTUDANTE:
Baseie o caso clínico DIRETAMENTE nas patologias, quadro clínico, exames laboratoriais e condutas presentes no documento abaixo!`
    : `MODO ALEATÓRIO MULTIESPECIALIDADE:
- Área/Especialidade solicitada: ${specialty}
- Nível de Dificuldade solicitado: ${difficulty}
${topic ? `- Foco/Tema específico sugerido: ${topic}` : ""}
${
  avoidDiagnoses.length > 0
    ? `- NÃO repita nenhum destes diagnósticos já sorteados recentemente: ${avoidDiagnoses.join(", ")}`
    : ""
}`
}
${
  materialContext.trim()
    ? `\nCONTEÚDO DO PDF / MATERIAL ANEXADO:\n"""\n${materialContext.slice(0, 38000)}\n"""`
    : ""
}

Garanta que "clues" tenha EXATAMENTE 5 pistas na ordem:
1) Vinheta clínica (1-2 frases concisas)
2) Pista 2/5 (HDA e história detalhada)
3) Pista 3/5 (Sinais vitais e exame físico direcionado)
4) Pista 4/5 (Exames laboratoriais/imagem com valores de referência entre parênteses)
5) Pista 5/5 (Conduta instituída e evolução clínica sem entregar o nome literal do diagnóstico).`;

    const parsed: any = await generateJSONFromAI({
      systemPrompt: PROGRESSIVE_5CLUE_SYSTEM_PROMPT,
      userPrompt: prompt,
      fileAttachments: inlineParts.length > 0 ? inlineParts : undefined,
    });

    const rawClues = Array.isArray(parsed?.clues) ? parsed.clues : [];
    const normalizedClues: [string, string, string, string, string] = [
      String(rawClues[0] || "Paciente dá entrada no pronto-socorro com quadro agudo."),
      String(rawClues[1] || "História clínica detalhada revelando progressão dos sintomas."),
      String(rawClues[2] || "Exame físico direcionado com achados semiológicos clássicos."),
      String(rawClues[3] || "Exames complementares com alterações laboratoriais específicas."),
      String(rawClues[4] || "Conduta terapêutica específica instituída com resposta clínica favorável."),
    ];

    return NextResponse.json({
      id: `pcase_${Date.now()}`,
      caseNumber: Math.floor(220 + Math.random() * 780),
      date: dateStr,
      diagnosis: String(parsed?.diagnosis || "Diagnóstico Clínico").trim(),
      acceptedSynonyms: Array.isArray(parsed?.acceptedSynonyms)
        ? parsed.acceptedSynonyms
        : [],
      specialty: String(parsed?.specialty || specialty),
      difficulty:
        parsed?.difficulty === "Fácil" ||
        parsed?.difficulty === "Médio" ||
        parsed?.difficulty === "Difícil"
          ? parsed.difficulty
          : "Médio",
      clues: normalizedClues,
      suggestedDistractors: Array.isArray(parsed?.suggestedDistractors)
        ? parsed.suggestedDistractors
        : [],
      debriefing: {
        overview: String(
          parsed?.debriefing?.overview ||
            "Síntese fisiopatológica e clínica do caso."
        ),
        clueBreakdown: [
          String(parsed?.debriefing?.clueBreakdown?.[0] || "Análise da Vinheta clínica."),
          String(parsed?.debriefing?.clueBreakdown?.[1] || "Análise da Pista 2/5."),
          String(parsed?.debriefing?.clueBreakdown?.[2] || "Análise da Pista 3/5."),
          String(parsed?.debriefing?.clueBreakdown?.[3] || "Análise da Pista 4/5."),
          String(parsed?.debriefing?.clueBreakdown?.[4] || "Análise da Pista 5/5."),
        ],
        differentials: Array.isArray(parsed?.debriefing?.differentials)
          ? parsed.debriefing.differentials
          : [],
        management: String(
          parsed?.debriefing?.management ||
            "Conduta terapêutica e monitoramento recomendados."
        ),
        pearls: Array.isArray(parsed?.debriefing?.pearls)
          ? parsed.debriefing.pearls
          : [],
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar caso clínico 5 pistas:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro ao gerar caso clínico com IA. Verifique sua chave de API nas configurações.",
      },
      { status: 500 }
    );
  }
}
