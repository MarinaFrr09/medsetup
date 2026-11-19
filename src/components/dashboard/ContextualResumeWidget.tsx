"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Library,
  FileSearch,
  Mic,
  Microscope,
  GitBranch,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
  Play,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

interface ResumeCardItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  actionLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  badgeBg: string;
}

export function ContextualResumeWidget() {
  const router = useRouter();
  const {
    books = [],
    tutoriaAnalyses = [],
    atelieAnalyses = [],
    documentTranscriptions = [],
    audioRecordings = [],
    mindmaps = [],
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [lastIds, setLastIds] = useState<{
    bookId?: string;
    tutoriaId?: string;
    atelieId?: string;
    transcriptionId?: string;
    audioId?: string;
    mindmapId?: string;
  }>({});

  useEffect(() => {
    setMounted(true);
    try {
      setLastIds({
        bookId: localStorage.getItem("medsetup_last_book_id") || undefined,
        tutoriaId: localStorage.getItem("medsetup_last_tutoria_id") || undefined,
        atelieId: localStorage.getItem("medsetup_last_atelie_id") || undefined,
        transcriptionId: localStorage.getItem("medsetup_last_transcription_id") || undefined,
        audioId: localStorage.getItem("medsetup_last_audio_id") || undefined,
        mindmapId: localStorage.getItem("medsetup_last_mindmap_id") || undefined,
      });
    } catch {}
  }, []);

  const resumeItems = useMemo<ResumeCardItem[]>(() => {
    if (!mounted) return [];
    const items: ResumeCardItem[] = [];

    // 1. Último Caso Clínico de Tutoria
    if (tutoriaAnalyses.length > 0) {
      const targetTutoria =
        (lastIds.tutoriaId && tutoriaAnalyses.find((t) => t.id === lastIds.tutoriaId)) ||
        tutoriaAnalyses[0];
      if (targetTutoria) {
        const qCount = targetTutoria.result?.learningQuestions?.length || 0;
        items.push({
          id: `tutoria-${targetTutoria.id}`,
          category: "Caso Clínico de Tutoria",
          title: targetTutoria.title || targetTutoria.result?.title || "Resolução de Tutoria Clínica",
          subtitle:
            targetTutoria.result?.caseTranscription?.slice(0, 110) ||
            targetTutoria.result?.clinicalConclusion?.summary?.slice(0, 110) ||
            targetTutoria.fileName ||
            "Retomar leitura das questões de aprendizagem e síntese diagnóstica",
          meta: `${qCount > 0 ? `${qCount} questões resolvidas • ` : ""}${targetTutoria.date || "Recente"}`,
          href: `/tutoria?resumeId=${encodeURIComponent(targetTutoria.id)}`,
          actionLabel: "Retomar Caso Clínico",
          icon: BookOpenCheck,
          accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
          accentText: "text-emerald-600 dark:text-emerald-400",
          accentBorder: "hover:border-emerald-500/60 dark:hover:border-emerald-500/60",
          badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
        });
      }
    }

    // 2. Último PDF / Livro OU Última Transcrição de PDF
    if (documentTranscriptions.length > 0) {
      const targetDoc =
        (lastIds.transcriptionId &&
          documentTranscriptions.find((d) => d.id === lastIds.transcriptionId)) ||
        documentTranscriptions[0];
      if (targetDoc) {
        items.push({
          id: `trans-${targetDoc.id}`,
          category: "Último PDF / Transcrição",
          title: targetDoc.title || targetDoc.fileName || "Documento Transcrito",
          subtitle:
            targetDoc.fileName ||
            targetDoc.summary?.slice(0, 100) ||
            "Continuar leitura do documento transcrito e resumo estruturado",
          meta: `${targetDoc.expanded ? "Modo Expandido • " : ""}${targetDoc.date || "Recente"}`,
          href: `/transcription?resumeId=${encodeURIComponent(targetDoc.id)}`,
          actionLabel: "Continuar no PDF Transcrito",
          icon: FileSearch,
          accentBg: "bg-teal-500/10 dark:bg-teal-500/15",
          accentText: "text-teal-600 dark:text-teal-400",
          accentBorder: "hover:border-teal-500/60 dark:hover:border-teal-500/60",
          badgeBg: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/60",
        });
      }
    }

    if (books.length > 0) {
      const targetBook =
        (lastIds.bookId && books.find((b) => b.id === lastIds.bookId)) || books[0];
      if (targetBook) {
        items.push({
          id: `book-${targetBook.id}`,
          category: "Último Livro / PDF",
          title: targetBook.title || targetBook.fileName,
          subtitle:
            targetBook.author
              ? `${targetBook.author} • ${targetBook.subject || "Medicina"}`
              : targetBook.description || targetBook.fileName || "Abrir leitor de PDF do livro",
          meta: targetBook.subject || "Biblioteca Médica",
          href: `/livros?resumeId=${encodeURIComponent(targetBook.id)}`,
          actionLabel: "Retomar Leitura do Livro",
          icon: Library,
          accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
          accentText: "text-amber-600 dark:text-amber-400",
          accentBorder: "hover:border-amber-500/60 dark:hover:border-amber-500/60",
          badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
        });
      }
    }

    // 3. Última Transcrição de Aula Gravada
    if (audioRecordings.length > 0) {
      const targetAudio =
        (lastIds.audioId && audioRecordings.find((a) => a.id === lastIds.audioId)) ||
        audioRecordings[0];
      if (targetAudio) {
        items.push({
          id: `audio-${targetAudio.id}`,
          category: "Transcrição de Aula",
          title: targetAudio.title || "Aula Gravada",
          subtitle:
            targetAudio.processedData?.summary?.slice(0, 100) ||
            targetAudio.processedData?.cleanTranscript?.slice(0, 100) ||
            "Retomar síntese, tópicos e transcrição cronológica da aula",
          meta: `${targetAudio.duration ? `${targetAudio.duration} • ` : ""}${targetAudio.date || "Recente"}`,
          href: `/audio?resumeId=${encodeURIComponent(targetAudio.id)}`,
          actionLabel: "Retomar Aula Gravada",
          icon: Mic,
          accentBg: "bg-red-500/10 dark:bg-red-500/15",
          accentText: "text-red-600 dark:text-red-400",
          accentBorder: "hover:border-red-500/60 dark:hover:border-red-500/60",
          badgeBg: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200/60 dark:border-red-800/60",
        });
      }
    }

    // 4. Último Roteiro de Ateliê (SP)
    if (atelieAnalyses.length > 0) {
      const targetAtelie =
        (lastIds.atelieId && atelieAnalyses.find((a) => a.id === lastIds.atelieId)) ||
        atelieAnalyses[0];
      if (targetAtelie) {
        items.push({
          id: `atelie-${targetAtelie.id}`,
          category: "Roteiro de Ateliê (SP)",
          title: targetAtelie.title || targetAtelie.fileName || "Ateliê Médico",
          subtitle:
            targetAtelie.result?.theme ||
            targetAtelie.result?.summary?.slice(0, 100) ||
            "Retomar objetivos, lâminas histológicas e perguntas do roteiro",
          meta: targetAtelie.date || "Recente",
          href: `/atelie?resumeId=${encodeURIComponent(targetAtelie.id)}`,
          actionLabel: "Retomar Roteiro de Ateliê",
          icon: Microscope,
          accentBg: "bg-blue-500/10 dark:bg-blue-500/15",
          accentText: "text-blue-600 dark:text-blue-400",
          accentBorder: "hover:border-blue-500/60 dark:hover:border-blue-500/60",
          badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
        });
      }
    }

    // 5. Último Mapa Mental (se houver espaço nos 4 destaques principais)
    if (items.length < 4 && mindmaps.length > 0) {
      const targetMap =
        (lastIds.mindmapId && mindmaps.find((m) => m.id === lastIds.mindmapId)) ||
        mindmaps[0];
      if (targetMap) {
        const isGhPages =
          typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
        items.push({
          id: `mm-${targetMap.id}`,
          category: "Último Mapa Mental",
          title: targetMap.name || "Mapa Mental",
          subtitle:
            targetMap.description ||
            `${targetMap.nodes?.length || 0} conceitos mapeados • Continuar edição visual`,
          meta: targetMap.date || "Recente",
          href: isGhPages
            ? `/mindmaps/default?id=${encodeURIComponent(targetMap.id)}`
            : `/mindmaps/${encodeURIComponent(targetMap.id)}`,
          actionLabel: "Abrir Mapa Mental",
          icon: GitBranch,
          accentBg: "bg-purple-500/10 dark:bg-purple-500/15",
          accentText: "text-purple-600 dark:text-purple-400",
          accentBorder: "hover:border-purple-500/60 dark:hover:border-purple-500/60",
          badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60",
        });
      }
    }

    return items.slice(0, 4);
  }, [
    mounted,
    books,
    tutoriaAnalyses,
    atelieAnalyses,
    documentTranscriptions,
    audioRecordings,
    mindmaps,
    lastIds,
  ]);

  if (!mounted) return null;

  return (
    <section className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Continuar de Onde Você Parou</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                Acesso Rápido Contextual
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Retome diretamente seu último PDF/livro, caso clínico de tutoria, roteiro de ateliê ou transcrição de aula com 1 clique.
            </p>
          </div>
        </div>
      </div>

      {resumeItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {resumeItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => router.push(item.href)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(item.href);
                  }
                }}
                className={`group relative rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 hover:-translate-y-0.5 select-none ${item.accentBorder}`}
              >
                <div className="space-y-2.5">
                  {/* Top Badge + Icon */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.badgeBg}`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.category}</span>
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate">
                      {item.meta}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.subtitle.replace(/[#*_>`~]/g, "").trim()}
                    </p>
                  </div>
                </div>

                {/* Direct Resume Action Footer */}
                <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs font-bold">
                  <span className={`flex items-center gap-1.5 ${item.accentText}`}>
                    <Play className="w-3 h-3 fill-current" />
                    <span>{item.actionLabel}</span>
                  </span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 ${item.accentText}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => router.push("/tutoria")}
            className="group rounded-2xl border border-dashed border-gray-300 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1A1D27]/60 p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-500/60 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <BookOpenCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  Último Caso de Tutoria
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Inicie um caso clínico para retomar daqui
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>

          <div
            onClick={() => router.push("/transcription")}
            className="group rounded-2xl border border-dashed border-gray-300 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1A1D27]/60 p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-teal-500/60 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  Último PDF / Livro
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Abra um PDF ou livro para retomar com 1 clique
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>

          <div
            onClick={() => router.push("/audio")}
            className="group rounded-2xl border border-dashed border-gray-300 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1A1D27]/60 p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-red-500/60 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  Última Transcrição de Aula
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Grave ou transcreva uma aula para retomar daqui
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>
      )}
    </section>
  );
}
