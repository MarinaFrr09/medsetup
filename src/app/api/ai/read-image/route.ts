import { NextRequest, NextResponse } from "next/server";
import { generateVisionFromAI } from "@/lib/ai";
import { calculateBalancedMindMapLayout } from "@/lib/mindmap-layout";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const mode = (formData.get("mode") as string) || "board";
    const expand = formData.get("expand") === "true";

    if (!image) {
      return NextResponse.json({ error: "Imagem é obrigatória" }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    let imageUrl: string | undefined = undefined;
    try {
      const uploadsDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true }).catch(() => {});
      const timestamp = Date.now();
      const safeName = (image.name || "imagem.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${timestamp}-${safeName}`;
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      imageUrl = `/uploads/${fileName}`;
    } catch (saveErr) {
      console.warn("Could not save image to uploads:", saveErr);
    }

    let systemPrompt = "";
    let userPrompt = "";

    const abbreviationRule = `
REGRA MANDATÓRIA DE DESABREVIAÇÃO:
Expanda TODAS as siglas pelo contexto:
- "AMS" → "Artéria Mesentérica Superior (AMS)"
- "FC > 90" → "Frequência Cardíaca > 90 bpm"
- "PAS < 90" → "Pressão Arterial Sistólica < 90 mmHg"
- "PAM" → "Pressão Arterial Média (PAM)"
- Qualquer sigla médica, biológica, química ou física → nome completo por extenso em todos os campos.`;

    if (mode === "board") {
      const whiteboardSchema = `
Responda OBRIGATORIAMENTE em JSON válido, sem texto fora do JSON:
{
  "title": "TÍTULO PRINCIPAL DO QUADRO (ex: ANATOMIA PÉLVICA E HISTOLOGIA ÓSSEA)",
  "subtitle": "Subtítulo didático com escopo clínico (ex: Assoalho Pélvico, Músculos do Períneo e Microestrutura do Ósteon)",
  "themeStyle": "studygram_pastel",
  "illustrationType": "cells_layer",
  "columns": [
    {
      "id": "col_1",
      "title": "Coluna 1 - Tema Inicial",
      "clusters": [
        {
          "id": "cluster_1",
          "title": "Assoalho Pélvico (AP)",
          "headerStyle": "highlighter_pink",
          "doodleRays": true,
          "badgeNumber": "1º",
          "container": "card",
          "flowSteps": [
            {
              "text": "Diafragma Pélvico: Sustentação das vísceras pélvicas e continência",
              "emphasis": "(Controle de continência urinária e fecal)",
              "illustration": "cells_layer",
              "arrow": "down",
              "bulletPoints": [
                "Formado pelo Músculo Levantador do Ânus e Músculo Coccígeo",
                "Inervação: Ramos diretos do plexo sacral (S3-S4) e nervo pudendo"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "col_2",
      "title": "Coluna 2 - Desdobramentos e Anatomia",
      "clusters": [
        {
          "id": "cluster_2",
          "title": "Musculatura do Períneo",
          "headerStyle": "highlighter_blue",
          "badgeNumber": "2º",
          "container": "dashed_bubble",
          "bulletPoints": [
            "Trígono Anterior (Urogenital): Músculo Isquiocavernoso e Bulboesponjoso",
            "Trígono Posterior: Esfíncter Externo do Ânus",
            "Inervação motora e sensitiva: Nervo Pudendo (S2-S4)"
          ],
          "pills": [
            {"label": "Inervação", "color": "emerald", "subTitle": "Nervo Pudendo (S2-S4)"},
            {"label": "Vascularização", "color": "emerald", "subTitle": "Artéria Pudenda Interna"}
          ]
        }
      ]
    },
    {
      "id": "col_3",
      "title": "Coluna 3 - Histologia / Repercussões",
      "clusters": [
        {
          "id": "cluster_3",
          "title": "Estrutura do Ósteon (Sistema de Havers)",
          "headerStyle": "highlighter_green",
          "badgeNumber": "3º",
          "container": "card",
          "bulletPoints": [
            "Canal de Havers Central: Vasos sanguíneos e nervos",
            "Canais de Volkmann: Conexão vascular transversal",
            "Osteócitos em lacunas com prolongamentos canaliculares",
            "Matriz Óssea: Orgânica (Colágeno Tipo I) e Inorgânica (Hidroxiapatita)"
          ]
        }
      ]
    }
  ],
  "legends": [
    {"abbr": "AP", "meaning": "Assoalho Pélvico"},
    {"abbr": "S2-S4", "meaning": "Segmentos Espinhais Sacrais 2 a 4"}
  ]
}`;

      if (!expand) {
        systemPrompt = `Você é um designer acadêmico de notas ilustradas e quadros digitais de medicina e ciências (padrão Studygram / GoodNotes / Canva Educacional).
O usuário enviou uma fotografia de um quadro branco (whiteboard), anotação de sala de aula ou esquema feito pelo professor.
Sua missão é TRANSFORMAR O QUADRO EM UMA IMAGEM DIGITALIZADA DO QUADRO, EXATAMENTE IGUAL AO ESQUEMA DA IMAGEM MAS DIGITADO, COM TERMOS DESABREVIADOS, PALAVRAS INTEIRAS E NORMAIS, E VISUAL ORGANIZADO:

1. FORMATO OBRIGATÓRIO: QUADRO DIGITAL HORIZONTAL (PAISAGEM / LANDSCAPE - PROPORÇÃO 16:9 OU A4 DEITADO):
   - O Quadro Digital DEVE ser gerado estritamente na HORIZONTAL (lousa retangular ampla deitada, mais larga que alta).
   - NUNCA empilhe vários blocos verticalmente em apenas 1 ou 2 colunas gerando uma 'torre vertical comprida'.
   - DISTRIBUA O CONTEÚDO OBRIGATORIAMENTE EM 3 A 4 COLUNAS HORIZONTAIS LADO A LADO ('col_1', 'col_2', 'col_3', e 'col_4' se necessário):
     • Coluna 1 (Esquerda): Primeiro conceito ou tema principal com fluxo inicial.
     • Coluna 2 (Centro): Desdobramentos, anatomia/fisiopatologia secundária, vascularização/inervação ou etapas intermediárias.
     • Coluna 3 (Direita): Histologia, exames, critérios diagnósticos, condutas ou notas de alerta.
     • Coluna 4 (Extrema-Direita, se houver muitos tópicos): Segundo tema, matriz óssea, farmacologia ou condutas.
   - Cada coluna deve ter NO MÁXIMO 1 a 2 blocos (clusters), forçando o quadro a se expandir horizontalmente para os lados, mantendo a altura compacta e harmoniosa (proporção paisagem).

2. DESABREVIAÇÃO MANDATÓRIA E PALAVRAS COMPLETAS POR EXTENSO:
   - NUNCA deixe siglas ou rabiscos encurtados sem o significado claro.
   - Escreva TODAS as palavras inteiras, normais e corretas da língua portuguesa, com acentuação impecável.
   - Exemplos:
     • "AP" → "Assoalho Pélvico (AP)"
     • "teste genético HPV-DNA" → "teste ginecológico HPV-DNA"
     • "16-18 (↑ risco)" → "16 – 18 (alto risco)"
     • "E5-E6-E7" → botões/pills separados [E5], [E6], [E7] sob "expressão de proteínas oncogênicas"
     • "Inibição p53 / pRb - supressor tumorais" → "inibição de p53 e pRb (genes supressores tumorais)"
     • "Infecção células basais (↑ mitótica)" → "Infecção nas células basais (↑ mitótica)"
     • "AMS" → "Artéria Mesentérica Superior (AMS)"

3. ENRIQUECIMENTO DIDÁTICO COM MARCADORES (BULLET POINTS):
   - Adicione marcadores explicativos claros e concisos para cada subdivisão anatômica, fisiológica ou patológica.

4. ESTILOS VISUAIS DE STUDYGRAM / QUADRO BRANCO:
   - Atribua estilos correspondentes a cada elemento do quadro:
     • 'highlighter_pink': marca-texto rosa pastel com doodle rays (ex: títulos principais)
     • 'highlighter_green': marca-texto verde menta pastel (ex: histologia, rastreamento)
     • 'highlighter_blue': marca-texto azul pastel (ex: musculatura, exames)
     • 'highlighter_purple': marca-texto lilás pastel (ex: inervação, biologia)
     • 'cloud': balão de nuvem com borda suave
     • 'dashed_bubble': balão com borda tracejada
     • 'bracket': chave agrupando itens
     • 'pills': botões em pílula
     • 'badgeNumber': número de etapas (ex: "1º", "2º", "3º")
     • 'illustration': tipo de ilustração médica ("cells_layer", "dna", "virus", "microscope", "heart", "brain", "lungs", "kidney")

${abbreviationRule}
${whiteboardSchema}`;
        userPrompt = "Analise o quadro da foto, identifique toda a distribuição espacial, distribua os tópicos OBRIGATORIAMENTE em 3 a 4 colunas horizontais (lousa em formato paisagem / horizontal), desabrevie todas as siglas para palavras normais inteiras e gere o JSON do Quadro Digital no modelo do exemplo.";
      } else {
        systemPrompt = `Você é um professor catedrático e designer acadêmico de notas ilustradas (padrão Studygram / GoodNotes / Medicina).
Sua missão é EXPANDIR e APROFUNDAR o quadro da imagem:
1. Extraia a estrutura exata do quadro OBRIGATORIAMENTE EM 3 A 4 COLUNAS HORIZONTAIS (formato lousa paisagem/landscape, nunca vertical comprido).
2. Desabrevie todas as siglas para palavras inteiras e normais.
3. Para cada bloco, adicione marcadores ricos com fisiopatologia, critérios diagnósticos, valores laboratoriais, condutas clínicas e pontos de prova.
4. Utilize estilos visuais ricos ('highlighter_pink', 'highlighter_green', 'highlighter_blue', 'cloud', 'dashed_bubble', 'bracket', 'pills').

${abbreviationRule}
${whiteboardSchema}`;
        userPrompt = "Gere uma versão EXPANDIDA do Quadro Digital da imagem, distribuída em 3 a 4 colunas horizontais (formato paisagem amplo), com palavras normais inteiras desabreviadas, marcadores didáticos aprofundados e riqueza visual.";
      }
    } else if (mode === "mindmap") {
      const mindmapRule = `
REGRA MANDATÓRIA DO MAPA MENTAL:
ATENÇÃO: Este modo gera EXCLUSIVAMENTE um MAPA MENTAL EM ÁRVORE DE NÓS (TopicNode -> SubtopicNode -> NoteNode).
NUNCA use ou responda com formato de quadro ('columns', 'clusters', 'whiteboard', 'pills', etc.).
Responda OBRIGATORIAMENTE em JSON válido com a lista de nós ('nodes').`;

      if (!expand) {
        systemPrompt = `Você é um arquiteto especialista em mapas mentais conceituais claros e estruturados.
Analise a imagem, desabrevie todas as siglas e extraia os ramos conceituais principais.
${mindmapRule}
${abbreviationRule}
Responda em JSON válido:
{
  "title": "TÍTULO DO MAPA (NOMES COMPLETOS)",
  "summary": "Síntese dos conceitos principais mapeados",
  "nodes": [
    {"id": "root", "type": "topic", "label": "Conceito Central", "color": "#2563EB", "children": ["a", "b", "c"]},
    {"id": "a", "type": "subtopic", "label": "Ramo 1", "color": "#059669", "children": ["a1", "a2"]},
    {"id": "a1", "type": "note", "label": "Detalhe 1.1", "color": "#059669", "children": []},
    {"id": "a2", "type": "note", "label": "Detalhe 1.2", "color": "#059669", "children": []},
    {"id": "b", "type": "subtopic", "label": "Ramo 2", "color": "#7C3AED", "children": ["b1"]},
    {"id": "b1", "type": "note", "label": "Detalhe 2.1", "color": "#7C3AED", "children": []},
    {"id": "c", "type": "subtopic", "label": "Ramo 3", "color": "#D97706", "children": []}
  ]
}`;
        userPrompt = "Extraia a árvore de conceitos desta imagem com nós e termos desabreviados para montar o mapa mental.";
      } else {
        systemPrompt = `Você é um arquiteto sênior de conhecimento. Sua missão é criar um MAPA MENTAL EXPANDIDO E COMPLETO baseado na imagem:
1. Extraia o tema central e EXPANDA com pelo menos 5 a 6 ramos principais completos.
2. Cada ramo principal deve conter de 3 a 5 subitens e notas explicativas detalhadas com mecanismos, classificações e aplicações práticas.
3. Desabrevie todas as siglas obrigatoriamente.
${mindmapRule}
${abbreviationRule}
Responda em JSON válido:
{
  "title": "TÍTULO DO MAPA EXPANDIDO",
  "summary": "Visão geral completa e articulada de todos os ramos mapeados",
  "nodes": [
    {"id": "root", "type": "topic", "label": "Conceito Central Expandido", "color": "#2563EB", "children": ["a", "b", "c", "d", "e"]},
    {"id": "a", "type": "subtopic", "label": "Ramo 1 por Extenso", "color": "#059669", "children": ["a1", "a2", "a3"]},
    {"id": "a1", "type": "note", "label": "Conceito e Mecanismo Detalhado", "color": "#059669", "children": []},
    {"id": "a2", "type": "note", "label": "Critérios e Diagnóstico", "color": "#059669", "children": []},
    {"id": "a3", "type": "note", "label": "Implicações Práticas", "color": "#059669", "children": []},
    {"id": "b", "type": "subtopic", "label": "Ramo 2 por Extenso", "color": "#7C3AED", "children": ["b1", "b2", "b3"]},
    {"id": "b1", "type": "note", "label": "Classificação Completa", "color": "#7C3AED", "children": []},
    {"id": "b2", "type": "note", "label": "Manejo e Tratamento", "color": "#7C3AED", "children": []},
    {"id": "b3", "type": "note", "label": "Pontos de Atenção", "color": "#7C3AED", "children": []},
    {"id": "c", "type": "subtopic", "label": "Ramo 3 por Extenso", "color": "#D97706", "children": ["c1", "c2"]},
    {"id": "c1", "type": "note", "label": "Exames Complementares", "color": "#D97706", "children": []},
    {"id": "c2", "type": "note", "label": "Valores de Referência", "color": "#D97706", "children": []},
    {"id": "d", "type": "subtopic", "label": "Ramo 4 por Extenso", "color": "#E11D48", "children": ["d1", "d2"]},
    {"id": "d1", "type": "note", "label": "Sinais de Urgência", "color": "#E11D48", "children": []},
    {"id": "d2", "type": "note", "label": "Conduta Imediata", "color": "#E11D48", "children": []},
    {"id": "e", "type": "subtopic", "label": "Ramo 5 por Extenso", "color": "#0284C7", "children": ["e1"]},
    {"id": "e1", "type": "note", "label": "Dicas e Mnemônicos para Prova", "color": "#0284C7", "children": []}
  ]
}`;
        userPrompt = "Crie um Mapa Mental EXPANDIDO e detalhado a partir desta imagem, incluindo pelo menos 5 ramos ricos com subitens explicativos.";
      }
    } else {
      // mode === "summary"
      const summaryFormattingRules = `
REGRAS OBRIGATÓRIAS DE FORMATAÇÃO DIDÁTICA DO RESUMO:
1. NUNCA gere blocos longos de texto corrido chapado! O resumo deve ser visualmente dinâmico, organizado e agradável de estudar.
2. Estruture em TÓPICOS PRINCIPAIS (## 1. Título do Tópico) e SUBTÓPICOS ESPECÍFICOS (### 1.1 Nome do Subtópico).
3. Use LISTAS com marcadores para cada conceito (* **Termo:** explicação clara e objetiva).
4. Para detalhes secundários, use SUBITENS recuados (  - Detalhe complementar ou valor numérico).
5. Inclua OBRIGATORIAMENTE CAIXAS DE DESTAQUE DIDÁTICAS:
   > 💡 **Conceito-Chave:** Explicação central fundamental
   > ⚠️ **Atenção / Ponto de Prova:** Armadilha ou detalhe crucial
   > 🔬 **Fisiopatologia / Mecanismo:** Processo fisiológico ou causal
   > 📌 **Aplicação Clínica / Prática:** Como raciocinar no caso real
6. Insira quebras de linha duplas entre tópicos para dar respiro visual à página.`;

      if (!expand) {
        systemPrompt = `Você é um professor acadêmico especialista em sintetização didática de alto nível.
Analise o conteúdo da imagem, desabrevie todas as siglas e gere um resumo perfeitamente organizado com elementos visuais de estudo.
${abbreviationRule}
${summaryFormattingRules}

Responda OBRIGATORIAMENTE em JSON:
{
  "title": "Título Completo do Resumo (Nomes por Extenso)",
  "summary": "Resumo estruturado com tópicos (##), subtópicos (###), itens (* **Termo:**), caixas (> 💡, > ⚠️) e quebras de linha...",
  "keyPoints": ["Ponto essencial 1", "Ponto essencial 2", "Ponto essencial 3"]
}`;
        userPrompt = "Transcreva e organize este conteúdo em um resumo didático estruturado com tópicos, subtópicos, itens explicativos, caixas de destaque e desabreviações completas.";
      } else {
        systemPrompt = `Você é um professor universitário e autor de materiais acadêmicos de excelência.
Sua missão é gerar um RESUMO EXPANDIDO, APROFUNDADO E ALTAMENTE ESTRUTURADO a partir da imagem:
1. EXPANDA ricamente cada conceito com explicações detalhadas, critérios diagnósticos, valores laboratoriais, condutas e diagnóstico diferencial.
2. Organize com múltiplos tópicos e subtópicos para cada aspecto da matéria.
3. Use marcadores ricos, caixas de destaque (> 💡, > ⚠️, > 🔬, > 📌) e subitens detalhados.
${abbreviationRule}
${summaryFormattingRules}

Responda OBRIGATORIAMENTE em JSON:
{
  "title": "Título Completo do Resumo Expandido",
  "summary": "Resumo aprofundado com múltiplos tópicos (##), subtópicos (###), itens ricos, caixas de alerta didático e quebras de linha...",
  "keyPoints": ["Ponto chave 1", "Ponto chave 2", "Ponto chave 3", "Ponto chave 4", "Ponto chave 5"]
}`;
        userPrompt = "Gere um resumo altamente EXPANDIDO e detalhado com tópicos, subtópicos, caixas de destaque didático (> 💡, > ⚠️), explicações de mecanismos e critérios clínicos.";
      }
    }

    const result = await generateVisionFromAI({
      systemPrompt,
      userPrompt,
      imageBase64: base64,
      mimeType,
    });

    // Mindmap layout calculations using multi-directional balanced engine
    if (mode === "mindmap") {
      let rawNodes = result.nodes;
      const title = result.title || "Mapa Mental Extraído da Imagem";
      const summary = result.summary || "";

      // Fallback: If AI returned columns instead of nodes, convert columns to mindmap nodes
      if ((!rawNodes || !Array.isArray(rawNodes) || rawNodes.length === 0) && result.columns && Array.isArray(result.columns)) {
        rawNodes = [
          { id: "root", type: "topic", label: title, color: "#2563EB", children: [] }
        ];
        result.columns.forEach((col: any, cIdx: number) => {
          const colId = `sub_${cIdx}`;
          const colLabel = col.title || `Ramo ${cIdx + 1}`;
          const colChildren: string[] = [];

          if (col.clusters && Array.isArray(col.clusters)) {
            col.clusters.forEach((cl: any, clIdx: number) => {
              const clId = `note_${cIdx}_${clIdx}`;
              colChildren.push(clId);
              rawNodes.push({
                id: clId,
                type: "note",
                label: cl.title || cl.text || `Conceito ${clIdx + 1}`,
                color: ["#059669", "#7C3AED", "#D97706", "#E11D48", "#0284C7"][cIdx % 5],
                children: []
              });
            });
          }

          rawNodes[0].children.push(colId);
          rawNodes.push({
            id: colId,
            type: "subtopic",
            label: colLabel,
            color: ["#059669", "#7C3AED", "#D97706", "#E11D48", "#0284C7"][cIdx % 5],
            children: colChildren
          });
        });
      }

      // Safe default if nodes still empty
      if (!rawNodes || !Array.isArray(rawNodes) || rawNodes.length === 0) {
        rawNodes = [
          { id: "root", type: "topic", label: title, color: "#2563EB", children: ["sub_1", "sub_2"] },
          { id: "sub_1", type: "subtopic", label: "Conceitos Mapeados", color: "#059669", children: [] },
          { id: "sub_2", type: "subtopic", label: "Aplicações Clínicas", color: "#7C3AED", children: [] }
        ];
      }

      const { nodes, edges } = calculateBalancedMindMapLayout(rawNodes, title);

      return NextResponse.json({
        title,
        summary,
        nodes,
        edges,
        imageUrl,
      });
    }

    if (typeof result === "object" && result !== null) {
      result.imageUrl = imageUrl;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Read Image Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao processar imagem";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
