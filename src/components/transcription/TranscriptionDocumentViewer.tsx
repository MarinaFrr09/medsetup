"use client";

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Copy,
  Check,
  FileDown,
  Zap,
  Pencil,
  RotateCcw,
  X,
  Save,
  Eye,
  Image as ImageIcon,
  Link2,
  ZoomIn,
  Sparkles,
  Lightbulb,
  Table as TableIcon,
  FileText,
  Loader2,
} from "lucide-react";
import { copyRichText, copyTableRichText } from "@/lib/notion-export";
import { exportDocumentToProfessionalPdf, cleanLatexAndBadges } from "@/lib/pdf-export";
import { getThemePalette } from "@/lib/theme-palettes";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface TranscriptionDocumentViewerProps {
  content?: string;
  transcription?: string;
  summary?: string;
  title?: string;
  expanded?: boolean;
  /** Renders only the off-screen A4 print sheet (no toolbar / visible document). Useful with the ref handle. */
  printOnly?: boolean;
  /** Enable inline editing of the generated text */
  editable?: boolean;
  /** Callback fired when user saves changes */
  onSaveContent?: (newContent: string, mode?: "transcription" | "summary") => void;
  /** Optional fileUrl to view the original attached PDF/document */
  fileUrl?: string;
  /** Optional fileName for the original attached PDF/document */
  fileName?: string;
  /** Optional callback to open the PDF preview modal */
  onViewPdf?: () => void;
  /** Paleta de cores para PDF e visualização (roxo, vermelho, cinza, azul, esmeralda) */
  theme?: "roxo" | "vermelho" | "cinza" | "azul" | "esmeralda" | string;
  /** Prefixo/categoria do documento no nome do PDF (ex: Transcricao, Gravacao, Quadro) */
  categoryLabel?: string;
  /** Callback opcional para restaurar o texto original gerado */
  onRestoreOriginal?: () => void;
  /** Callback opcional para gerar Resumo Master Pro sob demanda */
  onGenerateSummary?: () => Promise<void>;
  /** Indicador de carregamento da geração do Resumo Master */
  isGeneratingSummary?: boolean;
}

export interface TranscriptionViewerHandle {
  exportPdf: () => Promise<void>;
}

/**
 * Strips out AI-generated meta-introductions (e.g. "Este documento aborda...",
 * "Documento de estudo abordando...") so the transcription begins directly
 * with the document title and its actual topics.
 */
export function cleanTranscriptionContent(raw: string): string {
  if (!raw) return "";
  const sanitized = cleanLatexAndBadges(raw);
  const lines = sanitized.split("\n");
  const filteredLines: string[] = [];
  let skippingIntroParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (skippingIntroParagraph) {
      if (
        !trimmed ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("!") ||
        /^\d+\./.test(trimmed)
      ) {
        skippingIntroParagraph = false;
        if (!trimmed) continue;
      } else {
        continue;
      }
    }

    if (trimmed.startsWith("# ")) {
      filteredLines.push(line);
      continue;
    }

    // Detect generic meta-descriptions
    const isMetaIntro = /^(?:este documento aborda|documento de estudo abordando|o presente documento|este material aborda|o documento aborda|este resumo aborda|o presente material|este trabalho aborda|neste documento são abordados|documento abordando|visão geral do documento|neste estudo são abordados|este texto aborda|este conteúdo aborda|o objetivo deste documento)/i.test(
      trimmed
    );

    if (isMetaIntro) {
      skippingIntroParagraph = true;
      continue;
    }

    // Filter out page number headers like "## Página 6", "Página 6", "**Página 6**"
    if (/^(?:#{1,6}\s+|\*\*)?P[áa]gina\s+\d+(?:\*\*)?\s*$/i.test(trimmed)) {
      if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === "---") {
        filteredLines.pop();
      }
      continue;
    }

    // Prevent duplicate consecutive dividers
    if (trimmed === "---" && filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === "---") {
      continue;
    }

    filteredLines.push(line);
  }

  return filteredLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

interface InlineSpan {
  type: "text" | "bold" | "italic" | "color" | "mark" | "underline";
  content: string;
  color?: string;
  bgColor?: string;
}

function cleanCssVal(val?: string): string | undefined {
  if (!val) return undefined;
  return val.replace(/[;\s]+$/, "").trim();
}

