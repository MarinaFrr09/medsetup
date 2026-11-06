import { NextRequest, NextResponse } from "next/server";
import { generateJSONFromAI } from "@/lib/ai";
import { calculateBalancedMindMapLayout, calculateFree4DLayout, DEFAULT_MINDMAP_PALETTE } from "@/lib/mindmap-layout";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      colorTheme = "blue",
      layout = "free",
      expand = false,
      fileAttachment,
      fileAttachments,
    } = await request.json();

    const rawFiles: Array<{ data: string; mimeType: string; name?: string }> = [];
    if (fileAttachments && Array.isArray(fileAttachments) && fileAttachments.length > 0) {
      rawFiles.push(...fileAttachments);
    } else if (fileAttachment && fileAttachment.data) {
      rawFiles.push(fileAttachment);
    }

    const hasFiles = rawFiles.length > 0;
    const finalPrompt = prompt?.trim()
      ? prompt.trim()
      : hasFiles
      ? "Sintetize e estruture o conteúdo integral do(s) documento(s) anexado(s) em um mapa mental abrangente, cobrindo todos os tópicos e ramificações essenciais."
      : "";

    if (!finalPrompt && !hasFiles) {
      return NextResponse.json(
        { error: "Informe um tema ou anexe um documento/PDF." },
        { status: 400 }
      );
    }

    const palettes: Record<string, string[]> = {
      blue: ["#2563EB", "#0284C7", "#0D9488", "#38BDF8", "#6366F1"],
      green: ["#059669", "#10B981", "#14B8A6", "#84CC16", "#047857"],
      purple: ["#7C3AED", "#A855F7", "#EC4899", "#8B5CF6", "#C084FC"],
      amber: ["#D97706", "#F59E0B", "#EA580C", "#FB923C", "#F97316"],
      monochrome: ["#334155", "#475569", "#64748B", "#1E293B", "#0F172A"],
    };

    const palette = palettes[colorTheme] || DEFAULT_MINDMAP_PALETTE;

    const systemPrompt = `Você é um arquiteto especialista em conhecimento e mapas conceituais acadêmicos.
Crie um mapa mental aprofundado, rico e bem estruturado sobre o tema solicitado.
${
  hasFiles
    ? `
REGRA CRÍTICA E OBRIGATÓRIA (DOCUMENTO(S) ANEXADO(S)):
- Foram anexados ${rawFiles.length} documento(s) (PDFs ou materiais de estudo).
- O mapa mental DEVE ser gerado a partir do conteúdo desse(s) material(is) anexado(s).
- O tema central ("root") DEVE refletir o assunto principal tratado no documento.
- Os subtópicos de nível 2 ("subtopic") DEVEM corresponder às grandes seções, módulos ou tópicos do documento.
- As notas de nível 3 ("note") DEVEM conter conceitos, definições precisas, mecanismos e aplicações práticas extraídas diretamente do texto do material.
`
    : ""
}
${
  expand
    ? `
MODO EXPANDIDO ATIVADO:
- O mapa deve conter 1 tema central abrangente (nível 1), de 6 a 8 subtópicos principais completos (nível 2), e cada subtópico deve conter de 3 a 5 detalhes ou notas aprofundadas com mecanismos e aplicações práticas (nível 3).
`
    : `
O mapa deve conter 1 tema central (nível 1), de 4 a 6 subtópicos principais (nível 2), e cada subtópico deve ter de 2 a 4 detalhes ou notas (nível 3).
`
}

Responda APENAS em JSON válido com esta estrutura:
{
  "title": "Título Central do Mapa",
  "nodes": [
    {
      "id": "root",
      "label": "Título do Tema Central",
      "type": "topic",
      "level": 1,
      "children": ["sub-1", "sub-2", "sub-3", "sub-4"]
    },
    {
      "id": "sub-1",
      "label": "Primeiro Subtópico",
      "type": "subtopic",
      "level": 2,
      "children": ["detail-1-1", "detail-1-2"]
    },
    {
      "id": "detail-1-1",
      "label": "Conceito ou Detalhe Específico",
      "type": "note",
      "level": 3,
      "children": []
    }
  ]
}`;

    const userPrompt = hasFiles
      ? `Crie um mapa mental ${expand ? "EXPANDIDO e aprofundado" : "completo e multidirecional"} baseado fielmente no conteúdo do(s) documento(s) anexado(s). ${prompt?.trim() ? `Foco específico solicitado pelo usuário: "${prompt.trim()}".` : ""}`
      : `Crie um mapa mental ${expand ? "EXPANDIDO, detalhado e multidirecional" : "completo e multidirecional"} sobre: "${finalPrompt}".`;

    const result = await generateJSONFromAI({
      systemPrompt,
      userPrompt,
      fileAttachments: rawFiles,
    });

    if (!result.nodes || !Array.isArray(result.nodes)) {
      throw new Error("Estrutura de nós inválida retornada pela IA");
    }

    const fallbackTitle = hasFiles && rawFiles[0]?.name ? rawFiles[0].name.replace(/\.[^/.]+$/, "") : "Mapa Mental";
    const title = result.title || prompt?.trim() || fallbackTitle;
    const { nodes, edges } =
      layout === "free"
        ? calculateFree4DLayout(result.nodes, title, palette)
        : calculateBalancedMindMapLayout(result.nodes, title, palette);

    return NextResponse.json({
      title,
      nodes,
      edges,
    });
  } catch (error: any) {
    console.error("AI Generate MindMap Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar mapa mental";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
