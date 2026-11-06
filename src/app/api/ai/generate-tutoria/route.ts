import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { extractTextFromDocx, extractTextFromPptx } from "@/lib/document-parser";
import { writeFile, mkdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { cleanLatexAndBadges } from "@/lib/text-sanitize";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const userNotes = (formData.get("userNotes") as string) || "";
    const bookPathsRaw = (formData.get("bookPaths") as string) || "[]";
    const bookTitlesRaw = (formData.get("bookTitles") as string) || "[]";

    let bookPaths: string[] = [];
    let bookTitles: string[] = [];
    try {
      bookPaths = JSON.parse(bookPathsRaw);
    } catch {}
    try {
      bookTitles = JSON.parse(bookTitlesRaw);
    } catch {}

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum documento ou caso clínico foi enviado para a tutoria." },
        { status: 400 }
      );
    }

    const fileAttachments: Array<{ data: string; mimeType: string; name: string }> = [];
    const uploadedFiles: Array<{ name: string; url: string; size: number; type: string }> = [];

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true }).catch(() => {});

    // 1. Process clinical case files
    for (const file of files) {
      if (file.size === 0) continue;

      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const ext = (file.name || "").toLowerCase().split(".").pop();

      // Persist file copy to public/uploads
      try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}-${safeName}`;
        const filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        uploadedFiles.push({
          name: file.name,
          url: `/uploads/${fileName}`,
          size: file.size,
          type: file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream"),
        });
      } catch (err) {
        console.warn("Could not persist case file to uploads folder:", err);
      }

      if (ext === "docx") {
        const extractedText = extractTextFromDocx(buffer);
        if (extractedText && extractedText.length > 0) {
          fileAttachments.push({
            data: Buffer.from(extractedText, "utf8").toString("base64"),
            mimeType: "text/plain",
            name: `Caso_Clinico_${file.name}`,
          });
          continue;
        }
      }

      if (ext === "pptx") {
        const extractedText = extractTextFromPptx(buffer);
        if (extractedText && extractedText.length > 0) {
          fileAttachments.push({
            data: Buffer.from(extractedText, "utf8").toString("base64"),
            mimeType: "text/plain",
            name: `Caso_Clinico_${file.name}`,
          });
          continue;
        }
      }

      if (ext === "pdf" || file.type === "application/pdf") {
        fileAttachments.push({
          data: buffer.toString("base64"),
          mimeType: "application/pdf",
          name: `Caso_Clinico_${file.name}`,
        });
        continue;
      }

      if (ext === "txt" || ext === "rtf" || ext === "md" || file.type.startsWith("text/")) {
        fileAttachments.push({
          data: buffer.toString("base64"),
          mimeType: "text/plain",
          name: `Caso_Clinico_${file.name}`,
        });
        continue;
      }

      fileAttachments.push({
        data: buffer.toString("base64"),
        mimeType: file.type || "application/octet-stream",
        name: `Caso_Clinico_${file.name || "documento"}`,
      });
    }

    // 2. Process referenced books from library (if selected)
    const largeBookReferences: Array<{ title: string; sizeMb: number }> = [];

    for (let i = 0; i < bookPaths.length; i++) {
      const bPath = bookPaths[i];
      if (!bPath) continue;

      try {
        const relativePath = bPath.startsWith("/") ? bPath.slice(1) : bPath;
        const fullDiskPath = join(process.cwd(), "public", relativePath);

        if (existsSync(fullDiskPath)) {
          const fileStat = await stat(fullDiskPath);
          const bookTitle = bookTitles[i] || `Livro_Referencia_${i + 1}`;
          const ext = bPath.toLowerCase().split(".").pop();
          const sizeMb = Math.round(fileStat.size / (1024 * 1024));

          if (fileStat.size > 10 * 1024 * 1024) {
            largeBookReferences.push({ title: bookTitle, sizeMb });
          } else {
            const bookBuffer = await readFile(fullDiskPath);
            if (ext === "docx") {
              const extracted = extractTextFromDocx(bookBuffer);
              if (extracted) {
                fileAttachments.push({
                  data: Buffer.from(extracted, "utf8").toString("base64"),
                  mimeType: "text/plain",
                  name: `Livro_Referencia_${bookTitle}.txt`,
                });
              }
            } else {
              fileAttachments.push({
                data: bookBuffer.toString("base64"),
                mimeType: ext === "pdf" ? "application/pdf" : "application/octet-stream",
                name: `Livro_Referencia_${bookTitle}.${ext || "pdf"}`,
              });
            }
          }
        }
      } catch (bookErr) {
        console.warn(`Could not read book file from disk: ${bPath}`, bookErr);
      }
    }

    const hasReferenceBooks = bookPaths.length > 0;

    const systemPrompt = `Você é um preceptor médico e especialista acadêmico sênior em Metodologia de Aprendizagem Baseada em Problemas (PBL / ABP / Tutoria Médica).

