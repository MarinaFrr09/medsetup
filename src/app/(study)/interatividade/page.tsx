"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Stethoscope,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  FileText,
  BookOpenCheck,
  Microscope,
  Mic,
  Library,
  NotebookPen,
  Upload,
  Plus,
  Trash2,
  RotateCcw,
  Activity,
  ClipboardList,
  FlaskConical,
  ShieldAlert,
  Award,
  Search,
  Check,
  X,
  ChevronRight,
  Timer,
  Play,
  HeartPulse,
  Brain,
  Pill,
  Eye,
  History,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { PrescriptionSimulator } from "@/components/interatividade/PrescriptionSimulator";
import toast from "react-hot-toast";

export interface AnamnesisOption {
  id: string;
  category: string;
  question: string;
  priority: "essential" | "optional" | "distractor";
  finding: string;
  rationale: string;
}

export interface PhysicalSystemOption {
  id: string;
  system: string;
  maneuver: string;
  priority: "essential" | "complementary";
  isAbnormal: boolean;
  findings: string;
  clinicalInterpretation: string;
}

export interface DifferentialItem {
  name: string;
  whyPlausible: string;
  howToRuleOut: string;
}

export interface ExamOption {
  id: string;
  name: string;
  category: "Laboratorial" | "Imagem" | "Funcional / Especial" | string;
  costInvasiveness: string;
  priority: "essential" | "complementary" | "unnecessary";
  result: string;
  commentary: string;
}

export interface ManagementOption {
  id: string;
  category: string;
  action: string;
  isCorrect: boolean;
  rationale: string;
}

export interface InteractiveClinicalCase {
  id: string;
  createdAt: string;
  title: string;
  revealedDiagnosisTitle: string;
  specialty: string;
  difficulty: string;
  setting: string;
  sourceLabel?: string;
  stage1: {
    patientSummary: string;
    chiefComplaint: string;
    scenarioDescription: string;
    triageNote: string;
    anamnesisOptions: AnamnesisOption[];
  };
  stage2: {
    instruction: string;
    physicalSystems: PhysicalSystemOption[];
  };
  stage3: {
    primaryHypothesis: string;
    acceptedSynonyms: string[];
    differentials: DifferentialItem[];
    expectedJustificationKeywords: string[];
    modelJustification: string;
  };
  stage4: {
    instruction: string;
    exams: ExamOption[];
  };
  stage5: {
    definitiveDiagnosis: string;
    diagnosisOptions: string[];
    correctDiagnosisIndex: number;
    managementOptions: ManagementOption[];
    completeConductSummary: {
      immediateMeasures: string;
      pharmacotherapyAndDoses: string;
      admissionAndDischargeCriteria: string;
      monitoringPlan: string;
    };
  };
  stage6: {
    pathophysiologyDeepDive: string;
    clinicalPitfalls: string[];
    keyTakeaways: string[];
    stageByStageCommentary: {
      stage1: string;
      stage2: string;
      stage3: string;
      stage4: string;
      stage5: string;
    };
  };
}

