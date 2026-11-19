import { getTodayFormattedDate, getTodayKey, normalizeDiagnosisString } from "./clinicalCasesBank";

export interface ProgressiveDrugCase {
  id: string;
  date: string;
  drugName: string;
  acceptedSynonyms: string[];
  drugClass: string;
  difficulty: "Fácil" | "Médio" | "Difícil";
  sourceLabel?: string;
  clues: [string, string, string, string, string]; // [Pista 1 (Indicação), Pista 2 (Mecanismo), Pista 3 (Farmacocinética), Pista 4 (Efeitos adversos), Pista 5 (Interações/Antídoto/Pérola)]
  debriefing: {
    overview: string;
    clueBreakdown: [string, string, string, string, string];
    differentials: Array<{
      name: string;
      distinction: string;
    }>;
    clinicalUseAndMonitoring: string;
    pearls: string[];
  };
}

export const BUILTIN_PROGRESSIVE_DRUGS: ProgressiveDrugCase[] = [
  {
    id: "drug-amiodarona",
    date: "19/11/2026",
    drugName: "Amiodarona",
    acceptedSynonyms: ["amiodarona", "ancoron", "atlansil"],
    drugClass: "Antiarrítmico Classe III",
    difficulty: "Fácil",
    clues: [
      "Fármaco de amplo espectro amplamente utilizado na emergência e no ambulatório para controle de arritmias ventriculares graves (TV/FV refratária) e fibrilação atrial, especialmente em pacientes com cardiopatia estrutural ou insuficiência cardíaca.",
      "Seu mecanismo principal é o bloqueio dos canais de potássio (prolongando a duração do potencial de ação e o período refratário efetivo — Classe III), embora também possua ações sobre canais de sódio, cálcio e receptores beta-adrenérgicos.",
      "Apresenta altíssima lipossolubilidade, grande volume de distribuição tecidual e uma meia-vida de eliminação extremamente longa (variando de 25 a 100 dias), além de conter cerca de 37% de iodo em sua estrutura molecular.",
      "Seu uso crônico exige monitoramento periódico por poder causar toxicidade pulmonar grave (fibrose intersticial), microdepósitos corneanos, fotossensibilidade com pigmentação cutânea azul-acinzentada, hepatotoxicidade e tanto hipotireoidismo quanto hipertireoidismo.",
      "Prolonga o intervalo QT no ECG, mas paradoxalmente tem baixo risco de induzir Torsades de Pointes em comparação a outros agentes da mesma classe. Inibe potentemente o CYP450 e a glicoproteína-P, elevando os níveis séricos de varfarina e digoxina.",
    ],
    debriefing: {
      overview:
        "A Amiodarona é o antiarrítmico Classe III mais eficaz e versátil da prática clínica, sendo segura para pacientes com disfunção ventricular esquerda (onde agentes Classe IC como propafenona são contraindicados). Sua estrutura iodada e alta lipofilicidade explicam tanto sua meia-vida prolongada quanto seu perfil único de toxicidades multiorgânicas.",
      clueBreakdown: [
        "Pista 1 (Indicação): Arritmias ventriculares potencialmente fatais (ACLS: 300 mg IV em bolus na FV/TV sem pulso) e manutenção do ritmo sinusal na FA em cardiopatas.",
        "Pista 2 (Mecanismo): Bloqueador de canais de K+ (Classe III de Vaughan-Williams) com efeitos aditivos de Classes I, II e IV.",
        "Pista 3 (Farmacocinética): Meia-vida de semanas a meses (25-100 dias) e molécula rica em iodo (37% do peso molecular).",
        "Pista 4 (Efeitos adversos): Pneumonite/fibrose pulmonar (efeito mais letal), disfunção tireoidiana (hipo por efeito Wolff-Chaikoff ou hiper tipo I/II por Jod-Basedow/tireoidite destrutiva), microdepósitos na córnea e pele azul-acinzentada ('homem azul').",
        "Pista 5 (Interações/ECG): Alarga o QT com baixa incidência de Torsades; obriga redução empírica de 30-50% na dose de varfarina e digoxina quando associada.",
      ],
      differentials: [
        {
          name: "Sotalol",
          distinction:
            "Também é antiarrítmico Classe III com ação betabloqueadora, mas tem excreção renal, meia-vida curta, NÃO contém iodo e apresenta risco significativamente MAIOR de Torsades de Pointes.",
        },
        {
          name: "Lidocaína",
          distinction:
            "Antiarrítmico Classe IB usado em TV/FV isquêmica, mas de uso exclusivamente IV, meia-vida curta e toxicidade predominantemente neurológica (parestesia perioral, convulsões).",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Antes de iniciar uso crônico e a cada 6 meses: solicitar TSH/T4 livre, transaminases hepáticas (TGO/TGP), radiografia de tórax e prova de função pulmonar (DLCO) se sintomas respiratórios.\n2. Na parada cardiorrespiratória (FV/TV sem pulso refratária ao choque): 300 mg IV/IO na 1ª dose e 150 mg na 2ª dose.\n3. Reduzir dose de varfarina e digoxina ao associar amiodarona.",
      pearls: [
        "Efeito adverso MAIS LETAL da amiodarona: Fibrose pulmonar intersticial.",
        "A amiodarona pode causar TANTO hipotireoidismo quanto hipertireoidismo pela altíssima carga de iodo.",
      ],
    },
  },
  {
    id: "drug-varfarina",
    date: "20/11/2026",
    drugName: "Varfarina",
    acceptedSynonyms: ["varfarina", "warfarina", "marevan", "coumadin"],
    drugClass: "Anticoagulante Oral (Antagonista da Vitamina K)",
    difficulty: "Fácil",
    clues: [
      "Anticoagulante oral clássico indispensável para pacientes com prótese valvar cardíaca mecânica e estenose mitral moderada a grave com fibrilação atrial, situações em que os novos anticoagulantes diretos são contraindicados.",
      "Atua inibindo a enzima vitamina K epóxido redutase (VKORC1) no fígado, impedindo a gama-carboxilação e ativação dos fatores de coagulação II, VII, IX e X, bem como das proteínas anticoagulantes naturais C e S.",
      "Apresenta estreita janela terapêutica, metabolismo hepático intenso via CYP2C9 e início de ação anticoagulante pleno lento (3 a 5 dias), exigindo terapia de ponte com heparina nos primeiros dias em quadros trombóticos agudos.",
      "Seu principal risco é hemorragia; raramente, nos primeiros dias de uso sem ponte de heparina, pode provocar necrose cutânea induzida pelo estado pró-trombótico transitório (queda precoce da Proteína C). É teratogênico (embriopatia no 1º trimestre).",
      "Seu efeito é monitorado pelo Tempo de Protrombina expresso em RNI (meta habitual entre 2,0 e 3,0). Em sangramentos graves com ameaça à vida, a reversão imediata é feita com Complexo Protrombínico de 4 fatores associado à Vitamina K intravenosa.",
    ],
    debriefing: {
      overview:
        "A Varfarina é o antagonista oral da vitamina K (cumarínico) mais utilizado no mundo. Apesar do avanço dos DOACs (rivaroxabana, apixabana, dabigatrana), permanece insubstituível em próteses valvares mecânicas, estenose mitral reumática moderada/grave e síndrome antifosfolípide de alto risco.",
      clueBreakdown: [
        "Pista 1 (Indicação): Único anticoagulante oral aprovado para válvulas cardíacas mecânicas e FA valvar (estenose mitral moderada/grave).",
        "Pista 2 (Mecanismo): Inibição da VKORC1 -> bloqueia a síntese hepática funcional dos fatores dependentes de vitamina K: II, VII, IX, X, além das proteínas C e S.",
        "Pista 3 (Farmacocinética): Início pleno demorado (fator II/protrombina tem meia-vida de ~60-72h) e metabolismo pelo CYP2C9 (muitas interações medicamentosas e alimentares com folhas verde-escuras).",
        "Pista 4 (Efeitos adversos): Necrose cutânea por queda rápida da Proteína C (meia-vida de apenas 6-8h) antes da queda da protrombina; atravessa a placenta e causa hipoplasia nasal/condrodisplasia punctata (teratogênica).",
        "Pista 5 (Monitoramento/Antídoto): Monitorada pelo TP/RNI; revertida rapidamente por Concentrado de Complexo Protrombínico (CCP) + Vitamina K IV (ou Plasma Fresco Congelado se CCP indisponível).",
      ],
      differentials: [
        {
          name: "Heparina não fracionada (HNF)",
          distinction:
            "Uso parenteral (IV/SC), potencializa a antitrombina III, monitorada pelo TTPA, segura na gestação e revertida pelo Sulfato de Protamina.",
        },
        {
          name: "Rivaroxabana / Apixabana (DOACs)",
          distinction:
            "Inibidores diretos do fator Xa, não exigem controle de RNI, mas são CONTRAINDICADOS em próteses valvares mecânicas.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Meta de RNI: 2,0 a 3,0 (maioria das indicações: FA, TVP/TEP) ou 2,5 a 3,5 (prótese valvar mecânica mitral).\n2. Sangramento grave / risco de morte: Suspender varfarina + Complexo Protrombínico 4 fatores IV + Vitamina K 10 mg IV lento.\n3. Gestação: Substituir por Heparina de Baixo Peso Molecular (Enoxaparina), pois a varfarina atravessa a barreira placentária.",
      pearls: [
        "Mnemônico dos fatores bloqueados pela Varfarina: 1972 (X, IX, VII, II) + Proteínas C e S.",
        "Sempre faça ponte com heparina ao iniciar varfarina em TVP/TEP agudo para evitar o estado hipercoagulável inicial da queda da Proteína C.",
      ],
    },
  },
  {
    id: "drug-metformina",
    date: "21/11/2026",
    drugName: "Metformina",
    acceptedSynonyms: ["metformina", "cloridrato de metformina", "glifage"],
    drugClass: "Biguanida (Antidiabético Oral)",
    difficulty: "Fácil",
    clues: [
      "Fármaco de primeira linha mundial no tratamento do Diabetes Mellitus tipo 2, também utilizado na síndrome dos ovários policísticos (SOP) para melhora da resistência insulínica.",
      "Atua principalmente ativando a proteína quinase ativada por AMP (AMPK) no fígado, reduzindo fortemente a gliconeogênese hepática e aumentando a sensibilidade periférica à insulina sem estimular a secreção pancreática de insulina.",
      "Não sofre metabolização hepática e é excretada de forma inalterada pelos rins (filtração glomerular e secreção tubular), não provocando hipoglicemia nem ganho de peso quando usada em monoterapia.",
      "Seus efeitos colaterais mais frequentes são gastrointestinais (diarreia, náuseas e desconforto abdominal), que melhoram com a formulação de liberação prolongada (XR). O uso crônico pode causar deficiência de vitamina B12.",
      "Sua complicação mais grave e rara é a acidose láctica, motivo pelo qual é contraindicada quando a taxa de filtração glomerular (TFG) está abaixo de 30 mL/min/1,73m² ou em estados de hipóxia tecidual aguda/choque.",
    ],
    debriefing: {
      overview:
        "A Metformina é a única biguanida em uso clínico e permanece como terapia inicial padrão-ouro no DM2 por sua alta eficácia redutora de HbA1c (~1-1,5%), segurança cardiovascular, baixo custo, efeito neutro/redutor sobre o peso e ausência de risco de hipoglicemia isolada.",
      clueBreakdown: [
        "Pista 1 (Indicação): Primeira linha no DM2 e excelente opção na resistência insulínica da SOP.",
        "Pista 2 (Mecanismo): Inibe o complexo I mitocondrial -> ativa AMPK -> suprime a gliconeogênese hepática e melhora a captação periférica de glicose.",
        "Pista 3 (Farmacocinética): Eliminação 100% renal inalterada; não é secretagogo de insulina (portanto não causa hipoglicemia em monoterapia).",
        "Pista 4 (Efeitos adversos): Intolerância gastrointestinal inicial (reduzida com metformina XR após jantar) e má absorção de Vitamina B12 (anemia megaloblástica/neuropatia em uso prolongado).",
        "Pista 5 (Contraindicação): Acidose láctica em pacientes com TFG < 30 mL/min, insuficiência hepática grave, choque ou hipoxemia severa.",
      ],
      differentials: [
        {
          name: "Glibenclamida / Gliclazida (Sulfonilureias)",
          distinction:
            "São secretagogos de insulina (bloqueiam canais de K+ ATP-dependentes na célula beta), causando alto risco de HIPOGLICEMIA e GANHO DE PESO.",
        },
        {
          name: "Empagliflozina / Dapagliflozina (iSGLT2)",
          distinction:
            "Causam glicosúria renal, redução de peso e proteção cardiorrenal, tendo como efeitos adversos infecções genitais fúngicas e cetoacidose euglicêmica.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Iniciar com dose baixa (500 mg/dia à noite após refeição) e titular gradualmente até 2.000 mg/dia (preferir formulação XR para melhor tolerância).\n2. TFG entre 30 e 45 mL/min: reduzir dose máxima para 1.000 mg/dia; TFG < 30 mL/min: SUSPENDER.\n3. Dosar periodicamente Vitamina B12 em pacientes em uso crônico.",
      pearls: [
        "Uso prolongado de Metformina pode causar deficiência de Vitamina B12 -> sempre checar em diabéticos com anemia macrocítica ou piora de neuropatia periférica!",
        "TFG < 30 mL/min = Contraindicação absoluta à Metformina pelo risco de acidose láctica.",
      ],
    },
  },
  {
    id: "drug-vancomicina",
    date: "22/11/2026",
    drugName: "Vancomicina",
    acceptedSynonyms: ["vancomicina", "cloridrato de vancomicina"],
    drugClass: "Antibiótico Glicopeptídeo",
    difficulty: "Fácil",
    clues: [
      "Antibiótico hospitalar essencial de primeira escolha para infecções invasivas graves por Staphylococcus aureus resistente à meticilina (MRSA), além de ser usado por via oral na colite pseudomembranosa por Clostridioides difficile.",
      "Atua exclusivamente sobre bactérias Gram-positivas, ligando-se à terminação D-alanil-D-alanina (D-Ala-D-Ala) dos precursores de peptideoglicano e bloqueando a síntese da parede celular bacteriana.",
      "Por ser uma molécula muito grande e hidrofílica, não é absorvida pelo trato gastrointestinal quando administrada por via oral (o que permite ação local no cólon), exigindo via intravenosa para infecções sistêmicas e ajuste rigoroso na insuficiência renal.",
      "Sua infusão intravenosa rápida pode desencadear degranulação direta de mastócitos (não mediada por IgE), causando eritema pruriginoso intenso em face, pescoço e tronco superior ('síndrome do homem vermelho').",
      "Apresenta risco significativo de nefrotoxicidade (especialmente se associada à piperacilina-tazobactam ou aminoglicosídeos) e ototoxicidade, exigindo monitorização dos níveis séricos (vancocinemia / razão ASC/MIC).",
    ],
    debriefing: {
      overview:
        "A Vancomicina é o principal antibiótico glicopeptídeo, com espectro estrito para bactérias Gram-positivas (incluindo MRSA, Staphylococcus coagulase-negativo, Streptococcus resistentes e Enterococcus sensíveis). A resistência (VRE) ocorre quando a bactéria altera o alvo D-Ala-D-Ala para D-Ala-D-Lactato.",
      clueBreakdown: [
        "Pista 1 (Indicação): Padrão-ouro IV para MRSA invasivo e terapia de escolha VO para colite por C. difficile.",
        "Pista 2 (Mecanismo): Inibição da polimerização/transglicosilação da parede celular ao se ligar ao dipeptídeo D-Ala-D-Ala (apenas Gram-positivos, pois não atravessa as porinas da membrana externa de Gram-negativos).",
        "Pista 3 (Farmacocinética): Absorção oral praticamente nula (excelente ação intraluminal no cólon); excreção 90% renal por filtração glomerular.",
        "Pista 4 (Efeitos adversos): Síndrome da Infusão da Vancomicina ('Homem Vermelho') — reação anafilactoide por liberação direta de histamina dependente da velocidade de infusão (NÃO é alergia verdadeira!).",
        "Pista 5 (Monitoramento/Toxicidade): Nefrotoxicidade (acentuada com piperacilina-tazobactam) e ototoxicidade; monitorar vancocinemia (meta ASC/MIC entre 400 e 600).",
      ],
      differentials: [
        {
          name: "Linezolida",
          distinction:
            "Também cobre MRSA e VRE, tem excelente biodisponibilidade oral e penetração pulmonar, mas é bacteriostática (oxazolidinona) e causa mielossupressão/plaquetopenia e síndrome serotoninérgica (inibe MAO).",
        },
        {
          name: "Daptomicina",
          distinction:
            "Lipopeptídeo bactericida anti-MRSA e anti-VRE, porém é inativada pelo surfactante pulmonar (NÃO pode ser usada em pneumonia!) e causa elevação de CPK/miopatia.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Infundir SEMPRE lentamente (em pelo menos 1 a 2 horas, máximo 10-15 mg/min) para evitar a Síndrome do Homem Vermelho.\n2. Se ocorrer eritema/prurido durante a infusão: pausar temporariamente, administrar anti-histamínico (difenidramina) e retomar em velocidade mais lenta (não contraindica uso futuro).\n3. Ajustar dose pela função renal e monitorar níveis séricos (vancocinemia).",
      pearls: [
        "Síndrome do Homem Vermelho NÃO é alergia mediada por IgE -> basta desacelerar a infusão para ≥ 2 horas!",
        "Mecanismo de resistência à Vancomicina (VRE): substituição de D-Ala-D-Ala por D-Ala-D-Lactato.",
      ],
    },
  },
  {
    id: "drug-digoxina",
    date: "23/11/2026",
    drugName: "Digoxina",
    acceptedSynonyms: ["digoxina", "digitalico", "lanoxin"],
    drugClass: "Glicosídeo Cardíaco (Digitálico)",
    difficulty: "Médio",
    clues: [
      "Fármaco derivado da planta Digitalis usado para controle da frequência ventricular na fibrilação atrial e para alívio sintomático e redução de hospitalizações na insuficiência cardíaca com fração de ejeção reduzida (sem reduzir mortalidade).",
      "Seu mecanismo molecular consiste na inibição direta da bomba Na+/K+-ATPase na membrana dos cardiomiócitos, elevando o sódio intracelular, reduzindo a saída de cálcio pelo trocador Na+/Ca2+ e aumentando o cálcio no retículo sarcoplasmático (efeito inotrópico positivo).",
      "Além do efeito inotrópico positivo, exerce intenso efeito vagotônico central (parassimpaticomimético), lentificando a condução através do nó atrioventricular. Possui eliminação predominantemente renal e índice terapêutico extremamente estreito.",
      "Sua intoxicação cursa classicamente com náuseas, vômitos, anorexia, confusão mental, visão amarelada ou esverdeada com halos ao redor das luzes (xantopsia) e quase qualquer tipo de arritmia — sendo a taquicardia atrial com bloqueio AV e o bigeminismo ventricular achados clássicos.",
      "A hipocalemia precipita gravemente sua toxicidade (pois o potássio compete pelo mesmo sítio de ligação na bomba Na+/K+-ATPase). No ECG terapêutico, produz infradesnivelamento de ST em formato de 'colher de pedreiro'. Seu antídoto específico nos casos graves é o fragmento de anticorpo Fab antidigoxina.",
    ],
    debriefing: {
      overview:
        "A Digoxina é um glicosídeo digitálico com duplo efeito cardiovascular: inotropismo positivo (aumento da contratilidade via acúmulo de Ca2+ intracelular) e cronotropismo/dromotropismo negativo no nó AV (aumento do tônus vagal). Embora melhore sintomas e reduza reinternações na ICFER, não reduz a mortalidade global.",
      clueBreakdown: [
        "Pista 1 (Indicação): IC com fração de ejeção reduzida refratária e controle de frequência na FA (não reduz mortalidade na IC).",
        "Pista 2 (Mecanismo): Inibição da Na+/K+-ATPase -> ↑Na+ intracelular -> ↓trocador Na+/Ca2+ -> ↑Ca2+ no retículo sarcoplasmático -> maior força de contração.",
        "Pista 3 (Farmacocinética/Vagal): Efeito parassimpático no nó AV; excreção renal (~70-80%) e janela terapêutica muito estreita (0,5 a 0,9 ng/mL).",
        "Pista 4 (Intoxicação): Sintomas GI precoces (anorexia/náuseas), alteração visual clássica (xantopsia — halos amarelo-esverdeados) e arritmias por aumento do automatismo + bloqueio AV (ex: taquicardia atrial com BAV 2:1).",
        "Pista 5 (Eletrolítico/ECG/Antídoto): Hipocalemia (frequentemente causada por furosemida!) aumenta dramaticamente a ligação da digoxina à bomba; ECG em 'pá/colher de pedreiro' indica impregnação digitálica; antídoto específico = Anticorpo Fab Antidigoxina (DigiFab).",
      ],
      differentials: [
        {
          name: "Dobutamina",
          distinction:
            "Inotrópico positivo parenteral (agonista beta-1 adrenérgico) usado apenas em choque cardiogênico/IC aguda descompensada, com aumento da FC e sem efeito vagotônico.",
        },
        {
          name: "Verapamil / Diltiazem",
          distinction:
            "Bloqueadores de canais de cálcio não di-hidropiridínicos que controlam a FC na FA, mas são inotrópicos NEGATIVOS (contraindicados na ICFER).",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Nível sérico alvo na IC: 0,5 a 0,9 ng/mL; sempre monitorar função renal e potássio/magnésio séricos.\n2. Intoxicação digitálica grave (arritmias ventriculares, bradicardia instável, hipercalemia > 5,5 mEq/L na intoxicação aguda): Anticorpo Fab antidigoxina IV.\n3. Corrigir hipocalemia e hipomagnesemia; evitar cardioversão elétrica de rotina na intoxicação digitálica (risco de FV refratária).",
      pearls: [
        "Na intoxicação digitálica: a HIPOCALEMIA é o principal fator precipitante (uso conjunto com furosemida), mas na intoxicação aguda grave a HIPERCALEMIA é o melhor marcador de gravidade/mortalidade!",
        "Infradesnivelamento de ST em 'colher de pedreiro' = sinal de impregnação digitálica (não significa necessariamente intoxicação).",
      ],
    },
  },
  {
    id: "drug-litio",
    date: "24/11/2026",
    drugName: "Lítio",
    acceptedSynonyms: ["litio", "carbonato de litio", "carbolitium"],
    drugClass: "Estabilizador do Humor",
    difficulty: "Médio",
    clues: [
      "Fármaco padrão-ouro na psiquiatria para o tratamento de manutenção do Transtorno Afetivo Bipolar (fases de mania e profilaxia de episódios) e o único comprovadamente associado à redução significativa do risco de suicídio.",
      "É um cátion monovalente que compete com o sódio nos túbulos renais e modula vias de sinalização intracelular no SNC, inibindo a enzima inositol monofosfatase (depleção de IP3/DAG) e a GSK-3beta.",
      "Não se liga a proteínas plasmáticas, não sofre metabolização hepática e é excretado 100% pelos rins, sendo reabsorvido quase totalmente no túbulo proximal de forma paralela ao sódio. Possui janela terapêutica estreita (0,6 a 1,2 mEq/L).",
      "Seus efeitos adversos clássicos incluem tremor fino de extremidades, ganho de peso, hipotireoidismo com bócio, leucocitose benigna e poliúria/polidipsia por Diabetes Insipidus Nefrogênico (resistência ao ADH no ducto coletor).",
      "Desidratação, dieta hipossódica ou uso concomitante de AINEs, IECA/BRA ou diuréticos tiazídicos elevam perigosamente seus níveis séricos, causando intoxicação com ataxia, disartria, tremor grosseiro, hiperreflexia e convulsões (tratada com hemodiálise nos casos graves). Seu uso na gestação associa-se à Anomalia de Ebstein.",
    ],
    debriefing: {
      overview:
        "O Carbonato de Lítio é o estabilizador de humor de referência no Transtorno Bipolar tipo I. Por comportar-se quimicamente como o íon sódio (Na+), qualquer condição que aumente a reabsorção proximal de sódio (desidratação, tiazídicos, AINEs, IECA) reduz a depuração do lítio e precipita intoxicação grave.",
      clueBreakdown: [
        "Pista 1 (Indicação): Padrão-ouro no Transtorno Bipolar com efeito antissuicida comprovado.",
        "Pista 2 (Mecanismo): Inibição da inositol monofosfatase (reduz reciclagem de PIP2/IP3) e da GSK-3β.",
        "Pista 3 (Farmacocinética): Eliminação 100% renal sem metabolismo hepático; litemia terapêutica estrita entre 0,6 e 1,2 mEq/L.",
        "Pista 4 (Efeitos adversos): Diabetes Insipidus Nefrogênico (entra nas células principais do ducto coletor via canais ENaC e reduz aquaporina-2 -> urina diluída e poliúria; tratado com amilorida), hipotireoidismo e tremor fino.",
        "Pista 5 (Interações/Teratogenicidade): Tiazídicos, AINEs e IECA causam intoxicação por lítio; na gravidez (1º trimestre) aumenta o risco de Anomalia de Ebstein (malformação da valva tricúspide).",
      ],
      differentials: [
        {
          name: "Ácido Valproico (Valproato de Sódio)",
          distinction:
            "Também estabilizador de humor eficaz na mania aguda, mas metabolizado no fígado, causa hepatotoxicidade, pancreatite, alopecia e defeitos do tubo neural (espinha bífida) na gestação.",
        },
        {
          name: "Carbamazepina",
          distinction:
            "Potente indutor do CYP450, causa hiponatremia (SIADH — oposto do Diabetes Insipidus do lítio), agranulocitose e Síndrome de Stevens-Johnson.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Monitorar litemia sérica (coletada 12h após a última dose: alvo 0,6-1,0 mEq/L na manutenção), função renal (creatinina) e função tireoidiana (TSH) a cada 3-6 meses.\n2. Diabetes Insipidus Nefrogênico induzido por lítio: Amilorida (bloqueia o canal ENaC impedindo a entrada de lítio na célula tubular).\n3. Intoxicação grave (litemia > 4,0 mEq/L ou > 2,5 mEq/L com sintomas neurológicos graves/IRA): Hemodiálise de urgência.",
      pearls: [
        "Lítio na gestação = Anomalia de Ebstein (valva tricúspide).",
        "Três classes de remédios que mais causam intoxicação por Lítio: Tiazídicos, AINEs e IECA/BRA.",
        "Tratamento do Diabetes Insipidus Nefrogênico por Lítio: Amilorida.",
      ],
    },
  },
  {
    id: "drug-isoniazida",
    date: "25/11/2026",
    drugName: "Isoniazida",
    acceptedSynonyms: ["isoniazida", "inh", "hidrazida"],
    drugClass: "Antituberculoso (Bactericida)",
    difficulty: "Médio",
    clues: [
      "Fármaco fundamental presente tanto no esquema básico (RIPE) para tratamento da tuberculose ativa quanto em monoterapia para tratamento da infecção latente por Mycobacterium tuberculosis.",
      "É um pró-fármaco ativado pela enzima catalase-peroxidase bacteriana (gene katG) que inibe a enzima InhA, bloqueando a síntese dos ácidos micólicos essenciais da parede celular micobacteriana.",
      "Seu metabolismo hepático ocorre principalmente por acetilação (enzima N-acetiltransferase 2 — NAT2), apresentando polimorfismo genético entre 'acetiladores lentos' (maior risco de toxicidade) e 'acetiladores rápidos'.",
      "Pode causar hepatotoxicidade idiossincrática, lúpus fármaco-induzido (com anticorpo anti-histona positivo) e neuropatia periférica sensitivo-motora ('em bota e luva') por depletar os estoques de piridoxina.",
      "Para prevenir sua neurotoxicidade, recomenda-se suplementação profilática de Vitamina B6 (piridoxina) em gestantes, etilistas, desnutridos, diabéticos e pacientes com HIV. Em superdosagem aguda, causa convulsões refratárias a benzodiazepínicos que só cedem com altas doses intravenosas de Piridoxina.",
    ],
    debriefing: {
      overview:
        "A Isoniazida (INH) é um dos pilares bactericidas do tratamento da tuberculose (esquema RIPE: Rifampicina, Isoniazida, Pirazinamida e Etambutol). Atua bloqueando a biossíntese dos ácidos micólicos e tem forte interação com o metabolismo da vitamina B6 (piridoxina), cofator essencial para a síntese do neurotransmissor inibitório GABA.",
      clueBreakdown: [
        "Pista 1 (Indicação): Base do esquema RIPE e tratamento da tuberculose latente (ILTB).",
        "Pista 2 (Mecanismo): Ativada pela catalase-peroxidase bacteriana (mutações em katG geram resistência) -> inibe síntese de ácidos micólicos.",
        "Pista 3 (Farmacocinética): Acetilação hepática pela NAT2 (acetiladores lentos têm mais efeitos tóxicos e lúpus fármaco-induzido).",
        "Pista 4 (Efeitos adversos): Neuropatia periférica por deficiência de piridoxina (Vitamina B6), hepatotoxicidade e lúpus induzido por drogas (anti-histona+).",
        "Pista 5 (Prevenção/Antídoto): Suplementação de Piridoxina (Vitamina B6) na profilaxia e como antídoto específico em dose grama-por-grama nas convulsões refratárias por overdose de isoniazida (pois sem B6 não há produção de GABA).",
      ],
      differentials: [
        {
          name: "Rifampicina",
          distinction:
            "Inibe a RNA-polimerase DNA-dependente, é potente indutor do CYP450 e deixa urina, lágrimas e secreções com cor ALARANJADA/AVERMELHADA.",
        },
        {
          name: "Etambutol",
          distinction:
            "Inibe a arabinosiltransferase e tem como toxicidade clássica a NEURITE ÓPTICA RETROBULBAR (perda da discriminação das cores verde e vermelho).",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Profilaxia de neuropatia periférica: Piridoxina (Vitamina B6) 50 mg/dia VO em grupos de risco (gestantes, HIV, etilistas, diabéticos, DRC, desnutridos).\n2. Hepatotoxicidade (TGO/TGP > 3x LSN com sintomas ou > 5x LSN assintomático): suspender esquema RIPE e reintroduzir sequencialmente.\n3. Superdosagem aguda com estado de mal epiléptico: Piridoxina IV (1 g para cada 1 g de isoniazida ingerida, ou 5 g IV se dose desconhecida).",
      pearls: [
        "Convulsão refratária em paciente em tratamento de tuberculose = Intoxicação por Isoniazida -> Antídoto: Piridoxina (Vitamina B6) IV!",
        "Lúpus induzido por drogas (anti-histona positivo): mnemônico HIPP — Hidralazina, Isoniazida, Procainamida, Fenitoína.",
      ],
    },
  },
  {
    id: "drug-furosemida",
    date: "26/11/2026",
    drugName: "Furosemida",
    acceptedSynonyms: ["furosemida", "lasix"],
    drugClass: "Diurético de Alça",
    difficulty: "Fácil",
    clues: [
      "Diurético de altíssima potência, indispensável no manejo do edema agudo de pulmão cardiogênico, da congestão na insuficiência cardíaca descompensada, da ascite cirrótica e da síndrome nefrótica.",
      "Atua na porção espessa do ramo ascendente da alça de Henle, inibindo o cotransportador Na+/K+/2Cl- (NKCC2) e abolindo o gradiente medular de concentração urinária.",
      "Secreta-se ativamente no túbulo proximal via transportadores de ânions orgânicos (competindo com ácido úrico e AINEs) e mantém eficácia mesmo em pacientes com taxa de filtração glomerular reduzida (< 30 mL/min), onde os tiazídicos falham.",
      "Promove intensa excreção urinária de cálcio (calciúria), potássio e magnésio, causando classicamente hipocalemia, hipomagnesemia, alcalose metabólica de contração e hiperuricemia (podendo precipitar crises de gota).",
      "Em doses intravenosas muito altas e rápidas (especialmente associada a aminoglicosídeos), pode causar ototoxicidade reversível ou permanente. Por conter grupamento sulfonamida, pode causar reação cruzada em alérgicos graves a sulfas (alternativa: ácido etacrínico).",
    ],
    debriefing: {
      overview:
        "A Furosemida é o diurético de alça prototípico, capaz de bloquear a reabsorção de até 20-25% do sódio filtrado no néfron. Além de promover diurese maciça, exerce um efeito venodilatador precoce (mediado por prostaglandinas) que reduz rapidamente a pré-carga no edema agudo de pulmão.",
      clueBreakdown: [
        "Pista 1 (Indicação): Primeira linha para descongestão rápida no edema agudo de pulmão e estados edematosos graves.",
        "Pista 2 (Mecanismo): Inibe o cotransportador Na+/K+/2Cl- (NKCC2) no ramo ascendente espesso da alça de Henle.",
        "Pista 3 (Farmacocinética): Atinge o lúmen tubular por secreção ativa proximal; mantém ação diurética na doença renal crônica avançada (TFG < 30).",
        "Pista 4 (Efeitos adversos): 'Diuréticos de alça PERDEM cálcio' (hipercalciúria — útil na hipercalcemia aguda!), além de hipocalemia, hipomagnesemia, alcalose metabólica e hiperuricemia.",
        "Pista 5 (Toxicidade/Alergia): Ototoxicidade em infusão rápida/altas doses (risco somado com aminoglicosídeos) e estrutura derivada de sulfonamida.",
      ],
      differentials: [
        {
          name: "Hidroclorotiazida (Tiazídico)",
          distinction:
            "Age no túbulo contorcido distal (inibindo Na+/Cl-), RETÉM cálcio (útil na nefrolitíase por hipercalciúria e osteoporose) e perde eficácia quando TFG < 30 mL/min.",
        },
        {
          name: "Espironolactona",
          distinction:
            "Antagonista da aldosterona (poupador de potássio) no ducto coletor: causa HIPERCALEMIA (e não hipocalemia), acidose metabólica e ginecomastia.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Edema Agudo de Pulmão / IC aguda: 20 a 40 mg IV em bolus (ou 1 a 2,5x a dose oral diária habitual).\n2. Monitorar rigorosamente potássio, magnésio, creatinina e balanço hídrico (evitar hipocalemia que predispõe a arritmias e intoxicação digitálica).\n3. AINEs reduzem a eficácia da furosemida por inibirem as prostaglandinas renais vasodilatadoras.",
      pearls: [
        "Alça PERDE cálcio (hipercalciúria); Tiazídico POUPA cálcio (hipocalciúria).",
        "Efeito adverso clássico em altas doses IV rápidas: Ototoxicidade.",
      ],
    },
  },
  {
    id: "drug-espironolactona",
    date: "27/11/2026",
    drugName: "Espironolactona",
    acceptedSynonyms: ["espironolactona", "aldactone"],
    drugClass: "Antagonista do Receptor Mineralocorticoide (Diurético Poupador de Potássio)",
    difficulty: "Fácil",
    clues: [
      "Fármaco essencial na redução de mortalidade na insuficiência cardíaca com fração de ejeção reduzida, além de ser primeira linha na hipertensão arterial resistente, na ascite da cirrose hepática e no hiperaldosteronismo primário.",
      "Atua como antagonista competitivo dos receptores mineralocorticoides intracelulares (aldosterona) nas células principais do túbulo coletor renal, reduzindo a síntese de canais de sódio (ENaC) e da bomba Na+/K+-ATPase.",
      "Possui efeito diurético natriurético relativamente modesto, mas promove remodelamento cardíaco reverso (efeito antifibrótico miocárdico) e economiza potássio e íons hidrogênio.",
      "Diferente dos diuréticos de alça e tiazídicos, pode provocar hipercalemia potencialmente fatal (especialmente quando associada a IECA/BRA ou na doença renal crônica) e acidose metabólica hiperclorêmica.",
      "Por ter estrutura esteroidal e atuar também como antagonista de receptores androgênicos, causa frequentemente ginecomastia dolorosa, diminuição da libido e irregularidade menstrual — sendo inclusive usada off-label no tratamento de hirsutismo e acne hormonal em mulheres.",
    ],
    debriefing: {
      overview:
        "A Espironolactona é um antagonista esteroidal da aldosterona que bloqueia a reabsorção de sódio e a excreção de potássio/H+ no ducto coletor, além de inibir a fibrose miocárdica e vascular mediada pela aldosterona — sendo um dos 4 pilares que comprovadamente reduzem mortalidade na ICFER (estudo RALES).",
      clueBreakdown: [
        "Pista 1 (Indicação): Reduz mortalidade na ICFER, 4º fármaco na HAS resistente, tratamento de escolha da ascite cirrótica (hiperaldosteronismo secundário) e Síndrome de Conn.",
        "Pista 2 (Mecanismo): Bloqueia o receptor intracelular de aldosterona no ducto coletor cortical.",
        "Pista 3 (Efeito): Poupa K+ e H+ e reduz remodelamento fibroso ventricular.",
        "Pista 4 (Efeitos eletrolíticos): Risco de hipercalemia grave (monitorar K+ e creatinina, sobretudo junto de IECA/BRA).",
        "Pista 5 (Efeito antiandrogênico): Ginecomastia dolorosa em homens (efeito que NÃO ocorre com a Eplerenona, que é mais seletiva) e utilidade dermatológica no hirsutismo/SOP.",
      ],
      differentials: [
        {
          name: "Eplerenona",
          distinction:
            "Também é antagonista da aldosterona que reduz mortalidade na IC e causa hipercalemia, mas tem baixíssima afinidade por receptores androgênicos (NÃO causa ginecomastia).",
        },
        {
          name: "Amilorida",
          distinction:
            "Poupador de potássio que bloqueia diretamente o canal ENaC (sem atuar no receptor de aldosterona), sem efeito antiandrogênico e usado no Diabetes Insipidus por lítio.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. ICFER e HAS resistente: 25 a 50 mg/dia VO; Ascite cirrótica: iniciar com 100 mg/dia (frequentemente associada à furosemida na proporção 100:40 mg para manter K+ normal).\n2. Contraindicações: K+ sérico > 5,0-5,2 mEq/L ou TFG < 30 mL/min.\n3. Se surgir ginecomastia dolorosa em homens: substituir por Eplerenona.",
      pearls: [
        "Proporção clássica na ascite cirrótica: 100 mg de Espironolactona para 40 mg de Furosemida (mantém o potássio equilibrado!).",
        "Ginecomastia dolorosa com Espironolactona -> trocar por Eplerenona.",
      ],
    },
  },
  {
    id: "drug-fenitoina",
    date: "28/11/2026",
    drugName: "Fenitoína",
    acceptedSynonyms: ["fenitoina", "hidantal", "difenilhidantoina"],
    drugClass: "Anticonvulsivante (Bloqueador de Canais de Sódio)",
    difficulty: "Médio",
    clues: [
      "Anticonvulsivante clássico de segunda linha no estado de mal epiléptico (após benzodiazepínicos) e utilizado na profilaxia e tratamento de crises focais e tônico-clônicas generalizadas (mas ineficaz e contraindicado em crises de ausência).",
      "Atua bloqueando canais de sódio voltagem-dependentes no estado inativado, estabilizando a membrana neuronal e impedindo disparos repetitivos de alta frequência.",
      "Apresenta farmacocinética peculiar de 'ordem zero' (cinética de saturação / Michaelis-Menten) dentro da faixa terapêutica: pequenos aumentos na dose produzem elevações desproporcionais e tóxicas na concentração plasmática. Liga-se 90% à albumina.",
      "Seu uso crônico provoca efeitos estéticos e sistêmicos muito característicos: hiperplasia gengival, hirsutismo, espessamento dos traços faciais, osteomalácia (por indução do catabolismo da vitamina D) e anemia megaloblástica por deficiência de folato.",
      "Sua toxicidade aguda cursa com nistagmo, ataxia cerebelar e diplopia. Na emergência, sua infusão IV rápida (> 50 mg/min) pode causar hipotensão grave e arritmias pelo veículo propilenoglicol; é potente indutor do CYP450 e teratogênica (síndrome hidantoínica fetal).",
    ],
    debriefing: {
      overview:
        "A Fenitoína é um dos anticonvulsivantes mais cobrados em provas de farmacologia e neurologia devido à sua cinética de eliminação saturável (ordem zero), alta ligação à albumina (exigindo correção pela fórmula de Sheiner-Tozer na hipoalbuminemia) e seu perfil clássico de efeitos adversos crônicos e cerebelares.",
      clueBreakdown: [
        "Pista 1 (Indicação): Segunda linha no Estado de Mal Epiléptico (ataque 15-20 mg/kg IV após diazepam/midazolam) e crises focais/tônico-clônicas.",
        "Pista 2 (Mecanismo): Prolonga o estado inativado dos canais de Na+ voltagem-dependentes.",
        "Pista 3 (Farmacocinética): Cinética de ordem zero (eliminação saturável) -> risco alto de intoxicação com pequenos ajustes; 90% ligada à albumina.",
        "Pista 4 (Efeitos crônicos): Hiperplasia gengival (clássico!), hirsutismo, deficiência de ácido fólico e osteomalácia.",
        "Pista 5 (Toxicidade aguda/Infusão): Síndrome cerebelar (nistagmo, ataxia, disartria); infundir no máximo a 50 mg/min em SF 0,9% (precipita em soro glicosado!) pelo risco de arritmia/hipotensão.",
      ],
      differentials: [
        {
          name: "Carbamazepina",
          distinction:
            "Também bloqueia canais de Na+ e induz CYP450, mas é primeira linha na neuralgia do trigêmeo e cursa com hiponatremia (SIADH) e agranulocitose (sem hiperplasia gengival).",
        },
        {
          name: "Etossuximida",
          distinction:
            "Bloqueia canais de cálcio tipo T no tálamo e é primeira linha nas crises de ausência (onde a fenitoína pode até piorar as crises).",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Estado de Mal Epiléptico: Ataque de 15 a 20 mg/kg IV diluído EXCLUSIVAMENTE em SF 0,9% (NUNCA em soro glicosado, pois precipita!), velocidade máxima de 50 mg/min com monitorização cardíaca.\n2. Na hipoalbuminemia (idosos, cirróticos, UTI), corrigir o nível sérico de fenitoína ou dosar a fração livre.",
      pearls: [
        "NUNCA dilua Fenitoína em soro glicosado (ela precipita no equipo!) — usar sempre SF 0,9% e infundir ≤ 50 mg/min.",
        "Hiperplasia gengival + Nistagmo/Ataxia + Cinética de ordem zero = Fenitoína!",
      ],
    },
  },
  {
    id: "drug-heparina",
    date: "29/11/2026",
    drugName: "Heparina não fracionada",
    acceptedSynonyms: ["heparina", "heparina nao fracionada", "hnf", "liquemine"],
    drugClass: "Anticoagulante Parenteral",
    difficulty: "Fácil",
    clues: [
      "Anticoagulante parenteral de ação imediata utilizado em síndromes coronarianas agudas, tromboembolismo pulmonar maciço, circulação extracorpórea e pacientes com insuficiência renal grave (ClCr < 30 mL/min) que necessitam de anticoagulação plena.",
      "Não possui atividade anticoagulante direta por si só: liga-se à Antitrombina III provocando mudança conformacional que acelera em cerca de 1.000 vezes a inativação da trombina (Fator IIa) e do Fator Xa.",
      "Administrada por via intravenosa contínua ou subcutânea, não atravessa a barreira placentária (sendo segura na gestação) e possui meia-vida muito curta (~60 a 90 minutos), sendo eliminada pelo sistema reticuloendotelial e não dependendo da função renal.",
      "Seu efeito é monitorado continuamente pelo Tempo de Tromboplastina Parcial Ativada (TTPA). Uma complicação imunomediada grave e paradoxalmente pró-trombótica é a plaquetopenia induzida por anticorpos anti-PF4 (HIT), que exige suspensão imediata e troca para anticoagulante não-heparínico.",
      "Em caso de sangramento grave ou ao término de cirurgias cardíacas, seu efeito anticoagulante é revertido de forma completa e imediata pela administração intravenosa de Sulfato de Protamina (1 mg para cada 100 UI de heparina).",
    ],
    debriefing: {
      overview:
        "A Heparina Não Fracionada (HNF) é um glicosaminoglicano aniônico de ação imediata que potencializa a Antitrombina III contra os fatores IIa (trombina) e Xa. Por ter meia-vida curta, reversão total com protamina e independência da excreção renal, é a escolha preferencial em pacientes críticos, com alto risco de sangramento ou com insuficiência renal avançada.",
      clueBreakdown: [
        "Pista 1 (Indicação): Anticoagulação imediata na DRC grave (ClCr < 30, onde a enoxaparina acumula), cirurgia cardíaca com CEC e emergências trombóticas.",
        "Pista 2 (Mecanismo): Cofator da Antitrombina III -> inativa igualmente Trombina (IIa) e Fator Xa.",
        "Pista 3 (Farmacocinética): Meia-vida curta (1-1,5h), eliminação independente dos rins e não atravessa a placenta.",
        "Pista 4 (Monitoramento/HIT): Controlada pelo TTPA (meta 1,5-2,5x o basal); risco de Trombocitopenia Induzida por Heparina (HIT tipo II por anticorpos IgG contra complexo heparina-fator plaquetário 4, causando trombose venosa/arterial catastrófica!).",
        "Pista 5 (Antídoto): Sulfato de Protamina IV (proteína carregada positivamente que neutraliza instantaneamente a heparina aniônica: 1 mg neutraliza 100 UI).",
      ],
      differentials: [
        {
          name: "Enoxaparina (Heparina de Baixo Peso Molecular)",
          distinction:
            "Atua predominantemente sobre o Fator Xa, não precisa de controle de TTPA, tem menor risco de HIT, porém acumula na insuficiência renal grave (ClCr < 30) e tem reversão apenas parcial pela protamina.",
        },
        {
          name: "Varfarina",
          distinction:
            "Uso oral, início lento (3-5 dias), monitorada pelo RNI, teratogênica e revertida por Vitamina K + Complexo Protrombínico.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Monitorar TTPA a cada 6 horas durante infusão IV contínua até estabilização na faixa terapêutica.\n2. Suspeita de HIT (queda de plaquetas > 50% entre o 5º e 10º dia + trombose): suspender IMEDIATAMENTE toda heparina (incluindo enoxaparina e flush de cateter!) e iniciar anticoagulante direto (argatroban, bivalirudina ou fondaparinux).\n3. Reversão de sangramento: Sulfato de Protamina 1 mg IV para cada 100 UI de HNF infundida nas últimas 2 horas.",
      pearls: [
        "Antídoto da Heparina = Sulfato de Protamina (1 mg para cada 100 UI).",
        "Na HIT (Trombocitopenia Induzida por Heparina), o paciente tem plaquetopenia mas o risco letal é TROMBOSE (não transfundir plaquetas e trocar para anticoagulante não-heparínico!).",
      ],
    },
  },
  {
    id: "drug-atropina",
    date: "30/11/2026",
    drugName: "Atropina",
    acceptedSynonyms: ["atropina", "sulfato de atropina"],
    drugClass: "Anticolinérgico (Antagonista Muscarínico)",
    difficulty: "Fácil",
    clues: [
      "Fármaco de primeira linha no protocolo ACLS para o tratamento de bradicardias sintomáticas (com instabilidade hemodinâmica) e antídoto vital na emergência toxicológica contra síndrome colinérgica aguda.",
      "É um alcaloide derivado da planta Atropa belladonna que atua como antagonista competitivo reversível dos receptores colinérgicos muscarínicos (M1 a M5) no coração, músculo liso, glândulas exócrinas e sistema nervoso central.",
      "Bloqueia a ação do nervo vago sobre os nós sinoatrial e atrioventricular (aumentando a frequência cardíaca e a condução AV), mas NÃO possui efeito sobre receptores nicotínicos da junção neuromuscular.",
      "Em doses excessivas, produz a clássica síndrome anticolinérgica ('cego como um morcego, quente como uma lebre, vermelho como uma beterraba, seco como um osso e louco como um chapeleiro'): midríase, pele seca e ruborizada, hipertermia, retenção urinária, íleo paralítico e delírio.",
      "Na intoxicação por organofosforados e carbamatos, é administrada em doses crescentes repetidas até secar completamente a broncorreia (atropinização). É contraindicada no glaucoma de ângulo fechado e ineficaz em bloqueios AV infranodais (Mobitz II e BAVT com QRS largo).",
    ],
    debriefing: {
      overview:
        "A Atropina é o antagonista muscarínico prototípico, bloqueando as ações parassimpáticas mediadas pela acetilcolina. Na emergência, salva vidas tanto na bradicardia sintomática (dose ACLS atualizada: 1 mg IV a cada 3-5 min, máximo 3 mg) quanto na reversão da broncorreia letal das intoxicações por anticolinesterásicos.",
      clueBreakdown: [
        "Pista 1 (Indicação): 1ª linha na bradicardia sintomática instável e antídoto muscarínico na síndrome colinérgica.",
        "Pista 2 (Mecanismo): Antagonista competitivo dos receptores muscarínicos (M1-M5).",
        "Pista 3 (Fisiologia): Aumenta automatismo do nó SA e condução no nó AV; não atua em receptores nicotínicos (por isso não reverte fasciculações/fraqueza muscular nos organofosforados — papel da pralidoxima).",
        "Pista 4 (Síndrome anticolinérgica): Midríase + cicloplegia, anidrose/pele seca e ruborizada, hipertermia, taquicardia, bexigoma e agitação/delírio (antídoto da intoxicação anticolinérgica grave: Fisostigmina).",
        "Pista 5 (Aplicações/Limites): Meta na intoxicação por organofosforados é secar secreções pulmonares; não funciona em BAV de 2º grau Mobitz II nem BAVT infranodal (que exigem marca-passo).",
      ],
      differentials: [
        {
          name: "Adrenalina (Epinefrina)",
          distinction:
            "Agonista adrenérgico alfa e beta usada na parada cardiorrespiratória, anafilaxia e como segunda linha em bradicardia refratária à atropina.",
        },
        {
          name: "Escopolamina (Butilbrometo / Buscopan)",
          distinction:
            "Também antimuscarínico, usado como antiespasmódico abdominal e para cinetose, sem indicação em bradicardia de emergência.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Bradicardia sintomática (ACLS): 1 mg IV em bolus a cada 3-5 minutos (dose máxima total: 3 mg).\n2. Intoxicação por organofosforados/carbamatos: 1 a 5 mg IV, dobrando a dose a cada 3-5 min até ausculta pulmonar limpa (sem limite máximo fixo!).\n3. Intoxicação anticolinérgica central grave (delírio agitado): Fisostigmina IV.",
      pearls: [
        "Dose atual de Atropina na bradicardia pelo ACLS: 1 mg IV (máximo 3 mg).",
        "Em BAV de 2º grau Mobitz II e BAVT com QRS largo, NÃO perca tempo com Atropina — prepare marca-passo transcutâneo!",
      ],
    },
  },
  {
    id: "drug-propranolol",
    date: "01/12/2026",
    drugName: "Propranolol",
    acceptedSynonyms: ["propranolol", "cloridrato de propranolol", "inderal"],
    drugClass: "Betabloqueador Não Seletivo (Beta-1 e Beta-2)",
    difficulty: "Fácil",
    clues: [
      "Fármaco versátil amplamente prescrito na profilaxia da enxaqueca, no tremor essencial benigno, na prevenção primária e secundária de sangramento por varizes esofágicas na cirrose e no controle sintomático da tempestade tireoidiana.",
      "Atua como antagonista competitivo não seletivo dos receptores beta-adrenérgicos (bloqueando tanto receptores beta-1 cardíacos quanto receptores beta-2 bronquiais, vasculares e hepáticos).",
      "Possui altíssima lipossolubilidade (atravessando facilmente a barreira hematoencefálica, o que explica sua eficácia na enxaqueca, no tremor essencial e na ansiedade de desempenho) e intenso metabolismo de primeira passagem hepática.",
      "Por bloquear receptores beta-2 nos brônquios e no fígado, é contraindicado em pacientes com asma (risco de broncoespasmo grave) e pode mascarar os sinais adrenérgicos de alerta da hipoglicemia (como taquicardia e tremores) em pacientes diabéticos.",
      "Na crise tireotóxica, além de controlar a taquicardia, inibe a conversão periférica de T4 em T3. Nunca deve ser iniciado isoladamente em pacientes com feocromocitoma (risco de crise hipertensiva por vasoconstrição alfa-1 sem oposição). Em superdosagem grave, o antídoto de escolha é o Glucagon IV.",
    ],
    debriefing: {
      overview:
        "O Propranolol é o betabloqueador não seletivo (β1 e β2) mais emblemático da farmacologia. Sua lipofilicidade permite penetração no SNC, e o bloqueio β2 periférico explica tanto indicações únicas (redução da pressão portal por vasoconstrição esplâncnica na cirrose, inibição da 5'-desiodase no hipertireoidismo) quanto contraindicações clássicas (asma).",
      clueBreakdown: [
        "Pista 1 (Indicações): Profilaxia de enxaqueca, tremor essencial, hipertensão portal/varizes esofágicas e crise tireotóxica.",
        "Pista 2 (Mecanismo): Bloqueio não seletivo β1 (↓FC, ↓contratilidade, ↓renina) e β2 (vasoconstrição esplâncnica e broncoconstrição).",
        "Pista 3 (Farmacocinética): Muito lipofílico (cruza barreira hematoencefálica) e alto efeito de primeira passagem no fígado.",
        "Pista 4 (Contraindicações/Riscos): Contraindicado na asma (broncoespasmo via β2); mascara sintomas simpáticos da hipoglicemia (mantém apenas a sudorese, que é colinérgica!).",
        "Pista 5 (Pérolas/Antídoto): Inibe conversão periférica de T4 → T3; proibido sem alfa-bloqueio prévio no feocromocitoma; intoxicação por betabloqueadores é tratada com Glucagon IV (ativa adenilato ciclase independentemente do receptor beta).",
      ],
      differentials: [
        {
          name: "Metoprolol / Bisoprolol / Atenolol",
          distinction:
            "Betabloqueadores cardiosseletivos (β1-seletivos), preferidos na ICFER (metoprolol succinato, bisoprolol) e mais seguros em pneumopatas, mas sem ação β2 na hipertensão portal.",
        },
        {
          name: "Carvedilol",
          distinction:
            "Bloqueador β1, β2 e também ALFA-1 (vasodilatador), muito usado na ICFER e também na hipertensão portal, reduzindo mais a pressão arterial.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Hipertensão portal / varizes esofágicas: titular dose até atingir FC de 55-60 bpm (mantendo PAS ≥ 90 mmHg).\n2. Intoxicação grave por betabloqueadores (bradicardia + choque refratário): Glucagon IV em bolus seguido de infusão contínua (e insulina em altas doses + glicose).\n3. Nunca suspender abruptamente em coronariopatas (risco de angina rebote/IAM).",
      pearls: [
        "Na hipoglicemia em paciente usando Propranolol, o único sintoma de alerta preservado é a SUDORESE (pois as glândulas sudoríparas são inervadas por fibras colinérgicas muscarínicas!).",
        "Antídoto da intoxicação grave por Betabloqueadores = Glucagon IV.",
      ],
    },
  },
  {
    id: "drug-haloperidol",
    date: "02/12/2026",
    drugName: "Haloperidol",
    acceptedSynonyms: ["haloperidol", "haldol"],
    drugClass: "Antipsicótico Típico (1ª Geração) de Alta Potência",
    difficulty: "Médio",
    clues: [
      "Antipsicótico de primeira geração (butirofenona) amplamente utilizado no pronto-socorro para controle rápido da agitação psicomotora grave, no delirium hiperativo em ambiente hospitalar e no tratamento da esquizofrenia.",
      "Atua predominantemente como antagonista potente e seletivo dos receptores dopaminérgicos D2 na via mesolímbica (reduzindo sintomas positivos como alucinações e delírios), apresentando mínimos efeitos anticolinérgicos ou anti-histamínicos.",
      "Disponível em formulações oral, intramuscular/intravenosa de ação rápida e decanoato de depósito (injeção mensal para pacientes com baixa adesão terapêutica).",
      "Por bloquear intensamente a dopamina na via nigroestriatal e tuberoinfundibular, apresenta altíssimo risco de sintomas extrapiramidais (distonia aguda como crise oculógira, acatisia, parkinsonismo medicamentoso e discinesia tardia) e hiperprolactinemia.",
      "Sua complicação mais temida e potencialmente fatal é a Síndrome Neuroléptica Maligna (febre alta, rigidez muscular 'em cano de chumbo', disautonomia e CPK muito elevada), tratada com suspensão imediata, suporte e Dantroleno ou Bromocriptina. Também pode prolongar o intervalo QT.",
    ],
    debriefing: {
      overview:
        "O Haloperidol é o protótipo dos antipsicóticos típicos (1ª geração) de alta potência. Sua alta afinidade por receptores D2 explica sua grande eficácia em sintomas psicóticos agudos e delirium, mas também seu elevado perfil de efeitos extrapiramidais e o risco de Síndrome Neuroléptica Maligna.",
      clueBreakdown: [
        "Pista 1 (Indicação): Agitação psicomotora aguda, delirium hiperativo e sintomas positivos da esquizofrenia.",
        "Pista 2 (Mecanismo): Bloqueio D2 potente na via mesolímbica (com pouca sedação anti-H1 e pouca hipotensão ortostática alfa-1 comparado à clorpromazina).",
        "Pista 3 (Formas): VO, IM/IV e Decanoato de Haloperidol IM de longa ação.",
        "Pista 4 (Efeitos adversos): Sintomas extrapiramidais — Distonia aguda (tratada com Biperideno/Prometazina), Acatisia (Propranolol/Benzodiazepínico), Parkinsonismo (Biperideno) e Discinesia tardia (irreversível por supersensibilidade D2) + Galactorreia/amenorreia (bloqueio D2 tuberoinfundibular).",
        "Pista 5 (Emergência): Síndrome Neuroléptica Maligna (rigidez em cano de chumbo + hipertermia + rabdomiólise/CPK altíssima) -> Dantroleno (relaxante muscular que bloqueia RYR1) ou Bromocriptina (agonista D2).",
      ],
      differentials: [
        {
          name: "Clozapina",
          distinction:
            "Antipsicótico atípico padrão-ouro na esquizofrenia refratária, praticamente SEM efeitos extrapiramidais, mas com risco grave de AGRANULOCITOSE (exige hemograma periódico) e miocardite.",
        },
        {
          name: "Clorpromazina",
          distinction:
            "Antipsicótico típico de BAIXA potência: causa menos sintomas extrapiramidais que o haloperidol, mas causa intensa sedação, hipotensão ortostática e efeitos anticolinérgicos.",
        },
      ],
      clinicalUseAndMonitoring:
        "1. Distonia aguda (torcicolo espasmódico, crise oculógira): Biperideno 5 mg IM/IV ou Prometazina IM.\n2. Acatisia (inquietação motora incontrolável): Reduzir dose e usar Propranolol ou Benzodiazepínico.\n3. Síndrome Neuroléptica Maligna: Suspender antipsicótico, resfriamento ativo, hidratação vigorosa (prevenir IRA por rabdomiólise) + Dantroleno IV e/ou Bromocriptina VO.",
      pearls: [
        "Síndrome Neuroléptica Maligna (antipsicóticos) = rigidez em CANO DE CHUMBO + bradicinesia/hiporreflexia; Síndrome Serotoninérgica (ISRS) = CLÔNUS + hiperreflexia!",
        "Distonia aguda por Haloperidol -> reverte rapidamente com Biperideno.",
      ],
    },
  },
];

export const MEDICAL_DRUGS_CATALOG: string[] = Array.from(
  new Set([
    ...BUILTIN_PROGRESSIVE_DRUGS.map((d) => d.drugName),
    "Ácido acetilsalicílico (AAS)",
    "Ácido tranexâmico",
    "Ácido valproico (Valproato de sódio)",
    "Aciclovir",
    "Adenosina",
    "Adrenalina (Epinefrina)",
    "Albendazol",
    "Alendronato de sódio",
    "Alopurinol",
    "Alprazolam",
    "Alteplase (rt-PA)",
    "Amicacina",
    "Amilorida",
    "Amiodarona",
    "Amitriptilina",
    "Amoxicilina + Clavulanato",
    "Anfotericina B",
    "Anlodipino",
    "Apixabana",
    "Atenolol",
    "Atorvastatina",
    "Atropina",
    "Azatioprina",
    "Azitromicina",
    "Baclofeno",
    "Beclometasona",
    "Biperideno",
    "Bisoprolol",
    "Bromocriptina",
    "Budesonida",
    "Bupropiona",
    "Captopril",
    "Carbamazepina",
    "Carvedilol",
    "Cefalexina",
    "Cefazolina",
    "Cefepima",
    "Ceftazidima",
    "Ceftriaxona",
    "Celecoxibe",
    "Cetamina",
    "Ciclofosfamida",
    "Ciclosporina",
    "Ciprofloxacino",
    "Citalopram",
    "Claritromicina",
    "Clindamicina",
    "Clonazepam",
    "Clonidina",
    "Clopidogrel",
    "Cloroquina",
    "Clorpromazina",
    "Clortalidona",
    "Clozapina",
    "Codeína",
    "Colchicina",
    "Dabigatrana",
    "Dantroleno",
    "Dapagliflozina",
    "Daptomicina",
    "Dexametasona",
    "Diazepam",
    "Diclofenaco",
    "Digoxina",
    "Diltiazem",
    "Dipirona",
    "Dobutamina",
    "Dopamina",
    "Doxazosina",
    "Doxiciclina",
    "Duloxetina",
    "Empagliflozina",
    "Enalapril",
    "Enoxaparina",
    "Eplerenona",
    "Eritromicina",
    "Ertapenem",
    "Escitalopram",
    "Escopolamina",
    "Esmolol",
    "Espironolactona",
    "Etambutol",
    "Etossuximida",
    "Ezetimiba",
    "Fenitoína",
    "Fenobarbital",
    "Fentanil",
    "Finasterida",
    "Fisostigmina",
    "Fluconazol",
    "Flumazenil",
    "Fluoxetina",
    "Furosemida",
    "Gabapentina",
    "Gentamicina",
    "Glibenclamida",
    "Gliclazida",
    "Glucagon",
    "Haloperidol",
    "Heparina não fracionada",
    "Hidralazina",
    "Hidroclorotiazida",
    "Hidrocortisona",
    "Hidroxicloroquina",
    "Ibuprofeno",
    "Imipenem",
    "Indometacina",
    "Infliximabe",
    "Insulina Glargina",
    "Insulina NPH",
    "Insulina Regular",
    "Ipratrópio",
    "Isoniazida",
    "Isossorbida (Mononitrato / Dinitrato)",
    "Itraconazol",
    "Ivermectina",
    "Lactulose",
    "Lamotrigina",
    "Levetiracetam",
    "Levodopa + Carbidopa",
    "Levofloxacino",
    "Levotiroxina",
    "Lidocaína",
    "Linezolida",
    "Liraglutida",
    "Lítio",
    "Lorazepam",
    "Losartana",
    "Manitol",
    "Meropenem",
    "Metformina",
    "Metildopa",
    "Metilprednisolona",
    "Metimazol",
    "Metoclopramida",
    "Metoprolol",
    "Metotrexato",
    "Metronidazol",
    "Micofenolato de mofetila",
    "Midazolam",
    "Morfina",
    "N-acetilcisteína",
    "Naloxona",
    "Naproxeno",
    "Nifedipino",
    "Nitrofurantoína",
    "Nitroglicerina",
    "Nitroprussiato de sódio",
    "Noradrenalina (Norepinefrina)",
    "Olanzapina",
    "Omeprazol",
    "Ondansetrona",
    "Oseltamivir",
    "Oxacilina",
    "Paracetamol (Acetaminofeno)",
    "Penicilina G Benzatina",
    "Penicilina G Cristalina",
    "Pioglitazona",
    "Piperacilina + Tazobactam",
    "Pirazinamida",
    "Piridoxina (Vitamina B6)",
    "Polimixina B",
    "Pralidoxima",
    "Prednisona",
    "Pregabalina",
    "Prometazina",
    "Propafenona",
    "Propiltiouracil (PTU)",
    "Propofol",
    "Propranolol",
    "Protamina (Sulfato de protamina)",
    "Quetiapina",
    "Rifampicina",
    "Risperidona",
    "Rituximabe",
    "Rivaroxabana",
    "Rocurônio",
    "Rosuvastatina",
    "Sacubitril + Valsartana",
    "Salbutamol",
    "Semaglutida",
    "Sertralina",
    "Sildenafila",
    "Sinvastatina",
    "Sotalol",
    "Succinilcolina",
    "Sulfametoxazol + Trimetoprima",
    "Sulfato de magnésio",
    "Sumatriptana",
    "Tacrolimo",
    "Tamoxifeno",
    "Tansulosina",
    "Tenofovir",
    "Ticagrelor",
    "Topiramato",
    "Tramadol",
    "Vancomicina",
    "Varfarina",
    "Vasopressina",
    "Venlafaxina",
    "Verapamil",
    "Vitamina K (Fitomenadiona)",
    "Voriconazol",
  ])
).sort((a, b) => a.localeCompare(b, "pt-BR"));

export function isDrugMatch(
  guess: string,
  targetCase: ProgressiveDrugCase
): boolean {
  const normGuess = normalizeDiagnosisString(guess);
  if (!normGuess) return false;

  const candidates = [
    targetCase.drugName,
    ...(targetCase.acceptedSynonyms || []),
  ].map(normalizeDiagnosisString);

  for (const cand of candidates) {
    if (!cand) continue;
    if (normGuess === cand) return true;
    if (normGuess.length >= 5 && cand.length >= 5) {
      if (normGuess.includes(cand) || cand.includes(normGuess)) {
        return true;
      }
    }
  }
  return false;
}

export function getDailyDrugCase(dateOverride?: string): ProgressiveDrugCase {
  const dateStr = dateOverride || getTodayFormattedDate();
  const dateKey = dateOverride ? dateOverride.replace(/\//g, "-") : getTodayKey();

  let hash = 7;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 37 + dateKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % BUILTIN_PROGRESSIVE_DRUGS.length;
  const selected =
    BUILTIN_PROGRESSIVE_DRUGS[index] || BUILTIN_PROGRESSIVE_DRUGS[0];

  return {
    ...selected,
    id: `daily-drug-${dateKey}`,
    date: dateStr,
  };
}
