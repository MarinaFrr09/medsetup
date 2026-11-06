"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Sparkles,
  Clock,
  Award,
  BookOpen,
  RotateCcw,
  Trash2,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useAppStore, SimuladoExam } from "@/stores/useAppStore";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CreateSimuladoModal = dynamic(() => import("@/components/simulados/CreateSimuladoModal"), { ssr: false });
const SimuladoExamView = dynamic(() => import("@/components/simulados/SimuladoExamView"), { ssr: false });
const SimuladoAnhembiView = dynamic(() => import("@/components/simulados/SimuladoAnhembiView"), { ssr: false });
const SimuladoCorrectionView = dynamic(() => import("@/components/simulados/SimuladoCorrectionView"), { ssr: false });

export default function SimuladosPage() {
  const { simulados, addSimulado, updateSimulado, deleteSimulado } = useAppStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeExam, setActiveExam] = useState<SimuladoExam | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "exam_medsetup" | "exam_studyflow" | "exam_anhembi" | "correction">("list");
  const [selectedExamForHub, setSelectedExamForHub] = useState<SimuladoExam | null>(null);
  const [isHubModalOpen, setIsHubModalOpen] = useState(false);
  const [isRetakeModalOpen, setIsRetakeModalOpen] = useState(false);
  const [retakeExamData, setRetakeExamData] = useState<SimuladoExam | null>(null);

  // Format seconds into minutes and seconds
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  // Metrics
  const completedExams = simulados.filter((s) => s.status === "completed");
  const averageScore =
    completedExams.length > 0
      ? Math.round(
          (completedExams.reduce((acc, s) => acc + (s.score || 0), 0) /
            completedExams.length) *
            10
        ) / 10
      : 0;

  const passedExams = completedExams.filter((s) => (s.score || 0) >= 7.0).length;
  const passRate =
    completedExams.length > 0
      ? Math.round((passedExams / completedExams.length) * 100)
      : 0;

  const totalQuestionsSolved = completedExams.reduce(
    (acc, s) => acc + (s.totalQuestions || 0),
    0
  );

  const openExamHub = (exam: SimuladoExam) => {
    setSelectedExamForHub(exam);
    setIsHubModalOpen(true);
  };

  const handleStartExamWithLayout = (layout: "anhembi" | "medsetup" | "studyflow") => {
    if (!selectedExamForHub) return;
    setActiveExam(selectedExamForHub);
    setIsHubModalOpen(false);
    setViewMode(layout === "anhembi" ? "exam_anhembi" : "exam_medsetup");
  };

  const handleSimuladoCreated = (newExam: SimuladoExam) => {
    addSimulado(newExam);
    openExamHub(newExam);
  };

  const handleFinishExam = (completed: SimuladoExam) => {
    updateSimulado(completed);
    setActiveExam(completed);
    setViewMode("correction");
  };

  const handleOpenCorrection = (exam: SimuladoExam) => {
    setActiveExam(exam);
    setViewMode("correction");
  };

  const handleRetakeExam = (exam: SimuladoExam) => {
    // Reset answers
    const resetQuestions = exam.questions.map((q) => ({
      ...q,
      userAnswer: undefined,
      isCorrect: undefined,
      essayScore: undefined,
      essayFeedback: undefined,
    }));

    const retake: SimuladoExam = {
      ...exam,
      id: Date.now().toString(),
      status: "in_progress",
      score: undefined,
      correctCount: undefined,
      timeSpentSeconds: 0,
      completedAt: undefined,
      questions: resetQuestions,
    };

    addSimulado(retake);
    setRetakeExamData(retake);
    setSelectedExamForHub(retake);
    setIsRetakeModalOpen(true);
    toast.success("Simulado reiniciado! Uma nova tentativa foi criada.");
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSimulado(id);
    toast.success("Simulado movido para a lixeira.");
  };

  const renderRetakeNoticeModal = () => {
    if (!isRetakeModalOpen || !retakeExamData) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#1A1D27] p-6 sm:p-7 shadow-2xl border border-gray-200 dark:border-[#2a2d3a] text-gray-900 dark:text-white overflow-hidden space-y-5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Icon */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0 shadow-xs">
                <RotateCcw size={24} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <CheckCircle2 size={12} />
                  <span>Nova Tentativa Pronta</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                  Simulado Reiniciado!
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsRetakeModalOpen(false);
                setViewMode("list");
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Informative description box */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0F1117]/60 border border-gray-200 dark:border-[#2a2d3a] space-y-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {retakeExamData.title}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-gray-200 dark:border-[#2a2d3a]">
              <div>
                <span className="text-gray-400">Disciplina:</span>{" "}
                <strong className="text-gray-800 dark:text-gray-200">{retakeExamData.subject || "Geral"}</strong>
              </div>
              <div>
                <span className="text-gray-400">Questões:</span>{" "}
                <strong className="text-gray-800 dark:text-gray-200">{retakeExamData.totalQuestions} itens</strong>
              </div>
            </div>
            <p className="text-[11.5px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
              ✓ Todas as alternativas marcadas e o tempo foram zerados para você refazer do zero. A sua tentativa anterior continua salva com segurança no histórico.
            </p>
          </div>

          {/* Selection of layout to start right away */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Como deseja fazer a nova tentativa?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveExam(retakeExamData);
                  setIsRetakeModalOpen(false);
                  setViewMode("exam_anhembi");
                }}
                className="p-3.5 rounded-xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wider">
                    ANHEMBI
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Oficial</span>
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  Iniciar Modelo Anhembi
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveExam(retakeExamData);
                  setIsRetakeModalOpen(false);
                  setViewMode("exam_studyflow");
                }}
                className="p-3.5 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] hover:border-purple-400 dark:hover:border-purple-500 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wider">
                    MEDSETUP
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Moderno</span>
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                  Iniciar Modelo MedSetup
                </div>
              </button>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="pt-1 flex items-center justify-between border-t border-gray-100 dark:border-[#2a2d3a]">
            <button
              type="button"
              onClick={() => {
                setIsRetakeModalOpen(false);
                setViewMode("list");
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Voltar ao Histórico
            </button>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Tentativa pronta para iniciar
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render active exam - Anhembi Layout
  if (viewMode === "exam_anhembi" && activeExam) {
    return (
      <SimuladoAnhembiView
        simulado={activeExam}
        onFinishExam={handleFinishExam}
        onExit={() => setViewMode("list")}
      />
    );
  }

  // Render active exam - MedSetup Layout
  if ((viewMode === "exam_medsetup" || viewMode === "exam_studyflow") && activeExam) {
    return (
      <SimuladoExamView
        simulado={activeExam}
        onFinishExam={handleFinishExam}
        onExit={() => setViewMode("list")}
      />
    );
  }

  // Render correction report
  if (viewMode === "correction" && activeExam) {
    return (
      <>
        <SimuladoCorrectionView
          simulado={activeExam}
          onRetakeExam={() => handleRetakeExam(activeExam)}
          onBackToList={() => setViewMode("list")}
        />
        {renderRetakeNoticeModal()}
      </>
    );
  }

  return (
    <div className="w-full space-y-8 pb-16">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <ClipboardCheck className="text-blue-600 dark:text-blue-400" />
            <span>Simulados Universitários</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs sm:text-sm">
            Provas com cronômetro, questões dissertativas e correção detalhada por IA com espelho oficial
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Sparkles size={16} />
          <span>Criar Simulado com IA</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Realizados */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Provas Realizadas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <ClipboardCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {completedExams.length}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {simulados.length} cadastradas no total
            </div>
          </div>
        </div>

        {/* Card 2: Média Geral */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Média Geral de Notas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-3xl font-extrabold",
                  averageScore >= 7.0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : averageScore >= 5.0
                    ? "text-amber-600 dark:text-amber-400"
                    : completedExams.length === 0
                    ? "text-gray-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {completedExams.length > 0 ? averageScore.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-gray-400 font-bold">/ 10.0</span>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Meta acadêmica: 7.0
            </div>
          </div>
        </div>

        {/* Card 3: Taxa de Aprovação */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Taxa de Aprovação
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {completedExams.length > 0 ? `${passRate}%` : "—"}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {passedExams} de {completedExams.length} provas acima de 7.0
            </div>
          </div>
        </div>

        {/* Card 4: Questões Resolvidas */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-[#2a2d3a] dark:bg-[#1A1D27] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Questões Respondidas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <BookOpen size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {totalQuestionsSolved}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              múltipla escolha e dissertativas
            </div>
          </div>
        </div>
      </div>

      {/* Main List of Simulados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#2a2d3a] pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Histórico de Simulados
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Acesse qualquer prova para ver a correção completa ou refazê-la
            </p>
          </div>
        </div>

        {simulados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {simulados.map((exam) => {
              const isDone = exam.status === "completed";
              return (
                <div
                  key={exam.id}
                  onClick={() => (isDone ? handleOpenCorrection(exam) : openExamHub(exam))}
                  className="group relative p-5 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] hover:border-blue-400 dark:hover:border-blue-500 shadow-xs transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        {exam.subject || "Medicina Geral"}
                      </span>

                      <div className="flex items-center gap-1">
                        {isDone && (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-xs font-bold",
                              (exam.score || 0) >= 7.0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : (exam.score || 0) >= 5.0
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            )}
                          >
                            Nota {exam.score?.toFixed(1) || "0.0"}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, exam.id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Excluir simulado"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {exam.title}
                    </h3>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 dark:border-[#2a2d3a] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>{exam.totalQuestions} questões</span>
                      <span>•</span>
                      <span>{exam.date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveExam(exam);
                            setViewMode("exam_anhembi");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-[#0052CC] dark:text-blue-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-blue-200/60 dark:border-blue-900/40 shadow-2xs"
                          title="Abrir diretamente na tela exclusiva estilo Simulado Anhembi"
                        >
                          <span>Estilo Anhembi</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                        <span>{isDone ? "Ver Gabarito" : "Opções"}</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-gray-50/50 dark:bg-[#1A1D27]/30 rounded-3xl border border-dashed border-gray-200 dark:border-[#2a2d3a]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mx-auto mb-3">
              <ClipboardCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Nenhum simulado realizado ainda
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto mb-5 leading-relaxed">
              Crie seu primeiro simulado com questões de múltipla escolha e dissertativas no formato exato da sua faculdade.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Criar Primeiro Simulado</span>
            </button>
          </div>
        )}
      </div>

      <CreateSimuladoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSimuladoCreated={handleSimuladoCreated}
      />

      {/* EXAM LAYOUT SELECTION HUB MODAL */}
      {isHubModalOpen && selectedExamForHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-[#2a2d3a] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Hub de Execução de Prova
                </span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  Como você deseja realizar este simulado?
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedExamForHub.title} • {selectedExamForHub.totalQuestions} questões
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsHubModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* TWO CHOICES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Prova estilo Anhembi (Tela Exclusiva) */}
              <div
                onClick={() => handleStartExamWithLayout("anhembi")}
                className="p-5 rounded-2xl border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-[#0052CC] text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider">
                      ANHEMBI
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900 shadow-2xs">
                      Tela Exclusiva
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    Abrir Prova estilo Simulado Anhembi
                  </h3>

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                    Tela exclusiva focada na prova: questão no topo com espaçamento flexível, grade geral de respostas no rodapé e cronômetro no padrão oficial da universidade.
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleStartExamWithLayout("anhembi"); }}
                    className="w-full py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    Iniciar Prova estilo Anhembi
                  </button>
                </div>
              </div>

              {/* Option 2: MedSetup Layout */}
              <div
                onClick={() => handleStartExamWithLayout("medsetup")}
                className="p-5 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider">
                      MEDSETUP
                    </span>
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-900">
                      Moderno
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                    Abrir Prova (MedSetup)
                  </h3>

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                    Layout limpo e balanceado do sistema, design proporcional, modo escuro nativo, atalhos de teclado e cronômetro integrado.
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleStartExamWithLayout("medsetup"); }}
                    className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-[#2a2d3a] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Abrir Prova
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retake notice modal */}
      {renderRetakeNoticeModal()}
    </div>
  );
}
