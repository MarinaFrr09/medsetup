"use client";

import React, { useState } from "react";
import {
  Pill,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  Activity,
  FlaskConical,
  UserCheck,
  RefreshCw,
  ArrowRight,
  HeartPulse,
  Info,
  Check,
  X,
  ClipboardCheck,
  Scale,
} from "lucide-react";
import toast from "react-hot-toast";

export interface PatientProfile {
  diagnosis: string;
  age: string;
  sex: string;
  weight: string;
  renalFunction: string;
  hepaticFunction: string;
  specialConditions: string[];
  allergies: string;
  homeMedications: string[];
}

export interface PrescriptionItem {
  id: string;
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  notes: string;
}

export interface PrescriptionEvaluationResult {
  safetyScore: number;
  riskClassification: string;
  overallVerdict: string;
  pharmacokineticInteractions: Array<{
    pair: string;
    severity: string;
    phase: string;
    mechanism: string;
    clinicalManagement: string;
  }>;
  pharmacodynamicInteractions: Array<{
    pair: string;
    severity: string;
    mechanism: string;
    clinicalConsequence: string;
    clinicalManagement: string;
  }>;
  duplicitiesAndContraindications: Array<{
    type: string;
    drugInvolved: string;
    explanation: string;
  }>;
  itemEvaluations: Array<{
    drug: string;
    prescribedRegimen: string;
    status: "Adequado" | "Exige Ajuste" | "Contraindicado" | string;
    recommendedAdjustment: string;
    rationale: string;
  }>;
  toxicityMonitoring: Array<{
    target: string;
    clinicalSigns: string;
    labParameters: string;
    antidoteOrAction: string;
  }>;
  goldStandardPrescription: Array<{
    drug: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
    notes: string;
  }>;
}

