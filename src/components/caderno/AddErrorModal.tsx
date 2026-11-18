"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  BookX,
  Folder,
  Tag,
  AlertTriangle,
  Lightbulb,
  Crosshair,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  useAppStore,
  CadernoErrorItem,
  CausaErroTipo,
} from "@/stores/useAppStore";
import toast from "react-hot-toast";

export interface ErrorQuestionInput {
  text: string;
  options?: Array<{ id: string; text: string }>;
  userAnswer?: string;
  correctAnswer: string;
  explanation?: string;
  imageUrl?: string;
  imageCaption?: string;
  subject?: string;
  origin: "question" | "simulado" | "manual";
  originTitle?: string;
  questionId?: string;
}

interface AddErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ErrorQuestionInput[]; // Can be single or multiple
  defaultFolderId?: string;
  onSuccess?: () => void;
}

const CAUSAS: Array<{ id: CausaErroTipo; label: string; desc: string }> = [
  {
    id: "conceitual",
    label: "Conceitual",
    desc: "Não dominava a base teórica ou fisiopatologia",
  },
  {
    id: "pegadinha",
    label: "Pegadinha / Distrator",
    desc: "Caiu no distrator atraente ou armadilha de banca",
  },
  {
    id: "interpretacao",
    label: "Interpretação",
    desc: "Erro ao interpretar dados do caso clínico / enunciado",
  },
  {
    id: "detalhe_conduta",
    label: "Detalhe de Conduta",
    desc: "Faltou detalhe fino de diretriz, dose ou conduta",
  },
  {
    id: "falta_atencao",
    label: "Falta de Atenção",
    desc: "Desatenção ao comando (ex: incorreta, exceto)",
  },
];

