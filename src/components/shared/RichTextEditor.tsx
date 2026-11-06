"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Image as ImageIcon,
  Link2,
  Undo,
  Redo,
  RemoveFormatting,
  Sparkles,
  Lightbulb,
  Eye,
  Code2,
  Highlighter,
  Palette,
  X,
  Plus,
  Save,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { markdownToHtml, htmlToMarkdown } from "@/lib/rich-text-utils";
import { getThemePalette } from "@/lib/theme-palettes";
import toast from "react-hot-toast";

export interface RichTextEditorProps {
  value: string; // Markdown string
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  theme?: string;
  onExpandAI?: (selectedText: string) => void;
  onExplainAI?: (selectedText: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onRestoreOriginal?: () => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite ou edite o documento com ferramentas de formatação...",
  minHeight = "480px",
  className = "",
  theme = "esmeralda",
  onExpandAI,
  onExplainAI,
  onSave,
  onCancel,
  onRestoreOriginal,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdateRef = useRef(false);

  const [activeMode, setActiveMode] = useState<"visual" | "markdown">("visual");
  const [markdownSource, setMarkdownSource] = useState(value);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Popover menus for colors
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);
  const [showBgColorMenu, setShowBgColorMenu] = useState(false);

  // AI Loading states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingAction, setAiLoadingAction] = useState<"expand" | "explain" | null>(null);

  // Sync external value -> internal visual DOM
  useEffect(() => {
    setMarkdownSource(value);
    const chars = value ? value.length : 0;
    const words = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
    setCharCount(chars);
    setWordCount(words);

    if (activeMode === "visual" && editorRef.current) {
      if (!isInternalUpdateRef.current) {
        const html = markdownToHtml(value);
        editorRef.current.innerHTML = html;
      }
      isInternalUpdateRef.current = false;
    }
  }, [value, activeMode]);

  // Handle content changes in visual editor
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdateRef.current = true;
    const currentHtml = editorRef.current.innerHTML;
    const convertedMd = htmlToMarkdown(currentHtml);
    setMarkdownSource(convertedMd);

    const chars = convertedMd.length;
    const words = convertedMd.trim().split(/\s+/).filter(Boolean).length;
    setCharCount(chars);
    setWordCount(words);

