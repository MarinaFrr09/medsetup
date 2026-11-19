import {
  getTodayFormattedDate,
  getTodayKey,
  normalizeDiagnosisString,
} from "./clinicalCasesBank";

export interface ProgressiveTreatmentCase {
  id: string;
  date: string;
  treatmentName: string;
  acceptedSynonyms: string[];
  specialty: string;
  difficulty: "Fácil" | "Médio" | "Difícil";
  sourceLabel?: string;
  clues: [string, string, string, string, string]; // [Cenário clínico, Pista 2/5, Pista 3/5, Pista 4/5, Pista 5/5]
  debriefing: {
    overview: string;
    clueBreakdown: [string, string, string, string, string];
    differentials: Array<{
      name: string;
      distinction: string;
    }>;
    protocolAndDoses: string;
    pearls: string[];
  };
}

export const BUILTIN_PROGRESSIVE_TREATMENTS: ProgressiveTreatmentCase[] = [
  {
    id: "treat-adrenalina-anafilaxia",
    date: "19/11/2026",
    treatmentName: "Adrenalina intramuscular na face anterolateral da coxa",
    acceptedSynonyms: [
      "adrenalina intramuscular",
      "epinefrina intramuscular",
      "adrenalina im",
      "epinefrina im",
      "adrenalina",
      "epinefrina",
    ],
    specialty: "Emergência / Alergia e Imunologia",
    difficulty: "Fácil",
    clues: [
      "Mulher de 26 anos inicia subitamente urticária generalizada, edema labial, rouquidão, sibilos intensos e sensação de desmaio 10 minutos após ingerir camarão.",
      "Na sala de emergência: PA 78x46 mmHg, FC 132 bpm, SpO2 89%, estridor laríngeo audível e tempo de enchimento capilar de 4 segundos. Anti-histamínicos e corticoides NÃO são a terapia de primeira linha salvadora de vida neste momento.",
      "A conduta imediata de primeira linha consiste na administração de uma catecolamina endógena por via intramuscular (músculo vasto lateral), evitando a via subcutânea (absorção errática) e reservando a via intravenosa apenas para choque refratário.",
      "A dose padrão no adulto é de 0,3 a 0,5 mg (0,3 a 0,5 mL da solução 1:1.000 = 1 mg/mL), podendo ser repetida a cada 5 a 15 minutos conforme resposta clínica.",
      "Sua ação simultânea em receptores alfa-1 (vasoconstrição e redução do edema de glote), beta-1 (aumento do débito cardíaco) e beta-2 (broncodilatação e inibição da degranulação de mastócitos) reverte rapidamente o choque anafilático.",
    ],
    debriefing: {
      overview:
        "A administração imediata de Adrenalina (Epinefrina) Intramuscular no músculo vasto lateral (face anterolateral da coxa) é a ÚNICA intervenção comprovadamente capaz de reduzir mortalidade na anafilaxia. Atrasar a adrenalina para fazer anti-histamínico ou corticoide é o principal erro fatal no manejo do choque anafilático.",
      clueBreakdown: [
        "Cenário clínico: Acometimento agudo de pele/mucosa + via aérea/respiratório + hipotensão após alérgeno = Anafilaxia.",
        "Pista 2/5: Sinais de gravidade imediata (choque + estridor laríngeo); corticoides e anti-histamínicos são apenas adjuvantes de ação lenta.",
        "Pista 3/5: Via IM no vasto lateral atinge pico plasmático em ~8 minutos (muito mais rápido e seguro que SC ou deltoide).",
        "Pista 4/5: Dose exata: 0,01 mg/kg (máximo 0,5 mg em adultos; 0,3 mg em crianças) da solução 1:1.000 sem diluir, IM.",
        "Pista 5/5: Efeito agonista α1 + β1 + β2 reverte simultaneamente vasodilatação, edema de via aérea, broncoespasmo e liberação de histamina.",
      ],
      differentials: [
        {
          name: "Hidrocortisona IV + Prometazina IM",
          distinction:
            "São medicações ADJUVANTES de segunda linha que levam horas para agir e NÃO revertem o choque distributivo nem o edema de glote agudo.",
        },
        {
          name: "Adrenalina intravenosa em bolus (1 mg)",
          distinction:
            "Dose de parada cardiorrespiratória! Dar 1 mg IV em bolus em paciente com pulso causa arritmias malignas, isquemia miocárdica e hemorragia cerebral.",
        },
      ],
      protocolAndDoses:
        "1. Adrenalina 1:1.000 (1 mg/mL) — 0,3 a 0,5 mg IM no vasto lateral da coxa imediatamente (repetir a cada 5-15 min se necessário).\n2. Decúbito dorsal com elevação dos membros inferiores, oxigênio suplementar e expansão volêmica com SF 0,9% (1-2 L rápido).\n3. Apenas APÓS adrenalina: bloqueador H1 (difenidramina) e corticoide (metilprednisolona/hidrocortisona) como adjuvantes.\n4. Observar por 4 a 8 horas (risco de reação bifásica).",
      pearls: [
        "Não existe contraindicação absoluta à Adrenalina IM na anafilaxia!",
        "Local de aplicação: músculo vasto lateral (terço médio da face anterolateral da coxa).",
      ],
    },
  },
  {
    id: "treat-cardioversao-sincronizada",
    date: "20/11/2026",
    treatmentName: "Cardioversão elétrica sincronizada",
    acceptedSynonyms: [
      "cardioversao eletrica sincronizada",
      "cardioversao eletrica",
      "cardioversao sincronizada",
      "cardioversao",
    ],
    specialty: "Cardiologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Homem de 66 anos chega à sala de emergência com palpitações súbitas há 30 minutos acompanhadas de dor torácica anginosa, sudorese fria e rebaixamento do nível de consciência.",
      "Ao monitor cardíaco: taquiarritmia de QRS estreito irregular com frequência ventricular de 175 bpm (Fibrilação Atrial de alta resposta ventricular), PA 74x42 mmHg e estertores pulmonares bibasais.",
      "Como o paciente apresenta critérios francos de INSTABILIDADE HEMODINÂMICA (os '5 Ds': Dor torácica, Dispneia/congestão, Diminuição da consciência, Desmaio/síncope ou Diminuição da PA), a tentativa de controle químico com amiodarona ou metoprolol está contraindicada como primeira medida.",
      "O tratamento imediato consiste na liberação de choque elétrico bifásico acoplado ao pico da onda R do monitor cardíaco (para evitar o período vulnerável da onda T e o fenômeno R-sobre-T que induziria fibrilação ventricular).",
      "Sempre que o nível de consciência permitir, realiza-se sedação e analgesia breves (ex: etomidato ou midazolam + fentanil) segundos antes do disparo sincronizado (120 a 200 J na FA bifásica; 50 a 100 J no flutter atrial/TSVP).",
    ],
    debriefing: {
      overview:
        "A Cardioversão Elétrica Sincronizada é o tratamento de escolha imediato para QUALQUER taquiarritmia COM PULSO associada a instabilidade hemodinâmica (hipotensão, alteração aguda do estado mental, sinais de choque, dor torácica isquêmica ou insuficiência cardíaca aguda).",
      clueBreakdown: [
        "Cenário clínico: Taquiarritmia aguda acompanhada de dor torácica e alteração do sensório.",
        "Pista 2/5: Instabilidade hemodinâmica evidente (PA 74x42 + congestão pulmonar) exige reversão elétrica imediata.",
        "Pista 3/5: Regra de ouro do ACLS: Taquicardia + Instabilidade = Cardioversão Elétrica Sincronizada!",
        "Pista 4/5: O botão 'SYNC' deve estar ativado para disparar exatamente sobre o complexo QRS (onda R), evitando a onda T (fenômeno R-sobre-T).",
        "Pista 5/5: Protocolo OSASCO (Orientar, Sedar se possível, Ambú/O2, Sincronizar, Chocar, Observar).",
      ],
      differentials: [
        {
          name: "Desfibrilação elétrica (não sincronizada)",
          distinction:
            "Usada na Parada Cardiorrespiratória em FV/TV sem pulso ou na TV polimórfica instável onde o monitor não consegue sincronizar com o QRS.",
        },
        {
          name: "Adenosina / Amiodarona IV",
          distinction:
            "Terapias farmacológicas reservadas para taquiarritmias HEMODINAMICAMENTE ESTÁVEIS.",
        },
      ],
      protocolAndDoses:
        "1. Verificar pulso (se sem pulso -> RCP + Desfibrilação!).\n2. Oxigênio suplementar + Sedação breve se paciente consciente.\n3. Ativar modo SINCRONIZADO (SYNC) no desfibrilador e confirmar marcação nas ondas R.\n4. Carga bifásica inicial: QRS estreito regular (TSVP/Flutter): 50-100 J; QRS estreito irregular (FA): 120-200 J; QRS largo regular (TV monomórfica com pulso): 100 J.",
      pearls: [
        "Paciente com taquiarritmia + pulso + instabilidade = Cardioversão Elétrica Sincronizada imediata (não perca tempo esperando remédio!).",
        "Nunca esqueça de apertar o botão SYNC antes do choque na cardioversão!",
      ],
    },
  },
  {
    id: "treat-sulfato-magnesio-eclampsia",
    date: "21/11/2026",
    treatmentName: "Sulfato de magnésio intravenoso (Esquema Zuspan)",
    acceptedSynonyms: [
      "sulfato de magnesio",
      "sulfato de magnesio iv",
      "sulfato de magnesio intravenoso",
      "esquema zuspan",
      "esquema pritchard",
      "mgso4",
    ],
    specialty: "Ginecologia e Obstetrícia",
    difficulty: "Fácil",
    clues: [
      "Gestante de 35 semanas chega à maternidade com PA 176x112 mmHg, cefaleia fronto-occipital intensa, escotomas cintilantes ('estrelinhas na visão') e dor epigástrica em barra.",
      "Minutos após a admissão, apresenta crise convulsiva tônico-clônica generalizada (Eclâmpsia). Benzodiazepínicos (diazepam) e fenitoína NÃO são a medicação de primeira escolha neste quadro obstétrico.",
      "O tratamento padrão-ouro tanto para interromper/prevenir recorrência das convulsões na eclâmpsia quanto para profilaxia na pré-eclâmpsia com sinais de gravidade consiste na infusão de um sal mineral que reduz a excitabilidade neuronal (bloqueio de receptores NMDA) e promove vasodilatação cerebral.",
      "No esquema intravenoso mais utilizado nas maternidades brasileiras, faz-se dose de ataque de 4 g IV lento (em 15 a 20 minutos) seguida de manutenção contínua em bomba de infusão de 1 a 2 g/hora até 24 horas após o parto ou última convulsão.",
      "Durante seu uso, monitoram-se obrigatoriamente 3 parâmetros clínicos de toxicidade: reflexo patelar presente, frequência respiratória ≥ 16 irpm e diurese ≥ 25-30 mL/hora. Em caso de intoxicação (abolição de reflexo / depressão respiratória), o antídoto específico é o Gluconato de Cálcio 10% IV.",
    ],
    debriefing: {
      overview:
        "O Sulfato de Magnésio (MgSO4) é o fármaco de escolha absoluto na prevenção de convulsões na Pré-Eclâmpsia Grave / Iminência de Eclâmpsia e na prevenção de recorrência na Eclâmpsia (superior à fenitoína e ao diazepam), além de conferir neuroproteção fetal abaixo de 32 semanas.",
      clueBreakdown: [
        "Cenário clínico: Pré-eclâmpsia com iminência de eclâmpsia (cefaleia + escotomas + epigastralgia).",
        "Pista 2/5: Evolução para Eclâmpsia -> MgSO4 é superior a qualquer anticonvulsivante tradicional.",
        "Pista 3/5: Mecanismo neuroprotetor e anticonvulsivante via bloqueio de receptores NMDA e antagonismo de cálcio.",
        "Pista 4/5: Esquema Zuspan (exclusivamente IV): Ataque 4 g IV em 15-20 min + Manutenção 1-2 g/h em bomba. (Alternativa: Esquema Pritchard — 4 g IV + 10 g IM ataque, e 5 g IM 4/4h manutenção).",
        "Pista 5/5: Monitoramento clínico obrigatório (Reflexo patelar, FR ≥ 16, Diurese ≥ 25 mL/h) e antídoto imediato = Gluconato de Cálcio 10% (10 mL IV lento).",
      ],
      differentials: [
        {
          name: "Hidralazina IV / Nifedipino VO",
          distinction:
            "São os ANTI-HIPERTENSIVOS de escolha para tratar a crise hipertensiva (PA ≥ 160x110 mmHg), mas NÃO previnem nem tratam as convulsões eclâmpticas (o MgSO4 não é anti-hipertensivo!).",
        },
        {
          name: "Diazepam / Fenitoína IV",
          distinction:
            "Apresentam maior taxa de recorrência de convulsões e maior depressão respiratória neonatal/materna em comparação ao Sulfato de Magnésio.",
        },
      ],
      protocolAndDoses:
        "1. Esquema Zuspan (IV): Ataque 4 g IV em 15-20 min + Manutenção 1 a 2 g/h IV por 24h após parto ou última convulsão.\n2. Associar anti-hipertensivo se PA ≥ 160x110 mmHg (Hidralazina 5 mg IV ou Nifedipino 10 mg VO).\n3. Sinais de intoxicação por MgSO4 (perda do reflexo patelar -> FR < 12-16 -> parada respiratória): suspender infusão e aplicar Gluconato de Cálcio 10% (1 g = 10 mL IV em 3 minutos).",
      pearls: [
        "Primeiro sinal clínico de intoxicação pelo Sulfato de Magnésio: ABOLIÇÃO DO REFLEXO PATELAR!",
        "Antídoto da intoxicação por Sulfato de Magnésio: Gluconato de Cálcio 10% IV.",
      ],
    },
  },
  {
    id: "treat-trombolise-avc",
    date: "22/11/2026",
    treatmentName: "Trombólise intravenosa com Alteplase",
    acceptedSynonyms: [
      "trombolise intravenosa",
      "trombolise com alteplase",
      "alteplase",
      "rt-pa",
      "trombolise venosa",
      "tenecteplase",
    ],
    specialty: "Neurologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Mulher de 64 anos chega ao pronto-socorro 1 hora e 40 minutos após o início súbito de hemiplegia esquerda, desvio conjugado do olhar para a direita e disartria grave (NIHSS 14).",
      "A glicemia capilar é de 112 mg/dL, a pressão arterial foi controlada para 168x92 mmHg (abaixo do teto de 185x110 mmHg) e não há história de sangramento recente, cirurgia maior nos últimos 14 dias ou uso de anticoagulantes.",
      "A tomografia computadorizada de crânio sem contraste realizada em 18 minutos não mostrou sinais de hemorragia intracraniana nem hipodensidade extensa (> 1/3 do território da artéria cerebral média).",
      "O tratamento imediato padrão-ouro consiste na infusão venosa de um ativador recombinante do plasminogênio tecidual (fibrinolítico) dentro da janela clássica de até 4,5 horas do início dos sintomas (ou última vez vista bem).",
      "A dose protocolar é de 0,9 mg/kg (máximo 90 mg), sendo 10% administrados em bolus IV em 1 minuto e os 90% restantes em bomba de infusão contínua durante 60 minutos, mantendo PA < 180x105 mmHg nas próximas 24 horas.",
    ],
    debriefing: {
      overview:
        "A Trombólise Intravenosa com Alteplase (rt-PA) — ou Tenecteplase em protocolos atualizados — dentro da janela de até 4,5 horas do início dos sintomas é o tratamento farmacológico de reperfusão padrão-ouro no AVC isquêmico agudo incapacitante após exclusão de hemorragia na TC de crânio.",
      clueBreakdown: [
        "Cenário clínico: Déficit neurológico agudo incapacitante dentro da janela de 4,5h.",
        "Pista 2/5: Checagem obrigatória antes do trombolítico: glicemia normal, PA < 185x110 mmHg e exclusão de contraindicações hemorrágicas.",
        "Pista 3/5: TC de crânio sem contraste excluindo hemorragia libera imediatamente o tratamento.",
        "Pista 4/5: Fibrinolítico recombinante (rt-PA) que converte plasminogênio em plasmina ligada à fibrina do trombo.",
        "Pista 5/5: Posologia clássica de prova: 0,9 mg/kg (máx 90 mg) — 10% bolus em 1 min + 90% em 1 hora; NÃO dar AAS/heparina nas primeiras 24h pós-trombólise!",
      ],
      differentials: [
        {
          name: "AAS 300 mg VO + Estatina (apenas)",
          distinction:
            "Conduta para AVC isquêmico FORA da janela de trombólise ou com contraindicação à reperfusão (e o AAS só é iniciado 24h após a trombólise depois de TC de controle sem sangramento).",
        },
        {
          name: "Anticoagulação plena com Heparina",
          distinction:
            "Contraindicada na fase hiperaguda do AVC isquêmico pelo altíssimo risco de transformação hemorrágica fatal.",
        },
      ],
      protocolAndDoses:
        "1. Meta porta-agulha: ≤ 60 minutos.\n2. Controle pressórico ANTES da infusão: PA < 185x110 mmHg (usar Labetalol ou Nitroprussiato/Nicardipina IV se acima).\n3. Alteplase 0,9 mg/kg (máx 90 mg): 10% IV em bolus (1 min) + 90% IV em 60 min.\n4. Pós-trombólise: manter PA < 180x105 mmHg, evitar sondas/punções desnecessárias e repetir TC de crânio em 24h antes de iniciar antiagregante (AAS).",
      pearls: [
        "Teto de PA para iniciar trombólise no AVCi: < 185x110 mmHg. Para manter durante/após: < 180x105 mmHg!",
        "Dose da Alteplase no AVCi = 0,9 mg/kg (máx 90 mg) -> 10% bolus + 90% em 1h.",
      ],
    },
  },
  {
    id: "treat-toracocentese-alivio",
    date: "23/11/2026",
    treatmentName: "Toracocentese de alívio seguida de drenagem torácica",
    acceptedSynonyms: [
      "toracocentese de alivio",
      "descompressao toracica com agulha",
      "drenagem toracica em selo dagua",
      "puncao de alivio",
      "toracocentese descompressiva",
    ],
    specialty: "Cirurgia do Trauma / Emergência",
    difficulty: "Fácil",
    clues: [
      "Vítima de acidente automobilístico chega na sala vermelha com dispneia extrema, cianose, agitação, PA 70x40 mmHg e FC 140 bpm.",
      "Ao exame primário (letra B do ABCDE): turgência jugular bilateral, desvio da traqueia para a esquerda, murmúrio vesicular abolido à direita e hipertimpanismo à percussão do hemitórax direito.",
      "O diagnóstico é 100% clínico (pneumotórax hipertensivo) e é proibido atrasar a conduta salvadora para realizar radiografia de tórax.",
      "A conduta imediata consiste na introdução de um cateter calibroso (Jelco 14G) no 4º ou 5º espaço intercostal direito, logo anterior à linha axilar média (borda superior da costela inferior), convertendo o pneumotórax hipertensivo em pneumotórax simples.",
      "Observa-se saída audível de ar sob pressão com melhora imediata da pressão arterial, devendo-se prosseguir imediatamente com o tratamento definitivo através da inserção de dreno tubular conectado a sistema fechado em selo d'água.",
    ],
    debriefing: {
      overview:
        "No Pneumotórax Hipertensivo, o tratamento imediato (letra B do ATLS) é a Toracocentese Descompressiva de Alívio com agulha/cateter calibroso, seguida obrigatoriamente pelo tratamento definitivo com Toracostomia com Dreno em Selo d'Água no 5º espaço intercostal.",
      clueBreakdown: [
        "Cenário clínico: Trauma torácico com choque obstrutivo grave e insuficiência respiratória aguda.",
        "Pista 2/5: Hipertimpanismo + MV abolido + turgência jugular + desvio contralateral da traqueia = Pneumotórax hipertensivo.",
        "Pista 3/5: Diagnóstico puramente clínico; pedir raio-X é erro grave que leva à parada cardiorrespiratória em AESP.",
        "Pista 4/5: ATLS 10ª edição: no adulto, a punção de alívio é feita no 4º ou 5º EIC anterior à linha axilar média (em crianças mantém-se no 2º EIC na linha hemiclavicular).",
        "Pista 5/5: Após descompressão imediata, realiza-se a drenagem torácica definitiva em selo d'água.",
      ],
      differentials: [
        {
          name: "Pericardiocentese de alívio (Punção de Marfan)",
          distinction:
            "Indicada no Tamponamento Cardíaco (Tríade de Beck com MV preservado bilateralmente e sem hipertimpanismo).",
        },
        {
          name: "Curativo de três pontas",
          distinction:
            "Medida imediata para Pneumotórax ABERTO (ferida torácica aspirativa > 2/3 do diâmetro da traqueia).",
        },
      ],
      protocolAndDoses:
        "1. Toracocentese de alívio imediata (Jelco 14G no 4º/5º EIC linha axilar anterior/média no adulto, sempre rasando a borda SUPERIOR da costela inferior para não lesar o feixe vasculonervoso intercostal).\n2. Drenagem torácica fechada definitiva em selo d'água no 5º EIC entre as linhas axilar anterior e média.\n3. Se após drenagem bem posicionada houver borbulhamento contínuo maciço sem reexpansão pulmonar -> suspeitar de lesão de árvore traqueobrônquica!",
      pearls: [
        "Sempre puncione/drene na BORDA SUPERIOR da costela inferior (o feixe vasculonervoso corre na borda inferior da costela!).",
        "ATLS 10ª ed.: Adulto = 4º/5º EIC linha axilar anterior; Criança = 2º EIC linha hemiclavicular.",
      ],
    },
  },
  {
    id: "treat-plasmaferese-ptt",
    date: "24/11/2026",
    treatmentName: "Plasmaférese terapêutica de emergência",
    acceptedSynonyms: [
      "plasmaferese",
      "plasmaferese terapeutica",
      "troca plasmatica",
      "plasmaferese de emergencia",
    ],
    specialty: "Hematologia / Clínica Médica",
    difficulty: "Difícil",
    clues: [
      "Mulher de 31 anos chega à emergência com confusão mental flutuante, febre, icterícia e petéquias difusas. Exames revelam Hb 6,5 g/dL, plaquetas 9.000/mm³, LDH 2.100 U/L, Coombs direto negativo, TP/TTPA normais e numerosos esquizócitos no esfregaço periférico.",
      "O quadro fecha diagnóstico presuntivo de Púrpura Trombocitopênica Trombótica (PTT) por deficiência adquirida da enzima ADAMTS13 (escore PLASMIC alto), que possui mortalidade de até 90% se não tratada prontamente.",
      "A transfusão de plaquetas é formalmente contraindicada (pois piora a formação de microtrombos cerebrais e coronarianos), e o tratamento salvador NÃO deve aguardar o resultado laboratorial da dosagem de ADAMTS13.",
      "O procedimento de escolha imediato consiste na remoção extracorpórea do plasma do paciente (eliminando os autoanticorpos IgG anti-ADAMTS13 e os multímeros ultragrandes de von Willebrand) com reposição simultânea de Plasma Fresco Congelado rico em ADAMTS13 funcional.",
      "Realizada diariamente em associação com corticoterapia em altas doses (e eventualmente rituximabe/caplacizumabe) até normalização da contagem plaquetária (> 150.000/mm³) e queda do LDH por pelo menos 2 dias consecutivos.",
    ],
    debriefing: {
      overview:
        "A Plasmaférese Terapêutica (troca plasmática com reposição de Plasma Fresco Congelado) é o tratamento emergencial salvador de vidas na Púrpura Trombocitopênica Trombótica (PTT), reduzindo a mortalidade de ~90% para menos de 15%.",
      clueBreakdown: [
        "Cenário clínico: Anemia hemolítica microangiopática (esquizócitos, Coombs-, LDH altíssimo) + plaquetopenia grave + sintomas neurológicos + coagulograma normal = PTT.",
        "Pista 2/5: Emergência hematológica absoluta com altíssima mortalidade sem tratamento.",
        "Pista 3/5: Não transfundir plaquetas e não esperar o resultado do ADAMTS13 para começar o tratamento.",
        "Pista 4/5: A plasmaférese tem duplo efeito: retira os autoanticorpos inibidores e repõe a enzima ADAMTS13 através do plasma fresco congelado.",
        "Pista 5/5: Manter sessões diárias + corticoide até plaquetas > 150.000 e normalização do LDH.",
      ],
      differentials: [
        {
          name: "Transfusão de concentrado de plaquetas",
          distinction:
            "CONTRAINDICADA na PTT (funciona como 'combustível' para novos microtrombos no cérebro e coração, exceto em sangramento maciço com risco imediato de morte).",
        },
        {
          name: "Hemodiálise de urgência",
          distinction:
            "Remove solutos pequenos (ureia, potássio, ácidos), mas NÃO remove autoanticorpos IgG nem repõe a enzima ADAMTS13.",
        },
      ],
      protocolAndDoses:
        "1. Iniciar Plasmaférese Terapêutica diária imediatamente (troca de 1 a 1,5 volemias plasmáticas com Plasma Fresco Congelado).\n2. Se houver atraso para iniciar a máquina de plasmaférese, infundir Plasma Fresco Congelado como ponte temporária.\n3. Associar Metilprednisolona 1 g/dia IV por 3 dias (ou Prednisona 1 mg/kg/dia) + considerar Rituximabe e Caplacizumabe.",
      pearls: [
        "Na PTT: iniciar Plasmaférese ANTES do resultado do ADAMTS13!",
        "NUNCA transfunda plaquetas de rotina na PTT!",
      ],
    },
  },
  {
    id: "treat-n-acetilcisteina",
    date: "25/11/2026",
    treatmentName: "N-acetilcisteína intravenosa ou oral",
    acceptedSynonyms: [
      "n-acetilcisteina",
      "acetilcisteina",
      "nac",
      "fluimucil",
    ],
    specialty: "Toxicologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Jovem de 20 anos é trazida ao pronto-socorro 6 horas após ingestão intencional de 20 comprimidos de paracetamol 750 mg (total de 15 g), apresentando náuseas, vômitos e dor leve em hipocôndrio direito.",
      "A dosagem sérica do fármaco coletada após 4 horas da ingestão encontra-se acima da linha de tratamento no Nomograma de Rumack-Matthew, indicando alto risco de necrose hepática centrolobular fulminante.",
      "A toxicidade decorre do acúmulo do metabólito hepatotóxico NAPQI (via CYP2E1) após esgotamento completo das reservas hepáticas de glutationa.",
      "O tratamento antídoto específico atua como doador de grupamentos sulfidrila e precursor direto para restaurar rapidamente os estoques hepáticos de glutationa, neutralizando o NAPQI em metabólitos atóxicos.",
      "Sua eficácia é máxima (~100% de proteção hepática) quando iniciado nas primeiras 8 horas após a ingestão (protocolo IV de 21 horas: 150 mg/kg em 1h, seguido de 50 mg/kg em 4h e 100 mg/kg em 16h), mas ainda traz benefício mesmo tardiamente na insuficiência hepática estabelecida.",
    ],
    debriefing: {
      overview:
        "A N-Acetilcisteína (NAC) é o antídoto específico e altamente eficaz da intoxicação aguda por Paracetamol (Acetaminofeno). Repõe rapidamente a glutationa hepática para conjugar e neutralizar o metabólito tóxico NAPQI.",
      clueBreakdown: [
        "Cenário clínico: Ingestão de dose tóxica de paracetamol (> 7,5-10 g em adultos ou > 150-200 mg/kg em crianças).",
        "Pista 2/5: Nomograma de Rumack-Matthew (válido para ingestão única aguda entre 4h e 24h) define a necessidade do antídoto.",
        "Pista 3/5: Fisiopatologia: saturação das vias de glicuronidação/sulfatação -> desvio para CYP2E1 -> acúmulo de NAPQI -> necrose centrolobular (zona 3).",
        "Pista 4/5: Mecanismo do antídoto: restauração da glutationa hepática.",
        "Pista 5/5: Janela ouro < 8h; esquema IV clássico de 21h (150 mg/kg + 50 mg/kg + 100 mg/kg).",
      ],
      differentials: [
        {
          name: "Carvão ativado isolado",
          distinction:
            "Útil apenas para descontaminação gastrointestinal precoce (idealmente até 1 a 2 horas da ingestão), mas NÃO reverte a hepatotoxicidade do paracetamol já absorvido.",
        },
        {
          name: "Flumazenil / Naloxona",
          distinction:
            "Antídotos para benzodiazepínicos e opioides, respectivamente — sem nenhum efeito na intoxicação por paracetamol.",
        },
      ],
      protocolAndDoses:
        "1. Carvão ativado 1 g/kg VO se paciente chegar em até 1-2h (até 4h em doses maciças) com via aérea protegida.\n2. Protocolo IV (21 horas) de N-Acetilcisteína:\n   - 1ª fase: 150 mg/kg IV em 60 min;\n   - 2ª fase: 50 mg/kg IV em 4 horas;\n   - 3ª fase: 100 mg/kg IV em 16 horas.\n3. Critérios de King's College definem necessidade de Transplante Hepático nos casos fulminantes.",
      pearls: [
        "Intoxicação por Paracetamol = Nomograma de Rumack-Matthew (após 4h) + Antídoto: N-Acetilcisteína!",
        "Efeito adverso comum da NAC IV rápida: reação anafilactoide (reduzir velocidade de infusão e dar anti-histamínico).",
      ],
    },
  },
  {
    id: "treat-desfibrilacao-fv",
    date: "26/11/2026",
    treatmentName: "Desfibrilação elétrica imediata + RCP de alta qualidade",
    acceptedSynonyms: [
      "desfibrilacao eletrica",
      "desfibrilacao",
      "desfibrilacao imediata",
      "choque nao sincronizado",
      "rcp e desfibrilacao",
    ],
    specialty: "Cardiologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Homem de 59 anos colapsa subitamente na sala de espera do hospital: está irresponsivo, em apneia e sem pulso carotídeo palpável em 10 segundos.",
      "Iniciam-se compressões torácicas imediatas (100-120/min, profundidade 5-6 cm) e, ao acoplar as pás do monitor cardíaco, observa-se traçado caótico, ondulatório e totalmente desorganizado sem complexos QRS identificáveis (Fibrilação Ventricular).",
      "Diferente da assistolia e da atividade elétrica sem pulso (AESP), este ritmo de parada cardiorrespiratória é CHOCÁVEL, e cada minuto de atraso na intervenção elétrica reduz a chance de sobrevida em 7 a 10%.",
      "Consiste na aplicação imediata de choque elétrico NÃO sincronizado de alta energia (200 J em desfibrilador bifásico ou 360 J em monofásico), retomando-se imediatamente as compressões torácicas por 2 minutos logo após o choque (sem checar pulso imediatamente).",
      "Caso o ritmo chocável persista após o 2º choque, inicia-se Adrenalina 1 mg IV a cada 3-5 min; após o 3º choque refratário, administra-se Amiodarona 300 mg IV em bolus.",
    ],
    debriefing: {
      overview:
        "Na Parada Cardiorrespiratória em ritmos chocáveis (Fibrilação Ventricular ou Taquicardia Ventricular sem pulso), a Desfibrilação Elétrica precoce combinada a compressões torácicas de alta qualidade com mínimas interrupções é a intervenção mais determinante para a sobrevida neurologicamente intacta.",
      clueBreakdown: [
        "Cenário clínico: Tríade diagnóstica da PCR (irresponsividade + ausência de respiração/gasping + ausência de pulso em ≤ 10s).",
        "Pista 2/5: Ritmo de Fibrilação Ventricular (chocável).",
        "Pista 3/5: Choque precoce é prioridade absoluta nos ritmos chocáveis (FV / TV sem pulso).",
        "Pista 4/5: Choque NÃO sincronizado (200 J bifásico / 360 J monofásico) + retorno IMEDIATO à RCP por 2 minutos antes de reavaliar ritmo/pulso.",
        "Pista 5/5: Sequência farmacológica do ACLS em FV/TVsp: Adrenalina 1 mg após o 2º choque; Amiodarona 300 mg (ou Lidocaína) após o 3º choque.",
      ],
      differentials: [
        {
          name: "Cardioversão elétrica sincronizada",
          distinction:
            "Usada em taquiarritmias COM PULSO instáveis — na FV o aparelho não encontra onda R para sincronizar e NÃO dispara o choque!",
        },
        {
          name: "Adrenalina IV imediata sem choque (Protocolo AESP/Assistolia)",
          distinction:
            "Conduta para ritmos NÃO chocáveis (Assistolia e AESP), onde o choque é contraindicado.",
        },
      ],
      protocolAndDoses:
        "1. Reconhecer PCR -> Chamar ajuda + Iniciar RCP (30:2 sem via aérea avançada; 100-120/min contínuas com 1 ventilação a cada 6s se IOT).\n2. Ritmo chocável (FV/TVsp): Choque imediato (200 J bifásico) -> Retomar RCP 2 min imediatamente.\n3. Após 2º choque: Adrenalina 1 mg IV/IO a cada 3-5 min.\n4. Após 3º choque: Amiodarona 300 mg IV (2ª dose: 150 mg) ou Lidocaína 1-1,5 mg/kg.\n5. Investigar e tratar os 5 Hs e 5 Ts.",
      pearls: [
        "Ritmos CHOCÁVEIS = FV e TV sem pulso. Ritmos NÃO chocáveis = Assistolia e AESP.",
        "Logo após o choque da desfibrilação, NÃO cheque o pulso — volte IMEDIATAMENTE para as compressões torácicas por 2 minutos!",
      ],
    },
  },
  {
    id: "treat-hemodialise-urgencia",
    date: "27/11/2026",
    treatmentName: "Hemodiálise de urgência",
    acceptedSynonyms: [
      "hemodialise de urgencia",
      "hemodialise",
      "terapia renal substitutiva",
      "dialise de urgencia",
    ],
    specialty: "Nefrologia / Emergência",
    difficulty: "Médio",
    clues: [
      "Homem de 70 anos com insuficiência renal aguda grave anúrica evolui na enfermaria com dispneia intensa em repouso, rebaixamento progressivo do sensório e atrito pericárdico audível à ausculta cardíaca.",
      "Exames laboratoriais: Creatinina 9,4 mg/dL, Ureia 265 mg/dL, Potássio sérico 7,1 mEq/L com onda T apiculada e alargamento do QRS no ECG, e gasometria arterial com pH 7,08 e HCO3 8 mEq/L.",
      "Apesar da estabilização de membrana com gluconato de cálcio, solução polarizante (insulina + glicose), furosemida em altas doses e bicarbonato de sódio, o paciente permanece anúrico, congesto, acidótico e hipercalêmico (refratário ao manejo clínico).",
      "Esta intervenção invasiva de depuração extracorpórea está indicada de forma absoluta pelo mnemônico clássico 'AEIOU': Acidose metabólica grave refratária, Eletrólitos (hipercalemia refratária), Intoxicações dialisáveis (lítio, metanol, salicilatos, etilenoglicol), Overload (hipervolemia/EAP refratário) e Uremia sintomática (encefalopatia ou pericardite urêmica).",
      "Exige a passagem de cateter venoso central de duplo lúmen (preferencialmente veia jugular interna direita) para depuração rápida de solutos, correção do potássio/acidose e ultrafiltração do excesso de volume.",
    ],
    debriefing: {
      overview:
        "A Hemodiálise de Urgência (Terapia Renal Substitutiva) é indicada diante de complicações ameaçadoras à vida refratárias ao tratamento clínico na Lesão Renal Aguda ou DRC agudizada, além de intoxicações exógenas graves por substâncias dialisáveis.",
      clueBreakdown: [
        "Cenário clínico: LRA anúrica com sinais de uremia grave (encefalopatia + pericardite urêmica) e congestão pulmonar.",
        "Pista 2/5: Hipercalemia com repercussão no ECG (7,1 mEq/L) + acidose metabólica severa (pH 7,08).",
        "Pista 3/5: Refratariedade às medidas clínicas clínicas iniciais (enquanto se prepara a diálise, o gluconato de cálcio protege o coração).",
        "Pista 4/5: Mnemônico universal das indicações de diálise de urgência = AEIOU (Acidose, Eletrólitos/K+, Intoxicações, Overload/EAP, Uremia sintomática).",
        "Pista 5/5: Acesso de escolha = Cateter de Shilley/duplo lúmen em veia jugular interna direita.",
      ],
      differentials: [
        {
          name: "Gluconato de cálcio 10% IV isolado",
          distinction:
            "Apenas ESTABILIZA a membrana miocárdica por 30-60 minutos contra fibrilação ventricular, mas NÃO reduz em nada o potássio sérico nem corrige a uremia/acidose.",
        },
        {
          name: "Diálise peritoneal",
          distinction:
            "Mais lenta para remover potássio e volume rapidamente no cenário agudo crítico da sala de emergência.",
        },
      ],
      protocolAndDoses:
        "1. Enquanto prepara a Hemodiálise na hipercalemia com alteração no ECG:\n   - Gluconato de Cálcio 10% (10 mL IV em 2-3 min) -> protege o miocárdio;\n   - Solução polarizante (Insulina Regular 10 UI + Glicose 50% IV) + Salbutamol inalatório -> deslocam K+ para o intracelular.\n2. Passagem de cateter de hemodiálise (jugular interna direita) e início imediato de Hemodiálise de Urgência.",
      pearls: [
        "Indicações de Hemodiálise de Urgência = AEIOU (Acidose refratária, Eletrólitos/Hipercalemia refratária, Intoxicações, Overload/EAP refratário, Uremia: pericardite/encefalopatia/sangramento).",
        "Valores isolados de creatinina ou ureia SEM sintomas/complicações NÃO indicam diálise de urgência!",
      ],
    },
  },
];

