"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  FileDown,
  Pencil,
  RotateCcw,
  Save,
  Eye,
  BookOpen,
  Stethoscope,
  CheckCircle2,
  FileText,
  Layers,
  Sparkles,
  Lightbulb,
  Image as ImageIcon,
  Link2,
  X,
  Upload,
  ZoomIn,
  Table as TableIcon,
  HelpCircle,
  GitBranch,
  Loader2,
  BookOpenCheck,
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useAppStore, Deck, Flashcard, TutoriaAnalysis } from "@/stores/useAppStore";
import { cleanQuestionTitle, extractCleanSubject, shortenCardAnswer } from "@/lib/questionUtils";
import { cn } from "@/lib/utils";
import { copyRichText, copyTableRichText } from "@/lib/notion-export";
import { exportDocumentToProfessionalPdf, cleanLatexAndBadges } from "@/lib/pdf-export";
import { replaceInMarkdown } from "@/lib/selection-replace";
import { getThemePalette } from "@/lib/theme-palettes";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { NotionOutline } from "@/components/shared/NotionOutline";
import toast from "react-hot-toast";

const EmbeddedMindMapView = dynamic(
  () => import("@/components/image-reader/EmbeddedMindMapView"),
  { ssr: false }
);

interface TutoriaViewerProps {
  title?: string;
  markdownContent: string;
  selectedBookTitles?: string[];
  fileUrl?: string;
  fileName?: string;
  onSaveContent?: (newContent: string) => void;
  onViewPdf?: () => void;
  analysis?: TutoriaAnalysis;
  onUpdateAnalysis?: (updates: Partial<TutoriaAnalysis>) => void;
}

export interface InlineSpan {
  type: "text" | "bold" | "italic" | "color" | "mark" | "underline";
  content: string;
  color?: string;
  bgColor?: string;
}

export function cleanCssVal(val?: string): string | undefined {
  if (!val) return undefined;
  return val.replace(/[;\s]+$/, "").trim();
}