// Caso Clínico Interativo Demonstrativo Pré-Carregado (Toxicologia / Emergência Médica)
const DEMO_INTERACTIVE_CASE: InteractiveClinicalCase = {
  id: "demo_paracetamol_tox",
  createdAt: new Date().toISOString(),
  title: "Caso Clínico: Náuseas Intensas, Dor em Hipocôndrio Direito e Ingesta Medicamentosa",
  revealedDiagnosisTitle: "Intoxicação Aguda por Paracetamol (Acetaminofeno) em Fase Hepatotóxica Inicial",
  specialty: "Toxicologia Clínica & Emergência",
  difficulty: "Residência Médica",
  setting: "Pronto-Socorro",
  sourceLabel: "Caso Demonstrativo • Toxicologia e Farmacocinética",
  stage1: {
    patientSummary: "M.C.A., 22 anos, sexo feminino, estudante universitária, trazida ao Pronto-Socorro pela colega de quarto.",
    chiefComplaint: "\"Enjoo forte, vômitos repetidos e dor na barriga do lado direito há 6 horas.\"",
    scenarioDescription:
      "Paciente dá entrada na sala de emergência consciente, porém pálida, sudoreica e com episódios de êmese biliosa. A acompanhante relata que a paciente estava muito angustiada após uma discussão familiar no dia anterior e encontrou cartelas vazias de medicamentos no quarto.",
    triageNote: "Classificação de Manchester: Laranja (Muito Urgente). Aceso venoso periférico garantido na triagem.",
    anamnesisOptions: [
      {
        id: "anam_1",
        category: "Medicações e Toxinas",
        question: "Qual substância/medicamento foi ingerido, quantos comprimidos (dose total em gramas) e qual o horário exato da ingestão?",
        priority: "essential",
        finding:
          "A paciente admite ter ingerido 24 comprimidos de Paracetamol 750 mg (dose total = 18 gramas; ~300 mg/kg para 60 kg) em tomada única há exatamente 14 horas.",
        rationale:
          "Pergunta prioritária número 1 em toxicologia: a dose ingerida (> 150 mg/kg ou > 7,5-10 g em adultos) e o tempo exato pós-ingestão (14h) definem a plotagem no Nomograma de Rumack-Matthew e a urgência do antídoto.",
      },
      {
        id: "anam_2",
        category: "HDA",
        question: "Como evoluíram os sintomas desde a ingestão até agora (fases clínicas da intoxicação)?",
        priority: "essential",
        finding:
          "Nas primeiras 8 horas sentiu apenas mal-estar leve, anorexia e náuseas (Fase I). Há cerca de 4 horas iniciou dor constante em hipocôndrio direito e vômitos persistentes (transição para Fase II de injúria hepática).",
        rationale:
          "Essencial para reconhecer a evolução bifásica clássica da intoxicação por paracetamol, onde a falsa calmaria inicial precede a elevação de transaminases.",
      },
      {
        id: "anam_3",
        category: "Medicações e Toxinas",
        question: "Houve coingestão de álcool, benzodiazepínicos, opioides ou outros fármacos?",
        priority: "essential",
        finding:
          "Nega uso de benzodiazepínicos ou opioides, mas refere consumo crônico moderado de álcool nos finais de semana e uso de carbamazepina para epilepsia.",
        rationale:
          "Indutores enzimáticos do citocromo P450 (como álcool crônico e carbamazepina) aumentam a atividade da CYP2E1, acelerando a formação do metabólito tóxico NAPQI.",
      },
      {
        id: "anam_4",
        category: "Antecedentes",
        question: "Possui histórico de hepatopatia prévia, desnutrição, jejum prolongado ou transtorno psiquiátrico?",
        priority: "essential",
        finding:
          "Estava em jejum prolongado há mais de 24 horas por quadro depressivo agudo. Nega hepatite viral prévia.",
        rationale:
          "O jejum prolongado depleta os estoques intra-hepáticos de glutationa reduzida (GSH), reduzindo a capacidade de conjugação e inativação do NAPQI.",
      },
      {
        id: "anam_5",
        category: "Alergias e Revisão de Sistemas",
        question: "Notou redução do volume urinário (oligúria), colúria, sangramentos ou confusão mental?",
        priority: "essential",
        finding:
          "Refere urina mais concentrada nas últimas horas, sem hematúria franca e sem sangramento gengival até o momento.",
        rationale:
          "Avalia disfunção renal associada (necrose tubular aguda por NAPQI renal) e sinais precoces de coagulopatia ou encefalopatia hepática.",
      },
      {
        id: "anam_6",
        category: "Antecedentes",
        question: "Histórico vacinal para febre amarela e viagens internacionais há mais de 5 anos?",
        priority: "distractor",
        finding: "Carteira vacinal completa na infância, sem viagens recentes.",
        rationale:
          "Pergunta de baixo rendimento imediato diante de uma intoxicação exógena aguda documentada com tempo conhecido.",
      },
      {
        id: "anam_7",
        category: "Hábitos e Exposições",
        question: "Prática de atividade física aeróbica semanal e preferência alimentar?",
        priority: "distractor",
        finding: "Sedentária, alimentação irregular.",
        rationale: "Não altera a conduta emergencial nem a estratificação de risco toxicológico agudo.",
      },
    ],
  },
  stage2: {
    instruction: "Selecione os sistemas e manobras propedêuticas que deseja realizar antes de liberar os achados do exame físico.",
    physicalSystems: [
      {
        id: "phys_1",
        system: "Sinais Vitais e Ectoscopia Geral",
        maneuver: "Aferição de PA, FC, FR, SpO2, Temperatura axilar, Peso estimado e Glicemia Capilar (HGT)",
        priority: "essential",
        isAbnormal: true,
        findings:
          "PA: 108x68 mmHg | FC: 106 bpm | FR: 20 irpm | SpO2: 98% AA | Temp: 36,6°C | Peso: 60 kg | HGT: 72 mg/dL. Paciente pálida, sudoreica, desidratada +/4+, escleras discretamente subictéricas.",
        clinicalInterpretation:
          "Taquicardia sinusal reacional à desidratação/êmese e tendência à hipoglicemia (gliconeogênese hepática comprometida precocemente).",
      },
      {
        id: "phys_2",
        system: "Abdominal e Hepatimetria",
        maneuver: "Inspeção, ausculta, percussão hepática e palpação superficial/profunda de hipocôndrio direito",
        priority: "essential",
        isAbnormal: true,
        findings:
          "Abdome plano, RHA presentes. Dor moderada a intensa à palpação profunda em hipocôndrio direito, com borda hepática palpável a 2 cm do rebordo costal direito, dolorosa, superfície lisa. Sinal de Murphy negativo.",
        clinicalInterpretation:
          "Distensão aguda da cápsula de Glisson secundária à necrose hepatocelular centrolobular (Zona III de Rappaport).",
      },
      {
        id: "phys_3",
        system: "Neurológico e Avaliação de Encefalopatia",
        maneuver: "Escala de Coma de Glasgow, pupilas, pesquisa de flapping (asterixis) e orientação têmporo-espacial",
        priority: "essential",
        isAbnormal: false,
        findings:
          "Glasgow 15, pupilas isocóricas e fotorreagentes, orientada no tempo e espaço, ausência de flapping (asterixis) no momento.",
        clinicalInterpretation:
          "Ausência de encefalopatia hepática na Fase II inicial (14h pós-ingestão), parâmetro basal fundamental para monitoramento de falência hepática fulminante.",
      },
      {
        id: "phys_4",
        system: "Pele, Mucosas e Extremidades",
        maneuver: "Avaliação de icterícia, petéquias, equimoses, hematomas e tempo de enchimento capilar (TEC)",
        priority: "essential",
        isAbnormal: true,
        findings:
          "Mucosas hipocoradas +/4+, subicterícia conjuntival leve, sem petéquias ou sangramento ativo. TEC = 2 segundos.",
        clinicalInterpretation:
          "Subicterícia inicial sem diáteses hemorrágicas francas neste momento.",
      },
      {
        id: "phys_5",
        system: "Cardiovascular e Respiratório",
        maneuver: "Ausculta cardíaca e pulmonar completa",
        priority: "complementary",
        isAbnormal: false,
        findings:
          "Bulhas rítmicas normofonéticas em 2 tempos sem sopros. Murmúrio vesicular presente bilateralmente sem ruídos adventícios.",
        clinicalInterpretation:
          "Estabilidade cardiopulmonar no momento; permite infusão segura do protocolo endovenoso do antídoto.",
      },
    ],
  },
  stage3: {
    primaryHypothesis: "Intoxicação Aguda por Paracetamol (Acetaminofeno) com Hepatotoxicidade Aguda",
    acceptedSynonyms: [
      "intoxicacao por paracetamol",
      "intoxicacao por acetaminofeno",
      "hepatotoxicidade por paracetamol",
      "overdose de paracetamol",
      "necrose hepatica por paracetamol",
      "napqi",
    ],
    differentials: [
      {
        name: "Colecistite Aguda Litiásica / Cólica Biliar",
        whyPlausible: "Dor em hipocôndrio direito associada a náuseas e vômitos biliosos.",
        howToRuleOut: "História clara de ingesta de 18 g de paracetamol há 14h, ausência de febre e Murphy negativo.",
      },
      {
        name: "Hepatite Viral Aguda Fulminante",
        whyPlausible: "Quadro agudo de dor em HCD, náuseas, subicterícia e elevação de transaminases.",
        howToRuleOut: "História confirmada de superdosagem maciça (300 mg/kg) de paracetamol e evolução hiperaguda em 14h.",
      },
      {
        name: "Intoxicação por Salicilatos (AAS)",
        whyPlausible: "Tentativa de autoextermínio com analgésico de venda livre cursando com êmese.",
        howToRuleOut: "Ausência de tinnitus, hiperventilação central (alcalose respiratória) e hipertermia; cartelas identificadas de paracetamol.",
      },
    ],
    expectedJustificationKeywords: [
      "paracetamol",
      "napqi",
      "glutationa",
      "cyp2e1",
      "necrose",
      "centrolobular",
      "150",
      "18",
    ],
    modelJustification:
      "A ingestão aguda de 18 g (~300 mg/kg, muito acima do limiar tóxico de 150 mg/kg ou 7,5-10 g) satura as vias principais de conjugação hepática (glicuronidação e sulfatação), desviando o metabolismo para o sistema CYP2E1 (potencializado pelo uso de carbamazepina e álcool). Isso gera acúmulo maciço do metabólito reativo NAPQI, que esgota os estoques de glutationa reduzida (já diminuídos pelo jejum) e se liga covalentemente a macromoléculas dos hepatócitos da Zona III (centrolobular), causando necrose hepatocelular aguda.",
  },
  stage4: {
    instruction:
      "Selecione os exames complementares prioritários para estratificar a gravidade, confirmar a toxicidade no Nomograma de Rumack-Matthew e monitorar função hepática e renal.",
    exams: [
      {
        id: "exam_1",
        name: "Dosagem Sérica de Paracetamol (Acetaminofenemia — 14h pós-ingestão)",
        category: "Laboratorial",
        costInvasiveness: "Médio Custo • Não Invasivo",
        priority: "essential",
        result:
          "Paracetamol sérico (14h pós-ingestão): 68 mcg/mL (Limiar de hepatotoxicidade provável no Nomograma de Rumack-Matthew em 14h > 35 mcg/mL).",
        commentary:
          "Exame padrão-ouro específico: valor acima da linha de tratamento no Nomograma de Rumack-Matthew entre 4h e 24h pós-ingestão confirma alto risco de hepatotoxicidade grave.",
      },
      {
        id: "exam_2",
        name: "Transaminases Hepáticas (AST / TGO e ALT / TGP)",
        category: "Laboratorial",
        costInvasiveness: "Baixo Custo • Não Invasivo",
        priority: "essential",
        result: "AST (TGO): 1.420 U/L (VR: < 35 U/L) | ALT (TGP): 1.680 U/L (VR: < 35 U/L).",
        commentary:
          "Essencial: confirma transição para Fase II (12-36h) com citólise hepatocelular franca (> 1.000 U/L).",
      },
      {
        id: "exam_3",
        name: "Coagulograma (TP / INR) e Bilirrubinas Totais e Frações",
        category: "Laboratorial",
        costInvasiveness: "Baixo Custo • Não Invasivo",
        priority: "essential",
        result: "INR: 1,78 (VR: 0,9–1,1) | Atividade de Protrombina: 48% | Bilirrubina Total: 2,4 mg/dL (BD: 1,5 mg/dL).",
        commentary:
          "O INR é o marcador mais sensível e precoce da função de síntese hepática aguda e faz parte dos Critérios do King's College.",
      },
      {
        id: "exam_4",
        name: "Função Renal (Ureia, Creatinina) e Eletrólitos",
        category: "Laboratorial",
        costInvasiveness: "Baixo Custo • Não Invasivo",
        priority: "essential",
        result: "Creatinina: 1,4 mg/dL (VR: 0,6–1,1) | Ureia: 54 mg/dL | K+: 3,7 mEq/L | Na+: 138 mEq/L.",
        commentary:
          "Essencial: a CYP2E1 também está presente nos túbulos renais, podendo causar necrose tubular aguda; a creatinina integra os Critérios do King's College.",
      },
      {
        id: "exam_5",
        name: "Gasometria Arterial com Lactato e Glicemia Sérica",
        category: "Laboratorial",
        costInvasiveness: "Baixo Custo • Moderado",
        priority: "essential",
        result: "pH: 7,33 | HCO3-: 17 mEq/L | Lactato arterial: 3,4 mmol/L (VR: < 2,0) | Glicemia: 68 mg/dL.",
        commentary:
          "Indispensável: pH arterial < 7,30 e hiperlactatemia (> 3,0–3,5 mmol/L) após ressuscitação volêmica são os principais preditores de mortalidade nos Critérios do King's College.",
      },
      {
        id: "exam_6",
        name: "Biópsia Hepática Percutânea de Urgência",
        category: "Funcional / Especial",
        costInvasiveness: "Alto Custo • Invasivo",
        priority: "unnecessary",
        result: "Procedimento suspenso pela equipe: alto risco de hemorragia intraperitoneal devido ao alargamento do INR (1,78).",
        commentary:
          "Contraindicado e desnecessário: o diagnóstico é clínico-laboratorial e a coagulopatia torna a biópsia hepática perigosa.",
      },
      {
        id: "exam_7",
        name: "Colangiopancreatografia Retrógrada Endoscópica (CPRE)",
        category: "Imagem",
        costInvasiveness: "Alto Custo • Invasivo",
        priority: "unnecessary",
        result: "Exame não indicado para hepatotoxicidade medicamentosa intrínseca.",
        commentary:
          "Exame invasivo sem indicação: a lesão é hepatocelular centrolobular por NAPQI, e não obstrução biliar extra-hepática.",
      },
    ],
  },
  stage5: {
    definitiveDiagnosis:
      "Intoxicação Aguda Grave por Paracetamol (Fase II Hepatotóxica) com Disfunção de Síntese Hepática Inicial",
    diagnosisOptions: [
      "Intoxicação Aguda Grave por Paracetamol (Fase II Hepatotóxica) com Disfunção de Síntese Hepática Inicial",
      "Colecistite Aguda Calculosa Complicada com Colangite",
      "Intoxicação Aguda por Salicilatos com Acidose Mista",
      "Hepatite Autoimune Agudizada Tipo 1",
    ],
    correctDiagnosisIndex: 0,
    managementOptions: [
      {
        id: "cond_1",
        category: "Farmacoterapia / Antídoto / Dose",
        action:
          "Iniciar imediatamente N-Acetilcisteína (NAC) EV (Protocolo de 21h: ataque de 150 mg/kg em 200 mL de SG 5% em 60 min, seguido de 50 mg/kg em 4h e 100 mg/kg em 16h)",
        isCorrect: true,
        rationale:
          "Antídoto específico padrão-ouro: a NAC é precursora de L-cisteína, regenera os estoques de glutationa (GSH), fornece grupamentos sulfidrila que detoxificam diretamente o NAPQI e melhora a microcirculação e entrega de oxigênio hepático.",
      },
      {
        id: "cond_2",
        category: "Medida Imediata / Suporte",
        action:
          "Hidratação venosa, correção da tendência à hipoglicemia com glicose hipertônica/manutenção em SG 5% e antiemético EV (Ondansetrona 4–8 mg EV)",
        isCorrect: true,
        rationale:
          "A falência da gliconeogênese hepática exige vigilância e reposição de glicose, enquanto a reposição volêmica corrige a hiperlactatemia pré-renal.",
      },
      {
        id: "cond_3",
        category: "Critério de Internação / Destino",
        action:
          "Internação em unidade monitorizada (UTI / Semi-Intensiva) e avaliação conjunta precoce com equipe de Hepatologia",
        isCorrect: true,
        rationale:
          "Com transaminases > 1.000 U/L, INR = 1,78 e lactato = 3,4 mmol/L, a paciente exige monitoramento intensivo para evolução aos Critérios do King's College.",
      },
      {
        id: "cond_4",
        category: "Monitoramento",
        action:
          "Monitoramento seriado a cada 6–12h de INR/TP, AST/ALT, Bilirrubinas, Creatinina, Gasometria Arterial com Lactato, Glicemia Capilar de 2/2h e Nível de Consciência (Encefalopatia)",
        isCorrect: true,
        rationale:
          "A decisão de manter a NAC além de 21h e de indicar transplante hepático de urgência depende da curva de INR, pH, lactato, creatinina e encefalopatia.",
      },
      {
        id: "cond_5",
        category: "Medida Imediata / Suporte",
        action:
          "Realizar Lavagem Gástrica e administrar Carvão Ativado 50 g via sonda nasogástrica agora (14h após a ingestão)",
        isCorrect: false,
        rationale:
          "Incorreto nesta fase: o paracetamol tem absorção gastrintestinal rápida (pico em 1–2h). Após 14 horas da ingestão (sem coingestão de anticolinérgicos/opioides), o carvão ativado e a lavagem gástrica não têm benefício (indicados apenas nas primeiras 1 a 2 horas, até no máximo 4h).",
      },
      {
        id: "cond_6",
        category: "Farmacoterapia / Antídoto / Dose",
        action: "Administrar Flumazenil 0,2 mg EV em bolus como antídoto primário e suspender carbamazepina abruptamente sem suporte",
        isCorrect: false,
        rationale:
          "Incorreto e perigoso: Flumazenil é antagonista benzodiazepínico e pode precipitar crises convulsivas em paciente usuária de anticonvulsivante.",
      },
    ],
    completeConductSummary: {
      immediateMeasures:
        "Estabilização hemodinâmica com expansão cristaloide guiada pelo lactato, controle de êmese com Ondansetrona 4–8 mg EV e prevenção/correção de hipoglicemia.",
      pharmacotherapyAndDoses:
        "Antídoto Específico: N-Acetilcisteína (NAC). Protocolo EV (21 horas): 1ª fase: 150 mg/kg diluídos em 200 mL de SG 5% infundidos em 60 minutos; 2ª fase: 50 mg/kg em 500 mL de SG 5% em 4 horas; 3ª fase: 100 mg/kg em 1.000 mL de SG 5% em 16 horas (Dose total: 300 mg/kg em 21h). Manter infusão contínua de NAC (100–150 mg/kg/24h) enquanto o paracetamol sérico for detectável, as transaminases estiverem em ascensão ou o INR permanecer > 1,5–2,0.",
      admissionAndDischargeCriteria:
        "Internação hospitalar obrigatória em leito de terapia intensiva/semi-intensiva. Monitorar Critérios do King's College para transplante hepático de urgência: pH arterial < 7,30 (independentemente do grau de encefalopatia) OU a tríade [INR > 6,5 (TP > 100s) + Creatinina > 3,4 mg/dL + Encefalopatia Hepática Grau III/IV].",
      monitoringPlan:
        "Glicemia capilar de 2/2h; avaliação neurológica (Glasgow e pesquisa de flapping) de 4/4h; dosagem seriada de INR, AST/ALT, Bilirrubinas, Creatinina, Eletrólitos e Gasometria Arterial com Lactato a cada 6 a 12 horas.",
    },
  },
  stage6: {
    pathophysiologyDeepDive:
      "Em doses terapêuticas, 90% do paracetamol sofre conjugação hepática de Fase II (glicuronidação pela UGT e sulfatação pela SULT) formando metabólitos atóxicos excretados na urina, enquanto apenas 5–10% são oxidados pela CYP2E1 no metabólito eletrofílico reativo N-acetil-p-benzoquinonaimina (NAPQI), prontamente neutralizado pela conjugação com a glutationa reduzida (GSH). Na superdosagem (> 150 mg/kg), as vias de sulfatação e glicuronidação saturam, desviando grande fluxo para a CYP2E1. Quando os estoques celulares de glutationa caem abaixo de 30% do normal, o NAPQI livre liga-se covalentemente aos grupos sulfidrila das proteínas mitocondriais dos hepatócitos da Zona III (centrolobular, região mais rica em CYP2E1 e menor tensão de O2), desencadeando estresse oxidativo, disfunção mitocondrial, depleção de ATP e necrose hepatocelular centrolobular.",
    clinicalPitfalls: [
      "Armadilha 1 (Carvão Ativado Tardio): Prescrever carvão ativado ou lavagem gástrica após 4 horas de uma ingestão isolada de paracetamol não traz benefício clínico e atrasa ou atrapalha o manejo.",
      "Armadilha 2 (Falsa Calmaria da Fase I): Dar alta ao paciente nas primeiras 24h porque ele está assintomático ou com transaminases ainda normais antes de plotar a acetaminofenemia no Nomograma de Rumack-Matthew (a partir da 4ª hora pós-ingestão).",
      "Armadilha 3 (Suspensão Precoce da NAC): Interromper a N-Acetilcisteína exatamente na 21ª hora mesmo quando as transaminases ainda estão subindo ou o INR está alargado (> 1,5).",
    ],
    keyTakeaways: [
      "Dose hepatotóxica aguda de paracetamol: > 150 mg/kg (ou > 7,5 a 10 g em adultos).",
      "Metabólito tóxico: NAPQI (via CYP2E1), provocando necrose centrolobular (Zona III de Rappaport).",
      "Antídoto específico: N-Acetilcisteína (NAC), máxima eficácia quando iniciada nas primeiras 8 horas pós-ingestão, mas indicada mesmo após 24h se houver hepatotoxicidade estabelecida.",
      "Critérios do King's College para transplante hepático no paracetamol: pH arterial < 7,30 após ressuscitação volêmica OU (INR > 6,5 + Creatinina > 3,4 mg/dL + Encefalopatia Grau III/IV).",
    ],
    stageByStageCommentary: {
      stage1:
        "Na Etapa 1, o raciocínio toxicológico exige determinar imediatamente: o agente exato (Paracetamol), a dose por quilo (18 g = 300 mg/kg), o tempo exato decorrido desde a ingestão (14h) e fatores que induzem a CYP2E1 (álcool/carbamazepina) ou depletam glutationa (jejum).",
      stage2:
        "Na Etapa 2, o exame físico deve focar nos sinais vitais/glicemia capilar (risco de hipoglicemia por perda da gliconeogênese), palpação do hipocôndrio direito (distensão da cápsula de Glisson) e exame neurológico basal (pesquisa de encefalopatia/flapping).",
      stage3:
        "Na Etapa 3, a hipótese principal deve conectar a superdosagem (> 150 mg/kg) ao mecanismo do NAPQI/depleção de glutationa e afastar abdome agudo biliar cirúrgico (colecistite) antes de submeter a paciente a procedimentos invasivos.",
      stage4:
        "Na Etapa 4, o uso racional de exames prioriza: Acetaminofenemia (plotada no Nomograma de Rumack-Matthew), AST/ALT, INR/TP, Creatinina, Glicemia e Gasometria com Lactato (Critérios do King's College), evitando procedimentos invasivos como biópsia hepática ou CPRE.",
      stage5:
        "Na Etapa 5, a conduta salvadora é o início imediato da N-Acetilcisteína (NAC) EV no esquema de 21h, suporte glicêmico/volêmico e internação monitorizada, sem realizar descontaminação gástrica tardia (14h).",
    },
  },
};

