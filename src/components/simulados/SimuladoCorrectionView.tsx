import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookOpen,
  ArrowLeft,
  RotateCcw,
  FileDown,
  Sparkles,
  HelpCircle,
  Lightbulb,
  PenTool,
  Check,
  X,
  ChevronDown,
  Layers,
  ArrowRight,
  FolderOpen,
  BookX,
} from "lucide-react";
import { SimuladoExam, SimuladoQuestion, useAppStore, Flashcard, Deck } from "@/stores/useAppStore";
import { exportElementToPdf } from "@/lib/pdf-export";
import AddErrorModal, { ErrorQuestionInput } from "@/components/caderno/AddErrorModal";
import toast from "react-hot-toast";

function cleanExplanationText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^(?:conforme|segundo|de acordo com|com base no|no)\s+(?:o\s+)?(?:documento|material|anexo|texto|livro)\s*[\d\w\s,.:;-]*?[,.:;-]\s*/i, "")
    .trim();
}

interface SimuladoCorrectionViewProps {
  simulado: SimuladoExam;
  onRetakeExam: () => void;
  onBackToList: () => void;
}

export default function SimuladoCorrectionView({
  simulado,
  onRetakeExam,
  onBackToList,
}: SimuladoCorrectionViewProps) {
  const router = useRouter();
  const { addDeck } = useAppStore();

  const [filter, setFilter] = useState<"all" | "correct" | "errors" | "essay">("all");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Revision flashcards modal state
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [flashcardScope, setFlashcardScope] = useState<"errors" | "all">("errors");
  const [deckName, setDeckName] = useState(`Revisão: ${simulado.title}`);
  const [isCreatedSuccess, setIsCreatedSuccess] = useState(false);
  const [createdCardCount, setCreatedCardCount] = useState(0);

  // Caderno de Erros modal state
  const [isCadernoModalOpen, setIsCadernoModalOpen] = useState(false);
  const [selectedErrorQuestions, setSelectedErrorQuestions] = useState<ErrorQuestionInput[]>([]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  // Robust Helpers to categorize questions regardless of capitalization or origin
  const isQuestionEssay = (q: SimuladoQuestion): boolean => {
    if (!q) return false;
    const t = (q.type || "").toLowerCase().trim();
    return (
      t === "essay" ||
      t === "dissertativa" ||
      t === "dissertativas" ||
      t === "discursiva" ||
      !q.options ||
      q.options.length === 0
    );
  };

  const isQuestionCorrect = (q: SimuladoQuestion): boolean => {
    if (isQuestionEssay(q)) {
      return (
        q.isCorrect === true ||
        (typeof q.essayScore === "number" && q.essayScore >= 7.0)
      );
    }
    return q.isCorrect === true;
  };

  const isQuestionError = (q: SimuladoQuestion): boolean => {
    if (isQuestionEssay(q)) {
      return (
        q.isCorrect === false ||
        (typeof q.essayScore === "number" && q.essayScore < 7.0) ||
        (!q.userAnswer || q.userAnswer.trim() === "")
      );
    }
    return !q.isCorrect;
  };

  const mcQuestions = useMemo(() => {
    return simulado.questions.filter((q) => !isQuestionEssay(q));
  }, [simulado.questions]);

  const essayQuestions = useMemo(() => {
    return simulado.questions.filter(isQuestionEssay);
  }, [simulado.questions]);

  const correctQuestions = useMemo(() => {
    return simulado.questions.filter(isQuestionCorrect);
  }, [simulado.questions]);

  const wrongQuestions = useMemo(() => {
    return simulado.questions.filter(isQuestionError);
  }, [simulado.questions]);

  const mcCorrect = useMemo(() => {
    return mcQuestions.filter((q) => q.isCorrect).length;
  }, [mcQuestions]);

  const mcTotal = mcQuestions.length;

  const essayAvg = useMemo(() => {
    const scored = essayQuestions.filter((q) => typeof q.essayScore === "number");
    if (scored.length === 0) return null;
    return (
      Math.round(
        (scored.reduce((acc, q) => acc + (q.essayScore || 0), 0) /
          scored.length) *
          10
      ) / 10
    );
  }, [essayQuestions]);

  const filteredQuestions = useMemo(() => {
    return simulado.questions.filter((q) => {
      if (filter === "correct") return isQuestionCorrect(q);
      if (filter === "errors") return isQuestionError(q);
      if (filter === "essay") return isQuestionEssay(q);
      return true;
    });
  }, [simulado.questions, filter]);

  const totalQuestionsCount = simulado.questions.length;
  const wrongQuestionsCount = wrongQuestions.length;

  const handleOpenCadernoForErrors = () => {
    const targetQuestions = wrongQuestions.length > 0 ? wrongQuestions : simulado.questions;
    if (targetQuestions.length === 0) {
      toast.error("Nenhuma questão disponível para adicionar ao caderno.");
      return;
    }
    const questionsToSave: ErrorQuestionInput[] = targetQuestions.map((q) => ({
      text: q.text,
      options: q.options,
      userAnswer: q.userAnswer,
      correctAnswer: q.answer,
      explanation: q.explanation || q.essayFeedback,
      imageUrl: q.imageUrl,
      imageCaption: q.imageCaption,
      subject: simulado.title,
      origin: "simulado",
      originTitle: simulado.title,
      questionId: String(q.id),
    }));
    setSelectedErrorQuestions(questionsToSave);
    setIsCadernoModalOpen(true);
  };

  const handleCreateFlashcards = () => {
    const targetQuestions = flashcardScope === "errors" ? wrongQuestions : simulado.questions;

    if (targetQuestions.length === 0) {
      toast.error("Nenhuma questão disponível para gerar flashcards.");
      return;
    }

    const cards: Flashcard[] = targetQuestions.map((q, idx) => {
      // Front of flashcard: question statement
      const front = q.text;

      // Back of flashcard:
      let back = "";
      if (q.type === "multiple_choice") {
        const correctOpt = q.options?.find((o) => o.id.toLowerCase() === q.answer.toLowerCase());
        const letter = q.answer.toUpperCase();
        const text = correctOpt ? correctOpt.text : "";
        back = `✅ Resposta Correta: Alternativa ${letter}${text ? ` - ${text}` : ""}`;
        if (q.explanation) {
          back += `\n\n💡 Fundamentação e Justificativa:\n${q.explanation}`;
        }
      } else {
        back = `📝 Espelho Oficial de Correção:\n${q.answer || q.explanation || "Sem espelho disponível."}`;
        if (q.essayFeedback) {
          back += `\n\n🔎 Parecer da Banca:\n${q.essayFeedback}`;
        }
      }

      return {
        id: `card-${Date.now()}-${idx}`,
        front,
        back,
      };
    });

    const subjectName = (simulado.title || "Simulado").trim();
    const folder = useAppStore.getState().getOrCreateFolder(subjectName, "both");

    const newDeck: Deck = {
      id: `deck-simulado-${Date.now()}`,
      name: deckName.trim() || `Revisão: ${simulado.title}`,
      description: `Flashcards de revisão criados a partir do simulado "${simulado.title}" (${flashcardScope === "errors" ? "Apenas questões com erro" : "Todas as questões"}).`,
      subject: subjectName,
      folderId: folder.id,
      cardCount: cards.length,
      cards,
      lastStudied: "Hoje",
      progress: 0,
    };

    addDeck(newDeck);
    setCreatedCardCount(cards.length);
    setIsCreatedSuccess(true);
    toast.success(`${cards.length} flashcard(s) salvos na pasta "${folder.name}" em Flashcards!`, { icon: "🗂️" });
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);
    toast.loading("Gerando PDF com gabarito e espelho da prova...", { id: "export-pdf" });

    try {
      const baseName = (simulado.title || "Simulado").replace(/\.[^/.]+$/, "").trim();
      const filename = `${baseName} Simulado.pdf`;
      await exportElementToPdf({
        element: reportRef.current,
        filename,
        orientation: "portrait",
      });
      toast.success("Gabarito em PDF exportado com sucesso!", { id: "export-pdf" });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.", { id: "export-pdf" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 px-4 sm:px-6 pt-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#2a2d3a] pb-4">
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar aos Simulados</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={handleOpenCadernoForErrors}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            title="Salvar questões com erro no Caderno de Erros"
          >
            <BookX size={15} />
            <span>Salvar Erros no Caderno {wrongQuestionsCount > 0 ? `(${wrongQuestionsCount})` : ""}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCreatedSuccess(false);
              setFlashcardScope(wrongQuestionsCount > 0 ? "errors" : "all");
              setDeckName(`Revisão: ${simulado.title}`);
              setIsFlashcardModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            title="Criar baralho de flashcards para revisão das questões"
          >
            <Sparkles size={15} />
            <span>Criar Flashcards de Revisão</span>
          </button>

          <button
            type="button"
            onClick={onRetakeExam}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>Refazer Simulado</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileDown size={15} />
            <span>{isExportingPdf ? "Exportando..." : "Exportar PDF"}</span>
          </button>
        </div>
      </div>

      {/* Container to be exported */}
      <div ref={reportRef} className="space-y-8 bg-white dark:bg-[#1A1D27] p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
        {/* Exam Title & Meta */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
            <Award size={13} />
            <span>Relatório Oficial de Correção</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {simulado.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Realizado em {simulado.date} • Duração total: {formatSeconds(simulado.timeSpentSeconds || 0)}
          </p>
        </div>

        {/* Big Score Card Banner */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 flex-col items-center justify-center rounded-2xl bg-white dark:bg-[#0F1117] shadow-md border border-blue-200 dark:border-blue-800 flex-shrink-0">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {simulado.score?.toFixed(1) || "0.0"}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                de 10.0
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold",
                    (simulado.score || 0) >= 7.0
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : (simulado.score || 0) >= 5.0
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  )}
                >
                  {(simulado.score || 0) >= 7.0
                    ? "Aprovado / Alto Desempenho"
                    : (simulado.score || 0) >= 5.0
                    ? "Aprovado / Regular"
                    : "Abaixo da Média / Revisar"}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
                Aproveitamento de {Math.round(((simulado.score || 0) / 10) * 100)}% na prova
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                {mcTotal > 0 && `${mcCorrect} de ${mcTotal} acertos em múltipla escolha`}
                {essayAvg !== null && ` • Média de ${essayAvg.toFixed(1)}/10 nas dissertativas`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>Tempo de Prova: {formatSeconds(simulado.timeSpentSeconds || 0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} />
              <span>{simulado.totalQuestions} questões corrigidas</span>
            </div>
          </div>
        </div>

        {/* Questions Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#2a2d3a] pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Gabarito e Justificativa Questão a Questão</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Revise suas escolhas e aprofunde o conhecimento com a resolução comentada.
            </p>
          </div>

          <div className="flex items-center p-1 bg-gray-100 dark:bg-[#0F1117] rounded-xl border border-gray-200/80 dark:border-gray-800 self-start sm:self-auto overflow-x-auto max-w-full">
            {[
              { id: "all", label: "Todas", count: simulado.questions.length },
              {
                id: "correct",
                label: "Acertos",
                count: correctQuestions.length,
                badgeColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60",
              },
              {
                id: "errors",
                label: "Erros",
                count: wrongQuestions.length,
                badgeColor: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60",
              },
              {
                id: "essay",
                label: "Dissertativas",
                count: essayQuestions.length,
                badgeColor: "text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60",
              },
            ].map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white shadow-xs font-bold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  )}
                >
                  <span>{f.label}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                      f.badgeColor && !isActive
                        ? f.badgeColor
                        : isActive
                        ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {filteredQuestions.length === 0 ? (
            <div className="py-12 text-center bg-gray-50/50 dark:bg-[#12141C] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500">
                <HelpCircle size={20} />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                Nenhuma questão encontrada para este filtro
              </h4>
              <p className="text-xs text-gray-400">
                Selecione &quot;Todas&quot; para visualizar a lista completa de questões.
              </p>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Ver Todas as Questões
              </button>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const originalIdx = simulado.questions.findIndex((item) => item.id === q.id);
              const questionNumber = q.number || (originalIdx >= 0 ? originalIdx + 1 : 1);
              const isEssay = isQuestionEssay(q);
              const isCorrect = isQuestionCorrect(q);

              return (
                <div
                  key={q.id || `q-${questionNumber}`}
                  className={cn(
                    "p-6 sm:p-7 rounded-2xl border transition-all space-y-5 bg-white dark:bg-[#1A1D27] shadow-xs",
                    isEssay
                      ? "border-gray-200/90 dark:border-gray-800 border-l-4 border-l-purple-500"
                      : isCorrect
                      ? "border-gray-200/90 dark:border-gray-800 border-l-4 border-l-emerald-500"
                      : "border-gray-200/90 dark:border-gray-800 border-l-4 border-l-rose-500"
                  )}
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800/80 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs border border-gray-200/80 dark:border-gray-700">
                        {questionNumber}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {isEssay ? "Questão Dissertativa" : "Múltipla Escolha"}
                      </span>
                    </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const single: ErrorQuestionInput = {
                          text: q.text,
                          options: q.options,
                          userAnswer: q.userAnswer,
                          correctAnswer: q.answer,
                          explanation: q.explanation || q.essayFeedback,
                          imageUrl: q.imageUrl,
                          imageCaption: q.imageCaption,
                          subject: simulado.title,
                          origin: "simulado",
                          originTitle: simulado.title,
                          questionId: String(q.id),
                        };
                        setSelectedErrorQuestions([single]);
                        setIsCadernoModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/50 text-xs font-semibold border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
                      title="Salvar no Caderno de Erros"
                    >
                      <BookX size={12} />
                      <span>+ Caderno</span>
                    </button>

                    {isEssay ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800/60">
                        <PenTool size={12} />
                        <span>Nota: {q.essayScore?.toFixed(1) || "0.0"} / 10.0</span>
                      </span>
                    ) : isCorrect ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
                        <Check size={13} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                        <span>Acertou</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800/60">
                        <X size={13} className="text-rose-600 dark:text-rose-400 stroke-[3]" />
                        <span>Errou</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Statement */}
                <div className="text-[15px] sm:text-base text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                  {q.text}
                </div>

                {/* Histological Slide / Tissue Image */}
                {q.imageUrl && (
                  <div className="my-3.5">
                    <div className="inline-block relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-black/5 dark:bg-black/20 max-w-2xl">
                      <img
                        src={q.imageUrl}
                        alt={q.imageCaption || "Lâmina Histológica"}
                        className="max-h-88 w-auto object-contain rounded-2xl"
                      />
                      {q.imageCaption && (
                        <div className="p-2.5 text-xs text-gray-600 dark:text-gray-300 bg-white/95 dark:bg-[#12141c]/95 border-t border-gray-100 dark:border-gray-800 font-medium">
                          {q.imageCaption}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Multiple Choice Alternatives Review */}
                {!isEssay && q.options && (
                  <div className="space-y-2.5 pt-1">
                    {q.options.map((opt) => {
                      const isStudentChoice =
                        q.userAnswer?.toLowerCase() === opt.id.toLowerCase();
                      const isCorrectOption =
                        q.answer?.toLowerCase() === opt.id.toLowerCase();

                      let cardStyle =
                        "border-gray-200/80 dark:border-gray-800 bg-gray-50/40 dark:bg-[#12141C]/40 text-gray-700 dark:text-gray-300";
                      let badgeStyle =
                        "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700";

                      if (isCorrectOption) {
                        cardStyle =
                          "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/25 text-emerald-950 dark:text-emerald-100 font-medium ring-1 ring-emerald-500/20 shadow-2xs";
                        badgeStyle = "bg-emerald-600 text-white border-emerald-600";
                      } else if (isStudentChoice && !isCorrect) {
                        cardStyle =
                          "border-rose-400/80 bg-rose-50/50 dark:bg-rose-950/25 text-rose-950 dark:text-rose-100 font-medium ring-1 ring-rose-500/20 shadow-2xs";
                        badgeStyle = "bg-rose-600 text-white border-rose-600";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "w-full flex items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border text-sm transition-all gap-3.5",
                            cardStyle
                          )}
                        >
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 border mt-0.5 sm:mt-0 shadow-2xs",
                                badgeStyle
                              )}
                            >
                              {opt.id.toUpperCase()}
                            </span>
                            <span className="leading-relaxed">{opt.text}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isCorrectOption && isStudentChoice && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Gabarito Oficial • Sua Escolha</span>
                              </span>
                            )}
                            {isCorrectOption && !isStudentChoice && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300/80 dark:border-emerald-700/50 shadow-2xs">
                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Gabarito Oficial</span>
                              </span>
                            )}
                            {isStudentChoice && !isCorrectOption && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-700/60 shadow-2xs">
                                <XCircle size={14} className="text-rose-600 dark:text-rose-400" />
                                <span>Sua Escolha</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dissertative Answer Review */}
                {isEssay && (
                  <div className="space-y-3 pt-1">
                    {/* Student Response */}
                    <div className="p-4 rounded-xl bg-gray-50/60 dark:bg-[#0F1117]/80 border border-gray-200/80 dark:border-gray-800">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Sua Resposta Redigida:
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {q.userAnswer?.trim() || "(Questão deixada em branco)"}
                      </p>
                    </div>

                    {/* AI Feedback */}
                    {q.essayFeedback && (
                      <div className="p-4 sm:p-5 rounded-xl bg-purple-50/50 dark:bg-purple-950/25 border border-purple-200/80 dark:border-purple-900/40 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                          <Sparkles size={14} />
                          <span>Parecer e Correção da Banca Examinadora:</span>
                        </div>
                        <p className="text-sm text-purple-900 dark:text-purple-200 leading-relaxed font-normal">
                          {q.essayFeedback}
                        </p>
                      </div>
                    )}

                    {/* Expected Answer (Espelho Oficial) */}
                    <div className="p-4 sm:p-5 rounded-xl bg-blue-50/50 dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-900/40 space-y-1.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                        Espelho de Correção Oficial (Critérios Esperados):
                      </div>
                      <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap leading-relaxed font-normal">
                        {q.answer}
                      </p>
                    </div>
                  </div>
                )}

                {/* Explanation / Justification */}
                {q.explanation && (
                  <div className="p-4 sm:p-5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                      <Lightbulb size={14} className="text-amber-500 shrink-0" />
                      <span>Comentário & Resolução Comentada</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                      {cleanExplanationText(q.explanation)}
                    </p>
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </div>

      {/* Revision Flashcards Modal */}
      {isFlashcardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1D27] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-gray-200 dark:border-[#2a2d3a] shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsFlashcardModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>

            {!isCreatedSuccess ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Criar Flashcards de Revisão
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Converta as questões deste simulado em cartões de estudo memoráveis.
                    </p>
                  </div>
                </div>

                {/* Scope selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Selecione quais questões incluir:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option 1: Errors only */}
                    <button
                      type="button"
                      disabled={wrongQuestionsCount === 0}
                      onClick={() => setFlashcardScope("errors")}
                      className={cn(
                        "flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative",
                        flashcardScope === "errors"
                          ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 shadow-xs ring-2 ring-purple-500/20"
                          : "border-gray-200 dark:border-[#2a2d3a] hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-300",
                        wrongQuestionsCount === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <XCircle size={14} className="text-rose-500" />
                          Apenas as que Errei
                        </span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                          {wrongQuestionsCount}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {wrongQuestionsCount > 0
                          ? "Foque cirurgicamente nas dúvidas e pontos fracos da prova."
                          : "Parabéns! Você não cometeu nenhum erro neste simulado."}
                      </p>
                    </button>

                    {/* Option 2: All questions */}
                    <button
                      type="button"
                      onClick={() => setFlashcardScope("all")}
                      className={cn(
                        "flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative",
                        flashcardScope === "all"
                          ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 shadow-xs ring-2 ring-purple-500/20"
                          : "border-gray-200 dark:border-[#2a2d3a] hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Layers size={14} className="text-purple-500" />
                          Todas as Questões
                        </span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                          {totalQuestionsCount}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Revise todo o conteúdo e fundamentação da prova completa.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Deck name input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Nome do Baralho de Flashcards:
                  </label>
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder="Ex: Revisão - Simulado Bioquímica"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-start gap-2.5 text-xs text-purple-800 dark:text-purple-300">
                  <Sparkles size={16} className="flex-shrink-0 mt-0.5" />
                  <p>
                    Os flashcards conterão o enunciado na frente e a resposta correta comentada com a fundamentação teórica no verso. Ficarão salvos na aba <strong>Flashcards</strong>.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-[#2a2d3a]">
                  <button
                    type="button"
                    onClick={() => setIsFlashcardModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateFlashcards}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <Layers size={15} />
                    <span>Gerar Baralho ({flashcardScope === "errors" ? wrongQuestionsCount : totalQuestionsCount} cartões)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Check size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Baralho Criado com Sucesso!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                    {createdCardCount} flashcard(s) foram salvos e adicionados à sua aba <strong>Flashcards</strong>. Você pode estudá-los quando quiser!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsFlashcardModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Continuar no Gabarito
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFlashcardModalOpen(false);
                      router.push("/flashcards");
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FolderOpen size={15} />
                    <span>Ir para a Aba Flashcards</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Caderno de Erros Modal */}
      <AddErrorModal
        isOpen={isCadernoModalOpen}
        onClose={() => setIsCadernoModalOpen(false)}
        questions={selectedErrorQuestions}
      />
    </div>
  );
}
