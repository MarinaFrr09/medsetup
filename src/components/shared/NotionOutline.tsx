"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ListCollapse, X } from "lucide-react";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Extracts headings (h1, h2, h3, h4) from markdown text.
 */
export function extractHeadingsFromMarkdown(markdown: string): HeadingItem[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const headings: HeadingItem[] = [];
  let headingIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    let level = 0;
    let rawText = "";

    if (trimmed.startsWith("# ")) {
      level = 1;
      rawText = trimmed.replace(/^#\s+/, "");
    } else if (trimmed.startsWith("## ")) {
      level = 2;
      rawText = trimmed.replace(/^##\s+/, "");
    } else if (trimmed.startsWith("### ")) {
      level = 3;
      rawText = trimmed.replace(/^###\s+/, "");
    } else if (trimmed.startsWith("#### ")) {
      level = 4;
      rawText = trimmed.replace(/^####\s+/, "");
    }

    if (level > 0 && rawText) {
      // Clean markdown bold/italic/tags
      const cleanText = rawText
        .replace(/<[^>]*>/g, "")
        .replace(/[*_~`]/g, "")
        .replace(/^(Quest[aã]o\s+\d+)\s*[:.\-–)]*\s*(?:\d+\s*[:.\-–)]*\s*)+/i, "$1: ")
        .trim();

      if (cleanText) {
        headings.push({
          id: `heading-sec-${headingIndex}`,
          text: cleanText,
          level,
        });
        headingIndex++;
      }
    }
  }

  return headings;
}

interface NotionOutlineProps {
  content: string;
  /** Optional theme color accent (blue, emerald, purple, rose) */
  accentColor?: "blue" | "emerald" | "purple" | "rose";
  className?: string;
}

export function NotionOutline({
  content,
  accentColor = "emerald",
  className = "",
}: NotionOutlineProps) {
  // Floating Balloon next to the text: Opens automatically on hover, closes on mouse leave
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const activeElementRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const headings = useMemo(() => extractHeadingsFromMarkdown(content), [content]);

  // Open on hover immediately, close with a gentle grace period
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 240);
  };

  // Track active heading as user scrolls inside <main> or window
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollThreshold = 180; // pixels from top of viewport
      let currentActive = headings[0].id;

      for (let i = 0; i < headings.length; i++) {
        let el = document.getElementById(headings[i].id);
        if (!el && headings[i].text) {
          const allHeadings = document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, [data-heading]");
          const target = headings[i].text.toLowerCase().trim();
          for (const h of allHeadings) {
            if (h.textContent?.toLowerCase().trim().includes(target)) {
              el = h;
              break;
            }
          }
        }
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= scrollThreshold) {
            currentActive = headings[i].id;
          } else {
            break;
          }
        }
      }

      setActiveId(currentActive);
    };

    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll, { passive: true });
    }
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    handleScroll();

    return () => {
      if (mainEl) {
        mainEl.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [headings]);

  // Auto-scroll active item into view inside the list when balloon is open
  useEffect(() => {
    if (isOpen && activeElementRef.current) {
      activeElementRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeId, isOpen]);

  /**
   * Dedicated Wheel Handler: guarantees the mouse wheel directly scrolls the sumário
   * without requiring an explicit click to gain focus, and prevents wheel bleed.
   */
  const handleListWheel = (e: React.WheelEvent) => {
    const el = listRef.current;
    if (!el) return;
    e.stopPropagation();
    el.scrollTop += e.deltaY;
  };

  /**
   * Smoothly scrolls to the heading and flashes an accent ring indicator
   */
  const scrollToHeading = (id: string, text: string) => {
    let element = document.getElementById(id);

    if (!element && text) {
      const candidates = document.querySelectorAll<HTMLElement>(
        "h1, h2, h3, h4, [data-heading-id], [id^='heading-sec-']"
      );
      const cleanTarget = text.trim().toLowerCase();
      for (const el of candidates) {
        const elText = el.textContent?.trim().toLowerCase() || "";
        if (elText && (elText.includes(cleanTarget) || cleanTarget.includes(elText))) {
          element = el;
          break;
        }
      }
    }

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });

      const ringClass =
        accentColor === "emerald"
          ? "ring-emerald-500"
          : accentColor === "purple"
          ? "ring-purple-500"
          : accentColor === "rose"
          ? "ring-rose-500"
          : "ring-blue-500";

      element.classList.add(
        "ring-2",
        "ring-offset-4",
        "dark:ring-offset-slate-900",
        ringClass,
        "rounded-lg",
        "transition-all",
        "duration-300"
      );

      setTimeout(() => {
        element?.classList.remove(
          "ring-2",
          "ring-offset-4",
          "dark:ring-offset-slate-900",
          ringClass
        );
      }, 1800);

      setIsMobileOpen(false);
    }
  };

  if (headings.length < 2) {
    return null;
  }

  // Accent styles
  const activeTextClass =
    accentColor === "emerald"
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/50 font-bold"
      : accentColor === "purple"
      ? "text-purple-700 dark:text-purple-300 bg-purple-50/90 dark:bg-purple-950/50 font-bold"
      : accentColor === "rose"
      ? "text-rose-700 dark:text-rose-300 bg-rose-50/90 dark:bg-rose-950/50 font-bold"
      : "text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/50 font-bold";

  return (
    <>
      {/* ────────────────── Mobile (< md screens): Compact Button & Modal Drawer ────────────────── */}
      <div className="md:hidden fixed right-2.5 top-20 z-40">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 dark:bg-[#161824]/95 shadow-md border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 backdrop-blur-xs cursor-pointer active:scale-95 transition-all"
          title="Abrir sumário de tópicos"
        >
          <ListCollapse size={15} />
          <span>Sumário</span>
          <span className="text-[10px] text-slate-400 font-mono">({headings.length})</span>
        </button>

        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsMobileOpen(false)}
          >
            <div
              className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-[#161824] shadow-2xl border border-slate-200 dark:border-slate-800 p-4 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ListCollapse size={16} />
                  <span>Sumário ({headings.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[65vh] overscroll-y-contain [scrollbar-width:thin]"
                onWheel={(e) => {
                  e.stopPropagation();
                  e.currentTarget.scrollTop += e.deltaY;
                }}
              >
                {headings.map((heading) => {
                  const isActive = activeId === heading.id;
                  let plClass = "pl-2";
                  if (heading.level === 2) plClass = "pl-4";
                  else if (heading.level === 3) plClass = "pl-6";
                  else if (heading.level >= 4) plClass = "pl-8";

                  return (
                    <button
                      key={heading.id}
                      type="button"
                      onClick={() => scrollToHeading(heading.id, heading.text)}
                      className={`w-full text-left py-2 px-2.5 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer ${plClass} ${
                        isActive
                          ? `${activeTextClass} shadow-2xs`
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate">{heading.text}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────── Desktop (>= md screens): FLOATING BALLOON ON THE RIGHT SIDE ────────────────── */}
      <div
        className={`hidden md:block absolute right-3 top-12 bottom-4 pointer-events-none z-40 select-none ${className}`}
      >
        <div className="sticky top-4 pointer-events-auto flex flex-col items-end">
          {/* State 1: Collapsed Pill (Floating on the right margin of the document) */}
          {!isOpen && (
            <div
              className="self-end transition-transform duration-200 hover:scale-105 cursor-pointer"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-[#161824]/95 backdrop-blur-md shadow-lg border border-slate-200/90 dark:border-slate-800/90 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-md hover:shadow-xl transition-all whitespace-nowrap"
                title="Passe o mouse por cima para abrir o sumário"
              >
                <ListCollapse size={16} className="text-emerald-500 animate-pulse shrink-0" />
                <span>Sumário</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                  {headings.length}
                </span>
              </div>
            </div>
          )}

          {/* State 2: Expanded Balloon Card (Anchored on the right side without overflowing viewport) */}
          {isOpen && (
            <div
              className="self-end w-64 sm:w-72 max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl bg-white/95 dark:bg-[#161824]/95 backdrop-blur-xl shadow-2xl border border-slate-200/90 dark:border-slate-800/90 p-3 text-slate-800 dark:text-slate-100 transition-all select-none animate-in fade-in zoom-in-95 duration-150"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onWheel={handleListWheel}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ListCollapse size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                    Sumário
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    ({headings.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fechar sumário"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Headings List (Scrolls effortlessly with mouse wheel without requiring any click) */}
              <div
                ref={listRef}
                tabIndex={-1}
                onWheel={handleListWheel}
                className="flex-1 overflow-y-auto space-y-0.5 pr-1 max-h-[calc(100vh-13rem)] overscroll-y-contain outline-none [scrollbar-width:thin]"
              >
                {headings.map((heading) => {
                  const isActive = activeId === heading.id;

                  let plClass = "pl-2";
                  let textSize = "text-xs";
                  let fontWeight = "font-bold text-slate-900 dark:text-white";

                  if (heading.level === 2) {
                    plClass = "pl-4";
                    textSize = "text-[12px]";
                    fontWeight = "font-medium text-slate-800 dark:text-slate-200";
                  } else if (heading.level === 3) {
                    plClass = "pl-6";
                    textSize = "text-[11.5px]";
                    fontWeight = "font-normal text-slate-600 dark:text-slate-400";
                  } else if (heading.level >= 4) {
                    plClass = "pl-8";
                    textSize = "text-[11px]";
                    fontWeight = "font-normal text-slate-500 dark:text-slate-400";
                  }

                  return (
                    <button
                      key={heading.id}
                      ref={isActive ? activeElementRef : undefined}
                      type="button"
                      onClick={() => scrollToHeading(heading.id, heading.text)}
                      className={`w-full text-left py-1.5 px-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${textSize} ${plClass} ${
                        isActive
                          ? `${activeTextClass} shadow-2xs`
                          : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-emerald-600 dark:hover:text-emerald-400"
                      }`}
                      title={heading.text}
                    >
                      <span className={`truncate leading-snug ${fontWeight} ${isActive ? "!font-bold" : ""}`}>
                        {heading.text}
                      </span>

                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
