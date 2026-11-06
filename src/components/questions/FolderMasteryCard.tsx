"use client";

import { useMemo, useState } from "react";
import {
  Play,
  RotateCcw,
  Folder as FolderIcon,
  Target,
} from "lucide-react";
import { Question, Folder, useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface FolderMasteryCardProps {
  folder: Folder | null;
  questions: Question[];
  onStartQuiz: (customList?: Question[]) => void;
}

export default function FolderMasteryCard({
  folder,
  questions,
  onStartQuiz,
}: FolderMasteryCardProps) {
  const { updateQuestion } = useAppStore();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Compute folder accuracy statistics
  const stats = useMemo(() => {
    const total = questions.length;
    const answeredList = questions.filter(
      (q) =>
        q.status === "correct" ||
        q.status === "incorrect" ||
        (q.timesAnswered || 0) > 0
    );
    const answeredCount = answeredList.length;

    const correctList = questions.filter((q) => q.status === "correct");
    const incorrectList = questions.filter((q) => q.status === "incorrect");

    const correctCount = correctList.length;
    const incorrectCount = incorrectList.length;

    // Precision / Accuracy rate (% of answered questions that were correct)
    const accuracyRate =
      answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    return {
      total,
      answeredCount,
      correctCount,
      incorrectCount,
      incorrectList,
      accuracyRate,
    };
  }, [questions]);

  const handleResetFolderStats = () => {
    questions.forEach((q) => {
      updateQuestion({
        ...q,
        status: "unanswered",
        userAnswer: undefined,
        timesAnswered: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        lastAnsweredAt: undefined,
        isFlaggedForReview: false,
      });
    });
    setIsResetConfirmOpen(false);
    toast.success("Estatísticas da pasta zeradas com sucesso!");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Header: Folder info + Nível de Precisão + Zerar Estatísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
            style={{ backgroundColor: folder?.color || "#2563EB" }}
          >
            <FolderIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
              {folder?.name || "Pasta de Questões"}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                Nível de Precisão:
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-xs font-black shadow-2xs",
                  stats.answeredCount === 0
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    : stats.accuracyRate >= 75
                    ? "bg-emerald-500 text-white"
                    : stats.accuracyRate >= 50
                    ? "bg-amber-500 text-white"
                    : "bg-rose-600 text-white"
                )}
              >
                {stats.answeredCount > 0 ? `${stats.accuracyRate}%` : "0%"}
              </span>
            </div>
          </div>
        </div>

        {/* Zerar Estatísticas */}
        <div className="flex items-center gap-2">
          {!isResetConfirmOpen ? (
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer border border-gray-200/60 dark:border-gray-700/60"
              title="Zerar estatísticas desta pasta"
            >
              <RotateCcw size={12} />
              <span>Zerar Estatísticas</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0F1117] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
              <span className="text-gray-600 dark:text-gray-400 text-[11px] px-1 font-semibold">
                Zerar estatísticas?
              </span>
              <button
                type="button"
                onClick={handleResetFolderStats}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-[11px] cursor-pointer"
              >
                Não
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons: Praticar Pasta e Treinar Apenas Erros */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={() => onStartQuiz(questions)}
          disabled={questions.length === 0}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Play size={13} className="fill-white" />
          <span>Praticar Pasta ({questions.length})</span>
        </button>

        {stats.incorrectCount > 0 && (
          <button
            type="button"
            onClick={() => onStartQuiz(stats.incorrectList)}
            className="flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Treinar Apenas Erros ({stats.incorrectCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