const QUICK_TOPICS = [
  "Intoxicação por Organofosforados e Síndrome Colinérgica (Atropina + Pralidoxima)",
  "Pré-Eclâmpsia Grave, Eclâmpsia e Síndrome HELLP (Sulfato de Magnésio)",
  "Sangramento Uterino Anormal Agudo (SUA / Classificação PALM-COEIN)",
  "Cetoacidose Diabética Grave na Emergência",
  "Choque Séptico de Foco Pulmonar e Protocolo de 1ª Hora",
  "Infarto Agudo do Miocárdio com Supra de ST (IAMCSST)",
];

const STAGES_META = [
  { num: 1, short: "Anamnese", title: "Etapa 1 — Queixa Principal e Anamnese" },
  { num: 2, short: "Exame Físico", title: "Etapa 2 — Exame Físico Direcionado" },
  { num: 3, short: "Hipóteses", title: "Etapa 3 — Hipóteses e Justificativa" },
  { num: 4, short: "Exames", title: "Etapa 4 — Solicitação de Exames" },
  { num: 5, short: "Conduta", title: "Etapa 5 — Diagnóstico e Conduta" },
  { num: 6, short: "Debriefing", title: "Etapa 6 — Debriefing e Gabarito" },
];

export default function InteratividadePage() {
  const {
    tutoriaAnalyses = [],
    atelieAnalyses = [],
    documentTranscriptions = [],
    audioRecordings = [],
    anotacoes = [],
    books = [],
  } = useAppStore();

  // Active Module in Interatividade Tab
  const [activeModule, setActiveModule] = useState<"clinical_cases" | "prescription">("clinical_cases");

  // Generator Configuration State
  const [sourceMode, setSourceMode] = useState<"materials" | "topic">("materials");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [selectedSetting, setSelectedSetting] = useState("Automático");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Residência Médica");
  const [materialTab, setMaterialTab] = useState<
    "tutoria" | "atelie" | "transcription" | "audio" | "anotacoes" | "books"
  >("tutoria");
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved Interactive Cases History
  const [savedCases, setSavedCases] = useState<InteractiveClinicalCase[]>([DEMO_INTERACTIVE_CASE]);
  const [activeCase, setActiveCase] = useState<InteractiveClinicalCase>(DEMO_INTERACTIVE_CASE);
  const [showGeneratorPanel, setShowGeneratorPanel] = useState(false);

  // ─── 6-STAGE INTERACTIVE SIMULATION STATE ───
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [maxUnlockedStage, setMaxUnlockedStage] = useState<number>(1);

  // Stage 1 state
  const [selectedAnamnesisIds, setSelectedAnamnesisIds] = useState<string[]>([]);
  const [anamnesisRevealed, setAnamnesisRevealed] = useState(false);
  const [stage1Justification, setStage1Justification] = useState("");

  // Stage 2 state
  const [selectedPhysicalIds, setSelectedPhysicalIds] = useState<string[]>([]);
  const [physicalRevealed, setPhysicalRevealed] = useState(false);
  const [stage2Justification, setStage2Justification] = useState("");

  // Stage 3 state
  const [studentPrimaryHypothesis, setStudentPrimaryHypothesis] = useState("");
  const [studentDifferentials, setStudentDifferentials] = useState("");
  const [stage3Justification, setStage3Justification] = useState("");
  const [stage3Evaluated, setStage3Evaluated] = useState(false);

  // Stage 4 state
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [stage4Justification, setStage4Justification] = useState("");

  // Stage 5 state
  const [selectedDiagnosisIdx, setSelectedDiagnosisIdx] = useState<number | null>(null);
  const [selectedConductIds, setSelectedConductIds] = useState<string[]>([]);
  const [stage5Justification, setStage5Justification] = useState("");

  // Load saved interactive cases from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("medsetup_interactive_cases_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDemo = parsed.some((c: InteractiveClinicalCase) => c.id === DEMO_INTERACTIVE_CASE.id);
          const merged = hasDemo ? parsed : [...parsed, DEMO_INTERACTIVE_CASE];
          setSavedCases(merged);
          setActiveCase(merged[0]);
        }
      }
    } catch {}
  }, []);

  // Timer during AI generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const persistCases = (list: InteractiveClinicalCase[]) => {
    setSavedCases(list);
    try {
      localStorage.setItem("medsetup_interactive_cases_v1", JSON.stringify(list.slice(0, 25)));
    } catch {}
  };

  const resetSimulationState = (caseToLoad?: InteractiveClinicalCase) => {
    if (caseToLoad) {
      setActiveCase(caseToLoad);
    }
    setCurrentStage(1);
    setMaxUnlockedStage(1);
    setSelectedAnamnesisIds([]);
    setAnamnesisRevealed(false);
    setStage1Justification("");
    setSelectedPhysicalIds([]);
    setPhysicalRevealed(false);
    setStage2Justification("");
    setStudentPrimaryHypothesis("");
    setStudentDifferentials("");
    setStage3Justification("");
    setStage3Evaluated(false);
    setSelectedExamIds([]);
    setStage4Justification("");
    setSelectedDiagnosisIdx(null);
    setSelectedConductIds([]);
    setStage5Justification("");
  };

  // Build Unified Materials Catalog from MedSetup Store
  const availableMaterials = useMemo(() => {
    return {
      tutoria: tutoriaAnalyses.map((t) => ({
        id: `tut:${t.id}`,
        title: t.title || "Caso de Tutoria",
        subtitle: t.date || "Tutoria",
        content: [
          `TÍTULO: ${t.title}`,
          `CASO CLÍNICO: ${t.result?.caseTranscription || ""}`,
          `CONCLUSÃO: ${t.result?.clinicalConclusion?.summary || ""}`,
          `QUESTÕES DE APRENDIZAGEM:\n${(t.result?.learningQuestions || [])
            .map((q) => `- ${q.question}: ${q.detailedAnswer?.slice(0, 1500)}`)
            .join("\n")}`,
        ].join("\n\n"),
      })),
      atelie: atelieAnalyses.map((a) => ({
        id: `ate:${a.id}`,
        title: a.title || a.fileName || "Roteiro de Ateliê",
        subtitle: a.date || "Ateliê / SP",
        content: [
          `TÍTULO: ${a.title}`,
          `TEMA: ${a.result?.theme || ""}`,
          `RESUMO: ${a.result?.summary || ""}`,
          `CASOS CLÍNICOS: ${JSON.stringify(a.result?.clinicalCases || []).slice(0, 6000)}`,
          `PERGUNTAS: ${JSON.stringify(a.result?.questions || []).slice(0, 6000)}`,
        ].join("\n\n"),
      })),
      transcription: documentTranscriptions.map((d) => ({
        id: `doc:${d.id}`,
        title: d.title || d.fileName || "PDF Transcrito",
        subtitle: d.fileName || d.date || "Transcrição",
        content: `DOCUMENTO: ${d.title}\n\n${(d.content || d.summary || "").slice(0, 18000)}`,
      })),
      audio: audioRecordings.map((r) => ({
        id: `aud:${r.id}`,
        title: r.title || "Aula Gravada",
        subtitle: `${r.duration || ""} • ${r.date || ""}`,
        content: `AULA GRAVADA: ${r.title}\n\n${(
          r.processedData?.summary ||
          r.processedData?.cleanTranscript ||
          ""
        ).slice(0, 15000)}`,
      })),
      anotacoes: (anotacoes || []).map((n: any) => ({
        id: `not:${n.id}`,
        title: n.title || "Anotação Clínica",
        subtitle: n.category || n.date || "Anotação",
        content: `ANOTAÇÃO: ${n.title}\n\n${(n.content || "").slice(0, 10000)}`,
      })),
      books: books.map((b) => ({
        id: `bok:${b.id}`,
        title: b.title || b.fileName,
        subtitle: `${b.subject || "Medicina"} ${b.author ? `• ${b.author}` : ""}`,
        content: `LIVRO / PDF: ${b.title} (${b.subject || "Medicina"}) - ${b.description || b.fileName}`,
      })),
    };
  }, [tutoriaAnalyses, atelieAnalyses, documentTranscriptions, audioRecordings, anotacoes, books]);

  const allFlatMaterials = useMemo(() => {
    return [
      ...availableMaterials.tutoria,
      ...availableMaterials.atelie,
      ...availableMaterials.transcription,
      ...availableMaterials.audio,
      ...availableMaterials.anotacoes,
      ...availableMaterials.books,
    ];
  }, [availableMaterials]);

  const toggleMaterialSelection = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Generate New Interactive Case via AI
  const handleGenerateInteractiveCase = async () => {
    const selectedMats = allFlatMaterials.filter((m) => selectedMaterialIds.includes(m.id));
    const compiledContext = selectedMats.map((m) => m.content).join("\n\n---\n\n");

    if (!customTopic.trim() && !compiledContext.trim() && uploadedFiles.length === 0) {
      toast.error(
        "Selecione pelo menos 1 material do MedSetup, anexe um PDF ou digite um tema clínico para gerar a simulação."
      );
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append(
        "topic",
        customTopic.trim() || selectedMats.map((m) => m.title).join(", ")
      );
      formData.append("setting", selectedSetting);
      formData.append("difficulty", selectedDifficulty);
      if (compiledContext.trim()) {
        formData.append("materialContext", compiledContext);
      }
      for (const file of uploadedFiles) {
        formData.append("files", file);
      }

      const res = await fetch("/api/ai/generate-interactive-case", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar caso clínico interativo.");
      }

      const newCase: InteractiveClinicalCase = await res.json();
      newCase.sourceLabel =
        selectedMats.length > 0
          ? `Baseado em: ${selectedMats.map((m) => m.title).join(", ").slice(0, 60)}`
          : uploadedFiles.length > 0
          ? `Baseado em: ${uploadedFiles.map((f) => f.name).join(", ").slice(0, 60)}`
          : `Tema: ${customTopic.trim()}`;

      const updatedList = [newCase, ...savedCases.filter((c) => c.id !== newCase.id)];
      persistCases(updatedList);
      resetSimulationState(newCase);
      setShowGeneratorPanel(false);
      toast.success("Simulação Clínica Interativa em 6 Etapas gerada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar caso clínico interativo.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── STAGE PROGRESSION HANDLERS WITH JUSTIFICATION GATES ───

  const handleRevealAnamnesis = () => {
    if (selectedAnamnesisIds.length === 0) {
      toast.error("Selecione pelo menos 2 perguntas prioritárias da anamnese antes de coletar os dados.");
      return;
    }
    setAnamnesisRevealed(true);
    toast.success("Respostas da anamnese coletadas! Analise os achados e justifique para avançar.");
  };

  const handleAdvanceFromStage1 = () => {
    if (!anamnesisRevealed) {
      toast.error("Colete os achados da anamnese selecionada primeiro.");
      return;
    }
    if (stage1Justification.trim().length < 10) {
      toast.error(
        "Escreva uma justificativa curta (principais dados positivos/negativos coletados na anamnese) antes de avançar para o Exame Físico."
      );
      return;
    }
    setMaxUnlockedStage((m) => Math.max(m, 2));
    setCurrentStage(2);
  };

  const handleRevealPhysical = () => {
    if (selectedPhysicalIds.length === 0) {
      toast.error("Selecione os sistemas ou manobras propedêuticas que deseja avaliar.");
      return;
    }
    setPhysicalRevealed(true);
    toast.success("Exame físico realizado nos sistemas selecionados!");
  };

  const handleAdvanceFromStage2 = () => {
    if (!physicalRevealed) {
      toast.error("Realize o exame físico nos sistemas escolhidos primeiro.");
      return;
    }
    if (stage2Justification.trim().length < 10) {
      toast.error(
        "Registre sua síntese dos achados físicos anormais (ou diagnóstico sindrômico) antes de avançar para as Hipóteses Diagnósticas."
      );
      return;
    }
    setMaxUnlockedStage((m) => Math.max(m, 3));
    setCurrentStage(3);
  };

  const handleAdvanceFromStage3 = () => {
    if (studentPrimaryHypothesis.trim().length < 3) {
      toast.error("Defina sua Hipótese Diagnóstica Principal.");
      return;
    }
    if (studentDifferentials.trim().length < 3) {
      toast.error("Informe pelo menos 1 ou 2 Diagnósticos Diferenciais.");
      return;
    }
    if (stage3Justification.trim().length < 15) {
      toast.error(
        "Fundamente sua hipótese com uma justificativa curta (fisiopatologia, epidemiologia ou achado-chave) antes de liberar os exames."
      );
      return;
    }
    setStage3Evaluated(true);
    setMaxUnlockedStage((m) => Math.max(m, 4));
    setCurrentStage(4);
    toast.success("Coerência clínica pré-exames registrada! Painel de Exames Complementares liberado.");
  };

  const toggleExamOrder = (examId: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(examId) ? prev.filter((x) => x !== examId) : [...prev, examId]
    );
  };

  const handleAdvanceFromStage4 = () => {
    if (selectedExamIds.length === 0) {
      toast.error("Solicite pelo menos 1 exame complementar para avaliar os resultados.");
      return;
    }
    if (stage4Justification.trim().length < 10) {
      toast.error(
        "Escreva sua interpretação dos resultados laboratoriais/imagem obtidos antes de avançar para a Conduta."
      );
      return;
    }
    setMaxUnlockedStage((m) => Math.max(m, 5));
    setCurrentStage(5);
  };

  const handleFinishStage5 = () => {
    if (selectedDiagnosisIdx === null) {
      toast.error("Selecione o Diagnóstico Definitivo do caso.");
      return;
    }
    if (selectedConductIds.length === 0) {
      toast.error("Selecione as condutas terapêuticas e medidas do plano de manejo.");
      return;
    }
    if (stage5Justification.trim().length < 10) {
      toast.error(
        "Descreva brevemente o plano terapêutico (fármaco/antídoto, critérios de internação e monitoramento) antes de concluir."
      );
      return;
    }
    setMaxUnlockedStage(6);
    setCurrentStage(6);
    toast.success("Simulação concluída! Confira seu Debriefing e Gabarito Comentado etapa por etapa.");
  };

  // ─── SCORING & DEBRIEFING ANALYTICS (ETAPA 6) ───
  const debriefingMetrics = useMemo(() => {
    const anamOpts = activeCase.stage1?.anamnesisOptions || [];
    const essentialAnam = anamOpts.filter((a) => a.priority === "essential");
    const hitEssentialAnam = essentialAnam.filter((a) => selectedAnamnesisIds.includes(a.id));
    const missedEssentialAnam = essentialAnam.filter((a) => !selectedAnamnesisIds.includes(a.id));
    const distractorAnamPicked = anamOpts.filter(
      (a) => a.priority === "distractor" && selectedAnamnesisIds.includes(a.id)
    );
    const stage1Score =
      essentialAnam.length > 0
        ? Math.max(
            0,
            Math.round(
              ((hitEssentialAnam.length - distractorAnamPicked.length * 0.3) /
                essentialAnam.length) *
                100
            )
          )
        : 100;

    const physOpts = activeCase.stage2?.physicalSystems || [];
    const essentialPhys = physOpts.filter((p) => p.priority === "essential");
    const hitEssentialPhys = essentialPhys.filter((p) => selectedPhysicalIds.includes(p.id));
    const missedEssentialPhys = essentialPhys.filter((p) => !selectedPhysicalIds.includes(p.id));
    const stage2Score =
      essentialPhys.length > 0
        ? Math.round((hitEssentialPhys.length / essentialPhys.length) * 100)
        : 100;

    // Stage 3 coherence check
    const normHyp = studentPrimaryHypothesis.toLowerCase();
    const normJust = stage3Justification.toLowerCase();
    const targetHyp = (activeCase.stage3?.primaryHypothesis || "").toLowerCase();
    const synonyms = (activeCase.stage3?.acceptedSynonyms || []).map((s) => s.toLowerCase());
    const keywords = (activeCase.stage3?.expectedJustificationKeywords || []).map((k) =>
      k.toLowerCase()
    );

    const hypothesisMatched =
      (targetHyp && normHyp.includes(targetHyp.split(" ")[0])) ||
      synonyms.some((syn) => syn && (normHyp.includes(syn) || normJust.includes(syn))) ||
      keywords.some((kw) => kw && normHyp.includes(kw));

    const matchedKeywords = keywords.filter(
      (kw) => kw && (normJust.includes(kw) || normHyp.includes(kw))
    );
    const stage3Score = Math.min(
      100,
      (hypothesisMatched ? 60 : 35) +
        Math.min(40, matchedKeywords.length * 12) +
        (studentDifferentials.trim().length > 5 ? 10 : 0)
    );

    // Stage 4 exams rationality
    const examOpts = activeCase.stage4?.exams || [];
    const essentialExams = examOpts.filter((e) => e.priority === "essential");
    const hitEssentialExams = essentialExams.filter((e) => selectedExamIds.includes(e.id));
    const missedEssentialExams = essentialExams.filter((e) => !selectedExamIds.includes(e.id));
    const unnecessaryExamsOrdered = examOpts.filter(
      (e) => e.priority === "unnecessary" && selectedExamIds.includes(e.id)
    );
    const stage4Score =
      essentialExams.length > 0
        ? Math.max(
            0,
            Math.round(
              ((hitEssentialExams.length - unnecessaryExamsOrdered.length * 0.5) /
                essentialExams.length) *
                100
            )
          )
        : 100;

    // Stage 5 diagnosis & conduct
    const diagCorrect = selectedDiagnosisIdx === (activeCase.stage5?.correctDiagnosisIndex ?? 0);
    const condOpts = activeCase.stage5?.managementOptions || [];
    const correctConds = condOpts.filter((c) => c.isCorrect);
    const hitCorrectConds = correctConds.filter((c) => selectedConductIds.includes(c.id));
    const missedCorrectConds = correctConds.filter((c) => !selectedConductIds.includes(c.id));
    const wrongCondsPicked = condOpts.filter(
      (c) => !c.isCorrect && selectedConductIds.includes(c.id)
    );

    const conductRatio =
      correctConds.length > 0
        ? Math.max(
            0,
            (hitCorrectConds.length - wrongCondsPicked.length * 0.6) / correctConds.length
          )
        : 1;
    const stage5Score = Math.round((diagCorrect ? 40 : 0) + conductRatio * 60);

    const globalScore = Math.round(
      (stage1Score + stage2Score + stage3Score + stage4Score + stage5Score) / 5
    );

    return {
      globalScore,
      stage1Score,
      stage2Score,
      stage3Score,
      stage4Score,
      stage5Score,
      hitEssentialAnam,
      missedEssentialAnam,
      distractorAnamPicked,
      hitEssentialPhys,
      missedEssentialPhys,
      hypothesisMatched,
      matchedKeywords,
      hitEssentialExams,
      missedEssentialExams,
      unnecessaryExamsOrdered,
      diagCorrect,
      hitCorrectConds,
      missedCorrectConds,
      wrongCondsPicked,
    };
  }, [
    activeCase,
    selectedAnamnesisIds,
    selectedPhysicalIds,
    studentPrimaryHypothesis,
    studentDifferentials,
    stage3Justification,
    selectedExamIds,
    selectedDiagnosisIdx,
    selectedConductIds,
  ]);

  return (
    <div className="w-full space-y-6 pb-14">
      {/* ─── INTERATIVIDADE MODULE SWITCHER ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#1A1D27] p-2.5 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
        <button
          type="button"
          onClick={() => setActiveModule("clinical_cases")}
          className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
            activeModule === "clinical_cases"
              ? "bg-sky-50/90 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs"
              : "bg-gray-50/50 dark:bg-[#141720] border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeModule === "clinical_cases"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-gray-200 dark:bg-gray-800 text-gray-500"
            }`}
          >
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-extrabold truncate">
              1. Gerador de Casos Clínicos Interativos em Etapas
            </p>
            <p className="text-[11px] opacity-80 truncate">
              Anamnese → Exame Físico → Hipóteses → Exames → Conduta → Debriefing
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("prescription")}
          className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
            activeModule === "prescription"
              ? "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs"
              : "bg-gray-50/50 dark:bg-[#141720] border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeModule === "prescription"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-200 dark:bg-gray-800 text-gray-500"
            }`}
          >
            <Pill className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-extrabold truncate">
              2. Simulador de Prescrição e Checagem de Interações
            </p>
            <p className="text-[11px] opacity-80 truncate">
              Fármaco, dose, via, frequência, interações ADME/CYP450, ajustes e toxicidade
            </p>
          </div>
        </button>
      </div>

      {activeModule === "prescription" ? (
        <PrescriptionSimulator />
      ) : (
        <>
      {/* ─── TOP HEADER & GENERATOR TOGGLE ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A1D27] p-5 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Simulador de Casos Clínicos Interativos em Etapas
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                Raciocínio Clínico Progressivo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              O caso revela dados progressivamente (Anamnese → Exame Físico → Hipóteses → Exames → Conduta → Debriefing), exigindo justificativa clínica antes de avançar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => resetSimulationState()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar Caso Atual</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGeneratorPanel((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{showGeneratorPanel ? "Fechar Gerador de Casos" : "Novo Caso com IA / Meus Materiais"}</span>
          </button>
        </div>
      </div>

      {/* ─── EXPANDABLE GENERATOR PANEL (MODOS DE GERAÇÃO E PERSONALIZAÇÃO) ─── */}
      {showGeneratorPanel && (
        <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border-2 border-sky-500/40 dark:border-sky-500/40 p-5 sm:p-6 shadow-lg space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-500" />
                <span>Gerar Novo Caso Clínico Interativo Personalizado</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Crie simulações fiéis aos seus PDFs, roteiros de Tutoria/Ateliê, anotações ou transcrições de aulas já carregados no MedSetup.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSourceMode("materials")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sourceMode === "materials"
                    ? "bg-white dark:bg-[#1A1D27] text-sky-600 dark:text-sky-400 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                📚 A partir dos Meus Materiais
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("topic")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sourceMode === "topic"
                    ? "bg-white dark:bg-[#1A1D27] text-sky-600 dark:text-sky-400 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                🎯 Por Tema / Síndrome Clínica
              </button>
            </div>
          </div>

          {sourceMode === "materials" && (
            <div className="space-y-4">
              {/* Material Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  { id: "tutoria", label: "Tutoria", count: availableMaterials.tutoria.length, icon: BookOpenCheck },
                  { id: "atelie", label: "Ateliê (SP)", count: availableMaterials.atelie.length, icon: Microscope },
                  { id: "transcription", label: "PDFs Transcritos", count: availableMaterials.transcription.length, icon: FileText },
                  { id: "audio", label: "Aulas Gravadas", count: availableMaterials.audio.length, icon: Mic },
                  { id: "anotacoes", label: "Anotações", count: availableMaterials.anotacoes.length, icon: NotebookPen },
                  { id: "books", label: "Livros", count: availableMaterials.books.length, icon: Library },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = materialTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMaterialTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                        active
                          ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700"
                          : "bg-gray-50 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/80 dark:bg-gray-900/70">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Material Items Grid */}
              <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {availableMaterials[materialTab].length > 0 ? (
                  availableMaterials[materialTab].map((item) => {
                    const isSelected = selectedMaterialIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleMaterialSelection(item.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 dark:border-sky-500 shadow-2xs"
                            : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141720] hover:border-sky-300"
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-sky-600 border-sky-600 text-white"
                              : "border-gray-400 dark:border-gray-600"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    Nenhum item salvo nesta categoria ainda. Você pode selecionar outra aba, enviar um PDF abaixo ou digitar um tema livre.
                  </div>
                )}
              </div>

              {/* Optional Direct File Upload */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setUploadedFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-dashed border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ou anexar PDF / Roteiro avulso ({uploadedFiles.length})</span>
                  </button>
                  {uploadedFiles.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300"
                    >
                      {f.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      />
                    </span>
                  ))}
                </div>
                {selectedMaterialIds.length > 0 && (
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                    {selectedMaterialIds.length} material(is) do MedSetup selecionado(s)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Topic / Focus Input + Quick Presets */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Tema Clínico, Patologia ou Direcionamento Específico {sourceMode === "materials" ? "(Opcional)" : ""}
            </label>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Ex: Intoxicação por Paracetamol, Síndrome HELLP, Cetoacidose Diabética, Sangramento Uterino Anormal..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-gray-400 mr-1">Sugestões rápidas:</span>
              {QUICK_TOPICS.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setCustomTopic(qt)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-sky-50 dark:bg-gray-800 dark:hover:bg-sky-950/50 text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-300 transition-colors cursor-pointer"
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario & Complexity Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Cenário de Atendimento
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {["Automático", "Pronto-Socorro", "Ambulatório", "Enfermaria", "UTI"].map((setOpt) => (
                  <button
                    key={setOpt}
                    type="button"
                    onClick={() => setSelectedSetting(setOpt)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedSetting === setOpt
                        ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                        : "bg-gray-50 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {setOpt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Nível de Exigência
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {["Graduação / Internato", "Residência Médica", "Alta Complexidade"].map((diffOpt) => (
                  <button
                    key={diffOpt}
                    type="button"
                    onClick={() => setSelectedDifficulty(diffOpt)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedDifficulty === diffOpt
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-gray-50 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {diffOpt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowGeneratorPanel(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerateInteractiveCase}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Construindo Caso em 6 Etapas ({elapsedSeconds}s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Iniciar Simulação Clínica Interativa</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── SAVED CASES BAR (HISTÓRICO DE SIMULAÇÕES) ─── */}
      {savedCases.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <History className="w-3.5 h-3.5" /> Casos Salvos:
          </span>
          {savedCases.map((c) => {
            const isCurrent = c.id === activeCase.id;
            return (
              <div
                key={c.id}
                onClick={() => resetSimulationState(c)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer whitespace-nowrap transition-all ${
                  isCurrent
                    ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700"
                    : "bg-white dark:bg-[#1A1D27] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2d3a] hover:border-sky-300"
                }`}
              >
                <span className="truncate max-w-[220px]">{c.title}</span>
                {c.id !== DEMO_INTERACTIVE_CASE.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const filtered = savedCases.filter((x) => x.id !== c.id);
                      const nextList = filtered.length > 0 ? filtered : [DEMO_INTERACTIVE_CASE];
                      persistCases(nextList);
                      if (isCurrent) resetSimulationState(nextList[0]);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CASE HEADER BANNER & 6-STAGE PROGRESS STEPPER ─── */}
      <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                {activeCase.setting || "Pronto-Socorro"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                {activeCase.specialty || "Clínica Médica"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {activeCase.difficulty || "Residência Médica"}
              </span>
              {activeCase.sourceLabel && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-xs">
                  • {activeCase.sourceLabel}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-2">
              {currentStage === 6 && activeCase.revealedDiagnosisTitle
                ? `${activeCase.title} — [${activeCase.revealedDiagnosisTitle}]`
                : activeCase.title}
            </h2>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
              Etapa {currentStage} de 6
            </span>
            <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${Math.round((currentStage / 6) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 6-Stage Stepper Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STAGES_META.map((st) => {
            const isUnlocked = st.num <= maxUnlockedStage;
            const isActive = st.num === currentStage;
            const isDone = st.num < maxUnlockedStage;
            return (
              <button
                key={st.num}
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && setCurrentStage(st.num)}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? "border-sky-500 bg-sky-50/90 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shadow-2xs cursor-pointer"
                    : isDone
                    ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 cursor-pointer hover:border-emerald-400"
                    : isUnlocked
                    ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141720] text-gray-700 dark:text-gray-300 cursor-pointer"
                    : "border-gray-100 dark:border-gray-800/70 bg-gray-50/50 dark:bg-gray-900/30 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-70"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-sky-600 text-white"
                        : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-500"
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : st.num}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold opacity-75">Etapa {st.num}</p>
                    <p className="text-xs font-bold truncate">{st.short}</p>
                  </div>
                </div>
                {isUnlocked ? (
                  <Unlock className="w-3.5 h-3.5 shrink-0 opacity-60" />
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0 opacity-50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ETAPA 1 — QUEIXA PRINCIPAL, CENÁRIO E ANAMNESE DIRECIONADA
         ════════════════════════════════════════════════════════════════════════ */}
      {currentStage === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Patient Presentation Card */}
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              <ClipboardList className="w-4 h-4" />
              <span>Etapa 1 — Queixa Principal e Cenário de Atendimento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#141720] border border-gray-200/70 dark:border-gray-800">
                <p className="text-[11px] font-bold uppercase text-gray-400">Identificação do Paciente</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                  {activeCase.stage1.patientSummary}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 md:col-span-2">
                <p className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">
                  Queixa Principal (QP) e Motivo da Consulta
                </p>
                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-1">
                  {activeCase.stage1.chiefComplaint}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/50 space-y-2">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {activeCase.stage1.scenarioDescription}
              </p>
              {activeCase.stage1.triageNote && (
                <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 pt-1">
                  📌 {activeCase.stage1.triageNote}
                </p>
              )}
            </div>
          </div>

          {/* Anamnesis Question Selection */}
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  1. Selecione as Perguntas Prioritárias da Anamnese
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Escolha o que deseja perguntar sobre HDA, antecedentes, medicações/toxinas, hábitos e alergias. Os achados só serão revelados após sua seleção.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                {selectedAnamnesisIds.length} pergunta(s) selecionada(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(activeCase.stage1.anamnesisOptions || []).map((opt) => {
                const isSelected = selectedAnamnesisIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setSelectedAnamnesisIds((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((x) => x !== opt.id)
                          : [...prev, opt.id]
                      );
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 shadow-2xs"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141720] hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-sky-600 border-sky-600 text-white"
                            : "border-gray-400 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="space-y-1 flex-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {opt.category}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                          {opt.question}
                        </p>
                      </div>
                    </div>

                    {/* Progressive Reveal of Finding ONLY when selected AND revealed */}
                    {anamnesisRevealed && isSelected && (
                      <div className="mt-1 p-3 rounded-lg bg-white dark:bg-[#0f1117] border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1">
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">
                          💬 Relato Coletado:
                        </p>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                          {opt.finding}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRevealAnamnesis}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>
                  {anamnesisRevealed
                    ? "Atualizar Achados da Anamnese Selecionada"
                    : "Coletar Anamnese das Perguntas Selecionadas"}
                </span>
              </button>
            </div>
          </div>

          {/* Stage 1 Justification Gate */}
          {anamnesisRevealed && (
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/40 p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  <span>2. Justificativa da Anamnese (Obrigatória para Avançar)</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Resuma os dados positivos/negativos mais relevantes coletados na história e explique o que direciona seu exame físico.
                </p>
              </div>

              <textarea
                rows={3}
                value={stage1Justification}
                onChange={(e) => setStage1Justification(e.target.value)}
                placeholder="Ex: Ingesta aguda maciça de 18g (300 mg/kg) de paracetamol há 14h associada a jejum prolongado e indutores da CYP2E1 (álcool/carbamazepina), já com dor em HCD..."
                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAdvanceFromStage1}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md cursor-pointer"
                >
                  <span>Avançar para Etapa 2 (Exame Físico Direcionado)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ETAPA 2 — EXAME FÍSICO DIRECIONADO
         ════════════════════════════════════════════════════════════════════════ */}
      {currentStage === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                  <HeartPulse className="w-4 h-4" />
                  <span>Etapa 2 — Exame Físico Direcionado</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Escolha os Sistemas e Manobras Propedêuticas que Deseja Avaliar
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeCase.stage2.instruction}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                {selectedPhysicalIds.length} sistema(s) selecionado(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(activeCase.stage2.physicalSystems || []).map((sys) => {
                const isSelected = selectedPhysicalIds.includes(sys.id);
                return (
                  <div
                    key={sys.id}
                    onClick={() => {
                      setSelectedPhysicalIds((prev) =>
                        prev.includes(sys.id)
                          ? prev.filter((x) => x !== sys.id)
                          : [...prev, sys.id]
                      );
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 shadow-2xs"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141720] hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-sky-600 border-sky-600 text-white"
                            : "border-gray-400 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {sys.system}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Manobras: {sys.maneuver}
                        </p>
                      </div>
                    </div>

                    {physicalRevealed && isSelected && (
                      <div
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          sys.isAbnormal
                            ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70"
                            : "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-bold ${
                              sys.isAbnormal
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {sys.isAbnormal ? "⚠️ Achado Alterado:" : "✅ Achado Normal:"}
                          </span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                          {sys.findings}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStage(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar à Anamnese</span>
              </button>

              <button
                type="button"
                onClick={handleRevealPhysical}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
              >
                <Stethoscope className="w-4 h-4" />
                <span>
                  {physicalRevealed
                    ? "Atualizar Exame Físico Selecionado"
                    : "Realizar Exame Físico Selecionado"}
                </span>
              </button>
            </div>
          </div>

          {physicalRevealed && (
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/40 p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  <span>Interpretação dos Achados Físicos (Obrigatória para Avançar)</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Destaque os sinais vitais ou achados semióticos alterados e o que eles indicam.
                </p>
              </div>

              <textarea
                rows={3}
                value={stage2Justification}
                onChange={(e) => setStage2Justification(e.target.value)}
                placeholder="Ex: Paciente taquicárdica, tendência a hipoglicemia (HGT 72), subictérica e com hepatomegalia dolorosa (distensão da cápsula de Glisson), ainda sem flapping/encefalopatia..."
                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAdvanceFromStage2}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md cursor-pointer"
                >
                  <span>Avançar para Etapa 3 (Hipóteses Diagnósticas)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ETAPA 3 — HIPÓTESES DIAGNÓSTICAS E JUSTIFICATIVA (PRÉ-EXAMES)
         ════════════════════════════════════════════════════════════════════════ */}
      {currentStage === 3 && (
        <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
              <Brain className="w-4 h-4" />
              <span>Etapa 3 — Hipóteses Diagnósticas e Justificativa Pré-Exames</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Formule sua Hipótese Principal, Diagnósticos Diferenciais e Justificativa Fisiopatológica
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Antes de solicitar exames complementares, demonstre coerência clínica articulando os dados da anamnese e do exame físico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                1. Hipótese Diagnóstica Principal (HD Principal) *
              </label>
              <input
                type="text"
                value={studentPrimaryHypothesis}
                onChange={(e) => setStudentPrimaryHypothesis(e.target.value)}
                placeholder="Ex: Intoxicação aguda por Paracetamol em fase hepatotóxica"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                2. Diagnósticos Diferenciais Plausíveis (liste 1 a 3) *
              </label>
              <input
                type="text"
                value={studentDifferentials}
                onChange={(e) => setStudentDifferentials(e.target.value)}
                placeholder="Ex: Colecistite aguda litiásica, Hepatite viral aguda, Intoxicação por AAS..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              3. Justificativa Clínica e Fisiopatológica (Fisiopatologia, Epidemiologia ou Achado-Chave) *
            </label>
            <textarea
              rows={4}
              value={stage3Justification}
              onChange={(e) => setStage3Justification(e.target.value)}
              placeholder="Explique o mecanismo fisiopatológico central (ex: formação de NAPQI pela CYP2E1, depleção de glutationa e necrose centrolobular) e os achados que sustentam sua hipótese..."
              className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Exame Físico</span>
            </button>

            <button
              type="button"
              onClick={handleAdvanceFromStage3}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md cursor-pointer"
            >
              <span>Validar Hipótese e Solicitar Exames (Etapa 4)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ETAPA 4 — SOLICITAÇÃO DE EXAMES COMPLEMENTARES
         ════════════════════════════════════════════════════════════════════════ */}
      {currentStage === 4 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Pre-exam coherence feedback banner */}
          {stage3Evaluated && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                debriefingMetrics.hypothesisMatched
                  ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {debriefingMetrics.hypothesisMatched
                    ? "✅ Coerência Clínica Pré-Exames Confirmada!"
                    : "🔎 Hipótese Registrada — Utilize os exames abaixo para confirmar ou refinar seu diagnóstico!"}
                </p>
                <p className="opacity-90">
                  Sua hipótese principal registrada: <strong>{studentPrimaryHypothesis}</strong> | Diferenciais:{" "}
                  <strong>{studentDifferentials}</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                  <FlaskConical className="w-4 h-4" />
                  <span>Etapa 4 — Solicitação Racional de Exames Complementares</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Selecione os Exames Laboratoriais, de Imagem ou Funcionais
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cada exame solicitado revela seu resultado imediatamente. Evite exames invasivos ou de alto custo sem indicação para a síndrome atual.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                  {selectedExamIds.length} exame(s) solicitado(s)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(activeCase.stage4.exams || []).map((exam) => {
                const isOrdered = selectedExamIds.includes(exam.id);
                const isHighInvasive =
                  exam.costInvasiveness?.toLowerCase().includes("alto") ||
                  exam.costInvasiveness?.toLowerCase().includes("invasivo");
                return (
                  <div
                    key={exam.id}
                    onClick={() => toggleExamOrder(exam.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isOrdered
                        ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 shadow-2xs"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141720] hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isOrdered
                              ? "bg-sky-600 border-sky-600 text-white"
                              : "border-gray-400 dark:border-gray-600"
                          }`}
                        >
                          {isOrdered && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {exam.category}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                            {exam.name}
                          </h4>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isHighInvasive
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {exam.costInvasiveness}
                      </span>
                    </div>

                    {isOrdered && (
                      <div className="p-3 rounded-lg bg-white dark:bg-[#0f1117] border border-sky-200 dark:border-sky-900/60 text-xs space-y-1">
                        <p className="font-bold text-sky-700 dark:text-sky-400">
                          🧪 Resultado Liberado:
                        </p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                          {exam.result}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stage 4 Justification Gate */}
            {selectedExamIds.length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <label className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  Interpretação dos Exames Solicitados (Obrigatória para Avançar) *
                </label>
                <textarea
                  rows={3}
                  value={stage4Justification}
                  onChange={(e) => setStage4Justification(e.target.value)}
                  placeholder="Ex: Acetaminofenemia de 68 mcg/mL em 14h acima da linha de hepatotoxicidade no Nomograma de Rumack-Matthew, citólise hepática intensa (AST/ALT > 1400) e alargamento do INR (1,78)..."
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStage(3)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar às Hipóteses</span>
              </button>

              <button
                type="button"
                onClick={handleAdvanceFromStage4}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md cursor-pointer"
              >
                <span>Avançar para Etapa 5 (Diagnóstico Definitivo e Conduta)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ETAPA 5 — DIAGNÓSTICO DEFINITIVO, CONDUTA E MONITORAMENTO
         ════════════════════════════════════════════════════════════════════════ */}
      {currentStage === 5 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                <Pill className="w-4 h-4" />
                <span>Etapa 5 — Diagnóstico Definitivo, Plano Terapêutico e Monitoramento</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Consolide a Conclusão Clínica e Defina o Plano Terapêutico Completo
              </h3>
            </div>

            {/* 1. Definitive Diagnosis Selection */}
            <div className="space-y-2.5">
              <label className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                1. Confirme o Diagnóstico Definitivo:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(activeCase.stage5.diagnosisOptions || [activeCase.stage5.definitiveDiagnosis]).map(
                  (diag, idx) => {
                    const isSelected = selectedDiagnosisIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDiagnosisIdx(idx)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 font-bold text-sky-800 dark:text-sky-200"
                            : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141720] text-gray-800 dark:text-gray-200 hover:border-sky-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-sky-600 bg-sky-600" : "border-gray-400"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs sm:text-sm">{diag}</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* 2. Therapeutic Plan & Management Options */}
            <div className="space-y-2.5">
              <label className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                2. Selecione as Condutas Corretas (Medidas Imediatas, Fármacos/Doses/Antídotos, Internação e Monitoramento):
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {(activeCase.stage5.managementOptions || []).map((cond) => {
                  const isSelected = selectedConductIds.includes(cond.id);
                  return (
                    <div
                      key={cond.id}
                      onClick={() => {
                        setSelectedConductIds((prev) =>
                          prev.includes(cond.id)
                            ? prev.filter((x) => x !== cond.id)
                            : [...prev, cond.id]
                        );
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 shadow-2xs"
                          : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141720] hover:border-sky-300"
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-sky-600 border-sky-600 text-white"
                            : "border-gray-400 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {cond.category}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                          {cond.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Written Conduct & Monitoring Justification */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                3. Justificativa Terapêutica, Posologia/Antídoto e Critérios de Monitoramento *
              </label>
              <textarea
                rows={3}
                value={stage5Justification}
                onChange={(e) => setStage5Justification(e.target.value)}
                placeholder="Descreva o mecanismo do fármaco/antídoto escolhido (ex: NAC regenerando glutationa), por que não fazer carvão ativado tardio e quais parâmetros monitorar (Critérios de King's College)..."
                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141c] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStage(4)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar aos Exames</span>
              </button>

              <button
                type="button"
                onClick={handleFinishStage5}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Finalizar Caso e Ver Debriefing Comentado (Etapa 6)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ETAPA 6 — DEBRIEFING E DEVOLUTIVA ESTRUTURADA (GABARITO ETAPA POR ETAPA)
         ════════════════════════════════════════════════════════════════════════ */}
      {currentStage === 6 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Score & Performance Summary Header */}
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border-2 border-emerald-500/40 p-6 shadow-md space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Award className="w-4 h-4" /> Etapa 6 — Debriefing e Devolutiva Estruturada
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white pt-1">
                  Diagnóstico Definitivo: {activeCase.stage5.definitiveDiagnosis}
                </h2>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#141720] px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div>
                  <p className="text-[11px] font-bold uppercase text-gray-400">
                    Desempenho Clínico Global
                  </p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {debriefingMetrics.globalScore}%
                  </p>
                </div>
              </div>
            </div>

            {/* 5-Stage Score Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "1. Anamnese", score: debriefingMetrics.stage1Score },
                { label: "2. Exame Físico", score: debriefingMetrics.stage2Score },
                { label: "3. Hipóteses", score: debriefingMetrics.stage3Score },
                { label: "4. Exames Racionais", score: debriefingMetrics.stage4Score },
                { label: "5. Conduta & Dose", score: debriefingMetrics.stage5Score },
              ].map((m) => (
                <div
                  key={m.label}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-[#141720] border border-gray-200/70 dark:border-gray-800"
                >
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{m.label}</p>
                  <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
                    {m.score}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── GABARITO COMENTADO ETAPA POR ETAPA (1 A 5) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Debriefing Etapa 1 */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                <span>Etapa 1 — Análise da Anamnese</span>
                <span className="text-xs text-sky-600 dark:text-sky-400">
                  {debriefingMetrics.hitEssentialAnam.length}/
                  {debriefingMetrics.hitEssentialAnam.length +
                    debriefingMetrics.missedEssentialAnam.length}{" "}
                  essenciais coletadas
                </span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {activeCase.stage6?.stageByStageCommentary?.stage1}
              </p>

              {debriefingMetrics.missedEssentialAnam.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs space-y-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    ⚠️ O que faltou perguntar na Anamnese:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-800 dark:text-gray-200">
                    {debriefingMetrics.missedEssentialAnam.map((m) => (
                      <li key={m.id}>
                        <strong>{m.question}</strong> — <em>{m.finding}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Debriefing Etapa 2 */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                <span>Etapa 2 — Análise do Exame Físico</span>
                <span className="text-xs text-sky-600 dark:text-sky-400">
                  {debriefingMetrics.hitEssentialPhys.length}/
                  {debriefingMetrics.hitEssentialPhys.length +
                    debriefingMetrics.missedEssentialPhys.length}{" "}
                  sistemas prioritários
                </span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {activeCase.stage6?.stageByStageCommentary?.stage2}
              </p>

              {debriefingMetrics.missedEssentialPhys.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs space-y-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    ⚠️ Sistemas prioritários que faltaram examinar:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-800 dark:text-gray-200">
                    {debriefingMetrics.missedEssentialPhys.map((p) => (
                      <li key={p.id}>
                        <strong>{p.system}:</strong> {p.findings}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Debriefing Etapa 3 */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Etapa 3 — Hipótese Principal, Diferenciais e Justificativa
              </h3>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141720] text-xs space-y-1">
                <p>
                  <strong>Sua Hipótese:</strong> {studentPrimaryHypothesis || "—"}
                </p>
                <p>
                  <strong>Sua Justificativa:</strong> {stage3Justification || "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">
                  📘 Gabarito Fisiopatológico Padrão-Ouro:
                </p>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {activeCase.stage3.modelJustification}
                </p>
              </div>
            </div>

            {/* Debriefing Etapa 4 */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Etapa 4 — Uso Racional de Exames Complementares
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {activeCase.stage6?.stageByStageCommentary?.stage4}
              </p>

              {debriefingMetrics.missedEssentialExams.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs space-y-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    ⚠️ Exames essenciais que faltaram pedir:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-800 dark:text-gray-200">
                    {debriefingMetrics.missedEssentialExams.map((e) => (
                      <li key={e.id}>
                        <strong>{e.name}:</strong> {e.result}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {debriefingMetrics.unnecessaryExamsOrdered.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 text-xs space-y-1">
                  <p className="font-bold text-rose-800 dark:text-rose-300">
                    🚫 Exames desnecessários/invasivos solicitados:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-800 dark:text-gray-200">
                    {debriefingMetrics.unnecessaryExamsOrdered.map((e) => (
                      <li key={e.id}>
                        <strong>{e.name}:</strong> {e.commentary}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Debriefing Etapa 5 — Conduta Terapêutica Completa */}
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-500" />
              <span>Etapa 5 — Plano Terapêutico Padrão-Ouro, Posologia, Antídotos e Monitoramento</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#141720] border border-gray-200/70 dark:border-gray-800 space-y-1">
                <p className="font-bold text-sky-700 dark:text-sky-400 uppercase">
                  1. Medidas Imediatas e Suporte
                </p>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {activeCase.stage5.completeConductSummary?.immediateMeasures}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-1">
                <p className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  2. Farmacoterapia, Doses, Ajustes e Antídotos
                </p>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {activeCase.stage5.completeConductSummary?.pharmacotherapyAndDoses}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/60 space-y-1">
                <p className="font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                  3. Critérios de Internação / UTI / Alta
                </p>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {activeCase.stage5.completeConductSummary?.admissionAndDischargeCriteria}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/60 space-y-1">
                <p className="font-bold text-amber-700 dark:text-amber-400 uppercase">
                  4. Plano de Monitoramento Clínico e Laboratorial
                </p>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {activeCase.stage5.completeConductSummary?.monitoringPlan}
                </p>
              </div>
            </div>

            {debriefingMetrics.wrongCondsPicked.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs space-y-1.5">
                <p className="font-bold text-rose-800 dark:text-rose-300">
                  🚫 Atenção às Condutas Inadequadas Selecionadas:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-gray-800 dark:text-gray-200">
                  {debriefingMetrics.wrongCondsPicked.map((c) => (
                    <li key={c.id}>
                      <strong>{c.action}:</strong> {c.rationale}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Armadilhas Clínicas & Fisiopatologia Aprofundada */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-rose-200 dark:border-rose-900/50 p-5 space-y-3">
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Armadilhas Clínicas e Erros Comuns em Provas</span>
              </h3>
              <ul className="space-y-2 text-xs text-gray-800 dark:text-gray-200">
                {(activeCase.stage6?.clinicalPitfalls || []).map((pit, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 leading-relaxed"
                  >
                    ⚠️ {pit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 space-y-3">
              <h3 className="text-sm font-bold text-sky-700 dark:text-sky-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Fisiopatologia Celular e Sistêmica do Caso</span>
              </h3>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {activeCase.stage6?.pathophysiologyDeepDive}
              </p>
              <div className="pt-2 space-y-1.5">
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  🎯 Pontos-Chave para Fixação:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                  {(activeCase.stage6?.keyTakeaways || []).map((kt, i) => (
                    <li key={i}>{kt}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
