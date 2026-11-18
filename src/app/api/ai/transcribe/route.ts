import { NextRequest, NextResponse } from "next/server";
import { processAudioWithAI } from "@/lib/ai";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let audioBuffer: Buffer | null = null;
    let mimeType = "audio/webm";
    let transcriptText = "";

    const contentType = request.headers.get("content-type") || "";

    let isExpanded = false;

    let filename = "recording.webm";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audio = formData.get("audio") as File | null;
      const textParam = formData.get("transcriptText") as string | null;
      isExpanded = formData.get("expand") === "true";

      if (textParam && textParam.trim()) {
        transcriptText = textParam.trim();
      }

      if (audio && audio.size > 0) {
        const arrayBuf = await audio.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
        filename = audio.name || "recording.webm";
        mimeType = audio.type || "";
      }
    } else {
      const body = await request.json().catch(() => ({}));
      transcriptText = (body.transcriptText || "").trim();
      isExpanded = body.expand === true;
    }

    if (!transcriptText && (!audioBuffer || audioBuffer.length === 0)) {
      return NextResponse.json(
        { error: "Nenhum áudio ou transcrição foi fornecido para processamento." },
        { status: 400 }
      );
    }

    const systemPrompt = `Você é um professor e especialista acadêmico de alta precisão em decodificação de aulas e conferências gravadas de qualquer duração (incluindo aulas completas de 30 a 120 minutos).
Sua missão fundamental:
1. Analisar a gravação COMPLETA da aula do PRIMEIRO AO ÚLTIMO SEGUNDO, cobrindo integralmente toda a duração sem truncar e sem limitar apenas aos minutos iniciais.
2. Filtrar ruídos de microfone, pausas longas e conversas paralelas para manter o foco estrito no conteúdo didático da aula.
3. Transcrever com fidelidade máxima, sem perdas e sem abreviações no campo 'cleanTranscript'. Se houver uma transcrição capturada ao vivo ou áudio integral, utilize todas as falas do início ao fim para fornecer a transcrição cronológica completa.
4. Desenvolver uma Síntese/Resumo Extenso, Completo e minucioso no campo 'summary' usando Markdown rico (Visão Geral, Conceitos Fundamentais, Fisiopatologia, Fórmulas/Regras e Aplicações Práticas), cobrindo exaustivamente todo o conteúdo ensinado ao longo de toda a gravação. O resumo DEVE SER LONGO, RICO E APROFUNDADO, sem cortes, sem telegráfico e sem resumos superficiais.
${
  isExpanded
    ? `
