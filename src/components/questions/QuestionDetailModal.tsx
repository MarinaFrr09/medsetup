"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bookmark,
  Copy,
  Edit2,
  Trash2,
  BookX,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, Question } from "@/stores/useAppStore";
import { cleanQuestionTitle, formatQuestionSubject, renderFormattedText } from "@/lib/questionUtils";
import AddErrorModal from "@/components/caderno/AddErrorModal";
import AddAnotacaoModal from "@/components/anotacoes/AddAnotacaoModal";
import toast from "react-hot-toast";

interface QuestionDetailModalProps {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (question: Question) => void;
  allQuestions?: Question[];
  onSelectQuestion?: (question: Question) => void;
}

const difficultyColors: Record<string, string> = {
  Fácil: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  Médio: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  Difícil: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

export default function QuestionDetailModal({
  question,
  isOpen,
  onClose,
  onEdit,
  allQuestions = [],
  onSelectQuestion,
}: QuestionDetailModalProps) {
  const { toggleQuestionReview, deleteQuestion, recordQuestionAnswer } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [showGabarito, setShowGabarito] = useState(false);
  const [isCadernoModalOpen, setIsCadernoModalOpen] = useState(false);
  const [isAnotacaoModalOpen, setIsAnotacaoModalOpen] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  // Sync state when question changes
  useEffect(() => {
    if (question) {
      setSelectedOpt(question.userAnswer || null);
      // Auto-show gabarito if question is already answered
      setShowGabarito(!!question.userAnswer || question.status === "correct" || question.status === "incorrect");
    }
  }, [question?.id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !question) return null;

  const diffKey = question.difficulty || "Médio";
  const diffClass = difficultyColors[diffKey] || difficultyColors["Médio"];

  const currentIndex = allQuestions.findIndex((q) => q.id === question.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allQuestions.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectQuestion) {
      onSelectQuestion(allQuestions[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectQuestion) {
      onSelectQuestion(allQuestions[currentIndex + 1]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(question.text);
    setCopied(true);
    toast.success("Enunciado copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReview = () => {
    toggleQuestionReview(question.id);
    toast.success(
      question.isFlaggedForReview ? "Removida da revisão" : "Marcada para revisão"
    );
  };

  const handleDelete = () => {
    deleteQuestion(question.id);
    toast.success("Questão movida para a lixeira.");
    onClose();
  };

  // Check correct answer string
  const cleanAnswer = (question.answer || "").trim().toLowerCase();

  const handleOptionSelect = (optLetter: string, optText: string) => {
    setSelectedOpt(optLetter);
    setShowGabarito(true);

    const isCorrect =
      cleanAnswer === optLetter.toLowerCase() ||
      cleanAnswer === optText.trim().toLowerCase();

    recordQuestionAnswer(question.id, isCorrect, optLetter);

    if (isCorrect) {
      toast.success("Parabéns, resposta correta! 🎉");
    } else {
      toast.error("Resposta incorreta.");
    }
  };

  const parsedOptions: Array<{ id: string; text: string }> = Array.isArray(question.options)
    ? question.options.map((opt: any, idx: number) => {
        if (typeof opt === "string") {
          return { id: String.fromCharCode(65 + idx), text: opt };
        }
        return {
          id: opt.id || String.fromCharCode(65 + idx),
          text: opt.text || "",
        };
      })
    : [];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto cursor-pointer"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] cursor-default"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-[#2a2d3a] bg-gray-50/60 dark:bg-[#151720]/80">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {question.type && question.type !== "multiple-choice" && (
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                  {question.type}
                </span>
              )}
              <span className={cn("rounded-md px-2.5 py-1 text-xs font-semibold border", diffClass)}>
                {question.difficulty}
              </span>
              {question.subject && (
                <span className="rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 px-2.5 py-1 text-xs font-semibold">
                  {formatQuestionSubject(question.subject)}
                </span>
              )}
              {question.status === "correct" && (
                <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={13} /> Acertou
                </span>
              )}
              {question.status === "incorrect" && (
                <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <AlertCircle size={13} /> Errou
                </span>
              )}
              {question.isFlaggedForReview && (
                <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Bookmark size={12} className="fill-amber-600 text-amber-600" /> Revisão
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleToggleReview}
                className={cn(
                  "p-2 rounded-xl transition-colors cursor-pointer",
                  question.isFlaggedForReview
                    ? "text-amber-600 bg-amber-100 dark:bg-amber-900/40"
                    : "text-gray-400 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                title={question.isFlaggedForReview ? "Remover da revisão" : "Marcar para revisão"}
              >
                <Bookmark
                  size={16}
                  className={question.isFlaggedForReview ? "fill-amber-600 text-amber-600" : ""}
                />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Copiar texto"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(question)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Editar questão"
                >
                  <Edit2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAnotacaoModalOpen(true)}
                className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Salvar como Anotação Importante"
              >
                <NotebookPen size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsCadernoModalOpen(true)}
                className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Caderno de Erros"
              >
                <BookX size={16} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Excluir questão"
              >
                <Trash2 size={16} />
              </button>
              <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content - Scrollable */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Enunciado */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <HelpCircle size={14} className="text-blue-500" />
                <span>Enunciado da Questão</span>
              </div>
              <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                {renderFormattedText(cleanQuestionTitle(question.text))}
              </div>
            </div>

            {/* Alternativas */}
            {parsedOptions.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Alternativas {selectedOpt ? "(Respondida)" : "(Selecione para responder)"}:
                </label>
                <div className="space-y-2">
                  {parsedOptions.map((opt, idx) => {
                    const optLetter = String.fromCharCode(65 + idx);
                    const isSelected = selectedOpt === optLetter || selectedOpt === opt.id;
                    const isCorrectOpt =
                      cleanAnswer === optLetter.toLowerCase() ||
                      cleanAnswer === opt.id.toLowerCase() ||
                      cleanAnswer === opt.text.trim().toLowerCase();

                    let optionStyle =
                      "border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 dark:border-[#2a2d3a] dark:hover:border-blue-500/50 dark:hover:bg-blue-950/20 bg-white dark:bg-[#1A1D27]";

                    if (showGabarito) {
                      if (isCorrectOpt) {
                        optionStyle =
                          "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold";
                      } else if (isSelected && !isCorrectOpt) {
                        optionStyle =
                          "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                      } else {
                        optionStyle =
                          "opacity-60 border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151720]";
                      }
                    } else if (isSelected) {
                      optionStyle =
                        "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleOptionSelect(optLetter, opt.text)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer",
                          optionStyle
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                            showGabarito && isCorrectOpt
                              ? "bg-emerald-600 text-white"
                              : showGabarito && isSelected && !isCorrectOpt
                              ? "bg-rose-600 text-white"
                              : isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          )}
                        >
                          {optLetter}
                        </span>
                        <div className="flex-1 pt-0.5 text-sm leading-relaxed">
                          {renderFormattedText(opt.text)}
                        </div>
                        {showGabarito && isCorrectOpt && (
                          <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-0.5">
                            <CheckCircle2 size={16} /> Gabarito
                          </span>
                        )}
                        {showGabarito && isSelected && !isCorrectOpt && (
                          <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 pt-0.5">
                            <AlertCircle size={16} /> Sua Resposta
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gabarito e Explicação */}
            {question.explanation && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Gabarito & Comentário</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGabarito(!showGabarito)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {showGabarito ? (
                      <>
                        <EyeOff size={13} /> Ocultar Gabarito
                      </>
                    ) : (
                      <>
                        <Eye size={13} /> Revelar Gabarito
                      </>
                    )}
                  </button>
                </div>

                {showGabarito && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2"
                  >
                    {question.answer && (
                      <div className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
                        <span>Resposta Correta:</span>
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-xs font-black">
                          {question.answer.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                      {renderFormattedText(question.explanation)}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Caderno de Erros Shortcut banner */}
            <div className="p-3 rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                  <BookX size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    Teve dúvida ou errou esta questão?
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Registre a falha e pegadinha no seu Caderno de Erros para revisão ativa.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAnotacaoModalOpen(true)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5"
                  title="Salvar como Anotação Importante"
                >
                  <NotebookPen size={13} />
                  <span>+ Anotação</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCadernoModalOpen(true)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5"
                >
                  <BookX size={13} />
                  <span>+ Caderno</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer - Navigation */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-[#2a2d3a] bg-gray-50/60 dark:bg-[#151720]/80 text-xs">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Clock size={13} />
              <span>{question.date || "Hoje"}</span>
              {allQuestions.length > 0 && currentIndex >= 0 && (
                <span className="font-semibold text-gray-700 dark:text-gray-300 ml-2">
                  Questão {currentIndex + 1} de {allQuestions.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {allQuestions.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight size={14} />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Caderno Modal */}
      <AddErrorModal
        isOpen={isCadernoModalOpen}
        onClose={() => setIsCadernoModalOpen(false)}
        questions={[
          {
            text: question.text,
            options: question.options,
            userAnswer: question.userAnswer,
            correctAnswer: question.answer || "",
            explanation: question.explanation,
            origin: "question",
            originTitle: "Banco de Questões",
            questionId: question.id,
          },
        ]}
      />

      {/* Anotações Modal */}
      <AddAnotacaoModal
        isOpen={isAnotacaoModalOpen}
        onClose={() => setIsAnotacaoModalOpen(false)}
        initialData={{
          title: `Questão: ${question.subject ? question.subject : cleanQuestionTitle(question.text).slice(0, 50)}`,
          content: `### Enunciado da Questão:\n${question.text}\n\n${question.explanation ? `### Gabarito & Comentário:\n${question.explanation}` : ""}`,
          materia: question.subject,
          source: {
            type: "question",
            title: `Questão: ${cleanQuestionTitle(question.text).slice(0, 45)}...`,
            originId: question.id,
            originalQuestion: {
              text: question.text,
              options: question.options,
              userAnswer: question.userAnswer,
              correctAnswer: question.answer || "",
              explanation: question.explanation,
            },
          },
          highlights: question.explanation
            ? [
                {
                  text: question.explanation.slice(0, 160),
                  color: "yellow",
                  tag: "Regra de Ouro",
                },
              ]
            : undefined,
        }}
      />
    </AnimatePresence>
  );
}
