import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { extractTextFromDocx, extractTextFromPptx } from "@/lib/document-parser";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

type Attachment = { data: string; mimeType: string; name: string };

/** Converte um File em anexo compatível com o Gemini (PDF nativo, DOCX/PPTX → texto, imagens, TXT). */
async function toAttachment(file: File, namePrefix = ""): Promise<Attachment | null> {
  if (!file || file.size === 0) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.name || "").toLowerCase().split(".").pop() || "";
  const name = `${namePrefix}${file.name || "documento"}`;

  if (ext === "docx") {
    const text = extractTextFromDocx(buffer);
    if (text) return { data: Buffer.from(text, "utf8").toString("base64"), mimeType: "text/plain", name };
  }
  if (ext === "pptx") {
    const text = extractTextFromPptx(buffer);
    if (text) return { data: Buffer.from(text, "utf8").toString("base64"), mimeType: "text/plain", name };
  }
  if (ext === "pdf" || file.type === "application/pdf") {
    return { data: buffer.toString("base64"), mimeType: "application/pdf", name };
  }
  if (ext === "png") return { data: buffer.toString("base64"), mimeType: "image/png", name };
  if (ext === "jpg" || ext === "jpeg") return { data: buffer.toString("base64"), mimeType: "image/jpeg", name };
  if (ext === "webp") return { data: buffer.toString("base64"), mimeType: "image/webp", name };
  if (ext === "txt" || ext === "md" || ext === "rtf" || file.type.startsWith("text/")) {
    return { data: buffer.toString("base64"), mimeType: "text/plain", name };
  }
  return { data: buffer.toString("base64"), mimeType: file.type || "application/pdf", name };
}