export default function AddErrorModal({
  isOpen,
  onClose,
  questions,
  defaultFolderId,
  onSuccess,
}: AddErrorModalProps) {
  const { cadernoFolders, addCadernoError, batchAddCadernoErrors } =
    useAppStore();

  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    defaultFolderId || cadernoFolders[0]?.id || "caderno-geral"
  );

  // Form state for single item editing
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active question index if multiple
  const [currentIdx, setCurrentIdx] = useState(0);

  // Editable fields for the active question
  const [pontoCego, setPontoCego] = useState("");
  const [pegadinhaDistrator, setPegadinhaDistrator] = useState("");
  const [gatilhoMemoria, setGatilhoMemoria] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [subtema, setSubtema] = useState("");
  const [referenciaFonte, setReferenciaFonte] = useState("");
  const [causaErro, setCausaErro] = useState<CausaErroTipo>("conceitual");
  const [userNotes, setUserNotes] = useState("");
  const [priority, setPriority] = useState<"alta" | "media" | "baixa">("alta");

  // Batch progress state
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const activeQuestion = questions[currentIdx];

  // Auto analyze active single question with AI on open
  useEffect(() => {
    if (!isOpen || !activeQuestion) return;

    let isMounted = true;

    async function analyze() {
      setIsAnalyzing(true);
      try {
        const res = await fetch("/api/ai/analyze-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: activeQuestion.text,
            options: activeQuestion.options,
            userAnswer: activeQuestion.userAnswer,
            correctAnswer: activeQuestion.correctAnswer,
            explanation: activeQuestion.explanation,
            subject: activeQuestion.subject || activeQuestion.originTitle,
          }),
        });

        if (!res.ok) throw new Error("Erro na resposta da IA");
        const data = await res.json();

        if (isMounted) {
          setPontoCego(data.pontoCego || "");
          setPegadinhaDistrator(data.pegadinhaDistrator || "");
          setGatilhoMemoria(data.gatilhoMemoria || "");
          setEspecialidade(
            data.especialidade || activeQuestion.subject || "Medicina"
          );
          setSubtema(data.subtema || "Geral");
          setReferenciaFonte(
            data.referenciaFonte ||
              activeQuestion.originTitle ||
              "Simulado / Questões"
          );
          if (data.causaErro && CAUSAS.some((c) => c.id === data.causaErro)) {
            setCausaErro(data.causaErro);
          }
        }
      } catch (err) {
        console.warn("Análise AI offline ou falhou, preenchendo padrão:", err);
        if (isMounted) {
          setPontoCego(
            activeQuestion.explanation
              ? `Revisar justificativa da resposta: ${activeQuestion.correctAnswer}`
              : "Revisar conceito fundamental da questão."
          );
          setPegadinhaDistrator(
            `A alternativa escolhida (${activeQuestion.userAnswer || "?"}) desviou do foco central.`
          );
          setGatilhoMemoria(
            `Focar no gabarito oficial: ${activeQuestion.correctAnswer}`
          );
          setEspecialidade(activeQuestion.subject || "Medicina");
          setSubtema("Geral");
          setReferenciaFonte(activeQuestion.originTitle || "Questões");
        }
      } finally {
        if (isMounted) setIsAnalyzing(false);
      }
    }

    // Only auto-trigger if fields are empty
    if (!pontoCego) {
      analyze();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentIdx, activeQuestion]);

  if (!isOpen || !questions.length) return null;

  // Save current single card
  const handleSaveSingle = () => {
    // Ponto cego, pegadinha e gatilho de memória são opcionais no salvamento
    // e podem ser editados depois diretamente no Caderno de Erros.
    const finalPontoCego =
      pontoCego.trim() ||
      (activeQuestion.explanation
        ? "Revisar justificativa e conceito da questão."
        : activeQuestion.text
        ? `Revisar conceito da questão (${especialidade.trim() || "Geral"})`
        : "Ponto cego a detalhar (edite quando quiser)");

    const newItem: CadernoErrorItem = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      folderId: selectedFolderId,
      origin: activeQuestion.origin,
      originTitle: activeQuestion.originTitle,
      questionId: activeQuestion.questionId,
      originalQuestion: {
        text: activeQuestion.text,
        options: activeQuestion.options,
        userAnswer: activeQuestion.userAnswer,
        correctAnswer: activeQuestion.correctAnswer,
        explanation: activeQuestion.explanation,
        imageUrl: activeQuestion.imageUrl,
        imageCaption: activeQuestion.imageCaption,
      },
      pontoCego: finalPontoCego,
      pegadinhaDistrator: pegadinhaDistrator.trim() || "",
      gatilhoMemoria: gatilhoMemoria.trim() || "",
      especialidade: especialidade.trim() || "Medicina",
      subtema: subtema.trim() || "Geral",
      referenciaFonte: referenciaFonte.trim() || "Simulado",
      causaErro,
      userNotes: userNotes.trim() || undefined,
      status: "pendente",
      priority,
      revisoesCount: 0,
      createdAt: new Date().toISOString(),
    };

    addCadernoError(newItem);
    toast.success("Erro catalogado com sucesso no Caderno de Erros!");

    // If more questions in list, go to next
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      // Reset form fields
      setPontoCego("");
      setPegadinhaDistrator("");
      setGatilhoMemoria("");
      setEspecialidade("");
      setSubtema("");
      setUserNotes("");
    } else {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  // Batch auto-save all questions with AI
  const handleBatchSaveAll = async () => {
    setIsSaving(true);
    setBatchProgress({ current: 0, total: questions.length });

    const generatedItems: CadernoErrorItem[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setBatchProgress({ current: i + 1, total: questions.length });

      let cardData: any = null;
      try {
        const res = await fetch("/api/ai/analyze-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: q.text,
            options: q.options,
            userAnswer: q.userAnswer,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            subject: q.subject || q.originTitle,
          }),
        });
        if (res.ok) {
          cardData = await res.json();
        }
      } catch (e) {
        // Fallback
      }

      generatedItems.push({
        id: `err-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        folderId: selectedFolderId,
        origin: q.origin,
        originTitle: q.originTitle,
        questionId: q.questionId,
        originalQuestion: {
          text: q.text,
          options: q.options,
          userAnswer: q.userAnswer,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          imageUrl: q.imageUrl,
          imageCaption: q.imageCaption,
        },
        pontoCego:
          cardData?.pontoCego ||
          (q.explanation
            ? `Revisar fundamentação: ${q.correctAnswer}`
            : "Revisar conceito base da questão."),
        pegadinhaDistrator:
          cardData?.pegadinhaDistrator ||
          `Distrator atraente marcou a opção incorreta.`,
        gatilhoMemoria:
          cardData?.gatilhoMemoria ||
          `Fixar resposta correta: ${q.correctAnswer}`,
        especialidade:
          cardData?.especialidade || q.subject || "Medicina",
        subtema: cardData?.subtema || "Geral",
        referenciaFonte:
          cardData?.referenciaFonte || q.originTitle || "Simulado",
        causaErro: cardData?.causaErro || "conceitual",
        status: "pendente",
        priority: "alta",
        revisoesCount: 0,
        createdAt: new Date().toISOString(),
      });
    }

    batchAddCadernoErrors(generatedItems);
    setIsSaving(false);
    setBatchProgress(null);
    toast.success(
      `${generatedItems.length} erros dissecados e salvos no Caderno de Erros!`
    );
    if (onSuccess) onSuccess();
    onClose();
  };

  const isMultiple = questions.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget && !batchProgress) {
          onClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1A1D27] rounded-3xl p-5 sm:p-7 max-w-2xl w-full border border-gray-200 dark:border-[#2a2d3a] shadow-2xl relative my-auto max-h-[92vh] flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#2a2d3a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <BookX size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Registrar no Caderno de Erros</span>
                {isAnalyzing && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
                    <Loader2 size={11} className="animate-spin" />
                    <span>IA Dissecando Erro...</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isMultiple
                  ? `Item ${currentIdx + 1} de ${questions.length} • Engenharia reversa estruturada para retenção`
                  : "Engenharia reversa com Ponto Cego, Pegadinha e Gatilho de Memória"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Batch Quick Action Bar */}
        {isMultiple && (
          <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-purple-900 dark:text-purple-300">
                {questions.length} questões com erro detectadas.
              </span>
              <p className="text-purple-700 dark:text-purple-400">
                Você pode revisar uma a uma ou catalogar todas com IA automaticamente.
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleBatchSaveAll}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>
                    Processando ({batchProgress?.current}/{batchProgress?.total})...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Salvar Todas ({questions.length}) com IA</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Scrollable Body Form */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Target Folder & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Folder size={14} className="text-blue-500" />
                <span>Deck / Pasta de Destino:</span>
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-gray-50/70 dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cadernoFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Tag size={14} className="text-amber-500" />
                <span>Prioridade de Revisão:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["alta", "media", "baixa"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer capitalize ${
                      priority === p
                        ? p === "alta"
                          ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                          : p === "media"
                          ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                          : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-gray-50 dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2d3a]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Original Question Preview Header (Collapsible preview) */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0F1117] border border-gray-200/80 dark:border-gray-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Enunciado Original
            </div>
            <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2">
              {activeQuestion.text}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] font-semibold text-gray-500">
              {activeQuestion.userAnswer && (
                <span className="text-rose-600 dark:text-rose-400">
                  Marcada: {activeQuestion.userAnswer}
                </span>
              )}
              <span className="text-emerald-600 dark:text-emerald-400">
                Gabarito: {activeQuestion.correctAnswer}
              </span>
            </div>
          </div>

          {/* 1. O Ponto Cego (Core Concept) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <Crosshair size={14} />
                <span>O Ponto Cego (Core Concept)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                (Opcional — pode salvar e editar depois no Caderno)
              </span>
            </label>
            <textarea
              value={pontoCego}
              onChange={(e) => setPontoCego(e.target.value)}
              rows={2}
              placeholder="O que exatamente você errou ou não dominava? (Opcional — preencha agora ou edite depois no Caderno)"
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
            />
          </div>

          {/* 2. A Pegadinha / Distrator */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={14} />
                <span>A Pegadinha / Distrator</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                O que tornou a errada atraente ou te fez descartar a certa?
              </span>
            </label>
            <textarea
              value={pegadinhaDistrator}
              onChange={(e) => setPegadinhaDistrator(e.target.value)}
              rows={2}
              placeholder="Ex: A menção de troponina discretamente positiva induziu ao erro de conduta coronariana imediata..."
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          {/* 3. Gatilho de Memória (Regra de Bolso) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Lightbulb size={14} />
                <span>Gatilho de Memória (Regra de Bolso)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                Frase curta de fixação instantânea
              </span>
            </label>
            <input
              type="text"
              value={gatilhoMemoria}
              onChange={(e) => setGatilhoMemoria(e.target.value)}
              placeholder="Ex: Supra de ST difuso com concavidade para cima + infra de PR = Pericardite Aguda"
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* 4. Especialidade, Subtema e Fonte */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                Especialidade:
              </label>
              <input
                type="text"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                placeholder="Ex: Cardiologia"
                className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                Subtema:
              </label>
              <input
                type="text"
                value={subtema}
                onChange={(e) => setSubtema(e.target.value)}
                placeholder="Ex: Pericardite Aguda"
                className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                Fonte / Prova:
              </label>
              <input
                type="text"
                value={referenciaFonte}
                onChange={(e) => setReferenciaFonte(e.target.value)}
                placeholder="Ex: Simulado Módulo 4"
                className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 5. Causa do Erro */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
              Causa Primária do Erro (para métricas e gráficos):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CAUSAS.map((c) => {
                const isSelected = causaErro === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCausaErro(c.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-900 border-blue-400 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 ring-1 ring-blue-500/20"
                        : "bg-gray-50/60 dark:bg-[#0F1117] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#2a2d3a] hover:bg-gray-100"
                    }`}
                  >
                    <div className="font-bold text-xs">{c.label}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                      {c.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Minhas Anotações */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <FileText size={14} className="text-purple-500" />
              <span>Minhas Anotações Pessoais:</span>
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={2}
              placeholder="Adicione suas próprias notas, macetes pessoais ou dúvidas para perguntar na tutoria..."
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-gray-100 dark:border-[#2a2d3a] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSingle}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={14} />
              <span>
                {isMultiple
                  ? `Salvar e Ir para Próximo (${currentIdx + 1}/${questions.length})`
                  : "Salvar no Caderno de Erros"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