export const MEDICAL_TREATMENTS_CATALOG: string[] = Array.from(
  new Set([
    ...BUILTIN_PROGRESSIVE_TREATMENTS.map((t) => t.treatmentName),
    "Adrenalina intramuscular na face anterolateral da coxa",
    "Alcalinização urinária com bicarbonato de sódio IV",
    "Amiodarona intravenosa em bolus (ACLS)",
    "Angioplastia coronariana primária (Cateterismo de emergência)",
    "Antibioticoterapia empírica IV na 1ª hora (Pacote Sepse)",
    "Anticoagulação plena com Enoxaparina / Heparina",
    "Apendicectomia videolaparoscópica de urgência",
    "Atropinização intravenosa + Pralidoxima",
    "Betabloqueador IV (Esmolol) seguido de Nitroprussiato de sódio",
    "Biperideno intramuscular/intravenoso",
    "Cardioversão elétrica sincronizada",
    "Carvão ativado via oral / sonda nasogástrica",
    "Ceftriaxona IV em dose meníngea + Dexametasona",
    "Colecistectomia videolaparoscópica precoce",
    "Complexo protrombínico de 4 fatores + Vitamina K IV",
    "Corticoterapia em altas doses (Pulsoterapia com Metilprednisolona)",
    "Curativo de três pontas (Pneumotórax aberto)",
    "Dantroleno intravenoso / Bromocriptina",
    "Descompressão biliar de urgência por CPRE",
    "Desfibrilação elétrica imediata + RCP de alta qualidade",
    "Dexametasona + Aciclovir intravenoso",
    "Drenagem torácica fechada em selo d'água",
    "Epinefrina em nebulização + Dexametasona (Crupe grave)",
    "Esquema RIPE (Rifampicina, Isoniazida, Pirazinamida, Etambutol)",
    "Expansão volêmica + Insulina regular IV após checar K+ ≥ 3,3",
    "Fasciotomia descompressiva de urgência",
    "Fisostigmina intravenosa",
    "Flumazenil intravenoso",
    "Fragmento de anticorpo Fab antidigoxina",
    "Glucagon intravenoso em altas doses",
    "Gluconato de cálcio 10% IV + Solução polarizante",
    "Hemina humana (Hematina) IV + Glicose hipertônica",
    "Hemodiálise de urgência",
    "Hidroxicloroquina + Micofenolato de mofetila",
    "Imunoglobulina humana intravenosa (IGIV 0,4 g/kg/dia por 5 dias)",
    "Intubação orotraqueal em sequência rápida",
    "Laparotomia exploradora de emergência (Controle de danos)",
    "Ligadura elástica endoscópica de varizes + Terlipressina",
    "Manitol / Solução salina hipertônica 3%",
    "Marca-passo transcutâneo / transvenoso de urgência",
    "Metotrexato intramuscular (Gestação ectópica íntegra)",
    "N-acetilcisteína intravenosa ou oral",
    "Naloxona intravenosa ou intranasal",
    "Noradrenalina em infusão venosa contínua",
    "Oxigenoterapia hiperbárica (Intoxicação grave por CO)",
    "Penicilina G Benzatina intramuscular",
    "Pericardiocentese de alívio (Punção de Marfan)",
    "Piridoxina (Vitamina B6) intravenosa em altas doses",
    "Plasmaférese terapêutica de emergência",
    "Preparo pré-operatório com alfa-bloqueador seguido de beta-bloqueador",
    "Quelação com D-penicilamina / Trientina + Zinco",
    "Quelação com EDTA cálcico / Dimercaprol (BAL)",
    "Redução hidrostática / pneumática por enema guiado",
    "Reposição de Tiamina (Vitamina B1) IV ANTES da glicose",
    "Salpingectomia cirúrgica de emergência",
    "Soro anticrotálico intravenoso (20 ampolas)",
    "Soro antibotrópico intravenoso",
    "Sulfato de magnésio intravenoso (Esquema Zuspan)",
    "Sulfato de protamina intravenoso",
    "Toracocentese de alívio seguida de drenagem torácica",
    "Transfusão maciça (Protocolo 1:1:1)",
    "Trombectomia mecânica endovascular",
    "Trombólise intravenosa com Alteplase",
    "Ventilação não invasiva (VNI — BiPAP / CPAP)",
  ])
).sort((a, b) => a.localeCompare(b, "pt-BR"));

export function isTreatmentMatch(
  guess: string,
  targetCase: ProgressiveTreatmentCase
): boolean {
  const normGuess = normalizeDiagnosisString(guess);
  if (!normGuess) return false;

  const candidates = [
    targetCase.treatmentName,
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

export function getDailyTreatmentCase(
  dateOverride?: string
): ProgressiveTreatmentCase {
  const dateStr = dateOverride || getTodayFormattedDate();
  const dateKey = dateOverride ? dateOverride.replace(/\//g, "-") : getTodayKey();

  let hash = 19;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 43 + dateKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % BUILTIN_PROGRESSIVE_TREATMENTS.length;
  const selected =
    BUILTIN_PROGRESSIVE_TREATMENTS[index] || BUILTIN_PROGRESSIVE_TREATMENTS[0];

  return {
    ...selected,
    id: `daily-treatment-${dateKey}`,
    date: dateStr,
  };
}