/** Parses markdown tokens (bold, italic, colors, highlights, underline) */
export function parseInlineSpans(text: string): InlineSpan[] {
  if (!text) return [];
  const result: InlineSpan[] = [];

  // Decode ALL HTML entities first so &lt;span...&gt; doesn't get printed raw as literal text
  const preDecoded = text
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // Normalize style attributes with varying quotes/spacing and normalize nested mark and span
  const normalized = preDecoded
    .replace(
      /<mark(?:\s+[^>]*?style=["'][^"']*?background-color:\s*([^"';]+)[^"']*["'])?(?:\s+data-color=["']([^"';]+)[^"']*["'])?[^>]*><span\s+[^>]*?style=["'][^"']*?color:\s*([^"';]+)[^"']*["'][^>]*>([\s\S]*?)<\/span><\/mark>/gi,
      '<mark data-bg="$1" data-color="$3">$4</mark>'
    )
    .replace(
      /<span\s+[^>]*?style=["'](?:[^"']*?color:\s*([^"';]+)[^"']*)["'][^>]*>([\s\S]*?)<\/span>/gi,
      '<span data-color="$1">$2</span>'
    )
    .replace(
      /<span\s+data-color=["']([^"';]+)["'][^>]*>([\s\S]*?)<\/span>/gi,
      '<span data-color="$1">$2</span>'
    )
    .replace(
      /<mark(?:\s+[^>]*?style=["'][^"']*?background-color:\s*([^"';]+)[^"']*["'])?(?:\s+data-color=["']([^"';]+)[^"']*["'])?[^>]*>([\s\S]*?)<\/mark>/gi,
      '<mark data-bg="$1" data-color="$2">$3</mark>'
    )
    // Clean unclosed <span style="..."> tags by converting up to next tag/newline to colored span
    .replace(
      /<span\s+[^>]*?style=["'](?:[^"']*?color:\s*([^"';]+)[^"']*)["'][^>]*>([^<\n]+)(?=$|<|\n)/gi,
      '<span data-color="$1">$2</span>'
    );

  const regex = /<mark(?:\s+data-bg=["']([^"';]+)[^"']*["'])?(?:\s+data-color=["']([^"';]+)[^"']*["'])?\s*>([\s\S]*?)<\/mark>|<span\s+data-color=["']([^"';]+)[^"']*["']\s*>([\s\S]*?)<\/span>|<u>([\s\S]*?)<\/u>|\*\*([^*]+)\*\*|(?<!\*)\*([^*]+)\*(?!\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      let plain = normalized.slice(lastIndex, match.index).replace(/\*\*/g, "");
      plain = plain.replace(/<[^>]+>/g, ""); // Strip any unhandled HTML tags from plain text
      if (plain) result.push({ type: "text", content: plain });
    }
    const [, markBg, markColor, markContent, spanColor, spanContent, uContent, boldContent, italicContent] = match;

    if (markContent !== undefined) {
      const cleanContent = markContent.replace(/<[^>]+>/g, "").trim();
      if (cleanContent) {
        result.push({
          type: "mark",
          bgColor: cleanCssVal(markBg) || "#FEF08A",
          color: cleanCssVal(markColor),
          content: cleanContent,
        });
      }
    } else if (spanColor !== undefined && spanContent !== undefined) {
      const cleanContent = spanContent.replace(/<[^>]+>/g, "").trim();
      if (cleanContent) {
        result.push({
          type: "color",
          color: cleanCssVal(spanColor),
          content: cleanContent,
        });
      }
    } else if (uContent !== undefined) {
      const cleanContent = uContent.replace(/<[^>]+>/g, "").trim();
      if (cleanContent) {
        result.push({ type: "underline", content: cleanContent });
      }
    } else if (boldContent !== undefined) {
      result.push({ type: "bold", content: boldContent.replace(/<[^>]+>/g, "") });
    } else if (italicContent !== undefined) {
      result.push({ type: "italic", content: italicContent.replace(/<[^>]+>/g, "") });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    let plain = normalized.slice(lastIndex).replace(/\*\*/g, "");
    plain = plain.replace(/<[^>]+>/g, "");
    if (plain) result.push({ type: "text", content: plain });
  }

  return result.length > 0 ? result : [{ type: "text", content: text.replace(/\*\*/g, "").replace(/<[^>]+>/g, "") }];
}

export function TutoriaViewer({
  title,
  markdownContent,
  selectedBookTitles = [],
  fileUrl,
  fileName,
  onSaveContent,
  onViewPdf,
  analysis,
  onUpdateAnalysis,
}: TutoriaViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(true); // Edição direta instantânea ativa por padrão!
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [localContent, setLocalContent] = useState<string>(markdownContent || "");
  const [editedText, setEditedText] = useState("");
  const [viewMode, setViewMode] = useState<"document" | "mindmap">("document");
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [isDeepeningLoading, setIsDeepeningLoading] = useState(false);

  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [zoomImageCaption, setZoomImageCaption] = useState<string>("");

  const currentContent = isEditing ? (editedText || localContent) : cleanLatexAndBadges(localContent);

  useEffect(() => {
    setLocalContent(markdownContent || "");
    setEditedText(cleanLatexAndBadges(markdownContent || ""));
  }, [markdownContent]);

  const handleEditorChange = useCallback((newText: string) => {
    setEditedText(newText);
    setLocalContent(newText);
    setSaveStatus("saving");

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      onSaveContent?.(newText);
      if (analysis) {
        onUpdateAnalysis?.({ customMarkdown: newText });
        useAppStore.getState().updateTutoriaAnalysis(analysis.id, { customMarkdown: newText });
      }
      setSaveStatus("saved");
    }, 800);
  }, [onSaveContent, onUpdateAnalysis, analysis]);

  // Handle direct in-place AI selection apply (replace selection or insert below)
  useEffect(() => {
    const handleApplySelection = (e: Event) => {
      const customEvent = e as CustomEvent<{
        mode: "replace" | "insertBelow";
        selectedText: string;
        resultText: string;
        targetElement: HTMLElement | null;
      }>;
      const { mode, selectedText, resultText } = customEvent.detail || {};
      if (!selectedText || !resultText) return;

      const baseText = isEditing ? editedText : localContent;
      const updated = replaceInMarkdown(baseText, selectedText, resultText, mode);
      if (updated !== baseText) {
        customEvent.preventDefault();
        setLocalContent(updated);
        setEditedText(updated);
        setSaveStatus("saving");
        onSaveContent?.(updated);
        if (analysis) {
          onUpdateAnalysis?.({ customMarkdown: updated });
          useAppStore.getState().updateTutoriaAnalysis(analysis.id, { customMarkdown: updated });
        }
        setTimeout(() => setSaveStatus("saved"), 300);
      }
    };

    window.addEventListener("medsetup:apply-ai-selection", handleApplySelection);
    return () => window.removeEventListener("medsetup:apply-ai-selection", handleApplySelection);
  }, [localContent, editedText, isEditing, onSaveContent, onUpdateAnalysis, analysis]);

  const handleCopy = async () => {
    const success = await copyRichText(cleanLatexAndBadges(currentContent));
    if (success) {
      setCopied(true);
      toast.success("Copiado com formatação perfeita para Notion, Word, Docs ou WhatsApp!", {
        icon: "📋",
        duration: 3500,
      });
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("Não foi possível copiar para a área de transferência.");
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    const toastId = toast.loading("Gerando PDF com formatação profissional...");

    try {
      const baseName = (fileName || title || "Caso Clínico").replace(/\.[^/.]+$/, "").trim();
      const cleanName = `${baseName} Tutoria.pdf`;
      await exportDocumentToProfessionalPdf({
        title: title || "Resolução de Tutoria Clínica",
        content: cleanLatexAndBadges(currentContent),
        filename: cleanName,
        expanded: true,
        theme: "esmeralda",
      });
      toast.success("PDF profissional gerado com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF.", { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleStartEditing = () => {
    setEditedText(localContent);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setEditedText(localContent);
  };

  const handleSaveEditing = () => {
    setLocalContent(editedText);
    onSaveContent?.(editedText);
    if (analysis) {
      onUpdateAnalysis?.({ customMarkdown: editedText });
      useAppStore.getState().updateTutoriaAnalysis(analysis.id, { customMarkdown: editedText });
    }
    toast.success("Alterações salvas com sucesso!", { icon: "💾" });
  };

  const handleAprofundarComIA = async () => {
    setIsDeepeningLoading(true);
    const toastId = toast.loading("Aprofundando raciocínio do caso clínico com IA...");
    try {
      const cleanSubject = extractCleanSubject(title, analysis?.title || "Caso Clínico");
      const res = await fetch("/api/ai/expand-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Aprofundamento clínico, diagnósticos diferenciais e raciocínio fisiopatológico integrado sobre o tema ${cleanSubject}.`,
          action: "expand",
          context: currentContent.slice(0, 3000),
        }),
      });

      if (!res.ok) {
        throw new Error("Não foi possível aprofundar no momento.");
      }

      const data = await res.json();
      const expandedText = data.result || "";

      if (!expandedText) {
        throw new Error("Nenhum conteúdo adicional retornado.");
      }

      const updated = `${currentContent}\n\n---\n\n## Aprofundamento Clínico & Fisiopatologia Aplicada\n\n${expandedText}`;
      setLocalContent(updated);
      setEditedText(updated);
      onSaveContent?.(updated);
      if (analysis) {
        onUpdateAnalysis?.({ customMarkdown: updated });
        useAppStore.getState().updateTutoriaAnalysis(analysis.id, { customMarkdown: updated });
      }

      toast.success("Caso Clínico aprofundado com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aprofundar caso clínico.", { id: toastId });
    } finally {
      setIsDeepeningLoading(false);
    }
  };

  /* ───── Gerar Flashcards a partir da Tutoria ───── */
  const handleGenerateFlashcardsFromTutoria = () => {
    const cleanSubject = extractCleanSubject(title, analysis?.title || "Tutoria");
    const folder = useAppStore.getState().getOrCreateFolder(cleanSubject, "both");
    const timestamp = Date.now();

    // 1. Questões de Aprendizagem (Objetivos Centrais)
    const questionCards: Flashcard[] = [];
    (analysis?.result?.learningQuestions || []).forEach((lq, idx) => {
      if (lq.question && lq.detailedAnswer) {
        questionCards.push({
          id: `card_tutoria_q_${timestamp}_${idx}`,
          front: cleanQuestionTitle(lq.question),
          back: shortenCardAnswer(lq.detailedAnswer, 150),
        });
      }
    });

    // 2. Hipóteses Diagnósticas
    const hypothesisCards: Flashcard[] = [];
    (analysis?.result?.hypothesisAnalysis || []).forEach((h, idx) => {
      if (h.hypothesis) {
        hypothesisCards.push({
          id: `card_tutoria_hyp_${timestamp}_${idx}`,
          front: `Hipótese: ${h.hypothesis.trim()} é provável ou descartada neste caso?`,
          back: shortenCardAnswer(`${h.judgment ? `${h.judgment}. ` : ""}${h.explanation || h.rationale || ""}`, 140),
        });
      }
    });

    // 3. Termos e Perguntas Desconhecidas
    const termCards: Flashcard[] = [];
    (analysis?.result?.unknownTerms || []).forEach((t, idx) => {
      if (t.term && t.definition) {
        termCards.push({
          id: `card_tutoria_term_${timestamp}_${idx}`,
          front: `${t.term.trim()}: Qual a definição e relevância clínica?`,
          back: shortenCardAnswer(t.definition, 140),
        });
      }
    });

    // 4. Conclusão Clínica & Conduta
    const clinicalCards: Flashcard[] = [];
    const conc = analysis?.result?.clinicalConclusion;
    if (conc) {
      if (conc.summary) {
        clinicalCards.push({
          id: `card_tutoria_sum_${timestamp}`,
          front: `${cleanSubject}: Qual a síntese diagnóstica definitiva do caso?`,
          back: shortenCardAnswer(conc.summary, 140),
        });
      }
      if (conc.conductAndOutcome) {
        clinicalCards.push({
          id: `card_tutoria_cond_${timestamp}`,
          front: `${cleanSubject}: Qual o manejo terapêutico e conduta prioritária?`,
          back: shortenCardAnswer(conc.conductAndOutcome, 140),
        });
      }
      if (conc.clinicalReasoning) {
        clinicalCards.push({
          id: `card_tutoria_reas_${timestamp}`,
          front: `${cleanSubject}: Qual o raciocínio clínico integrativo central?`,
          back: shortenCardAnswer(conc.clinicalReasoning, 140),
        });
      }
    }

    // Fallback se learningQuestions estiver no markdown e não no array estruturado
    if (questionCards.length === 0 && currentContent) {
      const qMatches = currentContent.matchAll(/### Questão \d+:\s*([^\n]+)\n\n([\s\S]*?)(?=\n###|\n## |$)/g);
      let fIdx = 0;
      for (const m of qMatches) {
        fIdx++;
        questionCards.push({
          id: `card_tutoria_fallback_${timestamp}_${fIdx}`,
          front: cleanQuestionTitle(m[1].trim()),
          back: shortenCardAnswer(m[2].trim(), 150),
        });
      }
    }

    const totalCards = questionCards.length + hypothesisCards.length + termCards.length + clinicalCards.length;
    if (totalCards === 0) {
      toast.error("Nenhum dado estruturado suficiente para gerar flashcards desta tutoria.");
      return;
    }

    const createdDecks: Deck[] = [];
    const pushDeck = (subName: string, desc: string, cards: Flashcard[]) => {
      if (cards.length === 0) return;
      const deck: Deck = {
        id: `deck_tutoria_${timestamp}_${createdDecks.length}`,
        name: `${cleanSubject} • ${subName}`,
        description: desc,
        subject: cleanSubject,
        folderId: folder.id,
        cardCount: cards.length,
        cards,
        difficulty: "Médio",
      };
      createdDecks.push(deck);
      useAppStore.getState().addDeck(deck);
    };

    pushDeck("Questões de Aprendizagem", `Objetivos centrais e resoluções da tutoria de ${cleanSubject}.`, questionCards);
    pushDeck("Hipóteses & Diagnósticos", `Critérios de inclusão e exclusão diagnóstica de ${cleanSubject}.`, hypothesisCards);
    pushDeck("Termos & Fisiopatologia", `Termos desconhecidos e mecanismos de ${cleanSubject}.`, termCards);
    pushDeck("Conduta & Raciocínio Clínico", `Manejo clínico e condutas terapêuticas de ${cleanSubject}.`, clinicalCards);

    toast.success(`🎉 ${createdDecks.length} baralhos temáticos criados na pasta "${folder.name}" (${totalCards} flashcards objetivos)!`, {
      duration: 4500,
    });
  };

  /* ───── Gerar Questões Clínicas com IA a partir da Tutoria ───── */
  const handleGenerateQuestionsFromTutoria = async () => {
    setIsQuestionsLoading(true);
    const cleanSubject = extractCleanSubject(title, analysis?.title || "Tutoria");
    const folder = useAppStore.getState().getOrCreateFolder(cleanSubject, "both");
    const timestamp = Date.now();
    const toastId = toast.loading(`Elaborando questões clínicas detalhadas sobre "${cleanSubject}" com IA...`);

    try {
      const summaryContext = [
        `Tema: ${cleanSubject}`,
        title ? `Título do Caso: ${title}` : null,
        analysis?.result?.caseTranscription ? `Caso Clínico: ${analysis.result.caseTranscription.slice(0, 1500)}` : null,
        analysis?.result?.learningQuestions?.length
          ? `Objetivos de Aprendizagem: ${analysis.result.learningQuestions.map((q) => q.question).join(" | ")}`
          : null,
        analysis?.result?.clinicalConclusion?.summary
          ? `Síntese Diagnóstica: ${analysis.result.clinicalConclusion.summary}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Gere 6 questões de nível MÉDIO baseadas no caso clínico e objetivos de aprendizagem de "${cleanSubject}".
DIRETRIZES FUNDAMENTAIS:
1. Enunciados clínicos contextualizados, objetivos e bem elaborados (vinheta clínica ou caso prático conciso), evitando textos gigantescos desnecessários.
2. Dificuldade MÉDIA: raciocínio clínico, diagnóstico diferencial, condutas e propedêutica.
3. 5 alternativas (A a E) bem elaboradas com distratores médicos plausíveis e pertinentes ao tema (NUNCA genéricas).
4. QUESTÕES RANDOMIZADAS E NÃO ÓBVIAS: Distratores inteligentes e plausíveis. Varie naturalmente a extensão das alternativas, sem padrão repetitivo e sem fazer a correta ser sempre a mais longa.
5. Gabarito comentado com fundamentação clara.
Contexto:\n${summaryContext.slice(0, 8000)}`,
          count: 6,
          difficulty: "medium",
          type: "multiple_choice",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiQuestions = Array.isArray(data.questions) ? data.questions : [];
        if (aiQuestions.length > 0) {
          const formattedQuestions = aiQuestions.map((q: any, idx: number) => ({
            id: `q_tutoria_ai_${timestamp}_${idx}`,
            text: cleanQuestionTitle(q.question),
            type: "multiple-choice",
            difficulty: "Médio",
            subject: cleanSubject,
            folderId: folder.id,
            options: (q.options || []).map((opt: any) => ({
              id: opt.id || "a",
              text: opt.text || "",
            })),
            answer: q.answer || "a",
            explanation: q.explanation || "",
            date: "Hoje",
            status: "unanswered",
            timesAnswered: 0,
            timesCorrect: 0,
            timesIncorrect: 0,
          }));

          useAppStore.getState().addQuestions(formattedQuestions);
          toast.success(`🎉 ${formattedQuestions.length} questões clínicas adicionadas na pasta "${folder.name}"!`, {
            id: toastId,
            duration: 4000,
          });
          return;
        }
      }
      throw new Error("Não foi possível gerar questões no momento.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar questões.", { id: toastId });
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  /* ───── Gerar Mapa Mental Conceitual da Tutoria ───── */
  const handleGenerateMindMapFromTutoria = async () => {
    setIsMapLoading(true);
    const toastId = toast.loading("Construindo mapa mental da Tutoria...");
    try {
      const cleanSubject = extractCleanSubject(title, analysis?.title || "Tutoria");
      const prompt = `Mapa mental conceitual médico da Tutoria Clínica "${title || cleanSubject}". Síntese clínica: ${title || cleanSubject}. Ramos fundamentais: Caso Clínico, Hipóteses Diagnósticas, Questões de Aprendizagem, Diagnóstico Diferencial, Conduta e Tratamento. Seja preciso, conciso (máximo 5 palavras por nó) e profissional.\n\nConteúdo:\n${currentContent.slice(0, 14000)}`;

      const res = await fetch("/api/ai/generate-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, colorTheme: "green", layout: "free", expand: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar mapa mental.");
      }

      const data = await res.json();
      const mindMapData = {
        title: data.title || title || "Mapa Mental da Tutoria",
        nodes: data.nodes || [],
        edges: data.edges || [],
      };

      if (analysis) {
        onUpdateAnalysis?.({ mindMap: mindMapData });
        useAppStore.getState().updateTutoriaAnalysis(analysis.id, { mindMap: mindMapData });
      }

      setViewMode("mindmap");
      toast.success("Mapa mental pronto!", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Erro no mapa mental.", { id: toastId });
    } finally {
      setIsMapLoading(false);
    }
  };

  // Helper for inline markdown rendering
  const renderInlineMarkdown = (raw: string) => {
    const spans = parseInlineSpans(raw);
    return spans.map((span, i) => {
      if (span.type === "bold") {
        return (
          <strong key={i} className="font-bold text-gray-950 dark:text-white">
            {renderInlineMarkdown(span.content)}
          </strong>
        );
      }
      if (span.type === "italic") {
        return (
          <em key={i} className="italic text-gray-800 dark:text-gray-300">
            {renderInlineMarkdown(span.content)}
          </em>
        );
      }
      if (span.type === "color") {
        const cleanCol = cleanCssVal(span.color);
        return (
          <span key={i} style={cleanCol ? { color: cleanCol } : undefined} className="font-semibold">
            {renderInlineMarkdown(span.content)}
          </span>
        );
      }
      if (span.type === "mark") {
        if (!span.content || !span.content.trim()) return null;
        const cleanBg = cleanCssVal(span.bgColor) || "#FEF08A";
        const cleanCol = cleanCssVal(span.color) || "#0F172A";
        return (
          <mark
            key={i}
            style={{
              backgroundColor: cleanBg,
              color: cleanCol,
            }}
            className="px-1 py-0.5 rounded font-medium"
          >
            {renderInlineMarkdown(span.content)}
          </mark>
        );
      }
      if (span.type === "underline") {
        if (!span.content || !span.content.trim()) return null;
        return <u key={i}>{renderInlineMarkdown(span.content)}</u>;
      }
      return <React.Fragment key={i}>{span.content}</React.Fragment>;
    });
  };

  // Helper for item content with clean layout (no badge pills)
  const renderItemContent = (text: string) => {
    let body = cleanLatexAndBadges(text);
    // Strip empty HTML tags and orphan symbols
    body = body
      .replace(/<mark(?:\s+[^>]*)?>\s*<\/mark>/gi, "")
      .replace(/<span(?:\s+[^>]*)?>\s*<\/span>/gi, "")
      .replace(/^\s*(?:—\s*)+\s*:\s*/, "")
      .replace(/^\s*:\s*/, "");
    // Strip any leading badge pill tag (e.g. [Fisiológico], [Patológico], [Correlação Clínica])
    body = body.replace(/^\s*\[[A-Za-zÀ-ÖØ-öø-ÿ\s]{3,25}\]\s*/, "");
    // Strip unnecessary boilerplate contextualization attribution prefixes
    body = body.replace(/^\s*(?:\*\*)?(?:Contextualização\s+(?:Fisiopatológica[,\s]*Histológica\s+e\s+Epidemiológica\s+Abrangente|Fisiopatológica[^\n:*]*|Histológica[^\n:*]*|Epidemiológica[^\n:*]*|Abrangente|Objetiva|Clínica)|Contextualização)(?:\*\*)?\s*:\s*/i, "");

    // Check for Curiosidade / Curiosidade Clínica
    const curiosidadeMatch = body.match(/^\s*(?:\*\*)?Curiosidade(?:\s+Clínica)?(?:\*\*)?(\s*:\s*)(.*)$/i);
    if (curiosidadeMatch) {
      const expl = curiosidadeMatch[2].trim().replace(/^\*\*\s*/, "");
      return (
        <div className="my-2.5 p-3.5 sm:p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/50 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm sm:text-base mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Curiosidade Clínica</span>
          </div>
          <div className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-amber-950/90 dark:text-amber-100/90">
            {renderInlineMarkdown(expl)}
          </div>
        </div>
      );
    }

    const boldColonMatch = body.match(/^\s*\*\*([^*]+)\*\*(\s*(?:->|→|&rarr;|:)\s*)(.*)$/);
    const spanColonMatch = !boldColonMatch && body.match(/^\s*(<span\b[^>]*>[\s\S]*?<\/span>)\s*(:)\s*(.*)$/i);
    const plainColonMatch = !boldColonMatch && !spanColonMatch && !body.trim().startsWith("<") && !/<[a-zA-Z][^>]*:[^>]*>/.test(body.slice(0, 60))
      ? body.match(/^\s*([^<*:\->—\n]{2,60})(\s*(?:->|→|&rarr;|:)\s*)(.*)$/)
      : null;
    const colonOrArrowMatch = boldColonMatch || spanColonMatch || plainColonMatch;
    if (colonOrArrowMatch) {
      const term = colonOrArrowMatch[1].trim().replace(/\*\*/g, "");
      const isArrow = colonOrArrowMatch[2].includes("->") || colonOrArrowMatch[2].includes("→");
      const expl = colonOrArrowMatch[3].trim().replace(/^\*\*\s*/, "");

      return (
        <span className="text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-gray-800 dark:text-gray-200 inline">
          <strong className="font-bold text-gray-950 dark:text-white mr-1.5">
            {renderInlineMarkdown(term)}{isArrow ? "" : ":"}
          </strong>
          {isArrow && (
            <span className="text-blue-500/80 dark:text-blue-400 font-semibold mx-1.5 select-none">
              -&gt;
            </span>
          )}
          <span>{renderInlineMarkdown(expl)}</span>
        </span>
      );
    }

    return (
      <span className="text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-gray-800 dark:text-gray-200 inline">
        {renderInlineMarkdown(body)}
      </span>
    );
  };

  // Parse lines of markdown into structured render blocks
  const lines = currentContent.split("\n");

  const renderDocumentLines = () => {
    const elements: React.ReactNode[] = [];
    const hasH1 = lines.some((l) => l.trim().startsWith("# "));
    let headingCounter = 0;

    if (!hasH1 && displayTitle) {
      elements.push(
        <h1
          key="h1-top-title"
          className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight pb-3 border-b border-slate-200 dark:border-slate-800 mt-2 mb-6"
        >
          {displayTitle}
        </h1>
      );
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={`empty-${idx}`} className="h-1.5" />);
        continue;
      }

      // H1: Document Main Title
      if (trimmed.startsWith("# ")) {
        const headingId = `heading-sec-${headingCounter++}`;
        elements.push(
          <h1
            key={`h1-${idx}`}
            id={headingId}
            className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight pb-3 border-b border-slate-200 dark:border-slate-800 mt-2 mb-6 scroll-mt-24"
          >
            {renderInlineMarkdown(trimmed.replace(/^#\s+/, ""))}
          </h1>
        );
        continue;
      }

      // H2: Major Section Heading (e.g. ## Caso Clínico, ## Termos e Perguntas Desconhecidas)
      if (trimmed.startsWith("## ")) {
        const text = trimmed.replace(/^##\s+/, "");
        const headingId = `heading-sec-${headingCounter++}`;
        elements.push(
          <h2
            key={`h2-${idx}`}
            id={headingId}
            className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-8 mb-3 flex items-center gap-2.5 scroll-mt-24"
          >
            <span className="w-2 h-6 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
            <span>{renderInlineMarkdown(text)}</span>
          </h2>
        );
        continue;
      }

      // H5 Sub-section heading (##### Detalhe)
      if (trimmed.startsWith("##### ")) {
        const text = trimmed.replace(/^#####\s+/, "");
        elements.push(
          <h5
            key={`h5-${idx}`}
            className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mt-4 mb-1.5 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{renderInlineMarkdown(text)}</span>
          </h5>
        );
        continue;
      }

      // H3: Major Learning Question or Subsection
      if (trimmed.startsWith("### ")) {
        let text = trimmed.replace(/^###\s+/, "");
        // Clean duplicate question numbering if present (e.g., "Questão 1: 1. Pergunta" -> "Questão 1: Pergunta")
        text = text.replace(/^(Quest[aã]o\s+\d+)\s*[:.\-–)]*\s*(?:\d+\s*[:.\-–)]*\s*)+/i, "$1: ");
        const headingId = `heading-sec-${headingCounter++}`;

        elements.push(
          <h3
            key={`h3-${idx}`}
            id={headingId}
            className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-6 mb-2 scroll-mt-24"
          >
            {renderInlineMarkdown(text)}
          </h3>
        );
        continue;
      }

      // H4 Sub-subsection (#### Subseção / #### Tópico / #### Curiosidade)
      if (trimmed.startsWith("#### ")) {
        const text = trimmed.replace(/^####\s+/, "");
        const isCuriosidade = /curiosidade/i.test(text);
        const cleanHeading = text.replace(/^\d+\.\s*/, "");
        const headingId = `heading-sec-${headingCounter++}`;

        if (isCuriosidade) {
          elements.push(
            <div
              key={`h4-${idx}`}
              id={headingId}
              className="mt-6 mb-3 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/50 shadow-xs scroll-mt-24"
            >
              <h4 className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{renderInlineMarkdown(cleanHeading)}</span>
              </h4>
            </div>
          );
          continue;
        }

        elements.push(
          <h4
            key={`h4-${idx}`}
            id={headingId}
            className="text-[15.5px] sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mt-5 mb-1.5 scroll-mt-24"
          >
            {renderInlineMarkdown(cleanHeading)}
          </h4>
        );
        continue;
      }

      // Callout Box (Lines starting with ">")
      if (trimmed.startsWith(">")) {
        const calloutLines: string[] = [];
        let j = idx;
        while (j < lines.length && lines[j].trim().startsWith(">")) {
          const cLine = lines[j].trim().replace(/^>\s*/, "");
          if (cLine) calloutLines.push(cLine);
          j++;
        }
        idx = j - 1; // Advance loop index to skip consumed lines
        const calloutText = calloutLines.join(" ");
        elements.push(
          <div
            key={`callout-${idx}`}
            className="my-4 p-4 rounded-xl border-l-4 border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-400 text-gray-800 dark:text-gray-200 text-xs sm:text-sm shadow-xs"
          >
            {renderInlineMarkdown(calloutText)}
          </div>
        );
        continue;
      }

      // Markdown Table (Lines containing | ... |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines: string[] = [];
        let j = idx;
        while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
          tableLines.push(lines[j].trim());
          j++;
        }
        idx = j - 1; // Advance loop index so the table is ONLY parsed and rendered ONCE!

        const rows = tableLines
          .filter((l) => !/^\|[\s\-:|]+\|$/.test(l))
          .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

        if (rows.length > 0) {
          const rawTableMarkdown = tableLines.join("\n");
          elements.push(
            <div key={`table-${idx}`} className="my-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1A1D27]">
              <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-900/10 dark:bg-emerald-950/30 border-b border-emerald-800/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <TableIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Quadro Comparativo</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyTableRichText(rawTableMarkdown);
                    if (ok) {
                      toast.success("Tabela copiada com formatação para Word, Excel, Docs ou Notion!", { icon: "📊" });
                    } else {
                      toast.error("Erro ao copiar tabela.");
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  title="Copiar tabela formatada para Word, Excel, Google Docs ou Notion"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Tabela</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm sm:text-[14.5px] text-left border-collapse border border-gray-200 dark:border-gray-800">
                  <thead className="bg-emerald-800 dark:bg-emerald-950 text-white">
                    <tr>
                      {rows[0].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3.5 font-bold border-b border-emerald-700/60 dark:border-emerald-800/60 text-white tracking-wide"
                        >
                          {renderInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800/80">
                    {rows.slice(1).map((r, rI) => (
                      <tr
                        key={rI}
                        className={`${
                          rI % 2 === 1
                            ? "bg-gray-50/70 dark:bg-[#141722]"
                            : "bg-white dark:bg-[#1A1D27]"
                        } hover:bg-emerald-50/40 dark:hover:bg-emerald-950/25 transition-colors`}
                      >
                        {r.map((c, cI) => (
                          <td
                            key={cI}
                            className={`px-4 py-3.5 border-b border-gray-100 dark:border-gray-800/60 ${
                              cI === 0
                                ? "font-semibold text-gray-950 dark:text-emerald-300 bg-gray-50/40 dark:bg-[#161924]"
                                : "text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {renderInlineMarkdown(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          continue;
        }
      }

      // Markdown Image (![alt](url))
      const imgMatch = trimmed.match(/^[\*\-]?\s*!\[(.*?)\]\((.*?)\)/) || trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const alt = imgMatch[1] || "Imagem";
        const src = imgMatch[2];
        elements.push(
          <figure
            key={`img-${idx}`}
            className="my-5 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#12141c] text-center shadow-xs"
          >
            <div className="relative inline-block max-w-full">
              <img
                src={src}
                alt={alt}
                onClick={() => {
                  setZoomImageUrl(src);
                  setZoomImageCaption(alt);
                }}
                className="max-h-[500px] w-auto max-w-full rounded-xl mx-auto object-contain cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setZoomImageUrl(src);
                  setZoomImageCaption(alt);
                }}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs backdrop-blur-xs transition-colors cursor-pointer"
                title="Ampliar imagem"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            {alt && alt !== "Imagem" && alt !== "Imagem Colada" && alt !== "Imagem Anexa" && (
              <figcaption className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                {alt}
              </figcaption>
            )}
          </figure>
        );
        continue;
      }

      // Bullet item
      const bulletMatch = line.match(/^(\s*)([\*\-])\s+(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1].length;
        const isNested = indent >= 2;
        const bodyText = bulletMatch[3];

        elements.push(
          <div
            key={`bullet-${idx}`}
            className={`flex items-start gap-2.5 ${
              isNested ? "ml-5 sm:ml-7 my-1.5" : "ml-0.5 my-2"
            }`}
          >
            <span className="text-emerald-600 dark:text-emerald-400 select-none text-base leading-snug shrink-0">
              •
            </span>
            <div className="flex-1 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-gray-800 dark:text-gray-200">
              {renderItemContent(bodyText)}
            </div>
          </div>
        );
        continue;
      }

      // Standalone Topic / Subsection title (e.g. "Repercussões:", "Fatores de Risco e Genética:", "Consulta com a urologia")
      const isTopicTitle = (
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("|") &&
        !trimmed.startsWith(">") &&
        !trimmed.startsWith("!") &&
        (
          (trimmed.endsWith(":") && trimmed.length <= 95 && !/^\d+\./.test(trimmed)) ||
          (/^(\*\*[^*]+\*\*):?$/.test(trimmed) && trimmed.length <= 95) ||
          (/^(Consulta|Diagnóstico|Conduta|Prognóstico|Exames|Tratamento|Mecanismo|Fisiopatologia|Quadro Clínico|Epidemiologia|Etiologia|Repercussões|Sintomas|Prevenção)\b/i.test(trimmed) && trimmed.length <= 80 && !trimmed.includes(". "))
        )
      );

      if (isTopicTitle) {
        elements.push(
          <h4
            key={`topic-${idx}`}
            className="mt-6 mb-2.5 text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight"
          >
            {renderInlineMarkdown(trimmed)}
          </h4>
        );
        continue;
      }

      // Numbered item (supports 1., 1.1, 1.x, 2.y, etc., with indent support)
      const numMatch = line.match(/^(\s*)(\d+(?:\.[\w\d]+)*)\.?\s+(.*)$/);
      if (numMatch) {
        const indent = numMatch[1]?.length || 0;
        const isNested = indent >= 2;
        const numLabel = numMatch[2];
        const bodyText = numMatch[3];

        const isStandaloneTitle = !isNested && /^\d+$/.test(numLabel) && !bodyText.includes(":") && bodyText.length < 85;
        const isStepExplanation = /^(Etapa|Fase|Passo|Mecanismo\s+\d|Via\s+\d|\d+\.\d+)\b/i.test(bodyText) || /^\d+\.\d+/.test(numLabel);
        const isTopicHeading = !isNested && (
          isStandaloneTitle ||
          /^(Síndrome|Grandes\s+Síndromes|Eixo|Pilar|Abordagem|Conceito|Classificação|Etiologia|Fisiopatologia|Diagnóstico|Tratamento|Manejo|Repercussões|Prevenção)\b/i.test(bodyText)
        );

        if (isTopicHeading && !isStepExplanation) {
          elements.push(
            <h4
              key={`topic-${idx}`}
              className="mt-6 mb-2.5 text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
              <span>{renderInlineMarkdown(bodyText)}</span>
            </h4>
          );
          continue;
        }

        // Standard numbered item: number and title bold, explanation in normal body font (reserved for steps and cascades)
        elements.push(
          <div
            key={`num-${idx}`}
            className={`flex items-start gap-2.5 ${
              isNested ? "ml-5 sm:ml-7 my-1.5" : "ml-0.5 my-2.5"
            }`}
          >
            <span className="font-bold text-emerald-700 dark:text-emerald-400 select-none text-[15px] sm:text-[16px] md:text-[16.5px] shrink-0 leading-relaxed">
              {numLabel}.
            </span>
            <div className="flex-1 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-gray-800 dark:text-gray-200">
              {renderItemContent(bodyText)}
            </div>
          </div>
        );
        continue;
      }

      // Normal paragraph (stripping any stray contextualization attribution)
      const cleanPara = trimmed.replace(
        /^(?:\*\*)?(?:Contextualização\s+(?:Fisiopatológica[,\s]*Histológica\s+e\s+Epidemiológica\s+Abrangente|Fisiopatológica[^\n:*]*|Histológica[^\n:*]*|Epidemiológica[^\n:*]*|Abrangente|Objetiva|Clínica)|Contextualização)(?:\*\*)?\s*:\s*/i,
        ""
      );
      if (!cleanPara.trim()) continue;

      elements.push(
        <p
          key={`p-${idx}`}
          className="text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200 my-2.5"
        >
          {renderInlineMarkdown(cleanPara)}
        </p>
      );
    }
    return elements;
  };

  const rawSubtitle =
    analysis?.result?.clinicalConclusion?.summary ||
    analysis?.result?.clinicalConclusion?.clinicalReasoning ||
    analysis?.userNotes ||
    "";

  const subtitle = rawSubtitle
    ? rawSubtitle.replace(/<[^>]*>/g, "").replace(/\*\*/g, "").trim()
    : "";

  const conciseSubtitle = React.useMemo(() => {
    if (!subtitle) return "";
    // Extrai no máximo 1 a 2 sentenças curtas e objetivas
    const sentences = subtitle.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      let combined = sentences[0].trim();
      if (sentences.length > 1 && (combined.length + sentences[1].trim().length) <= 220) {
        combined += " " + sentences[1].trim();
      }
      return combined;
    }
    if (subtitle.length > 200) {
      return subtitle.slice(0, 197).trim() + "...";
    }
    return subtitle;
  }, [subtitle]);

  const displayTitle = title || analysis?.title || "Resolução de Tutoria Clínica";

  return (
    <div className="space-y-6">
      {/* ──────────────────────── Top Dossier Header (Idêntico ao Ateliê) ──────────────────────── */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-[#12151e]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 max-w-5xl">
            {selectedBookTitles && selectedBookTitles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40"
                  title={selectedBookTitles.join(", ")}
                >
                  <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  {selectedBookTitles.length === 1
                    ? `Referência: ${selectedBookTitles[0]}`
                    : `${selectedBookTitles.length} Livros de Referência`}
                </span>
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {displayTitle}
            </h1>

            {conciseSubtitle && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {conciseSubtitle}
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            {(fileUrl || analysis?.fileUrl) && onViewPdf && (
              <button
                type="button"
                onClick={onViewPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors shadow-2xs cursor-pointer"
                title="Visualizar PDF original anexado"
              >
                <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Visualizar PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateFlashcardsFromTutoria}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors shadow-2xs cursor-pointer"
              title="Gerar baralho de Flashcards a partir da Tutoria"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Flashcards</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateQuestionsFromTutoria}
              disabled={isQuestionsLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
              title="Gerar Questões detalhadas a partir da Tutoria"
            >
              {isQuestionsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-400" />
              ) : (
                <HelpCircle className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              )}
              <span>{isQuestionsLoading ? "Elaborando..." : "Questões"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (viewMode === "mindmap") {
                  setViewMode("document");
                } else if (analysis?.mindMap && analysis.mindMap.nodes.length > 0) {
                  setViewMode("mindmap");
                } else {
                  handleGenerateMindMapFromTutoria();
                }
              }}
              disabled={isMapLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
              title="Gerar ou visualizar mapa mental da Tutoria"
            >
              {isMapLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              ) : (
                <GitBranch className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{viewMode === "mindmap" ? "Ver Tutoria" : analysis?.mindMap ? "Ver Mapa Mental" : "Mapa Mental"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Card do Arquivo / Situação-Problema Anexada (Visualização do PDF) */}
      {(fileUrl || analysis?.fileUrl) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#12151e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/40">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                  {fileName?.toLowerCase().endsWith(".pdf") ? "PDF Anexado" : /\.(png|jpe?g|webp)$/i.test(fileName || "") ? "Imagem do Caso" : "Caso Clínico da Tutoria"}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5" title={fileName}>
                {fileName || "Caso Clínico Original"}
              </p>
              {analysis?.fileSize && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {(analysis.fileSize / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onViewPdf && (
              <button
                type="button"
                onClick={onViewPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{/\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName || "") ? "Visualizar Imagem" : fileName?.toLowerCase().endsWith(".pdf") ? "Visualizar PDF" : "Visualizar Arquivo"}</span>
              </button>
            )}

            <a
              href={fileUrl || analysis?.fileUrl}
              download={fileName || "caso_tutoria.pdf"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Baixar caso original"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Original</span>
            </a>
          </div>
        </div>
      )}

      {/* Editor or Formatted Display or Mind Map */}
      {viewMode === "mindmap" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => setViewMode("document")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              &larr; Voltar para a Resolução da Tutoria
            </button>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Mapa Mental Conceitual
            </span>
          </div>

          {analysis?.mindMap && analysis.mindMap.nodes.length > 0 ? (
            <EmbeddedMindMapView
              data={{
                title: analysis.mindMap.title || title || "Mapa Mental da Tutoria",
                summary: title,
                nodes: analysis.mindMap.nodes,
                edges: analysis.mindMap.edges,
              }}
            />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#1A1D27] shadow-sm space-y-4">
              <GitBranch className="mx-auto h-10 w-10 text-emerald-500" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Mapa Mental Conceitual da Tutoria
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Transforme os objetivos, termos, hipóteses e condutas desta Tutoria em nós visuais interativos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateMindMapFromTutoria}
                disabled={isMapLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {isMapLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>Gerar Mapa Mental</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Action Toolbar - Caso Clínico */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#12151e]">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Caso Clínico
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Texto acadêmico contínuo e aprofundado, formatado para leitura fluida e exportação
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status de Salvamento Automático */}
              {/* Indicador de Edição Direta e Autosave */}
              {saveStatus === "saving" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-2xs">
                  <Check className="w-3.5 h-3.5" />
                  <span>Edição direta ativa • Salvo automaticamente</span>
                </span>
              )}

              {/* Copiar */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm",
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60"
                )}
                title="Copiar caso clínico"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>

              {/* Exportar PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-sm shadow-emerald-500/20"
                title="Exportar Caso Clínico como PDF"
              >
                {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                <span>{isExportingPdf ? "Exportando..." : "Exportar PDF"}</span>
              </button>

              {/* Aprofundar com IA */}
              <button
                type="button"
                onClick={handleAprofundarComIA}
                disabled={isDeepeningLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeepeningLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Aprofundar com IA</span>
              </button>
            </div>
          </div>

          {/* Document Workspace (Direct in-place editing active with Floating Tools on Left & NotionOutline on Right) */}
          <div className="relative w-full md:max-w-[calc(100%-108px)] lg:max-w-[880px] mx-auto">
            {/* Sumário Balão Flutuante do Lado Direito (Hover-to-Open, Sem Alterar Proporção do Texto) */}
            <NotionOutline
              content={currentContent}
              accentColor="emerald"
            />

            <RichTextEditor
              value={editedText || localContent}
              onChange={handleEditorChange}
              theme="esmeralda"
              placeholder="Clique em qualquer lugar para editar o caso clínico diretamente..."
              minHeight="580px"
            />
          </div>
        </div>
      )}

      {/* Lightbox Modal para Ampliar Imagens */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in cursor-pointer"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomImageUrl}
              alt={zoomImageCaption || "Zoom"}
              className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            {zoomImageCaption && zoomImageCaption !== "Imagem" && (
              <p className="text-white text-xs sm:text-sm font-medium mt-3 bg-black/60 px-4 py-1.5 rounded-full">
                {zoomImageCaption}
              </p>
            )}
            <button
              type="button"
              onClick={() => setZoomImageUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
