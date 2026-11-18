"use client";

import { useState, useEffect } from "react";
import { X, Check, ArrowRight, ArrowLeft, RefreshCcw, Bookmark, Sparkles, BookX, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { cleanQuestionTitle, formatQuestionSubject, renderFormattedText } from "@/lib/questionUtils";
import AddErrorModal, { ErrorQuestionInput } from "@/components/caderno/AddErrorModal";
import AddAnotacaoModal, { AnotacaoInitialInput } from "@/components/anotacoes/AddAnotacaoModal";
import toast from "react-hot-toast";

interface QuizModeProps {
  questions: any[];
  onClose: () => void;
  inline?: boolean;
  initialIndex?: number;
}

export default function QuizMode({ questions, onClose, inline = true, initialIndex = 0 }: QuizModeProps) {
  const { recordQuestionAnswer, toggleQuestionReview, questions: allQuestions } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [selectedOption, setSelectedOption] = useState<string | number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [wrongQuestionsList, setWrongQuestionsList] = useState<any[]>([]);
  const [isCadernoModalOpen, setIsCadernoModalOpen] = useState(false);
  const [cadernoQuestions, setCadernoQuestions] = useState<ErrorQuestionInput[]>([]);
  const [isAnotacaoModalOpen, setIsAnotacaoModalOpen] = useState(false);
  const [anotacaoInitialData, setAnotacaoInitialData] = useState<AnotacaoInitialInput | undefined>(undefined);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "md">("base");

  const questionTextClass =
    fontSize === "sm"
      ? "text-base sm:text-lg font-medium leading-relaxed"
      : fontSize === "md"
      ? "text-xl sm:text-2xl font-medium leading-relaxed"
      : "text-lg sm:text-xl font-medium leading-relaxed";

  const optionTextClass =
    fontSize === "sm"
      ? "text-xs sm:text-sm leading-relaxed"
      : fontSize === "md"
      ? "text-base sm:text-lg leading-relaxed"
      : "text-sm sm:text-base leading-relaxed";

  const optionBadgeClass =
    fontSize === "sm"
      ? "h-7 w-7 text-xs"
      : fontSize === "md"
      ? "h-9 w-9 text-sm"
      : "h-8 w-8 text-xs";

  const question = questions?.[currentIndex];
  const liveQuestion = allQuestions.find((q) => q.id === question?.id) || question;
  const isFlagged = liveQuestion?.isFlaggedForReview ?? question?.isFlaggedForReview ?? false;
  
  // Dynamic options from question or fallback
  const rawOptions = question?.options || [];
  const options: Array<{ id: string; text: string }> = rawOptions.map((opt: any, idx: number) => {
    if (typeof opt === "string") {
      return { id: String.fromCharCode(97 + idx), text: opt };
    }
    return { id: opt.id || String.fromCharCode(97 + idx), text: opt.text || opt.label || "" };
  });

  const correctAnswer = (question?.answer || "a").toString().toLowerCase().trim();

  const handleAnswer = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOption(optionId);
    setIsAnswered(true);

    const isCorrect =
      optionId.toLowerCase() === correctAnswer ||
      (options.find((o) => o.id === optionId)?.text.toLowerCase() === correctAnswer);

    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      setWrongQuestionsList((prev) => [
        ...prev,
        {
          ...question,
          options,
          userAnswer: optionId,
          correctAnswer: question.answer,
        },
      ]);
    }

    if (question?.id) {
      recordQuestionAnswer(question.id, isCorrect, optionId);
    }
  };

  const handleToggleReview = () => {
    if (question?.id) {
      toggleQuestionReview(question.id);
      toast.success(isFlagged ? "Removida da revisão" : "Marcada para revisão posterior");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
      setIsAnswered(false);
    }
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (showResults) return;

      // Space key: go to next question if an alternative was chosen
      if (e.code === "Space") {
        e.preventDefault();
        if (isAnswered || selectedOption !== null) {
          handleNext();
        }
        return;
      }

      // Arrow keys
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

      // Numbers (1-5) and Letters (a-e) to select alternatives
      if (!isAnswered) {
        let optIndex = -1;
        if (["1", "a", "A"].includes(e.key)) optIndex = 0;
        else if (["2", "b", "B"].includes(e.key)) optIndex = 1;
        else if (["3", "c", "C"].includes(e.key)) optIndex = 2;
        else if (["4", "d", "D"].includes(e.key)) optIndex = 3;
        else if (["5", "e", "E"].includes(e.key)) optIndex = 4;

        if (optIndex >= 0 && optIndex < options.length) {
          e.preventDefault();
          handleAnswer(options[optIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isAnswered, selectedOption, showResults, options]);

  if (!questions || questions.length === 0) {
    if (inline) {
      return (
        <div className="w-full bg-white dark:bg-[#1A1D27] p-8 rounded-3xl border border-gray-200 dark:border-[#2a2d3a] text-center space-y-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Nenhuma questão disponível</h3>
          <p className="text-xs text-gray-500">Gere questões com IA ou crie manualmente primeiro.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Voltar para Questões
          </button>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white dark:bg-[#1A1D27] p-6 rounded-2xl max-w-md w-full text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhuma questão disponível</h3>
          <p className="text-sm text-gray-500 mb-4">Gere questões com IA ou crie manualmente primeiro.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium cursor-pointer"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + (showResults ? 1 : 0)) / questions.length) * 100;

  return (
    <div
      className={cn(
        inline
          ? "w-full max-w-4xl xl:max-w-[980px] flex flex-col bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs overflow-hidden"
          : "fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#0F1117]"
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/70 dark:bg-gray-800/40 px-5 sm:px-6 py-3.5 dark:border-[#2a2d3a]">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors text-xs font-bold cursor-pointer shadow-2xs"
            title="Sair do quiz e voltar para a lista de questões"
          >
            <ArrowLeft size={14} />
            <span>Voltar às Questões</span>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-gray-900 dark:text-white mb-1">
            {showResults ? "Resultados da Sessão" : `Questão ${currentIndex + 1} de ${questions.length}`}
          </span>
          <div className="w-40 sm:w-52 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setFontSize((prev) => (prev === "md" ? "base" : "sm"))}
              disabled={fontSize === "sm"}
              className="px-1.5 py-0.5 text-[11px] font-bold rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Diminuir tamanho da fonte"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize((prev) => (prev === "sm" ? "base" : "md"))}
              disabled={fontSize === "md"}
              className="px-1.5 py-0.5 text-[11px] font-bold rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Aumentar tamanho da fonte"
            >
              A+
            </button>
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            {score} acertos
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(inline ? "p-6 sm:p-8 md:p-10 w-full" : "flex-1 overflow-y-auto px-6 py-8 sm:py-10")}>
        <div className={cn("w-full mx-auto", inline ? "" : "px-6 py-8 sm:py-10 max-w-6xl")}>
          <AnimatePresence mode="wait">
            {!showResults ? (
              <motion.div
                key={`q-${currentIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Difficulty Badge, Clean Subject & Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {question?.type && question.type !== "multiple-choice" && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {question.type}
                      </span>
                    )}
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      {question?.difficulty || "Médio"}
                    </span>
                    {question?.subject && (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        {formatQuestionSubject(question.subject)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleReview}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer",
                      isFlagged
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                    )}
                    title={isFlagged ? "Remover da lista de revisão" : "Marcar questão para revisar depois"}
                  >
                    <Bookmark size={13} className={isFlagged ? "fill-amber-500 text-amber-500" : ""} />
                    <span>{isFlagged ? "Marcada p/ Revisar" : "Revisar Depois"}</span>
                  </button>
                </div>

                {/* Question Text */}
                <h2 className={cn("text-gray-900 dark:text-white", questionTextClass)}>
                  {renderFormattedText(cleanQuestionTitle(question?.text || question?.question))}
                </h2>

                {/* Options */}
                {options.length > 0 ? (
                  <div className="space-y-2.5 pt-1">
                    {options.map((opt, idx) => {
                      const isSelected = selectedOption === opt.id;
                      const isCorrect =
                        opt.id.toLowerCase() === correctAnswer ||
                        opt.text.toLowerCase() === correctAnswer;

                      let btnClass =
                        "border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:hover:border-blue-500/50 dark:hover:bg-blue-900/20";
                      let icon = null;

                      if (isAnswered) {
                        if (isCorrect) {
                          btnClass =
                            "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950/30";
                          icon = <Check className="text-green-600 dark:text-green-400" size={18} />;
                        } else if (isSelected) {
                          btnClass =
                            "border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/30";
                          icon = <X className="text-red-600 dark:text-red-400" size={18} />;
                        } else {
                          btnClass =
                            "border-gray-200 bg-white opacity-50 dark:border-[#2a2d3a] dark:bg-[#1A1D27]";
                        }
                      } else if (isSelected) {
                        btnClass =
                          "border-2 border-blue-500 bg-[#EDF5FF] text-gray-900 shadow-sm";
                      }

                      return (
                        <button
                          key={opt.id || idx}
                          type="button"
                          onClick={() => handleAnswer(opt.id)}
                          disabled={isAnswered}
                          className={cn(
                            "w-full flex items-center justify-between rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-200 cursor-pointer shadow-2xs select-none",
                            btnClass
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <span
                              className={cn(
                                "flex items-center justify-center rounded-lg font-bold flex-shrink-0 transition-colors border",
                                optionBadgeClass,
                                isAnswered && isCorrect
                                  ? "bg-green-600 text-white border-green-600"
                                  : isAnswered && isSelected
                                  ? "bg-red-600 text-white border-red-600"
                                  : isSelected
                                  ? "bg-[#1A73E8] text-white border-blue-600 shadow-xs"
                                  : "bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                              )}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span
                              className={cn(
                                optionTextClass,
                                isAnswered && isCorrect
                                  ? "text-green-900 dark:text-green-300 font-medium"
                                  : isAnswered && isSelected
                                  ? "text-red-900 dark:text-red-300 font-medium"
                                  : "text-gray-900 dark:text-gray-100 font-normal"
                              )}
                            >
                              {renderFormattedText(opt.text)}
                            </span>
                          </div>
                          {icon}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-[#2a2d3a] text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-semibold mb-2">Questão Dissertativa:</p>
                    <textarea
                      rows={4}
                      placeholder="Escreva sua resposta para praticar..."
                      className="w-full p-3 bg-white dark:bg-[#0F1117] border border-gray-200 dark:border-[#2a2d3a] rounded-xl text-sm outline-none resize-none"
                    />
                    <button
                      onClick={() => setIsAnswered(true)}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"
                    >
                      Ver Gabarito e Explicação
                    </button>
                  </div>
                )}

                {/* Explanation */}
                <AnimatePresence>
                  {isAnswered && question?.explanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-950/20"
                    >
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-400 text-sm">
                          💡 Explicação do Gabarito
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const qSub = question?.subject ? formatQuestionSubject(question.subject) : "";
                              setAnotacaoInitialData({
                                title: qSub ? `Nota: ${qSub}` : `Nota: ${cleanQuestionTitle(question?.text || "").slice(0, 50)}...`,
                                content: `### Comentário do Gabarito:\n${question?.explanation || ""}`,
                                materia: qSub || undefined,
                                source: {
                                  type: "question",
                                  title: `Questão #${currentIndex + 1} - Quiz`,
                                  originId: question.id,
                                  originalQuestion: {
                                    text: question.text,
                                    options,
                                    userAnswer: selectedOption ? String(selectedOption) : undefined,
                                    correctAnswer: question.answer,
                                    explanation: question.explanation,
                                  },
                                },
                                highlights: question?.explanation
                                  ? [
                                      {
                                        text: question.explanation.slice(0, 160),
                                        color: "yellow",
                                        tag: "Regra de Ouro",
                                      },
                                    ]
                                  : undefined,
                              });
                              setIsAnotacaoModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 text-xs font-semibold border border-yellow-200 dark:border-yellow-800 transition-colors cursor-pointer"
                            title="Salvar como Anotação Importante"
                          >
                            <NotebookPen size={12} />
                            <span>+ Nota</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCadernoQuestions([
                                {
                                  text: question.text,
                                  options,
                                  userAnswer: selectedOption ? String(selectedOption) : undefined,
                                  correctAnswer: question.answer,
                                  explanation: question.explanation,
                                  origin: "question",
                                  originTitle: "Quiz Interativo",
                                  questionId: question.id,
                                },
                              ]);
                              setIsCadernoModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                          >
                            <BookX size={12} />
                            <span>+ Caderno de Erros</span>
                          </button>
                        </div>
                      </div>
                      <p className={cn("leading-relaxed text-blue-800 dark:text-blue-300/90 whitespace-pre-wrap", fontSize === "sm" ? "text-xs" : "text-xs sm:text-sm")}>
                        {renderFormattedText(question.explanation)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-12"
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <Check size={40} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Quiz Concluído!
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  Você acertou <strong className="text-emerald-500">{score}</strong> de{" "}
                  <strong>{questions.length}</strong> questões.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm"
                  >
                    Voltar ao Banco
                  </button>
                  <button
                    onClick={() => {
                      setCurrentIndex(0);
                      setScore(0);
                      setIsAnswered(false);
                      setSelectedOption(null);
                      setShowResults(false);
                      setWrongQuestionsList([]);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer text-sm shadow-sm"
                  >
                    <RefreshCcw size={15} /> Refazer Quiz
                  </button>
                  {wrongQuestionsList.length > 0 && (
                    <button
                      onClick={() => {
                        const list: ErrorQuestionInput[] = wrongQuestionsList.map((q) => ({
                          text: q.text,
                          options: q.options,
                          userAnswer: q.userAnswer,
                          correctAnswer: q.correctAnswer || q.answer,
                          explanation: q.explanation,
                          origin: "question",
                          originTitle: "Quiz Interativo",
                          questionId: q.id,
                        }));
                        setCadernoQuestions(list);
                        setIsCadernoModalOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer text-sm shadow-sm"
                    >
                      <BookX size={15} /> Salvar Erros no Caderno ({wrongQuestionsList.length})
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Controls */}
      {!showResults && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
          <div className="flex w-full items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
            >
              <ArrowLeft size={16} /> Anterior
            </button>

            <button
              onClick={handleNext}
              disabled={!isAnswered}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-all cursor-pointer",
                isAnswered
                  ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
                  : "bg-gray-300 cursor-not-allowed dark:bg-gray-700"
              )}
            >
              {currentIndex === questions.length - 1 ? "Finalizar" : "Próxima"} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Caderno de Erros Modal */}
      <AddErrorModal
        isOpen={isCadernoModalOpen}
        onClose={() => setIsCadernoModalOpen(false)}
        questions={cadernoQuestions}
      />

      {/* Anotações Importantes Modal */}
      <AddAnotacaoModal
        isOpen={isAnotacaoModalOpen}
        onClose={() => setIsAnotacaoModalOpen(false)}
        initialData={anotacaoInitialData}
      />
    </div>
  );
}
