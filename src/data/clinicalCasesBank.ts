export interface ProgressiveClinicalCase {
  id: string;
  caseNumber: number;
  date: string;
  diagnosis: string;
  acceptedSynonyms: string[];
  specialty: string;
  difficulty: "Fácil" | "Médio" | "Difícil";
  sourceLabel?: string;
  clues: [string, string, string, string, string]; // [Vinheta clínica, Pista 2/5, Pista 3/5, Pista 4/5, Pista 5/5]
  debriefing: {
    overview: string;
    clueBreakdown: [string, string, string, string, string];
    differentials: Array<{
      name: string;
      distinction: string;
    }>;
    management: string;
    pearls: string[];
  };
}

export const BUILTIN_PROGRESSIVE_CASES: ProgressiveClinicalCase[] = [
  {
    id: "case-202-crotalico",
    caseNumber: 202,
    date: "16/11/2026",
    diagnosis: "Acidente crotálico",
    acceptedSynonyms: [
      "acidente crotalico",
      "ofidismo crotalico",
      "picada de cascavel",
      "envenenamento crotalico",
      "acidente por crotalus",
    ],
    specialty: "Emergência / Toxicologia",
    difficulty: "Médio",
    clues: [
      "Trabalhador rural de 45 anos é trazido ao pronto-socorro com queixa de visão dupla, 'pálpebras pesadas' e urina muito escura há 6 horas.",
      "Ele relata que estava roçando o pasto quando sentiu uma fisgada rápida na panturrilha direita, mas não conseguiu ver o animal que o atingiu. Diferente do que imaginava, o local da picada doeu muito pouco inicialmente e quase não inchou. Algumas horas depois, começou a apresentar dor muscular generalizada intensa (mialgia), dificuldade para manter os olhos abertos e notou que sua urina estava avermelhada, com 'cor de café'.",
      "No pronto-socorro: PA 140x90 mmHg, FC 88 bpm. O paciente apresenta clássica 'fácies miastênica' (fácies de Rosenfeld), caracterizada por ptose palpebral bilateral acentuada, oftalmoplegia e flacidez da musculatura da face. O exame da panturrilha direita revela apenas dois pequenos orifícios de puntura, sem qualquer edema significativo, vermelhidão, calor ou bolhas. Há dor à palpação de grandes grupos musculares.",
      "Exames laboratoriais: CPK 25.000 U/L (referência: 39 a 308 U/L), LDH 1.450 U/L (referência: 140 a 282 U/L), AST 380 U/L (referência: 10 a 40 U/L), creatinina 2,1 mg/dL (referência: 0,7 a 1,2 mg/dL). Tempo de coagulação (TC): incoagulável (referência: 4 a 10 minutos). Urina tipo 1: fita reagente 4+ para sangue (referência: negativo), com sedimento urinário mostrando 2 hemácias por campo (referência: até 3 hemácias por campo).",
      "Diante da gravidade do quadro e do alto risco de insuficiência renal aguda, o paciente foi monitorizado na sala de emergência. A conduta instituída envolveu a infusão intravenosa imediata de 20 ampolas do soro específico e o início de hidratação venosa vigorosa contínua com cristaloides para forçar a diurese. Após 48 horas, o paciente evoluiu com clareamento progressivo da urina e regressão das queixas oculares.",
    ],
    debriefing: {
      overview:
        "O acidente crotálico (causado por serpentes do gênero Crotalus — cascavel) caracteriza-se pela combinação clássica de três ações principais da peçonha (principalmente a crotoxina): ação neurotóxica pré-sináptica (inibindo a liberação de acetilcolina na junção neuromuscular), ação miotóxica sistêmica (rabdomiólise maciça com mioglobinúria e nefrotoxicidade direta/indireta) e ação coagulante tipo trombina (consumo de fibrinogênio com incoagulabilidade sanguínea, geralmente sem sangramentos exuberantes), associadas à ausência quase total de reação inflamatória no local da picada.",
      clueBreakdown: [
        "Vinheta clínica: A tríade clássica de diplopia, ptose ('pálpebras pesadas') e colúria/mioglobinúria ('urina escura') em trabalhador rural levanta imediatamente a suspeita de envenenamento ofídico neurotóxico e miotóxico.",
        "Pista 2/5: Picada no campo com mínima dor ou edema local exclui a maioria dos acidentes botrópicos e laquéticos (que têm intensa ação proteolítica/inflamatória local) e reforça acidente crotálico ou elapídico; a mialgia intensa e a urina 'cor de café' apontam para rabdomiólise (típica do crotálico).",
        "Pista 3/5: A fácies miastênica de Rosenfeld (ptose palpebral bilateral, oftalmoplegia e apagamento dos sulcos faciais) somada à ausência de flogose nos orifícios de puntura e dor muscular difusa sela o diagnóstico sindrômico.",
        "Pista 4/5: CPK extremamente elevada (25.000 U/L), LDH e AST altos confirmam rabdomiólise grave. A dissociação na Urina 1 (fita reagente 4+ para heme com apenas 2 hemácias/campo) comprova mioglobinúria, que levou à lesão renal aguda (Cr 2,1 mg/dL). O TC incoagulável decorre da fração tipo-trombina da peçonha.",
        "Pista 5/5: A administração de 20 ampolas IV de Soro Anticrotálico (SAC) classifica o caso como acidente crotálico GRAVE (fácies miastênica evidente + mialgia intensa + urina escura/oligúria ou IRA), associada à hidratação vigorosa para prevenir necrose tubular aguda por cilindros de mioglobina.",
      ],
      differentials: [
        {
          name: "Acidente elapídico (Micrurus / coral-verdadeira)",
          distinction:
            "Também cursa com fácies miastênica (ptose, diplopia) e pouca reação local, mas NÃO causa rabdomiólise maciça (CPK de 25.000 e urina cor de café) nem incoagulabilidade sanguínea.",
        },
        {
          name: "Acidente botrópico (jararaca)",
          distinction:
            "Apresenta intensa reação inflamatória local (dor, edema duro, equimose, bolhas e necrose), sem ação neurotóxica (sem fácies miastênica).",
        },
        {
          name: "Miastenia Gravis / Botulismo",
          distinction:
            "Causam ptose e diplopia, mas não apresentam história de picada aguda, rabdomiólise fulminante com mioglobinúria nem tempo de coagulação incoagulável.",
        },
      ],
      management:
        "1. Soroterapia específica imediata: Soro Anticrotálico (SAC) intravenoso em dose única conforme gravidade — Leve: 5 ampolas; Moderado: 10 ampolas; Grave (como neste caso): 20 ampolas IV.\n2. Hidratação venosa vigorosa com SF 0,9% para manter débito urinário > 1 a 2 mL/kg/h (ou 100-200 mL/h no adulto).\n3. Alcalinização urinária com bicarbonato de sódio (visando pH urinário > 6,5) e manitol/furosemida podem ser considerados após expansão volêmica para reduzir a precipitação intratubular de mioglobina.\n4. Monitoramento seriado de função renal, potássio (risco de hipercalemia pela rabdomiólise), CPK e diurese.",
      pearls: [
        "No acidente crotálico: 'Pouco local, muito sistêmico' (neurotóxico + miotóxico + coagulante).",
        "Fita urinária positiva para sangue (4+) sem hemácias no sedimento = Mioglobinúria (rabdomiólise) ou Hemoglobinúria.",
        "Principal causa de óbito no acidente crotálico: Insuficiência Renal Aguda (Necrose Tubular Aguda por mioglobina).",
      ],
    },
  },
  {
    id: "case-203-disseccao-aortica",
    caseNumber: 203,
    date: "17/11/2026",
    diagnosis: "Dissecção aguda de aorta",
    acceptedSynonyms: [
      "disseccao de aorta",
      "disseccao aortica",
      "disseccao aguda da aorta",
      "sindrome aortica aguda",
      "disseccao de aorta stanford a",
    ],
    specialty: "Cardiologia / Emergência",
    difficulty: "Médio",
    clues: [
      "Homem de 62 anos chega à emergência com dor torácica súbita, lancinante, de intensidade máxima desde o primeiro segundo, irradiada para a região interescapular há 45 minutos.",
      "O paciente é hipertenso de longa data com má adesão medicamentosa. Relata que a dor começou abruptamente enquanto levantava uma caixa pesada, descrita como uma sensação de 'rasgo' no peito que migrou para as costas, acompanhada de sudorese fria e tontura. Nega dispneia progressiva prévia ou tosse.",
      "Exame físico: PA no membro superior direito 195x110 mmHg e no membro superior esquerdo 145x85 mmHg; FC 104 bpm; SpO2 97%. Ausculta cardíaca revela sopro diastólico aspirativo 2+/6+ em foco aórtico acessório. Pulso radial esquerdo diminuído em amplitude em relação ao direito. Ausculta pulmonar limpa.",
      "ECG de 12 derivações mostra sobrecarga ventricular esquerda, sem supradesnivelamento do segmento ST. Troponina ultrassensível: 16 ng/L (referência: < 14 ng/L); D-dímero: 4.850 ng/mL (referência: < 500 ng/mL). Radiografia de tórax no leito evidencia alargamento acentuado do mediastino superior (> 8 cm) e sinal do botão aórtico duplo (sinal do cálcio).",
      "Iniciou-se imediatamente infusão venosa contínua de esmolol visando reduzir a frequência cardíaca para < 60 bpm, seguida de nitroprussiato de sódio para manter a PAS entre 100 e 120 mmHg. A angiotomografia computadorizada de tórax confirmou lâmina intimal (flap) separando a luz verdadeira da luz falsa desde a raiz ascendente, sendo o paciente encaminhado de urgência ao centro cirúrgico.",
    ],
    debriefing: {
      overview:
        "A dissecção aguda de aorta resulta de uma laceração na camada íntima arterial, permitindo que o sangue penetre na camada média sob pressão e crie uma falsa luz. Quando envolve a aorta ascendente (Stanford tipo A / DeBakey I e II), constitui emergência cirúrgica imediata pelo risco de tamponamento cardíaco, insuficiência aórtica aguda e oclusão de coronárias ou ramos supra-aórticos.",
      clueBreakdown: [
        "Vinheta clínica: Dor torácica súbita, 'rasgante/lancinante', com intensidade máxima desde o início (diferente da dor anginosa que cresce gradualmente) e irradiação interescapular é a apresentação clássica.",
        "Pista 2/5: Hipertensão arterial sistêmica mal controlada associada a esforço isométrico (manobra de Valsalva) é o principal fator desencadeante da delaminação intimal.",
        "Pista 3/5: Assimetria de pressão arterial (> 20 mmHg entre os membros superiores), assimetria de pulsos e sopro diastólico de regurgitação aórtica aguda (por extensão retrógrada até a valva aórtica) são achados físicos patognomônicos.",
        "Pista 4/5: ECG sem supra de ST afasta IAM clássico imediato; D-dímero muito elevado e radiografia com alargamento mediastinal + sinal do cálcio (separação > 1 cm entre a calcificação intimal e a borda externa da aorta) reforçam a hipótese.",
        "Pista 5/5: O controle anti-impulso (betabloqueador IV ANTES do vasodilatador para evitar taquicardia reflexa e aumento do dP/dt) seguido de angiotomografia confirmando flap intimal na aorta ascendente (Stanford A) indica correção cirúrgica imediata.",
      ],
      differentials: [
        {
          name: "Infarto agudo do miocárdio (IAM)",
          distinction:
            "Dor geralmente em aperto, progressiva, com alterações isquêmicas dinâmicas no ECG e curva de troponina acentuada; atenção que a dissecção Stanford A pode dissecar o óstio da coronária direita.",
        },
        {
          name: "Tromboembolismo pulmonar (TEP)",
          distinction:
            "Predomina dispneia súbita, taquipneia e hipoxemia, sem assimetria de pulsos/PA ou alargamento mediastinal com flap intimal.",
        },
      ],
      management:
        "1. Terapia anti-impulso imediata: Betabloqueador venoso (Esmolol ou Labetalol) para atingir FC < 60 bpm, reduzindo o estresse de cisalhamento na parede aórtica (dP/dt).\n2. Após bloqueio beta, associar Nitroprussiato de Sódio IV se PAS permanecer > 120 mmHg (meta: PAS 100-120 mmHg).\n3. Analgesia potente com morfina IV.\n4. Stanford A (envolve aorta ascendente): Cirurgia cardiotorácica de emergência.\n5. Stanford B (apenas aorta descendente, distal à subclávia esquerda): Tratamento clínico ou TEVAR se complicada.",
      pearls: [
        "NUNCA inicie nitroprussiato isolado antes do betabloqueador na dissecção aórtica (causa taquicardia reflexa e aumenta a força de cisalhamento).",
        "Anticoagulação e trombólise são absolutamente contraindicadas (podem ser fatais).",
      ],
    },
  },
  {
    id: "case-204-feocromocitoma",
    caseNumber: 204,
    date: "18/11/2026",
    diagnosis: "Feocromocitoma",
    acceptedSynonyms: [
      "feocromocitoma",
      "paraganglioma",
      "feocromocitoma adrenal",
    ],
    specialty: "Endocrinologia / Clínica Médica",
    difficulty: "Difícil",
    clues: [
      "Mulher de 34 anos procura atendimento médico por episódios recorrentes e paroxísticos de cefaleia pulsátil intensa, palpitações e sudorese profusa nos últimos 4 meses.",
      "Ela relata que as crises duram entre 20 e 45 minutos, surgem subitamente — às vezes desencadeadas por estresse ou compressão abdominal — e são acompanhadas de palidez cutânea marcante, tremores e sensação de morte iminente. Na semana passada, recebeu prescrição de propranolol em um pronto-atendimento e evoluiu horas depois com crise hipertensiva grave (PA 240x130 mmHg).",
      "Ao exame físico durante o início de um paroxismo no consultório: PA 215x120 mmHg (deitada) com queda postural para 170x95 mmHg em ortostase; FC 128 bpm. Paciente pálida, diaforética, com extremidades frias. Tireoide normopalpável, sem exoftalmia e sem sopros abdominais.",
      "Exames laboratoriais: Glicemia de jejum 138 mg/dL (referência: 70 a 99 mg/dL), TSH 2,1 mUI/L (referência: 0,4 a 4,5 mUI/L). Metanefrinas fracionadas plasmáticas livres: normetanefrina 4,8 nmol/L (referência: < 0,9 nmol/L) e metanefrina 2,9 nmol/L (referência: < 0,5 nmol/L). Metanefrinas urinárias de 24h: 3.400 mcg/24h (referência: < 400 mcg/24h).",
      "A tomografia computadorizada de abdome com contraste identificou massa sólida hipervascularizada de 4,2 cm na glândula adrenal direita, com atenuação > 35 UH na fase pré-contraste. O preparo pré-operatório foi iniciado com bloqueador alfa-adrenérgico (doxazosina) associado a dieta rica em sódio e expansão volêmica por 14 dias, adicionando-se betabloqueador apenas no 10º dia, antes da ressecção laparoscópica.",
    ],
    debriefing: {
      overview:
        "O feocromocitoma é um tumor neuroendócrino produtor de catecolaminas (adrenalina, noradrenalina e dopamina) originado das células cromafins da medula adrenal. Cursa com a tríade clássica de paroxismos (cefaleia, sudorese e palpitações) associada a hipertensão arterial sustentada ou paroxística e piora paradoxal após uso isolado de betabloqueadores.",
      clueBreakdown: [
        "Vinheta clínica: A tríade clássica de cefaleia episódica + sudorese + taquicardia/palpitações em paciente jovem tem especificidade > 90% para tumor produtor de catecolaminas.",
        "Pista 2/5: Palidez durante a crise (por vasoconstrição alfa-1 periférica intensa) e crise hipertensiva paradoxal após uso de propranolol (bloqueio beta-2 vasodilatador deixando os receptores alfa-1 sob estímulo vasoconstritor sem oposição) são pistas-chave.",
        "Pista 3/5: Hipertensão grave paroxística acompanhada de hipotensão ortostática (decorrente da contração do volume intravascular induzida pelo excesso crônico de catecolaminas) e ausência de bócio/oftalmopatia.",
        "Pista 4/5: Hiperglicemia secundária à glicogenólise adrenérgica e elevação > 3-4x o limite superior das metanefrinas fracionadas plasmáticas e urinárias de 24h confirmam bioquimicamente o diagnóstico.",
        "Pista 5/5: Massa adrenal hipervascular com alta atenuação (> 10 UH sem contraste) e o preparo pré-operatório clássico: alfa-bloqueio primeiro (doxazosina/fenoxibenzamina) + sobrecarga hídrica/salina, seguido de beta-bloqueio apenas após alfa-bloqueio efetivo, culminando na adrenalectomia.",
      ],
      differentials: [
        {
          name: "Crise tireotóxica / Hipertireoidismo",
          distinction:
            "Cursa com intolerância ao calor contínua, perda ponderal, TSH suprimido e melhora (não piora) com propranolol.",
        },
        {
          name: "Transtorno do pânico",
          distinction:
            "Pode simular as crises de palpitação e sensação de morte, mas não apresenta elevação maciça de metanefrinas nem massa adrenal hipervascular.",
        },
      ],
      management:
        "1. Confirmação bioquímica: Metanefrinas fracionadas plasmáticas livres ou urinárias de 24h.\n2. Localização anatômica: TC ou RM de abdome/pelve (e cintilografia com MIBG ou PET-DOTATATE se suspeita de doença metastática/extra-adrenal).\n3. Preparo pré-operatório obrigatório (10-14 dias antes da cirurgia): Iniciar ALFA-bloqueador (Doxazosina ou Fenoxibenzamina) + dieta hipernatrêmica para reexpandir o intravascular.\n4. Somente após alfa-bloqueio adequado (3-4 dias depois), introduzir BETA-bloqueador para controle da taquicardia.\n5. Adrenalectomia videolaparoscópica.",
      pearls: [
        "Regra de ouro: ALFA antes do BETA! Dar betabloqueador isolado no feocromocitoma bloqueia a vasodilatação beta-2 e causa vasoconstrição alfa-1 desenfreada.",
        "Regra dos 10%: ~10% extra-adrenais (paragangliomas), ~10% bilaterais, ~10% malignos, ~25-40% associados a síndromes genéticas (NEM 2A/2B, Von Hippel-Lindau, NF1).",
      ],
    },
  },
  {
    id: "case-205-gravidez-ectopica",
    caseNumber: 205,
    date: "19/11/2026",
    diagnosis: "Gravidez ectópica rota",
    acceptedSynonyms: [
      "gravidez ectopica",
      "gestacao ectopica",
      "gestacao ectopica rota",
      "prenhez ectopica",
      "gravidez tubaria rota",
    ],
    specialty: "Ginecologia e Obstetrícia",
    difficulty: "Fácil",
    clues: [
      "Mulher de 28 anos dá entrada na emergência com dor abdominal inferior aguda de forte intensidade iniciada há 3 horas, associada a tontura ao tentar se levantar.",
      "A paciente refere atraso menstrual de 7 semanas e discreto sangramento vaginal escuro ('em borra de café') há 2 dias. Possui antecedente de doença inflamatória pélvica tratada há 3 anos e tabagismo. Há 1 hora passou a sentir dor irradiada para o ombro direito ao deitar.",
      "Exame físico: Paciente hipocorada (2+/4+), sudorética, PA 86x54 mmHg, FC 124 bpm. Abdome distendido, doloroso difusamente à palpação, com descompressão brusca dolorosa em fossa ilíaca direita. Ao exame especular e toque bimanual: pequeno sangramento escuro pelo orifício externo, abaulamento doloroso do fundo de saco posterior ('grito de Douglas') e dor intensa à mobilização do colo uterino.",
      "Exames de urgência: Beta-hCG sérico quantitativo 4.200 mUI/mL (referência não gestante: < 5 mUI/mL), Hemoglobina 8,1 g/dL (referência: 12,0 a 15,5 g/dL). Ultrassonografia transvaginal no leito: cavidade uterina vazia com endométrio espessado (14 mm), massa anexial heterogênea à direita de 3,8 cm com sinal do anel tubário e grande quantidade de líquido livre ecogênico na pelve e no espaço de Morrison.",
      "Realizada ressuscitação volêmica imediata através de dois acessos venosos calibrosos, tipagem sanguínea/reserva de concentrado de hemácias e encaminhamento emergencial ao centro cirúrgico para laparotomia exploradora com salpingectomia direita, confirmando hemoperitônio de 1.200 mL.",
    ],
    debriefing: {
      overview:
        "A gravidez ectópica ocorre quando o blastocisto se implanta fora da cavidade endometrial (95% nas tubas uterinas, principalmente na região ampular). A ruptura tubária provoca hemoperitônio agudo e choque hipovolêmico, sendo a principal causa de morte materna no primeiro trimestre da gestação.",
      clueBreakdown: [
        "Vinheta clínica: Mulher em idade fértil com dor abdominal aguda hipogástrica/fossa ilíaca e pré-síncope deve sempre levantar a hipótese de abdome agudo hemorrágico ginecológico.",
        "Pista 2/5: A tríade clássica (atraso menstrual + dor pélvica + sangramento vaginal discreto), somada ao fator de risco maior (DIP prévia) e ao sinal de Laffont (dor referida no ombro direito por irritação do nervo frênico pelo sangue subdiafragmático).",
        "Pista 3/5: Choque hipovolêmico (PA 86x54, FC 124, palidez), irritação peritoneal em FID e o clássico sinal de Proust ('grito de Douglas' — abaulamento e dor lancinante à palpação do fundo de saco de Douglas pelo hemoperitônio).",
        "Pista 4/5: Beta-hCG acima da zona discriminatória (> 1.500-2.000 mUI/mL) com útero vazio ao ultrassom transvaginal, massa anexial (sinal do anel tubário) e líquido livre no espaço hepatorrenal de Morrison selam o diagnóstico.",
        "Pista 5/5: Por haver instabilidade hemodinâmica e ruptura tubária com hemoperitônio volumoso, o tratamento medicamentoso com metotrexato é contraindicado, exigindo estabilização volêmica/transfusional e salpingectomia cirúrgica imediata.",
      ],
      differentials: [
        {
          name: "Apendicite aguda",
          distinction:
            "Também causa dor em FID e peritonismo, mas cursa com febre, anorexia, Beta-hCG negativo e ausência de choque hemorrágico com líquido livre pélvico.",
        },
        {
          name: "Abortamento em curso",
          distinction:
            "Sangramento vaginal vermelho vivo mais volumoso com cólicas centrais, colo pérvio e restos ovulares intrauterinos, sem hemoperitônio.",
        },
      ],
      management:
        "1. Paciente instável / ectópica rota: Estabilização hemodinâmica (cristaloides + hemotransfusão), avaliação de Rh (imunoglobulina anti-D se Rh negativo) e cirurgia imediata (salpingectomia laparotômica ou laparoscópica).\n2. Paciente estável com ectópica íntegra (< 3,5-4 cm, Beta-hCG < 5.000 mUI/mL, sem BCF): Tratamento clínico com Metotrexato IM (50 mg/m²) e dosagem de Beta-hCG nos dias 4 e 7 (espera-se queda ≥ 15%).",
      pearls: [
        "Sinal de Laffont = dor no ombro/escápula por irritação frênica pelo hemoperitônio.",
        "Sinal de Proust ('Grito de Douglas') = abaulamento extremamente doloroso do fundo de saco vaginal posterior.",
        "Sinal de Cullen = equimose periumbilical.",
      ],
    },
  },
  {
    id: "case-206-meningite-meningococica",
    caseNumber: 206,
    date: "20/11/2026",
    diagnosis: "Meningite meningocócica",
    acceptedSynonyms: [
      "meningite bacteriana",
      "meningite meningococica",
      "meningococcemia",
      "doenca meningococica",
      "meningite por neisseria meningitidis",
    ],
    specialty: "Infectologia / Neurologia",
    difficulty: "Fácil",
    clues: [
      "Estudante universitário de 19 anos é trazido ao pronto-socorro com febre alta, cefaleia holocraniana intensa, vômitos em jato e confusão mental iniciados há 14 horas.",
      "Colegas de alojamento relatam que ele estava bem no dia anterior, quando começou a sentir calafrios, mialgia e dor de cabeça refratária a analgésicos comuns. Nas últimas 4 horas, tornou-se sonolento, intolerante à luz e surgiram manchas avermelhadas nas pernas e no tronco que não desaparecem quando pressionadas.",
      "Exame físico: Tax 39,4°C, PA 95x60 mmHg, FC 118 bpm, ECG 13. Rigidez de nuca acentuada; sinais de Brudzinski e Kernig positivos. Na pele do tronco e membros inferiores, observam-se múltiplas petéquias e lesões purpúricas palpáveis que não somem à digitopressão (vitropressão negativa).",
      "Punção lombar (líquor): aspecto turvo, pressão de abertura 32 cmH2O (referência: 7 a 20 cmH2O), leucócitos 2.800 células/mm³ com 92% de polimorfonucleares neutrófilos (referência: < 5 células/mm³), proteína 240 mg/dL (referência: 15 a 45 mg/dL), glicorraquia 18 mg/dL (glicemia sérica simultânea: 110 mg/dL). Bacterioscopia pelo Gram: diplococos Gram-negativos em forma de grão de café.",
      "O paciente foi colocado em isolamento respiratório por gotículas, recebendo dexametasona venosa e ceftriaxona 2 g IV de 12/12h. A vigilância epidemiológica foi notificada imediatamente e prescreveu-se quimioprofilaxia com rifampicina por 2 dias para todos os moradores do alojamento e contatos íntimos.",
    ],
    debriefing: {
      overview:
        "A meningite meningocócica, causada pelo diplococo Gram-negativo Neisseria meningitidis, é uma emergência infectológica de evolução fulminante que combina síndrome meníngea aguda com meningococcemia (exantema petequial/purpúrico por vasculite e CIVD).",
      clueBreakdown: [
        "Vinheta clínica: Jovem com a tríade clássica de meningite aguda (febre alta + cefaleia intensa + alteração do estado mental) associada a vômitos em jato (hipertensão intracraniana).",
        "Pista 2/5: Morar em alojamento estudantil (aglomeração) é fator epidemiológico clássico para N. meningitidis; fotofobia e lesões cutâneas que não somem à pressão indicam sufusões hemorrágicas/petéquias.",
        "Pista 3/5: Sinais meníngeos clássicos (rigidez de nuca, Kernig e Brudzinski) somados a púrpura/petéquias com vitropressão negativa caracterizam doença meningocócica invasiva.",
        "Pista 4/5: Líquor tipicamente bacteriano (turvo, pleocitose neutrofílica > 1.000/mm³, hiperproteinorraquia e hipoglicorraquia < 40 mg/dL ou < 2/3 da glicemia) e Gram revelando diplococos Gram-negativos intra e extracelulares.",
        "Pista 5/5: Tratamento com Ceftriaxona IV em dose meníngea (2 g 12/12h), precaução por gotículas pelas primeiras 24h de antibiótico eficaz e quimioprofilaxia obrigatória dos comunicantes íntimos com Rifampicina (ou Ciprofloxacino/Ceftriaxona).",
      ],
      differentials: [
        {
          name: "Meningite pneumocócica (Streptococcus pneumoniae)",
          distinction:
            "O líquor também é purulento com hipoglicorraquia, mas o Gram mostra diplococos Gram-POSITIVOS lanceolados e geralmente está associada a sinusite, otite, pneumonia ou fístula liquórica.",
        },
        {
          name: "Meningite viral",
          distinction:
            "Quadro mais brando, sem púrpura, com líquor límpido, predomínio linfomononuclear (< 500 células) e glicorraquia normal.",
        },
      ],
      management:
        "1. Precaução por gotículas imediata (manter até 24h após início do antibiótico eficaz).\n2. Coleta de hemoculturas e líquor (sem atrasar o início do antibiótico se houver necessidade de TC prévia).\n3. Ceftriaxona 2 g IV de 12/12h (4 g/dia) + Dexametasona IV antes ou junto à 1ª dose do antibiótico.\n4. Notificação compulsória imediata (em até 24h) e quimioprofilaxia dos contatos íntimos com Rifampicina 600 mg VO 12/12h por 2 dias.",
      pearls: [
        "Diplococo Gram-NEGATIVO no líquor = Neisseria meningitidis (Meningococo).",
        "Diplococo Gram-POSITIVO no líquor = Streptococcus pneumoniae (Pneumococo).",
        "O isolamento por gotículas e a quimioprofilaxia só são necessários para Meningococo e Haemophilus influenzae (não para Pneumococo).",
      ],
    },
  },
  {
    id: "case-207-cetoacidose-diabetica",
    caseNumber: 207,
    date: "21/11/2026",
    diagnosis: "Cetoacidose diabética",
    acceptedSynonyms: [
      "cetoacidose diabetica",
      "cad",
      "descompensacao diabetica em cetoacidose",
    ],
    specialty: "Endocrinologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Jovem de 17 anos é trazida à sala de emergência com dor abdominal difusa, náuseas, vômitos repetidos e respiração rápida e profunda há 12 horas.",
      "A mãe relata que a adolescente perdeu cerca de 6 kg no último mês, apesar de estar comendo muito, além de beber água incessantemente e acordar várias vezes à noite para urinar. Há 2 dias apresentou odinofagia e febre baixa, evoluindo hoje com prostração intensa.",
      "Exame físico: Paciente sonolenta, desidratada (3+/4+), mucosas secas, turgor cutâneo diminuído. PA 96x60 mmHg, FC 126 bpm, FR 32 irpm com incursões respiratórias amplas e profundas (ritmo de Kussmaul). Percebe-se hálito cetônico frutado característico. Abdome doloroso difusamente à palpação superficial e profunda, sem sinais de peritonite verdadeira.",
      "Exames laboratoriais: Glicemia plasmática 465 mg/dL (referência: 70 a 99 mg/dL), Gasometria arterial: pH 7,12 (referência: 7,35 a 7,45), HCO3 9 mEq/L (referência: 22 a 26 mEq/L), pCO2 23 mmHg, Anion Gap 26 mEq/L (referência: 8 a 12 mEq/L). Potássio sérico: 3,1 mEq/L (referência: 3,5 a 5,0 mEq/L), Sódio medido: 130 mEq/L. Cetonemia (beta-hidroxibutirato): 6,4 mmol/L (referência: < 0,6 mmol/L) e cetonúria 4+.",
      "Iniciou-se imediatamente expansão volêmica vigorosa com SF 0,9% e reposição venosa de cloreto de potássio, adiando-se temporariamente o início da bomba de insulina regular até que o potássio sérico ultrapassasse 3,3 mEq/L para evitar arritmias fatais. Assim que a glicemia atingiu 200 mg/dL, associou-se soro glicosado 5% mantendo a infusão de insulina até o fechamento do Anion Gap.",
    ],
    debriefing: {
      overview:
        "A Cetoacidose Diabética (CAD) é uma complicação aguda grave do Diabetes Mellitus (frequentemente a apresentação inaugural do DM tipo 1), resultante da deficiência absoluta de insulina combinada ao excesso de hormônios contrarreguladores (glucagon, cortisol, catecolaminas), levando a hiperglicemia, diurese osmótica com desidratação grave e lipólise intensa com cetogênese e acidose metabólica de Anion Gap elevado.",
      clueBreakdown: [
        "Vinheta clínica: Dor abdominal aguda com vômitos e hiperventilação em jovem pode simular abdome agudo cirúrgico, mas a hiperpneia profunda aponta para compensação respiratória de acidose metabólica.",
        "Pista 2/5: Os '4 Ps' clássicos do DM1 (poliúria, polidipsia, polifagia e perda ponderal) no último mês, com fator precipitante infeccioso agudo (amigdalite/faringite).",
        "Pista 3/5: Desidratação importante, taquicardia, respiração de Kussmaul (compensação respiratória da acidose) e hálito cetônico (eliminação pulmonar de acetona), com 'pseudoabdome agudo' pela acidose/desidratação.",
        "Pista 4/5: Tríade bioquímica diagnóstica da CAD: Glicemia > 250 mg/dL (465) + Acidose metabólica com Anion Gap elevado (pH 7,12, HCO3 9, AG 26) + Cetonemia/cetonúria fortemente positivas. Atenção crítica: hipocalemia na admissão (K+ = 3,1 mEq/L).",
        "Pista 5/5: Conduta padrão-ouro: hidratação com SF 0,9% em 1º lugar e retenção obrigatória da insulina porque K+ < 3,3 mEq/L (a insulina desloca K+ para o intracelular e causaria parada cardíaca hipocalêmica). Após K+ ≥ 3,3, inicia-se insulina regular IV 0,1 UI/kg/h e adiciona-se SG 5% quando glicemia chega a 200-250 mg/dL.",
      ],
      differentials: [
        {
          name: "Estado Hiperglicêmico Hiperosmolar (EHH)",
          distinction:
            "Típico de idosos com DM2, glicemias > 600 mg/dL, hiperosmolaridade > 320 mOsm/kg, porém SEM cetoacidose significativa (pH > 7,30 e HCO3 > 18).",
        },
        {
          name: "Abdome agudo cirúrgico (Apendicite / Pancreatite)",
          distinction:
            "Na CAD a dor abdominal regride rapidamente com a hidratação e resolução da acidose metabólica.",
        },
      ],
      management:
        "1. Hidratação venosa imediata: SF 0,9% 15-20 mL/kg (1.000-1.500 mL) na 1ª hora.\n2. Checar Potássio (K+) ANTES da insulina:\n   - Se K+ < 3,3 mEq/L: NÃO iniciar insulina! Repor 20-40 mEq/h de KCl até K+ ≥ 3,3.\n   - Se K+ entre 3,3 e 5,2 mEq/L: Iniciar insulina + repor 20-30 mEq de KCl por litro de soro.\n   - Se K+ > 5,2 mEq/L: Iniciar insulina sem KCl e monitorar de 2/2h.\n3. Insulina Regular IV em bomba de infusão contínua (0,1 UI/kg/h).\n4. Quando glicemia atingir 200-250 mg/dL: associar SG 5% com NaCl 0,45% e reduzir insulina para 0,02-0,05 UI/kg/h até critérios de resolução (Glicemia < 200 + e pelo menos dois: pH > 7,30, HCO3 ≥ 15-18, Anion Gap ≤ 12).",
      pearls: [
        "Dar insulina com K+ < 3,3 mEq/L é o erro mais letal no manejo da CAD.",
        "Critério de resolução da CAD não é apenas baixar a glicemia, mas fechar o Anion Gap e corrigir a acidose (por isso entra-se com SG 5% quando a glicemia chega em 200 mg/dL).",
      ],
    },
  },
  {
    id: "case-208-colangite-aguda",
    caseNumber: 208,
    date: "22/11/2026",
    diagnosis: "Colangite aguda grave",
    acceptedSynonyms: [
      "colangite aguda",
      "colangite bacteriana aguda",
      "colangite supurativa aguda",
      "pentade de reynolds",
      "triade de charcot",
    ],
    specialty: "Cirurgia Geral / Gastroenterologia",
    difficulty: "Médio",
    clues: [
      "Mulher de 68 anos é trazida ao pronto-socorro com febre alta com calafrios, dor intensa no quadrante superior direito do abdome e pele amarelada há 24 horas.",
      "Familiares informam que a paciente possui cálculo na vesícula biliar diagnosticado há 2 anos e que há 3 dias começou a notar urina cor de Coca-Cola e fezes esbranquiçadas. Nas últimas 3 horas, tornou-se sonolenta, desorientada no tempo e no espaço e com extremidades frias.",
      "Exame físico: Paciente ictérica (3+/4+), letárgica (Glasgow 13), Tax 39,2°C, PA 82x48 mmHg, FC 122 bpm. Abdome globoso, doloroso à palpação profunda em hipocôndrio direito, sem sinais de irritação peritoneal difusa.",
      "Exames laboratoriais: Leucócitos 21.400/mm³ com 14% de bastões (referência: 4.000 a 10.000/mm³), Bilirrubina total 8,6 mg/dL com Bilirrubina direta 7,1 mg/dL (referência BD: < 0,3 mg/dL), Fosfatase Alcalina 680 U/L (referência: 40 a 130 U/L), GGT 590 U/L (referência: 8 a 61 U/L), Amilase 95 U/L (referência: 28 a 100 U/L), Lactato arterial 4,2 mmol/L. Ultrassonografia de abdome: dilatação do colédoco (1,4 cm) com imagem hiperecogênica produtora de sombra acústica posterior impactada no colédoco distal.",
      "Após ressuscitação volêmica inicial, início de noradrenalina e antibioticoterapia venosa de amplo espectro (piperacilina-tazobactam), a paciente foi submetida de urgência a CPRE com papilotomia endoscópica, saída imediata de bile purulenta sob pressão e extração do cálculo coledociano.",
    ],
    debriefing: {
      overview:
        "A colangite aguda é a infecção bacteriana ascendente das vias biliares secundária à obstrução biliar (mais comumente por coledocolitíase). A estase biliar eleva a pressão intraductal, permitindo translocação de bactérias (E. coli, Klebsiella, Enterococcus) para a corrente sanguínea e sepse biliar fulminante.",
      clueBreakdown: [
        "Vinheta clínica: Apresenta exatamente a Tríade de Charcot (Febre com calafrios + Dor em hipocôndrio direito + Icterícia), presente em ~60-70% das colangites agudas.",
        "Pista 2/5: História de colelitíase seguida de síndrome colestática (colúria e acolia fecal) que evolui para confusão mental/letargia.",
        "Pista 3/5: A associação da Tríade de Charcot com Hipotensão arterial/choque (PA 82x48) e Depressão do Sistema Nervoso Central (letargia/confusão) configura a Pêntade de Reynolds (colangite aguda grave/supurativa).",
        "Pista 4/5: Leucocitose com desvio à esquerda, padrão laboratorial colestático franco (BD, FA e GGT muito elevadas) com amilase normal e ultrassom confirmando coledocolitíase obstrutiva com dilatação da via biliar principal (> 6-8 mm).",
        "Pista 5/5: Na colangite aguda grave (Tokyo Grau III), apenas antibiótico não salva o paciente: é obrigatória a descompressão biliar urgente via CPRE (Colangiopancreatografia Retrógrada Endoscópica) com esfincterotomia e drenagem da bile purulenta.",
      ],
      differentials: [
        {
          name: "Colecistite aguda calculosa",
          distinction:
            "Cursa com sinal de Murphy positivo e espessamento parietal vesicular, mas geralmente sem icterícia obstrutiva franca (BD 7,1) nem dilatação do colédoco.",
        },
        {
          name: "Pancreatite aguda biliar",
          distinction:
            "Dor em faixa irradiada para o dorso com elevação > 3x de amilase/lipase.",
        },
      ],
      management:
        "1. Ressuscitação hemodinâmica agressiva (cristaloides + vasopressor se choque séptico).\n2. Antibioticoterapia IV na 1ª hora cobrindo Gram-negativos entéricos e anaeróbios (ex: Piperacilina-Tazobactam, ou Ceftriaxona + Metronidazol, ou Meropenem nos casos graves).\n3. Descompressão da via biliar de urgência (padrão-ouro: CPRE com papilotomia/prótese biliar).\n4. Colecistectomia eletiva após resolução do quadro séptico para prevenir recorrência.",
      pearls: [
        "Tríade de Charcot = Febre + Icterícia + Dor em HCD.",
        "Pêntade de Reynolds = Tríade de Charcot + Hipotensão (Choque) + Confusão Mental.",
        "Tratamento definitivo da colangite grave = Antibiótico + Drenagem Biliar (CPRE).",
      ],
    },
  },
  {
    id: "case-209-intussuscepcao",
    caseNumber: 209,
    date: "23/11/2026",
    diagnosis: "Intussuscepção intestinal",
    acceptedSynonyms: [
      "intussuscepcao",
      "invaginacao intestinal",
      "intussuscepcao ileocolica",
    ],
    specialty: "Pediatria / Cirurgia Pediátrica",
    difficulty: "Médio",
    clues: [
      "Lactente previamente hígido de 9 meses é trazido ao pronto-socorro pediátrico por crises súbitas de choro inconsolável nas últimas 8 horas.",
      "Os pais relatam que durante as crises o bebê flexiona intensamente as pernas sobre o abdome, fica pálido e suda frio por alguns minutos; logo depois, a crise cessa e ele fica sonolento e apático até um novo episódio 20 minutos depois. Há 1 hora apresentou dois episódios de vômitos e eliminou evacuação mucossanguinolenta.",
      "Exame físico: Lactente letárgico entre os paroxismos de dor, FC 142 bpm, afebril. À palpação abdominal no intervalo entre as crises, palpa-se massa tubular alongada ('em forma de salsicha') no quadrante superior direito, enquanto a fossa ilíaca direita mostra-se estranhamente vazia à palpação (sinal de Dance). Na fralda, observa-se fezes com aspecto clássico de 'geleia de morango'.",
      "Radiografia simples de abdome mostra ausência de gás no cólon ascendente e distensão de alças delgadas. A ultrassonografia abdominal evidencia imagem patognomônica 'em alvo' (ou 'rosca/donut') no corte transversal e 'em pseudorrim' no corte longitudinal, medindo 3,2 cm de diâmetro na transição ileocólica.",
      "Como não havia sinais de pneumoperitônio ou peritonite, foi realizada redução hidrostática guiada por ultrassonografia (enema com solução salina), observando-se o desaparecimento completo da massa e o refluxo livre de líquido através da válvula ileocecal para o íleo terminal.",
    ],
    debriefing: {
      overview:
        "A intussuscepção (ou invaginação) intestinal é a causa mais comum de obstrução intestinal entre 3 meses e 3 anos de idade (pico entre 5 e 9 meses). Consiste na penetração telescópica de um segmento intestinal proximal (geralmente o íleo terminal) para dentro do lúmen distal (ceco/cólon ascendente), comprimindo o mesentério e causando congestão venosa, edema, isquemia mucosa (fezes em geleia de morango) e, se não tratada, necrose e perfuração.",
      clueBreakdown: [
        "Vinheta clínica: Lactente de 9 meses com paroxismos súbitos de dor abdominal intensa (choro inconsolável) é a apresentação inicial típica.",
        "Pista 2/5: A alternância clássica entre crises de flexão das coxas sobre o abdome (cólica paroxística a cada 15-20 min pelo peristaltismo sobre o segmento invaginado) e períodos de letargia pós-crise, evoluindo com vômitos e sangue com muco nas fezes.",
        "Pista 3/5: A tríade semiológica clássica: massa abdominal palpável em formato de salsicha (chouriço) no hipocôndrio direito, sinal de Dance (fossa ilíaca direita vazia pela migração do ceco) e fezes em 'geleia de morango' (mistura de muco e sangue da mucosa isquêmica).",
        "Pista 4/5: A ultrassonografia é o exame padrão-ouro (sensibilidade e especificidade ~98-100%), demonstrando o 'sinal do alvo' (anéis concêntricos hipo e hiperecogênicos no corte transversal) e 'sinal do pseudorrim' no longitudinal.",
        "Pista 5/5: Na ausência de perfuração, peritonite ou choque, o tratamento de primeira linha é a redução não cirúrgica por enema pneumático (ar) ou hidrostático (solução salina/contraste hidrossolúvel) guiado por US ou fluoroscopia.",
      ],
      differentials: [
        {
          name: "Gastroenterite aguda infecciosa / Disenteria",
          distinction:
            "Cursa com diarreia frequente e febre, sem os ciclos paroxísticos de dor com massa em salsicha ou sinal do alvo ao ultrassom.",
        },
        {
          name: "Divertículo de Meckel",
          distinction:
            "Tipicamente causa enterorragia indolor volumosa (embora possa atuar como cabeça de invaginação em crianças maiores).",
        },
      ],
      management:
        "1. Estabilização inicial: Jejum, hidratação venosa e descompressão por sonda nasogástrica se vômitos biliosos.\n2. Paciente estável sem peritonite/perfuração: Redução hidrostática ou pneumática por enema guiado por ultrassonografia ou radioscopia (sucesso > 85%).\n3. Contraindicações ao enema (indicam cirurgia imediata): Pneumoperitônio, sinais de peritonite, instabilidade hemodinâmica refratária ou falha após tentativas de enema.",
      pearls: [
        "Sinal do Alvo (corte transversal) e Sinal do Pseudorrim (corte longitudinal) na USG = Intussuscepção intestinal.",
        "Sinal de Dance = Fossa ilíaca direita vazia à palpação.",
        "Em crianças > 2-3 anos ou adultos, sempre investigar 'ponto de tração' patológico (Divertículo de Meckel, pólipo, linfoma, Púrpura de Henoch-Schönlein).",
      ],
    },
  },
  {
    id: "case-210-ptt",
    caseNumber: 210,
    date: "24/11/2026",
    diagnosis: "Púrpura trombocitopênica trombótica",
    acceptedSynonyms: [
      "purpura trombocitopenica trombotica",
      "ptt",
      "sindrome de moschcowitz",
      "deficiencia de adamts13",
    ],
    specialty: "Hematologia / Clínica Médica",
    difficulty: "Difícil",
    clues: [
      "Mulher de 32 anos é trazida ao pronto-socorro por cefaleia, episódios transitórios de fala arrastada e manchas roxas espontâneas pelo corpo há 3 dias.",
      "Familiares contam que há uma semana ela apresentava fadiga progressiva e febre diária de até 38,3°C. Ontem teve um episódio de parestesia no braço direito e confusão mental que durou 30 minutos e regrediu espontaneamente, mas hoje voltou a ficar desorientada e com urina avermelhada.",
      "Exame físico: Paciente ictérica (2+/4+), hipocorada (3+/4+), Tax 38,2°C, PA 128x78 mmHg, FC 106 bpm. Neurológico: desorientada no tempo, com afasia de expressão flutuante, sem rigidez de nuca. Pele: múltiplas petéquias e equimoses em membros inferiores e tronco. Ausência de esplenomegalia.",
      "Exames laboratoriais: Hemoglobina 6,8 g/dL (referência: 12 a 15,5 g/dL), Plaquetas 11.000/mm³ (referência: 150.000 a 450.000/mm³), Reticulócitos 9,5%, LDH 1.890 U/L (referência: 140 a 280 U/L), Bilirrubina indireta 3,4 mg/dL, Haptoglobina < 5 mg/dL (referência: 30 a 200 mg/dL), Creatinina 1,7 mg/dL. Teste de Coombs direto: negativo. TP, TTPA e fibrinogênio: normais. Esfregaço de sangue periférico: numerosos esquizócitos (hemácias fragmentadas, > 8 por campo).",
      "A transfusão de plaquetas foi expressamente proscrita pela equipe. Coletou-se amostra para dosagem da atividade da metaloprotease específica (que posteriormente retornou < 3%) e iniciou-se em caráter de emergência plasmaférese terapêutica diária com reposição de plasma fresco congelado, associada a metilprednisolona em altas doses.",
    ],
    debriefing: {
      overview:
        "A Púrpura Trombocitopênica Trombótica (PTT) é uma microangiopatia trombótica potencialmente fatal causada pela deficiência grave (< 10%) da enzima ADAMTS13 (geralmente por autoanticorpos IgG inibidores). Sem a ADAMTS13, multímeros ultragrandes do fator de von Willebrand permanecem aderidos ao endotélio, aprisionando plaquetas (plaquetopenia grave de consumo), formando microtrombos na microcirculação cerebral/renal e cisalhando mecanicamente as hemácias (anemia hemolítica microangiopática com esquizócitos).",
      clueBreakdown: [
        "Vinheta clínica: Mulher jovem com déficits neurológicos focais e púrpura sugere acometimento simultâneo da hemostasia primária e da microcirculação cerebral.",
        "Pista 2/5: Sintomas neurológicos flutuantes/transitórios (pela formação e dissolução dinâmica de microtrombos plaquetários cerebrais) associados a febre e fadiga.",
        "Pista 3/5: Evidencia a Pêntade Clássica da PTT: 1) Anemia (palidez + icterícia hemolítica), 2) Plaquetopenia (petéquias/equimoses), 3) Alterações neurológicas flutuantes, 4) Febre e 5) Disfunção renal.",
        "Pista 4/5: Confirma Anemia Hemolítica Microangiopática (Hb 6,8, LDH altíssimo, BI alta, haptoglobina consumida, Coombs direto NEGATIVO e > 1% de esquizócitos no sangue periférico) + Plaquetopenia severa (11.000/mm³) com coagulograma (TP/TTPA/fibrinogênio) NORMAL (o que afasta CIVD).",
        "Pista 5/5: Atividade de ADAMTS13 < 10% confirma PTT. Transfusão de plaquetas é contraindicada ('jogar lenha na fogueira', precipitando trombose cerebral/cardíaca), e o tratamento salvador imediato é a Plasmaférese (remove autoanticorpos e repõe ADAMTS13) + Corticoterapia.",
      ],
      differentials: [
        {
          name: "Coagulação Intravascular Disseminada (CIVD)",
          distinction:
            "Também cursa com esquizócitos e plaquetopenia, mas apresenta consumo dos fatores de coagulação (TP e TTPA alargados e fibrinogênio baixo).",
        },
        {
          name: "Síndrome Hemolítico-Urêmica (SHU)",
          distinction:
            "Predomina insuficiência renal aguda grave (frequentemente pós-diarreia sanguinolenta por E. coli O157:H7 em crianças), sem deficiência grave de ADAMTS13.",
        },
        {
          name: "Síndrome de Evans (PTI + AHAI)",
          distinction:
            "Cursa com anemia hemolítica e plaquetopenia autoimunes, mas o Teste de Coombs direto é POSITIVO e não há esquizócitos.",
        },
      ],
      management:
        "1. Plasmaférese terapêutica diária de emergência (reduz a mortalidade de 90% para < 15%). Enquanto aguarda o cateter/máquina de plasmaférese, pode-se infundir Plasma Fresco Congelado.\n2. Corticoterapia sistêmica em altas doses (Metilprednisolona 1 g/dia ou Prednisona 1 mg/kg/dia).\n3. Rituximabe (anti-CD20) e Caplacizumabe (anticorpo anti-fator de von Willebrand) nos casos confirmados/refratários.\n4. Contraindicação à transfusão de plaquetas (exceto em hemorragia com risco iminente de morte).",
      pearls: [
        "Esquizócitos no esfregaço + Plaquetopenia + Coombs negativo + TP/TTPA normais = Microangiopatia Trombótica (PTT/SHU) -> Iniciar Plasmaférese sem esperar resultado do ADAMTS13!",
        "Não transfundir plaquetas na PTT!",
      ],
    },
  },
  {
    id: "case-211-intoxicacao-organofosforado",
    caseNumber: 211,
    date: "25/11/2026",
    diagnosis: "Intoxicação por organofosforado",
    acceptedSynonyms: [
      "intoxicacao por organofosforados",
      "sindrome colinergica aguda",
      "intoxicacao por carbamato",
      "intoxicacao por chumbinho",
      "intoxicacao por inibidor da acetilcolinesterase",
    ],
    specialty: "Emergência / Toxicologia",
    difficulty: "Fácil",
    clues: [
      "Homem de 38 anos é encontrado inconsciente em um galpão agrícola e trazido ao pronto-socorro com intensa salivação, vômitos e dificuldade respiratória há 1 hora.",
      "Socorristas relatam que o paciente estava aplicando defensivos na lavoura sem equipamento de proteção individual e que suas roupas estavam úmidas e com forte odor semelhante a alho/querosene. Durante o transporte, apresentou diarreia profusa, incontinência urinária e abalos musculares nas pernas.",
      "Exame físico: Paciente comatoso (Glasgow 8), diaforético, com sialorreia e lacrimejamento abundantes. PA 92x56 mmHg, FC 44 bpm, FR 28 irpm, SpO2 84% em ar ambiente. Pupilas puntiformes bilaterais (miose extrema). Ausculta pulmonar com roncos, sibilos difusos e estertores bolhosos em ambos os hemitórax (broncorreia maciça). Observam-se fasciculações musculares em face e membros.",
      "Exames complementares: Gasometria arterial mostra acidose mista (pH 7,19, pCO2 52 mmHg, HCO3 17 mEq/L). ECG: bradicardia sinusal a 44 bpm. Dosagem da atividade da pseudocolinesterase plasmática (butirilcolinesterase): 420 U/L (referência: 4.500 a 11.000 U/L — redução > 90%).",
      "Após retirada completa das roupas, lavagem corporal exaustiva com água e sabão e intubação orotraqueal, administrou-se doses crescentes de atropina IV a cada 5 minutos até a secagem completa das secreções brônquicas (atropinização), associada à infusão de pralidoxima.",
    ],
    debriefing: {
      overview:
        "A intoxicação por organofosforados decorre da inibição fosforilativa irreversível da enzima acetilcolinesterase (AChE), provocando acúmulo maciço de acetilcolina nas fendas sinápticas e desencadeando síndrome colinérgica aguda com estimulação simultânea de receptores muscarínicos, nicotínicos e do Sistema Nervoso Central.",
      clueBreakdown: [
        "Vinheta clínica: Trabalhador agrícola com rebaixamento do nível de consciência, sialorreia e insuficiência respiratória aguda.",
        "Pista 2/5: Exposição ocupacional a agrotóxico com odor aliáceo (alho), associada a sintomas muscarínicos (diarreia, micção, êmese — mnemônico DUMBELS/SLUDGE) e nicotínicos (fasciculações).",
        "Pista 3/5: Os '3 Ms' clássicos da síndrome anticolinesterásica: Miose puntiforme + Muitas secreções (sialorreia, lacrimejamento, sudorese e broncorreia grave — as '3 lágrimas') + Miofasciculações, acompanhadas de bradicardia muscarínica (FC 44 bpm) e broncoespasmo.",
        "Pista 4/5: Queda acentuada (> 50-90%) da atividade da colinesterase plasmática/eritrocitária comprova a inibição enzimática por anticolinesterásico.",
        "Pista 5/5: Descontaminação cutânea (evitando absorção contínua), suporte ventilatório, Atropina IV titulada até secar a broncorreia (e não pela pupila!) e Pralidoxima (oxima que reativa a acetilcolinesterase antes que ocorra o 'envelhecimento' ou aging da ligação com o organofosforado).",
      ],
      differentials: [
        {
          name: "Intoxicação por opioides",
          distinction:
            "Cursa com miose puntiforme, coma e depressão respiratória (FR baixa), mas NÃO apresenta broncorreia maciça, sialorreia, diarreia ou fasciculações musculares.",
        },
        {
          name: "Edema agudo de pulmão cardiogênico",
          distinction:
            "Apresenta estertores pulmonares difusos, mas cursa com taquicardia/hipertensão ou cardiopatia prévia, sem miose, sialorreia ou miofasciculações.",
        },
      ],
      management:
        "1. Proteção da equipe (luvas) + Descontaminação cutânea imediata (retirar roupas e lavar pele com água e sabão).\n2. Via aérea definitiva (IOT) — atenção: evitar succinilcolina na sequência rápida, pois ela é metabolizada pela pseudocolinesterase e causará bloqueio neuromuscular prolongado!\n3. Antídoto muscarínico: Atropina IV (1 a 5 mg em bolus, dobrando a dose a cada 3-5 min) até atingir o alvo de atropinização: ausculta pulmonar limpa (secagem da broncorreia), FC > 80 bpm e PAS > 90 mmHg.\n4. Reativador da colinesterase (antídoto nicotínico/enzimático): Pralidoxima IV nos casos de organofosforados.",
      pearls: [
        "O parâmetro de sucesso da atropinização é a SECAGEM DA BRONCORREIA (ausculta pulmonar limpa) e estabilidade hemodinâmica — nunca use a midríase como meta para parar a atropina!",
        "Evite Succinilcolina na intubação de pacientes intoxicados por organofosforados/carbamatos.",
      ],
    },
  },
  {
    id: "case-212-endocardite-infecciosa",
    caseNumber: 212,
    date: "26/11/2026",
    diagnosis: "Endocardite infecciosa",
    acceptedSynonyms: [
      "endocardite bacteriana",
      "endocardite infecciosa subaguda",
      "endocardite infecciosa aguda",
      "endocardite de valva mitral",
    ],
    specialty: "Cardiologia / Infectologia",
    difficulty: "Médio",
    clues: [
      "Homem de 54 anos procura atendimento com febre diária vespertina (38,2°C a 38,8°C), sudorese noturna, fadiga intensa e perda de 4 kg há 3 semanas.",
      "O paciente realizou extração dentária há 5 semanas sem profilaxia antibiótica. Possui diagnóstico antigo de prolapso da valva mitral com regurgitação moderada. Há 2 dias notou o surgimento de pequenos nódulos dolorosos nas polpas digitais das mãos e turvação visual focal no olho esquerdo.",
      "Exame físico: Paciente hipocorado (+/4+), Tax 38,5°C, PA 122x74 mmHg, FC 98 bpm. Ausculta cardíaca revela sopro holossistólico regurgitativo 4+/6+ em foco mitral irradiado para a axila. Nas extremidades, observam-se hemorragias subungueais em estilhaço, nódulos eritemato-violáceos dolorosos nas polpas digitais (nódulos de Osler) e máculas hemorrágicas indolores nas palmas (lesões de Janeway). Fundoscopia: manchas ovais retinianas com centro pálido (manchas de Roth). Baço palpável a 2 cm do rebordo costal esquerdo.",
      "Exames laboratoriais: Hb 10,2 g/dL, Leucócitos 13.800/mm³, VHS 88 mm/1ªh, PCR 112 mg/L, Fator Reumatoide positivo, Urina 1 com hematúria dismórfica e cilindros hemáticos. Três pares de hemoculturas periféricas coletadas em sítios distintos positivaram para Streptococcus do grupo viridans (S. sanguinis). Ecocardiograma transesofágico: vegetação móvel de 12 mm aderida ao folheto anterior da valva mitral com insuficiência mitral importante.",
      "Iniciou-se antibioticoterapia venosa direcionada com Penicilina G Cristalina associada a Gentamicina após avaliação conjunta com a cirurgia cardíaca, evoluindo com defervescência no 4º dia e negativação das hemoculturas de controle.",
    ],
    debriefing: {
      overview:
        "A Endocardite Infecciosa (EI) subaguda ocorre tipicamente quando uma bacteremia transitória (ex: manipulação odontológica liberando Streptococcus viridans) coloniza um endotélio valvar previamente lesado (como no prolapso mitral com regurgitação), formando vegetações de fibrina, plaquetas e bactérias que originam fenômenos embólicos (lesões de Janeway, êmbolos sépticos) e fenômenos imunológicos por deposição de imunocomplexos (nódulos de Osler, manchas de Roth, glomerulonefrite e fator reumatoide positivo).",
      clueBreakdown: [
        "Vinheta clínica: Síndrome febril subaguda prolongada (> 2-3 semanas) com sintomas constitucionais deve sempre incluir endocardite infecciosa no diferencial.",
        "Pista 2/5: A associação clássica entre manipulação dentária recente + cardiopatia estrutural prévia (prolapso mitral com refluxo) + nódulos dolorosos nos dedos.",
        "Pista 3/5: Sopro regurgitativo mitral acentuado associado aos estigmas periféricos clássicos dos Critérios de Duke: fenômenos vasculares (lesões de Janeway — indolores nas palmas/plantas; hemorragias em estilhaço) e fenômenos imunológicos (nódulos de Osler — dolorosos nas polpas digitais; manchas de Roth na retina) + esplenomegalia.",
        "Pista 4/5: Fecha 2 Critérios Maiores de Duke modificados: 1) Hemoculturas persistentemente positivas para microrganismo típico de EI (Streptococcus viridans em 3 pares) e 2) Ecocardiograma transesofágico demonstrando vegetação valvar móvel (12 mm).",
        "Pista 5/5: Tratamento bactericida parenteral prolongado (4 semanas de Penicilina G Cristalina ou Ceftriaxona, ou 2 semanas se combinada à Gentamicina em cepas altamente sensíveis e valva nativa sem complicações).",
      ],
      differentials: [
        {
          name: "Febre Reumática Aguda",
          distinction:
            "Ocorre em jovens 2-3 semanas após faringoamigdalite estreptocócica, com poliartrite migratória, mas hemoculturas são NEGATIVAS e não há vegetações móveis destrutivas com bacteremia.",
        },
        {
          name: "Lúpus Eritematoso Sistêmico (Endocardite de Libman-Sacks)",
          distinction:
            "Vegetações verrucosas estéreis (hemoculturas negativas) associadas a FAN/anti-DNA positivos e síndrome antifosfolípide.",
        },
      ],
      management:
        "1. Coletar 3 pares de hemoculturas periféricas em sítios diferentes antes de iniciar o antibiótico.\n2. Ecocardiograma Transtorácico (ETT) inicial e Transesofágico (ETE — muito maior sensibilidade para vegetações < 5 mm, próteses e abscessos perivalvares).\n3. Antibioticoterapia IV prolongada (4 a 6 semanas) guiada pelo antibiograma.\n4. Indicações de cirurgia valvar precoce: Insuficiência cardíaca aguda/edema agudo de pulmão por disfunção valvar grave (principal indicação!), infecção não controlada (abscesso, fístula, fungos) ou prevenção de embolia (vegetação > 10 mm com evento embólico ou > 15 mm).",
      pearls: [
        "Nódulos de Osler = dOlorosos (imunOlógicos, nas pOlpas digitais).",
        "Lesões de Janeway = indolores (embólicas/vasculares, nas palmas e plantas).",
        "Principal indicação de cirurgia cardíaca de urgência na Endocardite Infecciosa: Insuficiência Cardíaca por disfunção valvar aguda.",
      ],
    },
  },
  {
    id: "case-213-guillain-barre",
    caseNumber: 213,
    date: "27/11/2026",
    diagnosis: "Síndrome de Guillain-Barré",
    acceptedSynonyms: [
      "sindrome de guillain barre",
      "guillain-barre",
      "polirradiculoneuropatia inflamatoria desmielinizante aguda",
      "sgb",
    ],
    specialty: "Neurologia",
    difficulty: "Fácil",
    clues: [
      "Homem de 29 anos procura o pronto-socorro com queixa de formigamento nos pés e fraqueza progressiva nas duas pernas que o impede de subir escadas há 3 dias.",
      "Ele relata que a fraqueza começou nos dedos dos pés e tornozelos e hoje já atinge as coxas e começou a dificultar a preensão de objetos com as mãos. Há cerca de 2 semanas teve um quadro de diarreia aguda autolimitada após viagem. Nega alteração no controle de esfíncteres urinário ou fecal.",
      "Exame físico: Paciente lúcido, PA 135x85 mmHg, FC 96 bpm, FR 20 irpm. Exame neurológico: tetraparesia flácida simétrica de predomínio nos membros inferiores (força grau 2/5 em MMII e 4/5 em MMSS). Reflexos osteotendíneos patelares e aquileus abolidos bilateralmente (arreflexia profunda) e hiporreflexia bicipital. Sensibilidade superficial preservada, sem nível sensitivo no tronco. Discreta paresia facial periférica bilateral.",
      "Ressonância magnética de coluna total: sem compressão medular. Punção lombar (líquor): aspecto límpido ('água de rocha'), leucócitos 3 células/mm³ (referência: < 5 células/mm³), proteína total 148 mg/dL (referência: 15 a 45 mg/dL), glicose 64 mg/dL. Eletroneuromiografia: redução acentuada da velocidade de condução nervosa motora, prolongamento das latências distais e bloqueio de condução compatíveis com desmielinização aguda.",
      "O paciente foi internado em unidade monitorizada com aferição seriada da capacidade vital forçada e tratado com Imunoglobulina Humana Intravenosa (0,4 g/kg/dia por 5 dias), apresentando estabilização da progressão motora no 3º dia e recuperação funcional progressiva.",
    ],
    debriefing: {
      overview:
        "A Síndrome de Guillain-Barré (Polirradiculoneuropatia Inflamatória Desmielinizante Aguda — PIDA) é uma neuropatia periférica autoimune pós-infecciosa mediada por mimetismo molecular (frequentemente após infecção por Campylobacter jejuni, CMV, EBV ou Zika), em que anticorpos anti-gangliosídeos atacam a bainha de mielina ou os axônios das raízes nervosas motoras.",
      clueBreakdown: [
        "Vinheta clínica: Parestesias distais seguidas de paraparesia simétrica aguda rapidamente progressiva.",
        "Pista 2/5: Padrão clássico de paralisia ascendente (começa em membros inferiores e sobe para membros superiores) precedida em 1 a 3 semanas por gastroenterite aguda (Campylobacter jejuni — patógeno mais associado), com preservação esfincteriana.",
        "Pista 3/5: Os dois critérios obrigatórios para o diagnóstico clínico de SGB: 1) Fraqueza progressiva de mais de um membro (tetraparesia flácida simétrica) e 2) Arreflexia ou hiporreflexia osteotendínea profunda, frequentemente associada a diparesia facial e ausência de nível sensitivo.",
        "Pista 4/5: O achado liquórico clássico da SGB: Dissociação Proteíno-Citológica (hiperproteinorraquia acentuada de 148 mg/dL com celularidade normal ≤ 5 células/mm³) e ENMG demonstrando polirradiculoneuropatia desmielinizante.",
        "Pista 5/5: Monitoramento ventilatório rigoroso (pelo risco de paralisia diafragmática) e tratamento específico de escolha: Imunoglobulina Humana IV (0,4 g/kg/dia por 5 dias) ou Plasmaférese. Corticoides NÃO têm eficácia na SGB!",
      ],
      differentials: [
        {
          name: "Mielite transversa aguda / Compressão medular",
          distinction:
            "Cursam com NÍVEL SENSITIVO bem definido no tronco, retenção urinária precoce (bexiga neurogênica) e evolução para hiperreflexia/sinal de Babinski.",
        },
        {
          name: "Miastenia Gravis",
          distinction:
            "Fraqueza flutuante que piora ao longo do dia (fatigabilidade), predomínio ocular/bulbar inicial e reflexos profundos PRESERVADOS.",
        },
      ],
      management:
        "1. Internação hospitalar com monitoramento contínuo da função respiratória (espirometria à beira-leito: Capacidade Vital < 20 mL/kg ou PImáx < -30 cmH2O indicam intubação eletiva) e monitorização cardíaca (risco de disautonomia grave).\n2. Tratamento imunomodulador específico (eficácia equivalente entre os dois):\n   - Imunoglobulina Humana IV (IGIV): 0,4 g/kg/dia por 5 dias (total 2 g/kg); OU\n   - Plasmaférese (4 a 5 sessões em dias alternados).\n3. Profilaxia de TEV e fisioterapia motora/respiratória.",
      pearls: [
        "Dissociação proteíno-citológica no líquor = muita proteína + células normais (pode estar ausente na 1ª semana e surge a partir da 2ª semana).",
        "Corticosteroides (orais ou pulsoterapia IV) NÃO funcionam na Síndrome de Guillain-Barré!",
      ],
    },
  },
  {
    id: "case-214-porfiria-intermitente",
    caseNumber: 214,
    date: "28/11/2026",
    diagnosis: "Porfiria aguda intermitente",
    acceptedSynonyms: [
      "porfiria aguda intermitente",
      "porfiria aguda",
      "pai",
      "crise de porfiria aguda",
    ],
    specialty: "Clínica Médica / Neurologia",
    difficulty: "Difícil",
    clues: [
      "Mulher de 26 anos dá entrada na emergência com dor abdominal excruciante difusa, vômitos, taquicardia e agitação psicomotora iniciados há 2 dias.",
      "A paciente relata que já esteve em três prontos-socorros no último ano com crises semelhantes, tendo inclusive realizado apendicectomia branca (apêndice normal) há 8 meses. Conta que esta crise começou 3 dias após iniciar uma dieta restritiva severa (jejum prolongado) e uso de sulfametoxazol-trimetoprima para infecção urinária.",
      "Exame físico: PA 168x104 mmHg, FC 124 bpm, afebril. Apesar da dor abdominal de intensidade 10/10 que exige opioides, o abdome é flácido e plano, sem defesa muscular e com descompressão brusca indolor. Exame neurológico revela fraqueza motora proximal nos quatro membros (grau 3/5) e hiporreflexia. Durante a coleta da urina por sonda vesical, a enfermagem nota que a bolsa coletora exposta à luz ambiente da janela adquiriu coloração vermelho-vinho escura.",
      "Tomografia de abdome e pelve com contraste: completamente normal. Exames laboratoriais: Sódio sérico 119 mEq/L (referência: 135 a 145 mEq/L), Leucócitos 7.200/mm³, Amilase 54 U/L. Dosagem urinária em amostra isolada protegida da luz: Ácido delta-aminolevulínico (ALA) 68 mg/g de creatinina (referência: < 4,5 mg/g) e Porfobilinogênio (PBG) urinário 95 mg/g de creatinina (referência: < 2,0 mg/g).",
      "Suspendeu-se imediatamente o antibiótico sulfonamídico, iniciou-se aporte calórico elevado com glicose hipertônica intravenosa (400 g/dia) e infusão do tratamento específico inibidor da ALA-sintetase 1 (hemina humana / hematina IV), ocorrendo remissão completa da dor abdominal e da paresia em 72 horas.",
    ],
    debriefing: {
      overview:
        "A Porfiria Aguda Intermitente (PAI) é um erro inato autossômico dominante da biossíntese do grupo heme causado pela deficiência da enzima porfobilinogênio deaminase (PBG-D / hidroximetilbilano sintase). Fatores indutores do citocromo P450 hepático (fármacos porfirinogênicos como sulfas, barbitúricos e anticonvulsivantes, jejum, álcool ou fase lútea menstrual) estimulam a enzima ALA-sintetase 1 (ALAS1), provocando acúmulo neurotóxico de ALA e PBG.",
      clueBreakdown: [
        "Vinheta clínica: Mulher jovem com dor abdominal aguda grave, sintomas autonômicos (taquicardia) e neuropsiquiátricos.",
        "Pista 2/5: História clássica de laparotomias brancas prévias por 'abdome agudo' inexplicado e desencadeamento típico por jejum calórico + fármaco indutor de CYP450 (sulfonamida).",
        "Pista 3/5: Dissociação clínica marcante (dor abdominal excruciante neuropática SEM sinais de irritação peritoneal ao exame físico), disautonomia (HAS + taquicardia), neuropatia motora periférica e escurecimento da urina para cor de vinho do Porto/mogno após exposição à luz e ao ar.",
        "Pista 4/5: TC de abdome normal, hiponatremia importante (por SIADH induzida pela lesão hipotalâmica neurovisceral) e o exame diagnóstico padrão-ouro na crise: elevação maciça de Porfobilinogênio (PBG) e Ácido delta-aminolevulínico (ALA) na urina.",
        "Pista 5/5: O tratamento da crise aguda consiste em suspender os gatilhos, fornecer sobrecarga de glicose IV (300-400 g/dia) e infundir Hemina humana (hematina/arginato de heme IV), que reprime por feedback negativo a transcrição da enzima hepática ALAS1.",
      ],
      differentials: [
        {
          name: "Intoxicação por chumbo (Saturnismo)",
          distinction:
            "O chumbo inibe a ALA-desidratase e a ferroquelatase (elevando ALA e protoporfirina, com dor abdominal e neuropatia), mas o Porfobilinogênio (PBG) urinário é NORMAL e há anemia com pontilhado basófilo.",
        },
        {
          name: "Síndrome de Guillain-Barré",
          distinction:
            "Também causa tetraparesia flácida, mas não cursa com crises recorrentes de dor abdominal visceral excruciante nem PBG urinário elevado.",
        },
      ],
      management:
        "1. Suspender imediatamente todos os fármacos porfirinogênicos (sulfas, fenitoína, fenobarbital, carbamazepina, metoclopramida, etc.).\n2. Terapia específica de 1ª linha na crise moderada/grave: Hemina humana (Hematina / Normosang) 3 a 4 mg/kg/dia IV por 4 dias.\n3. Aporte de carboidratos/glicose (300-400 g/dia) monitorando rigorosamente a hiponatremia.\n4. Analgesia com opioides (morfina/fentanil são seguros) e betabloqueador (propranolol) para controlar a taquicardia e hipertensão autonômicas.",
      pearls: [
        "Tríade da Porfiria Aguda Intermitente: Dor abdominal sem peritonite + Sintomas neuropsiquiátricos/neuropatia motora + Urina que escurece à luz (com hiponatremia por SIADH).",
        "Exame de confirmação na crise aguda: Porfobilinogênio (PBG) e ALA urinários.",
      ],
    },
  },
  {
    id: "case-215-pneumotorax-hipertensivo",
    caseNumber: 215,
    date: "29/11/2026",
    diagnosis: "Pneumotórax hipertensivo",
    acceptedSynonyms: [
      "pneumotorax hipertensivo",
      "pneumotorax sob tensao",
    ],
    specialty: "Cirurgia do Trauma / Emergência",
    difficulty: "Fácil",
    clues: [
      "Motociclista de 24 anos dá entrada na sala vermelha vítima de colisão frontal há 20 minutos, apresentando dispneia extrema, cianose e agitação intensa.",
      "A equipe do SAMU relata que o paciente colidiu o tórax contra o guidão da moto e, durante o transporte, evoluiu com piora rápida do desconforto respiratório e queda progressiva da pressão arterial.",
      "Exame físico primário (ABCDE): Via aérea pérvia com colar cervical. PA 72x44 mmHg, FC 138 bpm, FR 38 irpm, SpO2 79% sob máscara de O2 a 15 L/min. Observa-se turgência jugular patológica bilateral, desvio da traqueia para a esquerda, expansibilidade abolida no hemitórax direito, hipertimpanismo à percussão e ausência completa de murmúrio vesicular à direita.",
      "Ultrassonografia point-of-care (e-FAST) realizada em 15 segundos na sala de trauma: ausência de deslizamento pleural (lung sliding) no hemitórax direito, presença do 'sinal do código de barras' (sinal da estratosfera) no modo M e ausência de líquido livre no pericárdio. A equipe decidiu NÃO aguardar a realização de radiografia de tórax.",
      "Realizou-se descompressão torácica imediata com agulha calibrosa (toracocentese de alívio), ouvindo-se saída audível de ar sob alta pressão e elevação imediata da PA para 112x74 mmHg, seguida de drenagem torácica fechada em selo d'água no 5º espaço intercostal direito.",
    ],
    debriefing: {
      overview:
        "O pneumotórax hipertensivo ocorre quando um mecanismo valvar unidirecional permite a entrada de ar no espaço pleural a cada inspiração sem possibilitar sua saída na expiração. O aumento progressivo da pressão intrapleural colapsa o pulmão homolateral, desvia o mediastino para o lado oposto e angula as veias cavas, bloqueando o retorno venoso ao coração direito e causando choque obstrutivo rapidamente letal.",
      clueBreakdown: [
        "Vinheta clínica: Trauma torácico fechado com insuficiência respiratória aguda grave e evolução rápida na sala de emergência.",
        "Pista 2/5: Deterioração respiratória associada a instabilidade hemodinâmica (choque) minutos após o trauma torácico.",
        "Pista 3/5: Quadro clínico clássico e completo: choque obstrutivo (PA 72x44 + turgência jugular) + desvio contralateral da traqueia + tríade pleural à direita (murmúrio vesicular abolido + hipertimpanismo à percussão + expansibilidade reduzida).",
        "Pista 4/5: O diagnóstico do pneumotórax hipertensivo é CLÍNICO (nunca se deve atrasar a descompressão para pedir raio-X de tórax!). O e-FAST à beira-leito mostra ausência de lung sliding e sinal do código de barras/estratosfera no modo M, afastando tamponamento cardíaco.",
        "Pista 5/5: Conduta imediata salvadora: Toracocentese descompressiva de alívio com jelco calibroso (no adulto pelo ATLS 10ª ed.: 4º ou 5º espaço intercostal na linha axilar anterior; na criança: 2º EIC na linha hemiclavicular), seguida obrigatoriamente do tratamento definitivo com drenagem torácica em selo d'água no 5º EIC.",
      ],
      differentials: [
        {
          name: "Tamponamento cardíaco",
          distinction:
            "Também causa choque obstrutivo com turgência jugular (Tríade de Beck: hipotensão + turgência jugular + bulhas abafadas), mas o murmúrio vesicular é SIMÉTRICO bilateralmente e a percussão torácica não é hipertimpânica.",
        },
        {
          name: "Hemotórax maciço",
          distinction:
            "Murmúrio vesicular abolido no lado acometido, porém com MACICEZ à percussão (e não hipertimpanismo) e jugulares colabadas pelo choque hipovolêmico.",
        },
      ],
      management:
        "1. Diagnóstico 100% clínico no exame primário (letra B do ABCDE).\n2. Medida imediata: Toracocentese de alívio (descompressão com agulha no 5º EIC na linha axilar anterior no adulto, ou 2º EIC na linha hemiclavicular em crianças).\n3. Tratamento definitivo imediato a seguir: Toracostomia com dreno tubular em selo d'água no 5º EIC (entre as linhas axilar anterior e média).",
      pearls: [
        "Pedir radiografia de tórax diante de um pneumotórax hipertensivo é erro grave — o diagnóstico é clínico e a descompressão é imediata!",
        "Hipertimpanismo + Jugular túrgida = Pneumotórax hipertensivo; Macicez + Jugular colabada = Hemotórax maciço; MV presente bilateral + Jugular túrgida + Bulhas abafadas = Tamponamento cardíaco.",
      ],
    },
  },
  {
    id: "case-216-lupus-nefrite",
    caseNumber: 216,
    date: "30/11/2026",
    diagnosis: "Lúpus eritematoso sistêmico",
    acceptedSynonyms: [
      "lupus eritematoso sistemico",
      "les",
      "nefrite lupica",
      "lupus",
    ],
    specialty: "Reumatologia / Nefrologia",
    difficulty: "Fácil",
    clues: [
      "Mulher de 23 anos procura atendimento médico por inchaço progressivo nas pernas e ao redor dos olhos, urina espumosa e dores articulares nas mãos e punhos há 6 semanas.",
      "Ela relata que nos últimos 3 meses apresentou queda acentuada de cabelo, úlceras indolores no céu da boca e vermelhidão no rosto sempre que se expõe ao sol, além de dor torácica ventilatório-dependente à direita na última semana.",
      "Exame físico: PA 152x96 mmHg, FC 92 bpm. Observa-se eritema malar em 'asa de borboleta' poupando os sulcos nasolabiais, placas de alopecia não cicatricial e duas úlceras orais indolores no palato duro. Artrite simétrica não erosiva em interfalangianas proximais e punhos. Ausculta pulmonar com redução do murmúrio vesicular na base direita. Edema de membros inferiores 2+/4+ com cacifo.",
      "Exames laboratoriais: Hb 9,4 g/dL (Coombs direto positivo), Leucócitos 3.100/mm³ com Linfócitos 900/mm³, Plaquetas 98.000/mm³. Creatinina 1,6 mg/dL, Urina 1 com proteinúria 3+, 45 hemácias dismórficas/campo e cilindros hemáticos; Proteinúria de 24h: 3,8 g/24h. FAN nuclear homogêneo 1:1.280; Anti-dsDNA (DNA nativo) fortemente positivo; Anti-Sm positivo; C3 42 mg/dL (referência: 90 a 180 mg/dL) e C4 6 mg/dL (referência: 10 a 40 mg/dL).",
      "A biópsia renal revelou glomerulonefrite proliferativa difusa (Classe IV) com depósitos subendoteliais em 'alça de arame'. Iniciou-se hidroxicloroquina associada a pulsoterapia com metilprednisolona e terapia imunossupressora de indução com micofenolato de mofetila.",
    ],
    debriefing: {
      overview:
        "O Lúpus Eritematoso Sistêmico (LES) é uma doença autoimune multissistêmica mediada por múltiplos autoanticorpos e deposição de imunocomplexos com consumo da via clássica do complemento, acometendo preferencialmente mulheres jovens em idade fértil.",
      clueBreakdown: [
        "Vinheta clínica: Mulher jovem com síndrome nefrítica/nefrótica (edema periorbitário, hipertensão e urina espumosa) associada a poliartrite simétrica de pequenas articulações.",
        "Pista 2/5: Manifestações mucocutâneas clássicas dos critérios EULAR/ACR: fotossensibilidade, alopecia não cicatricial, úlceras orais indolores e serosite (pleurite).",
        "Pista 3/5: O clássico rash malar em 'asa de borboleta' que POUPA o sulco nasogeniano (diferenciando da dermatomiosite, que acomete o sulco), úlceras em palato duro, artrite não erosiva e derrame pleural.",
        "Pista 4/5: Pancitopenia autoimune (anemia hemolítica Coombs+, leucopenia/linfopenia e plaquetopenia), glomerulonefrite ativa (hematúria dismórfica, cilindros hemáticos e proteinúria de 3,8 g/24h), FAN em altos títulos, anticorpos altamente específicos (Anti-Sm = mais específico; Anti-dsDNA = correlaciona com nefrite e atividade de doença) e hipocomplementemia (consumo de C3 e C4).",
        "Pista 5/5: A Nefrite Lúpica Classe IV (Proliferativa Difusa) é a forma mais comum e grave de acometimento renal no LES, tratada com Hidroxicloroquina (para todos os pacientes com LES) + indução com Corticoide em altas doses + Micofenolato de Mofetila (ou Ciclofosfamida IV).",
      ],
      differentials: [
        {
          name: "Artrite Reumatoide",
          distinction:
            "Causa poliartrite simétrica crônica EROSIVA e deformante, sem rash malar, nefrite proliferativa por anti-dsDNA ou consumo de complemento.",
        },
        {
          name: "Dermatomiosite",
          distinction:
            "Cursa com fraqueza muscular proximal, pápulas de Gottron, heliótropo e eritema facial que NÃO poupa o sulco nasolabial.",
        },
      ],
      management:
        "1. Base para todo paciente com LES: Fotoproteção + Hidroxicloroquina (reduz flares, risco trombótico e mortalidade).\n2. Nefrite Lúpica Classe III ou IV (Proliferativa): Terapia de Indução (pulsoterapia com Metilprednisolona 0,5-1 g IV por 3 dias seguida de Prednisona oral + Micofenolato de Mofetila ou Ciclofosfamida IV) seguida de Terapia de Manutenção (Micofenolato ou Azatioprina) + IECA/BRA antiproteinúrico.",
      pearls: [
        "Anticorpo mais ESPECÍFICO do LES: Anti-Sm.",
        "Anticorpo que marca ATIVIDADE da Nefrite Lúpica (junto à queda de C3/C4): Anti-DNA dupla hélice (anti-dsDNA).",
        "O eritema malar do Lúpus POUPA o sulco nasolabial.",
      ],
    },
  },
  {
    id: "case-217-doenca-de-wilson",
    caseNumber: 217,
    date: "01/12/2026",
    diagnosis: "Doença de Wilson",
    acceptedSynonyms: [
      "doenca de wilson",
      "degeneracao hepatolenticular",
    ],
    specialty: "Gastroenterologia / Neurologia",
    difficulty: "Difícil",
    clues: [
      "Jovem de 21 anos é levado ao ambulatório de clínica médica por tremor progressivo nas mãos, dificuldade para falar, queda brusca no rendimento universitário e irritabilidade há 6 meses.",
      "Os pais relatam que ele apresentou um episódio de icterícia inexplicada há 2 anos, atribuído na época a uma hepatite aguda não esclarecida. Nos últimos meses, sua letra tornou-se ilegível, a fala ficou arrastada, surgiu baba constante e ele passou a apresentar mudanças abruptas de humor e comportamento impulsivo.",
      "Exame físico: Paciente com fácies com sorriso fixo ('risus sardonicus'), disartria, bradicinesia, distonia nos membros superiores e tremor postural em 'bater de asas'. Fígado impalpável e baço palpável a 3 cm do rebordo costal esquerdo. Ao exame oftalmológico na lâmpada de fenda, observa-se anel castanho-esverdeado bilateral na periferia da córnea (membrana de Descemet).",
      "Exames laboratoriais: AST 118 U/L, ALT 134 U/L, Bilirrubina total 2,8 mg/dL (predomínio indireto, com Coombs direto negativo), Plaquetas 92.000/mm³. Sorologias virais (HBsAg, Anti-HCV) e autoanticorpos (FAN, antimúsculo liso): negativos. Ceruloplasmina sérica: 6 mg/dL (referência: 20 a 60 mg/dL). Excreção urinária de cobre em 24h: 380 mcg/24h (referência: < 40 mcg/24h). RM de encéfalo: hipersinal bilateral e simétrico nos núcleos da base (putâmen e tálamo) e mesencéfalo em T2 ('sinal da face do panda gigante').",
      "Iniciou-se terapia quelante específica com D-penicilamina (associada à piridoxina) e acetato de zinco oral, além de orientação para evitar alimentos ricos em cobre (fígado, mariscos, chocolate, nozes e cogumelos), com melhora gradual do quadro extrapiramidal.",
    ],
    debriefing: {
      overview:
        "A Doença de Wilson (degeneração hepatolenticular) é um distúrbio autossômico recessivo do metabolismo do cobre causado por mutações no gene ATP7B (cromossomo 13). O defeito na proteína ATP7B impede tanto a excreção biliar do cobre quanto sua incorporação à apoceruloplasmina no fígado, levando ao acúmulo tóxico de cobre livre nos hepatócitos (hepatite crônica/cirrose), nos núcleos da base (síndrome extrapiramidal/parkinsonismo/distonia), no córtex cerebral (sintomas psiquiátricos) e na córnea.",
      clueBreakdown: [
        "Vinheta clínica: Jovem (< 35-40 anos) com combinação de síndrome extrapiramidal (tremor, disartria) e alterações neuropsiquiátricas/cognitivas.",
        "Pista 2/5: A associação clássica de hepatopatia prévia não explicada na adolescência + disartria, sialorreia, micrografia e alterações comportamentais.",
        "Pista 3/5: Síndrome extrapiramidal completa (distonia, bradicinesia, tremor em bater de asas), esplenomegalia (hipertensão portal por cirrose) e o achado patognomônico à lâmpada de fenda: Anel de Kayser-Fleischer (depósito de cobre na membrana de Descemet da córnea, presente em ~95-99% dos pacientes com manifestações neurológicas).",
        "Pista 4/5: Transaminases elevadas com anemia hemolítica Coombs-negativa (pela liberação de cobre livre na circulação), Ceruloplasmina sérica muito baixa (< 20 mg/dL), Cobre urinário de 24h muito elevado (> 100 mcg/24h) e o clássico 'Sinal da Face do Panda Gigante' no mesencéfalo/núcleos da base à RM de crânio.",
        "Pista 5/5: Tratamento vitalício com quelantes de cobre que aumentam sua excreção urinária (D-penicilamina ou Trientina) e Sais de Zinco (que induzem a metalotioneína nos enterócitos, bloqueando a absorção intestinal de cobre).",
      ],
      differentials: [
        {
          name: "Hepatite Autoimune",
          distinction:
            "Também acomete jovens com evolução para cirrose, mas cursa com hipergamaglobulinemia IgG, FAN/antimúsculo liso positivos e ceruloplasmina normal, sem anel de Kayser-Fleischer.",
        },
        {
          name: "Doença de Huntington",
          distinction:
            "Cursa com coreia, alterações psiquiátricas e demência (herança autossômica dominante), sem hepatopatia, sem anel de Kayser-Fleischer e com ceruloplasmina normal.",
        },
      ],
      management:
        "1. Quelantes de cobre (fase inicial e sintomáticos): D-Penicilamina (sempre suplementar Vitamina B6 / Piridoxina) ou Trientina.\n2. Bloqueador da absorção intestinal de cobre (manutenção ou pré-sintomáticos): Acetato ou Sulfato de Zinco.\n3. Dieta restrita em alimentos ricos em cobre (fígado, mariscos, chocolate, cogumelos, castanhas).\n4. Transplante hepático (cura o defeito metabólico nos casos de insuficiência hepática aguda fulminante ou cirrose descompensada refratária).",
      pearls: [
        "Hepatopatia + Distúrbio de movimento/psiquiátrico em jovem < 40 anos + Anemia hemolítica Coombs-negativa = Doença de Wilson!",
        "Tríade diagnóstica: Anel de Kayser-Fleischer + Ceruloplasmina baixa (< 20 mg/dL) + Cobre urinário de 24h alto (> 100 mcg/24h).",
      ],
    },
  },
  {
    id: "case-218-tep-agudo",
    caseNumber: 218,
    date: "02/12/2026",
    diagnosis: "Tromboembolismo pulmonar",
    acceptedSynonyms: [
      "tromboembolismo pulmonar",
      "tep",
      "embolia pulmonar",
      "tep agudo",
    ],
    specialty: "Pneumologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Mulher de 48 anos chega ao pronto-socorro com falta de ar súbita, dor torácica à direita que piora ao respirar fundo e sensação de desmaio há 2 horas.",
      "A paciente foi submetida a artroplastia total de joelho direito há 12 dias e permaneceu a maior parte do tempo acamada em casa. Relata que hoje pela manhã, ao caminhar até o banheiro, sentiu falta de ar abrupta acompanhada de um episódio de tosse com laivos de sangue vivo.",
      "Exame físico: Paciente ansiosa, taquipneica, PA 108x70 mmHg, FC 118 bpm, FR 30 irpm, SpO2 88% em ar ambiente. Ausculta pulmonar completamente limpa bilateralmente. Ausculta cardíaca com hiperfonese de B2 em foco pulmonar. No membro inferior direito, observa-se edema assimétrico da panturrilha (+4 cm de circunferência em relação à esquerda), empastamento muscular e dor à dorsiflexão passiva do pé.",
      "Exames complementares: Gasometria arterial em ar ambiente: pH 7,47, pO2 56 mmHg, pCO2 29 mmHg (hipoxemia com alcalose respiratória). ECG: taquicardia sinusal e padrão S1Q3T3 com inversão de onda T de V1 a V3. Radiografia de tórax: transparência pulmonar preservada com discreta oligoemia focal no lobo inferior direito (sinal de Westermark) e opacidade triangular periférica de base pleural (corcova de Hampton). Troponina e BNP discretamente elevados.",
      "Dado o alto escore de probabilidade clínica (Escore de Wells = 9 pontos), realizou-se imediatamente Angiotomografia Computadorizada de Artérias Pulmonares, que confirmou falha de enchimento oclusiva na artéria pulmonar lobar inferior direita, iniciando-se anticoagulação plena imediata.",
    ],
    debriefing: {
      overview:
        "O Tromboembolismo Pulmonar (TEP) decorre da migração de trombos venosos profundos (geralmente do sistema venoso profundo dos membros inferiores — TVP) para a árvore arterial pulmonar, gerando espaço morto alveolar (ventilação sem perfusão), hipoxemia, aumento abrupto da pós-carga do ventrículo direito e, nos casos maciços, choque obstrutivo.",
      clueBreakdown: [
        "Vinheta clínica: Dispneia de início súbito associada a dor torácica pleurítica (ventilatório-dependente) e pré-síncope.",
        "Pista 2/5: Tríade de Virchow clássica no pós-operatório ortopédico (artroplastia de joelho + imobilização) associada a hemoptise.",
        "Pista 3/5: Dissociação clínico-auscultatória clássica (dispneia, taquipneia FR 30 e hipoxemia SpO2 88% com ausculta pulmonar LIMPA) + sinais clínicos francos de TVP em panturrilha direita (assimetria > 3 cm, empastamento e sinal de Homans).",
        "Pista 4/5: Gasometria típica (hipoxemia + hipocapnia/alcalose respiratória pela hiperventilação), ECG com taquicardia sinusal (achado mais comum) e S1Q3T3 (achado clássico de sobrecarga aguda de VD) e sinais radiográficos clássicos (Westermark = oligoemia focal; Corcova de Hampton = infarto pulmonar periférico em cunha).",
        "Pista 5/5: Em pacientes com alta probabilidade pré-teste pelo Escore de Wells (> 4 pontos), não se perde tempo com D-dímero: solicita-se diretamente o exame padrão-ouro (Angio-TC de artérias pulmonares) e inicia-se anticoagulação plena.",
      ],
      differentials: [
        {
          name: "Pneumonia bacteriana comunitária",
          distinction:
            "Evolução mais gradual com febre, tosse produtiva purulenta, estertores crepitantes localizados e consolidação com broncograma aéreo ao raio-X.",
        },
        {
          name: "Pneumotórax espontâneo",
          distinction:
            "Também causa dispneia e dor pleurítica súbitas, mas o murmúrio vesicular está abolido no hemitórax acometido com linha pleural visível ao raio-X.",
        },
      ],
      management:
        "1. Oxigenoterapia suplementar se SpO2 < 90%.\n2. Avaliação da probabilidade pré-teste (Escore de Wells):\n   - Baixa/Intermediária (≤ 4): Dosar D-dímero (alto valor preditivo negativo para excluir TEP).\n   - Alta (> 4): Angio-TC de tórax direta e início imediato de anticoagulação.\n3. TEP estável hemodinamicamente: Anticoagulação plena (Enoxaparina 1 mg/kg SC 12/12h, ou DOACs como Rivaroxabana/Apixabana).\n4. TEP Maciço / Alto Risco (com hipotensão PAS < 90 mmHg ou choque obstrutivo): Trombólise sistêmica com Alteplase (rt-PA 100 mg IV em 2h) ou trombectomia.",
      pearls: [
        "Alteração eletrocardiográfica MAIS COMUM no TEP: Taquicardia sinusal.",
        "Alteração eletrocardiográfica MAIS CLÁSSICA de sobrecarga aguda de VD no TEP: Padrão S1Q3T3.",
        "Dispneia súbita + Hipoxemia + Ausculta pulmonar limpa em pós-operatório = TEP até que se prove o contrário!",
      ],
    },
  },
  {
    id: "case-219-arterite-celulas-gigantes",
    caseNumber: 219,
    date: "03/12/2026",
    diagnosis: "Arterite de células gigantes",
    acceptedSynonyms: [
      "arterite temporal",
      "arterite de celulas gigantes",
      "doenca de horton",
    ],
    specialty: "Reumatologia / Neurologia / Oftalmologia",
    difficulty: "Médio",
    clues: [
      "Mulher de 71 anos procura atendimento de urgência por cefaleia nova em região temporal direita nas últimas 3 semanas e episódio súbito de escurecimento visual no olho direito hoje pela manhã.",
      "Ela relata que sente dor intensa no couro cabeludo ao pentear os cabelos e que, ao mastigar alimentos sólidos como carne, sente fadiga e dor na mandíbula que a obrigam a parar de mastigar. Nos últimos 2 meses, também vem apresentando rigidez matinal dolorosa nos ombros e quadris e febre baixa.",
      "Exame físico: PA 136x80 mmHg, FC 84 bpm, Tax 37,6°C. À inspeção e palpação craniana, a artéria temporal superficial direita encontra-se espessada, tortuosa, nodular, intensamente dolorosa à palpação e com pulso diminuído. Mobilização ativa da cintura escapular limitada pela dor. Fundoscopia direita mostra edema pálido do disco óptico.",
      "Exames laboratoriais: VHS 104 mm/1ªh (referência: < 20 mm/1ªh), PCR 92 mg/L (referência: < 5 mg/L), Hemoglobina 10,1 g/dL (normocítica e normocrômica), Plaquetas 490.000/mm³. CPK sérica: 78 U/L (referência: 39 a 308 U/L). Ultrassonografia com Doppler das artérias temporais: presença do 'sinal do halo' hipoecoico concêntrico ao redor da luz arterial.",
      "Iniciou-se imediatamente pulsoterapia intravenosa com metilprednisolona 1 g/dia por 3 dias no próprio pronto-socorro para proteger a visão do olho contralateral, sem aguardar a realização da biópsia da artéria temporal, que foi realizada 48 horas depois e revelou infiltrado granulomatoso transmural com células gigantes multinucleadas na lâmina elástica interna.",
    ],
    debriefing: {
      overview:
        "A Arterite de Células Gigantes (Arterite Temporal ou Doença de Horton) é a vasculite sistêmica primária de grandes e médios vasos mais comum em adultos acima de 50 anos, acometendo preferencialmente os ramos extracranianos da artéria carótida (artéria temporal superficial, facial/maxilar e artéria oftálmica/ciliares posteriores), sendo uma emergência oftalmológica pelo risco de cegueira irreversível por Neuropatia Óptica Isquêmica Anterior Arterítica (NOIA-A).",
      clueBreakdown: [
        "Vinheta clínica: Cefaleia nova em paciente > 50 anos associada a amaurose fugaz/perda visual aguda é red flag absoluto para arterite temporal.",
        "Pista 2/5: Hiperestesia do couro cabeludo (dor ao pentear o cabelo), o sintoma mais específico da doença — Claudicação Mandibular (isquemia dos músculos mastigatórios ao mastigar) — e associação em 40-50% dos casos com Polimialgia Reumática (dor e rigidez na cintura escapular e pélvica).",
        "Pista 3/5: Artéria temporal espessada, dolorosa e hipopulsátil, além de edema pálido da papila óptica (isquemia da cabeça do nervo óptico pelas artérias ciliares posteriores).",
        "Pista 4/5: Elevação dramática das provas inflamatórias (VHS > 50-100 mm/1ªh e PCR elevada), anemia de doença crônica, CPK normal (a Polimialgia Reumática associada cursa com dor nos ombros/quadris mas enzimas musculares NORMAIS, diferente da polimiosite) e 'sinal do halo' ao Doppler temporal.",
        "Pista 5/5: Diante de sintomas visuais, inicia-se Corticoterapia em altas doses IMEDIATAMENTE (sem esperar a biópsia da artéria temporal, que permanece positiva por até 2 semanas após início do corticoide) para evitar cegueira bilateral.",
      ],
      differentials: [
        {
          name: "Arterite de Takayasu",
          distinction:
            "Também é vasculite granulomatosa de grandes vasos, mas acomete mulheres JOVENS (< 40 anos), causando 'doença sem pulso' nos membros superiores e sopros subclávios.",
        },
        {
          name: "Neuralgia do trigêmeo",
          distinction:
            "Dor facial em choque elétrico paroxístico de segundos de duração, com VHS normal e sem perda visual ou claudicação mandibular.",
        },
      ],
      management:
        "1. Emergência oftalmológica: Iniciar corticoterapia IMEDIATAMENTE na suspeita clínica (antes mesmo da biópsia):\n   - Com sintomas visuais (amaurose fugaz ou perda visual): Pulsoterapia com Metilprednisolona 500-1.000 mg IV/dia por 3 dias, seguida de Prednisona 1 mg/kg/dia.\n   - Sem sintomas visuais: Prednisona oral 40-60 mg/dia.\n2. Confirmar diagnóstico com Biópsia da Artéria Temporal (padrão-ouro histopatológico) ou USG Doppler com sinal do halo.\n3. Tocilizumabe (anti-IL-6) pode ser associado como poupador de corticoide.",
      pearls: [
        "Sintoma mais específico da Arterite Temporal: Claudicação de mandíbula.",
        "Complicação mais temida: Cegueira irreversível por Neuropatia Óptica Isquêmica Anterior (NOIA) -> NUNCA atrase o corticoide esperando a biópsia!",
      ],
    },
  },
];

