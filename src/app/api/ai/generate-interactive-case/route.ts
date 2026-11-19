import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { extractTextFromDocx, extractTextFromPptx, extractTextFromPdf } from "@/lib/document-parser";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

const INTERACTIVE_CASE_SYSTEM_PROMPT = `Você é um Professor Titular de Clínica Médica, Emergência e Propedêutica Médica, especialista em Simulação Clínica Interativa com Raciocínio em Etapas (PBL / OSCE / USMLE Step 2 CK / Residência Médica).

SUA MISSÃO:
Construir um CASO CLÍNICO INTERATIVO COMPLETO EM 6 ETAPAS PROGRESSIVAS, onde os dados são revelados passo a passo conforme as escolhas do estudante, exigindo raciocínio fisiopatológico, propedêutico e terapêutico.

REGRAS MANDATÓRIAS:
1. FIDELIDADE AO MATERIAL/TEMA FORNECIDO:
   - Se o estudante selecionou materiais do MedSetup (PDFs, Roteiros de Tutoria/Ateliê, Anotações ou Transcrições de Aulas) ou anexou arquivos, o caso clínico DEVE cobrar diretamente a fisiopatologia, semiologia, diagnóstico, exames, fármacos, doses/antídotos e condutas presentes nesse material!
2. ESTRUTURA DAS 6 ETAPAS NO JSON:
   - ETAPA 1 (Anamnese e Cenário):
     * Apresente paciente (iniciais, idade, sexo, profissão), cenário de atendimento ("Pronto-Socorro", "Ambulatório", "Enfermaria" ou "UTI"), queixa principal com duração e contexto inicial realista.
     * Forneça de 7 a 9 opções de perguntas de anamnese distribuídas nas categorias: "HDA", "Antecedentes", "Medicações e Toxinas", "Hábitos e Exposições", "Alergias e Revisão de Sistemas".
     * Marque 5 ou 6 perguntas como "priority": "essential" (indispensáveis para o raciocínio) e 2 ou 3 como "priority": "optional" ou "distractor" (menos prioritárias no momento inicial), cada uma com o "finding" (achado clínico detalhado que o paciente relata quando perguntado) e "rationale" (por que essa pergunta é ou não prioritária).
   - ETAPA 2 (Exame Físico Direcionado):
     * Forneça de 6 a 7 sistemas/manobras propedêuticas ("Sinais Vitais e Ectoscopia", "Neurológico", "Cardiovascular", "Respiratório", "Abdominal", "Pele e Extremidades", mais 1 manobra específica do caso).
     * Em cada item, inclua "findings" (achados objetivos detalhados com valores numéricos reais: PA, FC, FR, SpO2, Temperatura, ausculta, palpação, sinais semióticos), "isAbnormal" (true/false), "priority" ("essential" | "complementary") e "clinicalInterpretation" (significado fisiopatológico do achado).
   - ETAPA 3 (Hipóteses Diagnósticas e Justificativa):
     * Defina "primaryHypothesis" (diagnóstico principal esperado), "acceptedSynonyms" (array de termos equivalentes aceitos), "differentials" (3 a 4 diagnósticos diferenciais plausíveis com explicação de como diferenciá-los), "expectedJustificationKeywords" (5 a 8 conceitos/palavras-chave fisiopatológicos ou clínicos que devem constar na justificativa do estudante) e "modelJustification" (justificativa fisiopatológica, epidemiológica e sindrômica padrão-ouro).
   - ETAPA 4 (Solicitação de Exames Complementares):
     * Forneça de 8 a 10 opções de exames distribuídas entre "Laboratorial", "Imagem" e "Funcional / Especial".
     * Inclua 4 a 6 exames "priority": "essential" (indispensáveis/padrão-ouro), 2 "priority": "complementary" (apoio) e 2 a 3 "priority": "unnecessary" (desnecessários, redundantes ou invasivos/alto custo sem indicação imediata).
     * Para CADA exame, informe "costInvasiveness" ("Baixo Custo • Não Invasivo" | "Médio Custo • Moderado" | "Alto Custo • Invasivo"), "result" (laudo ou valor numérico detalhado com valores de referência entre parênteses) e "commentary" (por que deve ou não ser solicitado e como interpretar).
   - ETAPA 5 (Diagnóstico Definitivo e Conduta Terapêutica):
     * Defina "definitiveDiagnosis" (diagnóstico definitivo completo com classificação/gravidade).
     * Forneça de 7 a 9 opções de conduta em "managementOptions" cobrindo: "Medida Imediata / Suporte", "Farmacoterapia / Antídoto / Dose", "Critério de Internação / Destino" e "Monitoramento", sendo 5 a 6 corretas ("isCorrect": true) com posologia, dose, via, mecanismo de ação ou antídoto detalhado, e 2 a 3 incorretas/contraindicadas ("isCorrect": false, armadilhas terapêuticas) com "rationale" explicando por que está correta ou por que é contraindicada.
     * Inclua também "completeConductSummary" com os pilares detalhados: "immediateMeasures", "pharmacotherapyAndDoses", "admissionAndDischargeCriteria" e "monitoringPlan".
   - ETAPA 6 (Debriefing e Devolutiva Estruturada):
     * Inclua "clinicalPitfalls" (3 a 5 armadilhas clínicas / red flags clássicas desse caso), "pathophysiologyDeepDive" (explicação densa e objetiva do mecanismo fisiopatológico central), "keyTakeaways" (4 a 6 pontos de alto rendimento para prova e prática clínica) e "stageByStageCommentary" (comentário do gabarito para cada uma das 5 etapas).

Responda OBRIGATORIAMENTE em JSON válido seguindo esta estrutura exata:
{
  "title": "Título Clínico do Caso (sem revelar o diagnóstico final no título, ex: 'Caso Clínico: Dor Abdominal Aguda e Rebaixamento Sensório' ou 'Síndrome Febril e Dispneia no Pronto-Socorro')",
  "revealedDiagnosisTitle": "Nome Oficial do Diagnóstico Definitivo (revelado apenas no Debriefing)",
  "specialty": "Especialidade / Disciplina (ex: Toxicologia / Emergência, Ginecologia e Obstetrícia, Clínica Médica)",
  "difficulty": "Graduação / Internato | Residência Médica | Alta Complexidade",
  "setting": "Pronto-Socorro | Ambulatório | Enfermaria | UTI",
  "stage1": {
    "patientSummary": "Identificação: ex. J.M.S., 34 anos, sexo feminino, professora.",
    "chiefComplaint": "Queixa principal com tempo de evolução entre aspas.",
    "scenarioDescription": "Descrição imersiva da chegada do paciente e contexto inicial do atendimento (3 a 5 linhas).",
    "triageNote": "Impressão inicial da triagem / acolhimento.",
    "anamnesisOptions": [
      {
        "id": "anam_1",
        "category": "HDA",
        "question": "Pergunta clínica clara a ser feita na anamnese",
        "priority": "essential",
        "finding": "Relato detalhado do paciente/acompanhante revelando dados cruciais da HDA",
        "rationale": "Explicação objetiva do valor propedêutico desta pergunta"
      }
    ]
  },
  "stage2": {
    "instruction": "Selecione os sistemas e manobras propedêuticas prioritárias para o exame físico direcionado.",
    "physicalSystems": [
      {
        "id": "phys_1",
        "system": "Sinais Vitais e Ectoscopia Geral",
        "maneuver": "Aferição de PA, FC, FR, SpO2, Temperatura, glicemia capilar e estado geral",
        "priority": "essential",
        "isAbnormal": true,
        "findings": "PA: 165x110 mmHg | FC: 112 bpm | FR: 24 irpm | SpO2: 94% AA | Temp: 36,8°C. Paciente lúcida, agitada, mucosas hipocoradas +/4+...",
        "clinicalInterpretation": "Interpretação técnica dos sinais vitais e repercussão hemodinâmica."
      }
    ]
  },
  "stage3": {
    "primaryHypothesis": "Nome do Diagnóstico Principal Esperado",
    "acceptedSynonyms": ["sinonimo 1", "sinonimo 2"],
    "differentials": [
      {
        "name": "Diagnóstico Diferencial 1",
        "whyPlausible": "Por que entra no diferencial nesta fase",
        "howToRuleOut": "Critério clínico ou propedêutico que o diferencia da hipótese principal"
      }
    ],
    "expectedJustificationKeywords": ["termo1", "termo2", "termo3", "termo4"],
    "modelJustification": "Justificativa fisiopatológica, epidemiológica e clínica completa explicando por que os achados da anamnese e exame físico apontam para a hipótese principal."
  },
  "stage4": {
    "instruction": "Solicite os exames complementares considerando prioridade diagnóstica, custo e invasividade.",
    "exams": [
      {
        "id": "exam_1",
        "name": "Nome do Exame Complementar",
        "category": "Laboratorial",
        "costInvasiveness": "Baixo Custo • Não Invasivo",
        "priority": "essential",
        "result": "Resultado detalhado com valores numéricos e valores de referência entre parênteses",
        "commentary": "Justificativa técnica: exame de 1ª linha que confirma/avalia..."
      }
    ]
  },
  "stage5": {
    "definitiveDiagnosis": "Diagnóstico Definitivo Completo",
    "diagnosisOptions": [
      "Diagnóstico Definitivo Completo (Correto)",
      "Diagnóstico Diferencial Plausível A",
      "Diagnóstico Diferencial Plausível B",
      "Diagnóstico Diferencial Plausível C"
    ],
    "correctDiagnosisIndex": 0,
    "managementOptions": [
      {
        "id": "cond_1",
        "category": "Farmacoterapia / Antídoto / Dose",
        "action": "Descrição precisa da conduta (fármaco, dose de ataque/manutenção, via de administração ou suporte)",
        "isCorrect": true,
        "rationale": "Mecanismo farmacológico e justificativa clínica da conduta"
      }
    ],
    "completeConductSummary": {
      "immediateMeasures": "Medidas imediatas de estabilização e suporte...",
      "pharmacotherapyAndDoses": "Fármacos de 1ª linha, doses exatas, diluição/via, ajustes renais/hepáticos, interações e antídotos...",
      "admissionAndDischargeCriteria": "Critérios de internação em enfermaria/UTI e critérios futuros de alta segura...",
      "monitoringPlan": "Parâmetros clínicos e laboratoriais de monitoramento seriado e intervalos..."
    }
  },
  "stage6": {
    "pathophysiologyDeepDive": "Síntese técnica e objetiva da fisiopatologia celular, molecular e sistêmica do caso.",
    "clinicalPitfalls": [
      "Armadilha Clínica 1: descrição do erro comum e como evitá-lo",
      "Armadilha Clínica 2: ..."
    ],
    "keyTakeaways": [
      "Ponto-chave 1",
      "Ponto-chave 2"
    ],
    "stageByStageCommentary": {
      "stage1": "O que era prioritário investigar na anamnese e por quê.",
      "stage2": "Quais achados do exame físico selaram a síndrome clínica.",
      "stage3": "Como articular a hipótese principal e excluir os diferenciais antes mesmo dos exames.",
      "stage4": "Uso racional de exames: quais exames tinham maior valor preditivo e quais eram desnecessários.",
      "stage5": "Fundamentação da terapêutica específica, doses, antídotos e monitoramento."
    }
  }
}`;