const SYSTEM_PROMPT = (hasTutoria: boolean) => `Você é um professor titular de Morfologia (Histologia, Anatomia e Patologia) e de Clínica Médica, com larga experiência em metodologias ativas (PBL / Ateliê / Tutoria) em cursos de Medicina e Saúde.

CONTEXTO: no componente curricular "Ateliê", o estudante recebe um ROTEIRO de uma SP (Situação-Problema). O roteiro costuma conter: objetivos de aprendizagem, perguntas de morfologia, pedidos para localizar/descrever tecidos histológicos e estruturas anatômicas, casos clínicos, exames (laudos, biomarcadores, colorações) e a correlação de tudo isso.

SUA MISSÃO: ler o(s) documento(s) do ROTEIRO da SP e produzir a RESOLUÇÃO COMPLETA E ESTRUTURADA, pronta para estudo e entrega, em JSON.

REGRAS DE CONTEÚDO (obrigatórias):
1. OBJETIVOS (LISTAGEM DE 100% DOS OBJETIVOS DO ROTEIRO - ZERO CORTES):
   - Liste TODOS os objetivos de aprendizagem da SP de forma direta e concisa. É expressamente proibido cortar ou parar antes do fim da lista do documento!
   - Se o roteiro contiver 7 ou mais objetivos (ex.: 6. Reconhecer os sinais de gravidade associados ao SUA, como hipotensão, taquicardia e anemia; 7. Compreender a importância do acompanhamento multiprofissional e da continuidade do cuidado às pacientes com SUA), VOCÊ DEVE LISTAR E RESOLVER CADA UM DELES (do 1º ao 7º) no array "objectives"!
   - REGRA CRÍTICA E ABSOLUTA: NUNCA use 'o aluno deve', 'o aluno precisa', 'o estudante deve', 'o participante deve' ou 'espera-se que o aluno'. Inicie SEMPRE e DIRETAMENTE com verbos no infinitivo (ex.: 'Listar e descrever...', 'Identificar os tecidos...', 'Reconhecer os sinais de gravidade...', 'Compreender a importância do cuidado multiprofissional...'). Em "detail", forneça a fundamentação técnica também de forma direta e sem jargões sobre o estudante.
2. PERGUNTAS E ATIVIDADES DO ROTEIRO (COPIAR INTEGRALMENTE TODAS AS PERGUNTAS E COMANDOS PRÁTICOS):
   - O roteiro de Ateliê contém PERGUNTAS, COMANDOS DE IDENTIFICAÇÃO E ATIVIDADES PRÁTICAS (ex.: 'Identificar detalhadamente útero, tubas e ovários, descrevendo formato e eixos uterinos (anteversão/anteflexão)', 'Localizar as lâminas histológicas...', 'Descrever a vascularização da pelve...', etc.).
   - VOCÊ DEVE OBRIGATORIAMENTE COPIAR E RESOLVER TODAS AS PERGUNTAS E ATIVIDADES DO ROTEIRO, do início ao fim! É expressamente proibido omitir ou excluir qualquer atividade ou pedido de identificação do roteiro.
   - NÃO prefixe artificialmente com 'Pergunta 1', 'Pergunta 2', 'Atividade 1'. Apenas reescreva o comando ou pergunta exatamente como está no roteiro original.
   - Responda cada atividade ou pergunta de forma aprofundada, com máxima riqueza de detalhes, embasamento morfológico e clínico.
   - LISTA DE CARACTERÍSTICAS: Quando a questão/atividade pedir para descrever características (ex.: eixos de anteversão/anteflexão, formato do útero, tubas uterinas, ovários, camadas histológicas, etc.), NUNCA jogue um bloco de texto corrido chapado. USE SUBTÓPICOS DETALHADOS E ESTRUTURADOS (com títulos em negrito e detalhamento técnico de cada elemento).
   - TEMA OBRIGATÓRIO: para CADA pergunta/atividade preencha "theme" com uma breve explicação (2 a 4 linhas) do assunto/conceito central abordado antes de partir para a próxima.
3. HISTOLOGIA E LÂMINAS: se o roteiro pede para identificar/procurar/descrever tecidos, células, lâminas ou estruturas histológicas, crie UMA entrada por item pedido em "histology": o que o roteiro pede, a descrição microscópica real (tipos celulares, arquitetura, camadas, matriz, localização), características-chave que permitem identificar a lâmina, coloração/técnica usual (H&E, PAS, tricrômico, imuno-histoquímica etc.) e a relevância clínica/patológica para a SP. Não invente itens que o roteiro não pediu, mas inclua os que são indispensáveis para os objetivos.
4. ANATOMIA: idem para estruturas anatômicas em "anatomy": descrição, relações/vascularização/inervação quando relevante, e relevância clínica.
5. CASO CLÍNICO DO ROTEIRO (SEMPRE EXISTE NO ROTEIRO - COPIAR CASO, COPIAR PERGUNTAS E RESOLVER TABELAS):
   - O roteiro da SP SEMPRE contém um Caso Clínico ou Situação Prática. Você DEVE:
     a) "title": Nome clínico limpo do caso (ex.: 'Sangramento Uterino Anormal Agudo'). REGRA ABSOLUTA: NUNCA inclua números de subitem, números de atividade nem nomes de coordenador/relator no título (ex.: NUNCA use '2.4 - Quando o fluxo sai do controle. Coordenadora: Paula. Relatora: Maria Clara.'). Remova '2.4 - ', 'Atividade 2.4 - ' e deixe apenas o nome limpo do caso.
     b) "caseTranscription": Transcrição literal e completa APENAS E EXCLUSIVAMENTE do texto do caso clínico, formatando os dados clínicos com destaque em **negrito** (ex.: **Idade**, **Queixa Principal**, **História Clínica**, **Sinais Vitais**, **Exames: Hb 10,8 g/dL, hCG negativo, FSH...**). REGRA OBRIGATÓRIA: NÃO COLOQUE cabeçalhos de atividade, nem números de subseção (ex.: '2.4 - '), nem nomes de coordenador(a), relator(a), secretário(a), subgrupo ou data dentro do texto do caso clínico! Deixe APENAS o texto puramente clínico do caso!
     c) "answers": Copiar EXATAMENTE todas as perguntas do caso clínico presentes no roteiro e a PERGUNTA CENTRAL DO CASO. Para cada uma:
        - "question": Reescreva com clareza a pergunta central ou a questão específica do caso clínico exatamente como no roteiro.
        - "theme": Breve explicação (2 a 4 linhas) do assunto abordado.
        - "answer": Resposta aprofundada, explicando com riqueza de detalhes o raciocínio fisiopatológico, diagnóstico e terapêutico.
     d) "resolvedTable": Se em qualquer parte do caso clínico ou do roteiro houver uma tabela para preencher, completar ou pedir para fazer ligações / associações / correspondências entre colunas, VOCÊ DEVE OBRIGATORIAMENTE GERAR A TABELA RESOLVIDA EM MARKDOWN com todas as colunas preenchidas e correspondências solucionadas conforme o roteiro solicita! TABELAS E QUADROS DEVEM SER COMPLETOS: NUNCA corte palavras nem deixe frases incompletas no meio de uma célula. Preencha cada célula com a descrição completa, explicativa e fundamentada, sem reticências (...) truncadas.
     f) "diagnosticReasoning": Apresentar o raciocínio diagnóstico integrado passo a passo.
     g) "differentials": Diagnósticos diferenciais fundamentados.
     h) "management": Conduta médica, propedêutica e terapêutica completa.
6. EXAMES: para cada exame citado no roteiro, explique o exame de forma resumida e útil em "exams". Se houver biomarcadores/marcadores/colorações (ex.: Melan-A, S100, HMB-45, Ki-67, CD20, p53, PAS, Ziehl-Neelsen), liste cada um em "markers" explicando O QUE É, o que detecta, em que células/estruturas aparece e qual o SIGNIFICADO do resultado (positivo/negativo). Em "interpretation" interprete os achados do documento e em "correlation" correlacione o exame com o caso clínico/morfologia da SP sempre que houver nexo.
7. INTEGRAÇÃO: em "correlations", integre morfologia, fisiopatologia, clínica e exames (3 a 6 blocos), explicando como os achados histológicos explicam os sintomas, sinais e resultados dos exames.
8. RESUMO TEÓRICO COMPLETO (detailedSummary): crie uma síntese acadêmica profunda e completa sobre todo o tema central da SP. NUNCA faça tudo em forma de texto corrido chapado! Use uma ampla variedade de ferramentas didáticas: texto explicativo contextual aprofundado, tópicos e subtópicos claros e hierárquicos. Quando precisar listar características, componentes, camadas ou estruturas, USE SUBTÓPICOS E DETALHE essas características minuciosamente com negrito e profundidade (não faça listas rasas de 1 linha). Use etapas numeradas para processos e sequências temporais/fisiológicas. NÃO inclua pontos-chave dentro dos subtópicos.
9. PONTOS-CHAVE: 6 a 10 itens objetivos para revisão. GLOSSÁRIO: termos técnicos importantes com definição curta (até 12).
10. FIDELIDADE: baseie-se PRIMEIRO no conteúdo do documento. Complete com conhecimento acadêmico consagrado (Junqueira & Carneiro, Gartner, Ross, Robbins, Moore, Netter, Guyton) apenas para fundamentar. Se algo não puder ser respondido com segurança, diga isso explicitamente na resposta em vez de inventar.
11. Se o roteiro não contiver uma seção (ex.: sem anatomia), devolva a lista correspondente VAZIA ([]). Nunca preencha seções com conteúdo genérico fora do que o documento pede.
${
  hasTutoria
    ? `
