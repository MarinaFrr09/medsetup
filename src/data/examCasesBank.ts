import {
  getTodayFormattedDate,
  getTodayKey,
  normalizeDiagnosisString,
} from "./clinicalCasesBank";

export interface ProgressiveExamCase {
  id: string;
  date: string;
  examName: string;
  acceptedSynonyms: string[];
  examCategory: string;
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
    indicationsAndInterpretation: string;
    pearls: string[];
  };
}

export const BUILTIN_PROGRESSIVE_EXAMS: ProgressiveExamCase[] = [
  {
    id: "exam-angiotc-tep",
    date: "19/11/2026",
    examName: "Angiotomografia de artérias pulmonares",
    acceptedSynonyms: [
      "angiotomografia de torax",
      "angiotc de torax",
      "angio-tc de arterias pulmonares",
      "angio tc pulmonar",
      "angiotomografia pulmonar",
    ],
    examCategory: "Imagem / Emergência",
    difficulty: "Fácil",
    clues: [
      "Paciente de 52 anos no 10º dia de pós-operatório ortopédico chega à emergência com dispneia súbita, dor torácica pleurítica e taquicardia (FC 118 bpm), apresentando alta probabilidade pré-teste pelo escore de Wells.",
      "A ausculta pulmonar é completamente limpa apesar da hipoxemia (SpO2 88%) e há edema assimétrico na panturrilha direita. Por ter alta probabilidade clínica, não se deve aguardar dosagem de D-dímero antes do exame confirmatório.",
      "Trata-se de um exame de imagem de alta resolução com radiação ionizante que exige injeção intravenosa rápida em bolus de contraste iodado para opacificar a árvore vascular torácica no tempo arterial adequado.",
      "O achado diagnóstico confirmatório típico consiste na visualização direta de uma 'falha de enchimento' intraluminal oclusiva ou parcial nos ramos principais, lobares ou segmentares das artérias pulmonares.",
      "É o exame padrão-ouro atual na prática clínica para confirmação rápida de tromboembolismo pulmonar (TEP) em pacientes hemodinamicamente estáveis sem insuficiência renal grave ou alergia severa ao contraste (casos em que se opta pela cintilografia V/Q).",
    ],
    debriefing: {
      overview:
        "A Angiotomografia Computadorizada (Angio-TC) de artérias pulmonares é o exame de escolha para confirmar ou excluir Tromboembolismo Pulmonar (TEP) em pacientes com probabilidade clínica alta (Wells > 4) ou probabilidade baixa/intermediária com D-dímero positivo.",
      clueBreakdown: [
        "Cenário clínico: Pós-operatório ortopédico + dispneia súbita + dor pleurítica + Wells alto -> suspeita direta de TEP agudo.",
        "Pista 2/5: Quando a probabilidade pré-teste é alta, o D-dímero NÃO deve ser pedido para descartar TEP; vai-se direto para o exame de imagem confirmatório.",
        "Pista 3/5: Exame tomográfico com contraste iodado IV sincronizado com o tempo arterial pulmonar.",
        "Pista 4/5: A falha de enchimento intraluminal dentro da artéria pulmonar opacificada pelo contraste é o sinal direto do trombo.",
        "Pista 5/5: Substituiu a angiografia pulmonar invasiva como padrão-ouro prático; contraindicações relativas incluem DRC grave (ClCr < 30), alergia grave ao iodo e gestação (onde se prefere USG Doppler de MMII ou cintilografia V/Q).",
      ],
      differentials: [
        {
          name: "Dosagem de D-dímero",
          distinction:
            "Exame de TRIAGEM com altíssimo valor preditivo negativo apenas para pacientes de BAIXA ou INTERMEDIÁRIA probabilidade clínica — nunca confirma TEP e não deve atrasar a imagem em Wells alto.",
        },
        {
          name: "Cintilografia pulmonar ventilação/perfusão (V/Q)",
          distinction:
            "Alternativa de escolha quando há contraindicação ao contraste iodado (DRC grave, alergia severa) ou em gestantes com radiografia de tórax normal.",
        },
      ],
      indicationsAndInterpretation:
        "1. Solicitar em Wells > 4 (alta probabilidade) ou Wells ≤ 4 com D-dímero elevado.\n2. Avaliar também a razão VD/VE (se VD/VE > 0,9-1,0 indica sobrecarga de ventrículo direito / TEP de risco intermediário).\n3. Em TEP maciço instável (choque) sem condições de ir à tomografia, usa-se Ecocardiograma à beira-leito para identificar disfunção aguda de VD e indicar trombólise.",
      pearls: [
        "Wells alto (> 4 pontos) = NÃO pedir D-dímero -> pedir direto Angiotomografia de artérias pulmonares!",
        "Achado clássico na Angio-TC: falha de enchimento intraluminal arterial.",
      ],
    },
  },
  {
    id: "exam-tc-cranio-sem-contraste",
    date: "20/11/2026",
    examName: "Tomografia computadorizada de crânio sem contraste",
    acceptedSynonyms: [
      "tc de cranio sem contraste",
      "tomografia de cranio sem contraste",
      "tc de cranio",
      "tomografia de cranio",
      "tcc sem contraste",
    ],
    examCategory: "Imagem / Neurologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Homem de 68 anos, hipertenso e diabético, chega à sala vermelha com hemiparesia direita súbita e afasia de expressão iniciadas há 55 minutos.",
      "Os sinais vitais mostram PA 175x95 mmHg, glicemia capilar 118 mg/dL (afastando hipoglicemia) e NIHSS de 12 pontos. O paciente está dentro da janela terapêutica de 4,5 horas para trombólise intravenosa com alteplase.",
      "Trata-se do exame de neuroimagem inicial obrigatório de realização ultrarrápida (meta porta-exame < 20 a 25 minutos), que NÃO utiliza contraste venoso para não mascarar sangue agudo.",
      "Na fase hiperaguda (< 6 horas) de uma isquemia cerebral, este exame costuma ser completamente normal (ou mostrar apenas apagamento de sulcos e sinal da artéria cerebral média hiperdensa), mas identifica com ~100% de sensibilidade qualquer coleção hiperdensa (branca) de hemorragia aguda.",
      "Seu principal objetivo imediato na janela do AVC agudo não é 'ver o infarto isquêmico', mas sim EXCLUIR hemorragia intracraniana para liberar com segurança o trombolítico intravenoso.",
    ],
    debriefing: {
      overview:
        "A Tomografia Computadorizada (TC) de crânio SEM contraste é o primeiro exame obrigatório em todo paciente com suspeita de AVC agudo, hemorragia subaracnóidea ou traumatismo cranioencefálico. Por ser rápida, amplamente disponível e extremamente sensível para sangue agudo (hiperdenso), define a conduta imediata na sala de emergência.",
      clueBreakdown: [
        "Cenário clínico: Déficit neurológico focal súbito dentro da janela de trombólise (< 4,5 horas).",
        "Pista 2/5: Após checar glicemia capilar (que pode mimetizar AVC), a neuroimagem imediata é o próximo passo obrigatório.",
        "Pista 3/5: Deve ser SEM contraste (contraste iodado também fica branco/hiperdenso e confundiria a detecção de hemorragia).",
        "Pista 4/5: No AVC isquêmico hiperagudo a TC frequentemente está normal — e isso NÃO impede a trombólise! Se houver área hiperdensa intraparenquimatosa ou nas cisternas da base, confirma hemorragia.",
        "Pista 5/5: Objetivo número 1 na emergência: diferenciar AVC isquêmico de AVC hemorrágico antes de administrar Alteplase/Tenecteplase.",
      ],
      differentials: [
        {
          name: "Ressonância magnética de encéfalo (sequência DWI)",
          distinction:
            "É mais sensível para detectar isquemia cerebral precoce em minutos, mas é mais demorada e menos disponível na emergência — nunca deve atrasar a trombólise se a TC sem contraste já afastou sangramento.",
        },
        {
          name: "Tomografia de crânio COM contraste",
          distinction:
            "Usada para investigar tumores, abscessos ou neurotoxoplasmose (realce anelar), mas contraindicada como primeiro exame no AVC agudo sem a fase pré-contraste.",
        },
      ],
      indicationsAndInterpretation:
        "1. Meta de tempo no protocolo AVC: realização em ≤ 25 minutos e laudo em ≤ 45 minutos da chegada.\n2. TC sem hemorragia + déficit incapacitante + início < 4,5h + sem contraindicações = Trombólise IV com Alteplase (0,9 mg/kg) ou Tenecteplase.\n3. Também é o exame inicial de escolha na cefaleia em trovoada (suspeita de Hemorragia Subaracnóidea).",
      pearls: [
        "No AVC isquêmico hiperagudo (< 4,5h), a TC de crânio sem contraste geralmente é NORMAL — sua função é excluir hemorragia!",
        "Antes de pedir TC no déficit neurológico súbito, sempre cheque a GLICEMIA CAPILAR!",
      ],
    },
  },
  {
    id: "exam-puncao-lombar",
    date: "21/11/2026",
    examName: "Punção lombar (Análise do líquor)",
    acceptedSynonyms: [
      "puncao lombar",
      "exame do liquor",
      "analise do liquor",
      "lcr",
      "liquor",
      "coleta de liquor",
    ],
    examCategory: "Procedimento Diagnóstico / Laboratorial",
    difficulty: "Fácil",
    clues: [
      "Jovem de 22 anos chega ao pronto-socorro com febre alta (39,3°C), cefaleia holocraniana intensa, fotofobia e rigidez de nuca há 12 horas, sem déficits neurológicos focais, sem papiledema e com Glasgow 15.",
      "Também é fundamental na investigação de cefaleia em trovoada com TC de crânio normal após 6 horas (para pesquisa de xantocromia) e na confirmação de polirradiculoneuropatia inflamatória aguda (Síndrome de Guillain-Barré).",
      "Consiste em um procedimento invasivo realizado à beira-leito com agulha espinhal introduzida nos espaços intervertebrais L3-L4 ou L4-L5 (abaixo do cone medular), permitindo aferir a pressão de abertura e coletar fluido do espaço subaracnóideo.",
      "Seus achados laboratoriais diferenciam etiologias com precisão: pleocitose neutrofílica com hipoglicorraquia e hiperproteinorraquia indica infecção bacteriana; celularidade normal com proteína muito elevada caracteriza dissociação proteíno-citológica.",
      "É formalmente contraindicada antes de uma TC de crânio em pacientes com rebaixamento do nível de consciência, imunossupressão, crise convulsiva recente, déficit neurológico focal ou papiledema (pelo risco de herniação cerebral).",
    ],
    debriefing: {
      overview:
        "A Punção Lombar com análise completa do Líquido Cefalorraquidiano (LCR) — incluindo pressão de abertura, citometria/citologia, bioquímica (proteína, glicose, lactato), Gram, cultura, tinta da China/CrAg e PCR — é o padrão-ouro para o diagnóstico das meningites, encefalites, HSA com TC negativa e Síndrome de Guillain-Barré.",
      clueBreakdown: [
        "Cenário clínico: Síndrome meníngea clássica (febre + cefaleia + rigidez de nuca) sem contraindicações para coleta direta.",
        "Pista 2/5: Outras duas indicações clássicas de prova: HSA com TC normal (xantocromia) e Guillain-Barré (dissociação proteíno-citológica).",
        "Pista 3/5: Técnica anatômica em L3-L4 ou L4-L5 (onde a medula já terminou em L1-L2, restando apenas a cauda equina).",
        "Pista 4/5: Padrões clássicos do líquor: Bacteriano (turvo, neutrófilos, glicose baixa < 40, proteína alta) vs. Viral (límpido, linfócitos, glicose normal) vs. Tuberculoso/Fúngico (linfócitos, glicose baixa, proteína muito alta).",
        "Pista 5/5: Indicações de TC de crânio ANTES da punção lombar: imunocomprometido, história de doença do SNC, convulsão recente, papiledema, rebaixamento do sensório ou déficit focal.",
      ],
      differentials: [
        {
          name: "Tomografia computadorizada de crânio",
          distinction:
            "NÃO diagnostica meningite — serve apenas como exame de segurança prévio em pacientes com sinais de hipertensão intracraniana ou lesão expansiva antes de realizar a punção lombar.",
        },
        {
          name: "Hemocultura periférica",
          distinction:
            "Exame complementar importante que deve ser colhido junto na suspeita de meningite bacteriana, mas não substitui a análise direta do espaço subaracnóideo.",
        },
      ],
      indicationsAndInterpretation:
        "1. Sempre aferir a glicemia sérica simultaneamente (glicorraquia normal ≥ 2/3 da glicemia).\n2. Se houver indicação de TC prévia na suspeita de meningite bacteriana: coletar hemoculturas e INICIAR antibiótico + dexametasona IMEDIATAMENTE (nunca atrasar o antibiótico esperando TC ou líquor!).\n3. Complicação mais comum: cefaleia pós-punção ortostática (piora em pé, melhora deitado).",
      pearls: [
        "NUNCA atrase o antibiótico na suspeita de meningite bacteriana por causa de TC ou punção lombar!",
        "Dissociação proteíno-citológica (muita proteína + células normais no líquor) = Síndrome de Guillain-Barré.",
      ],
    },
  },
  {
    id: "exam-ecocardio-transesofagico",
    date: "22/11/2026",
    examName: "Ecocardiograma transesofágico",
    acceptedSynonyms: [
      "ecocardiograma transesofagico",
      "ete",
      "eco transesofagico",
    ],
    examCategory: "Cardiologia / Imagem",
    difficulty: "Médio",
    clues: [
      "Homem de 59 anos portador de prótese valvar mitral mecânica apresenta febre persistente há 12 dias, sopro cardíaco novo e hemoculturas positivas para Staphylococcus aureus.",
      "O exame ultrassonográfico inicial realizado pela parede torácica (transtorácico) foi inconclusivo devido à sombra acústica gerada pela prótese metálica e à janela acústica limitada do paciente.",
      "Trata-se de um exame semi-invasivo realizado sob sedação leve em jejum, no qual uma sonda com transdutor de ultrassom é introduzida pelo esôfago para posicionar-se imediatamente atrás do átrio esquerdo.",
      "Permite visualização de altíssima definição de vegetações valvares pequenas (< 5 mm), abscessos perivalvares, deiscência de próteses, trombos no apêndice atrial esquerdo (antes de cardioversão de FA) e flap intimal na aorta ascendente.",
      "Possui sensibilidade superior a 90-95% para o diagnóstico de endocardite infecciosa em valvas protéticas e é o exame de escolha para descartar trombo intracavitário no apêndice atrial esquerdo antes de cardioversão precoce.",
    ],
    debriefing: {
      overview:
        "O Ecocardiograma Transesofágico (ETE) posiciona o transdutor de ultrassom no esôfago, a poucos milímetros das estruturas cardíacas posteriores (átrio esquerdo, apêndice atrial esquerdo, valva mitral e raiz da aorta), eliminando a interferência das costelas, pulmões e parede torácica.",
      clueBreakdown: [
        "Cenário clínico: Suspeita alta de endocardite infecciosa em prótese valvar cardíaca.",
        "Pista 2/5: Quando o Ecocardiograma Transtorácico (ETT) é negativo ou inconclusivo mas a suspeita clínica de endocardite permanece alta (ou sempre que houver prótese valvar/marcapasso), o próximo passo obrigatório é o ETE.",
        "Pista 3/5: Sonda ultrassonográfica via esofágica sob sedação.",
        "Pista 4/5: Visualização direta de vegetações < 5 mm, abscessos de anel valvar e trombo em auriculeta (apêndice atrial esquerdo).",
        "Pista 5/5: Sensibilidade > 90% na endocardite protética e padrão-ouro para liberar cardioversão elétrica de FA > 48h sem 3 semanas prévias de anticoagulação.",
      ],
      differentials: [
        {
          name: "Ecocardiograma transtorácico (ETT)",
          distinction:
            "É o primeiro exame não invasivo a ser solicitado na maioria dos casos, mas tem menor sensibilidade (50-65%) para vegetações pequenas, abscessos perivalvares, próteses valvares e trombo no apêndice atrial esquerdo.",
        },
        {
          name: "Angiotomografia de coronárias",
          distinction:
            "Avalia anatomia arterial coronariana e placas ateroscleróticas, não sendo o exame funcional/dinâmico de escolha para vegetações móveis ou trombo de apêndice atrial.",
        },
      ],
      indicationsAndInterpretation:
        "1. Indicações clássicas: Endocardite infecciosa (prótese valvar, complicações perivalvares, ETT inconclusivo com alta suspeita), pesquisa de trombo em apêndice atrial esquerdo pré-cardioversão de FA, dissecção de aorta em paciente instável e pesquisa de forame oval patente (FOP) no AVC criptogênico.\n2. Contraindicações: Estenose/perfuração esofágica, varizes esofágicas com sangramento ativo ou divertículo de Zenker.",
      pearls: [
        "Prótese valvar + suspeita de Endocardite = Ecocardiograma Transesofágico (ETE)!",
        "Antes de cardioverter FA com duração > 48h (ou desconhecida) sem 3 semanas de anticoagulação prévia -> fazer ETE para descartar trombo no apêndice atrial esquerdo.",
      ],
    },
  },
  {
    id: "exam-usg-transvaginal",
    date: "23/11/2026",
    examName: "Ultrassonografia transvaginal",
    acceptedSynonyms: [
      "ultrassonografia transvaginal",
      "usg transvaginal",
      "ustv",
      "ecografia transvaginal",
    ],
    examCategory: "Ginecologia e Obstetrícia / Imagem",
    difficulty: "Fácil",
    clues: [
      "Mulher de 27 anos com atraso menstrual de 6 semanas e Beta-hCG sérico de 3.200 mUI/mL chega ao pronto-socorro com dor em fossa ilíaca direita e discreto sangramento vaginal escuro.",
      "Também é o exame inicial de escolha na investigação de sangramento uterino anormal na pós-menopausa (para medir a espessura endometrial) e na avaliação de massas anexiais ou torção ovariana.",
      "Exame de imagem sem radiação ionizante que utiliza transdutor endocavitário de alta frequência posicionado próximo ao colo uterino e fundos de saco vaginais, oferecendo resolução superior à via suprapúbica.",
      "Neste cenário, o achado clássico é a cavidade uterina vazia (sem saco gestacional intrauterino apesar do Beta-hCG acima da zona discriminatória de 1.500-2.000 mUI/mL), associada a massa anexial em 'sinal do anel tubário' e líquido livre na pelve.",
      "Na pós-menopausa com sangramento vaginal, uma espessura endometrial ≤ 4 mm medida por este exame possui altíssimo valor preditivo negativo para câncer de endométrio.",
    ],
    debriefing: {
      overview:
        "A Ultrassonografia Transvaginal (USTV) é o exame de imagem padrão-ouro inicial em Ginecologia e Obstetrícia do 1º trimestre. Por posicionar o transdutor de alta frequência muito próximo ao útero e ovários, identifica estruturas gestacionais precoces (~4,5 a 5 semanas) e patologias endometriais/anexiais com nitidez muito superior ao ultrassom pélvico abdominal.",
      clueBreakdown: [
        "Cenário clínico: Mulher em idade fértil com Beta-hCG > 2.000 mUI/mL + dor pélvica + sangramento = suspeita de gravidez ectópica.",
        "Pista 2/5: Outras indicações clássicas: avaliação de eco endometrial na pós-menopausa, miomas, endometriomas e torção anexial (com Doppler).",
        "Pista 3/5: Sem radiação ionizante, transdutor endocavitário de alta frequência (bexiga vazia).",
        "Pista 4/5: Zona discriminatória do Beta-hCG (1.500-2.000 mUI/mL) + útero vazio + sinal do anel tubário na USTV = Gravidez ectópica!",
        "Pista 5/5: Eco endometrial > 4 mm (ou > 5 mm em algumas diretrizes) em mulher na pós-menopausa sem terapia hormonal indica biópsia endometrial / histeroscopia.",
      ],
      differentials: [
        {
          name: "Histeroscopia diagnóstica",
          distinction:
            "Exame padrão-ouro endoscópico para visualizar diretamente e biopsiar lesões intracavitárias (pólipos, miomas submucosos, câncer de endométrio), solicitado APÓS alteração na USTV.",
        },
        {
          name: "Tomografia computadorizada de pelve",
          distinction:
            "Envolve radiação ionizante (evitada em gestantes/mulheres em idade fértil com Beta-hCG positivo) e tem menor definição para o endométrio e saco gestacional precoce.",
        },
      ],
      indicationsAndInterpretation:
        "1. 1º Trimestre: confirma gestação tópica, datação pelo CCN (comprimento cabeça-nádega), vitalidade embrionária (BCF) e diagnostica gravidez ectópica ou mola hidatiforme ('tempestade de neve').\n2. Pós-menopausa com sangramento: se endométrio > 4 mm (sem TH) -> prosseguir com histeroscopia/biópsia endometrial.",
      pearls: [
        "Beta-hCG > 2.000 mUI/mL + Útero vazio na USTV = Gravidez ectópica até que se prove o contrário!",
        "Sinal da 'tempestade de neve' / 'cachos de uva' na USTV = Mola hidatiforme completa.",
      ],
    },
  },
  {
    id: "exam-espirometria",
    date: "24/11/2026",
    examName: "Espirometria com prova broncodilatadora",
    acceptedSynonyms: [
      "espirometria",
      "espirometria com prova broncodilatadora",
      "prova de funcao pulmonar",
      "espirometria com bd",
    ],
    examCategory: "Pneumologia / Funcional",
    difficulty: "Fácil",
    clues: [
      "Homem de 61 anos, tabagista de 40 maços-ano, procura o ambulatório por dispneia progressiva aos esforços médios e tosse crônica com expectoração matinal há 2 anos.",
      "Também é o exame funcional indispensável para confirmar o diagnóstico de asma brônquica e diferenciar distúrbios ventilatórios obstrutivos de restritivos.",
      "Trata-se de um exame não invasivo de função pulmonar realizado em duas fases: manobras de expiração forçada máxima antes e 15 a 20 minutos após a inalação de um beta-2 agonista de curta ação (como salbutamol 400 mcg).",
      "O parâmetro central avaliado é a razão entre o Volume Expiratório Forçado no primeiro segundo e a Capacidade Vital Forçada (VEF1/CVF): valores abaixo de 0,70 após broncodilatador selam obstrução fixa ao fluxo aéreo (DPOC).",
      "Na asma, observa-se classicamente resposta positiva à prova broncodilatadora (aumento do VEF1 ≥ 12% e ≥ 200 mL em relação ao valor basal pré-BD).",
    ],
    debriefing: {
      overview:
        "A Espirometria com Prova Broncodilatadora é o exame padrão-ouro para o diagnóstico, classificação de gravidade (GOLD 1 a 4) e acompanhamento tanto da DPOC quanto da Asma Brônquica.",
      clueBreakdown: [
        "Cenário clínico: Tabagista pesado > 40 anos com dispneia progressiva e tosse crônica -> investigação obrigatória de DPOC.",
        "Pista 2/5: Diferencia doenças obstrutivas (Asma, DPOC) de restritivas (Fibrose pulmonar).",
        "Pista 3/5: Expiração forçada máxima pré e pós-salbutamol inalatório.",
        "Pista 4/5: Critério diagnóstico obrigatório de DPOC (GOLD): relação VEF1/CVF < 0,70 PÓS-broncodilatador.",
        "Pista 5/5: Critério clássico de reversibilidade na Asma: aumento do VEF1 ≥ 12% E ≥ 200 mL pós-broncodilatador.",
      ],
      differentials: [
        {
          name: "Radiografia de tórax",
          distinction:
            "Pode mostrar hiperinsuflação pulmonar ou retificação de cúpulas diafragmáticas na DPOC avançada, mas NÃO fecha o diagnóstico de DPOC nem de Asma.",
        },
        {
          name: "Tomografia de tórax de alta resolução (TCAR)",
          distinction:
            "Exame de escolha para doenças intersticiais pulmonares (fibrose pulmonar idiopática), bronquiectasias e rastreamento de câncer de pulmão — não substitui a espirometria no diagnóstico funcional de DPOC/asma.",
        },
      ],
      indicationsAndInterpretation:
        "1. Relação VEF1/CVF pós-BD < 0,70 = Distúrbio Ventilatório Obstrutivo (confirma DPOC em contexto clínico compatível).\n2. Gravidade da obstrução (GOLD): GOLD 1 (VEF1 ≥ 80%), GOLD 2 (50-79%), GOLD 3 (30-49%), GOLD 4 (< 30%).\n3. Se espirometria normal mas forte suspeita de asma: solicitar Teste de Broncoprovocação (metacolina) ou monitoramento do Pico de Fluxo Expiratório (PFE).",
      pearls: [
        "DPOC exige obrigatoriamente VEF1/CVF < 0,70 PÓS-broncodilatador na espirometria!",
        "Prova broncodilatadora positiva (Asma) = ↑VEF1 ≥ 12% e ≥ 200 mL.",
      ],
    },
  },
  {
    id: "exam-cpre",
    date: "25/11/2026",
    examName: "Colangiopancreatografia retrógrada endoscópica (CPRE)",
    acceptedSynonyms: [
      "cpre",
      "colangiopancreatografia retrograda endoscopica",
    ],
    examCategory: "Gastroenterologia / Cirurgia / Endoscopia",
    difficulty: "Médio",
    clues: [
      "Mulher de 67 anos com icterícia obstrutiva, febre alta com calafrios, dor em hipocôndrio direito e hipotensão (Pêntade de Reynolds) apresenta dilatação do colédoco (1,5 cm) com cálculo distal impactado ao ultrassom.",
      "Embora a colangiorressonância (CPRM) seja excelente para diagnóstico anatômico não invasivo, esta paciente precisa de um procedimento que permita descompressão imediata e retirada do cálculo da via biliar.",
      "Trata-se de um procedimento combinado endoscópico (duodenoscópio de visão lateral até a papila duodenal maior de Vater) e fluoroscópico (injeção retrógrada de contraste na árvore biliar).",
      "Permite realizar esfincterotomia (papilotomia) endoscópica, drenagem de bile purulenta sob pressão, extração de cálculos coledocianos com balão/basket e passagem de próteses biliares.",
      "Por ser invasivo, hoje tem indicação predominantemente TERAPÊUTICA (não apenas diagnóstica), sendo a pancreatite aguda pós-procedimento sua complicação mais frequente.",
    ],
    debriefing: {
      overview:
        "A CPRE (Colangiopancreatografia Retrógrada Endoscópica) é o procedimento terapêutico padrão-ouro para desobstrução das vias biliares na colangite aguda grave, coledocolitíase confirmada e estenoses biliares malignas ou benignas.",
      clueBreakdown: [
        "Cenário clínico: Colangite aguda grave (Pêntade de Reynolds) com coledocolitíase obstrutiva.",
        "Pista 2/5: Diferente da Colangiorressonância (puramente diagnóstica), a CPRE é diagnóstica E terapêutica.",
        "Pista 3/5: Endoscopia com duodenoscópio de visão lateral + cateterização da papila de Vater + fluoroscopia com contraste.",
        "Pista 4/5: Papilotomia endoscópica + remoção do cálculo + drenagem da via biliar infectada.",
        "Pista 5/5: Complicação mais comum da CPRE = Pancreatite aguda pós-CPRE (prevenida com indometacina retal em pacientes de alto risco).",
      ],
      differentials: [
        {
          name: "Colangiorressonância magnética (CPRM)",
          distinction:
            "Exame NÃO invasivo de alta acurácia para investigar suspeita intermediária de coledocolitíase, mas NÃO permite retirar cálculos nem drenar bile purulenta.",
        },
        {
          name: "Ultrassonografia de abdome",
          distinction:
            "Primeiro exame de triagem para dor em hipocôndrio direito e icterícia (excelente para ver cálculos na vesícula e dilatação do colédoco), porém não é terapêutico.",
        },
      ],
      indicationsAndInterpretation:
        "1. Indicações principais: Colangite aguda (especialmente moderada/grave), coledocolitíase confirmada, pancreatite aguda biliar associada a colangite ou obstrução biliar persistente, e drenagem paliativa de neoplasias periampulares.\n2. Complicações: Pancreatite aguda (mais comum), colangite, hemorragia pós-papilotomia e perfuração duodenal.",
      pearls: [
        "Suspeita intermediária de coledocolitíase -> Colangiorressonância (CPRM). Coledocolitíase confirmada ou Colangite aguda -> CPRE!",
        "Complicação mais frequente da CPRE: Pancreatite aguda.",
      ],
    },
  },
  {
    id: "exam-ecg",
    date: "26/11/2026",
    examName: "Eletrocardiograma de 12 derivações",
    acceptedSynonyms: [
      "ecg",
      "eletrocardiograma",
      "eletrocardiograma de 12 derivacoes",
      "ekg",
    ],
    examCategory: "Cardiologia / Emergência",
    difficulty: "Fácil",
    clues: [
      "Homem de 58 anos, tabagista e hipertenso, chega ao pronto-socorro com dor torácica retroesternal em aperto há 40 minutos, irradiada para o braço esquerdo e acompanhada de sudorese fria e náuseas.",
      "É o exame inicial de realização imediata e obrigatória em toda dor torácica aguda na emergência, com meta rigorosa de execução e interpretação em menos de 10 minutos da chegada do paciente.",
      "Exame rápido, não invasivo, barato e realizado à beira-leito através de eletrodos cutâneos nos membros e região precordial que registram a atividade elétrica cardíaca.",
      "A presença de supradesnivelamento do segmento ST ≥ 1 mm em duas ou mais derivações contíguas (ou ≥ 2 mm em V2-V3 em homens) confirma oclusão coronariana aguda e indica reperfusão imediata SEM aguardar resultado de troponina!",
      "Em pacientes com suspeita de infarto de parede inferior (DII, DIII e aVF), deve ser complementado com derivações direitas (V3R e V4R) para avaliar acometimento do ventrículo direito (onde nitratos e morfina são contraindicados).",
    ],
    debriefing: {
      overview:
        "O Eletrocardiograma (ECG) de 12 derivações é a pedra angular da avaliação inicial na dor torácica aguda, síncopes, palpitações e distúrbios eletrolíticos graves (como hipercalemia com onda T apiculada em tenda).",
      clueBreakdown: [
        "Cenário clínico: Dor torácica anginosa típica aguda (SCA).",
        "Pista 2/5: Regra de ouro das diretrizes de Cardiologia: tempo porta-ECG ≤ 10 minutos!",
        "Pista 3/5: Registro elétrico de superfície com 12 derivações padrão.",
        "Pista 4/5: Supra de ST em derivações contíguas = IAMCSST -> Cateterismo primário (angioplastia) ou trombólise imediata, sem esperar curva de troponina.",
        "Pista 5/5: IAM inferior (DII, DIII, aVF) obriga realizar V3R e V4R para descartar IAM de VD (que é pré-carga dependente e choca se receber nitrato!).",
      ],
      differentials: [
        {
          name: "Dosagem de Troponina ultrassensível",
          distinction:
            "Fundamental para diferenciar Angina Instável de IAM SEM supra de ST (IAMSSST), mas NUNCA deve ser aguardada para indicar reperfusão quando o ECG já mostra supra de ST.",
        },
        {
          name: "Cineangiocoronariografia (Cateterismo cardíaco)",
          distinction:
            "Exame invasivo diagnóstico e terapêutico (angioplastia) indicado APÓS o ECG confirmar IAMCSST ou estratificação de alto risco.",
        },
      ],
      indicationsAndInterpretation:
        "1. Tempo porta-ECG: ≤ 10 minutos.\n2. Se ECG inicial normal mas dor típica persistente: repetir ECG seriamente a cada 15-30 minutos.\n3. Paredes no ECG: Anterior (V1-V4), Lateral (DI, aVL, V5-V6), Inferior (DII, DIII, aVF) e Posterior/Dorsal (V7, V8, V9).",
      pearls: [
        "Tempo porta-ECG na dor torácica = máximo 10 minutos!",
        "IAM inferior (DII, DIII, aVF) -> fazer sempre V3R e V4R (VD) e V7-V9 (dorsal) antes de dar nitrato!",
      ],
    },
  },
  {
    id: "exam-biopsia-arteria-temporal",
    date: "27/11/2026",
    examName: "Biópsia da artéria temporal",
    acceptedSynonyms: [
      "biopsia da arteria temporal",
      "biopsia de arteria temporal",
      "biopsia temporal",
    ],
    examCategory: "Reumatologia / Anatomopatológico",
    difficulty: "Difícil",
    clues: [
      "Mulher de 73 anos apresenta cefaleia temporal direita de início recente, dor no couro cabeludo ao pentear o cabelo, claudicação de mandíbula ao mastigar, VHS de 108 mm/1ªh e episódio transitório de perda visual no olho direito.",
      "Apesar de ser o exame padrão-ouro confirmatório desta vasculite de grandes vasos, sua realização NUNCA deve atrasar o início imediato da corticoterapia em altas doses diante do risco de cegueira bilateral irreversível.",
      "Trata-se de um procedimento cirúrgico ambulatorial sob anestesia local no qual se retira um segmento vascular de pelo menos 1,5 a 2 cm de comprimento (devido ao acometimento segmentar em 'lesões salteadas').",
      "A análise histopatológica demonstra panarterite granulomatosa transmural com fragmentação da lâmina elástica interna e presença característica de células gigantes multinucleadas.",
      "Permanece com alta sensibilidade diagnóstica mesmo quando realizado até 1 a 2 semanas após o início da prednisona ou da pulsoterapia com metilprednisolona.",
    ],
    debriefing: {
      overview:
        "A Biópsia da Artéria Temporal é o padrão-ouro histopatológico para confirmação da Arterite de Células Gigantes (Arterite Temporal / Doença de Horton). Por apresentar lesões descontínuas ('skip lesions'), exige a retirada de um fragmento adequado (≥ 1,5-2 cm).",
      clueBreakdown: [
        "Cenário clínico: Idosa > 50 anos com cefaleia nova + claudicação mandibular + VHS > 100 + amaurose fugaz.",
        "Pista 2/5: Regra clássica de prova: iniciar corticoide IMEDIATAMENTE e agendar a biópsia depois (sem atrasar o tratamento!).",
        "Pista 3/5: Fragmento longo (1,5-2 cm) para evitar falso-negativo pelas lesões salteadas.",
        "Pista 4/5: Achado histológico típico: infiltrado mononuclear/granulomatoso com células gigantes multinucleadas e ruptura da lâmina elástica interna.",
        "Pista 5/5: Continua positiva por até 14 dias após início da corticoterapia.",
      ],
      differentials: [
        {
          name: "Ultrassonografia Doppler de artérias temporais",
          distinction:
            "Exame não invasivo cada vez mais utilizado que mostra o 'sinal do halo' hipoecoico concêntrico, porém é operador-dependente e a biópsia segue como padrão-ouro histológico.",
        },
        {
          name: "Tomografia computadorizada de crânio",
          distinction:
            "Normal na arterite temporal — não avalia a inflamação transmural da artéria temporal superficial.",
        },
      ],
      indicationsAndInterpretation:
        "1. Iniciar Metilprednisolona IV 1 g/dia por 3 dias (se sintomas visuais) ou Prednisona 40-60 mg/dia VO (sem sintomas visuais) IMEDIATAMENTE.\n2. Realizar a biópsia da artéria temporal sintomática preferencialmente em até 1-2 semanas.\n3. Um resultado negativo não exclui totalmente a doença se a suspeita clínica for muito alta (devido às lesões salteadas).",
      pearls: [
        "NUNCA aguarde a Biópsia da Artéria Temporal para iniciar o corticoide na Arterite de Células Gigantes!",
        "Retirar segmento ≥ 1,5-2 cm por causa das 'lesões salteadas' (skip lesions).",
      ],
    },
  },
  {
    id: "exam-colonoscopia",
    date: "28/11/2026",
    examName: "Colonoscopia com biópsia",
    acceptedSynonyms: [
      "colonoscopia",
      "colonoscopia com biopsia",
      "ileocolonoscopia",
    ],
    examCategory: "Gastroenterologia / Endoscopia",
    difficulty: "Fácil",
    clues: [
      "Homem de 62 anos procura o consultório por anemia ferropriva de início recente (Hb 9,2 g/dL, ferritina 8 ng/mL), alteração do hábito intestinal (constipação progressiva com fezes em fita) e perda ponderal de 6 kg em 4 meses.",
      "Também é o método padrão-ouro para rastreamento de câncer colorretal (a partir dos 45 anos em população de risco habitual) e para diferenciar Doença de Crohn de Retocolite Ulcerativa.",
      "Trata-se de um exame endoscópico realizado sob sedação após preparo intestinal rigoroso, permitindo visualizar toda a mucosa do reto, cólon e íleo terminal.",
      "Além do diagnóstico histopatológico de lesões vegetantes/estenosantes ou úlceras aftoides/em 'pedra de calçamento', permite ressecção curativa imediata de pólipos adenomatosos pré-malignos (polipectomia).",
      "Em todo paciente acima de 50 anos (especialmente homens e mulheres pós-menopausa) com anemia ferropriva sem causa evidente, sua solicitação é mandatória para afastar neoplasia de cólon direito.",
    ],
    debriefing: {
      overview:
        "A Colonoscopia (ileocolonoscopia) com biópsia é o exame padrão-ouro para diagnóstico e prevenção do câncer colorretal (via remoção de pólipos adenomatosos), investigação de hematoquezia/anemia ferropriva inexplicada e diagnóstico diferencial das doenças inflamatórias intestinais.",
      clueBreakdown: [
        "Cenário clínico: Homem > 50 anos com anemia ferropriva + alteração do hábito intestinal + emagrecimento = red flags clássicos para neoplasia colorretal.",
        "Pista 2/5: Padrão-ouro no rastreamento do CCR (USPSTF/ACG: iniciar aos 45 anos) e nas DIIs.",
        "Pista 3/5: Exame endoscópico completo do cólon + íleo terminal sob sedação com preparo colônico.",
        "Pista 4/5: Capacidade diagnóstica (biópsia) e terapêutica simultânea (polipectomia e hemostasia).",
        "Pista 5/5: Regra clássica da Clínica Médica: anemia ferropriva em homem adulto ou mulher na pós-menopausa exige investigação do trato gastrointestinal (colonoscopia + EDA) para descartar câncer de cólon direito!",
      ],
      differentials: [
        {
          name: "Pesquisa de sangue oculto nas fezes (FIT)",
          distinction:
            "Teste não invasivo de rastreamento populacional em assintomáticos, mas NÃO serve para pacientes sintomáticos ou com anemia ferropriva (e quando positivo exige colonoscopia).",
        },
        {
          name: "Retossigmoidoscopia flexível",
          distinction:
            "Avalia apenas reto e cólon sigmoide — deixaria passar tumores de cólon direito (principal causa de anemia ferropriva silenciosa).",
        },
      ],
      indicationsAndInterpretation:
        "1. Rastreamento populacional (risco habitual): Colonoscopia a cada 10 anos a partir dos 45 anos.\n2. Na Doença de Crohn: acometimento transmural, salteado, poupa o reto, úlceras em 'pedra de calçamento' e ileíte terminal.\n3. Na Retocolite Ulcerativa: acometimento contínuo e ascendente a partir do reto, restrito à mucosa/submucosa.",
      pearls: [
        "Anemia ferropriva em homem > 50 anos ou mulher pós-menopausa = Colonoscopia obrigatória (pensar em câncer de cólon direito)!",
        "Contraindicada na fase aguda da diverticulite aguda ou megacólon tóxico pelo alto risco de perfuração.",
      ],
    },
  },
];