    onChange(convertedMd);
  }, [onChange]);

  // Handle markdown textarea changes
  const handleMarkdownChange = (newMd: string) => {
    setMarkdownSource(newMd);
    onChange(newMd);
    const chars = newMd.length;
    const words = newMd.trim().split(/\s+/).filter(Boolean).length;
    setCharCount(chars);
    setWordCount(words);
  };

  // Switch between Visual WYSIWYG and Raw Markdown
  const switchMode = (mode: "visual" | "markdown") => {
    if (mode === activeMode) return;
    if (mode === "visual") {
      setActiveMode("visual");
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = markdownToHtml(markdownSource);
        }
      }, 0);
    } else {
      if (editorRef.current) {
        const md = htmlToMarkdown(editorRef.current.innerHTML);
        setMarkdownSource(md);
      }
      setActiveMode("markdown");
    }
  };

  // Keyboard shortcut to save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (onSave) {
          e.preventDefault();
          onSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  // Helper to execute standard editor commands
  const executeCommand = (command: string, cmdValue: string | undefined = undefined) => {
    if (activeMode !== "visual") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, cmdValue);
    handleEditorInput();
  };

  // Format Headings with real size change
  const formatHeading = (level: "h1" | "h2" | "h3" | "p") => {
    if (activeMode !== "visual") return;
    if (editorRef.current) editorRef.current.focus();
    try {
      document.execCommand("formatBlock", false, `<${level}>`);
    } catch {
      document.execCommand("formatBlock", false, level.toUpperCase());
    }
    handleEditorInput();
  };

  // Apply Text Color
  const applyTextColor = (color: string) => {
    if (activeMode !== "visual") return;
    if (editorRef.current) editorRef.current.focus();
    document.execCommand("foreColor", false, color);
    handleEditorInput();
    setShowTextColorMenu(false);
  };

  // Apply Background / Highlight Color
  const applyHighlightColor = (color: string) => {
    if (activeMode !== "visual") return;
    if (editorRef.current) editorRef.current.focus();
    try {
      document.execCommand("hiliteColor", false, color);
    } catch {
      document.execCommand("backColor", false, color);
    }
    handleEditorInput();
    setShowBgColorMenu(false);
  };

  // Insert HTML at current cursor/selection
  const insertHtmlAtCursor = (html: string) => {
    if (activeMode !== "visual") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement("div");
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: Node | null;
      let lastNode: Node | null = null;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else if (editorRef.current) {
      editorRef.current.innerHTML += html;
    }
    handleEditorInput();
  };

  // Insert Table
  const handleInsertTable = () => {
    const tableHtml = `
      <div class="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #CBD5E1;" class="studyflow-table w-full text-sm text-left border-collapse">
          <thead style="background-color: #065F46; color: #FFFFFF;" class="bg-[#065F46] text-white">
            <tr>
              <th style="border: 1px solid #047857; padding: 10px 14px; font-weight: 700; color: #FFFFFF;" class="px-4 py-3 font-bold border-b border-emerald-800">Coluna 1</th>
              <th style="border: 1px solid #047857; padding: 10px 14px; font-weight: 700; color: #FFFFFF;" class="px-4 py-3 font-bold border-b border-emerald-800">Coluna 2</th>
              <th style="border: 1px solid #047857; padding: 10px 14px; font-weight: 700; color: #FFFFFF;" class="px-4 py-3 font-bold border-b border-emerald-800">Coluna 3</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #FFFFFF;">
              <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-weight: 600;" class="px-4 py-2.5 font-semibold">Item A</td>
              <td style="border: 1px solid #E2E8F0; padding: 8px 12px;" class="px-4 py-2.5">Dado 1</td>
              <td style="border: 1px solid #E2E8F0; padding: 8px 12px;" class="px-4 py-2.5">Observação</td>
            </tr>
            <tr style="background-color: #F8FAFC;">
              <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-weight: 600;" class="px-4 py-2.5 font-semibold">Item B</td>
              <td style="border: 1px solid #E2E8F0; padding: 8px 12px;" class="px-4 py-2.5">Dado 2</td>
              <td style="border: 1px solid #E2E8F0; padding: 8px 12px;" class="px-4 py-2.5">Observação</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p><br></p>
    `;
    insertHtmlAtCursor(tableHtml);
    toast.success("Tabela inserida!");
  };

  // Insert Image from URL
  const handleInsertImageUrl = () => {
    const url = prompt("Cole a URL direta da imagem (ex: https://...):");
    if (!url || !url.trim()) return;
    const caption = prompt("Legenda ou descrição (opcional):") || "Imagem";
    const imgHtml = `
      <figure class="my-4 text-center select-none" contenteditable="false">
        <img src="${url.trim()}" alt="${caption}" class="max-h-96 max-w-full rounded-xl mx-auto object-contain border border-gray-200 dark:border-gray-800 shadow-sm" />
        ${caption && caption !== "Imagem" ? `<figcaption class="text-xs text-gray-500 mt-1">${caption}</figcaption>` : ""}
      </figure>
      <p><br></p>
    `;
    insertHtmlAtCursor(imgHtml);
    toast.success("Imagem inserida!");
  };

  // Upload image from file
  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Adicionando imagem...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      let imgUrl = "";

      if (res.ok) {
        const data = await res.json();
        imgUrl = data.filePath;
      } else {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        imgUrl = base64;
      }

      const alt = file.name.replace(/\.[^/.]+$/, "") || "Imagem";
      const imgHtml = `
        <figure class="my-4 text-center select-none" contenteditable="false">
          <img src="${imgUrl}" alt="${alt}" class="max-h-96 max-w-full rounded-xl mx-auto object-contain border border-gray-200 dark:border-gray-800 shadow-sm" />
          <figcaption class="text-xs text-gray-500 mt-1">${alt}</figcaption>
        </figure>
        <p><br></p>
      `;
      insertHtmlAtCursor(imgHtml);
      toast.success("Imagem inserida com sucesso!", { id: toastId, icon: "🖼️" });
    } catch {
      toast.error("Erro ao carregar imagem.", { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle pasting images or markdown tables directly
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const toastId = toast.loading("Colando imagem...");
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            try {
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/upload", { method: "POST", body: formData });
              let finalUrl = base64;
              if (res.ok) {
                const data = await res.json();
                finalUrl = data.filePath;
              }

              const imgHtml = `
                <figure class="my-4 text-center select-none" contenteditable="false">
                  <img src="${finalUrl}" alt="Imagem Colada" class="max-h-96 max-w-full rounded-xl mx-auto object-contain border border-gray-200 dark:border-gray-800 shadow-sm" />
                </figure>
                <p><br></p>
              `;
              insertHtmlAtCursor(imgHtml);
              toast.success("Imagem colada com sucesso!", { id: toastId, icon: "🖼️" });
            } catch {
              const imgHtml = `
                <figure class="my-4 text-center select-none" contenteditable="false">
                  <img src="${base64}" alt="Imagem Colada" class="max-h-96 max-w-full rounded-xl mx-auto object-contain border border-gray-200 dark:border-gray-800 shadow-sm" />
                </figure>
                <p><br></p>
              `;
              insertHtmlAtCursor(imgHtml);
              toast.success("Imagem colada com sucesso!", { id: toastId, icon: "🖼️" });
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }

    // Handle pasting raw Markdown tables as styled HTML tables
    const plainText = e.clipboardData?.getData("text/plain") || "";
    const htmlData = e.clipboardData?.getData("text/html") || "";

    if (
      plainText &&
      (!htmlData || !htmlData.includes("<table")) &&
      plainText.includes("|") &&
      /^\|.+\|$/m.test(plainText) &&
      /^\|[\s\-:|]+\|$/m.test(plainText)
    ) {
      e.preventDefault();
      const formattedHtml = markdownToHtml(plainText);
      insertHtmlAtCursor(formattedHtml);
    }
  };

  // Trigger AI Text Action (Expand or Explain)
  const handleAITextAction = async (action: "expand" | "explain") => {
    const selection = window.getSelection();
    let selectedText = "";

    if (selection && !selection.isCollapsed) {
      selectedText = selection.toString().trim();
    }

    if (!selectedText || selectedText.length < 2) {
      toast("Selecione um trecho de texto no editor para usar esta ferramenta da IA.", {
        icon: "👆",
      });
      return;
    }

    if (action === "expand" && onExpandAI) {
      onExpandAI(selectedText);
      return;
    }
    if (action === "explain" && onExplainAI) {
      onExplainAI(selectedText);
      return;
    }

    setIsAiLoading(true);
    setAiLoadingAction(action);
    const toastId = toast.loading(
      action === "expand" ? "Expandindo conteúdo com IA..." : "Gerando explicação didática com IA..."
    );

    try {
      const res = await fetch("/api/ai/expand-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText,
          action,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao processar texto com a IA");
      }

      const data = await res.json();
      const outputHtml = data.resultHtml || markdownToHtml(data.resultText || "");

      const blockHtml = `
        <div class="my-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div class="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
            <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span>${action === "expand" ? "Aprofundamento IA" : "Explicação Didática IA"}</span>
          </div>
          <div class="text-gray-900 dark:text-gray-100 text-sm leading-relaxed">${outputHtml}</div>
        </div>
        <p><br></p>
      `;

      insertHtmlAtCursor(blockHtml);
      toast.success(
        action === "expand" ? "Conteúdo expandido com sucesso!" : "Conceito explicado com sucesso!",
        { id: toastId, icon: "✨" }
      );
    } catch (e: any) {
      toast.error(e.message || "Falha ao processar com IA.", { id: toastId });
    } finally {
      setIsAiLoading(false);
      setAiLoadingAction(null);
    }
  };

  const textColors = [
    { label: "Padrão", color: "inherit", bg: "bg-gray-800 dark:bg-gray-200" },
    { label: "Vermelho (Remédio)", color: "#DC2626", bg: "bg-red-600" },
    { label: "Verde (Doença)", color: "#16A34A", bg: "bg-emerald-600" },
    { label: "Azul Clínico", color: "#2563EB", bg: "bg-blue-600" },
    { label: "Âmbar / Alerta", color: "#D97706", bg: "bg-amber-600" },
    { label: "Roxo Diagnóstico", color: "#9333EA", bg: "bg-purple-600" },
  ];

  const highlightColors = [
    { label: "Sem Fundo", color: "transparent", bg: "border border-gray-400 bg-transparent text-gray-500" },
    { label: "Amarelo Claro", color: "#FEF08A", bg: "bg-yellow-200 text-yellow-900" },
    { label: "Verde Claro", color: "#BBF7D0", bg: "bg-green-200 text-green-900" },
    { label: "Azul Claro", color: "#BAE6FD", bg: "bg-sky-200 text-sky-900" },
    { label: "Rosa Claro", color: "#FECDD3", bg: "bg-rose-200 text-rose-900" },
    { label: "Roxo Claro", color: "#E9D5FF", bg: "bg-purple-200 text-purple-900" },
  ];

  const palette = getThemePalette(theme);
  const themeId = palette.id;

  const isVermelho = themeId === "vermelho";
  const isRoxo = themeId === "roxo";
  const isAzul = themeId === "azul";
  const isCinza = themeId === "cinza";
  const isEsmeralda = themeId === "esmeralda";

  const accentBgClass =
    isVermelho ? "bg-red-600" :
    isRoxo ? "bg-purple-600" :
    isAzul ? "bg-blue-600" :
    isCinza ? "bg-zinc-800" :
    "bg-emerald-600";

  const accentHoverClass =
    isVermelho ? "hover:bg-red-700" :
    isRoxo ? "hover:bg-purple-700" :
    isAzul ? "hover:bg-blue-700" :
    isCinza ? "hover:bg-zinc-900" :
    "hover:bg-emerald-700";

  const accentBorderClass =
    isVermelho ? "border-red-500/40 dark:border-red-500/30" :
    isRoxo ? "border-purple-500/40 dark:border-purple-500/30" :
    isAzul ? "border-blue-500/40 dark:border-blue-500/30" :
    isCinza ? "border-zinc-500/40 dark:border-zinc-500/30" :
    "border-emerald-500/40 dark:border-emerald-500/30";

  const h2Color =
    isVermelho ? "#b91c1c" :
    isRoxo ? "#6d28d9" :
    isAzul ? "#1d4ed8" :
    isCinza ? "#27272a" :
    "#065f46";

  const h2DarkColor =
    isVermelho ? "#f87171" :
    isRoxo ? "#c084fc" :
    isAzul ? "#93c5fd" :
    isCinza ? "#e4e4e7" :
    "#6ee7b7";

  const h3Color =
    isVermelho ? "#dc2626" :
    isRoxo ? "#7c3aed" :
    isAzul ? "#2563eb" :
    isCinza ? "#3f3f46" :
    "#059669";

  const h3DarkColor =
    isVermelho ? "#fca5a5" :
    isRoxo ? "#d8b4fe" :
    isAzul ? "#bfdbfe" :
    isCinza ? "#d4d4d8" :
    "#a7f3d0";

  const blockquoteColor =
    isVermelho ? "#dc2626" :
    isRoxo ? "#7c3aed" :
    isAzul ? "#2563eb" :
    isCinza ? "#52525b" :
    "#059669";

  const blockquoteDarkColor =
    isVermelho ? "#ef4444" :
    isRoxo ? "#9333ea" :
    isAzul ? "#3b82f6" :
    isCinza ? "#a1a1aa" :
    "#10b981";

  const dividerBorderColor =
    isVermelho ? "#fecaca" :
    isRoxo ? "#ddd6fe" :
    isAzul ? "#bfdbfe" :
    isCinza ? "#e4e4e7" :
    "#a7f3d0";

  const dividerBorderDarkColor =
    isVermelho ? "#7f1d1d" :
    isRoxo ? "#581c87" :
    isAzul ? "#1e3a8a" :
    isCinza ? "#3f3f46" :
    "#064e3b";

  const tableHeaderBg =
    isVermelho ? "#991b1b" :
    isRoxo ? "#581c87" :
    isAzul ? "#1e3a8a" :
    isCinza ? "#27272a" :
    "#065f46";

  const tableHeaderBorder =
    isVermelho ? "#7f1d1d" :
    isRoxo ? "#4c1d95" :
    isAzul ? "#1e40af" :
    isCinza ? "#3f3f46" :
    "#047857";

  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] shadow-sm ${className}`}>
      {/* Scoped styles guaranteeing Heading sizes and paragraph rhythm */}
      <style jsx global>{`
        .studyflow-editor-content {
          outline: none;
        }
        .studyflow-editor-content h1 {
          font-size: 1.75rem !important;
          font-weight: 800 !important;
          line-height: 1.25 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.6rem !important;
          color: #0f172a !important;
        }
        .studyflow-editor-content h2 {
          font-size: 1.4rem !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.5rem !important;
          color: ${h2Color} !important;
          border-bottom: 1px solid ${dividerBorderColor};
          padding-bottom: 0.25rem;
        }
        .studyflow-editor-content h3 {
          font-size: 1.18rem !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
          margin-top: 1rem !important;
          margin-bottom: 0.35rem !important;
          color: ${h3Color} !important;
        }
        .studyflow-editor-content h4 {
          font-size: 1.05rem !important;
          font-weight: 700 !important;
          margin-top: 0.75rem !important;
          margin-bottom: 0.25rem !important;
          color: #334155 !important;
        }
        .studyflow-editor-content p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .studyflow-editor-content blockquote {
          border-left: 4px solid ${blockquoteColor};
          padding-left: 1rem;
          margin: 0.75rem 0;
          font-style: italic;
          color: #4b5563;
        }
        .studyflow-editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .studyflow-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .studyflow-editor-content mark {
          padding: 0.15rem 0.35rem;
          border-radius: 0.375rem;
        }
        .studyflow-editor-content table {
          width: 100% !important;
          min-width: 600px !important;
          border-collapse: collapse !important;
          margin: 1.5rem 0 !important;
        }
        .studyflow-editor-content th {
          background-color: ${tableHeaderBg} !important;
          color: #FFFFFF !important;
          font-weight: 700 !important;
          padding: 0.75rem 1rem !important;
          border: 1px solid ${tableHeaderBorder} !important;
          min-width: 150px !important;
          text-align: left !important;
          word-break: break-word !important;
          white-space: normal !important;
        }
        .studyflow-editor-content td {
          padding: 0.75rem 1rem !important;
          border: 1px solid #e2e8f0 !important;
          min-width: 150px !important;
          word-break: break-word !important;
          white-space: normal !important;
          vertical-align: top !important;
        }
        .dark .studyflow-editor-content td {
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        .dark .studyflow-editor-content h1 { color: #f8fafc !important; }
        .dark .studyflow-editor-content h2 {
          color: ${h2DarkColor} !important;
          border-bottom-color: ${dividerBorderDarkColor};
        }
        .dark .studyflow-editor-content h3 { color: ${h3DarkColor} !important; }
        .dark .studyflow-editor-content h4 { color: #cbd5e1 !important; }
        .dark .studyflow-editor-content blockquote { color: #9ca3af; border-color: ${blockquoteDarkColor}; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadImageFile}
        className="hidden"
      />

      {/* Top Header Bar: Counts & Mode Switcher */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/95 dark:bg-[#12141c] border-b border-gray-200 dark:border-gray-800 select-none rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
            Editor de Texto
          </span>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            (Barra lateral fixa que acompanha sua rolagem)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:flex items-center gap-2">
            <span>{wordCount} palavras</span>
            <span>•</span>
            <span>{charCount} caracteres</span>
          </div>

          <div className="flex items-center bg-white dark:bg-[#1A1D27] rounded-lg border border-gray-200 dark:border-gray-800 p-0.5">
            <button
              type="button"
              onClick={() => switchMode("visual")}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeMode === "visual"
                  ? `${accentBgClass} text-white shadow-xs`
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Editor Visual Formatado"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("markdown")}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeMode === "markdown"
                  ? `${accentBgClass} text-white shadow-xs`
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Código Markdown Puro"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Código</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Sticky Vertical Toolbar + Right Editor Area */}
      <div className="flex flex-row relative min-h-[520px]">
        {/* STICKY VERTICAL TOOLBAR (Compact 2-column dock, always visible when scrolling!) */}
        {activeMode === "visual" && (
          <aside className="sticky top-4 sm:top-6 self-start z-30 flex flex-col gap-1.5 p-1.5 bg-gray-50/95 dark:bg-[#12141c]/95 border-r border-gray-200 dark:border-gray-800 shadow-md shrink-0 rounded-bl-2xl">
            {/* 0. Quick Save, Restore Original & Cancel (Directly on floating toolbar) */}
            {(onSave || onCancel || onRestoreOriginal) && (
              <div className={cn("grid gap-1 bg-white dark:bg-[#1A1D27] rounded-xl p-1 shadow-xs border", accentBorderClass, onRestoreOriginal ? "grid-cols-3" : "grid-cols-2")}>
                {onSave && (
                  <button
                    type="button"
                    onClick={onSave}
                    className={cn("w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-white shadow-xs transition-transform active:scale-95 cursor-pointer", accentBgClass, accentHoverClass)}
                    title="Salvar alterações no documento (Ctrl+S)"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                )}
                {onRestoreOriginal && (
                  <button
                    type="button"
                    onClick={onRestoreOriginal}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                    title="Voltar ao texto original"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Cancelar edição"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* 1. History (Undo / Redo) */}
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-gray-800 p-1">
              <button
                type="button"
                onClick={() => executeCommand("undo")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand("redo")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Refazer (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Headings (P, H1 / H2, H3) */}
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-gray-800 p-1">
              <button
                type="button"
                onClick={() => formatHeading("p")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Texto Normal / Parágrafo"
              >
                <Pilcrow className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => formatHeading("h1")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-900 dark:text-white font-extrabold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Título Principal (H1)"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => formatHeading("h2")}
                className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                  isVermelho
                    ? "text-red-700 dark:text-red-300"
                    : isRoxo
                    ? "text-purple-700 dark:text-purple-300"
                    : isAzul
                    ? "text-blue-700 dark:text-blue-300"
                    : isCinza
                    ? "text-zinc-800 dark:text-zinc-200"
                    : "text-emerald-800 dark:text-emerald-300"
                )}
                title="Seção (H2)"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => formatHeading("h3")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Subseção (H3)"
              >
                <Heading3 className="w-4 h-4" />
              </button>
            </div>

            {/* 3. Typography Formatting (Bold, Italic / Underline, Strike) */}
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-gray-800 p-1">
              <button
                type="button"
                onClick={() => executeCommand("bold")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Negrito (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand("italic")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg italic text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Itálico (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand("underline")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg underline text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Sublinhado (Ctrl+U)"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand("strikeThrough")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg line-through text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Tachado"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
            </div>

            {/* 4. Cores: Cor do Texto & Cor de Fundo / Marca-Texto */}
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-gray-800 p-1 relative">
              {/* 🎨 Cor do Texto */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowTextColorMenu(!showTextColorMenu);
                    setShowBgColorMenu(false);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                  title="Cor da Fonte / Texto"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {showTextColorMenu && (
                  <div className="absolute left-full top-0 ml-2 z-50 p-2 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col gap-1 w-44 animate-in fade-in">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Cor do Texto</span>
                    {textColors.map((tc) => (
                      <button
                        key={tc.color}
                        type="button"
                        onClick={() => {
                          applyTextColor(tc.color);
                          setShowTextColorMenu(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${tc.bg}`} style={{ backgroundColor: tc.color !== "inherit" ? tc.color : undefined }} />
                        <span className="text-gray-800 dark:text-gray-200">{tc.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🖍️ Cor de Fundo / Marca-Texto */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowBgColorMenu(!showBgColorMenu);
                    setShowTextColorMenu(false);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                  title="Marca-Texto / Cor de Fundo"
                >
                  <Highlighter className="w-4 h-4" />
                </button>

                {showBgColorMenu && (
                  <div className="absolute left-full top-0 ml-2 z-50 p-2 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col gap-1 w-44 animate-in fade-in">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Cor de Fundo</span>
                    {highlightColors.map((hc) => (
                      <button
                        key={hc.color}
                        type="button"
                        onClick={() => {
                          applyHighlightColor(hc.color);
                          setShowBgColorMenu(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${hc.bg}`} style={{ backgroundColor: hc.color !== "transparent" ? hc.color : undefined }} />
                        <span className="text-gray-800 dark:text-gray-200">{hc.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Lists (Bullet & Numbered) */}
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-gray-800 p-1">
              <button
                type="button"
                onClick={() => executeCommand("insertUnorderedList")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Lista com Marcadores"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand("insertOrderedList")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Lista Numerada"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>

            {/* 6. Insert: Table, Quote / Image, Link */}
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-gray-800 p-1">
              <button
                type="button"
                onClick={handleInsertTable}
                className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
                  isVermelho
                    ? "text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
                    : isRoxo
                    ? "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                    : isAzul
                    ? "text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    : isCinza
                    ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                )}
                title="Inserir Tabela Formatada"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => formatHeading("p")}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Citação"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                title="Inserir Imagem do Computador"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleInsertImageUrl}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Inserir Imagem via Link"
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>

            {/* 7. AI Expand & Explain Tools */}
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-indigo-200 dark:border-indigo-800/60 p-1">
              <button
                type="button"
                onClick={() => handleAITextAction("expand")}
                disabled={isAiLoading}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer disabled:opacity-50"
                title="Expandir texto selecionado com IA"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAITextAction("explain")}
                disabled={isAiLoading}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer disabled:opacity-50"
                title="Explicar conceito selecionado com IA"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            </div>

            {/* 8. Clear Format */}
            <div className="flex bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-gray-800 p-1">
              <button
                type="button"
                onClick={() => executeCommand("removeFormat")}
                className="w-full h-8 sm:h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-xs font-semibold gap-1"
                title="Limpar Formatação do Texto"
              >
                <RemoveFormatting className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* Editor Body Area */}
        <div className="relative flex-1 bg-white dark:bg-[#1A1D27]">
          {activeMode === "visual" ? (
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              onPaste={handlePaste}
              className="studyflow-editor-content p-6 sm:p-8 md:p-10 text-gray-900 dark:text-gray-100 leading-relaxed font-sans select-text"
              style={{
                minHeight,
              }}
              data-placeholder={placeholder}
            />
          ) : (
            <textarea
              value={markdownSource}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              style={{ minHeight }}
              className="w-full p-6 sm:p-8 font-mono text-xs sm:text-sm bg-gray-50/50 dark:bg-[#12141c] text-gray-900 dark:text-gray-100 focus:outline-none leading-relaxed resize-y border-none"
              placeholder="Edite o código fonte em Markdown..."
            />
          )}
        </div>
      </div>

      {/* Bottom Hint Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 dark:bg-[#12141c]/70 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 rounded-b-2xl">
        <div className="flex items-center gap-3">
          <span>💡 <strong>Ferramentas Verticais</strong>: Fixas na lateral esquerda, sempre visíveis enquanto você rola o documento.</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">🎨 Cor do Texto | 🖍️ Marca-Texto / Fundo | ✨ IA</span>
        </div>
        <div>
          <span>{activeMode === "visual" ? "Modo Visual Ativo" : "Modo Código Ativo"}</span>
        </div>
      </div>
    </div>
  );
}
