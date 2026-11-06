"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Crosshair,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Trash2,
  BookOpen,
  Edit3,
  Layers,
  Sparkles,
  RotateCcw,
  Tag,
  Clock,
  Check,
  Save,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { CadernoErrorItem, CausaErroTipo, useAppStore } from "@/stores/useAppStore";
import { renderFormattedText } from "@/lib/questionUtils";
import toast from "react-hot-toast";

const CAUSA_LABELS: Record<
  CausaErroTipo,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  conceitual: {
    label: "Conceitual",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  pegadinha: {
    label: "Pegadinha / Distrator",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  interpretacao: {
    label: "Interpretação",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
    dot: "bg-purple-500",
  },
  detalhe_conduta: {
    label: "Detalhe de Conduta",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  falta_atencao: {
    label: "Falta de Atenção",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
};

interface ErrorDetailModalProps {
  error: CadernoErrorItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleDominado: (error: CadernoErrorItem) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateAnalysis?: (
    id: string,
    updates: {
      pontoCego: string;
      pegadinhaDistrator: string;
      gatilhoMemoria: string;
    }
  ) => void;
}

export default function ErrorDetailModal({
  error,
  isOpen,
  onClose,
  onToggleDominado,
  onDelete,
  onUpdateNotes,
  onUpdateAnalysis,
}: ErrorDetailModalProps) {
  const { addDeck } = useAppStore();
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Editable analysis fields
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [pontoCegoEdit, setPontoCegoEdit] = useState("");
  const [pegadinhaEdit, setPegadinhaEdit] = useState("");
  const [gatilhoEdit, setGatilhoEdit] = useState("");

  useEffect(() => {
    if (error) {
      setNotes(error.userNotes || "");
      setIsEditingNotes(false);
      setPontoCegoEdit(error.pontoCego || "");
      setPegadinhaEdit(error.pegadinhaDistrator || "");
      setGatilhoEdit(error.gatilhoMemoria || "");
      setIsEditingAnalysis(false);
    }
  }, [error]);

  if (!isOpen || !error) return null;

  const causaInfo = CAUSA_LABELS[error.causaErro] || CAUSA_LABELS.conceitual;
  const isDominado = error.status === "dominado";

  const handleSaveNotes = () => {
    onUpdateNotes(error.id, notes);
    setIsEditingNotes(false);
    toast.success("Anotação pessoal salva com sucesso!");
  };

  const handleSaveAnalysis = () => {
    if (onUpdateAnalysis && error) {
      onUpdateAnalysis(error.id, {
        pontoCego: pontoCegoEdit.trim() || error.pontoCego,
        pegadinhaDistrator: pegadinhaEdit.trim(),
        gatilhoMemoria: gatilhoEdit.trim(),
      });
      setIsEditingAnalysis(false);
      toast.success("Diagnóstico atualizado com sucesso!");
    }
  };

  const handleCreateFlashcard = () => {
    const subjectName = (error.especialidade || error.subtema || "Caderno de Erros").trim();
    const folder = useAppStore.getState().getOrCreateFolder(subjectName, "both");

    const deckId = `deck_erro_${Date.now()}`;
    const newDeck = {
      id: deckId,
      name: `${error.subtema || subjectName} (Caderno de Erros)`,
      description: `Flashcard focado no ponto cego e regra de bolso de ${error.especialidade} - ${error.subtema}.`,
      subject: subjectName,
      folderId: folder.id,
      cardCount: 1,
      cards: [
        {
          id: `card_erro_${Date.now()}`,
          front: `[${error.especialidade} • ${error.subtema}]\n\n${error.pontoCego}`,
          back: `🎯 REGRA DE BOLSO:\n${error.gatilhoMemoria}\n\n⚠️ DISTRATOR:\n${error.pegadinhaDistrator}`,
        },
      ],
    };
    addDeck(newDeck);
    toast.success(`Deck de flashcard criado na pasta "${folder.name}" em Flashcards!`, { icon: "🗂️" });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#1A1D27] rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-150"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#12141c]">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {error.especialidade} • {error.subtema}
              </span>

              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${causaInfo.bg} ${causaInfo.color} ${causaInfo.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${causaInfo.dot}`} />
                <span>{causaInfo.label}</span>
              </span>

              {error.priority === "alta" && (
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                  Prioridade Alta
                </span>
              )}

              {error.referenciaFonte && (
                <span className="text-xs text-gray-400">
                  Fonte: <strong>{error.referenciaFonte}</strong>
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white leading-snug">
              Análise do Erro: {error.subtema}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleDominado(error)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isDominado
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gray-200 dark:bg-gray-800 hover:bg-emerald-500 hover:text-white text-gray-700 dark:text-gray-300"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>{isDominado ? "Dominado" : "Marcar como Dominado"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* 5. QUESTÃO ORIGINAL & GABARITO COMPLETO */}
          {error.originalQuestion && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141c] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <BookOpen size={16} className="text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Questão Original & Gabarito Comentado
                </h3>
              </div>

              {/* Enunciado */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 text-xs sm:text-sm text-gray-900 dark:text-white leading-relaxed">
                {renderFormattedText(error.originalQuestion.text)}
              </div>

              {/* Imagem da questão se houver */}
              {error.originalQuestion.imageUrl && (
                <div className="p-2 rounded-xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 text-center">
                  <img
                    src={error.originalQuestion.imageUrl}
                    alt={error.originalQuestion.imageCaption || "Imagem da questão"}
                    className="max-h-80 mx-auto rounded-lg object-contain shadow-xs"
                  />
                  {error.originalQuestion.imageCaption && (
                    <p className="text-xs text-gray-400 mt-2 font-medium">
                      {error.originalQuestion.imageCaption}
                    </p>
                  )}
                </div>
              )}

              {/* Alternativas */}
              {error.originalQuestion.options && error.originalQuestion.options.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Alternativas da Questão:
                  </span>
                  {error.originalQuestion.options.map((opt) => {
                    const isCorrect =
                      opt.id.toLowerCase() === error.originalQuestion.correctAnswer?.toLowerCase() ||
                      opt.text.toLowerCase().includes(error.originalQuestion.correctAnswer?.toLowerCase());
                    const isUserAnswer =
                      error.originalQuestion.userAnswer &&
                      (opt.id.toLowerCase() === error.originalQuestion.userAnswer?.toLowerCase() ||
                        opt.text.toLowerCase().includes(error.originalQuestion.userAnswer?.toLowerCase()));

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          isCorrect
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 font-semibold"
                            : isUserAnswer
                            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100"
                            : "bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 uppercase ${
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : isUserAnswer
                              ? "bg-rose-600 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {opt.id}
                        </span>
                        <div className="flex-1 leading-relaxed">
                          <span>{renderFormattedText(opt.text)}</span>
                          {isCorrect && (
                            <span className="ml-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                              (Gabarito Correto)
                            </span>
                          )}
                          {isUserAnswer && !isCorrect && (
                            <span className="ml-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                              (Sua Escolha Incorreta)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explicação da banca */}
              {error.originalQuestion.explanation && (
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-100 leading-relaxed">
                  <strong className="block mb-1 text-blue-900 dark:text-blue-300 font-bold uppercase text-[10px]">
                    Explicação da Banca / Gabarito:
                  </strong>
                  <div>{renderFormattedText(error.originalQuestion.explanation)}</div>
                </div>
              )}
            </div>
          )}
          {/* Section: Diagnóstico do Erro (com botão para editar a qualquer momento) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Diagnóstico & Análise do Erro
              </span>
              {onUpdateAnalysis && !isEditingAnalysis && (
                <button
                  type="button"
                  onClick={() => setIsEditingAnalysis(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60 dark:border-blue-900/40"
                >
                  <Edit3 size={12} />
                  <span>Editar Diagnóstico</span>
                </button>
              )}
            </div>

            {isEditingAnalysis ? (
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-blue-400/80 dark:border-blue-600/80 bg-blue-50/20 dark:bg-blue-950/10 space-y-4 animate-in fade-in duration-150">
                {/* Edit Ponto Cego */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <Crosshair size={13} />
                    <span>O Ponto Cego (Core Concept)</span>
                  </label>
                  <textarea
                    value={pontoCegoEdit}
                    onChange={(e) => setPontoCegoEdit(e.target.value)}
                    rows={2}
                    placeholder="O que você errou ou não sabia?"
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Edit Pegadinha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    <span>A Pegadinha / Distrator</span>
                  </label>
                  <textarea
                    value={pegadinhaEdit}
                    onChange={(e) => setPegadinhaEdit(e.target.value)}
                    rows={2}
                    placeholder="O que tornou a alternativa errada atraente?"
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Edit Gatilho */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Lightbulb size={13} />
                    <span>Gatilho de Memória (Regra de Bolso)</span>
                  </label>
                  <textarea
                    value={gatilhoEdit}
                    onChange={(e) => setGatilhoEdit(e.target.value)}
                    rows={2}
                    placeholder="Frase curta para fixação rápida..."
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setPontoCegoEdit(error.pontoCego || "");
                      setPegadinhaEdit(error.pegadinhaDistrator || "");
                      setGatilhoEdit(error.gatilhoMemoria || "");
                      setIsEditingAnalysis(false);
                    }}
                    className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAnalysis}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Save size={13} />
                    <span>Salvar Diagnóstico</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grid de Ponto Cego e Pegadinha */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. O PONTO CEGO */}
                  <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
                        <Crosshair size={16} className="text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider">
                          O Ponto Cego (Core Concept)
                        </h3>
                        <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                          O que exatamente eu não sabia ou interpretei errado?
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-medium pt-1">
                      {renderFormattedText(error.pontoCego || "Ponto cego a detalhar (clique em Editar Diagnóstico).")}
                    </div>
                  </div>

                  {/* 2. A PEGADINHA / DISTRATOR */}
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider">
                          A Pegadinha / Distrator
                        </h3>
                        <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                          O que tornou a alternativa errada atraente ou descartou a certa?
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-medium pt-1">
                      {renderFormattedText(error.pegadinhaDistrator || "Sem distrator específico identificado.")}
                    </div>
                  </div>
                </div>

                {/* 3. GATILHO DE MEMÓRIA (REGRA DE BOLSO) */}
                <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 sm:p-6 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                      <Lightbulb size={17} className="text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider">
                        Gatilho de Memória • Regra de Bolso
                      </h3>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                        Frase curta e direta de fixação instantânea
                      </p>
                    </div>
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-emerald-950 dark:text-emerald-50 leading-relaxed pt-1">
                    {renderFormattedText(error.gatilhoMemoria ? `“${error.gatilhoMemoria}”` : "Nenhum gatilho de memória cadastrado ainda.")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. ANOTAÇÕES PESSOAIS */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 size={15} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Minhas Anotações Pessoais
                </h3>
              </div>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {error.userNotes ? "Editar Anotações" : "+ Adicionar Anotação"}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escreva suas próprias reflexões, dúvidas para o preceptor ou raciocínio clínico..."
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1A1D27] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotes(error.userNotes || "");
                      setIsEditingNotes(false);
                    }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={13} />
                    <span>Salvar Anotação</span>
                  </button>
                </div>
              </div>
            ) : error.userNotes ? (
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1A1D27] border border-gray-100 dark:border-gray-800">
                <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 italic leading-relaxed">
                  {error.userNotes}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Nenhuma anotação pessoal adicionada ainda.
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-[#12141c]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateFlashcard}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-colors cursor-pointer shadow-xs"
              title="Gerar Flashcard a partir deste erro"
            >
              <Layers size={14} />
              <span>Criar Flashcard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDelete(error.id);
                onClose();
                toast.success("Erro removido.");
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Excluir do caderno"
            >
              <Trash2 size={13} />
              <span>Excluir</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Revisado {error.revisoesCount} {error.revisoesCount === 1 ? "vez" : "vezes"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