OBJETIVO CENTRAL E MANDATÓRIO:
Sua principal função nesta tutoria é RESPONDER A TODAS AS PERGUNTAS DE APRENDIZAGEM (OBJETIVOS DE APRENDIZAGEM) DE FORMA COMPLETA, APROFUNDADA E EXAUSTIVA!
A resolução das perguntas de aprendizagem é a finalidade máxima da Tutoria Médica.

ESTRUTURA OBRIGATÓRIA DA RESOLUÇÃO DA TUTORIA (SIGA ESTA ORDEM ESTRITA):

1. **TÍTULO DO CASO CLÍNICO**:
   - Defina um título claro e acadêmico para o caso clínico (# Nome do Caso Clínico).

2. **TRANSCRIÇÃO INTEGRAL DO CASO CLÍNICO**:
   - Transcreva fielmente todas as palavras do caso clínico / situação-problema original contido no documento anexo, para que o estudante tenha o texto original de referência no início do documento.
   - Preencha o campo "caseTranscription" com este texto integral.

3. **TERMOS E PERGUNTAS DESCONHECIDAS**:
   - Mapear e elucidar com precisão cirúrgica todos os termos médicos, siglas, nomenclaturas e dúvidas conceituais presentes no caso.
   - Formate cada termo como:
     * **Nome do Termo / Sigla**: Definição médica precisa, mecanismo e relevância no contexto do paciente.

4. **HIPÓTESES DIAGNÓSTICAS**:
   - O título desta seção DEVE SER EXATAMENTE "Hipóteses Diagnósticas".
   - Declare se cada hipótese levantada no caso é Correta (Provável) ou Incorreta (Descartada), com breve e concisa explicação clínica.
   - Preencha o campo "hypothesisAnalysis" com:
     * "hypothesis": Nome da hipótese diagnóstica
     * "judgment": "Correta (Provável)" ou "Incorreta (Descartada)"
     * "explanation": Breve explicação de por que está correta ou errada baseada no caso

5. **CONCLUSÃO DO CASO CLÍNICO E TABELA COMPARATIVA DE DIAGNÓSTICO DIFERENCIAL**:
   - Fechamento consistente do caso clínico:
     * **Síntese Diagnóstica Consolidada**: Diagnóstico definitivo mais provável fundamentado na clínica.
     * **Raciocínio Clínico Integrativo**: Correlação detalhada entre história clínica, exame físico e exames complementares.
     * **Conduta Médica e Manejo**: Exames confirmatórios, medidas farmacológicas e não farmacológicas, e prognóstico.
     * **Tabela Comparativa de Diagnóstico Diferencial**:
       Construa OBRIGATORIAMENTE uma tabela Markdown rica, completa e aprofundada (| Diagnóstico Diferencial / Patologia | Fisiopatologia Central | Achados Clínicos e Exames | Conduta Médica |) comparando a patologia principal com os diferenciais. Preencha no campo "differentialTable" de "clinicalConclusion".
       REGRAS RIGOROSAS PARA QUADROS E TABELAS:
       - NUNCA corte palavras nem deixe frases incompletas no meio de uma célula.
       - Preencha cada célula com a explicação completa, detalhada e fundamentada (descreva detalhadamente o mecanismo de cada patologia na coluna Fisiopatologia Central, sem abreviações truncadas ou reticências).
       - Use células amplas com frases completas para que o quadro sirva como material de estudo definitivo.

6. **QUESTÕES DE APRENDIZAGEM - NÚCLEO CENTRAL E OBRIGATÓRIO (MÁXIMO DETALHAMENTO EM NÍVEL TRATADO MÉDICO)**:
   - ESTE É O NÚCLEO DE MAIOR PESO DA TUTORIA! O array "learningQuestions" NUNCA PODE SER RETORNADO VAZIO!
   - **COMO IDENTIFICAR AS QUESTÕES DE APRENDIZAGEM (REGRA CRÍTICA DE EXTRAÇÃO TOTAL - ZERO CORTES)**:
     * **1ª PRIORIDADE (DOCUMENTO ANEXO E ANOTAÇÕES - COBERTURA DE 100% DOS OBJETIVOS/QUESTÕES)**:
       Leia com máxima atenção todo o documento anexo (PDF, Word, Apresentação ou Texto) e as anotações do estudante ("userNotes") até a última página.
       Extraia e resolva CADA UM dos Objetivos de Aprendizagem, perguntas problematizadoras ou questões contidas no documento ou anotações.
       REGRA INVIOLÁVEL: NUNCA CORTE, NUNCA OMITA, NUNCA AGRUPE E NUNCA PARE ANTES DE ESGOTAR A LISTA!
       Se o documento trouxer uma lista numerada de Objetivos de Aprendizagem (por exemplo: 1. ..., 2. ..., 3. ..., 4. ..., 5. ..., 6. ..., 7. ..., ou mais itens):
       O ARRAY "learningQuestions" DEVE CONTER OBRIGATORIAMENTE UMA QUESTÃO DEDICADA PARA CADA UM DOS OBJETIVOS DA LISTA, DO 1º AO ÚLTIMO, SEM EXCEÇÃO!
       Se houver 7 objetivos no documento, DEVEM EXISTIR EXATAMENTE 7 QUESTÕES DE APRENDIZAGEM (Questão 1 à Questão 7). Se houver 8, DEVEM EXISTIR 8. Se houver 10, DEVEM EXISTIR 10!
       É terminantemente proibido resumir vários objetivos em apenas 4 ou 5 questões, ou omitir as questões finais.
     * **2ª PRIORIDADE (FORMULAÇÃO AUTÔNOMA - APENAS SE O DOCUMENTO NÃO CONTIVER NENHUM OBJETIVO OU PERGUNTA)**:
       Exclusivamente se o documento NÃO trouxer nenhuma lista de objetivos ou questões explícitas, formule autonomamente de 6 a 8 Questões de Aprendizagem centrais e cruciais para o caso (cobrindo Fisiopatologia profunda, Diagnósticos Diferenciais com critérios objetivos, Exames Complementares e Manejo Terapêutico Completo). Mas se houver objetivos explícitos no PDF, SIGA A LISTA DO PDF COM 100% DE FIDELIDADE NUMÉRICA!
     * NENHUM OBJETIVO OU QUESTÃO DO DOCUMENTO PODE FICAR DE FORA OU SEM RESPOSTA!

   - **DIRETRIZ DE DETALHAMENTO MÁXIMO E APROFUNDAMENTO ACADÊMICO (PADRÃO TRATADO MÉDICO / UPTODATE / CECIL & HARRISON)**:
     * **PROIBIÇÃO ABSOLUTA DE RESPOSTAS SUPERFICIAIS OU RESUMIDAS**:
       É expressamente proibido fornecer respostas curtas, telegráficas, genéricas ou superficiais. Cada resposta deve ser uma aula completa, profunda, minuciosa e exaustiva, cobrindo o tema como uma seção de tratado de medicina de referência.
     * **CONTEÚDO OBRIGATÓRIO PARA CADA QUESTÃO DE APRENDIZAGEM (DISSEQUE CADA TÓPICO COM RIGOR)**:
       Para CADA questão, estruture a resposta dissecando com riqueza de detalhes todos os aspectos aplicáveis:
       1. **Contextualização e Relevância Clínica**: Definição conceitual abrangente, relevância epidemiológica com dados quantitativos e citação de fonte entre parênteses ex: (Fonte: Ministério da Saúde / Sociedades de Especialidade), impacto sistêmico e panorama clínico inicial.
       2. **Bases Anatômicas, Histológicas e Fisiológicas**: Topografia anatômica funcional, vascularização e inervação se pertinente, tipos celulares específicos envolvidos, histologia tecidual, barreiras biológicas e fisiologia basal com cascatas de regulação e feedbacks hormonais.
       3. **Fisiopatologia Celular e Molecular Minuciosa**: Dissecção profunda das vias bioquímicas, citocinas inflamatórias específicas (IL-1, IL-6, TNF-alfa, prostaglandinas, etc.), receptores celulares, alterações de permeabilidade capilar, lesão tecidual e repercussões hemodinâmicas/metabólicas passo a passo.
       4. **Quadro Clínico e Semiótica Específica**: Sintomas cardinais, formas de apresentação atípicas, semiotécnica e manobras de exame físico com nomes de sinais propedêuticos/epônimos, sinais de gravidade, choque e alarme ("red flags").
       5. **Estratificação de Risco e Escores Prognósticos**: Apresente escores clínicos validados de estratificação e gravidade (ex: SOFA, qSOFA, Glasgow, Wells, CURB-65, FIGO PALM-COEIN, etc., conforme o tema).
       6. **Investigação Laboratorial e Propedêutica Armada**: Exames laboratoriais com valores de referência e pontos de corte numéricos precisos (ex: leucócitos > 12.000/mm³, plaquetas < 100.000/mm³, lactato > 2 mmol/L, pH < 7.35), biomarcadores, exames de imagem (RX, USG, TC, RM) com descrição detalhada dos achados patológicos característicos.
       7. **Manejo Terapêutico e Conduta Médica Completa**:
          - Estabilização inicial, medidas de suporte e ressuscitação hemodinâmica quando aplicável.
          - Terapêutica farmacológica completa: classes farmacológicas, fármacos específicos de 1ª linha, 2ª linha e opções para alérgicos/gestantes/nefropatas, mecanismo de ação molecular de cada um, posologias usuais, doses, vias de administração, intervalos e duração do tratamento.
          - Principais efeitos adversos, contraindicações formais e monitorização clínica e laboratorial necessária.
          - Medidas não farmacológicas, suporte nutricional, fisioterapia e intervenções cirúrgicas/invasivas com critérios de indicação.
       8. **Diagnóstico Diferencial na Própria Questão**: Contraste a condição com as principais patologias mimetizadoras, apontando critérios objetivos de diferenciação clínica e laboratorial.
       9. **Prognóstico, Complicações e Continuidade do Cuidado**: Complicações agudas e crônicas, critérios para encaminhamento / internação em enfermaria ou UTI, critérios de alta e acompanhamento multiprofissional longitudinal.
       10. **Curiosidade Clínica / Pérola Médica**: Subtópico enriquecedor com curiosidades fisiopatológicas, aspectos históricos ou associações clínicas de alto rendimento.

   - **ESTRUTURAÇÃO DIDÁTICA EM TÓPICOS E SUBTÓPICOS DETALHADOS (PROIBIDO BLOCO ÚNICO OU "MEGA TEXTO")**:
     * **1. PROIBIÇÃO DE BLOCOS MONOLÍTICOS ("MEGA TEXTO")**:
       É terminantemente proibido fornecer respostas em um único bloco maciço e contínuo de texto sem quebras ou subtítulos ("mega texto"). A resposta deve ser visualmente limpa, pedagógica e estruturada em seções bem delimitadas.
     * **2. MODELO DIDÁTICO E FLEXÍVEL (ORGANIZAÇÃO EM TÓPICOS, SUBTÓPICOS E CONTEXTUALIZAÇÃO)**:
       Estruture a resposta com clareza visual e alto rigor acadêmico:
       - **Contextualização**: Pode incluir uma contextualização introdutória inicial (2 a 5 linhas situando o conceito central, relevância clínica e panorama epidemiológico antes de desmembrar os aspectos específicos).
       - **Tópicos e Subtópicos com Detalhamento Profundo**: Divida o conteúdo em tópicos e subtópicos com títulos claros em negrito (ex: '* **Mecanismo Fisiopatológico Detalhado:** [explicação aprofundada]', '* **Conduta Farmacológica e Manejo Clínico:** [posologias, fármacos, doses]'). Proibido fazer tópicos telegráficos de uma única frase; cada subtópico deve ser dissecado exaustivamente.
       - **Etapas Sequenciais Numeradas ('1.', '2.', '3.')**: Para processos que envolvem etapas, fases evolutivas cronológicas (ex: estágios do choque hipovolêmico, ciclo ovariano/endometrial, cascata de hemostasia) ou passos de conduta médica e protocolos sequenciais de atendimento, utilize etapas numeradas (1. 2. 3.) detalhando cada fase.
       - **Cadeias de Causalidade e Fluxos com Setas ('->' ou '→')**: Utilize setas de forma equilibrada para ilustrar relações de causa-efeito, cascatas hormonais ou encadeamentos fisiopatológicos (ex: Hemorragia volumosa -> Hipovolemia relativa -> Queda do retorno venoso -> Ativação simpática compensatória). Use com moderação e equilíbrio, sem exageros.
     * **3. APROFUNDAMENTO INTEGRADO NA PRÓPRIA RESPOSTA**:
       O aprofundamento científico deve ser integrado e fluido ao longo da explicação de cada tópico da questão.
     * **4. EXPLICAÇÃO OBRIGATÓRIA DE TERMOS NO MESMO PARÁGRAFO**:
       Nunca cite um termo médico, receptor celular, mediador químico ou processo sem explicar imediatamente no mesmo parágrafo o que ele significa, como atua no organismo e sua relevância clínica.
     * **5. EXPANSÃO E EXPLICAÇÃO OBRIGATÓRIA DE TODAS AS SIGLAS**:
       Toda sigla médica ou farmacológica (ex: IST, VB, CVV, DIP, HPV, HSV, KOH, PSA, HPB, SUS, SUA, PAM, DC, RVS) DEVE ser expandida por extenso na primeira vez que aparecer no texto.
     * **6. VALORES CONCRETOS E ACHADOS ESPECÍFICOS**:
       Forneça pontos de corte laboratoriais, valores de pH, achados de microscopia e sinais semiológicos patognomônicos.
     * **7. ENUNCIADO LIMPO**:
       No campo "question" de cada item de "learningQuestions", forneça APENAS o texto da pergunta SEM prefixos numéricos (NÃO escreva "1.", "Questão 1:", etc.).

7. **FONTES EPIDEMIOLÓGICAS E REFERÊNCIAS CIENTÍFICAS (OBRIGATÓRIO)**:
   - CITAÇÃO IMEDIATA NO TEXTO: Ao citar dados epidemiológicos (incidência, prevalência, mortalidade, novos casos), mostre a fonte logo após o dado, entre parênteses (ex: (Fonte: INCA, Estimativa de Câncer)).
   - No campo "references", gere a lista completa das referências científicas, diretrizes de sociedades médicas e livros utilizados.
${hasReferenceBooks ? `   - Obras de referência selecionadas pelo estudante na biblioteca para fundamentação prioritária:\n${bookTitles.map((t, idx) => `     * ${idx + 1}. ${t}`).join("\n")}` : ""}

8. **PADRÃO DE FORMATAÇÃO DO TEXTO**:
   - PROIBIÇÃO ABSOLUTA DE LATEX E CIFRÕES ($):
     * NUNCA utilize notação LaTeX nem cifrões ($) no texto sob nenhuma circunstância.
     * Escreva grandezas em texto simples: '<= 6', '< 10', '>= 10', '+/- 2', 'x 10^3'.
   - CORES MÉDICAS SEMÂNTICAS:
     * Medicamentos / Fármacos: envolva o nome em vermelho: '<span style="color: #DC2626;">NomeDoFármaco</span>'
     * Patologias / Doenças principais: envolva o nome em verde: '<span style="color: #16A34A;">NomeDaDoença</span>'
   - NUNCA use rótulos entre colchetes como '[Fisiológico]' ou '[Patológico]' e não gere tags vazias.
   - Inicie direto pelo título (# Nome do Caso).

JSON DE RETORNO OBRIGATÓRIO (VÁLIDO):
{
  "title": "Título conciso e representativo do Caso Clínico / Tutoria",
  "caseTranscription": "Transcrição literal e integral de todas as palavras do caso clínico original do documento anexo, sem omitir nada e sem adicionar comentários",
  "unknownTerms": [
    { "term": "Nome do Termo ou Sigla", "definition": "Definição precisa contextualizada" }
  ],
  "hypothesisAnalysis": [
    {
      "hypothesis": "Nome da Hipótese",
      "judgment": "Correta (Provável) ou Incorreta (Descartada)",
      "explanation": "Breve explicação objetiva do motivo pelo qual está certa ou errada baseada no caso"
    }
  ],
  "clinicalConclusion": {
    "summary": "Síntese diagnóstica do caso",
    "clinicalReasoning": "Raciocínio clínico integrativo",
    "conductAndOutcome": "Conduta médica, manejo e prognóstico esperado",
    "differentialTable": "| Diagnóstico Diferencial / Patologia | Fisiopatologia Central | Achados Clínicos e Exames | Conduta Médica |\n| --- | --- | --- | --- |\n| Linha 1 | ... | ... | ... |"
  },
  "learningQuestions": [
    {
      "question": "Pergunta completa da questão de aprendizagem sem número",
      "detailedAnswer": "Resposta rica e extremamente aprofundada (padrão tratado médico) estruturada em tópicos e subtópicos detalhados, contextualização, etapas numeradas para processos e setas para relações causais (sem mega texto contínuo)"
    }
  ],
  "references": [
    "Sociedade Brasileira de Urologia (SBU). Diretrizes Clínicas...",
    "Ministério da Saúde. Protocolo Clínico e Diretrizes Terapêuticas..."
  ]
}`;

    const userPromptText = `Resolva integralmente o Caso Clínico / Situação-Problema de Tutoria em anexo.
MISSÃO PRINCIPAL MANDATÓRIA: RESPONDER A TODAS AS QUESTÕES DE APRENDIZAGEM COM MÁXIMO NÍVEL DE DETALHAMENTO E APROFUNDAMENTO ACADÊMICO (PADRÃO TRATADO MÉDICO / UPTODATE / HARRISON / CECIL).

${userNotes ? `🚨 ATENÇÃO - ANOTAÇÕES E PERGUNTAS DO ESTUDANTE:
"""
${userNotes}
"""
Se as anotações acima contiverem dúvidas, perguntas ou tópicos de tutoria, extraia e responda a CADA UMA DELAS com máxima prioridade no array "learningQuestions"! Não deixe nenhuma pergunta de fora!` : ""}

DIRETRIZES FUNDAMENTAIS PARA AS QUESTÕES DE APRENDIZAGEM:
1. RESPONDA A 100% DAS QUESTÕES E OBJETIVOS (ZERO CORTES): Extraia TODOS os objetivos de aprendizagem do documento anexo (se houver 6, 7, 8 ou mais objetivos, responda a CADA UM DELES individualmente). NUNCA corte nem omita objetivos! O array "learningQuestions" NUNCA PODE SER VAZIO e deve conter uma questão para CADA objetivo do documento anexo!
2. NÍVEL MÁXIMO DE DETALHAMENTO (ZERO RESUMOS SUPERFICIAIS): Cada questão de aprendizagem deve ser uma explanação exaustiva e de altíssima densidade científica. Disque minuciosamente a fisiopatologia celular e molecular (citocinas, mediadores, receptores, vias de sinalização), anatomofisiologia, semiótica detalhada com manobras propedêuticas e sinais de alarme, escores clínicos validados, exames complementares com valores e pontos de corte numéricos, e terapêutica completa (classes, fármacos de 1ª e 2ª linha, mecanismos de ação, doses, posologia, vias e tempos de uso, além de medidas não farmacológicas e cirúrgicas).
3. ESTRUTURAÇÃO DIDÁTICA EM TÓPICOS E SUBTÓPICOS (PROIBIDO MEGA TEXTO MACIÇO): Proibido fazer parágrafos gigantes contínuos sem divisão visual. Estruture cada resposta com contextualização inicial, seguida de tópicos e subtópicos claros em negrito, dissecando cada ponto com alto rigor técnico.
4. ETAPAS NUMERADAS E FLUXOS COM SETAS: Utilize numeração (1., 2., 3.) para processos com fases evolutivas ou etapas cronológicas (ex: estágios de choque, protocolos de conduta) e setas (-> ou →) sem exagero para relações causais e encadeamento fisiopatológico.
5. DIAGNÓSTICO DIFERENCIAL NA PRÓPRIA RESPOSTA: Aborde e diferencie as principais condições correlatas dentro da questão, apontando critérios objetivos de exclusão.
6. CURIOSIDADE CLÍNICA: Finalize as questões com um subtópico enriquecedor "**Curiosidade Clínica**" com pérolas práticas ou fatos biomédicos de alto rendimento.
${hasReferenceBooks ? `\nObras de referência selecionadas da biblioteca: ${bookTitles.join(", ")}.\nUtilize o embasamento destas obras para responder com máxima veracidade científica a todas as questões.` : ""}`;

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt: userPromptText,
      fileAttachments,
      maxOutputTokens: 65536,
      temperature: 0.3,
    });

    // Safeguard: Guarantee learningQuestions is NEVER empty!
    if (!result.learningQuestions || !Array.isArray(result.learningQuestions) || result.learningQuestions.length === 0) {
      console.warn("learningQuestions is empty in primary result. Generating dedicated learning questions with full document attachments...");
      try {
        const fallbackRes = await generateJSONFromAI({
          systemPrompt: `Você é um preceptor médico especialista sênior em PBL / Tutoria Médica.
Sua missão única e prioritária é EXTRAIR E RESPONDER A TODAS AS PERGUNTAS E OBJETIVOS DE APRENDIZAGEM do caso clínico em anexo COM MÁXIMO NÍVEL DE DETALHAMENTO (PADRÃO TRATADO MÉDICO / UPTODATE).
Leia atentamente todo o documento anexo (PDF, Word ou Texto) e as anotações do estudante até o fim.
Localize e extraia TODOS os objetivos de aprendizagem e questões do documento anexo. Responda a TODOS sem omitir nenhum!
Responda a cada questão com riqueza exaustiva de detalhes: fisiopatologia celular e molecular completa, anatomofisiologia, semiótica com manobras e red flags, escores clínicos validados, exames com pontos de corte laboratoriais, e farmacologia detalhada (classes, fármacos, doses, posologias, vias e duração).
Estrutura estrita: tópicos e subtópicos detalhados (proibido mega texto monolítico corrido), contextualização inicial, etapas numeradas (1. 2. 3.) para processos com fases, setas (->) para encadeamentos causais sem exagero, cobertura ampla de diagnósticos diferenciais e condutas médicas detalhadas.
Retorne estritamente o JSON válido:
{
  "learningQuestions": [
    {
      "question": "Texto da pergunta de aprendizagem sem prefixo numérico",
      "detailedAnswer": "Resposta didática, profunda e altamente detalhada (padrão tratado médico) em tópicos, subtópicos aprofundados, contextualização e etapas explicadas passo a passo"
    }
  ]
}`,
          userPrompt: `Extraia e responda com profundidade máxima e detalhamento exaustivo a TODAS as questões e objetivos de aprendizagem do caso clínico em anexo (sem omitir nenhum objetivo)!
${userNotes ? `Anotações do estudante com perguntas prioritárias:\n"""\n${userNotes}\n"""` : "Identifique e responda a todos os objetivos de aprendizagem do documento com máxima densidade acadêmica."}`,
          fileAttachments, // PASS THE FILE ATTACHMENTS TO FALLBACK!
          maxOutputTokens: 65536,
          temperature: 0.3,
        });

        if (fallbackRes?.learningQuestions && Array.isArray(fallbackRes.learningQuestions) && fallbackRes.learningQuestions.length > 0) {
          result.learningQuestions = fallbackRes.learningQuestions;
        }
      } catch (fbErr) {
        console.error("Failed to generate fallback learning questions:", fbErr);
      }
    }

    const parts: string[] = [];
    parts.push(`# ${result.title || "Resolução de Tutoria Clínica"}\n`);

    // 1. Transcrição integral do caso clínico original
    if (result.caseTranscription && result.caseTranscription.trim()) {
      parts.push(`## Caso Clínico\n\n${result.caseTranscription.trim()}\n`);
    }

    // 2. Termos e Perguntas Desconhecidas
    if (result.unknownTerms && result.unknownTerms.length > 0) {
      parts.push(`## Termos e Perguntas Desconhecidas\n`);
      for (const t of result.unknownTerms) {
        parts.push(`* **${t.term}**: ${t.definition}`);
      }
      parts.push("");
    }

    // 3. Hipóteses Diagnósticas
    if (result.hypothesisAnalysis && result.hypothesisAnalysis.length > 0) {
      parts.push(`## Hipóteses Diagnósticas\n`);
      for (const h of result.hypothesisAnalysis) {
        const cleanHypothesis = (h.hypothesis || "").replace(/<\/?[a-zA-Z][^>]*>/g, "").trim();
        const cleanJudgment = (h.judgment || "").replace(/<\/?[a-zA-Z][^>]*>/g, "").trim();
        const judgment = cleanJudgment ? ` — **${cleanJudgment}**` : "";
        const expl = (h.explanation || h.rationale || "").replace(/<\/?[a-zA-Z][^>]*>/g, "").trim();
        parts.push(`* **${cleanHypothesis || "Hipótese"}**${judgment}: ${expl}`);
      }
      parts.push("");
    }

    // 4. Conclusão do Caso Clínico + Tabela Comparativa
    if (result.clinicalConclusion) {
      parts.push(`## Conclusão do Caso Clínico\n`);
      if (result.clinicalConclusion.summary) {
        parts.push(`* **Síntese Diagnóstica Consolidada**: ${result.clinicalConclusion.summary}`);
      }
      if (result.clinicalConclusion.clinicalReasoning) {
        parts.push(`* **Raciocínio Clínico Integrativo**: ${result.clinicalConclusion.clinicalReasoning}`);
      }
      if (result.clinicalConclusion.conductAndOutcome) {
        parts.push(`* **Conduta Médica e Manejo**: ${result.clinicalConclusion.conductAndOutcome}`);
      }
      if (result.clinicalConclusion.differentialTable && result.clinicalConclusion.differentialTable.trim()) {
        parts.push(`\n### Quadro Comparativo de Diagnóstico Diferencial\n\n${result.clinicalConclusion.differentialTable.trim()}\n`);
      }
      parts.push("");
    }

    // 5. Questões de Aprendizagem
    if (result.learningQuestions && result.learningQuestions.length > 0) {
      parts.push(`## Questões de Aprendizagem\n`);
      for (let i = 0; i < result.learningQuestions.length; i++) {
        const lq = result.learningQuestions[i];
        const rawQ = (lq.question || "").trim();
        const cleanQ = rawQ
          .replace(/^(?:quest[aã]o|pergunta)?\s*\d+\s*[:.\-–)]*\s*/i, "")
          .trim();
        const finalQuestion = cleanQ || rawQ;
        lq.question = finalQuestion;
        parts.push(`### Questão ${i + 1}: ${finalQuestion}\n\n${lq.detailedAnswer}\n`);
      }
    }

    // 6. Referências Bibliográficas e Fontes dos Dados
    const allReferences: string[] = [];
    if (result.references && Array.isArray(result.references) && result.references.length > 0) {
      allReferences.push(...result.references);
    }
    if (bookTitles && bookTitles.length > 0) {
      for (const b of bookTitles) {
        if (!allReferences.some((r) => r.toLowerCase().includes(b.toLowerCase()))) {
          allReferences.push(`Livro de Referência: ${b}`);
        }
      }
    }
    if (allReferences.length > 0) {
      parts.push(`## Referências Bibliográficas e Fontes dos Dados\n`);
      for (const ref of allReferences) {
        parts.push(`* ${ref}`);
      }
      parts.push("");
    }

    const finalMarkdown = cleanLatexAndBadges(parts.join("\n"));

    return NextResponse.json({
      title: result.title || "Resolução de Tutoria Clínica",
      caseTranscription: result.caseTranscription || "",
      unknownTerms: result.unknownTerms || [],
      hypothesisAnalysis: result.hypothesisAnalysis || [],
      clinicalConclusion: result.clinicalConclusion || {
        summary: "",
        clinicalReasoning: "",
        conductAndOutcome: "",
      },
      learningQuestions: result.learningQuestions || [],
      references: allReferences,
      markdownContent: finalMarkdown,
      files: uploadedFiles,
      selectedBookTitles: bookTitles,
      detailLevel: "detalhado",
    });
  } catch (error: any) {
    console.error("Tutoria API error:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar a resolução da Tutoria com a IA." },
      { status: 500 }
    );
  }
}
