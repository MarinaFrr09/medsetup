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

const PROGRESSIVE_5CLUE_DRUG_SYSTEM_PROMPT = `Você é um Professor Titular de Farmacologia Clínica e Terapêutica Médica (Goodman & Gilman, Katzung), criador de desafios diagnósticos de medicamentos em 5 Pistas Progressivas.

SUA MISSÃO:
Criar um DESAFIO DE ADIVINHAÇÃO DE FÁRMACO / REMÉDIO EM 5 PISTAS PROGRESSIVAS, onde o estudante tenta descobrir qual é o medicamento a cada pista liberada, seguido de um DEBRIEFING FARMACOLÓGICO DETALHADO ao final.

ESTRUTURA OBRIGATÓRIA DAS 5 PISTAS ("clues", array com exatamente 5 strings):
- Pista 1 (clues[0] — "Indicação clínica"): Apresentação inicial concisa (1 a 2 frases) com a principal indicação clínica e cenário de uso do fármaco, sem entregar o nome.
- Pista 2 (clues[1] — "Pista 2/5"): Mecanismo de ação molecular/celular e alvo farmacológico (receptor, enzima ou canal iônico), sem mencionar o nome literal do remédio.
- Pista 3 (clues[2] — "Pista 3/5"): Farmacocinética marcante (via, biodisponibilidade, meia-vida, ligação proteica, CYP450, excreção renal/hepática ou janela terapêutica).
- Pista 4 (clues[3] — "Pista 4/5"): Efeitos adversos clássicos, toxicidades específicas, sinais de intoxicação ou exames de monitorização obrigatórios.
- Pista 5 (clues[4] — "Pista 5/5"): Contraindicações absolutas, interações medicamentosas marcantes, antídoto/reversor específico ou pérola farmacológica inconfundível (ainda sem citar o nome literal do fármaco).

Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "drugName": "Nome Genérico Oficial do Medicamento em Português (ex: 'Amiodarona', 'Varfarina', 'Vancomicina')",
  "acceptedSynonyms": ["nome comercial principal", "sigla ou sinonimo"],
  "drugClass": "Classe Farmacológica (ex: 'Antiarrítmico Classe III', 'Antibiótico Glicopeptídeo')",
  "difficulty": "Fácil | Médio | Difícil",
  "clues": [
    "Texto da Pista 1 (Indicação clínica inicial)",
    "Texto da Pista 2/5 (Mecanismo de ação)",
    "Texto da Pista 3/5 (Farmacocinética)",
    "Texto da Pista 4/5 (Efeitos adversos / toxicidade)",
    "Texto da Pista 5/5 (Contraindicações, interações, antídoto ou pérola final)"
  ],
  "suggestedDistractors": [
    "Fármaco Similar 1",
    "Fármaco Similar 2",
    "Fármaco Similar 3",
    "Fármaco Similar 4",
    "Fármaco Similar 5",
    "Fármaco Similar 6"
  ],
  "debriefing": {
    "overview": "Síntese farmacológica completa do medicamento, seu mecanismo e papel clínico.",
    "clueBreakdown": [
      "Explicação da Pista 1 (Indicação clínica)",
      "Explicação da Pista 2/5 (Mecanismo de ação)",
      "Explicação da Pista 3/5 (Farmacocinética)",
      "Explicação da Pista 4/5 (Efeitos adversos)",
      "Explicação da Pista 5/5 (Interações / Antídoto / Pérola)"
    ],
    "differentials": [
      {
        "name": "Fármaco Comparável A",
        "distinction": "Semelhança e principal diferença farmacológica ou clínica"
      },
      {
        "name": "Fármaco Comparável B",
        "distinction": "Semelhança e principal diferença farmacológica ou clínica"
      }
    ],
    "clinicalUseAndMonitoring": "Posologia/conduta prática, parâmetros laboratoriais de monitorização e antídoto/reversão em caso de intoxicação.",
    "pearls": [
      "Pérola farmacológica de alto rendimento 1",
      "Pérola farmacológica de alto rendimento 2",
      "Pérola farmacológica de alto rendimento 3"
    ]
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let mode: "clinical" | "drug" = "clinical";
    let specialty = "Aleatória (Todas as Áreas da Medicina)";
    let difficulty = "Aleatório (Fácil a Difícil)";
    let topic = "";
    let materialContext = "";
    let avoidDiagnoses: string[] = [];
    const inlineParts: Array<{ mimeType: string; data: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      mode = String(formData.get("mode") || "clinical") === "drug" ? "drug" : "clinical";
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
      mode = body.mode === "drug" ? "drug" : "clinical";
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

    if (mode === "drug") {
      const drugPrompt = `Gere um Desafio de Adivinhação de Remédio/Fármaco em 5 Pistas Progressivas em JSON.
