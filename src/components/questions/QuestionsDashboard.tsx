"use client";

import { useMemo } from "react";
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Bookmark,
  TrendingUp,
  BrainCircuit,
  Folder as FolderIcon,
  Layers,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useAppStore, Question } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { renderFormattedText, cleanQuestionTitle } from "@/lib/questionUtils";
import QuestionsStatsCards from "./QuestionsStatsCards";

interface QuestionsDashboardProps {
  onStartQuiz: (customQuestions?: Question[]) => void;
  onOpenAIModal: () => void;
  onSelectFolder: (folderId: string) => void;
  onCreateQuestion: () => void;
}

export default function QuestionsDashboard({
  onStartQuiz,
  onOpenAIModal,
  onSelectFolder,
  onCreateQuestion,
}: QuestionsDashboardProps) {
  const { questions, folders, toggleQuestionReview } = useAppStore();

  // Global Statistics
  const stats = useMemo(() => {
    const total = questions.length;
    const answered = questions.filter(
      (q) => q.status === "correct" || q.status === "incorrect" || (q.timesAnswered || 0) > 0
    );
    const answeredCount = answered.length;
    const correctCount = questions.filter((q) => q.status === "correct").length;
    const incorrectCount = questions.filter((q) => q.status === "incorrect").length;
    const flaggedForReview = questions.filter((q) => q.isFlaggedForReview || q.status === "incorrect");

    const accuracyRate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const completionRate = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    // Difficulty breakdown
    const easyTotal = questions.filter((q) => q.difficulty === "Fácil" || q.difficulty === "easy");
    const easyAnswered = easyTotal.filter((q) => q.status === "correct" || q.status === "incorrect");
    const easyCorrect = easyTotal.filter((q) => q.status === "correct").length;
    const easyAcc = easyAnswered.length > 0 ? Math.round((easyCorrect / easyAnswered.length) * 100) : 0;

    const medTotal = questions.filter((q) => q.difficulty === "Médio" || q.difficulty === "medium");
    const medAnswered = medTotal.filter((q) => q.status === "correct" || q.status === "incorrect");
    const medCorrect = medTotal.filter((q) => q.status === "correct").length;
    const medAcc = medAnswered.length > 0 ? Math.round((medCorrect / medAnswered.length) * 100) : 0;

    const hardTotal = questions.filter((q) => q.difficulty === "Difícil" || q.difficulty === "hard");
    const hardAnswered = hardTotal.filter((q) => q.status === "correct" || q.status === "incorrect");
    const hardCorrect = hardTotal.filter((q) => q.status === "correct").length;
    const hardAcc = hardAnswered.length > 0 ? Math.round((hardCorrect / hardAnswered.length) * 100) : 0;

    // Type breakdown
    const multipleChoiceCount = questions.filter((q) => q.type === "Múltipla Escolha" || !q.type).length;
    const trueFalseCount = questions.filter((q) => q.type === "V/F" || q.type === "true_false").length;
    const essayCount = questions.filter((q) => q.type === "Dissertativa" || q.type === "essay").length;

    return {
      total,
      answeredCount,
      correctCount,
      incorrectCount,
      flaggedForReview,
      accuracyRate,
      completionRate,
      easy: { total: easyTotal.length, answered: easyAnswered.length, correct: easyCorrect, accuracy: easyAcc },
      med: { total: medTotal.length, answered: medAnswered.length, correct: medCorrect, accuracy: medAcc },
      hard: { total: hardTotal.length, answered: hardAnswered.length, correct: hardCorrect, accuracy: hardAcc },
      types: { multipleChoiceCount, trueFalseCount, essayCount },
    };
  }, [questions]);

  // Folder Statistics
  const folderStats = useMemo(() => {
    return folders.map((folder) => {
      const folderQuestions = questions.filter((q) => q.folderId === folder.id);
      const answered = folderQuestions.filter((q) => q.status === "correct" || q.status === "incorrect");
      const correct = folderQuestions.filter((q) => q.status === "correct").length;
      const accuracy = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;

      return {
        folder,
        total: folderQuestions.length,
        answeredCount: answered.length,
        correctCount: correct,
        accuracy,
        questions: folderQuestions,
      };
    });
  }, [folders, questions]);

  // Quick Action Handlers
  const handleStartReviewQuiz = () => {
    if (stats.flaggedForReview.length > 0) {
      onStartQuiz(stats.flaggedForReview);
    }
  };

  const handleStartRandom10 = () => {
    if (questions.length > 0) {
      const shuffled = [...questions].sort(() => 0.5 - Math.random()).slice(0, 10);
      onStartQuiz(shuffled);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-[#1A1D27]/40 rounded-3xl border border-dashed border-gray-200 dark:border-[#2a2d3a]">
        <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-2xl mb-4 text-blue-600 dark:text-blue-400">
          <BrainCircuit className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Seu Banco de Questões está Vazio
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm mb-6 leading-relaxed">
          Gere até 50 questões instantâneas com IA em todas as dificuldades ou crie suas questões manualmente para começar a praticar e acompanhar suas estatísticas.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onOpenAIModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles size={16} /> Gerar Questões com IA
          </button>
          <button
            onClick={onCreateQuestion}
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
      {/* 2. STUDY ACTIONS HUB (BARRA DE AÇÕES RÁPIDAS) */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-5 text-white shadow-md shadow-blue-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-semibold backdrop-blur-xs">
              <Zap size={12} className="text-amber-300" /> Centro de Prática
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Pronto para testar seus conhecimentos?
            </h2>
            <p className="text-xs text-blue-100">
              Inicie um simulado com todas as {stats.total} questões cadastradas, treine suas dificuldades ou gere novas listas com IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onStartQuiz()}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-all shadow-sm cursor-pointer"
            >
              <Play size={14} className="fill-blue-700" />
              Simulado Geral ({stats.total})
            </button>

            {stats.flaggedForReview.length > 0 && (
              <button
                type="button"
                onClick={handleStartReviewQuiz}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-bold text-gray-950 transition-all shadow-sm cursor-pointer"
              >
                <RotateCcw size={13} />
                Revisar Erros ({stats.flaggedForReview.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleStartRandom10}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer"
            >
              <Zap size={13} />
              Treino Rápido (10 Qs)
            </button>

            <button
              type="button"
              onClick={onOpenAIModal}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-300" />
              Gerar com IA
            </button>
          </div>
        </div>
      </div>

      {/* 3. PERFORMANCE BREAKDOWN: ATIVIDADE 7 DIAS & PROGRESSO POR PASTA (ESTATÍSTICAS IDÊNTICAS AOS FLASHCARDS) */}
      <QuestionsStatsCards onSelectFolder={onSelectFolder} />

      {/* 4. QUESTÕES QUE PRECISAM DE ATENÇÃO (REVISÃO / ÚLTIMOS ERROS) */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-[#2a2d3a] pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bookmark size={18} className="text-amber-500" />
              Fila de Revisão Prioritária
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Questões que você errou ou marcou manualmente para revisão
            </p>
          </div>

          {stats.flaggedForReview.length > 0 && (
            <button
              type="button"
              onClick={handleStartReviewQuiz}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Play size={13} className="fill-current" />
              Treinar todas ({stats.flaggedForReview.length})
            </button>
          )}
        </div>

        {stats.flaggedForReview.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.flaggedForReview.slice(0, 6).map((q) => (
              <div
                key={q.id}
                className="flex flex-col justify-between p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#1A1D27] text-[10px] font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                        {q.difficulty}
                      </span>
                      {q.subject && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                          {q.subject}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleQuestionReview(q.id)}
                      className="text-amber-600 hover:text-gray-400 text-xs flex items-center gap-1 cursor-pointer"
                      title="Desmarcar da revisão"
                    >
                      <Bookmark size={13} className="fill-amber-500 text-amber-500" />
                    </button>
                  </div>

                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed">
                    {renderFormattedText(cleanQuestionTitle(q.text))}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-amber-100 dark:border-amber-900/30 flex items-center justify-between text-[11px]">
                  <span className="text-amber-800 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <XCircle size={12} className="text-rose-500" /> Erro pendente
                  </span>
                  <button
                    type="button"
                    onClick={() => onStartQuiz([q])}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Resolver Agora →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-50/50 dark:bg-[#0F1117]/30 rounded-2xl border border-dashed border-gray-200 dark:border-[#2a2d3a]">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Tudo limpo! Nenhuma questão pendente de revisão
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Quando você errar alguma questão ou marcá-la com o ícone de marcador, ela aparecerá aqui para reforço rápido.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}