export const MEDICAL_DIAGNOSES_CATALOG: string[] = Array.from(
  new Set([
    ...BUILTIN_PROGRESSIVE_CASES.map((c) => c.diagnosis),
    "Abscesso cerebral",
    "Abscesso hepático amebiano",
    "Abscesso pulmonar",
    "Acalasia idiopática (Megaesôfago chagásico)",
    "Acidente botrópico",
    "Acidente crotálico",
    "Acidente elapídico",
    "Acidente laquético",
    "Acidente loxoscélico (Aranha-marrom)",
    "Acidente vascular cerebral hemorrágico",
    "Acidente vascular cerebral isquêmico",
    "Acidose tubular renal",
    "Acromegalia",
    "Adenocarcinoma de cólon",
    "Adenocarcinoma gástrico",
    "Adenoma hipofisário (Prolactinoma)",
    "Amiloidose sistêmica",
    "Anemia aplásica",
    "Anemia falciforme (Crise vaso-oclusiva)",
    "Anemia ferropriva",
    "Anemia hemolítica autoimune",
    "Anemia megaloblástica (Deficiência de B12)",
    "Aneurisma de aorta abdominal roto",
    "Angina instável",
    "Apendicite aguda",
    "Arterite de células gigantes",
    "Arterite de Takayasu",
    "Artrite gotosa aguda (Gota)",
    "Artrite reativa (Síndrome de Reiter)",
    "Artrite reumatoide",
    "Artrite séptica",
    "Asma aguda grave",
    "Aspergilose broncopulmonar alérgica",
    "Aspergilose invasiva",
    "Bartolinite aguda",
    "Bloqueio atrioventricular total (BAVT)",
    "Botulismo alimentar",
    "Bronquiolite viral aguda",
    "Brucelose",
    "Câncer de pulmão (Síndrome da veia cava superior)",
    "Carcinoma hepatocelular",
    "Cardiomiopatia de Takotsubo",
    "Cardiomiopatia hipertrófica obstrutiva",
    "Cefaleia em salvas",
    "Celulite infecciosa",
    "Cetoacidose diabética",
    "Choque anafilático",
    "Choque séptico",
    "Cirrose hepática descompensada",
    "Cistite aguda",
    "Coagulação intravascular disseminada (CIVD)",
    "Coarctação de aorta",
    "Colangite aguda grave",
    "Colangite biliar primária",
    "Colangite esclerosante primária",
    "Colecistite aguda calculosa",
    "Coledocolitíase",
    "Cólica nefrética (Urolitíase obstrutiva)",
    "Colite pseudomembranosa (Clostridioides difficile)",
    "Coqueluche",
    "Coreia de Sydenham",
    "Coriocarcinoma gestacional",
    "Crise adrenal aguda (Insuficiência adrenal primária)",
    "Crise miastênica",
    "Crise tireotóxica (Tempestade tireoidiana)",
    "Dengue grave",
    "Dermatomiosite",
    "Descolamento prematuro de placenta (DPP)",
    "Diabetes insipidus central",
    "Dissecção aguda de aorta",
    "Diverticulite aguda",
    "Divertículo de Meckel",
    "Doença celíaca",
    "Doença de Addison",
    "Doença de Behçet",
    "Doença de Chagas aguda",
    "Doença de Crohn",
    "Doença de Cushing",
    "Doença de Graves",
    "Doença de Huntington",
    "Doença de Kawasaki",
    "Doença de Lyme",
    "Doença de Ménière",
    "Doença de Paget óssea",
    "Doença de Parkinson",
    "Doença de Pompe",
    "Doença de Still do adulto",
    "Doença de von Willebrand",
    "Doença de Wilson",
    "Doença do refluxo gastroesofágico",
    "Doença inflamatória pélvica (DIP)",
    "Doença pulmonar obstrutiva crônica (DPOC exacerbada)",
    "Eclâmpsia",
    "Edema agudo de pulmão cardiogênico",
    "Embolia gordurosa",
    "Encefalite herpética",
    "Encefalopatia de Wernicke",
    "Encefalopatia hepática",
    "Endocardite infecciosa",
    "Endometriose profunda",
    "Epiglotite aguda",
    "Esclerose lateral amiotrófica (ELA)",
    "Esclerose múltipla",
    "Esclerose sistêmica (Esclerodermia)",
    "Espondilite anquilosante",
    "Esquistossomose mansônica",
    "Estado de mal epiléptico",
    "Estado hiperglicêmico hiperosmolar",
    "Estenose aórtica grave",
    "Estenose hipertrófica de piloro",
    "Estenose mitral reumática",
    "Fasceíte necrosante",
    "Febre amarela grave",
    "Febre maculosa brasileira",
    "Febre reumática aguda",
    "Febre tifoide (Salmonelose tífica)",
    "Feocromocitoma",
    "Fibrilação atrial com resposta ventricular rápida",
    "Fibrose cística",
    "Fibrose pulmonar idiopática",
    "Glaucoma agudo de ângulo fechado",
    "Glomerulonefrite pós-estreptocócica (GNPE)",
    "Granulomatose com poliangiite (Wegener)",
    "Gravidez ectópica rota",
    "Hanseníase virchowiana",
    "Hemorragia digestiva alta varicosa",
    "Hemorragia subaracnóidea espontânea",
    "Hemotórax maciço",
    "Hepatite A aguda",
    "Hepatite autoimune",
    "Hepatite B aguda",
    "Hiperaldosteronismo primário (Síndrome de Conn)",
    "Hiperparatireoidismo primário",
    "Hipertensão intracraniana idiopática",
    "Hipotireoidismo primário (Tireoidite de Hashimoto)",
    "Histoplasmose pulmonar",
    "Infarto agudo do miocárdio com supra de ST",
    "Infarto enteromesentérico (Isquemia mesentérica aguda)",
    "Insuficiência cardíaca descompensada",
    "Insuficiência renal aguda pré-renal",
    "Intoxicação por acetaminofeno (Paracetamol)",
    "Intoxicação por antidepressivos tricíclicos",
    "Intoxicação por benzodiazepínicos",
    "Intoxicação por betabloqueadores",
    "Intoxicação por chumbo (Saturnismo)",
    "Intoxicação por cocaína",
    "Intoxicação por digitálicos",
    "Intoxicação por lítio",
    "Intoxicação por metanol",
    "Intoxicação por monóxido de carbono",
    "Intoxicação por opioides",
    "Intoxicação por organofosforado",
    "Intoxicação por salicilatos (AAS)",
    "Intussuscepção intestinal",
    "Leishmaniose visceral (Calazar)",
    "Leptospirose (Síndrome de Weil)",
    "Leucemia linfoblástica aguda",
    "Leucemia mieloide aguda",
    "Leucemia promielocítica aguda (LMA-M3)",
    "Linfoma de Burkitt",
    "Linfoma de Hodgkin",
    "Lúpus eritematoso sistêmico",
    "Malária grave por Plasmodium falciparum",
    "Meningite criptocócica",
    "Meningite meningocócica",
    "Meningite pneumocócica",
    "Meningite tuberculosa",
    "Meningite viral",
    "Miastenia Gravis",
    "Mielite transversa aguda",
    "Mieloma múltiplo",
    "Miocardite viral aguda",
    "Mola hidatiforme completa",
    "Mononucleose infecciosa",
    "Necrose tubular aguda",
    "Nefrite intersticial aguda",
    "Nefropatia por IgA (Doença de Berger)",
    "Neuralgia do trigêmeo",
    "Neurocisticercose",
    "Neuropatia óptica isquêmica",
    "Neurotoxoplasmose",
    "Obstrução intestinal por bridas",
    "Osteomielite hematogênica aguda",
    "Pancreatite aguda biliar",
    "Pancreatite crônica",
    "Paracoccidioidomicose",
    "Pericardite aguda",
    "Peritonite bacteriana espontânea (PBE)",
    "Pielonefrite aguda",
    "Placenta prévia",
    "Pneumonia adquirida na comunidade",
    "Pneumonia por Pneumocystis jirovecii (Pneumocistose)",
    "Pneumotórax espontâneo primário",
    "Pneumotórax hipertensivo",
    "Poliarterite nodosa",
    "Policitemia vera",
    "Polimialgia reumática",
    "Polimiosite",
    "Porfiria aguda intermitente",
    "Pré-eclâmpsia grave",
    "Púrpura de Henoch-Schönlein (Vasculite por IgA)",
    "Púrpura trombocitopênica imune (PTI)",
    "Púrpura trombocitopênica trombótica",
    "Rabdomiólise por esforço",
    "Retocolite ulcerativa",
    "Sarcoidose pulmonar",
    "Sarcoma de Kaposi",
    "Sífilis secundária",
    "Síndrome colinérgica aguda",
    "Síndrome compartimental aguda",
    "Síndrome da lise tumoral",
    "Síndrome da secreção inapropriada de ADH (SIADH)",
    "Síndrome de Boerhaave (Ruptura esofágica espontânea)",
    "Síndrome de Brown-Séquard",
    "Síndrome de Budd-Chiari",
    "Síndrome de Churg-Strauss (GEPA)",
    "Síndrome de Cushing",
    "Síndrome de Dressler",
    "Síndrome de Evans",
    "Síndrome de Fitz-Hugh-Curtis",
    "Síndrome de Fournier",
    "Síndrome de Goodpasture",
    "Síndrome de Guillain-Barré",
    "Síndrome de HELLP",
    "Síndrome de Lambert-Eaton",
    "Síndrome de Marfan",
    "Síndrome de Mallory-Weiss",
    "Síndrome de Mirizzi",
    "Síndrome de Ogilvie",
    "Síndrome de ovários policísticos",
    "Síndrome de Sjögren",
    "Síndrome de Stevens-Johnson / NET",
    "Síndrome de Wolff-Parkinson-White",
    "Síndrome de Zollinger-Ellison",
    "Síndrome do anticorpo antifosfolípide (SAAF)",
    "Síndrome do choque tóxico",
    "Síndrome do desconforto respiratório agudo (SDRA)",
    "Síndrome hemolítico-urêmica (SHU)",
    "Síndrome hepatorrenal",
    "Síndrome nefrótica por lesões mínimas",
    "Síndrome neuroléptica maligna",
    "Síndrome serotoninérgica",
    "Tamponamento cardíaco",
    "Taquicardia supraventricular paroxística",
    "Taquicardia ventricular monomórfica",
    "Tétano acidental",
    "Tireoidite subaguda de De Quervain",
    "Torção anexial (Torção ovariana)",
    "Torção testicular",
    "Toxoplasmose congênita",
    "Trombose de seio venoso cerebral",
    "Trombose venosa profunda",
    "Tromboembolismo pulmonar",
    "Tuberculose pulmonar",
    "Úlcera péptica perfurada",
    "Volvo de sigmoide",
  ])
).sort((a, b) => a.localeCompare(b, "pt-BR"));