ATENÇÃO CRÍTICA - MODO EXPANDIDO ATIVADO:
- No campo 'summary': Aprofunde cada tópico ao máximo. Explique conceitos com definições exaustivas, fisiopatologia, mecanismos de ação, regras diagnósticas, aplicações práticas no mundo real e pontos de prova. O resumo deve ser rico, detalhado e completo em múltiplas páginas A4.
- No campo 'mindMap': Crie um mapa mental expandido com pelo menos 6 a 8 ramificações temáticas completas, cada uma contendo 3 a 5 subitens ricos com mecanismos e notas explicativas.
- No campo 'keyPoints': Extraia de 6 a 10 pontos-chave indispensáveis.
- No campo 'topics': Inclua todos os tópicos e subtópicos detalhados.
`
    : ""
}
   REGRAS CRÍTICAS DE FORMATAÇÃO DO 'summary':
   - NUNCA use '####' ou hashtags repetidas com numeração (NUNCA faça '#### 1. Titulo' nem '### 1. Titulo').
   - Para títulos de seções principais use '## NOME DA SEÇÃO' em maiúsculas (ex: '## VISÃO GERAL DA AULA', '## CONCEITOS FUNDAMENTAIS', '## FARMACOLOGIA CLÍNICA').
   - Para tópicos e subtópicos específicos, use títulos limpos em negrito com destaque (ex: '**Imunoterapia e Bloqueio de Checkpoints Imunes**' ou '### Imunoterapia e Checkpoints Imunes').
   - Estruture cada conceito em marcadores didáticos claros: '* **Termo**: Descrição objetiva e aprofundada'.
   - Use caixas de destaque para pontos vitais: '> 💡 **Conceito-Chave:** ...' ou '> ⚠️ **Atenção / Ponto de Prova:** ...'.
5. Extrair todos os pontos-chave indispensáveis no campo 'keyPoints'.
6. Organizar seções temáticas detalhadas no campo 'topics' com explicações ricas.
7. Construir o Mapa Mental hierárquico no campo 'mindMap' com nós ('topic', 'subtopic', 'note') e conexões ('edges').

Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título representativo do tema específico da aula com NO MÁXIMO 5 PALAVRAS (Ex: 'Farmacologia Oncológica e Biologia Tumoral', 'Fisiopatologia da Insuficiência Cardíaca'). NUNCA use 'Resumo Estruturado de Estudos' ou títulos genéricos.",
  "cleanTranscript": "Texto integral da transcrição limpo e formatado cobrindo toda a extensão da aula",
  "summary": "Resumo completo da aula em tópicos e explicações aprofundadas seguindo estritamente as regras de formatação",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3", "ponto 4"],
  "topics": [
    {
      "title": "Nome do Tópico",
      "content": "Explicação detalhada deste tópico abordado na aula"
    }
  ],
  "mindMap": {
    "title": "Tema Central",
    "nodes": [
      { "id": "1", "label": "Tema Central", "type": "topic", "color": "#3B82F6" },
      { "id": "2", "label": "Subtópico 1", "type": "subtopic", "color": "#10B981" },
      { "id": "3", "label": "Subtópico 2", "type": "subtopic", "color": "#8B5CF6" },
      { "id": "4", "label": "Detalhe A", "type": "note", "color": "#F59E0B" }
    ],
    "edges": [
      { "id": "e1-2", "source": "1", "target": "2" },
      { "id": "e1-3", "source": "1", "target": "3" },
      { "id": "e2-4", "source": "2", "target": "4" }
    ]
  }
}`;

    const aiResult = await processAudioWithAI({
      audioBuffer,
      mimeType,
      filename,
      fallbackText: transcriptText,
      systemPrompt,
    });

    // Sanitize title to guarantee <= 5 words and no generic prefix
    if (aiResult.title) {
      let clean = aiResult.title
        .replace(/^(?:resumo\s+(?:estruturado\s+)?(?:acad[êe]mico\s+)?(?:de\s+estudos\s+)?(?:da\s+aula\s+)?(?:completo\s+)?[:\-–—]?\s*)/i, "")
        .replace(/["'*_#]/g, "")
        .trim();
      const words = clean.split(/\s+/);
      if (words.length > 5) {
        clean = words.slice(0, 5).join(" ");
      }
      if (!clean || clean.length < 3) {
        clean = aiResult.topics?.[0]?.title || "Síntese Temática da Aula";
      }
      aiResult.title = clean;
    }

    // Ensure cleanTranscript preserves the most complete transcription:
    // If transcriptText was captured continuously by the browser and is substantial,
    // ensure nothing is omitted if AI returned a summary or shorter segment.
    let fullCleanTranscript = (aiResult.cleanTranscript || "").trim();
    if (transcriptText && transcriptText.trim().length > 0) {
      if (!fullCleanTranscript) {
        fullCleanTranscript = transcriptText.trim();
      } else if (fullCleanTranscript.length < transcriptText.trim().length * 0.7) {
        fullCleanTranscript = `${fullCleanTranscript}\n\n---\n### Registro Contínuo Integral da Gravação:\n${transcriptText.trim()}`;
      }
    }

    return NextResponse.json({
      rawTranscript: fullCleanTranscript || transcriptText || "Áudio processado com sucesso.",
      ...aiResult,
      cleanTranscript: fullCleanTranscript,
      expanded: isExpanded,
    });
  } catch (error: any) {
    console.error("Audio processing API critical error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Falha ao processar o áudio com a Inteligência Artificial.",
      },
      { status: 500 }
    );
  }
}
