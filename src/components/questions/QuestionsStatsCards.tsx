"use client";

import { useMemo } from "react";
import {
  BarChart2,
  Folder as FolderIcon,
  ChevronRight,
} from "lucide-react";
import { useAppStore, Question, Folder } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

interface QuestionsStatsCardsProps {
  onSelectFolder: (folderId: string) => void;
  className?: string;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")
    );
  }
  return days;
}

export default function QuestionsStatsCards({
  onSelectFolder,
  className,
}: QuestionsStatsCardsProps) {
  const { questions, folders } = useAppStore();

  // Activity Bar Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const days = getLast7Days();
    const now = new Date();

    return days.map((day, i) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (6 - i));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const isToday = i === 6;

      const dayQuestions = questions.filter((q) => {
        if (q.lastAnsweredAt) {
          const d = new Date(q.lastAnsweredAt);
          return d >= start && d <= end;
        }
        // Fallback for questions answered today without ISO timestamp
        if (isToday && (q.timesAnswered || 0) > 0 && q.date === "Hoje") {
          return true;
        }
        return false;
      });

      const isEasy = (q: Question) =>
        q.difficulty === "Fácil" || q.difficulty === "easy";
      const isHard = (q: Question) =>
        q.difficulty === "Difícil" || q.difficulty === "hard";
      const isMedium = (q: Question) => !isEasy(q) && !isHard(q);

      return {
        day,
        total: dayQuestions.length,
        easy: dayQuestions.filter(isEasy).length,
        medium: dayQuestions.filter(isMedium).length,
        hard: dayQuestions.filter(isHard).length,
      };
    });
  }, [questions]);

  const chartMax = useMemo(
    () => Math.max(...chartData.map((d) => d.total), 1),
    [chartData]
  );

  // Folder Progress Statistics
  const folderStats = useMemo(() => {
    // Collect question folders or folders containing questions
    const questionFolders = folders.filter(
      (f) => f.type === "questions"
    );

    return questionFolders
      .map((folder) => {
        const questionsInFolder = questions.filter(
          (q) => (q.folderId || "folder-geral") === folder.id
        );
        const answeredList = questionsInFolder.filter(
          (q) =>
            q.status === "correct" ||
            q.status === "incorrect" ||
            (q.timesAnswered || 0) > 0
        );
        const correctCount = questionsInFolder.filter(
          (q) => q.status === "correct"
        ).length;
        const total = questionsInFolder.length;
        const answeredCount = answeredList.length;
        const mastery =
          answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

        return {
          folder,
          total,
          answeredCount,
          mastery,
        };
      })
      .filter((fs) => fs.total > 0);
  }, [folders, questions]);

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* 1. Activity Bar Chart */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-purple-500" />
              <span>Atividade -- Ultimos 7 Dias</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Questões resolvidas por dia
            </p>
          </div>
        </div>

        <div className="flex items-end gap-2 h-36">
          {chartData.map((day, i) => {
            const totalH = chartMax > 0 ? (day.total / chartMax) * 100 : 0;
            const isToday = i === 6;

            return (
              <div
                key={day.day}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                  {day.total > 0 ? day.total : ""}
                </div>

                <div
                  className="w-full flex flex-col justify-end"
                  style={{ height: "96px" }}
                >
                  {day.total > 0 ? (
                    <div
                      className={cn(
                        "w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-500",
                        isToday ? "ring-2 ring-purple-400" : ""
                      )}
                      style={{ height: `${Math.max(totalH, 6)}%` }}
                    >
                      <div
                        className="w-full bg-emerald-500"
                        style={{
                          height: `${
                            day.total > 0 ? (day.easy / day.total) * 100 : 0
                          }%`,
                        }}
                      />
                      <div
                        className="w-full bg-amber-400"
                        style={{
                          height: `${
                            day.total > 0 ? (day.medium / day.total) * 100 : 0
                          }%`,
                        }}
                      />
                      <div
                        className="w-full bg-rose-500"
                        style={{
                          height: `${
                            day.total > 0 ? (day.hard / day.total) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-1 rounded-full bg-gray-100 dark:bg-gray-800" />
                  )}
                </div>

                <div
                  className={cn(
                    "text-[10px] font-semibold capitalize",
                    isToday
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  {day.day}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2d3a]">
          {[
            { color: "bg-emerald-500", label: "Facil" },
            { color: "bg-amber-400", label: "Medio" },
            { color: "bg-rose-500", label: "Dificil" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={cn("w-2.5 h-2.5 rounded-sm", item.color)} />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Folder Progress Stats */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FolderIcon size={18} className="text-indigo-500" />
              <span>Progresso por Pasta</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Clique para estudar os cadernos da pasta
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {folderStats.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma pasta com questões ainda.
            </div>
          ) : (
            folderStats.map((item) => (
              <div
                key={item.folder.id}
                onClick={() => onSelectFolder(item.folder.id)}
                className="group flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 dark:border-[#2a2d3a] hover:border-purple-400 bg-gray-50/60 dark:bg-[#0F1117]/60 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-2xs"
                    style={{ backgroundColor: item.folder.color || "#7C3AED" }}
                  >
                    <FolderIcon size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {item.folder.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {item.total} {item.total === 1 ? "questão" : "questões"} ·{" "}
                      {item.answeredCount}{" "}
                      {item.answeredCount === 1 ? "resolução" : "resoluções"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div
                      className={cn(
                        "text-xs font-bold",
                        item.mastery >= 70
                          ? "text-emerald-600 dark:text-emerald-400"
                          : item.mastery >= 50
                          ? "text-amber-600 dark:text-amber-400"
                          : item.answeredCount === 0
                          ? "text-gray-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {item.answeredCount > 0
                        ? `${item.mastery}% dominio`
                        : "Pendente"}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-gray-400 group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