export function normalizeDiagnosisString(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDiagnosisMatch(
  guess: string,
  targetCase: ProgressiveClinicalCase
): boolean {
  const normGuess = normalizeDiagnosisString(guess);
  if (!normGuess) return false;

  const candidates = [
    targetCase.diagnosis,
    ...(targetCase.acceptedSynonyms || []),
  ].map(normalizeDiagnosisString);

  for (const cand of candidates) {
    if (!cand) continue;
    if (normGuess === cand) return true;
    // Allow substring match when guess contains the core diagnosis or vice-versa (min 5 chars)
    if (normGuess.length >= 6 && cand.length >= 6) {
      if (normGuess.includes(cand) || cand.includes(normGuess)) {
        return true;
      }
    }
  }
  return false;
}

export function getTodayFormattedDate(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function getTodayKey(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

export function getDailyClinicalCase(dateOverride?: string): ProgressiveClinicalCase {
  const now = new Date();
  const dateStr = dateOverride || getTodayFormattedDate();
  const dateKey = dateOverride ? dateOverride.replace(/\//g, "-") : getTodayKey();

  // Compute day-of-year number so each calendar day automatically gets a fresh case
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diffMs = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % BUILTIN_PROGRESSIVE_CASES.length;
  const selected = BUILTIN_PROGRESSIVE_CASES[index] || BUILTIN_PROGRESSIVE_CASES[0];

  return {
    ...selected,
    id: `daily-${dateKey}`,
    caseNumber: dayOfYear,
    date: dateStr,
  };
}
