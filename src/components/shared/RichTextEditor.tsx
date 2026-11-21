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
  Link as LinkIcon,
  Unlink,
  Minus,
  Subscript,
  Superscript,
  StickyNote,
  Copy,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { markdownToHtml, htmlToMarkdown } from "@/lib/rich-text-utils";
import { getThemePalette } from "@/lib/theme-palettes";
import toast from "react-hot-toast";

const TB_BTN =
  "w-9 h-9 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

function TbGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1 pb-1.5 mb-1.5 border-b border-gray-200/70 dark:border-gray-800/90 last:border-b-0 last:pb-0 last:mb-0",
        className
      )}
    >
      {children}
    </div>
  );
}

function TbBtn({
  title,
  onClick,
  children,
  className,
  disabled,
  active,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        TB_BTN,
        active && "bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40",
        className
      )}
    >
      {children}
    </button>
  );
}

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
  const historyRef = useRef<{ stack: string[]; index: number }>({ stack: [], index: -1 });
  const lastHistoryTimeRef = useRef<number>(0);

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

  // Push a snapshot onto the undo/redo stack
  const pushHistorySnapshot = useCallback((html: string, immediate = false) => {
    const h = historyRef.current;
    if (h.index >= 0 && h.stack[h.index] === html) return;

    const now = Date.now();
    if (!immediate && now - lastHistoryTimeRef.current < 500 && h.index > 0) {
      h.stack[h.index] = html;
      lastHistoryTimeRef.current = now;
      return;
    }

    const nextStack = h.stack.slice(0, h.index + 1);
    nextStack.push(html);
    if (nextStack.length > 80) nextStack.shift();
    historyRef.current = {
      stack: nextStack,
      index: nextStack.length - 1,
    };
    lastHistoryTimeRef.current = immediate ? 0 : now;
  }, []);

  // Ensure current DOM state is recorded before a programmatic toolbar mutation
  const recordPreMutationSnapshot = useCallback(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const h = historyRef.current;
    if (h.index < 0 || h.stack[h.index] !== currentHtml) {
      pushHistorySnapshot(currentHtml, true);
    }
  }, [pushHistorySnapshot]);

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
        pushHistorySnapshot(html, true);
      }
      isInternalUpdateRef.current = false;
    }
  }, [value, activeMode, pushHistorySnapshot]);

  // Handle content changes in visual editor
  const handleEditorInput = useCallback((immediateHistory = true) => {
    if (!editorRef.current) return;
    isInternalUpdateRef.current = true;
    const currentHtml = editorRef.current.innerHTML;
    pushHistorySnapshot(currentHtml, immediateHistory);

    const convertedMd = htmlToMarkdown(currentHtml);
    setMarkdownSource(convertedMd);

    const chars = convertedMd.length;
    const words = convertedMd.trim().split(/\s+/).filter(Boolean).length;
    setCharCount(chars);
    setWordCount(words);

    onChange(convertedMd);
  }, [onChange, pushHistorySnapshot]);

  // Listen for direct DOM updates from AISelectionAssistant
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onDomUpdated = () => handleEditorInput(true);
    el.addEventListener("medsetup:richtext-dom-updated", onDomUpdated);
    return () => el.removeEventListener("medsetup:richtext-dom-updated", onDomUpdated);
  }, [handleEditorInput, activeMode]);

  // Custom Undo (Ctrl+Z) — restores any toolbar block/callout/quote/table/color or typing change
  const handleUndo = useCallback(() => {
    if (activeMode !== "visual" || !editorRef.current) return;
    editorRef.current.focus();
    const h = historyRef.current;
    // Sync any unsaved DOM diff onto stack before stepping back
    const liveHtml = editorRef.current.innerHTML;
    if (h.index >= 0 && h.stack[h.index] !== liveHtml) {
      pushHistorySnapshot(liveHtml, true);
    }
    if (historyRef.current.index > 0) {
      historyRef.current.index -= 1;
      const prevHtml = historyRef.current.stack[historyRef.current.index];
      isInternalUpdateRef.current = true;
      editorRef.current.innerHTML = prevHtml;
      const convertedMd = htmlToMarkdown(prevHtml);
      setMarkdownSource(convertedMd);
      setCharCount(convertedMd.length);
      setWordCount(convertedMd.trim().split(/\s+/).filter(Boolean).length);
      onChange(convertedMd);
    } else {
      document.execCommand("undo", false);
    }
  }, [activeMode, onChange, pushHistorySnapshot]);

  // Custom Redo (Ctrl+Y / Ctrl+Shift+Z)
  const handleRedo = useCallback(() => {
    if (activeMode !== "visual" || !editorRef.current) return;
    editorRef.current.focus();
    if (historyRef.current.index < historyRef.current.stack.length - 1) {
      historyRef.current.index += 1;
      const nextHtml = historyRef.current.stack[historyRef.current.index];
      isInternalUpdateRef.current = true;
      editorRef.current.innerHTML = nextHtml;
      const convertedMd = htmlToMarkdown(nextHtml);
      setMarkdownSource(convertedMd);
      setCharCount(convertedMd.length);
      setWordCount(convertedMd.trim().split(/\s+/).filter(Boolean).length);
      onChange(convertedMd);
    } else {
      document.execCommand("redo", false);
    }
  }, [activeMode, onChange]);

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

  // Find closest ancestor (or intersecting child) element matching any of tagNames inside editorRef
  const findClosestTag = useCallback((tagNames: string[]): HTMLElement | null => {
    const root = editorRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return null;
    const upper = tagNames.map((t) => t.toUpperCase());

    const climb = (start: Node | null): HTMLElement | null => {
      let node: Node | null = start;
      while (node && node !== root) {
        if (node instanceof HTMLElement && upper.includes(node.tagName)) {
          return node;
        }
        node = node.parentNode;
      }
      return null;
    };

    const fromAnchor = climb(sel.anchorNode);
    if (fromAnchor) return fromAnchor;
    const fromFocus = climb(sel.focusNode);
    if (fromFocus) return fromFocus;

    if (!sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const container =
        range.commonAncestorContainer instanceof HTMLElement
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
      if (container && root.contains(container)) {
        const match = Array.from(container.querySelectorAll<HTMLElement>(upper.join(","))).find((el) =>
          sel.containsNode(el, true)
        );
        if (match) return match;
      }
    }
    return null;
  }, []);

  // Unwrap an inline element, keeping its child nodes and restoring selection around them
  const unwrapInlineElement = (el: HTMLElement) => {
    recordPreMutationSnapshot();
    const parent = el.parentNode;
    if (!parent) return;
    const first = el.firstChild;
    const last = el.lastChild;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
    if (first && last) {
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.setStartBefore(first);
        range.setEndAfter(last);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  // Unwrap a blockquote (and optionally remove the "💡 Nota importante:" callout prefix) into normal paragraph(s)
  const unwrapBlockquote = (bq: HTMLElement, stripCalloutPrefix = false) => {
    recordPreMutationSnapshot();
    const parent = bq.parentNode;
    if (!parent) return;

    if (stripCalloutPrefix || /💡\s*Nota importante:?/i.test(bq.textContent || "")) {
      bq.querySelectorAll("strong, b").forEach((s) => {
        if (/^💡?\s*Nota importante:?\s*$/i.test((s.textContent || "").trim())) {
          const next = s.nextSibling;
          if (next && next.nodeType === Node.TEXT_NODE && next.nodeValue) {
            next.nodeValue = next.nodeValue.replace(/^\s+/, "");
          }
          s.remove();
        }
      });
      const walker = document.createTreeWalker(bq, NodeFilter.SHOW_TEXT);
      const firstText = walker.nextNode() as Text | null;
      if (firstText && firstText.nodeValue) {
        firstText.nodeValue = firstText.nodeValue.replace(/^\s*💡\s*Nota importante:\s*/i, "");
      }
    }

    const blockTags = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "TABLE", "BLOCKQUOTE"]);
    let firstInserted: Node | null = null;
    let inlineBucket: HTMLParagraphElement | null = null;

    Array.from(bq.childNodes).forEach((child) => {
      if (child instanceof HTMLElement && blockTags.has(child.tagName)) {
        inlineBucket = null;
        parent.insertBefore(child, bq);
        if (!firstInserted) firstInserted = child;
      } else {
        if (!inlineBucket) {
          inlineBucket = document.createElement("p");
          parent.insertBefore(inlineBucket, bq);
          if (!firstInserted) firstInserted = inlineBucket;
        }
        inlineBucket.appendChild(child);
      }
    });

    if (!firstInserted) {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      parent.insertBefore(p, bq);
      firstInserted = p;
    }

    parent.removeChild(bq);

    const sel = window.getSelection();
    if (sel && firstInserted) {
      const range = document.createRange();
      range.selectNodeContents(firstInserted);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // Helper to execute standard editor commands
  const executeCommand = (command: string, cmdValue: string | undefined = undefined) => {
    if (activeMode !== "visual") return;
    if (command === "undo") {
      handleUndo();
      return;
    }
    if (command === "redo") {
      handleRedo();
      return;
    }
    recordPreMutationSnapshot();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, cmdValue);
    handleEditorInput(true);
  };

  // Toggle inline formatting (also unwraps tag when cursor is collapsed inside an existing formatted word/phrase)
  const executeInlineToggle = (command: string, tagNames: string[]) => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
    if (editorRef.current) editorRef.current.focus();
    const sel = window.getSelection();
    const existing = findClosestTag(tagNames);
    if (existing && sel && (sel.isCollapsed || sel.toString().trim() === (existing.textContent || "").trim())) {
      unwrapInlineElement(existing);
      handleEditorInput(true);
      return;
    }
    document.execCommand(command, false);
    handleEditorInput(true);
  };

  // Format Headings with toggle-off back to paragraph when clicked a second time
  const formatHeading = (level: "h1" | "h2" | "h3" | "p") => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
    if (editorRef.current) editorRef.current.focus();

    if (level === "p") {
      const bq = findClosestTag(["BLOCKQUOTE"]);
      if (bq) {
        unwrapBlockquote(bq, true);
        handleEditorInput(true);
        return;
      }
    }

    const existingHeading = level !== "p" ? findClosestTag([level.toUpperCase()]) : null;
    const targetTag = existingHeading ? "p" : level;

    try {
      document.execCommand("formatBlock", false, `<${targetTag}>`);
    } catch {
      document.execCommand("formatBlock", false, targetTag.toUpperCase());
    }
    handleEditorInput(true);
  };

  // Remove inline style property from spans/fonts and unwrap those left empty
  const stripStyleProp = (selector: string, prop: "color" | "backgroundColor") => {
    const root = editorRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.tagName === "FONT") {
        el.removeAttribute("color");
      } else {
        el.style[prop] = "";
      }
      const hasStyle = (el.getAttribute("style") || "").trim().length > 0;
      const isBareFont = el.tagName === "FONT" && el.attributes.length === 0;
      const isBareSpan = el.tagName === "SPAN" && !hasStyle && !el.className;
      if ((isBareFont || isBareSpan) && el.parentNode) {
        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
        el.remove();
      }
    });
  };

  // Normalize any CSS color string (hex or rgb) to lowercase rgb(...) via temporary element for comparison
  const normalizeColor = (c: string): string => {
    if (!c || c === "inherit" || c === "transparent") return c;
    const probe = document.createElement("span");
    probe.style.color = c;
    return probe.style.color.replace(/\s+/g, "").toLowerCase();
  };

  // Apply Text Color ("inherit" = cor padrão do tema; clicar na mesma cor já ativa também remove a cor)
  const applyTextColor = (color: string) => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
    if (editorRef.current) editorRef.current.focus();

    let effectiveColor = color;
    const coloredEl = findClosestTag(["SPAN", "FONT"]);
    if (color !== "inherit" && coloredEl) {
      const currentColor = coloredEl.style?.color || coloredEl.getAttribute("color") || "";
      if (currentColor && normalizeColor(currentColor) === normalizeColor(color)) {
        effectiveColor = "inherit";
      }
    }

    try {
      document.execCommand("styleWithCSS", false, "true");
      if (effectiveColor === "inherit") {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && coloredEl) {
          coloredEl.style.color = "";
          coloredEl.removeAttribute("color");
          if (
            (coloredEl.tagName === "FONT" && coloredEl.attributes.length === 0) ||
            (coloredEl.tagName === "SPAN" && !(coloredEl.getAttribute("style") || "").trim() && !coloredEl.className)
          ) {
            unwrapInlineElement(coloredEl);
          }
        } else {
          document.execCommand("foreColor", false, "#010203");
          stripStyleProp('span[style*="rgb(1, 2, 3)"], span[style*="#010203"], font[color="#010203"]', "color");
        }
      } else {
        document.execCommand("foreColor", false, effectiveColor);
      }
    } finally {
      document.execCommand("styleWithCSS", false, "false");
    }
    handleEditorInput();
    setShowTextColorMenu(false);
  };

  // Apply Background / Highlight Color (clicar novamente na mesma cor ou em "Sem destaque" remove o marca-texto)
  const applyHighlightColor = (color: string) => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
    if (editorRef.current) editorRef.current.focus();

    const markEl = findClosestTag(["MARK"]);
    const spanEl = findClosestTag(["SPAN"]);
    const hasSpanBg = spanEl && !!spanEl.style?.backgroundColor && spanEl.style.backgroundColor !== "transparent";

    const isSameHighlight =
      color !== "transparent" &&
      ((markEl && (!markEl.style?.backgroundColor || normalizeColor(markEl.style.backgroundColor) === normalizeColor(color))) ||
        (hasSpanBg && normalizeColor(spanEl!.style.backgroundColor) === normalizeColor(color)));

    const effectiveColor = isSameHighlight ? "transparent" : color;

    if (effectiveColor === "transparent") {
      if (markEl) {
        unwrapInlineElement(markEl);
      }
      if (hasSpanBg && spanEl) {
        spanEl.style.backgroundColor = "";
        if (!(spanEl.getAttribute("style") || "").trim() && !spanEl.className) {
          unwrapInlineElement(spanEl);
        }
      }
    }

    try {
      document.execCommand("hiliteColor", false, effectiveColor);
    } catch {
      document.execCommand("backColor", false, effectiveColor);
    }
    if (effectiveColor === "transparent") {
      stripStyleProp('span[style*="background-color: transparent"], span[style*="rgba(0, 0, 0, 0)"]', "backgroundColor");
    }
    handleEditorInput();
    setShowBgColorMenu(false);
  };

  // Insert HTML at current cursor/selection
  const insertHtmlAtCursor = (html: string) => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
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

  const tbBtn =
    "w-8 h-8 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer";

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Insert / unwrap link (toggle)
  const handleInsertLink = () => {
    if (activeMode !== "visual") return;
    if (editorRef.current) editorRef.current.focus();

    const existingLink = findClosestTag(["A"]);
    if (existingLink) {
      unwrapInlineElement(existingLink);
      handleEditorInput();
      return;
    }

    const sel = window.getSelection();
    const selected = sel ? sel.toString() : "";
    const url = prompt("Cole o endereço do link (https://...):");
    if (!url || !url.trim()) return;
    const clean = url.trim();
    if (selected) {
      executeCommand("createLink", clean);
    } else {
      insertHtmlAtCursor(`<a href="${escapeHtml(clean)}">${escapeHtml(clean)}</a>&nbsp;`);
    }
  };

  // Toggle inline code (wraps selected text or unwraps existing <code>)
  const handleInlineCode = () => {
    if (activeMode !== "visual") return;
    if (editorRef.current) editorRef.current.focus();

    const existingCode = findClosestTag(["CODE"]);
    if (existingCode) {
      unwrapInlineElement(existingCode);
      handleEditorInput();
      return;
    }

    const sel = window.getSelection();
    const selected = sel ? sel.toString() : "";
    if (!selected) {
      toast.error("Selecione um trecho para formatar como código.");
      return;
    }
    document.execCommand("insertHTML", false, `<code>${escapeHtml(selected)}</code>`);
    handleEditorInput();
  };

  // Toggle blockquote (adds quote or removes existing quote on the current phrase/block)
  const handleToggleQuote = () => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
    if (editorRef.current) editorRef.current.focus();

    const existingBq = findClosestTag(["BLOCKQUOTE"]);
    if (existingBq) {
      unwrapBlockquote(existingBq, true);
      handleEditorInput(true);
      return;
    }

    try {
      document.execCommand("formatBlock", false, "<blockquote>");
    } catch {
      document.execCommand("formatBlock", false, "BLOCKQUOTE");
    }
    handleEditorInput(true);
  };

  // Toggle callout / important note box (removes if already inside a callout/blockquote, or wraps current phrase/selection)
  const handleInsertCallout = () => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
    if (editorRef.current) editorRef.current.focus();

    const existingBq = findClosestTag(["BLOCKQUOTE"]);
    if (existingBq) {
      unwrapBlockquote(existingBq, true);
      handleEditorInput(true);
      return;
    }

    const sel = window.getSelection();
    const selected = sel ? sel.toString().trim() : "";
    if (selected) {
      insertHtmlAtCursor(
        `<blockquote><p><strong>💡 Nota importante:</strong> ${escapeHtml(selected)}</p></blockquote>`
      );
      return;
    }

    const currentBlock = findClosestTag(["P", "DIV", "H1", "H2", "H3", "H4"]);
    if (currentBlock && (currentBlock.textContent || "").trim().length > 0) {
      const bq = document.createElement("blockquote");
      const p = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = "💡 Nota importante:";
      p.appendChild(strong);
      p.appendChild(document.createTextNode(" "));
      while (currentBlock.firstChild) {
        p.appendChild(currentBlock.firstChild);
      }
      bq.appendChild(p);
      currentBlock.replaceWith(bq);

      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(p);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      handleEditorInput(true);
      return;
    }

    insertHtmlAtCursor(
      `<blockquote><p><strong>💡 Nota importante:</strong> Escreva aqui...</p></blockquote><p><br></p>`
    );
  };

  // Copy whole document as Markdown
  const handleCopyAll = async () => {
    try {
      const md = editorRef.current ? htmlToMarkdown(editorRef.current.innerHTML) : markdownSource;
      await navigator.clipboard.writeText(md);
      toast.success("Documento copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  // Table helpers (add / remove rows and columns at the cursor)
  const getCurrentCell = (): HTMLTableCellElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && (node.tagName === "TD" || node.tagName === "TH")) {
        return node as HTMLTableCellElement;
      }
      node = node.parentNode;
    }
    return null;
  };

  const tableAction = (action: "addRow" | "addCol" | "delRow" | "delCol") => {
    const cell = getCurrentCell();
    if (!cell) {
      toast.error("Clique dentro de uma célula da tabela primeiro.");
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    const table = row.closest("table") as HTMLTableElement | null;
    if (!table) return;
    const colIndex = cell.cellIndex;

    if (action === "addRow") {
      const newRow = document.createElement("tr");
      const refCells = Array.from(row.cells);
      refCells.forEach((rc, i) => {
        const td = document.createElement("td");
        td.className = rc.className.replace(/font-bold|text-white/g, "").trim();
        td.setAttribute("style", "border: 1px solid #E2E8F0; padding: 8px 12px;" + (i === 0 ? " font-weight: 600;" : ""));
        td.innerHTML = "<br>";
        newRow.appendChild(td);
      });
      if (row.parentElement?.tagName === "THEAD") {
        const body = table.tBodies[0] || table.appendChild(document.createElement("tbody"));
        body.insertBefore(newRow, body.firstChild);
      } else {
        row.after(newRow);
      }
    } else if (action === "addCol") {
      Array.from(table.rows).forEach((r) => {
        const ref = r.cells[colIndex];
        if (!ref) return;
        const isHead = ref.tagName === "TH";
        const nc = document.createElement(isHead ? "th" : "td");
        nc.className = ref.className;
        const refStyle = ref.getAttribute("style");
        if (refStyle) nc.setAttribute("style", refStyle);
        nc.innerHTML = isHead ? "Nova coluna" : "<br>";
        ref.after(nc);
      });
    } else if (action === "delRow") {
      if (row.parentElement?.tagName === "THEAD" || table.rows.length <= 2) {
        toast.error("Não é possível excluir o cabeçalho ou a única linha de dados.");
        return;
      }
      row.remove();
    } else if (action === "delCol") {
      if (row.cells.length <= 1) {
        toast.error("A tabela precisa ter ao menos uma coluna.");
        return;
      }
      Array.from(table.rows).forEach((r) => r.cells[colIndex]?.remove());
    }
    handleEditorInput();
  };

  // Find & replace across the document text
  const handleFindReplace = () => {
    const root = editorRef.current;
    if (!root || activeMode !== "visual") return;
    const find = prompt("Localizar (todas as ocorrências):");
    if (!find) return;
    const repl = prompt(`Substituir "${find}" por:`, "");
    if (repl === null) return;
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    let count = 0;
    nodes.forEach((n) => {
      const v = n.nodeValue || "";
      const matches = v.match(re);
      if (matches) {
        count += matches.length;
        n.nodeValue = v.replace(re, () => repl);
      }
    });
    if (count > 0) {
      handleEditorInput();
      toast.success(`${count} ocorrência(s) substituída(s).`);
    } else {
      toast.error("Nenhuma ocorrência encontrada.");
    }
  };

  // Clear all formatting on current selection or block (including blockquote/code/mark/link)
  const handleClearFormatting = () => {
    if (activeMode !== "visual") return;
    recordPreMutationSnapshot();
    if (editorRef.current) editorRef.current.focus();

    const bq = findClosestTag(["BLOCKQUOTE"]);
    if (bq) unwrapBlockquote(bq, true);
    const inlineTags = findClosestTag(["CODE", "MARK", "A", "SUB", "SUP", "DEL", "S", "STRIKE", "U", "EM", "I", "STRONG", "B"]);
    if (inlineTags) unwrapInlineElement(inlineTags);

    document.execCommand("removeFormat", false);
    handleEditorInput(true);
  };

  const [inTable, setInTable] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    h1: false,
    h2: false,
    h3: false,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    sub: false,
    sup: false,
    ul: false,
    ol: false,
    quote: false,
    callout: false,
    link: false,
    code: false,
  });

  const refreshActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    const root = editorRef.current;
    if (!sel || !sel.anchorNode || !root || !root.contains(sel.anchorNode)) return;
    setInTable(getCurrentCell() !== null);

    const bq = findClosestTag(["BLOCKQUOTE"]);
    const isCallout = !!bq && /💡\s*Nota importante:?/i.test(bq.textContent || "");

    setActiveFormats({
      h1: !!findClosestTag(["H1"]),
      h2: !!findClosestTag(["H2"]),
      h3: !!findClosestTag(["H3"]),
      bold: !!findClosestTag(["B", "STRONG"]) || document.queryCommandState("bold"),
      italic: !!findClosestTag(["I", "EM"]) || document.queryCommandState("italic"),
      underline: !!findClosestTag(["U"]) || document.queryCommandState("underline"),
      strike: !!findClosestTag(["S", "STRIKE", "DEL"]) || document.queryCommandState("strikeThrough"),
      sub: !!findClosestTag(["SUB"]) || document.queryCommandState("subscript"),
      sup: !!findClosestTag(["SUP"]) || document.queryCommandState("superscript"),
      ul: !!findClosestTag(["UL"]) || document.queryCommandState("insertUnorderedList"),
      ol: !!findClosestTag(["OL"]) || document.queryCommandState("insertOrderedList"),
      quote: !!bq && !isCallout,
      callout: isCallout,
      link: !!findClosestTag(["A"]),
      code: !!findClosestTag(["CODE"]),
    });
  }, [findClosestTag]);

  useEffect(() => {
    if (activeMode !== "visual") return;
    document.addEventListener("selectionchange", refreshActiveFormats);
    return () => document.removeEventListener("selectionchange", refreshActiveFormats);
  }, [activeMode, refreshActiveFormats]);

  // Keyboard shortcuts inside the visual editor (and Backspace to exit quote / callout box)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === "z" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleUndo();
      refreshActiveFormats();
      return;
    }
    if ((mod && key === "y") || (mod && e.shiftKey && key === "z")) {
      e.preventDefault();
      e.stopPropagation();
      handleRedo();
      refreshActiveFormats();
      return;
    }
    if (mod && !e.shiftKey && !e.altKey && key === "b") {
      e.preventDefault();
      executeInlineToggle("bold", ["B", "STRONG"]);
      refreshActiveFormats();
      return;
    }
    if (mod && !e.shiftKey && !e.altKey && key === "i") {
      e.preventDefault();
      executeInlineToggle("italic", ["I", "EM"]);
      refreshActiveFormats();
      return;
    }
    if (mod && !e.shiftKey && !e.altKey && key === "u") {
      e.preventDefault();
      executeInlineToggle("underline", ["U"]);
      refreshActiveFormats();
      return;
    }
    if (mod && e.shiftKey && key === "x") {
      e.preventDefault();
      executeInlineToggle("strikeThrough", ["S", "STRIKE", "DEL"]);
      refreshActiveFormats();
      return;
    }
    if (mod && !e.shiftKey && key === "k") {
      e.preventDefault();
      handleInsertLink();
      refreshActiveFormats();
      return;
    }
    if (mod && !e.shiftKey && key === "e") {
      e.preventDefault();
      handleInlineCode();
      refreshActiveFormats();
      return;
    }
    if (mod && e.shiftKey && key === "q") {
      e.preventDefault();
      handleToggleQuote();
      refreshActiveFormats();
      return;
    }
    if (mod && e.shiftKey && key === "d") {
      e.preventDefault();
      handleInsertCallout();
      refreshActiveFormats();
      return;
    }
    if (mod && e.altKey && (key === "1" || key === "2" || key === "3" || key === "0")) {
      e.preventDefault();
      formatHeading(key === "0" ? "p" : (`h${key}` as "h1" | "h2" | "h3"));
      refreshActiveFormats();
      return;
    }

    // Backspace inside a blockquote / callout ("Nota importante"): unwrap if empty or at start of content
    if (e.key === "Backspace") {
      const bq = findClosestTag(["BLOCKQUOTE"]);
      if (bq) {
        const rawText = (bq.textContent || "").replace(/\u00a0/g, " ").trim();
        const withoutPrefix = rawText.replace(/^💡?\s*Nota importante:?\s*/i, "").trim();
        const sel = window.getSelection();
        let isAtStart = false;
        if (sel && sel.isCollapsed && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0).cloneRange();
          r.selectNodeContents(bq);
          r.setEnd(sel.anchorNode!, sel.anchorOffset);
          const beforeText = r.toString().replace(/\u00a0/g, " ").trim();
          if (!beforeText || /^💡?\s*Nota importante:?$/i.test(beforeText)) {
            isAtStart = true;
          }
        }
        if (!rawText || !withoutPrefix || withoutPrefix === "Escreva aqui..." || isAtStart) {
          e.preventDefault();
          unwrapBlockquote(bq, true);
          handleEditorInput(true);
          refreshActiveFormats();
        }
      }
    }
  };

  // Global keyboard shortcut listener for Ctrl+Z / Ctrl+Y even right after clicking a toolbar button
  useEffect(() => {
    if (activeMode !== "visual") return;
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        refreshActiveFormats();
      } else if ((mod && key === "y") || (mod && e.shiftKey && key === "z")) {
        e.preventDefault();
        handleRedo();
        refreshActiveFormats();
      }
    };
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [activeMode, handleUndo, handleRedo, refreshActiveFormats]);

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
          text: selectedText,
          selectedText,
          action,
          context: markdownSource,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao processar texto com a IA");
      }

      const data = await res.json();
      const outputHtml = data.resultHtml || markdownToHtml(data.result || data.resultText || "");

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
    { label: "Padrão (tema)", color: "inherit", bg: "bg-gray-800 dark:bg-gray-200" },
    { label: "Branco", color: "#FFFFFF", bg: "bg-white" },
    { label: "Vermelho (Remédio)", color: "#DC2626", bg: "bg-red-600" },
    { label: "Verde (Doença)", color: "#16A34A", bg: "bg-emerald-600" },
    { label: "Azul Clínico", color: "#2563EB", bg: "bg-blue-600" },
    { label: "Âmbar / Alerta", color: "#D97706", bg: "bg-amber-600" },
    { label: "Roxo Diagnóstico", color: "#9333EA", bg: "bg-purple-600" },
    { label: "Cinza", color: "#6B7280", bg: "bg-gray-500" },
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
    isRoxo ? "bg-gray-900" :
    isAzul ? "bg-blue-600" :
    isCinza ? "bg-zinc-900" :
    "bg-emerald-600";

  const accentHoverClass =
    isVermelho ? "hover:bg-red-700" :
    isRoxo ? "hover:bg-black" :
    isAzul ? "hover:bg-blue-700" :
    isCinza ? "hover:bg-black" :
    "hover:bg-emerald-700";

  const accentBorderClass =
    isVermelho ? "border-red-500/40 dark:border-red-500/30" :
    isRoxo ? "border-gray-500/40 dark:border-gray-500/30" :
    isAzul ? "border-blue-500/40 dark:border-blue-500/30" :
    isCinza ? "border-zinc-500/40 dark:border-zinc-500/30" :
    "border-emerald-500/40 dark:border-emerald-500/30";

  const h2Color =
    isVermelho ? "#b91c1c" :
    isRoxo ? "#0f172a" :
    isAzul ? "#1d4ed8" :
    isCinza ? "#0f172a" :
    "#065f46";

  const h2DarkColor =
    isVermelho ? "#f87171" :
    isRoxo ? "#f8fafc" :
    isAzul ? "#93c5fd" :
    isCinza ? "#f8fafc" :
    "#6ee7b7";

  const h3Color =
    isVermelho ? "#dc2626" :
    isRoxo ? "#0f172a" :
    isAzul ? "#2563eb" :
    isCinza ? "#0f172a" :
    "#059669";

  const h3DarkColor =
    isVermelho ? "#fca5a5" :
    isRoxo ? "#f1f5f9" :
    isAzul ? "#bfdbfe" :
    isCinza ? "#f1f5f9" :
    "#a7f3d0";

  const blockquoteColor =
    isVermelho ? "#dc2626" :
    isRoxo ? "#0f172a" :
    isAzul ? "#2563eb" :
    isCinza ? "#0f172a" :
    "#059669";

  const blockquoteDarkColor =
    isVermelho ? "#ef4444" :
    isRoxo ? "#94a3b8" :
    isAzul ? "#3b82f6" :
    isCinza ? "#94a3b8" :
    "#10b981";

  const dividerBorderColor =
    isVermelho ? "#fecaca" :
    isRoxo ? "#e2e8f0" :
    isAzul ? "#bfdbfe" :
    isCinza ? "#e4e4e7" :
    "#a7f3d0";

  const dividerBorderDarkColor =
    isVermelho ? "#7f1d1d" :
    isRoxo ? "#334155" :
    isAzul ? "#1e3a8a" :
    isCinza ? "#3f3f46" :
    "#064e3b";

  const tableHeaderBg =
    isVermelho ? "#991b1b" :
    isRoxo ? "#0f172a" :
    isAzul ? "#1e3a8a" :
    isCinza ? "#18181b" :
    "#065f46";

  const tableHeaderBorder =
    isVermelho ? "#7f1d1d" :
    isRoxo ? "#1e293b" :
    isAzul ? "#1e40af" :
    isCinza ? "#27272a" :
    "#047857";

  return (
    <div className={`relative w-full max-w-[780px] mx-auto ${className}`}>
      {/* Scoped styles guaranteeing Heading sizes and paragraph rhythm matching editorial document proportions */}
      <style jsx global>{`
        .studyflow-editor-content {
          outline: none;
          font-size: 13.5px !important;
          line-height: 1.65 !important;
        }
        .studyflow-editor-content h1 {
          font-size: 1.35rem !important;
          font-weight: 800 !important;
          line-height: 1.3 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.55rem !important;
          color: #0f172a !important;
        }
        .studyflow-editor-content h2 {
          font-size: 1.15rem !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
          margin-top: 1.4rem !important;
          margin-bottom: 0.65rem !important;
          color: ${h2Color} !important;
          border-bottom: 1px solid #e2e8f0 !important;
          padding-bottom: 0.35rem !important;
        }
        .studyflow-editor-content h3 {
          font-size: 0.98rem !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
          margin-top: 1.15rem !important;
          margin-bottom: 0.5rem !important;
          color: ${h3Color} !important;
          border-bottom: 1px solid #e2e8f0 !important;
          padding-bottom: 0.25rem !important;
        }
        .studyflow-editor-content h4 {
          font-size: 0.9rem !important;
          font-weight: 700 !important;
          margin-top: 0.85rem !important;
          margin-bottom: 0.3rem !important;
          color: #0f172a !important;
        }
        .studyflow-editor-content p {
          font-size: 13.5px !important;
          margin-top: 0.45rem;
          margin-bottom: 0.55rem;
          line-height: 1.65 !important;
          color: #1e293b;
        }
        .dark .studyflow-editor-content p {
          color: #e2e8f0;
        }
        .studyflow-editor-content blockquote {
          border-left: 3px solid ${blockquoteColor};
          padding-left: 0.9rem;
          margin: 0.75rem 0;
          font-size: 13.5px !important;
          font-style: italic;
          color: #4b5563;
        }
        .studyflow-editor-content ul {
          list-style-type: disc;
          padding-left: 1.4rem;
          margin: 0.45rem 0 0.65rem 0;
          font-size: 13.5px !important;
          line-height: 1.65 !important;
        }
        .studyflow-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.4rem;
          margin: 0.45rem 0 0.65rem 0;
          font-size: 13.5px !important;
          line-height: 1.65 !important;
        }
        .studyflow-editor-content li {
          font-size: 13.5px !important;
          line-height: 1.65 !important;
          margin-top: 0.28rem;
          margin-bottom: 0.28rem;
        }
        .studyflow-editor-content ul li::marker {
          color: #cbd5e1 !important;
        }
        .dark .studyflow-editor-content ul li::marker {
          color: #475569 !important;
        }
        .studyflow-editor-content ol li::marker {
          color: #64748b !important;
          font-weight: 500;
        }
        .studyflow-editor-content a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        .studyflow-editor-content hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 1.15rem 0;
        }
        .dark .studyflow-editor-content hr { border-top-color: #334155; }
        .studyflow-editor-content code {
          padding: 0.1rem 0.35rem;
          border-radius: 0.375rem;
          background: #f1f5f9;
          color: #2563eb;
          font-family: ui-monospace, monospace;
          font-size: 0.85em;
        }
        .dark .studyflow-editor-content code { background: #1e293b; color: #60a5fa; }
        .studyflow-editor-content mark,
        .studyflow-editor-content span[style*="background-color"]:not([style*="transparent"]) {
          color: #0f172a;
        }
        .studyflow-editor-content mark {
          padding: 0.12rem 0.3rem;
          border-radius: 0.375rem;
        }
        .studyflow-editor-content table {
          width: 100% !important;
          min-width: 100% !important;
          border-collapse: collapse !important;
          margin: 1.15rem 0 !important;
          font-size: 12.5px !important;
        }
        .studyflow-editor-content th {
          background-color: ${tableHeaderBg} !important;
          color: #FFFFFF !important;
          font-weight: 700 !important;
          padding: 0.6rem 0.8rem !important;
          border: 1px solid ${tableHeaderBorder} !important;
          text-align: left !important;
          word-break: break-word !important;
          white-space: normal !important;
        }
        .studyflow-editor-content td {
          padding: 0.6rem 0.8rem !important;
          border: 1px solid #e2e8f0 !important;
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
          border-bottom-color: #1e293b !important;
        }
        .dark .studyflow-editor-content h3 {
          color: ${h3DarkColor} !important;
          border-bottom-color: #1e293b !important;
        }
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

        {/* FLOATING ISOLATED TOOLS BALLOON (Outside the text screen, floating on the left) */}
        {activeMode === "visual" && (
          <div className="md:absolute md:right-[100%] md:top-0 md:bottom-0 md:pr-3 z-30 pointer-events-none mb-3 md:mb-0">
            <aside
              onMouseDown={(e) => e.preventDefault()}
              className="pointer-events-auto md:sticky md:top-4 flex flex-row md:flex-col flex-wrap md:flex-nowrap items-center md:items-stretch gap-1 p-2 w-full md:w-[92px] max-h-none md:max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden [scrollbar-width:thin] bg-white/95 dark:bg-[#161824]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] rounded-2xl"
            >
            {/* Salvar / Restaurar / Cancelar */}
            {(onSave || onCancel || onRestoreOriginal) && (
              <TbGroup className={cn("shadow-xs", accentBorderClass)}>
                {onSave && (
                  <TbBtn
                    title="Salvar (Ctrl+S)"
                    onClick={onSave}
                    className={cn("text-white shadow-xs active:scale-95", accentBgClass, accentHoverClass, "hover:text-white dark:text-white")}
                  >
                    <Save className="w-[18px] h-[18px]" />
                  </TbBtn>
                )}
                {onRestoreOriginal && (
                  <TbBtn title="Voltar ao texto original" onClick={onRestoreOriginal} className="hover:text-amber-600">
                    <RotateCcw className="w-[18px] h-[18px]" />
                  </TbBtn>
                )}
                {onCancel && (
                  <TbBtn title="Cancelar edição" onClick={onCancel} className="hover:text-red-600">
                    <X className="w-[18px] h-[18px]" />
                  </TbBtn>
                )}
              </TbGroup>
            )}

            {/* Histórico */}
            <TbGroup>
              <TbBtn title="Desfazer (Ctrl+Z)" onClick={() => executeCommand("undo")}>
                <Undo className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Refazer (Ctrl+Y)" onClick={() => executeCommand("redo")}>
                <Redo className="w-[18px] h-[18px]" />
              </TbBtn>
            </TbGroup>

            {/* Estrutura: Parágrafo e títulos */}
            <TbGroup>
              <TbBtn title="Parágrafo normal" onClick={() => { formatHeading("p"); refreshActiveFormats(); }}>
                <Pilcrow className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Título (H1)" active={activeFormats.h1} onClick={() => { formatHeading("h1"); refreshActiveFormats(); }}>
                <Heading1 className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn
                title="Seção (H2)"
                active={activeFormats.h2}
                onClick={() => { formatHeading("h2"); refreshActiveFormats(); }}
                className={
                  isVermelho
                    ? "text-red-700 dark:text-red-300"
                    : isRoxo
                    ? "text-purple-700 dark:text-purple-300"
                    : isAzul
                    ? "text-blue-700 dark:text-blue-300"
                    : isCinza
                    ? "text-zinc-800 dark:text-zinc-200"
                    : "text-emerald-800 dark:text-emerald-300"
                }
              >
                <Heading2 className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Subseção (H3)" active={activeFormats.h3} onClick={() => { formatHeading("h3"); refreshActiveFormats(); }}>
                <Heading3 className="w-[18px] h-[18px]" />
              </TbBtn>
            </TbGroup>

            {/* Estilo do texto */}
            <TbGroup>
              <TbBtn title="Negrito (Ctrl+B)" active={activeFormats.bold} onClick={() => { executeInlineToggle("bold", ["B", "STRONG"]); refreshActiveFormats(); }}>
                <Bold className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Itálico (Ctrl+I)" active={activeFormats.italic} onClick={() => { executeInlineToggle("italic", ["I", "EM"]); refreshActiveFormats(); }}>
                <Italic className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Sublinhado (Ctrl+U)" active={activeFormats.underline} onClick={() => { executeInlineToggle("underline", ["U"]); refreshActiveFormats(); }}>
                <Underline className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Tachado" active={activeFormats.strike} onClick={() => { executeInlineToggle("strikeThrough", ["S", "STRIKE", "DEL"]); refreshActiveFormats(); }}>
                <Strikethrough className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Subscrito (H₂O)" active={activeFormats.sub} onClick={() => { executeInlineToggle("subscript", ["SUB"]); refreshActiveFormats(); }}>
                <Subscript className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Sobrescrito (m²)" active={activeFormats.sup} onClick={() => { executeInlineToggle("superscript", ["SUP"]); refreshActiveFormats(); }}>
                <Superscript className="w-[18px] h-[18px]" />
              </TbBtn>
            </TbGroup>

            {/* Cores */}
            <div className="flex flex-col gap-1 pb-1.5 mb-1.5 border-b border-gray-200/70 dark:border-gray-800/90">
              <div className="grid grid-cols-2 gap-1">
                <TbBtn
                  title="Cor do texto"
                  onClick={() => {
                    setShowTextColorMenu(!showTextColorMenu);
                    setShowBgColorMenu(false);
                  }}
                  className={cn("text-indigo-600 dark:text-indigo-400", showTextColorMenu && "bg-indigo-50 dark:bg-indigo-950/40")}
                >
                  <Palette className="w-[18px] h-[18px]" />
                </TbBtn>
                <TbBtn
                  title="Marca-texto"
                  onClick={() => {
                    setShowBgColorMenu(!showBgColorMenu);
                    setShowTextColorMenu(false);
                  }}
                  className={cn("text-amber-600 dark:text-amber-400", showBgColorMenu && "bg-amber-50 dark:bg-amber-950/40")}
                >
                  <Highlighter className="w-[18px] h-[18px]" />
                </TbBtn>
              </div>

              {showTextColorMenu && (
                <div className="grid grid-cols-4 gap-1.5 justify-items-center p-1.5 border-t border-gray-100 dark:border-gray-800">
                  {textColors.map((tc) => (
                    <button
                      key={tc.color}
                      type="button"
                      title={tc.label}
                      onClick={() => applyTextColor(tc.color)}
                      className={`w-4 h-4 rounded-full border border-gray-300 dark:border-gray-500 hover:scale-125 transition-transform cursor-pointer ${tc.bg}`}
                      style={{ backgroundColor: tc.color !== "inherit" ? tc.color : undefined }}
                    />
                  ))}
                </div>
              )}

              {showBgColorMenu && (
                <div className="grid grid-cols-4 gap-1.5 justify-items-center p-1.5 border-t border-gray-100 dark:border-gray-800">
                  {highlightColors.map((hc) => (
                    <button
                      key={hc.color}
                      type="button"
                      title={hc.label}
                      onClick={() => applyHighlightColor(hc.color)}
                      className={`w-4 h-4 rounded-full border border-gray-300 dark:border-gray-500 hover:scale-125 transition-transform cursor-pointer ${hc.bg}`}
                      style={{ backgroundColor: hc.color !== "transparent" ? hc.color : undefined }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Listas e blocos */}
            <TbGroup>
              <TbBtn title="Lista com marcadores" active={activeFormats.ul} onClick={() => { executeCommand("insertUnorderedList"); refreshActiveFormats(); }}>
                <List className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Lista numerada" active={activeFormats.ol} onClick={() => { executeCommand("insertOrderedList"); refreshActiveFormats(); }}>
                <ListOrdered className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn
                title="Citação (clique novamente para remover)"
                active={activeFormats.quote}
                onClick={() => {
                  handleToggleQuote();
                  refreshActiveFormats();
                }}
              >
                <Quote className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn
                title="Caixa de destaque (clique novamente para remover)"
                active={activeFormats.callout}
                onClick={() => {
                  handleInsertCallout();
                  refreshActiveFormats();
                }}
                className="text-amber-600 dark:text-amber-400"
              >
                <StickyNote className="w-[18px] h-[18px]" />
              </TbBtn>
            </TbGroup>

            {/* Inserir */}
            <TbGroup>
              <TbBtn title="Inserir tabela" onClick={handleInsertTable} className="text-emerald-700 dark:text-emerald-300">
                <TableIcon className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Inserir imagem" onClick={() => fileInputRef.current?.click()} className="text-blue-700 dark:text-blue-300">
                <ImageIcon className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn
                title="Inserir ou remover link"
                active={activeFormats.link}
                onClick={() => {
                  handleInsertLink();
                  refreshActiveFormats();
                }}
                className="text-blue-600 dark:text-blue-400"
              >
                <LinkIcon className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Linha divisória" onClick={() => executeCommand("insertHorizontalRule")}>
                <Minus className="w-[18px] h-[18px]" />
              </TbBtn>
            </TbGroup>

            {/* Tabela: aparece só quando o cursor está dentro de uma tabela */}
            {inTable && (
              <TbGroup className="border-emerald-300 dark:border-emerald-800">
                <TbBtn title="Adicionar linha abaixo" onClick={() => tableAction("addRow")} className="text-[11px] font-bold">+Lin</TbBtn>
                <TbBtn title="Adicionar coluna à direita" onClick={() => tableAction("addCol")} className="text-[11px] font-bold">+Col</TbBtn>
                <TbBtn title="Excluir linha atual" onClick={() => tableAction("delRow")} className="text-[11px] font-bold hover:text-red-600">−Lin</TbBtn>
                <TbBtn title="Excluir coluna atual" onClick={() => tableAction("delCol")} className="text-[11px] font-bold hover:text-red-600">−Col</TbBtn>
              </TbGroup>
            )}

            {/* Utilitários */}
            <TbGroup>
              <TbBtn title="Localizar e substituir" onClick={handleFindReplace}>
                <Search className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn
                title="Código em linha (clique novamente para remover)"
                active={activeFormats.code}
                onClick={() => {
                  handleInlineCode();
                  refreshActiveFormats();
                }}
              >
                <Code2 className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Limpar formatação" onClick={() => { handleClearFormatting(); refreshActiveFormats(); }}>
                <RemoveFormatting className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Copiar documento" onClick={handleCopyAll}>
                <Copy className="w-[18px] h-[18px]" />
              </TbBtn>
            </TbGroup>

            {/* IA */}
            <TbGroup>
              <TbBtn title="Expandir seleção com IA" onClick={() => handleAITextAction("expand")} className="text-indigo-600 dark:text-indigo-400" disabled={isAiLoading}>
                <Sparkles className="w-[18px] h-[18px]" />
              </TbBtn>
              <TbBtn title="Explicar seleção com IA" onClick={() => handleAITextAction("explain")} className="text-amber-600 dark:text-amber-400" disabled={isAiLoading}>
                <Lightbulb className="w-[18px] h-[18px]" />
              </TbBtn>
            </TbGroup>
            </aside>
          </div>
        )}

      {/* Editor Card (texto) */}
      <div className="w-full min-w-0 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] shadow-sm">

      {/* Top Header Bar: Counts & Mode Switcher */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/95 dark:bg-[#12141c] border-b border-gray-200 dark:border-gray-800 select-none rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
            Editor de Texto
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

        {/* Editor Body Area */}
        <div className="relative flex-1 bg-white dark:bg-[#1A1D27]">
          {activeMode === "visual" ? (
            <div
              ref={editorRef}
              contentEditable
              onInput={() => handleEditorInput(false)}
              onKeyDown={handleEditorKeyDown}
              onPaste={handlePaste}
              className="studyflow-editor-content py-7 sm:py-9 px-6 sm:px-10 md:px-12 text-[13.5px] text-gray-800 dark:text-gray-200 leading-[1.65] font-sans select-text"
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
              className="w-full py-7 sm:py-9 px-6 sm:px-10 md:px-12 font-mono text-xs bg-gray-50/50 dark:bg-[#12141c] text-gray-900 dark:text-gray-100 focus:outline-none leading-relaxed resize-y border-none"
              placeholder="Edite o código fonte em Markdown..."
            />
          )}
        </div>
      </div>

      {/* Bottom Hint Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 dark:bg-[#12141c]/70 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 rounded-b-2xl">
        <div className="flex items-center gap-3" />
        <div>
          <span>{activeMode === "visual" ? "Modo Visual Ativo" : "Modo Código Ativo"}</span>
        </div>
      </div>
      </div>
    </div>
  );
}
