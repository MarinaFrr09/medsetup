import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { extractTextFromDocx, extractTextFromPptx, extractTextFromPdf } from "@/lib/document-parser";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let prompt = "";
    let subject = "";
    let totalCount = 10;
    let essayCount = 0;
    let hasTimer = true;
    let durationMinutes = 45;
    let difficulty = "all";

    // Histology tissue settings
    let includeHistology = false;
    let histologyMode: "ai" | "manual" = "ai";
    let aiHistologyCount = 2;
    let manualTissues: Array<{
      id: string;
      name: string;
      expectedAnswer?: string;
      microscopicFeatures?: string;
      imageUrl?: string;
      imagePreview?: string;
    }> = [];

    const rawFiles: Array<{ data: string; mimeType: string; name?: string }> = [];
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      prompt = (formData.get("prompt") as string) || "";
      subject = (formData.get("subject") as string) || "";
      totalCount = Number(formData.get("totalCount")) || 10;
      essayCount = Number(formData.get("essayCount")) || 0;
      hasTimer = formData.get("hasTimer") !== "false";
      durationMinutes = Number(formData.get("durationMinutes")) || 45;
      difficulty = (formData.get("difficulty") as string) || "all";

      includeHistology = formData.get("includeHistology") === "true";
      histologyMode = (formData.get("histologyMode") as "ai" | "manual") || "ai";
      aiHistologyCount = Math.min(3, Math.max(1, Number(formData.get("aiHistologyCount")) || 2));

      const manualTissuesRaw = formData.get("manualTissues") as string;
      if (manualTissuesRaw) {
        try {
          manualTissues = JSON.parse(manualTissuesRaw);
        } catch (e) {
          console.error("Error parsing manualTissues:", e);
        }
      }

      // Check for uploaded tissue image files
      const uploadsDir = join(process.cwd(), "public", "uploads", "histology");
      await mkdir(uploadsDir, { recursive: true });

      for (let i = 0; i < 3; i++) {
        const tissueFile = formData.get(`tissue_image_${i}`) as File | null;
        if (tissueFile && tissueFile.size > 0) {
          const arrayBuf = await tissueFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const safeName = (tissueFile.name || "lamina.png").replace(/[^a-zA-Z0-9.-]/g, "_");
          const fileName = `${Date.now()}_tissue_${i}_${safeName}`;
          await writeFile(join(uploadsDir, fileName), buffer);
          if (manualTissues[i]) {
            manualTissues[i].imageUrl = `/uploads/histology/${fileName}`;
          }
        }
      }

      // Base study files (PDFs, docs, etc.)
      const files = formData.getAll("files") as File[];
      for (const file of files) {
        if (!file || file.size === 0) continue;
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const ext = (file.name || "").toLowerCase().split(".").pop() || "";

        if (ext === "docx") {
          const text = extractTextFromDocx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: file.name,
            });
            continue;
          }
        }

        if (ext === "pptx") {
          const text = extractTextFromPptx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: file.name,
            });
            continue;
          }
        }

        if (ext === "pdf" || (file.type && file.type.includes("pdf"))) {
          try {
            const parsed = await extractTextFromPdf(buffer);
            if (parsed && parsed.text && parsed.text.trim().length > 80) {
              rawFiles.push({
                data: Buffer.from(parsed.text, "utf8").toString("base64"),
                mimeType: "text/plain",
                name: file.name,
              });
              continue;
            }
          } catch (e) {
            console.warn(`[Simulado PDF Fast-Text] fallback for ${file.name}:`, e);
          }
        }

        let mime = file.type || "application/pdf";
        if (ext === "pdf" || mime.includes("pdf")) mime = "application/pdf";
        else if (ext === "png") mime = "image/png";
        else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
        else if (ext === "txt") mime = "text/plain";

        rawFiles.push({
          data: buffer.toString("base64"),
          mimeType: mime,
          name: file.name,
        });
      }
    } else {
      const body = await request.json();
      prompt = body.prompt || "";
      subject = body.subject || "";
      totalCount = Number(body.totalCount) || 10;
      essayCount = Number(body.essayCount) || 0;
      hasTimer = body.hasTimer !== false;
      durationMinutes = Number(body.durationMinutes) || 45;
      difficulty = body.difficulty || "all";

      includeHistology = body.includeHistology === true;
      histologyMode = body.histologyMode || "ai";
      aiHistologyCount = Math.min(3, Math.max(1, Number(body.aiHistologyCount) || 2));

      if (Array.isArray(body.manualTissues)) {
        manualTissues = body.manualTissues;
        const uploadsDir = join(process.cwd(), "public", "uploads", "histology");
        await mkdir(uploadsDir, { recursive: true });

        for (let i = 0; i < manualTissues.length; i++) {
          const t = manualTissues[i];
          if (t.imagePreview && t.imagePreview.startsWith("data:image")) {
            const parts = t.imagePreview.split(";base64,");
            if (parts[1]) {
              const buffer = Buffer.from(parts[1], "base64");
              const fileName = `${Date.now()}_tissue_${i}.png`;
              await writeFile(join(uploadsDir, fileName), buffer);
              t.imageUrl = `/uploads/histology/${fileName}`;
            }
          }
        }
      }

      const incomingFiles: Array<any> = [];
      if (body.fileAttachments && Array.isArray(body.fileAttachments)) {
        incomingFiles.push(...body.fileAttachments);
      } else if (body.fileAttachment?.data) {
        incomingFiles.push(body.fileAttachment);
      } else if (body.attachment?.base64) {
        incomingFiles.push({
          data: body.attachment.base64,
          mimeType: body.attachment.mimeType || "application/pdf",
          name: body.attachment.name,
        });
      }

      for (const f of incomingFiles) {
        if (!f.data) continue;
        let cleanBase64 = f.data;
        if (cleanBase64.includes(";base64,")) {
          cleanBase64 = cleanBase64.split(";base64,")[1];
        }

        const ext = (f.name || "").toLowerCase().split(".").pop() || "";
        const buffer = Buffer.from(cleanBase64, "base64");

        if (ext === "docx") {
          const text = extractTextFromDocx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: f.name || "documento.docx",
            });
            continue;
          }
        }

        if (ext === "pptx") {
          const text = extractTextFromPptx(buffer);
          if (text) {
            rawFiles.push({
              data: Buffer.from(text, "utf8").toString("base64"),
              mimeType: "text/plain",
              name: f.name || "apresentacao.pptx",
            });
            continue;
          }
        }

        if (ext === "pdf" || (f.mimeType && f.mimeType.includes("pdf"))) {
          try {
            const parsed = await extractTextFromPdf(buffer);
            if (parsed && parsed.text && parsed.text.trim().length > 80) {
              rawFiles.push({
                data: Buffer.from(parsed.text, "utf8").toString("base64"),
                mimeType: "text/plain",
                name: f.name || "documento.pdf",
              });
              continue;
            }
          } catch (e) {
            console.warn(`[Simulado JSON PDF Fast-Text] fallback:`, e);
          }
        }

        let mime = f.mimeType || "application/pdf";
        if (ext === "pdf") mime = "application/pdf";
        else if (ext === "png") mime = "image/png";
        else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
        else if (ext === "txt") mime = "text/plain";

        rawFiles.push({
          data: cleanBase64,
          mimeType: mime,
          name: f.name || "arquivo.pdf",
        });
      }
    }

    const hasFiles = rawFiles.length > 0;
    const finalPrompt = prompt?.trim()
      ? prompt.trim()
      : hasFiles
      ? "Simulado acadêmico completo e rigoroso formulado estritamente com base nos documentos e materiais de estudo anexados."
      : "";

    if (!finalPrompt && !hasFiles) {
      return NextResponse.json(
        { error: "Tema ou documentos de base do simulado são obrigatórios." },
        { status: 400 }
      );
    }

    const total = Math.min(Math.max(1, Number(totalCount) || 10), 50);
    const numEssays = Math.min(Math.max(0, Number(essayCount) || 0), total);
    const numMultipleChoice = total - numEssays;

    const diffInstruction =
      difficulty === "easy"
        ? "Nível da prova: Fácil / Introdutório (conceitos basilares e definições essenciais)."
        : difficulty === "hard"
        ? "Nível da prova: Difícil / Alta complexidade médica (casos clínicos complexos, pegadinhas, raciocínio diferencial e diretrizes atualizadas)."
        : difficulty === "medium"
        ? "Nível da prova: Médio / Padrão universitário regular de medicina."
        : "Nível da prova: Misto / Equilibrado (distribua questões fáceis, médias e difíceis com proporção universitária real).";

    const fileListInstruction = hasFiles
      ? `\n\n═══════════════════════════════════════════════════════════════════════════════
DISTRIBUIÇÃO OBRIGATÓRIA ENTRE OS ${rawFiles.length} DOCUMENTOS/PDFs ANEXADOS:
${rawFiles.map((f, i) => `${i + 1}. Documento: "${f.name || `Arquivo ${i + 1}`}"`).join("\n")}

DIRETRIZES FUNDAMENTAIS PARA MULTI-DOCUMENTOS:
1. ABRANGÊNCIA TOTAL: Você DEVE formular questões que contemplem TODOS os ${rawFiles.length} documentos anexados, sem excluir nenhum!
2. PROPORÇÃO E FOCO ESSENCIAL:
   - Se houver questões suficientes, distribua-as de maneira equilibrada e proporcional entre todos os arquivos.
   - Se houver muitos documentos para poucas questões (ex: 5 ou 10 questões para vários PDFs), extraia obrigatoriamente o tópico MAIS IMPORTANTE, basilar e indispensável de CADA documento.
3. EMBASAMENTO REAL: Enunciados, alternativas, gabaritos e justificativas devem ser fundamentados com precisão nos conceitos, termos técnicos e dados contidos nesses materiais.
4. INTERCALAÇÃO E ORDEM ALEATÓRIA: Não coloque as questões em blocos sequenciais por documento. Misture os temas e assuntos de forma dinâmica e interdisciplinar.
═══════════════════════════════════════════════════════════════════════════════`
      : "";

    // Build Histology Instruction
    let histologyInstruction = "";
    if (includeHistology) {
      if (histologyMode === "manual" && manualTissues.length > 0) {
        const validManual = manualTissues.filter((t) => t.name.trim());
        if (validManual.length > 0) {
          histologyInstruction = `\n\n═══════════════════════════════════════════════════════════════════════════════
QUESTÕES OBRIGATÓRIAS DE ANÁLISE DE TECIDOS HISTOLÓGICOS (LÂMINAS / BIÓPSIAS):
O simulado DEVE conter exatamente ${validManual.length} questão(ões) de identificação e análise de lâminas microscópicas baseadas estritamente nos tecidos indicados pelo estudante:
${validManual
  .map(
    (t, idx) => `
Tecido ${idx + 1}:
- Tecido / Biópsia: "${t.name}"
- Resposta Correta / Gabarito Obrigatório: "${t.expectedAnswer || t.name}"
- Características microscópicas a cobrar: "${t.microscopicFeatures || "identificação diagnóstica, padrões celulares e arquitetura tecidual"}"
- Estrutura da Questão: Enunciado clássico de exame médico: 'Um fragmento de biópsia [tecido/órgão] demonstra [descrição microscópica detalhada: citoplasma, pleomorfismo, atipias, coloração H&E]. Qual é o diagnóstico histológico mais provável?'
- A alternativa correta DEVE ser a opção com "${t.expectedAnswer || t.name}".
- Forneça 3 distratores plausíveis com diagnósticos histológicos diferenciais.
- No objeto JSON desta questão, preencha:
  * "histologyTissue": "${t.name}"
  ${t.imageUrl ? `* "imageUrl": "${t.imageUrl}"` : ""}
  * "imageCaption": "Lâmina histológica: corte microscópico corado com Hematoxilina e Eosina (H&E)."
`
  )
  .join("\n")}
═══════════════════════════════════════════════════════════════════════════════`;
        }
      } else {
        // AI Mode
        histologyInstruction = `\n\n═══════════════════════════════════════════════════════════════════════════════
QUESTÕES OBRIGATÓRIAS DE ANÁLISE DE TECIDOS HISTOLÓGICOS (1 a 3 LÂMINAS NA PROVA):
Como padrão obrigatório da banca médica, a prova DEVE conter exatamente ${aiHistologyCount} questão(ões) de análise microscópica/histopatológica direta de tecidos ou biópsias (ex: Carcinoma Escamoso com pérolas córneas e pontes intercelulares, Carcinoma Basocelular com ninhos e paliçada periférica, Adenocarcinoma com formação glandular atípica e estratificação, Melanoma com proliferação atípica, etc.):
1. Cada questão de tecido histológico deve seguir o modelo real da prova médica:
   - Enunciado clássico: 'Um fragmento de biópsia [órgão/tecido] demonstra [descrição microscópica rica de células, citoplasma eosinofílico/basofílico, núcleos hipercromáticos, pleomorfismo, arquitetura tecidual e coloração H&E]. Qual é o diagnóstico histológico mais provável?'
   - 4 alternativas com diagnósticos histopatológicos diferenciais consistentes.
   - No objeto JSON da questão, inclua obrigatoriamente:
     * "histologyTissue": nome do tecido (ex: 'Biópsia Pulmonar - Carcinoma Escamoso', 'Biópsia de Pele - Carcinoma Basocelular', 'Biópsia de Cólon - Adenocarcinoma')
     * "imageUrl": use as lâminas médicas disponíveis:
       - Se for Carcinoma Escamoso / pulmão / pérolas córneas: "/uploads/histology/carcinoma_escamoso_pulmao.png"
       - Se for Carcinoma Basocelular / pele / paliçada periférica / fendas: "/uploads/histology/carcinoma_basocelular_pele.png"
       - Se for Adenocarcinoma / cólon / glândulas atípicas: "/uploads/histology/adenocarcinoma_colon.png"
     * "imageCaption": legenda descritiva dos achados microscópicos patológicos da lâmina.
═══════════════════════════════════════════════════════════════════════════════`;
      }
    }

    const MEDICAL_EXAM_STYLE_GUIDELINES = `
DIRETRIZES DE ESTILO DE PROVA MÉDICA DO ALUNO (ESTRITAMENTE OBRIGATÓRIO):
O estilo e a redação das questões devem espelhar com perfeição as provas reais da faculdade de medicina (baseadas em casos clínicos, patologia e PBL):
1. CASOS CLÍNICOS E PLANO ASSISTENCIAL:
   - Vinhetas clínicas estruturadas: idade do paciente, diagnóstico prévio e estadiamento (ex: 'Homem de 72 anos com carcinoma pulmonar de não pequenas células metastático...'), histórico de evolução nas últimas semanas (dispneia aos esforços, perda de peso, capacidade funcional para atividades diárias), dados objetivos e preferências do paciente/família.
   - Perguntas de tomada de decisão: 'Considerando a condição clínica, as preferências do paciente e a participação de seus familiares, qual é o plano assistencial mais apropriado neste momento?'
2. HISTOPATOLOGIA E MORFOLOGIA DIAGNÓSTICA:
   - Descrições microscópicas precisas: ninhos e blocos de células basaloides invadindo a derme, núcleos hipercromáticos, citoplasma escasso, 'paliçada periférica', fendas de retração entre o tumor e o estroma; células tumorais poligonais com citoplasma eosinofílico, pleomorfismo, presença de queratinização (pérolas córneas) e pontes intercelulares.
3. IMUNO-HISTOQUÍMICA E MEDICINA LABORATORIAL:
   - Correlações reais de imunofenotipagem para diagnóstico diferencial (ex: Positividade para Ber-EP4 e negatividade para CK5/6 diferenciando linhagem basaloide de escamosa; marcadores S-100, HMB-45, Melan-A para linhagem melanocítica; p63, p53, Ki-67).
4. BIOLOGIA MOLECULAR E ONCOGENÉTICA:
   - Mecanismos de carcinogênese e vias de proliferação celular: mutações de ganho de função em proto-oncogenes (ex: BRAF V600E em melanoma levando à hiperatividade proliferativa, KRAS, EGFR) versus genes supressores de tumor (TP53, RB1).
5. PADRÃO DAS ALTERNATIVAS (RANDOMIZADAS E NÃO ÓBVIAS):
   - 4 alternativas (A, B, C, D) mutualmente exclusivas, com apenas UMA alternativa correta.
   - VARIAÇÃO NATURAL E SEM PADRÃO FIXO: Evite o vício de fazer a resposta correta ser sempre a mais longa. Varie naturalmente a extensão entre as alternativas (ora mais concisas, ora mais elaboradas, sem denunciar a correta).
   - DISTRATORES SOFISTICADOS E NÃO ÓBVIOS: Os distratores devem ser diagnósticos diferenciais reais, condutas plausíveis ou mecanismos verossímeis, compartilhando terminologia médica autêntica. NUNCA utilize distratores simplistas ou fáceis de eliminar.
   - NUNCA inclua textos ou notas de 'resposta esperada' de professor nas alternativas ou enunciados.
`;

    const getSystemPrompt = (reqTotal: number, reqEssays: number, batchInfo?: string) => {
      const reqMC = reqTotal - reqEssays;
      return `Você é um professor titular e coordenador de bancas examinadoras de faculdade de excelência (Medicina e Saúde).
Sua missão é formular uma PROVA/SIMULADO ACADÊMICO RIGOROSO, MUITO BEM ELABORADO E PROFISSIONAL sobre o tema ou documentos solicitados.
${MEDICAL_EXAM_STYLE_GUIDELINES}
${
  hasFiles
    ? `ATENÇÃO CRUCIAL E OBRIGATÓRIA: Foram anexados ${rawFiles.length} documento(s)/PDF(s) como MATERIAL DE ESTUDO BASE. Todas as ${reqTotal} questões (múltipla escolha e dissertativas), gabaritos e espelhos de correção DEVEM ser criadas com base direta, rigorosa e aprofundada nas informações, teorias, dados e ensinamentos contidos nos documentos anexados.${fileListInstruction}`
    : ""
}
${histologyInstruction}

A prova terá exatamente ${reqTotal} questões ${batchInfo ? `(${batchInfo})` : ""}:
${reqMC > 0 ? `- ${reqMC} questões de MÚLTIPLA ESCOLHA com 4 alternativas (A, B, C e D). Cada alternativa deve ser realista, bem formulada, plausível e com distratores inteligentes.` : ""}
${reqEssays > 0 ? `- ${reqEssays} questões DISSERTATIVAS contextualizadas (estudo de caso, situação-problema ou análise técnica aprofundada), contendo no campo 'answer' o espelho de correção oficial completo com os critérios e pontos conceituais esperados.` : ""}

${diffInstruction}

O título da prova DEVE seguir o padrão universitário: "Simulado — [Tema da Prova ou Disciplina]".

REGRAS OBRIGATÓRIAS DE JSON:
1. NUNCA insira quebras de linha literais dentro de strings JSON (use \\n se precisar quebrar linha).
2. NUNCA use aspas duplas dentro dos textos de perguntas, enunciados ou justificativas (use aspas simples 'exemplo').
3. O JSON retornado deve ser estritamente válido e completo.

Responda OBRIGATORIAMENTE em JSON válido com esta estrutura:
{
  "title": "Simulado — Nome Completo da Matéria ou Tema",
  "subject": "${subject || "Medicina"}",
  "totalQuestions": ${reqTotal},
  "essayCount": ${reqEssays},
  "durationMinutes": ${durationMinutes},
  "hasTimer": ${hasTimer},
  "questions": [
    {
      "id": "q-1",
      "number": 1,
      "type": "multiple_choice",
      "text": "Enunciado rico, bem contextualizado e articulado da questão...",
      "options": [
        { "id": "a", "text": "Texto elaborado e plausível da alternativa A..." },
        { "id": "b", "text": "Texto elaborado e plausível da alternativa B..." },
        { "id": "c", "text": "Texto elaborado e plausível da alternativa C..." },
        { "id": "d", "text": "Texto elaborado e plausível da alternativa D..." }
      ],
      "answer": "c",
      "explanation": "Fundamentação teórica detalhada explicando o gabarito e os distratores.",
      "histologyTissue": "Nome do tecido se for questão de lâmina histológica",
      "imageUrl": "/uploads/histology/... se for questão de lâmina",
      "imageCaption": "Legenda descritiva da lâmina histológica"
    }
  ]
}`;
    };

    // Helper to safely normalize and parse raw questions from AI
    const extractQuestionsFromAI = (aiResult: any): any[] => {
      if (!aiResult) return [];

      const rawQuestions =
        aiResult.questions ||
        aiResult.questoes ||
        aiResult.questões ||
        aiResult.perguntas ||
        aiResult.itens ||
        aiResult.items ||
        aiResult.simulado?.questions ||
        aiResult.simulado?.questoes ||
        aiResult.exam?.questions ||
        aiResult.prova?.questoes ||
        aiResult.data?.questions ||
        (Array.isArray(aiResult) ? aiResult : null);

      if (!rawQuestions) return [];

      const list = Array.isArray(rawQuestions)
        ? rawQuestions
        : typeof rawQuestions === "object"
        ? Object.values(rawQuestions)
        : [];

      return list.map((q: any, idx: number) => {
        const isEssay =
          q.type === "essay" ||
          q.tipo === "dissertativa" ||
          q.type === "dissertativa" ||
          (!q.options && !q.alternativas && q.answer && q.answer.length > 20);

        // Normalize options
        let normalizedOptions: Array<{ id: string; text: string }> = [];
        if (!isEssay) {
          const rawOptions = q.options || q.alternativas || q.choices || q.respostas;
          if (Array.isArray(rawOptions)) {
            normalizedOptions = rawOptions.map((opt: any, oIdx: number) => {
              const defaultLetter = ["a", "b", "c", "d", "e"][oIdx] || `opt-${oIdx}`;
              if (typeof opt === "string") {
                return { id: defaultLetter, text: opt };
              }
              const optId = String(opt.id || opt.letra || defaultLetter).toLowerCase().trim();
              return {
                id: optId.replace(/[^a-e]/g, "") || defaultLetter,
                text: opt.text || opt.texto || opt.descricao || String(opt),
              };
            });
          } else if (typeof rawOptions === "object" && rawOptions !== null) {
            normalizedOptions = Object.entries(rawOptions).map(([key, val], oIdx) => {
              const defaultLetter = ["a", "b", "c", "d", "e"][oIdx] || `opt-${oIdx}`;
              const optId = key.toLowerCase().replace(/[^a-e]/g, "") || defaultLetter;
              return {
                id: optId,
                text: typeof val === "string" ? val : (val as any)?.text || String(val),
              };
            });
          }
        }

        // Normalize answer
        const rawAns =
          q.answer ||
          q.gabarito ||
          q.resposta ||
          q.correctAnswer ||
          q.resposta_correta ||
          q.correct_option ||
          "a";

        let finalAnswer = "a";
        if (isEssay) {
          finalAnswer = String(rawAns);
        } else {
          const ansStr = String(rawAns).trim();
          const match = ansStr.match(/^([a-eA-E])(?:\)|\.|\s|$)/) || ansStr.match(/\b([a-eA-E])\b/);
          finalAnswer = match ? match[1].toLowerCase() : ansStr.slice(0, 1).toLowerCase() || "a";

          // Shuffle multiple-choice options to prevent positional bias and distribute gabarito evenly
          if (normalizedOptions.length >= 2) {
            let correctIdx = normalizedOptions.findIndex((o) => o.id === finalAnswer);
            if (correctIdx === -1) {
              correctIdx = normalizedOptions.findIndex((o) => o.text.toLowerCase() === ansStr.toLowerCase());
            }
            if (correctIdx === -1) correctIdx = 0;

            const tagged = normalizedOptions.map((o, idx) => ({ ...o, _isCorrect: idx === correctIdx }));
            for (let i = tagged.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
            }

            const letters = ["a", "b", "c", "d", "e"];
            normalizedOptions = tagged.map((o, idx) => {
              const letter = letters[idx] || String.fromCharCode(97 + idx);
              if (o._isCorrect) finalAnswer = letter;
              return { id: letter, text: o.text };
            });
          }
        }

        // Histology slide detection and image assignment
        let imgUrl = q.imageUrl || q.image_url || q.imagem || q.image || undefined;
        let imgCaption = q.imageCaption || q.image_caption || q.legenda || undefined;
        const tissueName = q.histologyTissue || q.histology_tissue || q.tecido || undefined;

        const statementText = String(q.text || q.question || q.enunciado || "");
        const isHistology =
          Boolean(tissueName) ||
          statementText.toLowerCase().includes("biópsia") ||
          statementText.toLowerCase().includes("lâmina") ||
          statementText.toLowerCase().includes("histológico") ||
          statementText.toLowerCase().includes("histopatológico") ||
          statementText.toLowerCase().includes("pérolas córneas") ||
          statementText.toLowerCase().includes("paliçada periférica");

        if (isHistology && !imgUrl) {
          const lower = statementText.toLowerCase() + " " + String(tissueName || "").toLowerCase();
          if (lower.includes("escamoso") || lower.includes("pérola") || lower.includes("pulmão") || lower.includes("queratin")) {
            imgUrl = "/uploads/histology/carcinoma_escamoso_pulmao.png";
            imgCaption = imgCaption || "Lâmina histológica: fragmento de biópsia com diferenciação escamosa, pérola córnea e pontes intercelulares (H&E).";
          } else if (lower.includes("basocelular") || lower.includes("paliçada") || lower.includes("pele") || lower.includes("fenda")) {
            imgUrl = "/uploads/histology/carcinoma_basocelular_pele.png";
            imgCaption = imgCaption || "Lâmina histológica: ninhos de células basaloides com arranjo em paliçada periférica e fenda de retração (H&E).";
          } else if (lower.includes("adenocarcinoma") || lower.includes("glândul") || lower.includes("cólon")) {
            imgUrl = "/uploads/histology/adenocarcinoma_colon.png";
            imgCaption = imgCaption || "Lâmina histológica: proliferação com arranjo glandular atípico, estratificação nuclear e pleomorfismo (H&E).";
          } else {
            imgUrl = "/uploads/histology/carcinoma_escamoso_pulmao.png";
            imgCaption = imgCaption || "Lâmina histológica do fragmento de biópsia para análise microscópica (H&E).";
          }
        }

        return {
          id: q.id || `q-${idx + 1}-${Date.now()}`,
          number: idx + 1,
          type: isEssay ? "essay" : "multiple_choice",
          text: q.text || q.question || q.enunciado || q.pergunta || q.texto || `Questão ${idx + 1}`,
          options: isEssay ? [] : normalizedOptions,
          answer: finalAnswer,
          explanation:
            q.explanation ||
            q.justificativa ||
            q.explicacao ||
            q.comentario ||
            q.resolucao ||
            "Fundamentação baseada nos conceitos e diretrizes acadêmicas.",
          imageUrl: imgUrl,
          imageCaption: imgCaption,
          histologyTissue: tissueName,
        };
      });
    };

    // Fisher-Yates shuffle helper
    const shuffleArray = <T>(array: T[]): T[] => {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    let allQuestions: any[] = [];
    let generatedTitle = "";

    const userPromptText = hasFiles
      ? prompt?.trim()
        ? `INSTRUÇÕES / DIRECIONAMENTO DO USUÁRIO: "${prompt.trim()}".\nSua missão: Formule a prova acadêmica com exatamente ${total} questões (${numMultipleChoice} múltipla escolha e ${numEssays} dissertativas) seguindo fielmente essa instrução do usuário e fundamentando todas as questões nos ${rawFiles.length} documentos anexados.`
        : `Formule uma prova acadêmica completa de ${total} questões (${numMultipleChoice} múltipla escolha e ${numEssays} dissertativas) cobrindo proporcionalmente todos os ${rawFiles.length} documentos anexados.`
      : `Crie a prova acadêmica com exatamente ${total} questões (${numMultipleChoice} múltipla escolha e ${numEssays} dissertativas) sobre: "${finalPrompt}". ${subject ? `Disciplina: ${subject}.` : ""}`;

    if (total <= 20) {
      const res = await generateJSONFromAI({
        systemPrompt: getSystemPrompt(total, numEssays),
        userPrompt: userPromptText,
        fileAttachments: rawFiles,
      });

      allQuestions = extractQuestionsFromAI(res);
      if (res?.title) generatedTitle = res.title;
    } else {
      const half1 = Math.ceil(total / 2);
      const half2 = Math.floor(total / 2);
      const essays1 = Math.min(numEssays, half1);
      const essays2 = Math.max(0, numEssays - essays1);

      const [res1, res2] = await Promise.all([
        generateJSONFromAI({
          systemPrompt: getSystemPrompt(half1, essays1, `Parte 1 de 2: ${half1} questões`),
          userPrompt: `${userPromptText} (Parte 1 de 2: ${half1} questões). Cubra proporcionalmente os materiais anexados.`,
          fileAttachments: rawFiles,
        }),
        generateJSONFromAI({
          systemPrompt: getSystemPrompt(half2, essays2, `Parte 2 de 2: ${half2} questões`),
          userPrompt: `${userPromptText} (Parte 2 de 2: ${half2} questões complementares sem repetir a Parte 1). Cubra proporcionalmente os materiais anexados.`,
          fileAttachments: rawFiles,
        }),
      ]);

      const q1 = extractQuestionsFromAI(res1);
      const q2 = extractQuestionsFromAI(res2);
      allQuestions = [...q1, ...q2];
      generatedTitle = res1?.title || res2?.title || "";
    }

    if (allQuestions.length === 0) {
      throw new Error("A IA não conseguiu estruturar as questões do simulado. Tente refinar o tema ou selecionar materiais com texto legível.");
    }

    // Attach manual tissue images to questions if available
    if (includeHistology && histologyMode === "manual" && manualTissues.length > 0) {
      const tissuesWithImg = manualTissues.filter((t) => t.imageUrl);
      tissuesWithImg.forEach((t, i) => {
        const matchingQ = allQuestions.find(
          (q) =>
            q.histologyTissue?.toLowerCase().includes(t.name.toLowerCase()) ||
            q.text?.toLowerCase().includes(t.name.toLowerCase())
        ) || allQuestions[i];

        if (matchingQ && !matchingQ.imageUrl) {
          matchingQ.imageUrl = t.imageUrl;
          matchingQ.imageCaption = `Lâmina histológica: ${t.name} (H&E).`;
        }
      });
    }

    // Shuffle questions thoroughly for randomized order as requested by user
    const shuffledQuestions = shuffleArray(allQuestions);

    // Renumber sequentially 1..N
    const formattedQuestions = shuffledQuestions.map((q, idx) => ({
      ...q,
      number: idx + 1,
    }));

    const finalTitle =
      generatedTitle && !generatedTitle.toLowerCase().includes("faça tal")
        ? generatedTitle
        : subject?.trim()
        ? `Simulado — ${subject.trim()}`
        : hasFiles
        ? `Simulado — Avaliação de Materiais (${rawFiles.length} PDFs)`
        : `Simulado — ${finalPrompt.slice(0, 45)}`;

    const responseSimulado = {
      id: Date.now().toString(),
      title: finalTitle,
      subject: subject || "Medicina",
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      durationMinutes: Number(durationMinutes) || 45,
      hasTimer: Boolean(hasTimer),
      timeSpentSeconds: 0,
      status: "in_progress",
      totalQuestions: formattedQuestions.length,
      essayCount: formattedQuestions.filter((q: any) => q.type === "essay").length,
      questions: formattedQuestions,
    };

    return NextResponse.json(responseSimulado);
  } catch (error: any) {
    console.error("Generate Simulado Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar simulado com IA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