interface PresetScenario {
  id: string;
  title: string;
  badge: string;
  profile: PatientProfile;
  initialPrescription: PrescriptionItem[];
  precomputedEvaluation: PrescriptionEvaluationResult;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "scen_gestante_pe",
    title: "Gestante (31 sem) • Pré-Eclâmpsia com Sinais de Gravidade e HAC",
    badge: "Ginecologia e Obstetrícia",
    profile: {
      diagnosis:
        "Gestante de 31 semanas, G2P1, com Hipertensão Arterial Crônica agudizada evoluindo para Pré-Eclâmpsia Grave (PA 170x115 mmHg, cefaleia occipital intensa, escotomas, proteinúria 3+ e Creatinina 1,3 mg/dL).",
      age: "33",
      sex: "Feminino",
      weight: "74",
      renalFunction: "Levemente Reduzida (Cr 1,3 mg/dL • Oligúria relativa 35 mL/h)",
      hepaticFunction: "Transaminases discretamente elevadas (AST 68 U/L)",
      specialConditions: ["Gestante (3º Trimestre)", "Pré-Eclâmpsia Grave"],
      allergies: "Nega alergias medicamentosas",
      homeMedications: ["Metildopa 250 mg VO 8/8h", "Carbonato de Cálcio 1.000 mg/dia"],
    },
    initialPrescription: [
      {
        id: "p1",
        drug: "Sulfato de Magnésio 50%",
        dose: "4 g (ataque) + 2 g/hora (manutenção)",
        route: "EV / IV",
        frequency: "Contínuo em BIC",
        duration: "24 horas pós-parto ou estabilização",
        notes: "Esquema de Zuspan em bomba de infusão",
      },
      {
        id: "p2",
        drug: "Enalapril",
        dose: "10 mg",
        route: "VO",
        frequency: "12/12h",
        duration: "Uso contínuo",
        notes: "Para controle pressórico de manutenção",
      },
      {
        id: "p3",
        drug: "Atenolol",
        dose: "50 mg",
        route: "VO",
        frequency: "24/24h (1x/dia)",
        duration: "Uso contínuo",
        notes: "Associação anti-hipertensiva",
      },
      {
        id: "p4",
        drug: "Nifedipino de Ação Rápida",
        dose: "10 mg",
        route: "VO",
        frequency: "A cada 30 min (até 3 doses) se PA >= 160x110 mmHg",
        duration: "Crise hipertensiva aguda",
        notes: "Cápsula oral (não sublingual)",
      },
    ],
    precomputedEvaluation: {
      safetyScore: 42,
      riskClassification: "Alto Risco — Contraindicação Formal na Gestação e Risco de Intoxicação por Magnésio",
      overallVerdict:
        "A prescrição contém duas contraindicações absolutas/relativas na gestação (Enalapril é teratogênico e fetotóxico; Atenolol causa restrição de crescimento intrauterino) e exige ajuste na manutenção do Sulfato de Magnésio devido à alteração renal (Cr 1,3 mg/dL) e interação com Nifedipino.",
      pharmacokineticInteractions: [
        {
          pair: "Sulfato de Magnésio + Função Renal Reduzida (Cr 1,3 mg/dL)",
          severity: "Grave",
          phase: "Excreção Renal",
          mechanism:
            "O íon magnésio (Mg2+) é excretado exclusivamente pelos rins por filtração glomerular. Com creatinina > 1,2 mg/dL ou diurese < 25-30 mL/h, a meia-vida plasmática dobra, acumulando rapidamente para níveis tóxicos (> 7 mEq/L).",
          clinicalManagement:
            "Manter a dose de ataque (4 g EV), mas REDUZIR a dose de manutenção para 1 g/hora (ou suspender a manutenção se diurese < 25 mL/h) e dosar magnesemia seriada.",
        },
      ],
      pharmacodynamicInteractions: [
        {
          pair: "Sulfato de Magnésio EV + Nifedipino VO (Bloqueador de Canal de Cálcio)",
          severity: "Moderada",
          mechanism:
            "O magnésio atua como antagonista fisiológico do cálcio na placa motora e no músculo liso vascular. A associação com bloqueadores dos canais de cálcio (Nifedipino) pode potencializar hipotensão materna súbita e bloqueio neuromuscular.",
          clinicalConsequence:
            "Queda abrupta da pressão arterial com hipoperfusão uteroplacentária (sofrimento fetal agudo) e fraqueza muscular.",
          clinicalManagement:
            "A associação é permitida nas diretrizes de pré-eclâmpsia, porém exige monitoramento rigoroso da PA a cada 15 min e proibição absoluta da via sublingual para o Nifedipino.",
        },
      ],
      duplicitiesAndContraindications: [
        {
          type: "Contraindicação Absoluta na Gestação",
          drugInvolved: "Enalapril (IECA)",
          explanation:
            "Inibidores da ECA e BRAs são formalmente contraindicados em todos os trimestres da gestação: causam fetotoxicidade grave no 2º e 3º trimestres (disgenesia tubular renal fetal, anúria fetal, oligodrâmnio, hipoplasia pulmonar, hipocalvária e óbito fetal).",
        },
        {
          type: "Contraindicação na Gestação",
          drugInvolved: "Atenolol (Betabloqueador)",
          explanation:
            "Entre os betabloqueadores, o Atenolol é especificamente proscrito na gestação por estar fortemente associado à redução do fluxo uteroplacentário, Restrição de Crescimento Intrauterino (RCIU) e baixo peso ao nascer. Se necessário betabloqueador, usar Pindolol, Metoprolol ou Labetalol.",
        },
      ],
      itemEvaluations: [
        {
          drug: "Sulfato de Magnésio 50%",
          prescribedRegimen: "4 g EV ataque + 2 g/h EV em BIC",
          status: "Exige Ajuste",
          recommendedAdjustment:
            "Ataque: 4 g EV (8 mL de MgSO4 50% diluídos em 100 mL de SF 0,9% em 20 min) + Manutenção ajustada para 1 g/hora EV em BIC.",
          rationale:
            "Devido à creatinina de 1,3 mg/dL e diurese limítrofe, a manutenção de 2 g/h apresenta alto risco de intoxicação magnesiana.",
        },
        {
          drug: "Enalapril 10 mg VO 12/12h",
          prescribedRegimen: "10 mg VO 12/12h",
          status: "Contraindicado",
          recommendedAdjustment:
            "Suspender imediatamente. Otimizar Metildopa (até 500 mg VO 6/6h = 2 g/dia) associada a Nifedipino de Ação Prolongada (Retard 20 mg VO 12/12h) ou Anlodipino.",
          rationale: "Teratogênico e fetotóxico (insuficiência renal fetal e oligodrâmnio).",
        },
        {
          drug: "Atenolol 50 mg VO 24/24h",
          prescribedRegimen: "50 mg VO 24/24h",
          status: "Contraindicado",
          recommendedAdjustment:
            "Suspender Atenolol. Caso seja necessária 3ª droga de manutenção, utilizar Hidralazina VO ou Pindolol/Metoprolol.",
          rationale: "Risco elevado de Restrição de Crescimento Intrauterino (RCIU).",
        },
        {
          drug: "Nifedipino de Ação Rápida 10 mg VO",
          prescribedRegimen: "10 mg VO a cada 30 min se PA >= 160x110 mmHg",
          status: "Adequado",
          recommendedAdjustment:
            "Manter 10 mg VO (deglutido, nunca sublingual) a cada 20-30 min (máx 30 mg) ou Hidralazina 5 mg EV.",
          rationale:
            "Primeira linha para controle da crise hipertensiva aguda na gestação, reduzindo risco de AVC materno.",
        },
      ],
      toxicityMonitoring: [
        {
          target: "Sulfato de Magnésio (Tríade de Toxicidade Magnesiana)",
          clinicalSigns:
            "1º sinal precoce: Abolição do reflexo patelar (8–10 mEq/L); 2º sinal grave: Depressão respiratória / FR < 12–16 irpm (> 12 mEq/L); 3º sinal: Parada cardiorrespiratória (> 25 mEq/L). Vigiar diurese (< 25 mL/h).",
          labParameters:
            "Magnesemia sérica (faixa terapêutica: 4 a 7 mEq/L), Creatinina sérica, AST/ALT, Plaquetas e LDH (rastreio de Síndrome HELLP).",
          antidoteOrAction:
            "ANTÍDOTO IMEDIATO: Gluconato de Cálcio a 10% — 10 mL (1 grama) EV lento em 3 a 5 minutos + suspensão imediata da infusão de Sulfato de Magnésio e suporte ventilatório.",
        },
      ],
      goldStandardPrescription: [
        {
          drug: "Sulfato de Magnésio 50%",
          dose: "Ataque 4 g EV + Manutenção 1 g/hora EV",
          route: "EV / IV",
          frequency: "Ataque em 20 min + BIC contínua",
          duration: "24h",
          notes: "Manter Gluconato de Cálcio 10% (1 ampola = 10 mL) à cabeceira do leito",
        },
        {
          drug: "Nifedipino 10 mg (ação rápida) OU Hidralazina 5 mg EV",
          dose: "10 mg VO",
          route: "VO",
          frequency: "A cada 20-30 min se PAS >= 160 ou PAD >= 110 mmHg",
          duration: "Crise aguda (máx 30 mg)",
          notes: "Meta pressórica na emergência: manter PA entre 140-150 x 90-100 mmHg (evitar queda > 20%)",
        },
        {
          drug: "Metildopa",
          dose: "500 mg",
          route: "VO",
          frequency: "6/6h (2.000 mg/dia)",
          duration: "Uso contínuo na gestação",
          notes: "Agonista alfa-2 adrenérgico central de 1ª linha",
        },
        {
          drug: "Nifedipino Retard (Ação Prolongada)",
          dose: "20 mg",
          route: "VO",
          frequency: "12/12h",
          duration: "Uso contínuo na gestação",
          notes: "Associação segura de 1ª/2ª linha com a Metildopa",
        },
      ],
    },
  },
  {
    id: "scen_idoso_drc_itu",
    title: "Idoso (78 anos) • DRC Estágio 4 (TFG 24 mL/min), Anticoagulado e ITU Complicada",
    badge: "Clínica Médica & Nefrologia",
    profile: {
      diagnosis:
        "Idoso de 78 anos com Doença Renal Crônica Estágio 4 (TFG = 24 mL/min/1,73m²; Creatinina = 2,6 mg/dL; K+ = 5,1 mEq/L), Fibrilação Atrial e ICFEr, apresentando Pielonefrite Aguda / ITU Complicada e dor lombar.",
      age: "78",
      sex: "Masculino",
      weight: "64",
      renalFunction: "DRC Estágio 4 (TFG = 24 mL/min • Cr = 2,6 mg/dL)",
      hepaticFunction: "Normal",
      specialConditions: [
        "Idoso Frágil (Critérios de Beers)",
        "DRC Estágio 4/5 (TFG < 30)",
        "Anticoagulado",
        "Cardiopata / IC",
      ],
      allergies: "Nega alergias",
      homeMedications: [
        "Varfarina 5 mg VO 1x/dia (INR atual = 2,8)",
        "Enalapril 10 mg VO 12/12h",
        "Espironolactona 25 mg VO 1x/dia",
        "Furosemida 40 mg VO 1x/dia",
      ],
    },
    initialPrescription: [
      {
        id: "p1",
        drug: "Sulfametoxazol + Trimetoprima (Bactrim)",
        dose: "800 mg + 160 mg",
        route: "VO",
        frequency: "12/12h",
        duration: "10 dias",
        notes: "Dose plena habitual",
      },
      {
        id: "p2",
        drug: "Cetoprofeno",
        dose: "100 mg",
        route: "EV / IV",
        frequency: "12/12h",
        duration: "5 dias",
        notes: "Para analgesia da dor lombar",
      },
      {
        id: "p3",
        drug: "Ciprofloxacino",
        dose: "500 mg",
        route: "VO",
        frequency: "12/12h",
        duration: "10 dias",
        notes: "Dupla cobertura antimicrobiana",
      },
    ],
    precomputedEvaluation: {
      safetyScore: 25,
      riskClassification: "Alto Risco — Hipercalemia Fatal, Hemorragia Grave (Varfarina) e Nefrotoxicidade Aguda",
      overallVerdict:
        "Prescrição de altíssimo risco: combina AINE (Cetoprofeno) em renal crônico usando IECA + Diurético ('Triple Whammy'), prescreve Trimetoprima em paciente já com K+ = 5,1 mEq/L usando Enalapril + Espironolactona (risco de parada cardíaca por hipercalemia) e associa Sulfametoxazol + Ciprofloxacino sem ajuste renal com Varfarina (inibição de CYP2C9 e risco de sangramento grave).",
      pharmacokineticInteractions: [
        {
          pair: "Sulfametoxazol-Trimetoprima + Varfarina",
          severity: "Grave",
          phase: "Metabolismo (CYP450) e Distribuição",
          mechanism:
            "O Sulfametoxazol é um potente inibidor da isoenzima CYP2C9 (responsável pelo metabolismo do enantiômero mais ativo S-varfarina) e desloca a varfarina da albumina plasmática.",
          clinicalManagement:
            "Evitar a associação. Substituir o antimicrobiano por Ceftriaxona (não inibe CYP2C9) ou, se inevitável, reduzir a Varfarina em 30–50% e monitorar INR a cada 48h.",
        },
        {
          pair: "Ciprofloxacino + Varfarina + DRC Estágio 4 (TFG 24 mL/min)",
          severity: "Grave",
          phase: "Metabolismo (CYP1A2) e Excreção Renal",
          mechanism:
            "O Ciprofloxacino inibe a CYP1A2 (metabolismo da R-varfarina), reduz a flora intestinal produtora de vitamina K e acumula-se em pacientes com TFG < 30 mL/min quando usado na dose plena de 500 mg 12/12h.",
          clinicalManagement:
            "Se utilizado Ciprofloxacino com TFG < 30 mL/min, a dose deve ser reduzida em 50% (250–500 mg a cada 24h) e sem duplicidade com Sulfametoxazol.",
        },
      ],
      pharmacodynamicInteractions: [
        {
          pair: "Trimetoprima + Enalapril (IECA) + Espironolactona",
          severity: "Grave",
          mechanism:
            "A Trimetoprima bloqueia os canais epiteliais de sódio (ENaC) no néfron distal de modo idêntico ao diurético poupador de potássio Amilorida, reduzindo a excreção urinária de K+. Somada ao bloqueio do SRAA pelo Enalapril e Espironolactona em paciente com TFG de 24 mL/min e K+ basal de 5,1 mEq/L, precipita hipercalemia grave (> 6,5 mEq/L).",
          clinicalConsequence: "Arritmias ventriculares malignas, bloqueio atrioventricular e parada cardíaca em diástole.",
          clinicalManagement:
            "Suspender Sulfametoxazol-Trimetoprima e considerar suspensão temporária da Espironolactona durante a vigência da infecção aguda.",
        },
        {
          pair: "Cetoprofeno (AINE) + Enalapril (IECA) + Furosemida ('Triple Whammy')",
          severity: "Grave",
          mechanism:
            "O AINE inibe a COX-1/COX-2 renal, bloqueando a síntese de prostaglandinas vasodilatadoras (PGE2 e PGI2) da arteríola aferente, enquanto o IECA dilata a arteríola eferente (por bloqueio da Angiotensina II) e a Furosemida reduz a volemia intraglomerular.",
          clinicalConsequence:
            "Queda abrupta da pressão de filtração glomerular (LRA agudizando a DRC Estágio 4), retenção hídrica, descompensação da IC e hemorragia digestiva (AINE + Varfarina).",
          clinicalManagement:
            "Suspender Cetoprofeno imediatamente. Para analgesia no renal crônico anticoagulado, utilizar Dipirona ou Paracetamol em doses habituais.",
        },
      ],
      duplicitiesAndContraindications: [
        {
          type: "Contraindicação Renal Absoluta",
          drugInvolved: "Cetoprofeno 100 mg EV 12/12h",
          explanation:
            "AINEs são formalmente contraindicados na DRC Estágio 4 (TFG < 30 mL/min), na Insuficiência Cardíaca e em pacientes anticoagulados com Varfarina.",
        },
        {
          type: "Duplicidade Terapêutica Desnecessária",
          drugInvolved: "Sulfametoxazol-Trimetoprima + Ciprofloxacino",
          explanation:
            "Associação redundante de dois antimicrobianos orais nefrotóxicos/interagentes sem indicação para pielonefrite comunitária.",
        },
      ],
      itemEvaluations: [
        {
          drug: "Sulfametoxazol + Trimetoprima 800/160 mg 12/12h",
          prescribedRegimen: "800/160 mg VO 12/12h",
          status: "Contraindicado",
          recommendedAdjustment:
            "Substituir por Ceftriaxona 1 g EV 24/24h (eliminação biliar/renal mista, não exige ajuste de dose para TFG 24 mL/min e não causa hipercalemia).",
          rationale: "Risco iminente de hipercalemia fatal e interação grave com Varfarina.",
        },
        {
          drug: "Cetoprofeno 100 mg EV 12/12h",
          prescribedRegimen: "100 mg EV 12/12h",
          status: "Contraindicado",
          recommendedAdjustment: "Substituir por Dipirona 1 g EV ou VO 6/6h se dor ou febre.",
          rationale: "AINEs precipitam falência renal aguda ('Triple Whammy') e hemorragia digestiva com Varfarina.",
        },
        {
          drug: "Ciprofloxacino 500 mg VO 12/12h",
          prescribedRegimen: "500 mg VO 12/12h",
          status: "Exige Ajuste",
          recommendedAdjustment:
            "Suspender (se optar por Ceftriaxona em monoterapia) ou ajustar para 250–500 mg VO a cada 24h (50% da dose para TFG < 30 mL/min).",
          rationale: "Acúmulo renal com risco de neurotoxicidade/confusão mental e ruptura tendínea no idoso (Critérios de Beers).",
        },
      ],
      toxicityMonitoring: [
        {
          target: "Potássio Sérico e Função Renal (SRAA + DRC)",
          clinicalSigns:
            "Fraqueza muscular ascendente, parestesias, bradicardia. No ECG: ondas T apiculadas ('em tenda'), achatamento de onda P, alargamento de QRS e padrão sinusoidal.",
          labParameters: "Potássio sérico (manter < 5,0 mEq/L), Creatinina, Ureia, Diurese e ECG de 12 derivações.",
          antidoteOrAction:
            "Se hipercalemia com alteração de ECG: Gluconato de Cálcio 10% (10 mL EV em 2-3 min para estabilizar membrana miocárdica) + Glicoinsulinoterapia (10 UI insulina regular + 50 g glicose EV) + Ciclossilicato de Zircônio/Furosemida.",
        },
        {
          target: "Anticoagulação (Varfarina + Antibiótico)",
          clinicalSigns: "Gengivorragia, epistaxe, hematúria, melena, equimoses espontâneas.",
          labParameters: "TP / INR a cada 48–72h durante antibioticoterapia (meta FA: 2,0 a 3,0).",
          antidoteOrAction:
            "Se INR > 10 sem sangramento: Vitamina K1 (Fitomenadiona) 2,5–5 mg VO. Se sangramento grave: Complexo Protrombínico (CCP) + Vitamina K1 10 mg EV lento.",
        },
      ],
      goldStandardPrescription: [
        {
          drug: "Ceftriaxona",
          dose: "1 g",
          route: "EV / IV",
          frequency: "24/24h (1x/dia)",
          duration: "7 a 10 dias",
          notes: "Não exige ajuste renal na DRC Estágio 4 (excreção dupla biliar e renal)",
        },
        {
          drug: "Dipirona Sódica",
          dose: "1 g",
          route: "EV / IV",
          frequency: "6/6h se dor ou T >= 37,8°C",
          duration: "Durante fase aguda",
          notes: "Analgésico e antitérmico seguro para a função renal",
        },
        {
          drug: "Suspensão temporária da Espironolactona 25 mg",
          dose: "Suspender na fase aguda",
          route: "VO",
          frequency: "Reavaliar após resolução e K+ < 4,8 mEq/L",
          duration: "Durante intercorrência",
          notes: "Prevenção de hipercalemia aguda em paciente com K+ basal = 5,1 mEq/L",
        },
      ],
    },
  },
];

