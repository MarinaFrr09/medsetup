export interface MedicalCuriosity {
  id: string;
  category:
    | "Fisiopatologia & Conduta"
    | "Clínica Médica"
    | "Cardiologia"
    | "Endocrinologia"
    | "Nefrologia"
    | "Pneumologia"
    | "Gastroenterologia"
    | "Neurologia"
    | "Infectologia"
    | "Obstetrícia"
    | "Cirurgia & Vascular"
    | "Emergência Clínica";
  categoryColor: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
  title: string;
  shortFact: string;
  explanation: string;
  area: string;
}

export const MEDICAL_CURIOSITIES: MedicalCuriosity[] = [
  {
    id: "pe-diabetico-fisiopatologia-manejo",
    category: "Endocrinologia",
    categoryColor: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/40",
      badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
    title: "Fisiopatologia e Manejo do Pé Diabético",
    shortFact:
      "O pé diabético resulta da combinação de neuropatia periférica e isquemia microvascular e macrovascular causadas pela hiperglicemia crônica, sendo tratado com controle rigoroso da glicemia, desbridamento de tecidos desvitalizados, curativos adequados, descarga de pressão plantar e antibioticoterapia quando houver infecção.",
    explanation:
      "A hiperglicemia persistente ativa a via dos polióis e promove o acúmulo de produtos finais de glicação avançada (AGEs), lesando os nervos periféricos sensitivos, motores e autonômicos. A perda da sensibilidade protetora impede que o paciente perceba microtraumas repetitivos, enquanto a neuropatia motora deforma a arquitetura plantar (dedos em garra) e a disfunção autonômica resseca a pele, criando fissuras que servem de porta de entrada bacteriana. Como a doença arterial periférica associada reduz o aporte de oxigênio, leucócitos e antibióticos ao tecido, o tratamento exige aliviar a carga mecânica sobre a úlcera (offloading), remover o tecido necrótico por desbridamento, avaliar a necessidade de revascularização e instituir antimicrobianos direcionados à gravidade da infecção.",
    area: "Endocrinologia & Cirurgia Vascular",
  },
  {
    id: "insuficiencia-cardiaca-remodelamento",
    category: "Cardiologia",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Bloqueio Neuro-Hormonal na Insuficiência Cardíaca",
    shortFact:
      "A insuficiência cardíaca com fração de ejeção reduzida evolui pela hiperativação compensatória crônica do sistema nervoso simpático e do eixo renina-angiotensina-aldosterona, sendo tratada com betabloqueadores, inibidores da neprilisina/BRA (ou IECA), antagonistas mineralocorticoides e inibidores de SGLT2 para interromper o remodelamento ventricular.",
    explanation:
      "Quando o débito cardíaco cai, o organismo tenta manter a perfusão tecidual liberando noradrenalina, angiotensina II e aldosterona. Embora sustentem a pressão arterial a curto prazo, esses mediadores aumentam a pós-carga por vasoconstrição periférica, promovem retenção hidrossalina e induzem hipertrofia patológica, apoptose de cardiomiócitos e fibrose intersticial miocárdica. Por isso, a terapia modificadora de mortalidade não visa apenas aliviar a congestão com diuréticos de alça, mas bloquear simultaneamente essas vias neuro-hormonais deletérias, reduzindo o consumo miocárdico de oxigênio e revertendo a dilatação ventricular ao longo do tempo.",
    area: "Cardiologia Clínica",
  },
  {
    id: "doenca-renal-cronica-hiperfiltracao",
    category: "Nefrologia",
    categoryColor: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-800/40",
      badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    },
    title: "Hiperfiltração Glomerular e Nefroproteção na DRC",
    shortFact:
      "A progressão da doença renal crônica decorre da hipertensão intraglomerular e hiperfiltração compensatória dos néfrons remanescentes que levam à glomeruloesclerose e proteinúria, sendo retardada com controle pressórico, bloqueio do sistema renina-angiotensina (IECA ou BRA) e inibidores de SGLT2.",
    explanation:
      "À medida que néfrons são perdidos por diabetes ou hipertensão, os néfrons sobreviventes sofrem vasodilatação da arteríola aferente e vasoconstrição da arteríola eferente mediada pela angiotensina II, elevando a pressão hidrostática dentro do capilar glomerular. Essa hiperfiltração lesa a barreira de filtração dos podócitos e força a passagem de proteínas para o espaço urinário, o que ativa inflamação e fibrose túbulo-intersticial. Os IECA/BRA dilatam a arteríola eferente e os inibidores de SGLT2 restauram o feedback túbulo-glomerular contraindo a arteríola aferente, reduzindo sinergicamente a pressão intraglomerular e a albuminúria.",
    area: "Nefrologia & Clínica Médica",
  },
  {
    id: "dpoc-aprisionamento-aereo",
    category: "Pneumologia",
    categoryColor: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800/40",
      badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    title: "Limitação ao Fluxo Aéreo e Manejo da DPOC",
    shortFact:
      "A Doença Pulmonar Obstrutiva Crônica (DPOC) resulta da resposta inflamatória crônica a partículas inaladas que provoca bronquiolite obstrutiva e destruição do parênquima alveolar (enfisema), sendo manejada com cessação do tabagismo, broncodilatadores de longa duração (LAMA/LABA), reabilitação pulmonar e vacinação.",
    explanation:
      "A agressão contínua pela fumaça do tabaco gera estresse oxidativo e desequilíbrio entre proteases e antiproteases, destruindo as fibras elásticas alveolares responsáveis pela tração radial que mantém os bronquíolos abertos durante a expiração. Sem esse suporte elástico e com a mucosa brônquica edemaciada e hipersecreta, as pequenas vias aéreas colabam precocemente na expiração, gerando aprisionamento aéreo e hiperinsuflação dinâmica que achatam o diafragma e causam dispneia progressiva. Os broncodilatadores antimuscarínicos (LAMA) e beta-2 agonistas (LABA) relaxam a musculatura lisa brônquica, esvaziando o ar aprisionado e melhorando a mecânica ventilatória.",
    area: "Pneumologia",
  },
  {
    id: "cetoacidose-diabetica-manejo",
    category: "Emergência Clínica",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Fisiopatologia e Pilares Terapêuticos da Cetoacidose Diabética",
    shortFact:
      "A cetoacidose diabética origina-se da deficiência insulínica associada ao excesso de hormônios contrarreguladores, provocando hiperglicemia com diurese osmótica, lipólise maciça e acidose metabólica por corpos cetônicos, sendo tratada com expansão volêmica vigorosa, correção eletrolítica de potássio e insulinoterapia venosa contínua.",
    explanation:
      "Na ausência de ação insulínica eficaz, a glicose acumula-se no sangue enquanto o tecido adiposo sofre lipólise acelerada sob estímulo de glucagon, cortisol e catecolaminas, liberando ácidos graxos livres que o fígado converte em ácido acetoacético e beta-hidroxibutírico. A glicosúria arrasta grandes volumes de água, sódio e potássio na urina, gerando desidratação grave. Por essa razão, a reidratação com cristaloides é a primeira medida para restaurar a perfusão renal, seguida da reposição de potássio antes ou durante a infusão de insulina regular, uma vez que a insulina desloca rapidamente o potássio extracelular para dentro das células e freia a cetogênese hepática.",
    area: "Endocrinologia & Medicina de Emergência",
  },
  {
    id: "cirrose-hipertensao-portal-ascite",
    category: "Gastroenterologia",
    categoryColor: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/40",
      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    },
    title: "Hipertensão Portal e Manejo da Ascite na Cirrose",
    shortFact:
      "A ascite na cirrose hepática decorre da hipertensão portal associada à vasodilatação arterial esplâncnica, hipoalbuminemia e retenção renal secundária de sódio e água, sendo tratada com restrição moderada de sódio, antagonistas da aldosterona (espironolactona) associados à furosemida e paracentese de alívio com reposição de albumina nos casos volumosos.",
    explanation:
      "A fibrose e os nódulos de regeneração hepática aumentam a resistência ao fluxo venoso portal, estimulando a liberação endotelial de óxido nítrico no território esplâncnico. Essa vasodilatação esplâncnica reduz o volume arterial efetivo percebido pelos rins, o que hiperativa o sistema renina-angiotensina-aldosterona e promove retenção intensa de sódio e água, que extravasam para a cavidade peritoneal devido à alta pressão hidrostática portal e à baixa pressão coloidosmótica pela queda da síntese hepática de albumina. Por isso, a espironolactona é a base farmacológica do tratamento, atuando diretamente contra o hiperaldosteronismo secundário.",
    area: "Gastroenterologia & Hepatologia",
  },
  {
    id: "sepse-disfuncao-organica",
    category: "Infectologia",
    categoryColor: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800/40",
      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    title: "Desregulação Imunovascular e Manejo da Sepse",
    shortFact:
      "A sepse consiste em uma disfunção orgânica ameaçadora à vida causada por uma resposta inflamatória e endotelial desregulada à infecção que gera vasodilatação sistêmica, aumento da permeabilidade capilar e hipoperfusão tecidual, sendo manejada com antimicrobianos precoces, ressuscitação com cristaloides, controle do foco infeccioso e vasopressores (noradrenalina) se houver choque.",
    explanation:
      "A liberação maciça de citocinas pró-inflamatórias em resposta ao patógeno ativa o endotélio vascular, induz a síntese de óxido nítrico e ativa a cascata da coagulação na microcirculação. O resultado é perda de líquido para o terceiro espaço, queda da resistência vascular sistêmica e formação de microtrombos que prejudicam a extração celular de oxigênio, elevando o lactato sérico. O pacote de manejo imediato foca em coletar culturas e iniciar antibioticoterapia de amplo espectro na primeira hora, restaurar a volemia intravascular com cristaloides balanceados e titular noradrenalina para manter a pressão arterial média igual ou superior a 65 mmHg.",
    area: "Infectologia & Terapia Intensiva",
  },
  {
    id: "sindrome-coronariana-aguda-placa",
    category: "Cardiologia",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Instabilização da Placa Aterosclerótica no Infarto Agudo do Miocárdio",
    shortFact:
      "O infarto agudo do miocárdio tipo 1 resulta da ruptura ou erosão de uma placa aterosclerótica coronariana seguida de agregação plaquetária e formação de trombo oclusivo, sendo tratado com dupla antiagregação plaquetária, anticoagulação plena, estatinas de alta potência e reperfusão miocárdica imediata por angioplastia primária ou fibrinólise.",
    explanation:
      "A inflamação crônica da parede arterial enfraquece a capa fibrosa do ateroma até sua ruptura, expondo o colágeno subendotelial e o fator tecidual à corrente sanguínea. As plaquetas aderem rapidamente ao local, liberando tromboxano A2 e ADP que recrutam novas plaquetas, enquanto a cascata de coagulação gera fibrina que estabiliza o trombo e interrompe o fluxo coronariano. A conduta combina ácido acetilsalicílico e um inibidor de P2Y12 para bloquear a ativação plaquetária, heparina para frear a geração de trombina e a desobstrução mecânica ou farmacológica urgente da artéria culpada para limitar a área de necrose miocárdica.",
    area: "Cardiologia & Emergência",
  },
  {
    id: "pre-eclampsia-placentacao",
    category: "Obstetrícia",
    categoryColor: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200 dark:border-indigo-800/40",
      badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    },
    title: "Defeito de Placentação e Manejo da Pré-Eclâmpsia",
    shortFact:
      "A pré-eclâmpsia origina-se da invasão trofoblástica deficiente das artérias espiraladas uterinas, gerando isquemia placentária e liberação de fatores antiangiogênicos que causam disfunção endotelial sistêmica, hipertensão e lesão de órgãos-alvo, sendo manejada com anti-hipertensivos seguros na gestação, sulfato de magnésio nos casos graves e resolução oportuna da gravidez.",
    explanation:
      "Na gestação normal, o citotrofoblasto remodela as artérias espiraladas em vasos de baixa resistência e alto fluxo; na pré-eclâmpsia, essa remodelação é incompleta, mantendo vasos estreitos e hipoperfundidos. A placenta isquêmica libera fatores solúveis na circulação materna que provocam vasoespasmo generalizado, endoteliose glomerular com proteinúria, ativação plaquetária e edema cerebral. Enquanto o controle pressórico (com metildopa, nifedipina ou hidralazina) protege contra o AVC hemorrágico e o sulfato de magnésio estabiliza a membrana neuronal prevenindo a eclâmpsia, o tratamento definitivo consiste no parto após estabilização materna.",
    area: "Ginecologia e Obstetrícia",
  },
  {
    id: "asma-inflamacao-broncoespasmo",
    category: "Pneumologia",
    categoryColor: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800/40",
      badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    title: "Hiper-Reatividade Brônquica e Base Anti-Inflamatória no Tratamento da Asma",
    shortFact:
      "A asma caracteriza-se por inflamação crônica eosinofílica das vias aéreas que gera hiper-reatividade brônquica, edema de mucosa e broncoespasmo reversível, sendo tratada prioritariamente com corticoide inalatório associado a broncodilatador beta-2 agonista (como formoterol) para controlar a inflamação de base e prevenir exacerbações graves.",
    explanation:
      "A exposição a alérgenos ou irritantes ativa linfócitos Th2, mastócitos e eosinófilos na mucosa brônquica, liberando histamina, leucotrienos e interleucinas que contraem o músculo liso brônquico e aumentam a secreção de muco espesso. O uso isolado de broncodilatadores de curta duração alivia apenas o espasmo muscular momentâneo sem tratar a cascata inflamatória subjacente, o que deixa a via aérea vulnerável a crises fatais. Por isso, o tratamento moderno incorpora sempre o corticoide inalatório desde o primeiro degrau terapêutico, suprimindo a inflamação eosinofílica e reduzindo o remodelamento brônquico.",
    area: "Pneumologia & Alergologia",
  },
  {
    id: "pancreatite-aguda-autodigestao",
    category: "Gastroenterologia",
    categoryColor: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/40",
      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    },
    title: "Ativação Enzimática Intrapancreática e Manejo da Pancreatite Aguda",
    shortFact:
      "A pancreatite aguda decorre da ativação precoce do tripsinogênio em tripsina dentro das células acinares — geralmente por migração de cálculo biliar ou toxicidade alcoólica — provocando autodigestão pancreática e inflamação sistêmica, sendo tratada com hidratação venosa precoce, analgesia eficaz, nutrição enteral oportuna e colecistectomia nos casos biliares.",
    explanation:
      "A obstrução transitória da papila duodenal ou a lesão direta acinar bloqueia a exocitose dos grânulos de zimogênio, promovendo sua fusão com lisossomos intracelulares que convertem o tripsinogênio em tripsina ativa. A tripsina ativa fosfolipases e elastases que digerem o parênquima pancreático e o tecido adiposo peripancreático, desencadeando intenso sequestro de líquido para o retroperitônio. O suporte clínico prioriza a reposição volêmica controlada com Ringer Lactato para preservar a microcirculação pancreática e evitar necrose, analgesia plena e reintrodução precoce da dieta oral ou enteral para manter a integridade da barreira mucosa intestinal e impedir a translocação bacteriana.",
    area: "Gastroenterologia & Cirurgia do Aparelho Digestivo",
  },
  {
    id: "tromboembolismo-venoso-anticoagulacao",
    category: "Cirurgia & Vascular",
    categoryColor: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200 dark:border-indigo-800/40",
      badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    },
    title: "Fisiopatologia da Trombose Venosa Profunda e Embolia Pulmonar",
    shortFact:
      "O tromboembolismo venoso resulta da interação entre estase sanguínea, lesão endotelial e estados de hipercoagulabilidade que formam trombos nas veias profundas com risco de migração para a árvore arterial pulmonar, sendo prevenido com deambulação precoce e heparinas profiláticas e tratado com anticoagulação plena ou trombólise nos casos de instabilidade hemodinâmica.",
    explanation:
      "A imobilização prolongada, cirurgias de grande porte, neoplasias ou trombofilias reduzem o fluxo venoso nos membros inferiores e ativam a cascata de coagulação, formando coágulos ricos em fibrina e hemácias. Quando fragmentos desse trombo se desprendem e impactam a circulação pulmonar, ocorre obstrução mecânica associada à vasoconstrição pulmonar hipóxica, aumentando abruptamente a pós-carga do ventrículo direito e gerando espaço morto alveolar com hipoxemia. Os anticoagulantes (como heparinas ou anticoagulantes orais diretos) inibem a formação adicional de fibrina, permitindo que o sistema fibrinolítico endógeno recanalize o vaso enquanto previne novas embolizações.",
    area: "Cirurgia Vascular & Pneumologia",
  },
  {
    id: "avc-isquemico-penumbra",
    category: "Neurologia",
    categoryColor: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800/40",
      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    title: "Área de Penumbra Isquêmica e Reperfusão no AVC Isquêmico",
    shortFact:
      "O acidente vascular cerebral isquêmico decorre da oclusão trombótica ou embólica de uma artéria cerebral que cria um núcleo necrótico central cercado por uma área de penumbra hipoperfundida mas ainda viável, sendo tratado em janela terapêutica com trombólise endovenosa (alteplase/tenecteplase) e/ou trombectomia mecânica após exclusão de sangramento na tomografia.",
    explanation:
      "Quando o fluxo sanguíneo cerebral cai de forma abrupta, os neurônios do centro isquêmico sofrem falência energética imediata da bomba Na+/K+ ATPase, edema citotóxico e morte celular por excitotoxicidade glutamatérgica. Ao redor desse núcleo, a zona de penumbra recebe fluxo colateral mínimo que suspende a atividade elétrica neuronal — gerando o déficit neurológico focal agudo —, mas mantém a integridade estrutural da célula por algumas horas. O objetivo da neuroimagem de emergência e da recanalização arterial precoce é restaurar a perfusão dessa penumbra antes que ela se converta em infarto definitivo, seguido de investigação etiológica para prevenção secundária com antiagregantes ou anticoagulantes.",
    area: "Neurologia & Emergência",
  },
  {
    id: "doenca-ulcerosa-peptica-hpylori-aines",
    category: "Gastroenterologia",
    categoryColor: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/40",
      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    },
    title: "Desequilíbrio da Barreira Mucosa na Doença Ulcerosa Péptica",
    shortFact:
      "A úlcera péptica resulta da quebra das defesas da mucosa gastroduodenal frente ao ácido clorídrico e à pepsina — causada principalmente pela infecção por Helicobacter pylori ou pelo uso de anti-inflamatórios não esteroidais (AINEs) —, sendo tratada com inibidores da bomba de prótons (IBPs), suspensão do AINE e erradicação bacteriana com antibioticoterapia combinada.",
    explanation:
      "Fisiologicamente, o epitélio gástrico protege-se da autodigestão ácida mediante a secreção de muco e bicarbonato estimulada pelas prostaglandinas locais e pelo fluxo sanguíneo mucoso. Os AINEs inibem as enzimas ciclo-oxigenases (COX-1), suprimindo a síntese de prostaglandinas protetoras, enquanto o Helicobacter pylori produz urease e toxinas que inflamam a mucosa e alteram a regulação de gastrina e somatostatina. Ao bloquear de forma potente a H+/K+ ATPase das células parietais com omeprazol ou pantoprazol e erradicar a bactéria com antimicrobianos, restaura-se o pH intraluminal necessário para a regeneração epitelial completa e previne-se a recidiva ou o sangramento digestivo.",
    area: "Gastroenterologia",
  },
  {
    id: "hipotireoidismo-hashimoto-levotiroxina",
    category: "Endocrinologia",
    categoryColor: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/40",
      badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
    title: "Destruição Folicular Autoimune e Reposição Hormonal no Hipotireoidismo",
    shortFact:
      "O hipotireoidismo primário resulta na maioria dos casos da destruição autoimune crônica dos folículos tireoidianos (Tireoidite de Hashimoto), reduzindo a síntese de T4 e T3 com elevação compensatória do TSH e desaceleração metabólica sistêmica, sendo tratado com reposição diária de levotiroxina sódica em jejum ajustada pelos níveis séricos de TSH.",
    explanation:
      "A infiltração linfocitária e a produção de anticorpos anti-tireoperoxidase (anti-TPO) e anti-tireoglobulina destroem progressivamente o epitélio folicular da tireoide. Como os hormônios tireoidianos regulam a transcrição gênica da taxa metabólica basal, da termogênese e dos receptores beta-adrenérgicos, sua deficiência provoca fadiga, intolerância ao frio, bradicardia, constipação, dislipidemia com hipercolesterolemia e mixedema por acúmulo dérmico de glicosaminoglicanos. A administração de levotiroxina (T4 sintético), que é convertida perifericamente no hormônio ativo T3 pelas desiodases teciduais, restabelece o eutireoidismo fisiológico.",
    area: "Endocrinologia Clínica",
  },
  {
    id: "anemia-ferropriva-hepcidina",
    category: "Clínica Médica",
    categoryColor: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800/40",
      badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    title: "Depleção dos Estoques de Ferro e Manejo da Anemia Ferropriva",
    shortFact:
      "A anemia ferropriva decorre do balanço negativo de ferro — frequentemente por perdas sanguíneas gastrointestinais ou ginecológicas crônicas ou baixa absorção — que esgota a ferritina e compromete a síntese do grupamento heme nos eritroblastos, gerando hemácias microcíticas e hipocrômicas, sendo tratada com a investigação e correção da causa do sangramento aliada à reposição oral ou venosa de ferro.",
    explanation:
      "Antes que a hemoglobina caia, o organismo consome os estoques medulares e hepáticos de ferritina e aumenta a síntese de transferrina para tentar captar mais ferro no intestino. Quando a carência se instala, os precursores eritroides sofrem divisões celulares extras na medula por falta de hemoglobina suficiente no citoplasma, resultando em eritrócitos pequenos (VCM reduzido), pálidos (HCM reduzido) e de tamanhos variados (RDW elevado). O tratamento nunca deve se limitar à prescrição de sais de ferro até normalizar a hemoglobina: é indispensável identificar a fonte de perda sanguínea e manter a reposição por meses adicionais até recompor integralmente os estoques de ferritina.",
    area: "Hematologia & Clínica Médica",
  },
  {
    id: "anafilaxia-choque-distributivo-adrenalina",
    category: "Emergência Clínica",
    categoryColor: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800/40",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    },
    title: "Desgranulação de Mastócitos e Ação Fisiológica da Adrenalina na Anafilaxia",
    shortFact:
      "A anafilaxia resulta da desgranulação maciça de mastócitos e basófilos mediada por IgE após exposição a um alérgeno, provocando vasodilatação sistêmica, extravasamento capilar, edema de glote e broncoespasmo, sendo revertida imediatamente pela aplicação intramuscular de adrenalina no vasto lateral da coxa associada a suporte de via aérea e reposição volêmica.",
    explanation:
      "A ligação do antígeno às moléculas de IgE na superfície dos mastócitos libera instantaneamente histamina, triptase, leucotrienos e prostaglandinas, que relaxam a musculatura lisa vascular e contraem a musculatura brônquica, podendo levar à asfixia e ao choque distributivo em poucos minutos. A adrenalina intramuscular é o tratamento de primeira linha porque atua simultaneamente nos receptores alfa-1 adrenérgicos (revertendo a hipotensão e o edema de mucosa laríngea por vasoconstrição), beta-1 (aumentando o débito cardíaco) e beta-2 (promovendo broncodilatação e inibindo a liberação adicional de mediadores pelos mastócitos), enquanto anti-histamínicos e corticoides atuam apenas como adjuvantes tardios.",
    area: "Alergologia & Emergência",
  },
  {
    id: "gota-hiperuricemia-cristais-urato",
    category: "Clínica Médica",
    categoryColor: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-800/40",
      badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    },
    title: "Precipitação de Urato Monossódico e Manejo da Artrite Gotosa",
    shortFact:
      "A artrite gotosa decorre da hiperuricemia crônica — por hipoexcreção renal ou hiperprodução de purinas — que leva à deposição articular de cristais de urato monossódico e intensa reação inflamatória neutrofílica, sendo tratada na crise aguda com colchicina, AINEs ou corticoides, e no longo prazo com inibidores da xantina oxidase (alopurinol) sem suspender a medicação de uso contínuo durante a crise.",
    explanation:
      "Quando a concentração sérica de ácido úrico ultrapassa seu limite de solubilidade, formam-se cristais em formato de agulha nas articulações periféricas mais frias, que são fagocitados por macrófagos sinoviais e ativam o inflamassoma NLRP3, liberando interleucina-1 beta e atraindo neutrófilos que causam monoartrite aguda intensa. Na vigência da crise, o foco é bloquear a migração de neutrófilos e a inflamação com colchicina ou anti-inflamatórios; já a terapia hipouricemiante com alopurinol não deve ser iniciada nem interrompida abruptamente durante o quadro agudo, pois flutuações bruscas na uricemia desestabilizam os tofos articulares e prolongam a artrite.",
    area: "Reumatologia & Clínica Médica",
  },
  {
    id: "colecistite-aguda-calculosa",
    category: "Cirurgia & Vascular",
    categoryColor: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/40",
      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    },
    title: "Obstrução do Ducto Cístico e Manejo da Colecistite Aguda",
    shortFact:
      "A colecistite aguda litiásica resulta da impactação persistente de um cálculo no infundíbulo ou ducto cístico, gerando hipertensão intraluminal, inflamação química da parede vesicular por lisolecitina e infecção bacteriana secundária, sendo tratada com suporte clínico, analgesia, antibioticoterapia e colecistectomia videolaparoscópica precoce.",
    explanation:
      "Diferente da cólica biliar simples — em que o cálculo obstrui transitoriamente o ducto cístico e a dor cede em poucas horas —, na colecistite aguda a obstrução mantida impede a drenagem biliar, distende a vesícula e ativa a fosfolipase A mucosa, que converte a lecitina da bile em lisolecitina citotóxica. O edema parietal compromete o fluxo venoso e arterial do órgão, provocando dor contínua no hipocôndrio direito com parada súbita da inspiração à palpação profunda (Sinal de Murphy), febre e leucocitose. A estabilização com hidratação, antimicrobianos para cobertura de enterobactérias e a ressecção cirúrgica laparoscópica precoce na mesma internação evitam complicações como empiema, gangrena ou perfuração vesicular.",
    area: "Cirurgia Geral & Gastroenterologia",
  },
  {
    id: "endocardite-infecciosa-vegetacao",
    category: "Infectologia",
    categoryColor: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800/40",
      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    title: "Formação de Vegetações Valvares e Manejo da Endocardite Infecciosa",
    shortFact:
      "A endocardite infecciosa decorre da colonização de um endotélio valvar previamente lesado ou protético durante episódios de bacteremia, formando vegetações de fibrina, plaquetas e microrganismos que destroem a valva e geram êmbolos sépticos, sendo diagnosticada por hemoculturas seriadas e ecocardiograma e tratada com antibioticoterapia bactericida intravenosa prolongada e cirurgia valvar quando indicada.",
    explanation:
      "O fluxo sanguíneo turbulento em valvas degeneradas, reumáticas ou protéticas lesa o endocárdio e expõe a matriz subendotelial, onde se deposita um trombo estéril de plaquetas e fibrina. Quando bactérias como Staphylococcus aureus, Streptococcus viridans ou Enterococcus entram na circulação, aderem a essa matriz e multiplicam-se protegidas por camadas de fibrina onde os fagócitos têm difícil acesso. Por essa característica avascular da vegetação, a cura exige esquemas bactericidas em altas doses por quatro a seis semanas guiados por múltiplas hemoculturas colhidas antes do início do antibiótico, reservando-se a cirurgia cardíaca para casos de insuficiência cardíaca refratária por destruição valvar, infecção não controlada ou alto risco de embolização.",
    area: "Infectologia & Cardiologia",
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

/**
 * Retorna o texto unificado e fluido de explicação, sem tópicos ou quebras artificiais.
 */
export function getCuriosityExplanation(curiosity: MedicalCuriosity): string {
  return curiosity.explanation.trim();
}