/** Parses markdown tokens (bold, italic, colors, highlights, underline) and eliminates dangling raw asterisks */
function parseInlineSpans(text: string): InlineSpan[] {
  if (!text) return [];
  const result: InlineSpan[] = [];
  const regex = /(<span\s+style=["']color:\s*([^"';]+)[^"']*["']\s*>([\s\S]*?)<\/span>|<mark(?:\s+style=["']background-color:\s*([^"';]+)[^"']*["'])?\s*>([\s\S]*?)<\/mark>|<u>([\s\S]*?)<\/u>|\*\*([^*]+)\*\*|(?<!\*)\*([^*]+)\*(?!\*))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index).replace(/\*\*/g, "");
      if (plain) result.push({ type: "text", content: plain });
    }
    const [, , spanColor, spanContent, markBg, markContent, uContent, boldContent, italicContent] = match;

    if (spanColor !== undefined && spanContent !== undefined) {
      result.push({ type: "color", color: cleanCssVal(spanColor), content: spanContent });
    } else if (markContent !== undefined) {
      result.push({ type: "mark", bgColor: cleanCssVal(markBg) || "#FEF08A", content: markContent });
    } else if (uContent !== undefined) {
      result.push({ type: "underline", content: uContent });
    } else if (boldContent !== undefined) {
      result.push({ type: "bold", content: boldContent });
    } else if (italicContent !== undefined) {
      result.push({ type: "italic", content: italicContent });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const plain = text.slice(lastIndex).replace(/\*\*/g, "");
    if (plain) result.push({ type: "text", content: plain });
  }

  return result.length > 0 ? result : [{ type: "text", content: text.replace(/\*\*/g, "") }];
}

