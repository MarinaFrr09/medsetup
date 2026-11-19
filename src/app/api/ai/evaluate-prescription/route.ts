import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const EVALUATE_PRESCRIPTION_SYSTEM_PROMPT = `Você é um Professor Titular de Farmacologia Clínica, Toxicologia e Terapêutica Médica (referências: Goodman & Gilman, Katzung, UpToDate Lexidrug, Sanford Guide).

SUA MISSÃO:
Avaliar de forma técnica, rigorosa e detalhada a PRESCRIÇÃO MÉDICA montada pelo estudante para um paciente com condições clínicas específicas (função renal, função hepática, gestação, lactação, idoso, comorbidades, alergias e medicações de uso prévio/contínuo).

DIRETRIZES DE ANÁLISE OBRIGATÓRIAS:
1. INTERAÇÕES FARMACOCINÉTICAS (ADME):
   - Identifique interações na Absorção (quelação, alteração de pH gástrico), Distribuição (deslocamento de proteínas plasmáticas), Metabolismo (indução ou inibição enzimática específica: CYP3A4, CYP2C9, CYP2C19, CYP2D6, CYP2E1, UGT, P-glicoproteína) e Excreção (competição por secreção tubular renal ou alteração do fluxo renal).
2. INTERAÇÕES FARMACODINÂMICAS:
   - Identifique sinergismos tóxicos, antagonismos competitivos/fisiológicos e somação de efeitos adversos (ex: hipercalemia por IECA/BRA + Espironolactona; nefrotoxicidade tripla "Triple Whammy" por IECA/BRA + Diurético + AINE; depressão respiratória/SNC; prolongamento de intervalo QTc; síndrome serotoninérgica; risco hemorrágico).
3. DUPLICIDADES TERAPÊUTICAS E CONTRAINDICAÇÕES PELO PERFIL DO PACIENTE:
   - Aponte duplicidade de classe farmacológica ou mecanismo de ação.
   - Verifique contraindicações absolutas ou relativas na Gestação (teratogenicidade: ex. IECA/BRA, Atenolol, Varfarina, Estatinas, Quinolonas, Tetraciclinas), Insuficiência Renal (TFG reduzida), Hepatopatia (Child-Pugh B/C ou hepatite aguda), Idoso (Critérios de Beers) e Alergias cruzadas.
4. AJUSTES NECESSÁRIOS (DOSE, VIA, FREQUÊNCIA, DURAÇÃO OU SUBSTITUIÇÃO):
   - Avalie item por item da prescrição do estudante, indicando se está "Adequado", "Exige Ajuste" ou "Contraindicado / Substituir", fornecendo a posologia exata corrigida.
5. SINAIS DE TOXICIDADE A MONITORAR E ANTÍDOTOS:
   - Especifique os sinais clínicos de toxicidade precoce e grave, os exames laboratoriais/biomarcadores de controle (com metas ou limites de suspensão) e o antídoto específico quando aplicável.

Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "safetyScore": 75,
  "riskClassification": "Segura e Adequada | Atenção — Exige Ajustes | Alto Risco — Contraindicação ou Interação Grave",
  "overallVerdict": "Síntese técnica e direta da avaliação global da prescrição para este paciente.",
  "pharmacokineticInteractions": [
    {
      "pair": "Fármaco A + Fármaco B",
      "severity": "Grave | Moderada | Leve",
      "phase": "Absorção | Distribuição | Metabolismo (CYP450) | Excreção Renal",
      "mechanism": "Explicação objetiva do mecanismo farmacocinético molecular/enzimático",
      "clinicalManagement": "Conduta prática (substituir, espaçar horário ou ajustar dose em X%)"
    }
  ],
  "pharmacodynamicInteractions": [
    {
      "pair": "Fármaco A + Fármaco B (ou Condição Clínica)",
      "severity": "Grave | Moderada | Leve",
      "mechanism": "Explicação do mecanismo farmacodinâmico (sinergismo, antagonismo, fisiologia)",
      "clinicalConsequence": "Repercussão clínica esperada no paciente",
      "clinicalManagement": "Conduta recomendada"
    }
  ],
  "duplicitiesAndContraindications": [
    {
      "type": "Duplicidade Terapêutica | Contraindicação na Gestação | Contraindicação Renal | Contraindicação Hepática | Alerta no Idoso / Alergia",
      "drugInvolved": "Nome do fármaco",
      "explanation": "Explicação técnica direta do risco e da recomendação"
    }
  ],
  "itemEvaluations": [
    {
      "drug": "Nome do fármaco prescrito",
      "prescribedRegimen": "Dose, via, frequência e duração informadas pelo aluno",
      "status": "Adequado | Exige Ajuste | Contraindicado",
      "recommendedAdjustment": "Dose/via/frequência ajustada para a TFG/função hepática/gestação ou fármaco substituto de escolha",
      "rationale": "Justificativa farmacológica do ajuste"
    }
  ],
  "toxicityMonitoring": [
    {
      "target": "Fármaco ou Sistema Orgânico",
      "clinicalSigns": "Sinais clínicos de toxicidade a vigiar (ex: abolição do reflexo patelar, bradipneia < 12 irpm, oligúria, sangramento, icterícia)",
      "labParameters": "Exames e metas de monitoramento (ex: K+ sérico, Creatinina, INR, QTc no ECG, nível sérico)",
      "antidoteOrAction": "Antídoto específico e dose (ex: Gluconato de Cálcio 1g EV, N-Acetilcisteína, Vitamina K, Naloxona) ou conduta de suspensão"
    }
  ],
  "goldStandardPrescription": [
    {
      "drug": "Fármaco padrão-ouro recomendado",
      "dose": "Dose exata",
      "route": "Via",
      "frequency": "Frequência",
      "duration": "Duração",
      "notes": "Diluição, velocidade de infusão ou orientação essencial"
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientProfile, prescriptionItems, materialContext } = body;

    if (!Array.isArray(prescriptionItems) || prescriptionItems.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos 1 fármaco à prescrição para realizar a checagem." },
        { status: 400 }
      );
    }

    const userPrompt = `Avalie a seguinte prescrição médica montada pelo estudante:

