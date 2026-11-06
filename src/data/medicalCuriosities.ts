export interface MedicalCuriosity {
  id: string;
  category: "Farmacologia" | "Curiosidade" | "Macete de Prova" | "Semiologia" | "Emergência" | "Fisiologia";
  categoryColor: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
  title: string;
  shortFact: string;
  detailedExplanation: {
    mechanism: string;
    clinicalSignificance: string;
    goldenRule: string;
  };
  keyTakeaway: string;
  area: string;
}

export const MEDICAL_CURIOSITIES: MedicalCuriosity[] = [
  {
    id: "tiazidicos-has",
    category: "Farmacologia",
    categoryColor: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800/40",
      badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    title: "Diuréticos Tiazídicos na Hipertensão",
    shortFact:
      "Os medicamentos tiazídicos (ou diuréticos tiazídicos e tiazídico-símile) são fármacos amplamente utilizados no tratamento de primeira linha da hipertensão arterial sistêmica e no controle de edemas.",
    detailedExplanation: {
      mechanism:
        "Eles agem inibindo especificamente o cotransportador de Na+/Cl- (NCC) na membrana luminal das células do túbulo contorcido distal do néfron. Isso reduz a reabsorção tubular de sódio e água, promovendo natriurese e diurese iniciais.",
      clinicalSignificance:
        "Nas primeiras semanas de uso, o efeito anti-hipertensivo decorre da diminuição da volemia e do débito cardíaco. A longo prazo, entretanto, a volemia tende a se normalizar e a pressão arterial permanece baixa graças à redução sustentada da resistência vascular periférica.",
      goldenRule:
        "Macete de prova: Lembre-se dos '4 Hipos e 3 Hipers' dos tiazídicos. Hipos: Hipocalemia, Hiponatremia, Hipomagnesemia e Hipovolemia. Hipers: Hiperglicemia, Hiperuricemia (cuidado com crises de gota!) e Hipercalcemia (pois aumentam a reabsorção de cálcio no túbulo distal).",
    },
    keyTakeaway: "Primeira linha em HAS, especialmente em idosos e negros; atente para eletrólitos e ácido úrico.",
    area: "Cardiologia & Farmacologia",
  },
  {
    id: "cerebro-energia-glinfatico",
    category: "Curiosidade",
    categoryColor: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800/40",
      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    title: "Metabolismo Cerebral & O Sistema Glinfático",
    shortFact:
      "O cérebro consome cerca de 20% de toda a energia corporal diária, mas não possui receptores de dor em seu parênquima: seu sistema de limpeza linfática (glinfático) atua quase exclusivamente enquanto dormimos.",
    detailedExplanation: {
      mechanism:
        "Diferente do restante do corpo, o SNC não possui vasos linfáticos convencionais em seu parênquima. Em 2012 foi descoberto o 'Sistema Glinfático', sustentado pelos astrócitos (via canais de aquaporina-4), onde o líquor flui rapidamente pelos espaços perivasculares lavando o líquido intersticial.",
      clinicalSignificance:
        "Durante as fases profundas do sono não-REM (ondas lentas N3), o espaço intersticial cerebral expande-se em até 60%, permitindo a rápida drenagem e depuração de subprodutos neurotóxicos acumulados no dia, incluindo placas beta-amilóide e proteína tau.",
      goldenRule:
        "Por que sentimos dor de cabeça se o encéfalo não dói? O parênquima cerebral é insensível à dor. Toda cefaleia provém da irritação mecânica, inflamatória ou vascular das meninges (dura-máter), periósteo craniano, vasos do polígono de Willis e ramos do nervo trigêmeo.",
    },
    keyTakeaway: "A privação crônica de sono reduz a depuração de beta-amiloide, acelerando o declínio cognitivo.",
    area: "Neurociência & Fisiologia",
  },
  {
    id: "triade-beck-tamponamento",
    category: "Emergência",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Tríade de Beck no Tamponamento Cardíaco",
    shortFact:
      "A Tríade de Beck (hipotensão arterial, abafamento de bulhas e turgência jugular patológica) é o marco diagnóstico de emergência do tamponamento cardíaco agudo.",
    detailedExplanation: {
      mechanism:
        "O acúmulo súbito de sangue ou líquido no espaço pericárdico inelástico eleva a pressão intrapericárdica acima da pressão diastólica dos ventrículos. Isso impede o enchimento ventricular diastólico, colapsando o débito cardíaco.",
      clinicalSignificance:
        "No trauma torácico ou pericardite grave, o paciente pode chocar em minutos. O pulso paradoxal (queda > 10 mmHg da PAS durante a inspiração espontânea) complementa a suspeita clínica.",
      goldenRule:
        "Mnemônico dos 3 B's de Beck: 1) Baixa pressão arterial (hipotensão); 2) Bulhas abafadas / hipofonéticas; 3) Bolsa jugular túrgida (estase jugular a 45°). Conduta imediata: pericardiocentese de alívio (Punção de Marfan).",
    },
    keyTakeaway: "Emergência de atendimento imediato: tempo é miocárdio e vida. Não aguarde exames demorados.",
    area: "Cardiologia & Trauma",
  },
  {
    id: "bb-insuficiencia-cardiaca",
    category: "Farmacologia",
    categoryColor: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/40",
      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    },
    title: "O Paradoxo dos Betabloqueadores na IC",
    shortFact:
      "Apesar de serem inotrópicos e cronotrópicos negativos, os betabloqueadores certos reduzem a mortalidade geral em mais de 34% na Insuficiência Cardíaca com Fração de Ejeção Reduzida (ICFER).",
    detailedExplanation: {
      mechanism:
        "Na IC, a ativação simpática adrenérgica crônica é hiperativada como mecanismo compensatório, gerando vasoconstrição reflexa, apoptose de cardiomiócitos, arritmias ventriculares e remodelamento cardíaco deletério. O betabloqueio quebra essa cascata tóxica.",
      clinicalSignificance:
        "A introdução deve ser feita SEMPRE com o paciente euvolêmico e compensado, em doses muito baixas e com titulação progressiva a cada 2 a 4 semanas. Na descompensação aguda (perfil B ou C), nunca inicie nem aumente a dose.",
      goldenRule:
        "Quarteto de ouro da ICFER com evidência de redução de mortalidade: Metoprolol (succinato apenas, nunca tartarato!), Carvedilol ou Bisoprolol (e Nebivolol em idosos). Tartarato de metoprolol ou atenolol NÃO reduzem mortalidade na IC!",
    },
    keyTakeaway: "Succinato de metoprolol, carvedilol e bisoprolol salvam vidas na IC estável, nunca no choque cardiogênico.",
    area: "Cardiologia & Terapêutica",
  },
  {
    id: "reynolds-charcot-colangite",
    category: "Macete de Prova",
    categoryColor: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/40",
      badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
    title: "Charcot vs Pêntada de Reynolds na Colangite",
    shortFact:
      "A Tríade de Charcot indica colangite aguda infecciosa; já a Pêntada de Reynolds adiciona hipotensão e confusão mental, sinalizando sepse biliar grave com necessidade de descompressão urgente.",
    detailedExplanation: {
      mechanism:
        "A obstrução biliar (por cálculo, estenose ou tumor) gera estase e proliferação bacteriana retrógrada sob alta pressão no colédoco. Quando a pressão biliar ultrapassa a pressão venosa, ocorre translocação bacteriana maciça para a circulação sistêmica.",
      clinicalSignificance:
        "A Tríade de Charcot clássica é: Febre com calafrios + Dor em hipocôndrio direito + Icterícia flutuante. Quando somada a choque séptico (hipotensão) e rebaixamento do nível de consciência, forma a Pêntada de Reynolds.",
      goldenRule:
        "Macete de memorização: Charcot = FBI (Febre, Bilirrubina alta/Icterícia, Inconveniente dor em HCD). Reynolds = FBI + Choque + Confusão mental. Tratamento: Antibioticoterapia venosa + drenagem biliar de urgência (preferencialmente CPRE).",
    },
    keyTakeaway: "Pêntada de Reynolds é sepse biliar fulminante: drenar a via biliar em até 24h é mandatório.",
    area: "Gastroenterologia & Cirurgia Geral",
  },
  {
    id: "paracetamol-nac-antidoto",
    category: "Farmacologia",
    categoryColor: {
      bg: "bg-teal-500/10 dark:bg-teal-500/20",
      text: "text-teal-600 dark:text-teal-400",
      border: "border-teal-200 dark:border-teal-800/40",
      badge: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    },
    title: "Intoxicação por Paracetamol e Antídoto Específico",
    shortFact:
      "Em doses tóxicas, o paracetamol exaure a glutationa hepática, acumulando o metabólito altamente citotóxico NAPQI: a N-acetilcisteína (NAC) reverte o quadro se iniciada precocemente.",
    detailedExplanation: {
      mechanism:
        "Normalmente, 90% do paracetamol é metabolizado por conjugação com glicuronídeo e sulfato. Em overdose (> 7.5g a 10g em adultos), essas vias saturam e a enzima CYP2E1 produz grandes quantidades de NAPQI, que causa necrose centrolobular hepática fulminante.",
      clinicalSignificance:
        "A N-acetilcisteína age como precursora da glutationa e doa grupos sulfidrila para conjugar diretamente o NAPQI. Sua eficácia é máxima quando administrada dentro das primeiras 8 horas após a ingestão.",
      goldenRule:
        "O Nomograma de Rumack-Matthew é utilizado a partir de 4 horas pós-ingestão aguda para dosar o paracetamol sérico e indicar o uso da NAC. Não espere as transaminases subirem para tratar!",
    },
    keyTakeaway: "NAC é 100% protetora do fígado se administrada dentro de 8 horas após a ingestão maciça.",
    area: "Toxicologia Clínica",
  },
  {
    id: "blumberg-apendicite-peritonio",
    category: "Semiologia",
    categoryColor: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200 dark:border-indigo-800/40",
      badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    },
    title: "Sinal de Blumberg e Irritação Peritoneal",
    shortFact:
      "O Sinal de Blumberg positivo não é exclusivo de apendicite: ele sinaliza peritonite parietal localizada quando positivo no ponto de McBurney, ou generalizada quando difuso.",
    detailedExplanation: {
      mechanism:
        "A descompressão súbita da parede abdominal estira bruscamente o peritônio parietal inflamado. Por possuir rica inervação somática espinhal (diferente do peritônio visceral com inervação autonômica vaga), a dor é aguda, pontual e intensa.",
      clinicalSignificance:
        "No idoso, a resposta inflamatória atenuada e a hipotonia muscular da parede podem mascarar a defesa e o sinal de Blumberg, retardando o diagnóstico de abdome agudo perfurativo.",
      goldenRule:
        "Na gestante a partir do 2º trimestre, o útero gravídico empurra o ceco e o apêndice para cima e lateralmente: a dor da apendicite pode se manifestar no flanco direito ou hipocôndrio direito, e não na fossa ilíaca direita!",
    },
    keyTakeaway: "Blumberg = peritonite; na gestante, atente para a migração cefálica do apêndice.",
    area: "Cirurgia Geral & Semiologia",
  },
  {
    id: "cushing-hipertensao-intracraniana",
    category: "Fisiologia",
    categoryColor: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-800/40",
      badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    },
    title: "Reflexo de Cushing na Hipertensão Intracraniana",
    shortFact:
      "A Tríade de Cushing (hipertensão arterial com aumento da pressão de pulso, bradicardia e padrão respiratório irregular) é sinal de emergência pré-herniação cerebral.",
    detailedExplanation: {
      mechanism:
        "Quando a Pressão Intracraniana (PIC) atinge níveis críticos, ela supera a pressão de perfusão cerebral (PPC = PAM - PIC), causando isquemia no bulbo e tronco encefálico. O centro vasomotor responde com descarga simpática maciça para elevar a PAM. Os barorreceptores carotídeos detectam esse pico pressórico e disparam resposta vagal parassimpática, gerando bradicardia reflexa.",
      clinicalSignificance:
        "É um achado pré-terminal. Diferente do choque hipovolêmico (onde há hipotensão e taquicardia), na HIC grave encontramos hipertensão com bradicardia associada.",
      goldenRule:
        "Regra de ouro de conduta: Elevar a cabeceira a 30°, alinhar pescoço em posição neutra para desobstruir retorno jugular, hiperventilação transitória protetora e terapia osmolar imediata (Manitol ou Salina Hipertônica a 3%).",
    },
    keyTakeaway: "Hipertensão + Bradicardia + Respiração irregular = PIC no limite com iminência de herniação.",
    area: "Neurologia & Medicina Intensiva",
  },
  {
    id: "cad-potassio-insulina",
    category: "Emergência",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Regra Crítica do Potássio na Cetoacidose Diabética (CAD)",
    shortFact:
      "Na Cetoacidose Diabética, NUNCA inicie insulina antes de checar o potássio sérico: se K+ estiver abaixo de 3.3 mEq/L, a insulina pode deflagrar parada cardiorrespiratória por hipocalemia grave.",
    detailedExplanation: {
      mechanism:
        "A insulina ativa potentemente a bomba Na+/K+ ATPase, internalizando o potássio extracelular para o interior das células. Além disso, a acidose desviava potássio para fora da célula, mascarando um déficit corporal total real de K+ provocado pela diurese osmótica.",
      clinicalSignificance:
        "Se o potássio inicial for < 3.3 mEq/L, segure a insulina, hidrate o paciente e reponha potássio intravenoso vigorosamente até que o K+ ultrapasse 3.3. Se o K+ estiver entre 3.3 e 5.2 mEq/L, inicie a insulina concomitante à reposição de manutenção de potássio.",
      goldenRule:
        "Mnemônico de emergência: 'Sem Potássio acima de 3.3, a Insulina não tem vez'. O objetivo primário na CAD é fechar o ânion-gap e cessar a cetogênese, não apenas normalizar o valor da glicemia.",
    },
    keyTakeaway: "A hipocalemia induzida por insulina mata mais rápido que a hiperglicemia na CAD.",
    area: "Endocrinologia & Emergência",
  },
  {
    id: "nitroglicerina-vd-supra-inferior",
    category: "Macete de Prova",
    categoryColor: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/40",
      badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
    title: "Perigo de Nitrato no Infarto de Parede Inferior / VD",
    shortFact:
      "Em todo paciente com IAM com supra de ST em parede inferior (DII, DIII, aVF), é obrigatório rodar as derivações direitas (V3R e V4R) antes de administrar nitratos ou morfina.",
    detailedExplanation: {
      mechanism:
        "Cerca de 30% a 50% dos infartos de parede inferior acometem também o Ventrículo Direito (artéria coronária direita). O ventrículo direito infartado comporta-se como um conduto passivo e é estritamente pré-carga dependente para impulsionar sangue aos pulmões.",
      clinicalSignificance:
        "Nitratos e morfina promovem venodilatação sistêmica exuberante, reduzindo drasticamente o retorno venoso (pré-carga). Se administrados num infarto de VD, causam colapso hemodinâmico com choque cardiogênico refratário instantâneo.",
      goldenRule:
        "Se V4R apresentar supra de ST ≥ 0.5 mm: proscritos nitratos e diuréticos! O tratamento de suporte hemodinâmico inicial é a expansão volêmica cautelosa com cristaloides para otimizar o enchimento ventricular direito.",
    },
    keyTakeaway: "Supra em parede inferior exige V3R e V4R antes de prescrever qualquer vasodilatador.",
    area: "Cardiologia & Terapia Intensiva",
  },
  {
    id: "virchow-triade-trombose",
    category: "Semiologia",
    categoryColor: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200 dark:border-indigo-800/40",
      badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    },
    title: "A Tríade de Virchow e o Tromboembolismo Venoso",
    shortFact:
      "Descrita em 1856 por Rudolf Virchow, a tríade clássica (estase venosa, lesão endotelial e hipercoagulabilidade) permanece o pilar fisiopatológico de toda profilaxia de TVP e embolia pulmonar no hospital.",
    detailedExplanation: {
      mechanism:
        "A estase diminui a depuração de fatores de coagulação ativados; a lesão endotelial expõe o fator tecidual e o colágeno subendotelial, deflagrando a cascata de coagulação; a hipercoagulabilidade (genética ou adquirida, como câncer, gestação e sepse) desbalanceia o sistema pró e anticoagulante natural.",
      clinicalSignificance:
        "Todo paciente internado deve ser estratificado (ex: Escore de Caprini ou Pádua). A tromboprofilaxia farmacológica com Heparina de Baixo Peso Molecular (Enoxaparina) ou Não Fracionada salva mais vidas que o tratamento do TEP estabelecido.",
      goldenRule:
        "Macete de semiologia: O Sinal de Homans (dor à dorsiflexão passiva do tornozelo) tem sensibilidade inferior a 30%. Não descarte TVP por Homans negativo! O Sinal de Bancroft (compressão da musculatura contra o plano ósseo) e a assimetria de panturrilhas (> 3 cm) são muito mais sensíveis.",
    },
    keyTakeaway: "Tríade de Virchow: estase + lesão endotelial + hipercoagulabilidade guiam a profilaxia em cirurgias.",
    area: "Cirurgia Vascular & Clínica Médica",
  },
  {
    id: "adrenalina-anafilaxia-im",
    category: "Emergência",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Por que a Adrenalina na Anafilaxia é Intramuscular?",
    shortFact:
      "No choque anafilático, a adrenalina (epinefrina) 1:1.000 deve ser administrada imediatamente por via INTRAMUSCULAR no terço anterolateral da coxa, e NUNCA por via subcutânea ou endovenosa direta em bolus.",
    detailedExplanation: {
      mechanism:
        "O músculo vasto lateral da coxa é extremamente vascularizado. A absorção intramuscular atinge concentrações séricas de pico em 8 minutos, contra mais de 34 minutos se aplicada por via subcutânea. A via endovenosa direta não titulada acarreta alto risco de arritmias ventriculares malignas e hemorragia intracraniana.",
      clinicalSignificance:
        "A adrenalina é o único medicamento que reduz a mortalidade na anafilaxia: age como agonista alfa-1 (vasoconstrição combatendo hipotensão e edema laríngeo), beta-1 (aumento de FC e contratilidade) e beta-2 (broncodilatação e cessação da desgranulação de mastócitos).",
      goldenRule:
        "Anti-histamínicos e corticoides NÃO revertem broncoespasmo nem choque anafilático no momento agudo! Eles apenas previnem a reação de fase tardia bifásica. Dose na anafilaxia adulta: 0,3 a 0,5 mg IM (puro da ampola 1:1.000), repetível a cada 5-15 min se necessário.",
    },
    keyTakeaway: "Adrenalina IM precoce no vasto lateral salva vidas. Corticoide e anti-histamínico são secundários.",
    area: "Alergologia & Medicina de Emergência",
  },
  {
    id: "tetraciclinas-calcio-dentes",
    category: "Curiosidade",
    categoryColor: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800/40",
      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    title: "Por que as Tetraciclinas Mancham os Dentes Infantis?",
    shortFact:
      "As tetraciclinas e doxiciclina possuem alta capacidade de quelação de íons cálcio bivalentes, incorporando-se de forma irreversível à matriz de hidroxiapatita dos dentes e ossos em desenvolvimento.",
    detailedExplanation: {
      mechanism:
        "Durante a odontogênese (mineralização dentária), a molécula quelada deposita-se na dentina e esmalte. Em contato com a luz solar através dos tecidos transparentes dos dentes decíduos e permanentes, o complexo sofre oxidação fotoquímica, tornando-se permanentemente marrom-acinzentado.",
      clinicalSignificance:
        "Além da coloração permanente e inestética, pode provocar hipoplasia de esmalte e atraso temporário do crescimento ósseo longitudinal em fetos e crianças pequenas.",
      goldenRule:
        "Contraindicação formal de prova: Evitar tetraciclinas em gestantes a partir do segundo trimestre e em crianças menores de 8 anos (com exceção de infecções graves específicas sem substituto, como febre maculosa por Rickettsia).",
    },
    keyTakeaway: "Quelam cálcio e pigmentam irreversivelmente a dentina: contraindicadas < 8 anos e na gestação.",
    area: "Farmacologia & Pediatria",
  },
  {
    id: "fisiologia-renal-aines-ieca",
    category: "Fisiologia",
    categoryColor: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-800/40",
      badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    },
    title: "A Dinâmica da Arteríola Aferente e Eferente nos Rins",
    shortFact:
      "A taxa de filtração glomerular depende do equilíbrio de pressão entre a arteríola aferente (aberta por prostaglandinas) e a eferente (contraída por angiotensina II): o uso simultâneo de AINE e IECA pode causar insuficiência renal aguda súbita.",
    detailedExplanation: {
      mechanism:
        "As prostaglandinas locais mantêm a arteríola aferente dilatada, garantindo fluxo de entrada. A angiotensina II contrai a arteríola eferente, gerando uma 'represa' que mantém a pressão intraglomerular elevada para filtrar a urina.",
      clinicalSignificance:
        "Quando um idoso desidratado toma um AINE (que bloqueia prostaglandinas fechando a aferente) junto com um IECA/BRA (que impede a contração da eferente), o glomérulo perde a pressão de perfusão e a filtração glomerular colapsa instantaneamente.",
      goldenRule:
        "Macete de nefrologia: AINE 'Afoga' a Aferente (vasoconstrição pré-glomerular). IECA/BRA 'Esvazia' a Eferente (vasodilatação pós-glomerular). A associação com diurético forma o perigoso 'Triple Whammy' de IRA pré-renal.",
    },
    keyTakeaway: "AINE + IECA/BRA + Diurético = Tríplice golpe nefrítico e colapso da filtração glomerular.",
    area: "Nefrologia & Farmacologia",
  },
  {
    id: "leite-materno-anticorpos-entero-mamario",
    category: "Curiosidade",
    categoryColor: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800/40",
      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    title: "O Fascinante Eixo Entero-Mamário no Leite Materno",
    shortFact:
      "O leite materno contém anticorpos IgA específicos contra os patógenos exatos aos quais a mãe e o bebê foram expostos no ambiente domiciliar nas últimas horas.",
    detailedExplanation: {
      mechanism:
        "Quando a mãe ingere ou inala microrganismos de seu lar, as placas de Peyer no epitélio intestinal captam esses antígenos. Linfócitos B estimulados são sensibilizados e migram através do sistema linfático e ducto torácico especificamente para a glândula mamária lactante.",
      clinicalSignificance:
        "Na mama, esses linfócitos se diferenciam em plasmócitos produtores de Imunoglobulina A Secretória (IgA-s) sob medida, que é transferida ativamente para o colostro e leite maduro, revestindo a mucosa intestinal e respiratória do recém-nascido.",
      goldenRule:
        "A IgA secretória não é digerida pelo ácido gástrico do bebê graças ao seu componente secretor! Ela funciona como um 'escudo luminal' que impede a adesão bacteriana e viral sem provocar inflamação danosa no intestino do lactente.",
    },
    keyTakeaway: "A mãe produz 'vacinas' diárias via leite contra os germes do ambiente da casa do bebê.",
    area: "Imunologia & Pediatria",
  },
  {
    id: "aminoglicosideos-pico-efeito-pos-ab",
    category: "Farmacologia",
    categoryColor: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800/40",
      badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    title: "Efeito Pós-Antibiótico dos Aminoglicosídeos",
    shortFact:
      "Aminoglicosídeos (Gentamicina, Amicacina) matam bactérias por concentração-pico (Cmax/MIC) e possuem efeito pós-antibiótico prolongado, justificando sua prescrição em dose única diária mais segura.",
    detailedExplanation: {
      mechanism:
        "Eles ligam-se de forma irreversível à subunidade 30S do ribossomo bacteriano, causando leitura incorreta do RNA mensageiro e rompimento da membrana externa de Gram-negativos aeróbios.",
      clinicalSignificance:
        "O efeito pós-antibiótico (EPA) permite que a replicação bacteriana continue inibida por muitas horas após os níveis séricos caírem abaixo da concentração inibitória mínima. Além disso, a nefrotoxicidade e ototoxicidade dependem do tempo de exposição no vale (nível sérico basal contínuo).",
      goldenRule:
        "Por isso, a administração em dose única diária (ex: Amicacina 15 mg/kg 1x/dia) atinge maior pico bactericida e permite que o nível no vale caia a zero, reduzindo a saturação dos túbulos proximais renais e diminuindo a toxicidade.",
    },
    keyTakeaway: "Dose única diária de aminoglicosídeo maximiza o pico bactericida e protege o rim e ouvido.",
    area: "Infectologia & Farmacologia",
  },
  {
    id: "dissociacao-albumino-citologica-guillain-barre",
    category: "Semiologia",
    categoryColor: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200 dark:border-indigo-800/40",
      badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    },
    title: "Dissociação Proteíno-Citológica na Síndrome de Guillain-Barré",
    shortFact:
      "O achado liquórico patognomônico de Guillain-Barré é a dissociação proteíno-citológica: aumento exuberante de proteínas com contagem celular normal ou discretamente elevada.",
    detailedExplanation: {
      mechanism:
        "A reação autoimune pós-infecciosa (frequentemente após Campylobacter jejuni, Zika ou infecções virais respiratórias) ataca a bainha de mielina das raízes nervosas espinhais proximais (radiculite). A ruptura da barreira hemato-neural no nível radicular libera grande quantidade de proteínas no espaço subaracnóideo.",
      clinicalSignificance:
        "Entretanto, como o processo não é uma infecção meníngea ou inflamação intra-tecal primária, não há recrutamento maciço de leucócitos para o líquor (geralmente < 10 a 50 células/mm³ com proteínas > 100-300 mg/dL).",
      goldenRule:
        "Cuidado de prova e plantão: Na primeira semana de fraqueza muscular ascendente arreflexa, até 50% dos pacientes com Guillain-Barré podem ter líquor completamente normal! Não atrase Imunoglobulina Humana ou Plasmaférese esperando o líquor alterar.",
    },
    keyTakeaway: "Fraqueza motora flácida simétrica ascendente + arreflexia: líquor normal nos primeiros dias não descarta.",
    area: "Neurologia Clínica",
  },
  {
    id: "reflexo-mergulho-taquicardia",
    category: "Curiosidade",
    categoryColor: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800/40",
      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    title: "O Reflexo de Mergulho Humano no Manejo de Taquiarritmias",
    shortFact:
      "Mergulhar o rosto subitamente em uma bacia com água gelada deflagra o reflexo filogenético de mergulho, causando bradicardia vagal imediata com eficácia surpreendente para reverter TPSV.",
    detailedExplanation: {
      mechanism:
        "Termorreceptores e mecanorreceptores da divisão oftálmica do nervo trigêmeo (V par) na face detectam frio e umidade simultaneamente, enviando eferências diretas ao núcleo dorsal do vago no bulbo. O sistema parassimpático descarrega acetilcolina no nó sinoatrial e atrioventricular.",
      clinicalSignificance:
        "Simultaneamente, ocorre vasoconstrição periférica intensa nas extremidades para concentrar sangue oxigenado no cérebro e coração. Em lactentes e crianças pequenas que não conseguem fazer a manobra de Valsalva, a aplicação de compressa com água gelada na face é manobra vagal de primeira linha para Taquicardia Paroxística Supraventricular (TPSV).",
      goldenRule:
        "Em adultos com TPSV estável, a Manobra de Valsalva Modificada (soprar em seringa de 10mL gerando 40 mmHg por 15s e depois deitar com elevação passiva de membros inferiores por 15s) tem sucesso de reversão de quase 45%, evitando adenosina.",
    },
    keyTakeaway: "Estímulo trigeminal-vagal frio na face freia o nó AV e pode abortar taquiarritmias supraventriculares.",
    area: "Cardiologia & Emergência",
  },
  {
    id: "sulfato-magnesio-pre-eclampsia",
    category: "Emergência",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Sulfato de Magnésio na Pré-Eclâmpsia Grave",
    shortFact:
      "O Sulfato de Magnésio é a droga de escolha absoluta para profilaxia e tratamento das convulsões da eclâmpsia, sendo superior a qualquer benzodiazepínico ou fenitoína.",
    detailedExplanation: {
      mechanism:
        "O magnésio atua como antagonista fisiológico dos canais de cálcio e bloqueador não competitivo dos receptores glutamatérgicos NMDA cerebrais, diminuindo a excitabilidade neuronal e promovendo vasodilatação seletiva das artérias cerebrais que sofreram vasoespasmo na pré-eclâmpsia.",
      clinicalSignificance:
        "Esquemas clássicos: Pritchard (ataque IM + manutenção IM) ou Zuspan (ataque IV + manutenção em bomba de infusão contínua). É obrigatório monitorar toxicidade durante toda a infusão.",
      goldenRule:
        "A tríade de monitorização do Magnésio: 1) Reflexo patelar presente; 2) Frequência respiratória > 16 irpm; 3) Débito urinário > 25-30 mL/h (o magnésio é excretado exclusivamente pelos rins). Se perda do reflexo ou bradipneia, pare a infusão e administre o antídoto: Gluconato de Cálcio 10% a 1g IV lento.",
    },
    keyTakeaway: "Magnésio previne eclâmpsia; vigie reflexo patelar, diurese e tenha gluconato de cálcio à mão.",
    area: "Ginecologia e Obstetrícia",
  },
  {
    id: "naloxona-flumazenil-antidotos",
    category: "Macete de Prova",
    categoryColor: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/40",
      badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
    title: "Cuidado com Flumazenil vs Naloxona no Coma",
    shortFact:
      "A Naloxona pode ser feita liberalmente na suspeita de overdose de opióides; já o Flumazenil deve ser usado com extremo cuidado, pois pode deflagrar estado de mal epiléptico refratário se houver uso crônico de benzodiazepínicos ou co-ingestão de antidepressivos tricíclicos.",
    detailedExplanation: {
      mechanism:
        "A Naloxona é antagonista competitivo puro dos receptores opióides mu, kappa e delta. O Flumazenil é antagonista do sítio benzodiazepínico no complexo receptor GABA-A.",
      clinicalSignificance:
        "Se o paciente for usuário habitual de benzodiazepínicos ou tiver ingerido tricíclicos (que baixam o limiar convulsígeno), a retirada abrupta do tônus inibitório GABAérgica pelo Flumazenil gera convulsões graves que não respondem mais a diazepam ou midazolam.",
      goldenRule:
        "Mnemônico do coma de origem indeterminada: D-O-N-A (Dextrose se hipoglicemia, Oxigênio se hipoxemia, Naloxona se miose/bradipneia opióide). Flumazenil só é seguro para reversão de sedação de procedimento procedural conhecido, nunca no coma toxicológico cego!",
    },
    keyTakeaway: "Naloxona é segura na emergência; Flumazenil cego em coma por overdose pode ser fatal por convulsão.",
    area: "Toxicologia & Emergência",
  },
];

/**
 * Retorna a curiosidade baseada no índice da hora do dia ou por chave arbitrária.
 * Uma hora tem 3600000ms.
 */
export function getCuriosityForCurrentHour(customIndex?: number): {
  curiosity: MedicalCuriosity;
  total: number;
  currentIndex: number;
  minutesRemainingInHour: number;
} {
  const total = MEDICAL_CURIOSITIES.length;
  const now = new Date();
  const currentHourTimestamp = Math.floor(now.getTime() / (1000 * 60 * 60));
  const minutesRemaining = 60 - now.getMinutes();

  const chosenIndex =
    typeof customIndex === "number" && !isNaN(customIndex)
      ? ((customIndex % total) + total) % total
      : currentHourTimestamp % total;

  return {
    curiosity: MEDICAL_CURIOSITIES[chosenIndex],
    total,
    currentIndex: chosenIndex,
    minutesRemainingInHour: minutesRemaining,
  };
}
