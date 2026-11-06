"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Layers,
  TrendingUp,
  BrainCircuit,
  Folder as FolderIcon,
  Zap,
  ChevronRight,
  BookOpen,
  BarChart2,
  Calendar,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

interface FlashcardsDashboardProps {
  onStudyDeck: (deckId: string) => void;
  onOpenAIModal: () => void;
  onSelectFolder: (folderId: string) => void;
  onCreateDeck: () => void;
}

type Period = "today" | "7d" | "30d" | "all";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Geral" },
];

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "7d") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "30d") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return null;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""));
  }
  return days;
}

export default function FlashcardsDashboard({
  onStudyDeck,
  onOpenAIModal,
  onSelectFolder,
  onCreateDeck,
}: FlashcardsDashboardProps) {
  const { flashcardDecks, flashcardReviews, folders } = useAppStore();
  const [period, setPeriod] = useState<Period>("today");

  const periodStart = useMemo(() => getPeriodStart(period), [period]);

  const periodReviews = useMemo(() => {
    if (!periodStart) return flashcardReviews;
    return flashcardReviews.filter((r) => new Date(r.reviewedAt) >= periodStart);
  }, [flashcardReviews, periodStart]);

  const stats = useMemo(() => {
    const total = periodReviews.length;
    const easy = periodReviews.filter((r) => r.rating === "easy").length;
    const medium = periodReviews.filter((r) => r.rating === "medium").length;
    const hard = periodReviews.filter((r) => r.rating === "hard").length;
    const uniqueDecks = new Set(periodReviews.map((r) => r.deckId)).size;
    const masteryRate = total > 0 ? Math.round((easy / total) * 100) : 0;
    return { total, easy, medium, hard, uniqueDecks, masteryRate };
  }, [periodReviews]);

  const folderStats = useMemo(() => {
    return folders.map((folder) => {
      const decksInFolder = flashcardDecks.filter((d) => d.folderId === folder.id);
      const deckIds = new Set(decksInFolder.map((d) => d.id));
      const reviews = periodReviews.filter((r) => deckIds.has(r.deckId));
      const easy = reviews.filter((r) => r.rating === "easy").length;
      const total = reviews.length;
      const mastery = total > 0 ? Math.round((easy / total) * 100) : 0;
      return { folder, deckCount: decksInFolder.length, reviewCount: total, mastery };
    }).filter((fs) => fs.deckCount > 0);
  }, [folders, flashcardDecks, periodReviews]);

  const chartData = useMemo(() => {
    const days = getLast7Days();
    const now = new Date();
    return days.map((day, i) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (6 - i));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const dayReviews = flashcardReviews.filter((r) => {
        const d = new Date(r.reviewedAt);
        return d >= start && d <= end;
      });
      return {
        day,
        total: dayReviews.length,
        easy: dayReviews.filter((r) => r.rating === "easy").length,
        medium: dayReviews.filter((r) => r.rating === "medium").length,
        hard: dayReviews.filter((r) => r.rating === "hard").length,
      };
    });
  }, [flashcardReviews]);

  const chartMax = useMemo(() => Math.max(...chartData.map((d) => d.total), 1), [chartData]);

  const hardReviewDecks = useMemo(() => {
    const hardDeckIds = new Set(
      periodReviews.filter((r) => r.rating === "hard").map((r) => r.deckId)
    );
    return flashcardDecks.filter((d) => hardDeckIds.has(d.id));
  }, [flashcardDecks, periodReviews]);

  if (flashcardDecks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-[#1A1D27]/40 rounded-3xl border border-dashed border-gray-200 dark:border-[#2a2d3a]">
        <div className="bg-purple-50 dark:bg-purple-950/50 p-4 rounded-2xl mb-4 text-purple-600 dark:text-purple-400">
          <Layers className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Seus Flashcards estao Vazios
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm mb-6 leading-relaxed">
          Crie baralhos de estudo manualmente ou gere flashcards com IA baseados em qualquer tema,
          texto, PDF, imagem ou documento.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onOpenAIModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 shadow-md shadow-purple-500/20 cursor-pointer"
          >
            <Sparkles size={16} /> Gerar com IA
          </button>
          <button
            onClick={onCreateDeck}
            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            Criar Manualmente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QUICK ACTION BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-4 sm:p-5 text-white shadow-md shadow-purple-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-semibold backdrop-blur-xs">
              <Zap size={12} className="text-amber-300" /> Centro de Revisão
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {stats.total === 0 && period === "today" ? "Hora de revisar! Comece sua sessão diária." : `Você revisou ${stats.total} cards ${period === "today" ? "hoje" : "no período"}.`}
            </h2>
            <p className="text-xs text-purple-100">
              {flashcardDecks.length} baralhos disponíveis · {flashcardDecks.reduce((s, d) => s + (d.cardCount || d.cards?.length || 0), 0)} cards para estudar
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {flashcardDecks.length > 0 && (
              <button type="button" onClick={() => onStudyDeck(flashcardDecks[0].id)}
                className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-all shadow-sm cursor-pointer">
                <Play size={14} className="fill-purple-700" /> Estudar Agora
              </button>
            )}
            {hardReviewDecks.length > 0 && (
              <button type="button" onClick={() => onStudyDeck(hardReviewDecks[0].id)}
                className="flex items-center gap-1.5 rounded-xl bg-rose-400 hover:bg-rose-300 px-3.5 py-2 text-xs font-bold text-gray-950 transition-all shadow-sm cursor-pointer">
                <RotateCcw size={13} /> Revisar Difíceis ({hardReviewDecks.length})
              </button>
            )}
            <button type="button" onClick={onOpenAIModal}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer">
              <Sparkles size={13} className="text-amber-300" /> Gerar com IA
            </button>
          </div>
        </div>
      </div>

      {/* CHART + FOLDER STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Bar Chart */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart2 size={18} className="text-purple-500" /> Atividade -- Ultimos 7 Dias
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cards revisados por dia</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-36">
            {chartData.map((day, i) => {
              const totalH = chartMax > 0 ? (day.total / chartMax) * 100 : 0;
              const isToday = i === 6;
              return (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{day.total > 0 ? day.total : ""}</div>
                  <div className="w-full flex flex-col justify-end" style={{ height: "96px" }}>
                    {day.total > 0 ? (
                      <div className={cn("w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-500", isToday ? "ring-2 ring-purple-400" : "")} style={{ height: `${Math.max(totalH, 6)}%` }}>
                        <div className="w-full bg-emerald-500" style={{ height: `${day.total > 0 ? (day.easy / day.total) * 100 : 0}%` }} />
                        <div className="w-full bg-amber-400" style={{ height: `${day.total > 0 ? (day.medium / day.total) * 100 : 0}%` }} />
                        <div className="w-full bg-rose-500" style={{ height: `${day.total > 0 ? (day.hard / day.total) * 100 : 0}%` }} />
                      </div>
                    ) : (
                      <div className="w-full h-1 rounded-full bg-gray-100 dark:bg-gray-800" />
                    )}
                  </div>
                  <div className={cn("text-[10px] font-semibold capitalize", isToday ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500")}>{day.day}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2d3a]">
            {[{ color: "bg-emerald-500", label: "Facil" }, { color: "bg-amber-400", label: "Medio" }, { color: "bg-rose-500", label: "Dificil" }].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-sm", item.color)} />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Folder Stats */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FolderIcon size={18} className="text-indigo-500" /> Progresso por Pasta
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Clique para estudar os baralhos da pasta</p>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {folderStats.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma pasta com baralhos ainda.</div>
            ) : (
              folderStats.map((item) => (
                <div key={item.folder.id} onClick={() => onSelectFolder(item.folder.id)}
                  className="group flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 dark:border-[#2a2d3a] hover:border-purple-400 bg-gray-50/60 dark:bg-[#0F1117]/60 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-2xs" style={{ backgroundColor: item.folder.color || "#7C3AED" }}>
                      <FolderIcon size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{item.folder.name}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.deckCount} {item.deckCount === 1 ? "baralho" : "baralhos"} · {item.reviewCount} revisoes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={cn("text-xs font-bold", item.mastery >= 70 ? "text-emerald-600 dark:text-emerald-400" : item.mastery >= 50 ? "text-amber-600 dark:text-amber-400" : item.reviewCount === 0 ? "text-gray-400" : "text-rose-600 dark:text-rose-400")}>
                        {item.reviewCount > 0 ? `${item.mastery}% dominio` : "Pendente"}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* HARD CARDS REVIEW QUEUE */}
      {hardReviewDecks.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-[#2a2d3a] pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <RotateCcw size={18} className="text-rose-500" /> Decks com Cards Dificeis -- Revisar
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Baralhos com cards marcados como Dificil no periodo</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hardReviewDecks.slice(0, 6).map((deck) => {
              const hardCount = periodReviews.filter((r) => r.deckId === deck.id && r.rating === "hard").length;
              return (
                <div key={deck.id} className="flex flex-col justify-between p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/30 text-[10px] font-bold text-rose-700 dark:text-rose-300">{hardCount} dificeis</span>
                      {deck.subject && <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-[10px] font-semibold text-purple-700 dark:text-purple-300">{deck.subject}</span>}
                    </div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{deck.name}</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-rose-100 dark:border-rose-900/30 flex justify-end">
                    <button type="button" onClick={() => onStudyDeck(deck.id)} className="text-purple-600 dark:text-purple-400 font-bold text-xs hover:underline cursor-pointer">
                      Revisar Agora -&gt;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hardReviewDecks.length === 0 && stats.total > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
          <div className="py-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Excelente! Nenhum card dificil pendente no periodo.</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">Continue revisando para manter a taxa de retencao alta.</p>
          </div>
        </div>
      )}
    </div>
  );
}