PERFIL CLÍNICO DO PACIENTE:
- Diagnóstico / Cenário Atual: ${patientProfile?.diagnosis || "Não especificado"}
- Idade / Sexo / Peso: ${patientProfile?.age || "—"} anos, ${patientProfile?.sex || "—"}, ${patientProfile?.weight || "—"} kg
- Função Renal: ${patientProfile?.renalFunction || "Normal"}
- Função Hepática: ${patientProfile?.hepaticFunction || "Normal"}
- Condições Especiais: ${Array.isArray(patientProfile?.specialConditions) && patientProfile.specialConditions.length > 0 ? patientProfile.specialConditions.join(", ") : "Nenhuma"}
- Alergias: ${patientProfile?.allergies || "Nega alergias conhecidas"}
- Medicações de Uso Contínuo / Prévio: ${Array.isArray(patientProfile?.homeMedications) && patientProfile.homeMedications.length > 0 ? patientProfile.homeMedications.join("; ") : "Nenhuma"}

ITENS PRESCRITOS PELO ESTUDANTE:
${prescriptionItems
  .map(
    (item: any, idx: number) =>
      `${idx + 1}. Fármaco: ${item.drug} | Dose: ${item.dose} | Via: ${item.route} | Frequência: ${item.frequency} | Duração: ${item.duration} | Obs: ${item.notes || "—"}`
  )
  .join("\n")}

${
  materialContext
    ? `\nCONTEÚDO DE REFERÊNCIA DOS MATERIAIS DO ALUNO:\n"""\n${String(materialContext).slice(0, 20000)}\n"""`
    : ""
}

Analise interações farmacocinéticas, interações farmacodinâmicas, duplicidades, contraindicações para as condições do paciente, ajustes necessários item por item, sinais de toxicidade a monitorar e forneça a prescrição padrão-ouro corrigida.`;

    const result = await generateJSONFromAI({
      systemPrompt: EVALUATE_PRESCRIPTION_SYSTEM_PROMPT,
      userPrompt,
      maxOutputTokens: 16384,
      temperature: 0.25,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[evaluate-prescription] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao avaliar prescrição e interações com a IA." },
      { status: 500 }
    );
  }
}