export async function POST(request: NextRequest) {
  try {
    let topic = "";
    let setting = "Automático";
    let difficulty = "Residência Médica";
    let materialContext = "";
    const rawFiles: Array<{ data: string; mimeType: string; name?: string }> = [];

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      topic = ((formData.get("topic") as string) || "").trim();
      setting = ((formData.get("setting") as string) || "Automático").trim();
      difficulty = ((formData.get("difficulty") as string) || "Residência Médica").trim();
      materialContext = ((formData.get("materialContext") as string) || "").trim();

      const files = formData.getAll("files") as File[];
      for (const file of files) {
        if (!file || file.size === 0) continue;
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = (file.name || "").toLowerCase().split(".").pop() || "";

        if (ext === "docx") {
          const text = extractTextFromDocx(buffer);
          if (text) {
            materialContext += `\n\n[DOCUMENTO ${file.name}]:\n${text.slice(0, 30000)}`;
            continue;
          }
        }
        if (ext === "pptx") {
          const text = extractTextFromPptx(buffer);
          if (text) {
            materialContext += `\n\n[SLIDES ${file.name}]:\n${text.slice(0, 30000)}`;
            continue;
          }
        }
        if (ext === "pdf" || file.type?.includes("pdf")) {
          try {
            const parsed = await extractTextFromPdf(buffer);
            if (parsed?.text && parsed.text.trim().length > 80) {
              materialContext += `\n\n[PDF ${file.name}]:\n${parsed.text.slice(0, 35000)}`;
              continue;
            }
          } catch {}
        }
        rawFiles.push({
          data: buffer.toString("base64"),
          mimeType: file.type || (ext === "pdf" ? "application/pdf" : "image/png"),
          name: file.name,
        });
      }
    } else {
      const body = await request.json();
      topic = (body.topic || "").trim();
      setting = (body.setting || "Automático").trim();
      difficulty = (body.difficulty || "Residência Médica").trim();
      materialContext = (body.materialContext || "").trim();
      if (Array.isArray(body.fileAttachments)) {
        rawFiles.push(...body.fileAttachments);
      }
    }

    if (!topic && !materialContext && rawFiles.length === 0) {
      return NextResponse.json(
        { error: "Informe um tema clínico ou selecione um material de estudo do MedSetup para gerar o caso interativo." },
        { status: 400 }
      );
    }

    const userPrompt = `Gere um Caso Clínico Interativo completo em 6 etapas progressivas.
${topic ? `TEMA / FOCO SOLICITADO: "${topic}"` : ""}
CENÁRIO DE ATENDIMENTO PREFERENCIAL: ${setting === "Automático" ? "Escolha o cenário mais realista para o tema (Pronto-Socorro, Ambulatório, Enfermaria ou UTI)" : setting}
NÍVEL DE COMPLEXIDADE: ${difficulty}
${
  materialContext
    ? `\nCONTEÚDO DOS MATERIAIS DE ESTUDO DO ALUNO (BASE OBRIGATÓRIA DO CASO — mantenha total fidelidade aos conceitos, fármacos, mecanismos, exames e condutas cobrados neste material):\n"""\n${materialContext.slice(0, 40000)}\n"""`
    : ""
}`;

    const result = await generateJSONFromAI({
      systemPrompt: INTERACTIVE_CASE_SYSTEM_PROMPT,
      userPrompt,
      fileAttachments: rawFiles.length > 0 ? rawFiles : undefined,
      maxOutputTokens: 32768,
      temperature: 0.4,
    });

    if (!result || !result.stage1 || !result.stage2 || !result.stage4 || !result.stage5) {
      throw new Error("A IA retornou um caso clínico incompleto. Tente novamente.");
    }

    return NextResponse.json({
      id: `icase_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("[generate-interactive-case] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao gerar caso clínico interativo com a IA." },
      { status: 500 }
    );
  }
}