const TranscriptionDocumentViewer = forwardRef<TranscriptionViewerHandle, TranscriptionDocumentViewerProps>(
function TranscriptionDocumentViewer({
  content,
  transcription,
  summary,
  title,
  expanded,
  printOnly = false,
  editable = true,
  onSaveContent,
  fileUrl,
  fileName,
  onViewPdf,
  theme = "roxo",
  categoryLabel,
  onRestoreOriginal,
  onGenerateSummary,
  isGeneratingSummary = false,
}: TranscriptionDocumentViewerProps, ref) {
  const palette = getThemePalette(theme);
  const activeTheme = palette.id;
  const documentRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [zoomImageCaption, setZoomImageCaption] = useState<string>("");

  const activeRawText = content ?? transcription ?? summary ?? "";
  const cleanedContent = isEditing ? editedText : cleanTranscriptionContent(activeRawText);

  useEffect(() => {
    setEditedText(cleanTranscriptionContent(activeRawText));
  }, [activeRawText]);

  const handleCopy = async () => {
    const success = await copyRichText(cleanedContent);
    if (success) {
      setCopied(true);
      toast.success("Copiado com formatação perfeita para qualquer aplicativo!", {
        icon: "📋",
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("Não foi possível copiar para a área de transferência.");
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    const toastId = toast.loading("Gerando PDF com formatação original vetorial...");

    try {
      const baseName = (fileName || title || "Documento").replace(/\.[^/.]+$/, "").trim();
      const defaultCategory =
        categoryLabel ||
        (activeTheme === "vermelho"
          ? "Gravacao"
          : activeTheme === "cinza"
          ? "Quadro"
          : activeTheme === "azul"
          ? "Atelie"
          : activeTheme === "esmeralda"
          ? "Tutoria"
          : "Transcricao");
      const resolvedCategory = defaultCategory;
      const filename = `${baseName} ${resolvedCategory}.pdf`;

      await exportDocumentToProfessionalPdf({
        title: title || `${resolvedCategory} de Estudo`,
        content: cleanedContent,
        filename,
        expanded,
        theme: activeTheme,
      });
      toast.success("PDF profissional gerado com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF.", { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  useImperativeHandle(ref, () => ({ exportPdf: handleExportPdf }));

  const handleStartEditing = () => {
    setEditedText(cleanedContent);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setEditedText(cleanTranscriptionContent(activeRawText));
    setIsEditing(false);
  };

  const handleSaveEditing = () => {
    setIsEditing(false);
    onSaveContent?.(editedText, "transcription");
    toast.success("Alterações salvas com sucesso!", { icon: "💾" });
  };

  // Helper for inline markdown rendering (Bold, Italic, stripped dangling **)
  const renderInlineMarkdown = (raw: string) => {
    const spans = parseInlineSpans(raw);
    return spans.map((span, i) => {
      if (span.type === "bold") {
        return (
          <strong key={i} className="font-bold text-gray-950 dark:text-white">
            {span.content}
          </strong>
        );
      }
      if (span.type === "italic") {
        return (
          <em key={i} className="italic text-gray-800 dark:text-gray-300">
            {span.content}
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
        const cleanBg = cleanCssVal(span.bgColor) || "#FEF08A";
        return (
          <mark key={i} style={{ backgroundColor: cleanBg }} className="px-1 py-0.5 rounded text-gray-950 font-medium">
            {renderInlineMarkdown(span.content)}
          </mark>
        );
      }
      if (span.type === "underline") {
        return <u key={i}>{renderInlineMarkdown(span.content)}</u>;
      }
      return <React.Fragment key={i}>{span.content}</React.Fragment>;
    });
  };

  // Helper for item content on screen with clean layout (no badge pills)
  const renderItemContent = (text: string) => {
    let body = cleanLatexAndBadges(text);
    // Strip any leading badge pill tag (e.g. [Fisiológico], [Patológico], [Correlação Clínica])
    body = body.replace(/^\s*\[[A-Za-zÀ-ÖØ-öø-ÿ\s]{3,25}\]\s*/, "");

    const arrowInsideBold = body.match(/^\s*\*\*([^*]+?)\s*(?:->|→|&rarr;)\*\*\s*(.*)$/);
    const arrowOutsideBold = body.match(/^\s*\*\*([^*]+?)\*\*\s*(?:->|→|&rarr;)\s*(.*)$/);
    const colonInsideBold = body.match(/^\s*\*\*([^*]+?):\*\*\s*(.*)$/);
    const colonOutsideBold = body.match(/^\s*\*\*([^*]+?)\*\*\s*:\s*(.*)$/);
    const plainArrowMatch = !arrowInsideBold && !arrowOutsideBold && body.match(/^\s*([^<*:\->—\n]{2,60})\s*(?:->|→|&rarr;)\s*(.*)$/);
    const plainColonMatch = !colonInsideBold && !colonOutsideBold && !body.trim().startsWith("<") && !/<[a-zA-Z][^>]*:[^>]*>/.test(body.slice(0, 60))
      ? body.match(/^\s*([^<*:\->—\n]{2,60}):\s*(.*)$/)
      : null;

    const arrowM = arrowInsideBold || arrowOutsideBold || plainArrowMatch;
    const colonM = colonInsideBold || colonOutsideBold || plainColonMatch;

    if (arrowM) {
      const term = arrowM[1].trim();
      const rest = arrowM[2].trim();
      return (
        <span className="text-[13.5px] sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200 inline-flex flex-wrap items-baseline">
          <strong className="font-bold text-gray-950 dark:text-white mr-1.5">
            {term}
          </strong>
          <span className={`font-semibold mx-1.5 select-none ${palette.tailwind.minorText}`}>
            -&gt;
          </span>
          <span>{renderInlineMarkdown(rest)}</span>
        </span>
      );
    }

    if (colonM) {
      const term = colonM[1].trim();
      const rest = colonM[2].trim();
      return (
        <span className="text-[13.5px] sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200 inline-flex flex-wrap items-baseline">
          <strong className="font-bold text-gray-950 dark:text-white mr-1.5">
            {term}:
          </strong>
          <span>{renderInlineMarkdown(rest)}</span>
        </span>
      );
    }

    return (
      <span className="text-[13.5px] sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200 inline-flex flex-wrap items-baseline">
        {renderInlineMarkdown(body)}
      </span>
    );
  };

  // Render on-screen document lines with balanced scale & full heading support
  const renderDocumentLines = () => {
    const lines = cleanedContent.split("\n");
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      // Markdown Image (![alt](url))
      const imgMatch = trimmed.match(/^[\*\-]?\s*!\[(.*?)\]\((.*?)\)/) || trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const alt = imgMatch[1] || "";
        const src = imgMatch[2];
        elements.push(
          <figure key={`img-${idx}`} className="my-5 flex flex-col items-center">
            <div className="relative group max-w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141c]">
              <img
                src={src}
                alt={alt || "Imagem anexada"}
                onClick={() => {
                  setZoomImageUrl(src);
                  setZoomImageCaption(alt);
                }}
                className="max-h-[500px] w-auto max-w-full rounded-xl mx-auto object-contain cursor-zoom-in hover:opacity-95 transition-opacity shadow-xs"
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

      // H1 Main Title (# Title)
      if (trimmed.startsWith("# ")) {
        const text = trimmed.replace(/^#\s+/, "");
        elements.push(
          <h1
            key={`h1-${idx}`}
            className={`text-xl sm:text-2xl font-extrabold ${palette.tailwind.primaryText} mb-4 tracking-tight leading-tight`}
          >
            {renderInlineMarkdown(text)}
          </h1>
        );
        continue;
      }

      // H2 Section (## Section) — with underline divider
      if (trimmed.startsWith("## ")) {
        const text = trimmed.replace(/^##\s+/, "");
        elements.push(
          <div key={`h2-wrap-${idx}`} className="mt-7 mb-3">
            <h2 className={`text-lg sm:text-xl font-bold ${palette.tailwind.primaryText} pb-2 border-b ${palette.tailwind.dividerBorder} tracking-tight leading-snug`}>
              {renderInlineMarkdown(text)}
            </h2>
          </div>
        );
        continue;
      }

      // H3 Subsection (### Subsection)
      if (trimmed.startsWith("### ")) {
        const text = trimmed.replace(/^###\s+/, "");
        elements.push(
          <h3
            key={`h3-${idx}`}
            className={`text-[15px] sm:text-base font-bold ${palette.tailwind.secondaryText} mt-5 mb-2 tracking-tight`}
          >
            {renderInlineMarkdown(text)}
          </h3>
        );
        continue;
      }

      // H4 Sub-subsection (#### Sub-subsection)
      if (trimmed.startsWith("#### ")) {
        const text = trimmed.replace(/^####\s+/, "");
        elements.push(
          <h4
            key={`h4-${idx}`}
            className={`text-[13.5px] sm:text-[14px] font-bold ${palette.tailwind.subText} mt-4 mb-1.5 tracking-tight flex items-center gap-2`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${palette.tailwind.accentBg} shrink-0`} />
            <span>{renderInlineMarkdown(text)}</span>
          </h4>
        );
        continue;
      }

      // H5 / H6 (##### or ######)
      const genericHeadingMatch = trimmed.match(/^(#{5,6})\s*(.*)$/);
      if (genericHeadingMatch) {
        const text = genericHeadingMatch[2];
        elements.push(
          <h5
            key={`h5-${idx}`}
            className={`text-[13px] sm:text-[13.5px] font-bold ${palette.tailwind.minorText} mt-3 mb-1 tracking-tight`}
          >
            {renderInlineMarkdown(text)}
          </h5>
        );
        continue;
      }

      // Callout Boxes (Lines starting with ">")
      if (trimmed.startsWith(">")) {
        const calloutLines: string[] = [];
        let j = idx;
        while (j < lines.length && lines[j].trim().startsWith(">")) {
          const cLine = lines[j].trim().replace(/^>\s*/, "");
          if (cLine) calloutLines.push(cLine);
          j++;
        }
        idx = j - 1;
        const calloutText = calloutLines.join(" ");

        elements.push(
          <div
            key={`callout-${idx}`}
            className={`my-4 p-4 rounded-xl border-l-4 ${palette.tailwind.calloutBorder} ${palette.tailwind.calloutBg} text-gray-800 dark:text-gray-200 text-xs sm:text-sm shadow-xs`}
          >
            {renderInlineMarkdown(calloutText)}
          </div>
        );
        continue;
      }

      // Markdown Tables (Lines containing | ... |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines: string[] = [];
        let j = idx;
        while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
          tableLines.push(lines[j].trim());
          j++;
        }
        idx = j - 1;

        const rows = tableLines
          .filter((l) => !/^\|[\s\-:|]+\|$/.test(l))
          .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

        if (rows.length > 0) {
          const rawTableMarkdown = tableLines.join("\n");
          elements.push(
            <div key={`table-${idx}`} className="my-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1A1D27]">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100/70 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <TableIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Quadro Informativo</span>
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
                <table
                  border={1}
                  cellPadding={8}
                  cellSpacing={0}
                  style={{ borderCollapse: "collapse", width: "100%", border: "1px solid #CBD5E1" }}
                  className="w-full text-xs sm:text-sm text-left border-collapse min-w-[600px]"
                >
                  <thead style={{ backgroundColor: "#065F46", color: "#FFFFFF" }} className={`${palette.tailwind.tableHeaderBg}`}>
                    <tr>
                      {rows[0].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            border: "1px solid #047857",
                            padding: "10px 14px",
                            fontWeight: 700,
                            color: "#FFFFFF",
                            backgroundColor: "#065F46",
                            textAlign: "left",
                            minWidth: "150px",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                          className="px-4 py-3.5 font-bold border-b border-gray-200/40 dark:border-gray-700 text-white tracking-wide"
                        >
                          {renderInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.slice(1).map((r, rI) => (
                      <tr
                        key={rI}
                        style={{ backgroundColor: rI % 2 === 1 ? "#F8FAFC" : "#FFFFFF" }}
                        className={`${rI % 2 === 1 ? "bg-gray-50/70 dark:bg-gray-800/30" : "bg-white dark:bg-[#1A1D27]"} hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors`}
                      >
                        {r.map((c, cI) => (
                          <td
                            key={cI}
                            style={{
                              border: "1px solid #E2E8F0",
                              padding: "10px 14px",
                              color: "#1E293B",
                              fontWeight: cI === 0 ? 600 : 400,
                              minWidth: "150px",
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                              verticalAlign: "top",
                            }}
                            className={`px-4 py-3 text-gray-800 dark:text-gray-200 ${cI === 0 ? "font-semibold text-gray-950 dark:text-white" : ""}`}
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

      // Level 2 / Level 3 Nested Bullets (indented with 2+ spaces or tabs)
      const subBulletMatch = line.match(/^(\s{2,}|\t+)[\*\-]\s+(.*)$/);
      if (subBulletMatch) {
        const indentStr = subBulletMatch[1].replace(/\t/g, "  ");
        const isLevel3 = indentStr.length >= 4;
        const itemText = subBulletMatch[2];

        if (isLevel3) {
          // Level 3: solid square (▪), indented pl-10 sm:pl-12
          elements.push(
            <div
              key={`subbullet3-${idx}`}
              className="pl-10 sm:pl-12 my-1.5 flex items-start group"
            >
              <span className="w-1.5 h-1.5 rounded-xs bg-gray-800 dark:bg-gray-200 mt-2 mr-2.5 flex-shrink-0" />
              <div className="flex-1">{renderItemContent(itemText)}</div>
            </div>
          );
        } else {
          // Level 2: hollow ring / open circle (◦), indented pl-5 sm:pl-7
          elements.push(
            <div
              key={`subbullet2-${idx}`}
              className="pl-5 sm:pl-7 my-1.5 flex items-start group"
            >
              <span className="w-2 h-2 rounded-full border-2 border-gray-700 dark:border-gray-300 bg-transparent mt-1.5 mr-2.5 flex-shrink-0" />
              <div className="flex-1">{renderItemContent(itemText)}</div>
            </div>
          );
        }
        continue;
      }

      // Level 1 Topic Bullet ("* " or "- ") - solid circle (•)
      const bulletMatch = line.match(/^[\*\-]\s+(.*)$/);
      if (bulletMatch) {
        const itemText = bulletMatch[1];
        elements.push(
          <div
            key={`bullet-${idx}`}
            className="my-2.5 flex items-start group"
          >
            <span className="w-2 h-2 rounded-full bg-gray-950 dark:bg-white mt-2 mr-2.5 flex-shrink-0 shadow-2xs" />
            <div className="flex-1">{renderItemContent(itemText)}</div>
          </div>
        );
        continue;
      }

      // Numbered List (supports 1., 1.1, 1.x, 2.y, etc., with indent support)
      const numMatch = line.match(/^(\s*)(\d+(?:\.[\w\d]+)*)\.?\s+(.*)$/);
      if (numMatch) {
        const indent = numMatch[1]?.length || 0;
        const isNested = indent >= 2;
        const num = numMatch[2];
        const itemText = numMatch[3];
        const isTopLevel = !isNested && /^\d+$/.test(num);

        if (isTopLevel) {
          elements.push(
            <div key={`num-${idx}`} className="mt-6 mb-2.5 flex items-center gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/60">
              <span className={`font-extrabold text-xs sm:text-sm px-2.5 py-1 rounded-lg ${palette.tailwind.badgeBg} ${palette.tailwind.badgeText} shrink-0 shadow-xs`}>
                {num}.
              </span>
              <h4 className="text-[15.5px] sm:text-[17px] font-bold text-gray-950 dark:text-white tracking-tight">
                {renderInlineMarkdown(itemText)}
              </h4>
            </div>
          );
          continue;
        }

        elements.push(
          <div key={`num-${idx}`} className={`my-2 flex items-start ${isNested ? "pl-5 sm:pl-7" : ""}`}>
            <span className={`text-xs font-bold ${palette.tailwind.minorText} min-w-[24px] mt-0.5`}>
              {num}.
            </span>
            <div className="flex-1">{renderItemContent(itemText)}</div>
          </div>
        );
        continue;
      }

      // Fallback: If line starts with any # followed by text, strip hash and style as subheading
      const fallbackHashMatch = trimmed.match(/^#{1,6}\s*(.*)$/);
      if (fallbackHashMatch && fallbackHashMatch[1]) {
        elements.push(
          <div
            key={`fb-h-${idx}`}
            className={`text-[14px] font-bold ${palette.tailwind.primaryText} mt-3.5 mb-1.5`}
          >
            {renderInlineMarkdown(fallbackHashMatch[1])}
          </div>
        );
        continue;
      }

      // Regular contextual paragraph
      elements.push(
        <p
          key={`p-${idx}`}
          className="text-gray-700 dark:text-gray-300 text-[13px] sm:text-[13.5px] md:text-sm leading-relaxed mb-3"
        >
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }

    return elements;
  };

  // Helper for inline markdown in print view
  const renderPrintInlineMarkdown = (raw: string) => {
    const spans = parseInlineSpans(raw);
    return spans.map((span, i) => {
      if (span.type === "bold") {
        return (
          <strong key={i} style={{ fontWeight: 700, color: "#0F172A" }}>
            {renderPrintInlineMarkdown(span.content)}
          </strong>
        );
      }
      if (span.type === "italic") {
        return (
          <em key={i} style={{ fontStyle: "italic", color: "#334155" }}>
            {renderPrintInlineMarkdown(span.content)}
          </em>
        );
      }
      if (span.type === "color") {
        const cleanCol = cleanCssVal(span.color);
        return (
          <span key={i} style={cleanCol ? { color: cleanCol, fontWeight: 600 } : undefined}>
            {renderPrintInlineMarkdown(span.content)}
          </span>
        );
      }
      if (span.type === "mark") {
        const cleanBg = cleanCssVal(span.bgColor) || "#FEF08A";
        return (
          <mark key={i} style={{ backgroundColor: cleanBg, color: "#0F172A", padding: "1px 3px", borderRadius: "3px" }}>
            {renderPrintInlineMarkdown(span.content)}
          </mark>
        );
      }
      if (span.type === "underline") {
        return <u key={i}>{renderPrintInlineMarkdown(span.content)}</u>;
      }
      return <React.Fragment key={i}>{span.content}</React.Fragment>;
    });
  };

  // Helper for item content in print view
  const renderPrintItemContent = (text: string) => {
    let body = cleanLatexAndBadges(text);
    body = body.replace(/^\s*\[[A-Za-zÀ-ÖØ-öø-ÿ\s]{3,25}\]\s*/, "");

    const arrowInsideBold = body.match(/^\s*\*\*([^*]+?)\s*(?:->|→|&rarr;)\*\*\s*(.*)$/);
    const arrowOutsideBold = body.match(/^\s*\*\*([^*]+?)\*\*\s*(?:->|→|&rarr;)\s*(.*)$/);
    const colonInsideBold = body.match(/^\s*\*\*([^*]+?):\*\*\s*(.*)$/);
    const colonOutsideBold = body.match(/^\s*\*\*([^*]+?)\*\*\s*:\s*(.*)$/);
    const plainArrowMatch = !arrowInsideBold && !arrowOutsideBold && body.match(/^\s*([^<*:\->—\n]{2,60})\s*(?:->|→|&rarr;)\s*(.*)$/);
    const plainColonMatch = !colonInsideBold && !colonOutsideBold && !body.trim().startsWith("<") && body.match(/^\s*([^<*:\->—\n]{2,60}):\s*(.*)$/);

    const m = arrowInsideBold || arrowOutsideBold || plainArrowMatch;
    const c = colonInsideBold || colonOutsideBold || plainColonMatch;

    if (m) {
      const term = m[1].trim();
      const rest = m[2].trim();
      return (
        <span style={{ fontSize: "inherit", lineHeight: "inherit", color: "#334155" }}>
          <strong style={{ fontWeight: 700, color: "#0F172A", marginRight: "4px" }}>
            {term}
          </strong>
          <span style={{ color: "#2563EB", fontWeight: 600, margin: "0 5px" }}>
            -&gt;
          </span>
          <span>{renderPrintInlineMarkdown(rest)}</span>
        </span>
      );
    }

    if (c) {
      const term = c[1].trim();
      const rest = c[2].trim();
      return (
        <span style={{ fontSize: "inherit", lineHeight: "inherit", color: "#334155" }}>
          <strong style={{ fontWeight: 700, color: "#0F172A", marginRight: "4px" }}>
            {term}:
          </strong>
          <span>{renderPrintInlineMarkdown(rest)}</span>
        </span>
      );
    }

    return (
      <span style={{ fontSize: "inherit", lineHeight: "inherit", color: "#334155" }}>
        {renderPrintInlineMarkdown(body)}
      </span>
    );
  };

  // Print view generator: mathematically proportional for A4, zero dark mode bleeding, high-contrast dark text
  const renderPrintDocumentLines = () => {
    const lines = cleanedContent.split("\n");
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      // Markdown Image
      const imgMatch = trimmed.match(/^[\*\-]?\s*!\[(.*?)\]\((.*?)\)/) || trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const alt = imgMatch[1] || "";
        const src = imgMatch[2];
        elements.push(
          <div key={`print-img-${idx}`} style={{ margin: "14px 0", textAlign: "center" }}>
            <img
              src={src}
              alt={alt || "Imagem"}
              style={{ maxHeight: "350px", maxWidth: "100%", borderRadius: "8px", objectFit: "contain", margin: "0 auto" }}
            />
            {alt && alt !== "Imagem" && alt !== "Imagem Colada" && alt !== "Imagem Anexa" && (
              <p style={{ fontSize: "10px", color: "#64748B", marginTop: "4px" }}>{alt}</p>
            )}
          </div>
        );
        continue;
      }

      // H1 Main Title
      if (trimmed.startsWith("# ")) {
        const text = trimmed.replace(/^#\s+/, "");
        elements.push(
          <h1
            key={`print-h1-${idx}`}
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#1E3A8A",
              marginBottom: "14px",
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
            }}
          >
            {renderPrintInlineMarkdown(text)}
          </h1>
        );
        continue;
      }

      // H2 Section
      if (trimmed.startsWith("## ")) {
        const text = trimmed.replace(/^##\s+/, "");
        elements.push(
          <div key={`print-h2-wrap-${idx}`} style={{ marginTop: "18px", marginBottom: "10px" }}>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1E3A8A",
                borderBottom: "1.5px solid #BFDBFE",
                paddingBottom: "4px",
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
              }}
            >
              {renderPrintInlineMarkdown(text)}
            </h2>
          </div>
        );
        continue;
      }

      // H3 Subsection
      if (trimmed.startsWith("### ")) {
        const text = trimmed.replace(/^###\s+/, "");
        elements.push(
          <h3
            key={`print-h3-${idx}`}
            style={{
              fontSize: "13.5px",
              fontWeight: 700,
              color: "#1E40AF",
              marginTop: "14px",
              marginBottom: "6px",
            }}
          >
            {renderPrintInlineMarkdown(text)}
          </h3>
        );
        continue;
      }

      // H4 Sub-subsection
      if (trimmed.startsWith("#### ")) {
        const text = trimmed.replace(/^####\s+/, "");
        elements.push(
          <h4
            key={`print-h4-${idx}`}
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#1E3A8A",
              marginTop: "11px",
              marginBottom: "5px",
            }}
          >
            {renderPrintInlineMarkdown(text)}
          </h4>
        );
        continue;
      }

      // H5 / H6
      const genericHeadingMatch = trimmed.match(/^(#{5,6})\s*(.*)$/);
      if (genericHeadingMatch) {
        const text = genericHeadingMatch[2];
        elements.push(
          <h5
            key={`print-h5-${idx}`}
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#2563EB",
              marginTop: "9px",
              marginBottom: "4px",
            }}
          >
            {renderPrintInlineMarkdown(text)}
          </h5>
        );
        continue;
      }

      // Level 2 / Level 3 Sub-bullet
      const subBulletMatch = line.match(/^(\s{2,}|\t+)[\*\-]\s+(.*)$/);
      if (subBulletMatch) {
        const indentStr = subBulletMatch[1].replace(/\t/g, "  ");
        const isLevel3 = indentStr.length >= 4;
        const itemText = subBulletMatch[2];

        if (isLevel3) {
          elements.push(
            <div
              key={`print-subbullet3-${idx}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                paddingLeft: "36px",
                marginTop: "3px",
                marginBottom: "3px",
              }}
            >
              <span
                style={{
                  width: "4px",
                  height: "4px",
                  backgroundColor: "#334155",
                  marginTop: "6.5px",
                  marginRight: "8px",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontSize: "11.5px", lineHeight: 1.5, color: "#334155" }}>
                {renderPrintItemContent(itemText)}
              </div>
            </div>
          );
        } else {
          elements.push(
            <div
              key={`print-subbullet2-${idx}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                paddingLeft: "18px",
                marginTop: "4px",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  border: "1.5px solid #334155",
                  backgroundColor: "transparent",
                  marginTop: "5.5px",
                  marginRight: "8px",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontSize: "12px", lineHeight: 1.5, color: "#334155" }}>
                {renderPrintItemContent(itemText)}
              </div>
            </div>
          );
        }
        continue;
      }

      // Level 1 Topic Bullet
      const bulletMatch = line.match(/^[\*\-]\s+(.*)$/);
      if (bulletMatch) {
        const itemText = bulletMatch[1];
        elements.push(
          <div
            key={`print-bullet-${idx}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              marginTop: "6px",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: "#0F172A",
                marginTop: "6px",
                marginRight: "8px",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: "12.5px", lineHeight: 1.5, color: "#1E293B" }}>
              {renderPrintItemContent(itemText)}
            </div>
          </div>
        );
        continue;
      }

      // Numbered List
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const itemText = numMatch[2];
        elements.push(
          <div
            key={`print-num-${idx}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              marginTop: "5px",
              marginBottom: "5px",
            }}
          >
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#2563EB",
                minWidth: "16px",
                marginTop: "1px",
              }}
            >
              {num}.
            </span>
            <div style={{ flex: 1, fontSize: "12.5px", lineHeight: 1.5, color: "#334155" }}>
              {renderPrintItemContent(itemText)}
            </div>
          </div>
        );
        continue;
      }

      // Fallback heading
      const fallbackHashMatch = trimmed.match(/^#{1,6}\s*(.*)$/);
      if (fallbackHashMatch && fallbackHashMatch[1]) {
        elements.push(
          <div
            key={`print-fb-${idx}`}
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#1E3A8A",
              marginTop: "10px",
              marginBottom: "4px",
            }}
          >
            {renderPrintInlineMarkdown(fallbackHashMatch[1])}
          </div>
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p
          key={`print-p-${idx}`}
          style={{
            fontSize: "12px",
            lineHeight: 1.5,
            color: "#334155",
            marginBottom: "8px",
          }}
        >
          {renderPrintInlineMarkdown(trimmed)}
        </p>
      );
    }

    return elements;
  };

  return (
    <div className={printOnly ? undefined : "space-y-4"}>
      {!printOnly && (
      <>
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white dark:bg-[#1A1D27] p-3 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
        <div className="flex items-center gap-2">
          {expanded && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Zap className="w-3.5 h-3.5" />
              Conteúdo Expandido
            </span>
          )}
          {isEditing ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Pencil className="w-3 h-3" />
              Editando Conteúdo
            </span>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              Texto integral estruturado em tópicos e subtópicos
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              {/* Botão Cancelar Edição */}
              <button
                type="button"
                onClick={handleCancelEditing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Cancelar alterações"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>

              {/* Botão Salvar Edição */}
              <button
                type="button"
                onClick={handleSaveEditing}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white shadow-sm transition-transform active:scale-95 cursor-pointer",
                  activeTheme === "vermelho"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                    : activeTheme === "roxo"
                    ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
                    : activeTheme === "azul"
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                    : activeTheme === "cinza"
                    ? "bg-zinc-800 hover:bg-zinc-900 shadow-zinc-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                )}
                title="Salvar alterações no texto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>

              {/* Botão Copiar durante edição */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm",
                  copied
                    ? (activeTheme === "vermelho" ? "bg-red-600 text-white" :
                       activeTheme === "roxo" ? "bg-purple-600 text-white" :
                       activeTheme === "azul" ? "bg-blue-600 text-white" :
                       activeTheme === "cinza" ? "bg-zinc-800 text-white" :
                       "bg-emerald-600 text-white")
                    : (activeTheme === "vermelho" ? "bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/60" :
                       activeTheme === "roxo" ? "bg-purple-50 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60" :
                       activeTheme === "azul" ? "bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60" :
                       activeTheme === "cinza" ? "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700" :
                       "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60")
                )}
                title="Copiar texto em edição"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>

              {/* Botão Exportar PDF durante edição */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white disabled:opacity-50 transition-colors cursor-pointer shadow-sm",
                  activeTheme === "vermelho" ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" :
                  activeTheme === "roxo" ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20" :
                  activeTheme === "azul" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" :
                  activeTheme === "cinza" ? "bg-zinc-800 hover:bg-zinc-900 shadow-zinc-500/20" :
                  "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                )}
                title="Exportar PDF com as alterações atuais"
              >
                {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                <span>{isExportingPdf ? "Exportando..." : "Exportar PDF"}</span>
              </button>
            </>
          ) : (
            <>
              {/* Botão Editar (Solicitado pelo usuário) */}
              {editable && (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Editar qualquer parte do texto gerado"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar Texto</span>
                </button>
              )}

              {/* Botão Visualizar PDF (Solicitado pelo usuário) */}
              {(onViewPdf || fileUrl) && (
                <button
                  type="button"
                  onClick={() => onViewPdf ? onViewPdf() : (fileUrl ? window.open(fileUrl, "_blank") : null)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                  title="Visualizar o PDF original anexado"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Visualizar PDF</span>
                </button>
              )}

              {/* Botão Copiar Universal (Notion, Docs, Word, WhatsApp) */}
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                  activeTheme === "roxo"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20"
                    : activeTheme === "vermelho"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/20"
                    : activeTheme === "cinza"
                    ? "bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-zinc-800 hover:to-black shadow-zinc-500/20"
                    : activeTheme === "esmeralda"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                }`}
                title="Copiar com formatação perfeita para colar em qualquer aplicativo"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>

              {/* Exportar PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Exportar como documento PDF em formato A4 proporcional"
              >
                <FileDown className={`w-3.5 h-3.5 ${palette.tailwind.minorText}`} />
                <span>{isExportingPdf ? "Gerando PDF..." : "Exportar PDF"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor View or Clean Document Sheet */}
      {isEditing ? (
        <div className="max-w-4xl mx-auto space-y-3">
          <RichTextEditor
            value={editedText}
            onChange={setEditedText}
            onSave={handleSaveEditing}
            onCancel={handleCancelEditing}
            onRestoreOriginal={() => {
              if (onRestoreOriginal) {
                onRestoreOriginal();
              }
              setEditedText(cleanTranscriptionContent(activeRawText));
              toast.success("Texto original restaurado!", { icon: "↩️" });
            }}
            theme={theme}
            placeholder="Digite ou edite o conteúdo do documento com ferramentas de formatação..."
            minHeight="540px"
          />
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setEditedText(cleanTranscriptionContent(activeRawText));
                toast.success("Texto original restaurado!", { icon: "↩️" });
              }}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar original</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditing}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer",
                  activeTheme === "vermelho"
                    ? "bg-red-600 hover:bg-red-700"
                    : activeTheme === "roxo"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : activeTheme === "azul"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : activeTheme === "cinza"
                    ? "bg-zinc-800 hover:bg-zinc-900"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={documentRef}
          className="bg-white dark:bg-[#1A1D27] p-5 sm:p-7 md:p-9 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs max-w-4xl mx-auto selection:bg-blue-100 dark:selection:bg-blue-900/40"
        >
          {renderDocumentLines()}
        </div>
      )}
      </>
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
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Off-screen dedicated print sheet for 100% distortion-free, proportional, dark-mode-proof A4 PDF export */}
      <div
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          zIndex: -999,
          pointerEvents: "none",
          opacity: 1,
        }}
        aria-hidden="true"
      >
        <div
          ref={printRef}
          style={{
            width: "780px",
            backgroundColor: "#FFFFFF",
            color: "#1E293B",
            padding: "38px 44px",
            boxSizing: "border-box",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {renderPrintDocumentLines()}
        </div>
      </div>
    </div>
  );
});

export default TranscriptionDocumentViewer;
