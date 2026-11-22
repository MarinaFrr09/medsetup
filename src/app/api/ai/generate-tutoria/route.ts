import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { extractTextFromDocx, extractTextFromPptx, extractImagesFromOffice } from "@/lib/document-parser";
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
            name: `Caso_Clinico_${file.name}.txt`,
          });
        }
        // Extract embedded images from Word document (e.g. photos/scans of the clinical case)
        const embeddedImages = extractImagesFromOffice(buffer);
        for (let imgIdx = 0; imgIdx < embeddedImages.length; imgIdx++) {
          const img = embeddedImages[imgIdx];
          fileAttachments.push({
            data: img.buffer.toString("base64"),
            mimeType: img.mimeType,
            name: `Caso_Clinico_${file.name}_img_${imgIdx + 1}.${img.name.split(".").pop() || "png"}`,
          });
        }
        continue;
      }

      if (ext === "pptx") {
        const extractedText = extractTextFromPptx(buffer);
        if (extractedText && extractedText.length > 0) {
          fileAttachments.push({
            data: Buffer.from(extractedText, "utf8").toString("base64"),
            mimeType: "text/plain",
            name: `Caso_Clinico_${file.name}.txt`,
          });
        }
        // Extract embedded images from PowerPoint presentation
        const embeddedImages = extractImagesFromOffice(buffer);
        for (let imgIdx = 0; imgIdx < embeddedImages.length; imgIdx++) {
          const img = embeddedImages[imgIdx];
          fileAttachments.push({
            data: img.buffer.toString("base64"),
            mimeType: img.mimeType,
            name: `Caso_Clinico_${file.name}_img_${imgIdx + 1}.${img.name.split(".").pop() || "png"}`,
          });
        }
        continue;
      }

      if (ext === "pdf" || file.type === "application/pdf") {
        fileAttachments.push({
          data: buffer.toString("base64"),
          mimeType: "application/pdf",
          name: `Caso_Clinico_${file.name}`,
        });
        continue;
      }

      if (
        ext === "png" ||
        ext === "jpg" ||
        ext === "jpeg" ||
        ext === "webp" ||
        ext === "jfif" ||
        ext === "bmp" ||
        file.type.startsWith("image/")
      ) {
        const imgMime =
          file.type && file.type.startsWith("image/")
            ? file.type
            : ext === "png"
            ? "image/png"
            : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
        fileAttachments.push({
          data: buffer.toString("base64"),
          mimeType: imgMime,
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

2. **TRANSCRIÇÃO INTEGRAL DO CASO CLÍNICO (OCR / LEITURA DE IMAGEM OBRIGATÓRIA - TODAS AS PALAVRAS)**:
   - REGRA MANDATÓRIA E INEGOCIÁVEL: MESMO QUE O ARQUIVO ENVIADO CONTENHA UMA IMAGEM AO INVÉS DE TEXTO SELECIONÁVEL (POR EXEMPLO: FOTO DE FOLHA IMPRESSA, SCAN DE DOCUMENTO, SCREENSHOT/PRINT DE TELA, OU PDF CONTENDO UMA IMAGEM DA SITUAÇÃO-PROBLEMA OU CASO CLÍNICO):
     VOCÊ DEVE LER VISUALMENTE CADA IMAGEM (OCR MÉDICO PRECISO) E TRANSCREVER O CASO CLÍNICO INTEGRALMENTE COM TODAS AS PALAVRAS QUE ESTÃO LÁ, DO INÍCIO AO FIM, EXATAMENTE COMO ESCRITO NO ORIGINAL!
   - Transcreva palavra por palavra sem cortes:
     * Toda a narrativa do caso, dados de identificação do paciente (idade, sexo, profissão, procedência).
     * Queixa principal e história da doença atual completa com todas as frases, termos médicos e datas originais.
     * Interrogatório sintomatológico, antecedentes pessoais e familiares, hábitos de vida.
     * Exame físico completo, dados antropométricos, sinais vitais (PA, FC, FR, SatO2, temperatura axilar).
     * Resultados de exames laboratoriais, achados de imagem ou propedêutica armada com todos os valores numéricos e unidades.
     * Perguntas disparadoras ou problemas da situação-problema presentes na imagem.
   - NUNCA resuma, NUNCA parafraseie, NUNCA substitua por síntese e NUNCA omita nenhuma frase ou palavra do caso original.
   - Preencha o campo "caseTranscription" com esta transcrição integral com todas as palavras.

3. **TERMOS E PALAVRAS DESCONHECIDAS (FIDELIDADE TOTAL AO ARQUIVO ANEXADO)**:
   - REGRA MANDATÓRIA: As palavras/termos desconhecidos DEVEM SER ESTRITAMENTE AS MESMAS que estão no arquivo anexado (ou nas anotações do estudante).
   - NÃO É PARA VOCÊ INVENTAR ou formular palavras desconhecidas por conta própria! Se o documento/roteiro anexo já contiver uma lista de "Palavras Desconhecidas", "Termos Desconhecidos" ou "Dúvidas", utilize EXATAMENTE os termos dessa lista.
   - Sua única função é responder quais são essas palavras e fornecer a definição médica precisa, mecanismo e significado de cada uma delas.
   - Formate cada termo no array "unknownTerms" com:
     * "term": "Nome exato da palavra/termo que está no documento anexado"
     * "definition": "Definição médica precisa, clara e contextualizada do termo"
   - Apenas se o documento NÃO contiver nenhuma lista ou menção a termos desconhecidos, identifique as nomenclaturas médicas mais complexas presentes no caso.

4. **HIPÓTESES DIAGNÓSTICAS (FIDELIDADE TOTAL AO ARQUIVO ANEXADO - APENAS JULGAR)**:
   - O título desta seção DEVE SER EXATAMENTE "Hipóteses Diagnósticas".
   - REGRA MANDATÓRIA: As hipóteses diagnósticas DEVEM SER ESTRITAMENTE AS MESMAS que estão no arquivo anexado (ou nas anotações do estudante).
   - NÃO É PARA VOCÊ INVENTAR hipóteses diagnósticas novas da sua cabeça! O grupo de tutoria / situação-problema já levantou as hipóteses no documento.
   - Sua única função é APENAS AVALIAR E JULGAR se as hipóteses levantadas no documento estão corretas ou não:
     * Declare expressamente no campo "judgment": "Correta (Provável)" ou "Incorreta (Descartada)".
     * Forneça uma explicação concisa no campo "explanation" justificando clinicamente por que aquela hipótese levantada está certa ou errada com base nos dados do caso.
   - Preencha o campo "hypothesisAnalysis" com:
     * "hypothesis": Nome exato da hipótese levantada no documento
     * "judgment": "Correta (Provável)" ou "Incorreta (Descartada)"
     * "explanation": Explicação clínica objetiva fundamentando o julgamento
   - Apenas se o documento NÃO contiver nenhuma hipótese levantada, liste de 3 a 5 hipóteses cabíveis para a queixa do caso e julgue-as.

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
   - **REGRA CRUCIAL: RESPOSTA TEÓRICA E INDEPENDENTE DO CASO CLÍNICO (NÃO MISTURAR COM O CASO)**:
     * Ao responder as Questões de Aprendizagem, a resposta DEVE SER PURAMENTE TEÓRICA, CONCEITUAL E APROFUNDADA (padrão tratado médico / UpToDate / Harrison / Cecil).
     * É EXPRESSAMENTE PROIBIDO misturar ou interligar a resposta da questão com a história ou paciente do caso clínico ao longo da explanação. Para responder às perguntas de aprendizagem, NÃO fale do caso clínico, do paciente, de nomes, queixas ou eventos do caso da tutoria.
     * Se for fazer qualquer relação com o caso clínico do problema, faça isso ESTRITAMENTE ao final da resposta como uma ÚNICA estrofe independente e destacada, explicitando com clareza: "**Aplicação / Correlação ao Caso Clínico:** Agora correlacionando diretamente com o caso clínico do problema..." (no máximo uma única estrofe concisa ao final).
     * Todo o corpo principal da resposta deve ser 100% autônomo, teórico, médico, científico e completo sem fazer referências ao paciente ou caso clínico!
     * PROIBIÇÃO ABSOLUTA DE LACUNAS: Nunca corte palavras nem crie frases incompletas como 'de , resultando em ,'. Toda a resposta teórica deve citar os nomes médicos reais e universais de todos os fármacos e patologias por extenso.
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
       1. Parágrafo introdutório direto (PROIBIDO escrever "Contextualização e Relevância Clínica:" ou "Contextualização:"): definição conceitual abrangente, relevância epidemiológica com dados quantitativos e citação de fonte entre parênteses ex: (Fonte: Ministério da Saúde / Sociedades de Especialidade), impacto sistêmico e panorama clínico inicial.
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
       10. **Curiosidade Clínica / Correlação Fisiopatológica e Terapêutica**: Subtópico enriquecedor que explique de forma lógica e integrada (sem decoreba ou mnemônicos artificiais) como o mecanismo fisiopatológico da condição justifica seus achados clínicos e o tratamento instituído (ex: "O pé diabético resulta de neuropatia periférica e isquemia causadas pela hiperglicemia crônica, sendo tratado com controle rigoroso da glicemia, desbridamento de feridas, uso de curativos adequados, descarga de pressão e antibioticoterapia quando houver infecção").

   - **ESTRUTURAÇÃO DIDÁTICA EM TÓPICOS E SUBTÓPICOS DETALHADOS (PROIBIDO BLOCO ÚNICO OU "MEGA TEXTO")**:
     * **1. PROIBIÇÃO DE BLOCOS MONOLÍTICOS ("MEGA TEXTO")**:
       É terminantemente proibido fornecer respostas em um único bloco maciço e contínuo de texto sem quebras ou subtítulos ("mega texto"). A resposta deve ser visualmente limpa, pedagógica e estruturada em seções bem delimitadas.
     * **2. MODELO DIDÁTICO E FLEXÍVEL (ORGANIZAÇÃO EM TÓPICOS, SUBTÓPICOS E CONTEXTUALIZAÇÃO)**:
       Estruture a resposta com clareza visual e alto rigor acadêmico:
       - **Parágrafo Introdutório Direto (SEM escrever "Contextualização e Relevância Clínica:")**: Inicie diretamente com 2 a 4 linhas situando o conceito central e panorama epidemiológico antes de desmembrar os aspectos específicos, sem rótulos ou prefixos introdutórios.
       - **Tópicos e Subtópicos com Bolinhas para Estruturas, Tipos e Características**: Divida o conteúdo em tópicos e subtópicos com títulos claros em negrito (ex: '* **Mecanismo Fisiopatológico Detalhado:** [explicação aprofundada]', '* **Conduta Farmacológica e Manejo Clínico:** [posologias, fármacos, doses]'). Sempre que listar ou detalhar estruturas anatômicas (ex: ossos, cartilagens, camadas, divisões de órgãos), tipos, classificações ou características, prefira usar subtópicos indentados com bolinhas ('\\n  * **Nome da Estrutura / Característica:** explicação') em vez de um texto corrido longo.
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
  "caseTranscription": "Transcrição literal e integral com TODAS as palavras do caso clínico original do documento/imagem anexa, exatamente como está na foto/scan/PDF, sem resumir, sem omitir nada e sem adicionar comentários",
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
    "summary": "Síntese diagnóstica ultra-concisa e objetiva em no máximo 1 ou 2 frases diretas (máximo 2 linhas, sem parágrafos longos)",
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

    // Separate case attachments (photos, PDFs, documents) from library reference books
    const caseAttachments = fileAttachments.filter(
      (f) => !f.name?.startsWith("Livro_Referencia_")
    );

    const hasVisualCaseFiles = caseAttachments.some(
      (f) => f.mimeType.startsWith("image/") || f.mimeType === "application/pdf"
    );

    let initialTranscribedCase = "";
    let initialDetectedObjectives: string[] = [];
    let initialDetectedUnknownTerms: string[] = [];
    let initialDetectedHypotheses: string[] = [];

    // Pre-OCR step: When images, photos, scans, or PDFs are attached, run dedicated OCR FIRST
    // so the clinical case is literally transcribed word-for-word from images before full generation
    if (hasVisualCaseFiles) {
      console.log(`[generate-tutoria] Executando OCR médico prioritário para ${caseAttachments.length} anexo(s) do caso...`);
      try {
        const ocrRes = await generateJSONFromAI({
          systemPrompt: `Você é um especialista em OCR médico de altíssima precisão e transcrição integral de situações-problema e casos clínicos de Tutoria Médica / PBL.
Sua missão MANDATÓRIA e PRIORITÁRIA é LER ATENTAMENTE TODAS AS IMAGENS, FOTOS, PRINTS, SCANS E PÁGINAS DO CASO CLÍNICO e TRANSCREVER O CASO CLÍNICO INTEGRALMENTE, COM TODAS AS PALAVRAS, EXATAMENTE COMO ESTÁ NAS IMAGENS.

DIRETRIZES DE TRANSCRIÇÃO INTEGRAL (ZERO CORTES / ZERO RESUMOS):
1. Leia visualmente cada foto, screenshot, print de tela, scan de folha impressa, slide ou página de PDF com máxima atenção.
2. Transcreva literalmente palavra por palavra todo o caso clínico com fidelidade absoluta:
   - Identificação do paciente (nome/iniciais, idade, sexo, ocupação, procedência, etnia, estado civil).
   - Queixa principal (QP) e História da Doença Atual (HDA) com todas as frases, sintomas descritos, cronologia, termos originais e detalhes clínicos.
   - Interrogatório sintomatológico (ISDA), antecedentes pessoais patológicos, cirúrgicos, ginecológicos/obstétricos se aplicável, história medicamentosa, hábitos de vida e história familiar.
   - Exame físico completo (sinais vitais com todos os valores numéricos: PA, FC, FR, Temp, SpO2; ectoscopia, aparelhos cardiovascular, respiratório, abdome, membros, neurológico).
   - Exames laboratoriais e complementares (hemograma, bioquímica, gasometria, ECG, laudos de radiografia, tomografia, ultrassom) com TODOS os valores numéricos, unidades e referências.
   - Qualquer pergunta disparadora, dúvida, desafio ou problema formulado no final do caso original.
3. Se o caso estiver distribuído em múltiplas fotos/imagens/slides, junte tudo em uma única transcrição contínua, completa e cronológica do caso clínico.
4. PROIBIDO resumir, PROIBIDO parafrasear, PROIBIDO omitir frases e PROIBIDO inventar dados que não estão lá.
5. Se houver Objetivos de Aprendizagem ou Questões de Aprendizagem explícitas escritas na imagem ou documento, extraia cada uma delas no array "detectedObjectives".
6. Se houver Palavras Desconhecidas ou Termos Desconhecidos listados na imagem ou documento (Passo 1 do PBL), extraia cada uma delas no array "detectedUnknownTerms".
7. Se houver Hipóteses ou Hipóteses Diagnósticas levantadas na imagem ou documento (Passo 3 do PBL), extraia cada uma delas no array "detectedHypotheses".

Retorne estritamente o JSON válido:
{
  "caseTranscription": "Transcrição literal e completa de todas as palavras do caso clínico presentes nas imagens/documentos, sem resumo",
  "detectedObjectives": ["Objetivo ou questão 1", "Objetivo ou questão 2"],
  "detectedUnknownTerms": ["Palavra desconhecida 1", "Palavra desconhecida 2"],
  "detectedHypotheses": ["Hipótese 1", "Hipótese 2"]
}`,
          userPrompt: `Leia todas as imagens e documentos do caso em anexo e transcreva o caso clínico integralmente com TODAS as palavras que estão lá, exatamente como escrito no original. Não resuma nada. Extraia também quaisquer objetivos de aprendizagem, palavras desconhecidas e hipóteses diagnósticas listadas no material.`,
          fileAttachments: caseAttachments,
          maxOutputTokens: 16384,
          temperature: 0.1,
        });

        if (ocrRes?.caseTranscription && ocrRes.caseTranscription.trim().length > 30) {
          initialTranscribedCase = ocrRes.caseTranscription.trim();
          console.log(`[generate-tutoria] Caso clínico transcrito com sucesso via OCR (${initialTranscribedCase.length} caracteres).`);
        } else if (ocrRes?.transcription && ocrRes.transcription.trim().length > 30) {
          initialTranscribedCase = ocrRes.transcription.trim();
        }

        if (Array.isArray(ocrRes?.detectedObjectives) && ocrRes.detectedObjectives.length > 0) {
          initialDetectedObjectives = ocrRes.detectedObjectives.filter(Boolean);
        }
        if (Array.isArray(ocrRes?.detectedUnknownTerms) && ocrRes.detectedUnknownTerms.length > 0) {
          initialDetectedUnknownTerms = ocrRes.detectedUnknownTerms.filter(Boolean);
        }
        if (Array.isArray(ocrRes?.detectedHypotheses) && ocrRes.detectedHypotheses.length > 0) {
          initialDetectedHypotheses = ocrRes.detectedHypotheses.filter(Boolean);
        }
      } catch (ocrErr) {
        console.warn("[generate-tutoria] Pré-OCR dedicado falhou, continuando para resolução primária:", ocrErr);
      }
    }

    const userPromptText = `Resolva integralmente o Caso Clínico / Situação-Problema de Tutoria em anexo.
MISSÃO PRINCIPAL MANDATÓRIA: RESPONDER A TODAS AS QUESTÕES DE APRENDIZAGEM COM MÁXIMO NÍVEL DE DETALHAMENTO E APROFUNDAMENTO ACADÊMICO (PADRÃO TRATADO MÉDICO / UPTODATE / HARRISON / CECIL).

${initialTranscribedCase ? `🚨 TRANSCRIÇÃO LITERAL COMPLETA DO CASO CLÍNICO EXTRAÍDA DAS IMAGENS/DOCUMENTOS ANEXADOS:
"""
${initialTranscribedCase}
"""
Coloque OBRIGATORIAMENTE esta transcrição completa no campo "caseTranscription". NÃO resuma e NÃO corte!` : `🚨 REGRA CRÍTICA PARA O CASO CLÍNICO (TRANSCRIÇÃO LITERAL COMPLETA COM TODAS AS PALAVRAS):
MESMO QUE O ARQUIVO ENVIADO SEJA UMA IMAGEM (FOTO/PRINT/SCAN) OU UM PDF CONTENDO IMAGEM AO INVÉS DE TEXTO SELECIONÁVEL:
LEIA VISUALMENTE A IMAGEM E TRANSCREVA O CASO CLÍNICO INTEGRALMENTE NO CAMPO "caseTranscription" COM TODAS AS PALAVRAS QUE ESTÃO LÁ!
Não resuma, não corte e não parafraseie nenhuma frase ou dado. Transcreva palavra por palavra todo o caso clínico original.`}

${initialDetectedUnknownTerms.length > 0 ? `🚨 PALAVRAS/TERMOS DESCONHECIDOS EXTRAÍDOS DO DOCUMENTO ANEXADO:
${initialDetectedUnknownTerms.map((t, i) => `${i + 1}. ${t}`).join("\n")}
Defina EXATAMENTE estas palavras no array "unknownTerms"! NÃO invente outras!` : ""}

${initialDetectedHypotheses.length > 0 ? `🚨 HIPÓTESES DIAGNÓSTICAS EXTRAÍDAS DO DOCUMENTO ANEXADO:
${initialDetectedHypotheses.map((h, i) => `${i + 1}. ${h}`).join("\n")}
Avalie e julgue EXATAMENTE estas hipóteses no array "hypothesisAnalysis" (Correta ou Incorreta)! NÃO invente outras hipóteses!` : ""}

${initialDetectedObjectives.length > 0 ? `🚨 OBJETIVOS DE APRENDIZAGEM EXTRAÍDOS DAS IMAGENS/DOCUMENTOS:
${initialDetectedObjectives.map((obj, i) => `${i + 1}. ${obj}`).join("\n")}
Responda OBRIGATORIAMENTE a CADA UM destes objetivos no array "learningQuestions"! Não omita nenhum!
${initialDetectedObjectives.length === 1 ? `ATENÇÃO CRÍTICA: Foi detectado apenas 1 objetivo prévio na leitura inicial, porém uma Tutoria Médica exige o desdobramento e resposta a TODOS os objetivos do documento ou a formulação de 5 a 8 Questões de Aprendizagem completas cobrindo todos os eixos biomédicos do caso (fisiopatologia celular e molecular, semiologia e diagnóstico diferencial, propedêutica armada e manejo clínico/farmacológico completo). É TERMINANTEMENTE PROIBIDO PARAR NA QUESTÃO 1 OU GERAR APENAS 1 QUESTÃO!` : ""}` : `🚨 ATENÇÃO PARA AS QUESTÕES DE APRENDIZAGEM:
Extraia e responda a TODOS os objetivos de aprendizagem do documento. Se não houver lista explícita, formule e responda de 5 a 8 Questões de Aprendizagem profundas cobrindo todos os pilares biomédicos do caso. PROIBIDO PARAR NA QUESTÃO 1!`}

${userNotes ? `🚨 ATENÇÃO - ANOTAÇÕES E PERGUNTAS DO ESTUDANTE:
"""
${userNotes}
"""
Se as anotações acima contiverem dúvidas, perguntas ou tópicos de tutoria, extraia e responda a CADA UMA DELAS com máxima prioridade no array "learningQuestions"! Não deixe nenhuma pergunta de fora!` : ""}

🚨 REGRAS CRÍTICAS PARA PALAVRAS DESCONHECIDAS E HIPÓTESES DIAGNÓSTICAS:
- PALAVRAS DESCONHECIDAS: Devem ser ESTRITAMENTE as mesmas que constam no arquivo anexado (ou nas anotações). NÃO é para você inventar ou formular termos da sua cabeça! Responda apenas definindo o significado exato das palavras presentes no documento.
- HIPÓTESES DIAGNÓSTICAS: Devem ser ESTRITAMENTE as mesmas levantadas no arquivo anexado (ou nas anotações). NÃO é para você inventar hipóteses novas! Sua função é apenas avaliar e julgar cada uma das hipóteses levantadas (marcar se é "Correta (Provável)" ou "Incorreta (Descartada)" e justificar brevemente com base no caso).

DIRETRIZES FUNDAMENTAIS PARA AS QUESTÕES DE APRENDIZAGEM:
1. RESPONDA A 100% DAS QUESTÕES E OBJETIVOS (ZERO CORTES / PROIBIDO PARAR NA QUESTÃO 1): Extraia TODOS os objetivos de aprendizagem do documento anexo (se houver 5, 6, 7, 8 ou mais objetivos, responda a CADA UM DELES individualmente). NUNCA corte nem pare na Questão 1! O array "learningQuestions" DEVE CONTER TODAS AS QUESTÕES (no mínimo 5 a 8 questões se o documento não trouxer lista explícita)!
2. NÍVEL MÁXIMO DE DETALHAMENTO (ZERO RESUMOS SUPERFICIAIS): Cada questão de aprendizagem deve ser uma explanação exaustiva e de altíssima densidade científica. Disque minuciosamente a fisiopatologia celular e molecular (citocinas, mediadores, receptores, vias de sinalização), anatomofisiologia, semiótica detalhada com manobras propedêuticas e sinais de alarme, escores clínicos validados, exames complementares com valores e pontos de corte numéricos, e terapêutica completa (classes, fármacos de 1ª e 2ª linha, mecanismos de ação, doses, posologia, vias e tempos de uso, além de medidas não farmacológicas e cirúrgicas).
3. RESPOSTAS TEÓRICAS E INDEPENDENTES DO CASO CLÍNICO (NÃO MISTURAR COM O CASO): Não interligue ou misture a resposta das questões com o paciente ou história do caso clínico ao longo do texto. Responda à pergunta de forma puramente teórica, conceitual, universal e científica (padrão tratado médico / UpToDate). Para responder à pergunta, NÃO fale do caso clínico! Se for correlacionar com o caso do problema, faça isso APENAS ao final da resposta como uma única estrofe independente destacando: "**Aplicação / Correlação ao Caso Clínico:** Agora correlacionando diretamente com o caso clínico do problema...".
4. ESTRUTURAÇÃO DIDÁTICA EM TÓPICOS E SUBTÓPICOS (PROIBIDO MEGA TEXTO MACIÇO): Proibido fazer parágrafos gigantes contínuos sem divisão visual. Estruture cada resposta com contextualização inicial, seguida de tópicos e subtópicos claros em negrito, dissecando cada ponto com alto rigor técnico.
5. ETAPAS NUMERADAS E FLUXOS COM SETAS: Utilize numeração (1., 2., 3.) para processos com fases evolutivas ou etapas cronológicas (ex: estágios de choque, protocolos de conduta) e setas (-> ou →) sem exagero para relações causais e encadeamento fisiopatológico.
6. DIAGNÓSTICO DIFERENCIAL NA PRÓPRIA RESPOSTA: Aborde e diferencie as principais condições correlatas dentro da questão, apontando critérios objetivos de exclusão.
7. CURIOSIDADE CLÍNICA: Finalize as questões com um subtópico enriquecedor "**Curiosidade Clínica**" trazendo uma síntese lógica e integrada (sem decoreba) que conecte a causa fisiopatológica diretamente ao manejo e tratamento clínico.
${hasReferenceBooks ? `\nObras de referência selecionadas da biblioteca: ${bookTitles.join(", ")}.\nUtilize o embasamento destas obras para responder com máxima veracidade científica a todas as questões.` : ""}`;

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt: userPromptText,
      fileAttachments,
      maxOutputTokens: 65536,
      temperature: 0.3,
    });

    // Ensure caseTranscription is populated with full fidelity from pre-OCR
    if (initialTranscribedCase && (!result.caseTranscription || result.caseTranscription.trim().length < initialTranscribedCase.length * 0.7)) {
      result.caseTranscription = initialTranscribedCase;
    }

    // Safeguard: Guarantee learningQuestions has ALL questions and is never empty or cut off at 1 question!
    if (!result.learningQuestions || !Array.isArray(result.learningQuestions) || result.learningQuestions.length <= 1) {
      console.warn("learningQuestions has <= 1 question in primary result. Generating dedicated learning questions with full document attachments...");
      try {
        const fallbackRes = await generateJSONFromAI({
          systemPrompt: `Você é um preceptor médico especialista sênior em PBL / Tutoria Médica.
Sua missão única e prioritária é EXTRAIR E RESPONDER A TODAS AS PERGUNTAS E OBJETIVOS DE APRENDIZAGEM do caso clínico em anexo COM MÁXIMO NÍVEL DE DETALHAMENTO (PADRÃO TRATADO MÉDICO / UPTODATE).
Leia atentamente todo o documento anexo (PDF, Word ou Texto) e as anotações do estudante até o fim.
Localize e extraia TODOS os objetivos de aprendizagem e questões do documento anexo. Responda a TODOS sem omitir nenhum!
PROIBIÇÃO INVIOLÁVEL: É terminantemente proibido parar na questão 1 ou retornar apenas 1 questão! Uma sessão completa de Tutoria exige responder a todos os objetivos do documento ou, caso não haja lista explícita no documento, formular e responder de 5 a 8 Questões de Aprendizagem essenciais cobrindo:
1) Fisiopatologia celular e molecular profunda;
2) Correlação anatomoclínica e fisiologia do sistema afetado;
3) Semiotécnica, manobras diagnósticas e sinais de alarme ("red flags");
4) Diagnóstico diferencial e critérios de exclusão;
5) Propedêutica armada e exames complementares com valores de referência;
6) Terapêutica medicamentosa (classes, fármacos, doses, posologia e efeitos adversos) e conduta não farmacológica.
Responda a cada questão com riqueza exaustiva de detalhes (padrão tratado médico / UpToDate).
REGRA MANDATÓRIA: Responda a cada questão de forma puramente teórica, científica e universal. NÃO mencione nem misture o caso clínico do problema ao longo da resposta! Se for correlacionar com o caso, faça-o exclusivamente ao final como uma única estrofe independente destacada ("**Aplicação / Correlação ao Caso Clínico:** Agora correlacionando diretamente com o caso clínico do problema...").
Estrutura estrita: tópicos e subtópicos detalhados (proibido mega texto monolítico corrido), contextualização inicial, etapas numeradas (1. 2. 3.) para processos com fases, setas (->) para encadeamentos causais sem exagero.
Retorne estritamente o JSON válido:
{
  "learningQuestions": [
    {
      "question": "Texto da pergunta de aprendizagem sem prefixo numérico",
      "detailedAnswer": "Resposta didática, profunda e altamente detalhada (padrão tratado médico) em tópicos, subtópicos aprofundados, contextualização e etapas explicadas passo a passo"
    }
  ]
}`,
          userPrompt: `Extraia e responda com profundidade máxima e detalhamento exaustivo a TODAS as questões e objetivos de aprendizagem do caso clínico em anexo (sem omitir nenhum objetivo, responda a todos os objetivos do documento ou formule de 5 a 8 questões completas, NUNCA pare na questão 1)!
${initialTranscribedCase ? `Caso Clínico Transcrito:\n"""\n${initialTranscribedCase}\n"""\n` : ""}
${userNotes ? `Anotações do estudante com perguntas prioritárias:\n"""\n${userNotes}\n"""` : "Identifique e responda a todos os objetivos de aprendizagem do documento com máxima densidade acadêmica."}`,
          fileAttachments, // PASS THE FILE ATTACHMENTS TO FALLBACK!
          maxOutputTokens: 65536,
          temperature: 0.3,
        });

        if (fallbackRes?.learningQuestions && Array.isArray(fallbackRes.learningQuestions) && fallbackRes.learningQuestions.length > 0) {
          if (!result.learningQuestions || result.learningQuestions.length <= 1) {
            result.learningQuestions = fallbackRes.learningQuestions;
          } else {
            const existingQ = new Set(result.learningQuestions.map((q: any) => q.question?.toLowerCase().trim()));
            for (const fq of fallbackRes.learningQuestions) {
              if (fq?.question && !existingQ.has(fq.question.toLowerCase().trim())) {
                result.learningQuestions.push(fq);
              }
            }
          }
          console.log(`[generate-tutoria] learningQuestions enriquecido/restaurado com sucesso via fallback: ${result.learningQuestions.length} questões.`);
        }
      } catch (fbErr) {
        console.error("Failed to generate fallback learning questions:", fbErr);
      }
    }

    // Safeguard 2: Guarantee caseTranscription is NEVER empty, especially when case is an image/photo/scan!
    if (!result.caseTranscription || result.caseTranscription.trim().length < 50) {
      console.warn("caseTranscription is empty or too short. Performing dedicated OCR image transcription on case files...");
      try {
        const ocrRes = await generateJSONFromAI({
          systemPrompt: `Você é um especialista em OCR médico de altíssima precisão e transcrição literal de documentos e imagens.
Sua missão única e mandatória é LER A IMAGEM OU DOCUMENTO ANEXO (PDF, Foto, Scan ou Print de tela) e TRANSCREVER O CASO CLÍNICO / SITUAÇÃO-PROBLEMA INTEGRALMENTE COM TODAS AS PALAVRAS QUE ESTÃO LÁ, SEM OMITIR ABSOLUTAMENTE NADA!
DIRETRIZES:
1. Mesmo que o documento seja uma foto, imagem ou scan, leia cada palavra visualmente e transcreva literalmente.
2. Transcreva todos os dados do paciente, queixa principal, história da doença atual, antecedentes, exame físico, sinais vitais, exames complementares e perguntas/desafios.
3. PROIBIDO resumir, parafrasear ou adicionar comentários. Transcreva com fidelidade absoluta palavra por palavra.
Retorne estritamente o JSON válido:
{
  "caseTranscription": "Transcrição literal e completa de todas as palavras do caso clínico presentes na imagem/documento"
}`,
          userPrompt: `Leia a imagem/documento em anexo e transcreva o caso clínico integralmente com TODAS as palavras que estão lá, exatamente como escrito no original. Não resuma.`,
          fileAttachments: caseAttachments, // ONLY CASE FILES!
          maxOutputTokens: 16384,
          temperature: 0.1,
        });

        if (ocrRes?.caseTranscription && ocrRes.caseTranscription.trim().length > 30) {
          result.caseTranscription = ocrRes.caseTranscription.trim();
        } else if (ocrRes?.transcription && ocrRes.transcription.trim().length > 30) {
          result.caseTranscription = ocrRes.transcription.trim();
        }
      } catch (ocrErr) {
        console.error("Failed dedicated OCR transcription:", ocrErr);
      }
    }

    const finalCaseTranscription = (result.caseTranscription || initialTranscribedCase || "").trim();

    const parts: string[] = [];
    parts.push(`# ${result.title || "Resolução de Tutoria Clínica"}\n`);

    // 1. Transcrição integral do caso clínico original
    if (finalCaseTranscription) {
      parts.push(`## Caso Clínico\n\n${finalCaseTranscription}\n`);
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

    // 5. Questões de Aprendizagem (cada questão diretamente como título principal ##)
    if (result.learningQuestions && result.learningQuestions.length > 0) {
      for (let i = 0; i < result.learningQuestions.length; i++) {
        const lq = result.learningQuestions[i];
        const rawQ = (lq.question || "").trim();
        const cleanQ = rawQ
          .replace(/^(?:quest[aã]o|pergunta)?\s*\d+\s*[:.\-–)]*\s*/i, "")
          .trim();
        const finalQuestion = cleanQ || rawQ;
        lq.question = finalQuestion;
        lq.detailedAnswer = cleanLatexAndBadges(lq.detailedAnswer || "");
        parts.push(`## ${finalQuestion}\n\n${lq.detailedAnswer}\n`);
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
      caseTranscription: finalCaseTranscription,
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