const SPECIAL_CONDITIONS_LIST = [
  "Gestante (1º Trimestre)",
  "Gestante (2º/3º Trimestre)",
  "Lactante",
  "Idoso Frágil (Critérios de Beers)",
  "DRC Estágio 3 (TFG 30-59 mL/min)",
  "DRC Estágio 4/5 (TFG < 30 mL/min)",
  "Cirrose / Hepatopatia (Child-Pugh B/C)",
  "Cardiopata / IC / QT Longo",
  "Anticoagulado",
  "Epilepsia",
  "Asmático / DPOC",
];

const COMMON_ROUTES = ["VO", "EV / IV", "IM", "SC", "Inalatória", "Sublingual", "SNG", "Tópica"];
const COMMON_FREQUENCIES = [
  "Dose única",
  "6/6h",
  "8/8h",
  "12/12h",
  "24/24h (1x/dia)",
  "Contínuo em BIC",
  "A cada 30 min (crise)",
  "ACM / Se necessário",
];

export function PrescriptionSimulator() {
  const [activePresetId, setActivePresetId] = useState<string>(PRESET_SCENARIOS[0].id);
  const [profile, setProfile] = useState<PatientProfile>(PRESET_SCENARIOS[0].profile);
  const [items, setItems] = useState<PrescriptionItem[]>(PRESET_SCENARIOS[0].initialPrescription);
  const [evaluation, setEvaluation] = useState<PrescriptionEvaluationResult | null>(
    PRESET_SCENARIOS[0].precomputedEvaluation
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [newHomeMed, setNewHomeMed] = useState("");

  // Load a preset clinical scenario
  const handleSelectScenario = (scen: PresetScenario) => {
    setActivePresetId(scen.id);
    setProfile(scen.profile);
    setItems(scen.initialPrescription);
    setEvaluation(scen.precomputedEvaluation);
  };

  // Start a blank custom patient & prescription
  const handleNewBlankScenario = () => {
    setActivePresetId("custom");
    setProfile({
      diagnosis: "",
      age: "45",
      sex: "Feminino",
      weight: "70",
      renalFunction: "Normal (TFG > 90 mL/min)",
      hepaticFunction: "Normal",
      specialConditions: [],
      allergies: "Nega alergias",
      homeMedications: [],
    });
    setItems([
      {
        id: `item_${Date.now()}`,
        drug: "",
        dose: "",
        route: "VO",
        frequency: "12/12h",
        duration: "7 dias",
        notes: "",
      },
    ]);
    setEvaluation(null);
  };

  const toggleSpecialCondition = (cond: string) => {
    setProfile((prev) => ({
      ...prev,
      specialConditions: prev.specialConditions.includes(cond)
        ? prev.specialConditions.filter((c) => c !== cond)
        : [...prev.specialConditions, cond],
    }));
  };

  const handleAddHomeMed = () => {
    if (!newHomeMed.trim()) return;
    setProfile((prev) => ({
      ...prev,
      homeMedications: [...prev.homeMedications, newHomeMed.trim()],
    }));
    setNewHomeMed("");
  };

  const handleAddPrescriptionItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${prev.length}`,
        drug: "",
        dose: "",
        route: "VO",
        frequency: "12/12h",
        duration: "7 dias",
        notes: "",
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof PrescriptionItem, value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleEvaluatePrescription = async () => {
    const validItems = items.filter((i) => i.drug.trim().length > 0);
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos 1 fármaco na prescrição antes de checar interações.");
      return;
    }

    setIsEvaluating(true);
    try {
      const res = await fetch("/api/ai/evaluate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientProfile: profile,
          prescriptionItems: validItems,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao avaliar prescrição com a IA.");
      }

      const data: PrescriptionEvaluationResult = await res.json();
      setEvaluation(data);
      toast.success("Análise farmacológica e checagem de interações concluída!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao avaliar prescrição.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── TOP SCENARIO SELECTOR BAR ─── */}
      <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-500" />
              <span>Cenários Clínicos de Prescrição ou Paciente Personalizado</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Escolha um caso clínico de treinamento abaixo ou monte um paciente e uma prescrição do zero para checar interações, ajustes renais/hepáticos/gestação e toxicidade.
            </p>
          </div>

          <button
            type="button"
            onClick={handleNewBlankScenario}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activePresetId === "custom"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Montar Paciente & Prescrição Livre</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_SCENARIOS.map((scen) => {
            const isSelected = activePresetId === scen.id;
            return (
              <div
                key={scen.id}
                onClick={() => handleSelectScenario(scen)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-2xs"
                    : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141720] hover:border-emerald-400"
                }`}
              >
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {scen.badge}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    {scen.title}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {isSelected ? "Ativo" : "Carregar →"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 1: PATIENT CONDITIONS & PRIOR MEDICATIONS ─── */}
      <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <UserCheck className="w-4 h-4" />
          <span>1. Condições Clínicas do Paciente e Medicações de Uso Prévio</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Diagnóstico / Quadro Clínico Atual a Tratar
            </label>
            <textarea
              rows={2}
              value={profile.diagnosis}
              onChange={(e) => setProfile({ ...profile, diagnosis: e.target.value })}
              placeholder="Ex: Gestante 31 semanas com Pré-Eclâmpsia Grave; ou Idoso 78 anos com DRC TFG 24 mL/min e Pielonefrite Aguda..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Idade</label>
              <input
                type="text"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs font-semibold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Sexo</label>
              <select
                value={profile.sex}
                onChange={(e) => setProfile({ ...profile, sex: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs font-semibold text-gray-900 dark:text-white"
              >
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Peso (kg)</label>
              <input
                type="text"
                value={profile.weight}
                onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs font-semibold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Função Renal (TFG/Cr)</label>
              <input
                type="text"
                value={profile.renalFunction}
                onChange={(e) => setProfile({ ...profile, renalFunction: e.target.value })}
                placeholder="Ex: TFG 24 mL/min (Cr 2,6)"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs font-semibold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Função Hepática</label>
              <input
                type="text"
                value={profile.hepaticFunction}
                onChange={(e) => setProfile({ ...profile, hepaticFunction: e.target.value })}
                placeholder="Ex: Normal ou Child-Pugh B"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs font-semibold text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Special Conditions Pills */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">
              Condições Especiais do Paciente (clique para ativar/desativar):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SPECIAL_CONDITIONS_LIST.map((cond) => {
                const active = profile.specialConditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleSpecialCondition(cond)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-gray-50 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400"
                    }`}
                  >
                    {cond}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Home Medications & Allergies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Medicações de Uso Prévio / Contínuo (Para Checagem de Interações)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newHomeMed}
                  onChange={(e) => setNewHomeMed(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddHomeMed();
                    }
                  }}
                  placeholder="Ex: Varfarina 5 mg/dia, Enalapril 10 mg 12/12h..."
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddHomeMed}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.homeMedications.map((med, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
                  >
                    {med}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-500"
                      onClick={() =>
                        setProfile((prev) => ({
                          ...prev,
                          homeMedications: prev.homeMedications.filter((_, idx) => idx !== i),
                        }))
                      }
                    />
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Alergias Medicamentosas Conhecidas
              </label>
              <input
                type="text"
                value={profile.allergies}
                onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                placeholder="Ex: Alergia a Penicilinas (anafilaxia), Dipirona, Sulfa..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── STEP 2: INTERACTIVE PRESCRIPTION BUILDER TABLE ─── */}
      <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <ClipboardCheck className="w-4 h-4" />
              <span>2. Montagem da Prescrição Médica (Fármaco, Dose, Via, Frequência e Duração)</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Adicione ou edite os itens da prescrição abaixo e clique em &ldquo;Checar Interações e Avaliar Prescrição&rdquo;.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddPrescriptionItem}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Fármaco à Prescrição</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-[#141720] border border-gray-200/80 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
            >
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  {idx + 1}. Fármaco / Princípio Ativo
                </label>
                <input
                  type="text"
                  value={item.drug}
                  onChange={(e) => handleUpdateItem(item.id, "drug", e.target.value)}
                  placeholder="Ex: Sulfato de Magnésio, Enalapril..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Dose
                </label>
                <input
                  type="text"
                  value={item.dose}
                  onChange={(e) => handleUpdateItem(item.id, "dose", e.target.value)}
                  placeholder="Ex: 500 mg, 4 g..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Via
                </label>
                <select
                  value={item.route}
                  onChange={(e) => handleUpdateItem(item.id, "route", e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-xs text-gray-900 dark:text-white"
                >
                  {COMMON_ROUTES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Frequência
                </label>
                <input
                  type="text"
                  list={`freq-list-${item.id}`}
                  value={item.frequency}
                  onChange={(e) => handleUpdateItem(item.id, "frequency", e.target.value)}
                  placeholder="Ex: 12/12h, BIC..."
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-xs text-gray-900 dark:text-white"
                />
                <datalist id={`freq-list-${item.id}`}>
                  {COMMON_FREQUENCIES.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Duração
                </label>
                <input
                  type="text"
                  value={item.duration}
                  onChange={(e) => handleUpdateItem(item.id, "duration", e.target.value)}
                  placeholder="Ex: 7 dias, 24h..."
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-1.5">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                    Diluição / Obs
                  </label>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleUpdateItem(item.id, "notes", e.target.value)}
                    placeholder="Ex: Diluir em SG 5%"
                    className="w-full px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-xs text-gray-900 dark:text-white"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer mb-0.5"
                    title="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleEvaluatePrescription}
            disabled={isEvaluating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isEvaluating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analisando Farmacocinética, Interações e Ajustes com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Checar Interações, Ajustes e Toxicidade com IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── STEP 3: PHARMACOLOGICAL AUDIT & INTERACTION REPORT ─── */}
      {evaluation && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Safety Score & Verdict Banner */}
          <div
            className={`rounded-2xl border-2 p-5 sm:p-6 shadow-sm space-y-3 ${
              evaluation.safetyScore >= 80
                ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-400/60"
                : evaluation.safetyScore >= 50
                ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-400/60"
                : "bg-rose-50/60 dark:bg-rose-950/20 border-rose-400/60"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                    evaluation.safetyScore >= 80
                      ? "bg-emerald-600 text-white"
                      : evaluation.safetyScore >= 50
                      ? "bg-amber-500 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{evaluation.riskClassification}</span>
                </span>
                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white pt-1.5 leading-relaxed">
                  {evaluation.overallVerdict}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1A1D27] px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 shrink-0 text-center">
                <p className="text-[10px] font-bold uppercase text-gray-400">
                  Índice de Segurança
                </p>
                <p
                  className={`text-2xl font-black ${
                    evaluation.safetyScore >= 80
                      ? "text-emerald-600 dark:text-emerald-400"
                      : evaluation.safetyScore >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {evaluation.safetyScore}/100
                </p>
              </div>
            </div>
          </div>

          {/* 1. Duplicities & Profile Contraindications (Pregnancy, Renal, Hepatic, Elderly) */}
          {Array.isArray(evaluation.duplicitiesAndContraindications) &&
            evaluation.duplicitiesAndContraindications.length > 0 && (
              <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span>
                    Contraindicações pelo Perfil do Paciente (Gestação, Renal, Hepático, Idoso) e Duplicidades
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {evaluation.duplicitiesAndContraindications.map((dc, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded font-extrabold uppercase text-[10px] bg-rose-600 text-white">
                          {dc.type}
                        </span>
                        <span className="font-bold text-rose-900 dark:text-rose-200">
                          {dc.drugInvolved}
                        </span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed pt-1">
                        {dc.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 2. Pharmacokinetic (ADME / CYP450) & Pharmacodynamic Interactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pharmacokinetic */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-3">
              <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                <span>Interações Farmacocinéticas (ADME • CYP450 • Excreção)</span>
              </h3>
              {Array.isArray(evaluation.pharmacokineticInteractions) &&
              evaluation.pharmacokineticInteractions.length > 0 ? (
                <div className="space-y-3">
                  {evaluation.pharmacokineticInteractions.map((pk, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-gray-900 dark:text-white">
                          {pk.pair}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                          {pk.phase} • {pk.severity}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong>Mecanismo:</strong> {pk.mechanism}
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        <strong>Conduta:</strong> {pk.clinicalManagement}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Nenhuma interação farmacocinética significativa detectada.
                </p>
              )}
            </div>

            {/* Pharmacodynamic */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-3">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Interações Farmacodinâmicas (Sinergismo, Antagonismo e Toxicidade)</span>
              </h3>
              {Array.isArray(evaluation.pharmacodynamicInteractions) &&
              evaluation.pharmacodynamicInteractions.length > 0 ? (
                <div className="space-y-3">
                  {evaluation.pharmacodynamicInteractions.map((pd, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-gray-900 dark:text-white">
                          {pd.pair}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Gravidade: {pd.severity}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong>Mecanismo:</strong> {pd.mechanism}
                      </p>
                      <p className="text-rose-700 dark:text-rose-300">
                        <strong>Repercussão Clínica:</strong> {pd.clinicalConsequence}
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        <strong>Conduta:</strong> {pd.clinicalManagement}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Nenhuma interação farmacodinâmica adversa detectada.
                </p>
              )}
            </div>
          </div>

          {/* 3. Item-by-Item Dose & Regimen Adjustments */}
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-sky-500" />
              <span>Avaliação Item por Item e Ajustes de Dose / Substituições Necessárias</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(evaluation.itemEvaluations || []).map((ev, i) => {
                const isOk = ev.status?.toLowerCase().includes("adequado");
                const isContra = ev.status?.toLowerCase().includes("contra");
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      isContra
                        ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/70"
                        : isOk
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/70"
                        : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {ev.drug}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isContra
                            ? "bg-rose-600 text-white"
                            : isOk
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      <strong>Prescrito:</strong> {ev.prescribedRegimen}
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">
                      <strong>Ajuste Recomendado:</strong> {ev.recommendedAdjustment}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {ev.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Signs of Toxicity to Monitor & Antidotes */}
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-500" />
              <span>Sinais de Toxicidade a Monitorar, Biomarcadores e Antídotos</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(evaluation.toxicityMonitoring || []).map((tm, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-[#141720] border border-gray-200 dark:border-gray-800 text-xs space-y-2"
                >
                  <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                    🎯 {tm.target}
                  </p>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    <strong>Sinais Clínicos de Toxicidade:</strong> {tm.clinicalSigns}
                  </p>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    <strong>Exames / Parâmetros de Controle:</strong> {tm.labParameters}
                  </p>
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-semibold">
                    🛡️ <strong>Antídoto / Conduta de Reversão:</strong> {tm.antidoteOrAction}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Gold-Standard Corrected Prescription */}
          {Array.isArray(evaluation.goldStandardPrescription) &&
            evaluation.goldStandardPrescription.length > 0 && (
              <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border-2 border-emerald-500/40 p-5 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Prescrição Padrão-Ouro Corrigida para Este Paciente</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase text-[10px]">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Fármaco</th>
                        <th className="py-2 pr-3">Dose</th>
                        <th className="py-2 pr-3">Via</th>
                        <th className="py-2 pr-3">Frequência</th>
                        <th className="py-2 pr-3">Duração</th>
                        <th className="py-2">Diluição / Orientação Clínica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                      {evaluation.goldStandardPrescription.map((gp, idx) => (
                        <tr key={idx} className="text-gray-800 dark:text-gray-200">
                          <td className="py-2.5 pr-3 font-bold text-emerald-600">{idx + 1}</td>
                          <td className="py-2.5 pr-3 font-bold">{gp.drug}</td>
                          <td className="py-2.5 pr-3">{gp.dose}</td>
                          <td className="py-2.5 pr-3">{gp.route}</td>
                          <td className="py-2.5 pr-3">{gp.frequency}</td>
                          <td className="py-2.5 pr-3">{gp.duration}</td>
                          <td className="py-2.5 text-gray-600 dark:text-gray-400">{gp.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