12. CASO DA TUTORIA (INFORMADO PELO ALUNO): o aluno forneceu o caso clínico da tutoria. Você deve:
   - Resolver o Ateliê à luz desse caso: sempre que houver nexo, as respostas, os casos clínicos, os exames e as correlações devem ser contextualizados com o caso da tutoria (use expressões como "No caso da tutoria, ...").
   - Preencher o objeto "tutoria" com: "caseSummary" (resumo fiel do caso da tutoria em 3-6 linhas), "resolution" (resolução integrada: como o conteúdo morfológico do Ateliê explica o quadro clínico, a fisiopatologia e a evolução do caso) e "links" (4 a 8 correlações pontuais, cada uma com "atelie" = achado/conceito do Ateliê, "tutoria" = elemento correspondente do caso da tutoria e "explanation" = por que se relacionam).`
    : `
12. Não há caso de tutoria nesta análise: devolva "tutoria": null.`
}

REGRAS DE ESTILO E JSON (obrigatórias):
- Idioma: português do Brasil, linguagem acadêmica clara e objetiva. Sem introduções do tipo "Este documento aborda...".
- NUNCA use frases com "o aluno deve" ou "o aluno precisa". Use verbos no infinitivo ("Listar...", "Identificar...", "Explicar...").
- Seja completo, porém eficiente: respostas ricas sem enrolação.
- NUNCA use aspas duplas dentro dos textos (use aspas simples 'assim'). NUNCA use quebras de linha literais dentro de strings (use \\n se precisar).
- Pode usar **negrito** pontualmente, mas não use listas markdown nem cabeçalhos (#) dentro das respostas comuns.
- O JSON deve ser ESTRITAMENTE VÁLIDO e COMPLETO.

ESTRUTURA EXATA DO JSON:
{
  "title": "Título curto e informativo da SP (ex.: 'SP 2 — Neoplasias Melanocíticas da Pele')",
  "theme": "Tema central da SP em uma frase",
  "summary": "Visão geral objetiva do que a SP aborda e das competências a desenvolver (3-5 linhas)",
  "detailedSummary": [
    {
      "topic": "Nome do Tópico (ex.: 'Camadas da Pele e Histofisiologia')",
      "subtopics": [
        {
          "title": "Subtópico específico",
          "content": "Texto detalhado explicando o conceito com profundidade científica..."
        }
      ]
    }
  ],
  "objectives": [ { "title": "Objetivo em verbo infinitivo", "detail": "Fundamentação direta" } ],
  "questions": [ { "number": 1, "area": "histologia", "question": "Pergunta exatamente como no roteiro do PDF", "theme": "Breve explicação do assunto central da pergunta", "answer": "Resposta completa e aprofundada", "keyTerms": ["termo 1", "termo 2"] } ],
  "histology": [ { "structure": "Nome do tecido/estrutura", "request": "O que o roteiro pede", "description": "Descrição microscópica", "features": ["característica-chave 1", "característica-chave 2"], "staining": "Coloração/técnica", "clinicalRelevance": "Relevância clínica" } ],
  "anatomy": [ { "structure": "Estrutura", "request": "O que o roteiro pede", "description": "Descrição anatômica", "features": ["ponto 1", "ponto 2"], "staining": "", "clinicalRelevance": "Relevância clínica" } ],
  "clinicalCases": [
    {
      "title": "Nome clínico limpo do caso (sem '2.4' nem 'Coordenador/Relator')",
      "summary": "Resumo clínico sucinto",
      "caseTranscription": "Transcrição exclusivamente clínica do caso com dados em negrito (sem metadados nem números '2.4')",
      "answers": [ { "question": "Pergunta do caso copiada exatamente do roteiro", "theme": "Breve explicação do assunto da pergunta", "answer": "Resposta e explicação clínica fundamentada" } ],
      "resolvedTable": "| Parâmetro / Estrutura | Achado do Roteiro | Ligação / Resolução Solucionada |\n| --- | --- | --- |\n| Linha 1 | ... | ... |",
      "diagnosticReasoning": "Raciocínio diagnóstico",
      "differentials": ["diferencial 1", "diferencial 2"],
      "management": "Conduta"
    }
  ],
  "exams": [ { "name": "Nome do exame", "summary": "Explicação resumida do exame", "markers": [ { "name": "Melan-A", "explanation": "O que é e o que detecta", "significance": "O que significa positivo/negativo" } ], "interpretation": "Interpretação dos achados", "correlation": "Correlação com o caso clínico" } ],
  "correlations": [ { "title": "Título da correlação", "text": "Texto integrando morfologia, clínica e exames" } ],
  "keyPoints": ["ponto-chave 1", "ponto-chave 2"],
  "glossary": [ { "term": "Termo", "definition": "Definição curta" } ],
  "tutoria": ${hasTutoria ? `{ "caseSummary": "Resumo do caso da tutoria", "resolution": "Resolução integrada", "links": [ { "atelie": "Achado do Ateliê", "tutoria": "Elemento do caso da tutoria", "explanation": "Por que se relacionam" } ] }` : "null"}
}`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const spFiles = formData.getAll("files") as File[];
    const tutoriaFiles = formData.getAll("tutoriaFiles") as File[];
    const tutoriaText = ((formData.get("tutoriaText") as string) || "").trim();
    const notes = ((formData.get("notes") as string) || "").trim();

    // Persist uploaded SP files to public/uploads
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true }).catch(() => {});
    const uploadedFiles: Array<{ name: string; url: string; size: number; type: string }> = [];

    for (const file of spFiles) {
      if (file.size === 0) continue;
      try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}-${safeName}`;
        const filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        uploadedFiles.push({
          name: file.name,
          url: `/uploads/${fileName}`,
          size: file.size,
          type: file.type || "application/pdf",
        });
      } catch (err) {
        console.warn("Could not persist file to uploads folder in Atelie:", err);
      }
    }

    const attachments: Attachment[] = [];
    for (const f of spFiles) {
      const a = await toAttachment(f, "");
      if (a) attachments.push(a);
    }
    const spCount = attachments.length;

    for (const f of tutoriaFiles) {
      const a = await toAttachment(f, "[CASO DA TUTORIA] ");
      if (a) attachments.push(a);
    }
    const tutoriaFileCount = attachments.length - spCount;

    if (spCount === 0 && !notes) {
      return NextResponse.json(
        { error: "Anexe o roteiro da SP (PDF, Word, PowerPoint ou imagem) para iniciar a análise." },
        { status: 400 }
      );
    }

    const hasTutoria = Boolean(tutoriaText) || tutoriaFileCount > 0;

    const userParts: string[] = [];
    userParts.push(
      spCount > 0
        ? `Analise o ROTEIRO DA SP anexado (${spCount} arquivo(s): ${attachments
            .slice(0, spCount)
            .map((a) => `"${a.name}"`)
            .join(", ")}) e produza a resolução completa conforme as regras.`
        : "Produza a resolução da SP conforme as instruções do aluno abaixo."
    );
    if (notes) {
      userParts.push(`INSTRUÇÕES / DESCRIÇÃO DO ALUNO (têm prioridade sobre o padrão, mas não dispensam a fidelidade ao roteiro): "${notes}"`);
    }
    if (hasTutoria) {
      if (tutoriaText) {
        userParts.push(`CASO DA TUTORIA (texto informado pelo aluno):\n"""\n${tutoriaText}\n"""`);
      }
      if (tutoriaFileCount > 0) {
        userParts.push(
          `Os arquivos com o prefixo "[CASO DA TUTORIA]" contêm o caso da tutoria — NÃO são o roteiro do Ateliê; use-os apenas para contextualizar e correlacionar.`
        );
      }
    }

    const result = await generateJSONFromAI({
      systemPrompt: SYSTEM_PROMPT(hasTutoria),
      userPrompt: userParts.join("\n\n"),
      fileAttachments: attachments,
      maxOutputTokens: 40000,
      temperature: 0.35,
    });

    if (!result || typeof result !== "object") {
      throw new Error("A IA não retornou uma análise válida. Tente novamente.");
    }

    // Garantir que o RESUMO COMPLETO (detailedSummary) seja gerado de imediato na análise
    if (!result.detailedSummary || !Array.isArray(result.detailedSummary) || result.detailedSummary.length === 0) {
      try {
        const SUMMARY_PROMPT = `Você é um professor catedrático de Medicina especializado na elaboração de resumos e sínteses acadêmicas de alta profundidade para estudantes de graduação (Metodologia PBL / Ateliê).