${
  hasMaterial
    ? `MODO BASEADO EM PDF/MATERIAL DO ESTUDANTE:
Escolha um fármaco relevante abordado no material abaixo e crie as 5 pistas fielmente baseadas nele!`
    : `MODO ALEATÓRIO DE FARMACOLOGIA:
- Sistema/Classe solicitada: ${specialty}
- Nível de Dificuldade solicitado: ${difficulty}
${topic ? `- Foco/Tema sugerido: ${topic}` : ""}
${
  avoidDiagnoses.length > 0
    ? `- NÃO repita nenhum destes medicamentos: ${avoidDiagnoses.join(", ")}`
    : ""
}`
}
${
  materialContext.trim()
    ? `\nCONTEÚDO DO PDF / MATERIAL ANEXADO:\n"""\n${materialContext.slice(0, 38000)}\n"""`
    : ""
}`;

      const parsedDrug: any = await generateJSONFromAI({
        systemPrompt: PROGRESSIVE_5CLUE_DRUG_SYSTEM_PROMPT,
        userPrompt: drugPrompt,
        fileAttachments: inlineParts.length > 0 ? inlineParts : undefined,
      });

      const rawClues = Array.isArray(parsedDrug?.clues) ? parsedDrug.clues : [];
      return NextResponse.json({
        id: `pdrug_${Date.now()}`,
        date: dateStr,
        drugName: String(parsedDrug?.drugName || "Medicamento").trim(),
        acceptedSynonyms: Array.isArray(parsedDrug?.acceptedSynonyms)
          ? parsedDrug.acceptedSynonyms
          : [],
        drugClass: String(parsedDrug?.drugClass || specialty),
        difficulty:
          parsedDrug?.difficulty === "Fácil" ||
          parsedDrug?.difficulty === "Médio" ||
          parsedDrug?.difficulty === "Difícil"
            ? parsedDrug.difficulty
            : "Médio",
        clues: [
          String(rawClues[0] || "Indicação clínica inicial."),
          String(rawClues[1] || "Mecanismo de ação."),
          String(rawClues[2] || "Farmacocinética."),
          String(rawClues[3] || "Efeitos adversos e toxicidade."),
          String(rawClues[4] || "Contraindicações, interações e antídoto."),
        ],
        suggestedDistractors: Array.isArray(parsedDrug?.suggestedDistractors)
          ? parsedDrug.suggestedDistractors
          : [],
        debriefing: {
          overview: String(parsedDrug?.debriefing?.overview || ""),
          clueBreakdown: [
            String(parsedDrug?.debriefing?.clueBreakdown?.[0] || ""),
            String(parsedDrug?.debriefing?.clueBreakdown?.[1] || ""),
            String(parsedDrug?.debriefing?.clueBreakdown?.[2] || ""),
            String(parsedDrug?.debriefing?.clueBreakdown?.[3] || ""),
            String(parsedDrug?.debriefing?.clueBreakdown?.[4] || ""),
          ],
          differentials: Array.isArray(parsedDrug?.debriefing?.differentials)
            ? parsedDrug.debriefing.differentials
            : [],
          clinicalUseAndMonitoring: String(
            parsedDrug?.debriefing?.clinicalUseAndMonitoring || ""
          ),
          pearls: Array.isArray(parsedDrug?.debriefing?.pearls)
            ? parsedDrug.debriefing.pearls
            : [],
        },
      });
    }

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
