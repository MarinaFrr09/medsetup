"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Lightbulb,
  Check,
  Copy,
  X,
  CornerDownLeft,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { markdownToHtml } from "@/lib/rich-text-utils";
import { cleanLatexAndBadges } from "@/lib/text-sanitize";
import toast from "react-hot-toast";

interface TargetSelection {
  element: HTMLTextAreaElement | HTMLInputElement | HTMLElement;
  start: number;
  end: number;
  selectedText: string;
  context: string;
}

export function AISelectionAssistant() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectionData, setSelectionData] = useState<TargetSelection | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"expand" | "explain" | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultAction, setResultAction] = useState<"expand" | "explain">("expand");
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Monitor selection across editable elements
  useEffect(() => {
    const handleSelection = () => {
      // Do not interrupt if an AI result is already open
      if (resultText || isLoading) return;

      const active = document.activeElement;
      if (!active) {
        setVisible(false);
        return;
      }

      const domSelection = typeof window !== "undefined" ? window.getSelection() : null;
      const isTextArea = active instanceof HTMLTextAreaElement;
      const isTextInput = active instanceof HTMLInputElement && active.type === "text";

      let targetElement: HTMLElement | null = null;
      if (domSelection && domSelection.rangeCount > 0) {
        const common = domSelection.getRangeAt(0).commonAncestorContainer;
        targetElement = common.nodeType === Node.ELEMENT_NODE ? (common as HTMLElement) : common.parentElement;
      }
      if (!targetElement && active) {
        targetElement = active as HTMLElement;
      }

      const editableParent = targetElement?.closest?.('[contenteditable="true"]') as HTMLElement | null;
      const isContentEditable = Boolean(
        editableParent ||
        (active && (active.getAttribute("contenteditable") === "true" || (active as HTMLElement).isContentEditable))
      );

      if (!isTextArea && !isTextInput && !isContentEditable) {
        if (!domSelection || domSelection.isCollapsed) {
          setVisible(false);
          return;
        }
      }

      let selectedText = "";
      let start = 0;
      let end = 0;
      let fullText = "";

      if (isTextArea || isTextInput) {
        const input = active as HTMLTextAreaElement | HTMLInputElement;
        start = input.selectionStart ?? 0;
        end = input.selectionEnd ?? 0;
        fullText = input.value;
        if (end > start) {
          selectedText = fullText.substring(start, end).trim();
        }
      } else {
        if (domSelection && !domSelection.isCollapsed) {
          selectedText = domSelection.toString().trim();
          fullText = editableParent?.innerText || (targetElement ? targetElement.innerText : (active as HTMLElement).innerText) || "";
          if (domSelection.rangeCount > 0) {
            savedRangeRef.current = domSelection.getRangeAt(0).cloneRange();
          }
        }
      }

      if (!selectedText || selectedText.length < 2) {
        setVisible(false);
        return;
      }

      // Determine floating button position
      let x = 0;
      let y = 0;

      if (domSelection && domSelection.rangeCount > 0) {
        try {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect && rect.width > 0 && rect.height > 0) {
            x = rect.left + rect.width / 2;
            y = rect.top - 46;
          }
        } catch {
          // ignore
        }
      }

      if (x === 0 && y === 0 && (isTextArea || isTextInput)) {
        const rect = (active as HTMLElement).getBoundingClientRect();
        x = rect.left + Math.min(250, rect.width / 2);
        y = Math.max(10, rect.top - 44);
      }

      // Keep within viewport bounds
      const screenW = window.innerWidth;
      const finalX = Math.max(160, Math.min(screenW - 160, x));
      const finalY = Math.max(12, y);

      const targetOrActive = editableParent || targetElement || (active as HTMLElement);

      setPosition({ x: finalX, y: finalY });
      setSelectionData({
        element: targetOrActive as any,
        start,
        end,
        selectedText,
        context: fullText,
      });
      setVisible(true);
    };

    const handleMouseUp = () => {
      setTimeout(handleSelection, 50);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["Shift", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        setTimeout(handleSelection, 50);
      } else if (e.key === "Escape") {
        setVisible(false);
        setResultText(null);
      }
    };

    // Global Undo / Redo support (Ctrl+Z / Cmd+Z / Ctrl+Y / Cmd+Shift+Z)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const active = document.activeElement;
        const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
        const isEditable = active?.getAttribute("contenteditable") === "true" || (active as HTMLElement)?.isContentEditable;

        if (isEditable && !isInput) {
          // Native browser execCommand handles undo/redo stack
          try {
            if (e.shiftKey) {
              document.execCommand("redo");
            } else {
              document.execCommand("undo");
            }
          } catch {}
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        const active = document.activeElement;
        const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
        const isEditable = active?.getAttribute("contenteditable") === "true" || (active as HTMLElement)?.isContentEditable;

        if (isEditable && !isInput) {
          try {
            document.execCommand("redo");
          } catch {}
        }
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [resultText, isLoading]);

  const handleTriggerAI = async (action: "expand" | "explain") => {
    if (!selectionData || !selectionData.selectedText) return;

    setIsLoading(true);
    setLoadingAction(action);
    setResultAction(action);

    const actionLabel = action === "expand" ? "Expandindo texto" : "Explicando conceito";
    const toastId = toast.loading(`${actionLabel} com IA...`);

    try {
      const res = await fetch("/api/ai/expand-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectionData.selectedText,
          action,
          context: selectionData.context,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao consultar a IA.");
      }

      const data = await res.json();
      setResultText(data.result);
      toast.success(
        action === "expand" ? "Expansão gerada com sucesso!" : "Explicação gerada com sucesso!",
        { id: toastId, icon: "💡" }
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Falha ao processar com IA.", { id: toastId });
      setVisible(false);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleApply = (mode: "replace" | "insertBelow") => {
    if (!selectionData || !resultText) return;

    const el = selectionData.element;

    // Check textarea or input
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const currentVal = el.value;
      const start = selectionData.start;
      const end = selectionData.end;

      let newVal = "";
      let newCursor = 0;

      if (mode === "replace") {
        newVal = currentVal.substring(0, start) + resultText + currentVal.substring(end);
        newCursor = start + resultText.length;
      } else {
        const insertion = `\n\n${resultText}\n`;
        newVal = currentVal.substring(0, end) + insertion + currentVal.substring(end);
        newCursor = end + insertion.length;
      }

      // Use prototype setter so React state onChange is properly invoked
      const prototype = Object.getPrototypeOf(el);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor && descriptor.set) {
        descriptor.set.call(el, newVal);
      } else {
        el.value = newVal;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      setTimeout(() => {
        el.focus();
        el.setSelectionRange(newCursor, newCursor);
      }, 50);

      toast.success(
        mode === "replace" ? "Texto substituído com sucesso!" : "Conteúdo inserido abaixo!",
        { icon: "✨" }
      );
    } else {
      // Check if element is contenteditable or inside an element that is contenteditable
      const editableContainer =
        (el && (el.getAttribute("contenteditable") === "true" || (el as HTMLElement).isContentEditable))
          ? (el as HTMLElement)
          : (el?.closest?.('[contenteditable="true"]') as HTMLElement | null);

      if (editableContainer) {
        editableContainer.focus();
        const sel = window.getSelection();
        if (savedRangeRef.current && sel) {
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
        }

        const formattedHtml = markdownToHtml(cleanLatexAndBadges(resultText));

        if (mode === "replace") {
          // Native execCommand pushes to the browser's undo stack (Ctrl+Z works!)
          const executed = document.execCommand("insertHTML", false, formattedHtml);
          if (!executed) {
            const range = savedRangeRef.current || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
            if (range) {
              range.deleteContents();
              const frag = range.createContextualFragment(formattedHtml);
              range.insertNode(frag);
            }
          }
        } else {
          if (sel) {
            sel.collapseToEnd();
          }
          const executed = document.execCommand("insertHTML", false, `<p><br></p>${formattedHtml}`);
          if (!executed) {
            const range = savedRangeRef.current || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
            if (range) {
              const frag = range.createContextualFragment(`<p><br></p>${formattedHtml}`);
              range.collapse(false);
              range.insertNode(frag);
            }
          }
        }

        editableContainer.dispatchEvent(new Event("input", { bubbles: true }));
        editableContainer.dispatchEvent(new Event("change", { bubbles: true }));

        toast.success(
          mode === "replace"
            ? "Texto substituído com sucesso! (Pressione Ctrl+Z para desfazer)"
            : "Conteúdo inserido abaixo! (Pressione Ctrl+Z para desfazer)",
          { icon: "✨" }
        );
      } else {
        // Element is read-only: NEVER inject raw unmanaged DOM nodes!
        navigator.clipboard?.writeText(resultText);
        toast.success(
          "Copiado para a área de transferência! (Clique no texto para editar e colar)",
          { icon: "📋" }
        );
      }
    }

    handleClose();
  };

  const handleCopyResult = async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      toast.success("Copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleClose = () => {
    setVisible(false);
    setResultText(null);
    setIsLoading(false);
    setLoadingAction(null);
  };

  // Convert raw markdown result into beautiful formatted HTML
  const formattedResultHtml = useMemo(() => {
    if (!resultText) return "";
    return markdownToHtml(cleanLatexAndBadges(resultText));
  }, [resultText]);

  if (!visible && !resultText) return null;

  return (
    <div ref={containerRef} className="ai-selection-assistant-portal">
      {/* 1. Floating Quick Action Bar when text is selected */}
      {visible && !resultText && (
        <div
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
          }}
          className="flex items-center gap-1.5 p-1.5 bg-gray-950 text-white rounded-xl shadow-2xl border border-gray-700 backdrop-blur-md animate-in fade-in zoom-in-95 select-none"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleTriggerAI("expand");
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            title="Aprofundar e expandir o texto selecionado com a IA"
          >
            {isLoading && loadingAction === "expand" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isLoading && loadingAction === "expand" ? "Expandindo..." : "Expandir com IA"}</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleTriggerAI("explain");
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            title="Explicar o conceito ou termo selecionado de forma didática"
          >
            {isLoading && loadingAction === "explain" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lightbulb className="w-3.5 h-3.5" />
            )}
            <span>{isLoading && loadingAction === "explain" ? "Explicando..." : "Explicar com IA"}</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleClose();
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
            title="Fechar barra"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 2. Popover Modal with Generated Result and Quick Action Buttons */}
      {resultText && (
        <div
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${Math.min(window.innerHeight - 380, Math.max(20, position.y))}px`,
            transform: "translate(-50%, 0)",
            zIndex: 9999,
          }}
          className="w-[92vw] max-w-xl bg-white dark:bg-[#1A1D27] rounded-2xl shadow-2xl border-2 border-indigo-500/40 p-4 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                {resultAction === "expand" ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  {resultAction === "expand" ? "Conteúdo Expandido com IA" : "Explicação do Conceito com IA"}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Formatação enriquecida • Pronto para inserir ou substituir
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Original selection snippet */}
          {selectionData?.selectedText && (
            <div className="text-[11.5px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#12141c] px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800 line-clamp-2">
              <span className="font-semibold text-gray-400 mr-1">Trecho original:</span>
              &quot;{selectionData.selectedText}&quot;
            </div>
          )}

          {/* Generated Text Content - Visually Formatted (No raw asterisks or monospace!) */}
          <div className="max-h-72 overflow-y-auto p-4 rounded-xl bg-gray-50/80 dark:bg-[#12141c] text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-800/80 font-sans select-text space-y-2">
            <div
              className="formatted-ai-result leading-relaxed space-y-2"
              dangerouslySetInnerHTML={{ __html: formattedResultHtml }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApply("replace")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer"
                title="Substituir o trecho selecionado por este conteúdo formatado"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Substituir Seleção</span>
              </button>

              <button
                type="button"
                onClick={() => handleApply("insertBelow")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                title="Manter o trecho original e inserir este conteúdo formatado logo abaixo"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>Inserir Abaixo</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyResult}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                title="Copiar texto formatado"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