MISSÃO: A partir do tema, objetivos e dados da SP, crie um RESUMO TEÓRICO COMPLETO, EXAUSTIVO E ESTRUTURADO sobre toda a matéria do documento.
Organize em 5 a 8 Tópicos Centrais lógicos e didáticos, cada um com 2 a 4 subtópicos com textos ricos e aprofundados (4 a 8 linhas) e keyPoints.
JSON DEVE TER O FORMATO:
{
  "topics": [
    {
      "topic": "Nome do Tópico",
      "subtopics": [
        {
          "title": "Nome do Subtópico",
          "content": "Texto aprofundado e completo explicando o conceito com riqueza técnica...",
          "keyPoints": ["Ponto-chave 1", "Ponto-chave 2"]
        }
      ]
    }
  ]
}`;
        const summaryRes = await generateJSONFromAI({
          systemPrompt: SUMMARY_PROMPT,
          userPrompt: `TEMA DA SP: ${result.title || "Ateliê de Medicina"}\nSUBTEMA: ${result.theme || ""}\nRESUMO: ${result.summary || ""}\n\nGere agora o RESUMO TEÓRICO COMPLETO em tópicos, subtópicos e textos aprofundados.`,
          maxOutputTokens: 20000,
          temperature: 0.35,
        });
        if (summaryRes?.topics && Array.isArray(summaryRes.topics) && summaryRes.topics.length > 0) {
          result.detailedSummary = summaryRes.topics;
        }
      } catch (sumErr) {
        console.warn("Could not auto-generate detailedSummary in analyze-atelie:", sumErr);
      }
    }

    return NextResponse.json({
      ...result,
      files: uploadedFiles,
    });
  } catch (error: any) {
    console.error("Analyze Ateliê Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao analisar a SP com IA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
