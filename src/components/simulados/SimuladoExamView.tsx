"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Send,
  PenTool,
  RotateCcw,
  X,
  Bookmark,
  BookmarkCheck,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Award,
  Zap,
  ListFilter,
  Check,
  Eye,
  SlidersHorizontal,
  Flame,
  FileText,
} from "lucide-react";
import { SimuladoExam, SimuladoQuestion } from "@/stores/useAppStore";
import toast from "react-hot-toast";

interface SimuladoExamViewProps {
  simulado: SimuladoExam;
  onFinishExam: (completedExam: SimuladoExam) => void;
  onExit: () => void;
}

export default function SimuladoExamView({
  simulado,
  onFinishExam,
  onExit,
}: SimuladoExamViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  // Initial answers map
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    simulado.questions.forEach((q, idx) => {
      if (q.userAnswer) initial[idx] = q.userAnswer;
    });
    return initial;
  });

  // Flagged questions for review
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "answered" | "pending" | "flagged">("all");
  const [fontSize, setFontSize] = useState<"normal" | "large">("normal");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer logic
  const totalSeconds = (simulado.durationMinutes || 45) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (simulado.hasTimer) {
      return Math.max(0, totalSeconds - (simulado.timeSpentSeconds || 0));
    }
    return simulado.timeSpentSeconds || 0;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (simulado.hasTimer) {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        } else {
          return prev + 1;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [simulado.hasTimer]);

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleAutoSubmit = () => {
    toast.error("O tempo estipulado da prova expirou! Entregando automaticamente...");
    handleSubmit();
  };

  const currentQuestion: SimuladoQuestion = simulado.questions[currentIdx] || {
    id: "q-1",
    number: 1,
    type: "multiple_choice",
    text: "Questão",
    options: [],
    answer: "a",
    explanation: "",
  };

  const selectedAnswer = answers[currentIdx] || "";
  const isFlagged = flaggedQuestions.has(currentIdx);

  const toggleFlagCurrent = () => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentIdx)) {
        next.delete(currentIdx);
        toast.success(`Questão ${currentIdx + 1} desmarcada.`);
      } else {
        next.add(currentIdx);
        toast.success(`Questão ${currentIdx + 1} marcada para revisão.`);
      }
      return next;
    });
  };

  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => {
      const currentSelected = prev[currentIdx];
      if (currentSelected && currentSelected.toLowerCase() === optionId.toLowerCase()) {
        const next = { ...prev };
        delete next[currentIdx];
        return next;
      }
      return {
        ...prev,
        [currentIdx]: optionId,
      };
    });
  };

  const handleEssayChange = (text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: text,
    }));
  };

  const handleNext = () => {
    if (currentIdx < simulado.questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleNext();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
        return;
      }

      if (e.key === "f" || e.key === "F" || e.key === "r" || e.key === "R") {
        e.preventDefault();
        toggleFlagCurrent();
        return;
      }

      const options = currentQuestion.options || [];
      let optIdx = -1;
      if (["1", "a", "A"].includes(e.key)) optIdx = 0;
      else if (["2", "b", "B"].includes(e.key)) optIdx = 1;
      else if (["3", "c", "C"].includes(e.key)) optIdx = 2;
      else if (["4", "d", "D"].includes(e.key)) optIdx = 3;
      else if (["5", "e", "E"].includes(e.key)) optIdx = 4;

      if (optIdx >= 0 && optIdx < options.length) {
        e.preventDefault();
        handleSelectOption(options[optIdx].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIdx, selectedAnswer, currentQuestion]);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((a) => a && a.trim().length > 0).length;
  }, [answers]);

  const pendingCount = simulado.questions.length - answeredCount;
  const progressPercent = Math.round((answeredCount / simulado.questions.length) * 100);

  const filteredQuestionIndices = useMemo(() => {
    return simulado.questions
      .map((_, idx) => idx)
      .filter((idx) => {
        const isAnswered = Boolean(answers[idx]?.trim());
        const isFlag = flaggedQuestions.has(idx);

        if (sidebarFilter === "answered") return isAnswered;
        if (sidebarFilter === "pending") return !isAnswered;
        if (sidebarFilter === "flagged") return isFlag;
        return true;
      });
  }, [simulado.questions, answers, flaggedQuestions, sidebarFilter]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setIsConfirmModalOpen(false);

    try {
      const timeSpent = simulado.hasTimer
        ? Math.max(1, totalSeconds - secondsRemaining)
        : secondsRemaining;

      // Grade multiple choice and collect dissertatives
      let correctCount = 0;
      let mcCount = 0;

      const updatedQuestions: SimuladoQuestion[] = [...simulado.questions];

      for (let i = 0; i < updatedQuestions.length; i++) {
        const q = updatedQuestions[i];
        const studentAns = answers[i] || "";
        q.userAnswer = studentAns;

        if (q.type === "multiple_choice") {
          mcCount++;
          const isCorrect = studentAns.toLowerCase() === q.answer.toLowerCase();
          q.isCorrect = isCorrect;
          if (isCorrect) correctCount++;
        }
      }

      // Grade dissertative questions with AI
      const essayQuestions = updatedQuestions.filter((q) => q.type === "essay");
      if (essayQuestions.length > 0) {
        toast.loading("Banca examinadora avaliando questões dissertativas...", {
          id: "grading-essay",
        });

        for (const eq of essayQuestions) {
          try {
            const res = await fetch("/api/ai/grade-simulado-essay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionText: eq.text,
                expectedAnswer: eq.answer,
                studentAnswer: eq.userAnswer || "",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              eq.essayScore = data.score;
              eq.essayFeedback = data.feedback;
            } else {
              eq.essayScore = eq.userAnswer?.trim() ? 7.0 : 0.0;
            }
          } catch (e) {
            eq.essayScore = eq.userAnswer?.trim() ? 7.0 : 0.0;
          }
        }
        toast.dismiss("grading-essay");
      }

      // Calculate final composite score (0 to 10)
      const mcScore = mcCount > 0 ? (correctCount / mcCount) * 10 : 10;
      const essayAverage =
        essayQuestions.length > 0
          ? essayQuestions.reduce((acc, curr) => acc + (curr.essayScore || 0), 0) /
            essayQuestions.length
          : mcScore;

      const finalScore =
        simulado.totalQuestions > 0
          ? Math.round(
              (((correctCount +
                essayQuestions.reduce((acc, curr) => acc + (curr.essayScore || 0) / 10, 0)) /
                simulado.totalQuestions) *
                10) *
                10
            ) / 10
          : 0;

      const completedExam: SimuladoExam = {
        ...simulado,
        status: "completed",
        score: finalScore,
        correctCount,
        timeSpentSeconds: timeSpent,
        completedAt: new Date().toISOString(),
        questions: updatedQuestions,
      };

      toast.success("Simulado finalizado e corrigido com sucesso!");
      onFinishExam(completedExam);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao finalizar simulado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLowTime = simulado.hasTimer && secondsRemaining <= 300;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-50/80 dark:bg-[#0F1117] text-gray-900 dark:text-gray-100 select-none overflow-hidden">
      {/* 1. TOP STUDYFLOW NAVBAR */}
      <header className="h-16 border-b border-gray-200/80 bg-white/95 dark:border-[#2a2d3a] dark:bg-[#1A1D27]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 gap-3">
        {/* Left: Simulado Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer shrink-0"
            title="Sair do simulado"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-purple-500/20 shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {simulado.title || "Simulado Acadêmico"}
                </h1>
                {simulado.subject && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40 shrink-0">
                    {simulado.subject}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                Modo Estudo MedSetup • {simulado.questions.length} questões
              </p>
            </div>
          </div>
        </div>

        {/* Center: Interactive Progress Pill */}
        <div className="hidden lg:flex flex-col items-center max-w-xs w-full px-4">
          <div className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            <span>
              Questão {currentIdx + 1} de {simulado.questions.length}
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">
              {progressPercent}% respondido
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Right: Timer, Quick Actions & Submit Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Font Size Toggle */}
          <button
            type="button"
            onClick={() => setFontSize((f) => (f === "normal" ? "large" : "normal"))}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 dark:border-[#2a2d3a] dark:bg-[#12141C] dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            title="Ajustar tamanho da fonte do enunciado"
          >
            <span>A</span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400">
              {fontSize === "normal" ? "100%" : "125%"}
            </span>
          </button>

          {/* Toggle Sidebar / Map */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs",
              isSidebarOpen
                ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-[#12141C] dark:text-gray-300 dark:border-[#2a2d3a] dark:hover:bg-gray-800"
            )}
            title="Alternar mapa de questões"
          >
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">Mapa ({answeredCount}/{simulado.questions.length})</span>
          </button>

          {/* Timer Display */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-tight shadow-2xs border transition-colors",
              isLowTime
                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50 animate-pulse"
                : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-[#12141C] dark:text-gray-200 dark:border-[#2a2d3a]"
            )}
            title={simulado.hasTimer ? "Tempo restante da prova" : "Tempo decorrido"}
          >
            <Clock size={15} className={isLowTime ? "text-rose-600" : "text-purple-500"} />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Submit Exam Button */}
          <button
            type="button"
            onClick={() => setIsConfirmModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Send size={14} />
            <span>Entregar</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY: SPLIT VIEW (Question Stage + Collapsible Navigator Sidebar) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT / CENTER: Question Stage */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-6 pb-24">
            {/* Top Question Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200/80 dark:border-[#2a2d3a] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-extrabold text-sm shadow-xs">
                  {currentIdx + 1}
                </span>
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                    Questão #{currentIdx + 1}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {currentQuestion.type === "essay"
                      ? "Resposta Dissertativa"
                      : "Múltipla Escolha (1 alternativa correta)"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Flag for Review */}
                <button
                  type="button"
                  onClick={toggleFlagCurrent}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer",
                    isFlagged
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-[#12141C] dark:text-gray-400 dark:border-[#2a2d3a] dark:hover:bg-gray-800"
                  )}
                  title="Marcar questão com dúvida para revisar antes de entregar (Atalho: R ou F)"
                >
                  {isFlagged ? (
                    <>
                      <BookmarkCheck size={15} className="text-amber-600 dark:text-amber-400 fill-amber-500" />
                      <span>Marcada para Revisão</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={15} />
                      <span>Marcar p/ Revisar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Question Statement Card */}
            <motion.div
              key={`q-${currentIdx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200/90 dark:border-[#2a2d3a] p-6 sm:p-8 shadow-xs space-y-6"
            >
              {/* Question Text */}
              <div
                className={cn(
                  "font-normal text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap",
                  fontSize === "large" ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                )}
              >
                {currentQuestion.text}
              </div>

              {/* Histological Slide / Tissue Image */}
              {currentQuestion.imageUrl && (
                <div className="my-4">
                  <div className="inline-block relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-black/5 dark:bg-black/20 max-w-2xl">
                    <img
                      src={currentQuestion.imageUrl}
                      alt={currentQuestion.imageCaption || "Lâmina Histológica"}
                      className="max-h-96 w-auto object-contain rounded-2xl"
                    />
                    {currentQuestion.imageCaption && (
                      <div className="p-3 text-xs text-gray-600 dark:text-gray-300 bg-white/95 dark:bg-[#12141c]/95 border-t border-gray-100 dark:border-gray-800 font-medium">
                        {currentQuestion.imageCaption}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MULTIPLE CHOICE ALTERNATIVES */}
              {currentQuestion.type === "multiple_choice" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    <span>Alternativas de Resposta</span>
                    <span className="hidden sm:inline text-[11px] font-normal text-gray-400">
                      Dica: você pode teclar A, B, C, D ou 1, 2, 3, 4
                    </span>
                  </div>

                  {(currentQuestion.options || []).map((opt, optIndex) => {
                    const isSelected = selectedAnswer.toLowerCase() === opt.id.toLowerCase();
                    const letter = opt.id.toUpperCase();

                    return (
                      <button
                        key={opt.id || optIndex}
                        type="button"
                        onClick={() => handleSelectOption(opt.id)}
                        className={cn(
                          "w-full flex items-start gap-4 p-4 sm:p-4.5 rounded-2xl border text-left transition-all cursor-pointer relative group",
                          isSelected
                            ? "border-purple-600 bg-purple-50/70 dark:border-purple-500 dark:bg-purple-950/25 ring-2 ring-purple-500/20 shadow-sm"
                            : "border-gray-200/90 dark:border-[#2a2d3a] bg-gray-50/50 dark:bg-[#12141C]/60 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-white dark:hover:bg-[#12141C]"
                        )}
                      >
                        {/* Option Letter Circle */}
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all shadow-xs",
                            isSelected
                              ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-purple-500/20"
                              : "bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] text-gray-700 dark:text-gray-300 group-hover:border-purple-400"
                          )}
                        >
                          {letter}
                        </div>

                        {/* Option Text */}
                        <div className="flex-1 pt-1">
                          <p
                            className={cn(
                              "leading-relaxed transition-colors",
                              fontSize === "large" ? "text-base sm:text-lg" : "text-sm sm:text-base",
                              isSelected
                                ? "text-purple-950 dark:text-white font-medium"
                                : "text-gray-800 dark:text-gray-200"
                            )}
                          >
                            {opt.text}
                          </p>
                        </div>

                        {/* Selected Check Icon */}
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shrink-0 mt-1 shadow-xs">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* DISSERTATIVE ESSAY QUESTION */}
              {currentQuestion.type === "essay" && (
                <div className="space-y-4 pt-2">
                  <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/30 p-4 rounded-2xl flex items-start gap-3">
                    <PenTool className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-purple-900 dark:text-purple-300 leading-relaxed">
                      <strong className="block font-bold mb-0.5">Resposta Dissertativa</strong>
                      Escreva sua resolução detalhada fundamentando o raciocínio. A resposta será submetida à banca examinadora por IA para avaliação com nota de 0 a 10 e feedback individual.
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={selectedAnswer}
                    onChange={(e) => handleEssayChange(e.target.value)}
                    placeholder="Digite sua resposta aqui de forma clara e aprofundada..."
                    className={cn(
                      "w-full p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-gray-50/50 dark:bg-[#12141C] text-gray-900 dark:text-white leading-relaxed outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-xs resize-y transition-all",
                      fontSize === "large" ? "text-base" : "text-sm sm:text-base"
                    )}
                  />

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                    <span>
                      {selectedAnswer.trim()
                        ? `${selectedAnswer.trim().split(/\s+/).length} palavras • ${selectedAnswer.length} caracteres`
                        : "Nenhum texto digitado ainda"}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {selectedAnswer.trim() ? "✓ Resposta salva automaticamente" : "Pendente"}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </main>

        {/* RIGHT: Collapsible Question Map Navigator */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-l border-gray-200/80 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] flex flex-col shrink-0 overflow-hidden z-20"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3a] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <LayoutGrid size={16} className="text-purple-600 dark:text-purple-400" />
                    Mapa da Prova
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Navegue rapidamente entre as questões
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Recolher mapa"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="p-3 border-b border-gray-100 dark:border-[#2a2d3a] grid grid-cols-4 gap-1 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSidebarFilter("all")}
                  className={cn(
                    "py-1.5 rounded-lg text-center transition-colors cursor-pointer",
                    sidebarFilter === "all"
                      ? "bg-purple-600 text-white font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  Todas ({simulado.questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarFilter("answered")}
                  className={cn(
                    "py-1.5 rounded-lg text-center transition-colors cursor-pointer",
                    sidebarFilter === "answered"
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  Resp. ({answeredCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarFilter("pending")}
                  className={cn(
                    "py-1.5 rounded-lg text-center transition-colors cursor-pointer",
                    sidebarFilter === "pending"
                      ? "bg-amber-600 text-white font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  Pend. ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarFilter("flagged")}
                  className={cn(
                    "py-1.5 rounded-lg text-center transition-colors cursor-pointer",
                    sidebarFilter === "flagged"
                      ? "bg-rose-600 text-white font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  Dúvida ({flaggedQuestions.size})
                </button>
              </div>

              {/* Question Buttons Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-5 gap-2">
                  {filteredQuestionIndices.map((idx) => {
                    const isCurrent = idx === currentIdx;
                    const hasAnswer = Boolean(answers[idx]?.trim());
                    const isFlag = flaggedQuestions.has(idx);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={cn(
                          "relative h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs border",
                          isCurrent
                            ? "bg-purple-600 text-white border-purple-600 ring-2 ring-purple-400/40 scale-105 shadow-md"
                            : hasAnswer
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80 hover:scale-102"
                            : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-[#12141C] dark:text-gray-300 dark:border-[#2a2d3a] hover:border-purple-400"
                        )}
                        title={`Questão ${idx + 1}${hasAnswer ? " (Respondida)" : " (Pendente)"}${isFlag ? " • Marcada para revisão" : ""}`}
                      >
                        <span>{idx + 1}</span>
                        {isFlag && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#1A1D27]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar Footer Legend */}
              <div className="p-4 border-t border-gray-100 dark:border-[#2a2d3a] bg-gray-50/50 dark:bg-[#12141C]/40 text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                  <span>Questão Atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Respondida ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <span>Pendente ({pendingCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Marcada com Dúvida ({flaggedQuestions.size})</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* 3. FLOATING BOTTOM ACTION BAR */}
      <footer className="h-18 border-t border-gray-200/80 bg-white/95 dark:border-[#2a2d3a] dark:bg-[#1A1D27]/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between shrink-0 z-30">
        {/* Left: Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className={cn(
            "flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer",
            currentIdx === 0
              ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
              : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 dark:bg-[#12141C] dark:hover:bg-gray-800 dark:text-white dark:border-[#2a2d3a]"
          )}
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        {/* Center: Quick Progress Indicator */}
        <div className="text-center">
          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
            Questão {currentIdx + 1} de {simulado.questions.length}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {answeredCount} respondidas • {pendingCount} pendentes
          </span>
        </div>

        {/* Right: Next or Submit */}
        <div className="flex items-center gap-2">
          {currentIdx < simulado.questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Próxima</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              className="flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send size={15} />
              <span>Finalizar Simulado</span>
            </button>
          )}
        </div>
      </footer>

      {/* 4. CONFIRMATION MODAL BEFORE SUBMITTING */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] p-6 sm:p-7 shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                    <Send size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Entregar Simulado?
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Revise suas respostas antes da correção oficial
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/30 p-3 rounded-2xl text-center">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                    Respondidas
                  </span>
                  <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                    {answeredCount}
                  </span>
                </div>

                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 p-3 rounded-2xl text-center">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 block mb-0.5">
                    Pendentes
                  </span>
                  <span className="text-xl font-black text-amber-800 dark:text-amber-200">
                    {pendingCount}
                  </span>
                </div>

                <div className="bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/30 p-3 rounded-2xl text-center">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 block mb-0.5">
                    Com Dúvida
                  </span>
                  <span className="text-xl font-black text-purple-800 dark:text-purple-200">
                    {flaggedQuestions.size}
                  </span>
                </div>
              </div>

              {/* Unanswered warning and direct links */}
              {pendingCount > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle size={15} />
                    <span>Você ainda possui {pendingCount} questão(ões) em branco:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {simulado.questions.map((_, idx) => {
                      if (answers[idx]?.trim()) return null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCurrentIdx(idx);
                            setIsConfirmModalOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-amber-800 border border-amber-300 hover:bg-amber-100 dark:bg-[#12141C] dark:text-amber-300 dark:border-amber-800 cursor-pointer shadow-2xs transition-colors"
                        >
                          Ir para #{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Continuar Fazendo
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw size={16} className="animate-spin" />
                      <span>Corrigindo...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Sim, Entregar Prova</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. EXIT CONFIRMATION MODAL */}
      <AnimatePresence>
        {isExitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Sair do Simulado?
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Seu progresso atual não será entregue para correção.
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Você respondeu <strong>{answeredCount}</strong> de <strong>{simulado.questions.length}</strong> questões.
                Tem certeza de que deseja voltar ao painel de simulados?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Continuar Simulado
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                >
                  Sair sem Entregar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
