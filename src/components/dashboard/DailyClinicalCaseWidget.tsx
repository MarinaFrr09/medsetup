"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Calendar,
  HelpCircle,
} from "lucide-react";
import {
  getDailyClinicalCase,
  ProgressiveClinicalCase,
} from "@/data/clinicalCasesBank";

const DAILY_PROGRESS_STORAGE_KEY = "medsetup_daily_clinical_case_progress_v2";

export function DailyClinicalCaseWidget() {
  const [dailyCase, setDailyCase] = useState<ProgressiveClinicalCase | null>(
    null
  );
  const [status, setStatus] = useState<"playing" | "won" | "lost" | "unstarted">(
    "unstarted"
  );
  const [attemptsCount, setAttemptsCount] = useState<number>(0);

  useEffect(() => {
    const todayCase = getDailyClinicalCase();
    setDailyCase(todayCase);

    try {
      const raw = localStorage.getItem(DAILY_PROGRESS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const saved = parsed?.[todayCase.id];
        if (saved && Array.isArray(saved.attempts) && saved.attempts.length > 0) {
          setStatus(saved.status || "playing");
          setAttemptsCount(saved.attempts.length);
        }
      }
    } catch {}
  }, []);

  if (!dailyCase) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card p-5 shadow-sm transition-all hover:border-emerald-500/50">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="h-3.5 w-3.5" />
              Caso Clínico do Dia
            </span>

            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {dailyCase.date}
            </span>

            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                dailyCase.difficulty === "Fácil"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                  : dailyCase.difficulty === "Médio"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-300"
              }`}
            >
              Nível {dailyCase.difficulty}
            </span>

            {status === "won" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolvido hoje ({attemptsCount}/5)
              </span>
            )}
            {status === "lost" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-300">
                Finalizado hoje (5/5)
              </span>
            )}
            {status === "playing" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-300">
                Em andamento ({attemptsCount}/5 tentativas)
              </span>
            )}
          </div>

          {/* Preview of Clue 1 (Vinheta clínica) */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5">
            <div className="text-xs font-bold text-[#00a859] dark:text-emerald-400 mb-1">
              Vinheta clínica
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {dailyCase.clues[0]}
            </p>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-2.5 shrink-0">
          <Link
            href="/interatividade?mode=daily"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#12b76a] hover:bg-[#0e9f5c] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors"
          >
            <span>
              {status === "unstarted"
                ? "Resolver Caso Clínico do Dia"
                : status === "playing"
                ? "Continuar Caso do Dia"
                : "Ver Debriefing do Caso do Dia"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/interatividade"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/70 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Outros Casos / Gerar de PDF
          </Link>
        </div>
      </div>
    </div>
  );
}