export const MEDICAL_EXAMS_CATALOG: string[] = Array.from(
  new Set([
    ...BUILTIN_PROGRESSIVE_EXAMS.map((e) => e.examName),
    "Ácido úrico sérico",
    "Alfa-fetoproteína (AFP)",
    "Amilase e Lipase séricas",
    "Análise do líquido ascítico (Paracentese diagnóstica)",
    "Análise do líquido pleural (Toracocentese diagnóstica)",
    "Análise do líquido sinovial (Artrocentese)",
    "Angiografia cerebral digital",
    "Angiorressonância magnética cerebral",
    "Angiotomografia de aorta torácica e abdominal",
    "Angiotomografia de artérias coronárias",
    "Angiotomografia de artérias pulmonares",
    "Anticorpo anti-dsDNA e Anti-Sm",
    "Anticorpo anti-transglutaminase tecidual (IgA)",
    "Antígeno prostático específico (PSA)",
    "Arteriografia periférica",
    "Audiometria tonal e vocal",
    "Baciloscopia de escarro (BAAR) e TRM-TB (GeneXpert)",
    "Beta-hCG sérico quantitativo",
    "Biópsia da artéria temporal",
    "Biópsia de linfonodo excisional",
    "Biópsia de medula óssea e Mielograma",
    "Biópsia hepática",
    "Biópsia renal percutânea",
    "Broncoscopia com lavado broncoalveolar",
    "CA-125 sérico",
    "Campimetria visual",
    "Capilaroscopia periungueal",
    "Ceruloplasmina sérica e Cobre urinário de 24h",
    "Cineangiocoronariografia (Cateterismo cardíaco)",
    "Cintilografia miocárdica de perfusão",
    "Cintilografia óssea",
    "Cintilografia pulmonar ventilação/perfusão (V/Q)",
    "Cintilografia tireoidiana com iodo radioativo",
    "Coagulograma completo (TP/RNI, TTPA e Fibrinogênio)",
    "Colangiopancreatografia retrógrada endoscópica (CPRE)",
    "Colangiorressonância magnética (CPRM)",
    "Colonoscopia com biópsia",
    "Colposcopia com biópsia dirigida",
    "Cortisol livre urinário de 24h / Teste de supressão com dexametasona",
    "CPK (Creatinofosfoquinase) total",
    "Curva glicêmica (TOTG 75g)",
    "D-dímero plasmático",
    "Densitometria óssea (DEXA)",
    "Ecocardiograma sob estresse",
    "Ecocardiograma transesofágico",
    "Ecocardiograma transtorácico",
    "Eletrocardiograma de 12 derivações",
    "Eletroencefalograma (EEG)",
    "Eletroforese de hemoglobina",
    "Eletroforese de proteínas séricas e imunofixação",
    "Eletroneuromiografia (ENMG)",
    "Endoscopia digestiva alta (EDA)",
    "Esfregaço de sangue periférico (Hematoscopia)",
    "Espirometria com prova broncodilatadora",
    "Estudo urodinâmico",
    "Exame de fundo de olho (Fundoscopia)",
    "Fator antinuclear (FAN)",
    "Fator reumatoide e Anti-CCP",
    "Ferritina, Ferro sérico e Saturação de transferrina",
    "Gasometria arterial",
    "Hemocultura periférica (2 a 3 pares)",
    "Hemoglobina glicada (HbA1c)",
    "Hemograma completo com reticulócitos",
    "Histeroscopia diagnóstica",
    "Histerossalpingografia",
    "Holter 24 horas",
    "Laringoscopia direta / Nasofibrolaringoscopia",
    "Mamografia bilateral",
    "Manometria esofágica de alta resolução",
    "MAPA 24 horas (Monitorização Ambulatorial da PA)",
    "Metanefrinas fracionadas plasmáticas e urinárias de 24h",
    "PAAF (Punção aspirativa por agulha fina) de tireoide",
    "Papanicolau (Colpocitologia oncótica)",
    "Pesquisa de sangue oculto nas fezes (FIT)",
    "PET-CT com FDG",
    "pHmetria esofágica de 24 horas",
    "Polissonografia",
    "Porfobilinogênio (PBG) e ALA urinários",
    "Procalcitonina e PCR",
    "Proteinúria de 24 horas / Relação albumina-creatinina",
    "Prova tuberculínica (PPD) / IGRA",
    "Punção lombar (Análise do líquor)",
    "Radiografia de abdome agudo (rotina de abdome agudo)",
    "Radiografia de tórax (PA e Perfil)",
    "Ressonância magnética cardíaca",
    "Ressonância magnética de coluna total",
    "Ressonância magnética de encéfalo",
    "Ressonância magnética de pelve",
    "Retossigmoidoscopia flexível",
    "Sorologia para HIV, Sífilis (VDRL/FTA-Abs) e Hepatites B/C",
    "Teste de Coombs direto (Teste da antiglobulina direta)",
    "Teste de inclinação ortostática (Tilt Test)",
    "Teste de tolerância à insulina",
    "Teste ergométrico (Teste de esforço)",
    "Tomografia computadorizada de abdome e pelve com contraste",
    "Tomografia computadorizada de abdome sem contraste (Protocolo litíase)",
    "Tomografia computadorizada de crânio com contraste",
    "Tomografia computadorizada de crânio sem contraste",
    "Tomografia computadorizada de seios da face",
    "Tomografia computadorizada de tórax de alta resolução (TCAR)",
    "Troponina ultrassensível (seriada)",
    "TSH e T4 livre",
    "Ultrassonografia abdominal total",
    "Ultrassonografia com Doppler de artérias carótidas e vertebrais",
    "Ultrassonografia com Doppler de artérias temporais",
    "Ultrassonografia com Doppler venoso de membros inferiores",
    "Ultrassonografia de bolsa escrotal com Doppler",
    "Ultrassonografia de tireoide",
    "Ultrassonografia obstétrica com Doppler",
    "Ultrassonografia point-of-care (e-FAST)",
    "Ultrassonografia transvaginal",
    "Urina tipo 1 (EAS) e Urocultura",
    "VHS (Velocidade de Hemossedimentação)",
  ])
).sort((a, b) => a.localeCompare(b, "pt-BR"));

export function isExamMatch(
  guess: string,
  targetCase: ProgressiveExamCase
): boolean {
  const normGuess = normalizeDiagnosisString(guess);
  if (!normGuess) return false;

  const candidates = [
    targetCase.examName,
    ...(targetCase.acceptedSynonyms || []),
  ].map(normalizeDiagnosisString);

  for (const cand of candidates) {
    if (!cand) continue;
    if (normGuess === cand) return true;
    if (normGuess.length >= 4 && cand.length >= 4) {
      if (normGuess.includes(cand) || cand.includes(normGuess)) {
        return true;
      }
    }
  }
  return false;
}

export function getDailyExamCase(dateOverride?: string): ProgressiveExamCase {
  const dateStr = dateOverride || getTodayFormattedDate();
  const dateKey = dateOverride ? dateOverride.replace(/\//g, "-") : getTodayKey();

  let hash = 13;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 41 + dateKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % BUILTIN_PROGRESSIVE_EXAMS.length;
  const selected =
    BUILTIN_PROGRESSIVE_EXAMS[index] || BUILTIN_PROGRESSIVE_EXAMS[0];

  return {
    ...selected,
    id: `daily-exam-${dateKey}`,
    date: dateStr,
  };
}
