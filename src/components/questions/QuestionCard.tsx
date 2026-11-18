"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Trash2, Copy, Clock, Check, Bookmark, AlertCircle, CheckCircle2, Edit2, BookX, NotebookPen } from "lucide-react";
import { useAppStore, Question } from "@/stores/useAppStore";
import dynamic from "next/dynamic";
import { cleanQuestionTitle, renderFormattedText } from "@/lib/questionUtils";
import toast from "react-hot-toast";

const AddErrorModal = dynamic(() => import("@/components/caderno/AddErrorModal"), { ssr: false });
const AddAnotacaoModal = dynamic(() => import("@/components/anotacoes/AddAnotacaoModal"), { ssr: false });

interface QuestionCardProps {
  question: Question;
  onClick?: () => void;
  onEdit?: (question: Question) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const difficultyColors: Record<string, string> = {
  Fácil: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Médio: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Difícil: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function QuestionCard({
  question,
  onClick,
  onEdit,
  selectable,
  isSelected,
  onToggleSelect,
}: QuestionCardProps) {
  const { deleteQuestion, toggleQuestionReview } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCadernoModalOpen, setIsCadernoModalOpen] = useState(false);
  const [isAnotacaoModalOpen, setIsAnotacaoModalOpen] = useState(false);

  const diffKey = question.difficulty || "Médio";
  const diffClass = difficultyColors[diffKey] || difficultyColors["Médio"];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(question.text);
    setCopied(true);
    toast.success("Enunciado copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteQuestion(question.id);
    toast.success("Questão movida para a lixeira.");
  };

  const handleToggleReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleQuestionReview(question.id);
    toast.success(
      question.isFlaggedForReview ? "Removida da lista de revisão" : "Marcada para revisão"
    );
  };

  const handleCardClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(question.id);
      return;
    }
    if (onClick) {
      onClick();
    } else {
      setShowExplanation((prev) => !prev);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border bg-white p-4 shadow-2xs transition-all hover:shadow-md dark:bg-[#1A1D27] cursor-pointer hover:border-blue-500/70 dark:hover:border-blue-500/50",
        isSelected
          ? "border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 ring-2 ring-blue-500/30"
          : question.isFlaggedForReview
          ? "border-amber-300 dark:border-amber-700/50 bg-amber-50/20 dark:bg-amber-950/10"
          : "border-gray-200 dark:border-[#2a2d3a]"
      )}
    >
      <div>
        {/* Top Badges & Actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {selectable && (
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(question.id);
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer mr-1"
              />
            )}
            {question.type && question.type !== "multiple-choice" && (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {question.type}
              </span>
            )}
            <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", diffClass)}>
              {question.difficulty}
            </span>
            {question.status === "correct" && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={11} /> Acertou
              </span>
            )}
            {question.status === "incorrect" && (
              <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <AlertCircle size={11} /> Errou
              </span>
            )}
            {question.isFlaggedForReview && (
              <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <Bookmark size={10} className="fill-amber-600 text-amber-600" /> Revisar
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleReview}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                question.isFlaggedForReview
                  ? "text-amber-600 bg-amber-100/80 dark:bg-amber-900/40 hover:bg-amber-200"
                  : "text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
              )}
              title={question.isFlaggedForReview ? "Remover da revisão" : "Marcar para revisão"}
            >
              <Bookmark
                size={14}
                className={question.isFlaggedForReview ? "fill-amber-600 text-amber-600" : ""}
              />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Copiar texto"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(question);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Editar questão"
              >
                <Edit2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAnotacaoModalOpen(true);
              }}
              className="p-1.5 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-950/40 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Salvar como Anotação Importante"
            >
              <NotebookPen size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCadernoModalOpen(true);
              }}
              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Registrar no Caderno de Erros"
            >
              <BookX size={14} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-red-500/80 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Excluir questão"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed mb-3">
          {renderFormattedText(cleanQuestionTitle(question.text))}
        </div>
      </div>

      {/* Footer & Toggle Explanation */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {question.date || "Hoje"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAnotacaoModalOpen(true);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-600 dark:text-yellow-400 hover:underline cursor-pointer"
            title="Salvar como Anotação Importante"
          >
            <NotebookPen size={11} />
            <span>Nota</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCadernoModalOpen(true);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            title="Salvar no Caderno de Erros"
          >
            <BookX size={11} />
            <span>Caderno</span>
          </button>
        </div>

        {question.explanation && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowExplanation(!showExplanation);
            }}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {showExplanation ? "Ocultar Gabarito" : "Ver Gabarito"}
          </button>
        )}
      </div>

      {showExplanation && question.explanation && (
        <div className="mt-3 p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
          <p className="font-semibold mb-1">
            Resposta Correta: {question.answer?.toUpperCase()}
          </p>
          <p>{renderFormattedText(question.explanation)}</p>
        </div>
      )}

      {/* Caderno de Erros Modal */}
      {isCadernoModalOpen && (
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
      )}

      {/* Anotações Importantes Modal */}
      {isAnotacaoModalOpen && (
        <AddAnotacaoModal
          isOpen={isAnotacaoModalOpen}
          onClose={() => setIsAnotacaoModalOpen(false)}
          initialData={{
            title: `Questão: ${question.subject ? question.subject : cleanQuestionTitle(question.text).slice(0, 50)}`,
            content: `### Enunciado:\n${question.text}\n\n${question.explanation ? `### Comentário:\n${question.explanation}` : ""}`,
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
      )}
    </div>
  );
}
