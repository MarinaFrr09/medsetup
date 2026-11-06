"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PenTool,
  X,
} from "lucide-react";
import { SimuladoExam, SimuladoQuestion } from "@/stores/useAppStore";
import toast from "react-hot-toast";

interface SimuladoAnhembiViewProps {
  simulado: SimuladoExam;
  onFinishExam: (completedExam: SimuladoExam) => void;
  onExit: () => void;
}

export default function SimuladoAnhembiView({
  simulado,
  onFinishExam,
  onExit,
}: SimuladoAnhembiViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    simulado.questions.forEach((q, idx) => {
      if (q.userAnswer) initial[idx] = q.userAnswer;
    });
    return initial;
  });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer logic
  const totalSeconds = simulado.durationMinutes * 60;
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
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  };

  const handleAutoSubmit = () => {
    toast.error("O tempo da prova acabou! Entregando prova...");
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
    } else {
      setIsConfirmModalOpen(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setIsConfirmModalOpen(false);

    try {
      const timeSpent = simulado.hasTimer
        ? totalSeconds - secondsRemaining
        : secondsRemaining;

      const updatedQuestions: SimuladoQuestion[] = simulado.questions.map((q, idx) => {
        const userAns = answers[idx] || "";
        const isCorrect =
          q.type === "multiple_choice"
            ? userAns.trim().toLowerCase() === q.answer.trim().toLowerCase()
            : undefined;

        return {
          ...q,
          userAnswer: userAns,
          isCorrect,
        };
      });

      const mcQuestions = updatedQuestions.filter((q) => q.type === "multiple_choice");
      const essayQuestions = updatedQuestions.filter((q) => q.type === "essay");

      const correctCount = mcQuestions.filter((q) => q.isCorrect).length;
      const mcCount = mcQuestions.length;
      const mcScore = mcCount > 0 ? (correctCount / mcCount) * 10 : 10;
      const totalQ = simulado.totalQuestions || updatedQuestions.length;
      const essayPoints = essayQuestions.reduce((acc, curr) => acc + (curr.essayScore || 0) / 10, 0);

      const score =
        totalQ > 0
          ? Math.round((((correctCount + essayPoints) / totalQ) * 10) * 10) / 10
          : mcScore;

      const completedExam: SimuladoExam = {
        ...simulado,
        status: "completed",
        score,
        correctCount,
        timeSpentSeconds: timeSpent,
        completedAt: new Date().toISOString(),
        questions: updatedQuestions,
      };

      toast.success("Prova finalizada com sucesso!");
      onFinishExam(completedExam);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao finalizar prova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const unansweredCount = useMemo(() => {
    return simulado.questions.filter((_, idx) => !answers[idx] || answers[idx].trim() === "").length;
  }, [answers, simulado.questions]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 dark:bg-[#0B0D13] p-2 sm:p-5 md:p-6 flex justify-center items-start select-none animate-in fade-in duration-150">
      <div className="w-full max-w-5xl flex flex-col min-h-[calc(100vh-2.5rem)] sm:min-h-[calc(100vh-3rem)] bg-white text-gray-900 font-sans rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2a2d3a] overflow-hidden text-left my-auto">
        {/* 1. TOP HEADER */}
        <header className="bg-white border-b border-gray-200 px-6 sm:px-8 py-3.5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Sair do simulado e voltar à lista"
            >
              <ArrowLeft size={15} />
              <span>Sair da Prova</span>
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-[#0052CC] text-white font-black text-xs px-2.5 py-0.5 rounded tracking-wider shrink-0 shadow-xs">
                ANHEMBI
              </span>
              <h1 className="text-xs sm:text-sm font-bold text-gray-800 truncate" title={simulado.title}>
                {simulado.title || "Prova Integrada — Faculdade Anhembi Morumbi"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-600 font-bold bg-gray-100 px-3 py-1 rounded-lg">
              Questão {currentIdx + 1} de {simulado.questions.length}
            </span>
          </div>
        </header>

        {/* 2. MAIN QUESTION CONTENT (SUPERIOR COM ESPAÇAMENTO FLEXÍVEL) */}
        <div className="flex-1 flex flex-col justify-start p-6 sm:p-8 md:p-10 space-y-6 text-left overflow-y-auto">
          {/* Question Title & Subject */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <span className="text-base sm:text-xl font-bold text-gray-900">
              Questão {currentQuestion.number || currentIdx + 1}
            </span>
            <span className="text-xs sm:text-sm text-gray-500 font-medium bg-gray-100 px-3 py-0.5 rounded-full">
              {simulado.subject || "Conhecimentos Específicos"}
            </span>
          </div>

          {/* Statement Text */}
          <p className="text-sm sm:text-base text-gray-800 leading-relaxed font-normal whitespace-pre-wrap text-left">
            {currentQuestion.text}
          </p>

          {/* Histological Slide / Tissue Image */}
          {currentQuestion.imageUrl && (
            <div className="my-2.5 text-left">
              <div className="inline-block relative rounded-xl overflow-hidden border border-gray-200 shadow-xs bg-black/5 max-w-2xl">
                <img
                  src={currentQuestion.imageUrl}
                  alt={currentQuestion.imageCaption || "Lâmina Histológica"}
                  className="max-h-80 w-auto object-contain rounded-xl"
                />
                {currentQuestion.imageCaption && (
                  <div className="p-2 text-xs text-gray-600 bg-white/95 border-t border-gray-100 font-medium">
                    {currentQuestion.imageCaption}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {currentQuestion.type === "multiple_choice" && (
            <div className="space-y-2.5 pt-1 text-left">
              {(currentQuestion.options || []).map((opt, optIdx) => {
                const isSelected = selectedAnswer.toLowerCase() === opt.id.toLowerCase();
                const letter = String.fromCharCode(65 + optIdx);

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer text-left",
                      isSelected
                        ? "bg-[#EFEFEF] border-gray-400 shadow-2xs"
                        : "bg-white border-transparent hover:bg-gray-50"
                    )}
                  >
                    {/* Left Slot: 'Escolhida' pill when selected */}
                    <div className="w-16 shrink-0 flex items-center justify-end pt-0.5">
                      {isSelected && (
                        <span className="bg-[#4B5563] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                          Escolhida
                        </span>
                      )}
                    </div>

                    {/* Letter box (A, B, C...) */}
                    <div
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors",
                        isSelected
                          ? "bg-[#4B5563] text-white"
                          : "border border-gray-300 text-gray-700 bg-white"
                      )}
                    >
                      {letter}
                    </div>

                    {/* Alternative Text */}
                    <div className="flex-1 text-xs sm:text-sm text-gray-800 pt-0.5 leading-snug text-left">
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Essay Question */}
          {currentQuestion.type === "essay" && (
            <div className="space-y-2.5 pt-1 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200 inline-flex">
                <PenTool size={13} />
                <span>Questão Dissertativa</span>
              </div>

              <textarea
                rows={4}
                value={selectedAnswer}
                onChange={(e) => handleEssayChange(e.target.value)}
                placeholder="Escreva sua resposta de forma clara e objetiva..."
                className="w-full p-3.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs sm:text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs resize-y"
              />
            </div>
          )}
        </div>

        {/* 3. GABARITO GERAL (TABLE COM BOTÕES MAIORES - FIXO NA PARTE INFERIOR) */}
        <div className="mt-auto border-t border-gray-200 bg-[#FAFAFA] px-6 sm:px-8 py-4 shrink-0">
          <div className="w-full space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-700">
              <span className="leading-snug text-xs sm:text-sm">
                Confira todas as suas respostas antes de concluir a prova. As marcadas em{" "}
                <strong className="text-red-600 font-bold">vermelho</strong> estão com a resposta em branco.
              </span>
              <span className="shrink-0 font-bold text-red-600 self-start sm:self-auto bg-red-50 border border-red-200 px-3 py-1 rounded-lg text-xs">
                {unansweredCount} em branco
              </span>
            </div>

            <div className="overflow-x-auto pt-1">
              <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-12 gap-2 sm:gap-2.5 min-w-[340px]">
                {simulado.questions.map((q, idx) => {
                  const studentAns = answers[idx]?.trim() || "";
                  const isAnswered = studentAns.length > 0;
                  const isCurrent = idx === currentIdx;

                  const optIndex = (q.options || []).findIndex(
                    (o) => o.id.toLowerCase() === studentAns.toLowerCase()
                  );
                  const letter = optIndex >= 0 ? String.fromCharCode(65 + optIndex) : studentAns.toUpperCase().slice(0, 1);

                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={cn(
                        "h-10 sm:h-11 min-w-[42px] sm:min-w-[46px] rounded-xl border-2 flex items-center justify-center font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xs",
                        !isAnswered
                          ? "bg-[#D9534F] text-white border-red-600 hover:brightness-110 active:scale-95"
                          : isCurrent
                          ? "bg-[#C5D9F1] border-2 border-blue-600 text-blue-950 font-black ring-2 ring-blue-300"
                          : "bg-white border-gray-300 text-gray-800 hover:bg-gray-100"
                      )}
                      title={`Questão ${q.number || idx + 1}: ${isAnswered ? `Resposta ${letter}` : "Em branco"}`}
                    >
                      {isAnswered ? (
                        <span>
                          {q.number || idx + 1} {letter}
                        </span>
                      ) : (
                        <span>{q.number || idx + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. BOTTOM ACTION FOOTER */}
        <footer className="border-t border-gray-200 bg-white px-6 sm:px-8 py-3.5 flex items-center justify-between gap-3 shrink-0 z-10 shadow-xs">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="bg-[#C4D72F] hover:bg-[#B3C527] text-gray-900 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            Anterior
          </button>

          <div className="bg-[#374151] text-white font-mono font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xs tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-300" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <div className="flex items-center gap-3">
            {currentIdx < simulado.questions.length - 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="hidden sm:inline-block text-xs font-semibold text-gray-500 hover:text-blue-600 px-3 py-2 transition-colors cursor-pointer"
                >
                  Entregar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Próxima</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-7 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                Concluir a prova
              </button>
            )}
          </div>
        </footer>
      </div>

      {/* Confirmation Finish Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Entregar Prova?</h3>
                <p className="text-xs text-gray-500">Confirmação de finalização</p>
              </div>
            </div>

            {unansweredCount > 0 ? (
              <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
                Atenção: Você ainda tem <strong>{unansweredCount}</strong> questões em branco (marcadas em vermelho no gabarito). Deseja finalizar mesmo assim?
              </p>
            ) : (
              <p className="text-xs text-gray-600 leading-relaxed">
                Todas as questões foram preenchidas. Seu gabarito será corrigido automaticamente pela banca examinadora.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Continuar Prova
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Finalizando..." : "Sim, Entregar Prova"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
