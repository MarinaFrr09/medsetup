"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  BookOpen,
  Edit3,
  Save,
  X,
  Lightbulb,
  Target,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Tag,
  Layers,
  ChevronRight,
} from "lucide-react";
import { CadernoErrorItem, CausaErroTipo, useAppStore } from "@/stores/useAppStore";
import { renderFormattedText } from "@/lib/questionUtils";
import toast from "react-hot-toast";

interface ErrorDetailViewProps {
  error: CadernoErrorItem;
  onBack: () => void;
  onToggleDominado: (card: CadernoErrorItem) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateAnalysis?: (
    id: string,
    updates: {
      pontoCego?: string;
      pegadinhaDistrator?: string;
      gatilhoMemoria?: string;
    }
  ) => void;
}

const CAUSA_LABELS: Record<
  CausaErroTipo,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  conceitual: {
    label: "Conceitual",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50/70 dark:bg-blue-950/30",
    border: "border-blue-200/80 dark:border-blue-900/40",
    dot: "bg-blue-500",
  },
  pegadinha: {
    label: "Pegadinha",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50/70 dark:bg-amber-950/30",
    border: "border-amber-200/80 dark:border-amber-900/40",
    dot: "bg-amber-500",
  },
  interpretacao: {
    label: "Interpretação",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50/70 dark:bg-purple-950/30",
    border: "border-purple-200/80 dark:border-purple-900/40",
    dot: "bg-purple-500",
  },
  detalhe_conduta: {
    label: "Detalhe de Conduta",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
    border: "border-emerald-200/80 dark:border-emerald-900/40",
    dot: "bg-emerald-500",
  },
  falta_atencao: {
    label: "Falta de Atenção",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50/70 dark:bg-rose-950/30",
    border: "border-rose-200/80 dark:border-rose-900/40",
    dot: "bg-rose-500",
  },
};

export default function ErrorDetailView({
  error,
  onBack,
  onToggleDominado,
  onDelete,
  onUpdateNotes,
  onUpdateAnalysis,
}: ErrorDetailViewProps) {
  const { addDeck } = useAppStore();

  const [notes, setNotes] = useState(error.userNotes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Analysis edit state
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [pontoCegoEdit, setPontoCegoEdit] = useState(error.pontoCego || "");
  const [pegadinhaEdit, setPegadinhaEdit] = useState(error.pegadinhaDistrator || "");
  const [gatilhoEdit, setGatilhoEdit] = useState(error.gatilhoMemoria || "");

  const [copiedQuestion, setCopiedQuestion] = useState(false);

  useEffect(() => {
    setNotes(error.userNotes || "");
    setIsEditingNotes(false);
    setPontoCegoEdit(error.pontoCego || "");
    setPegadinhaEdit(error.pegadinhaDistrator || "");
    setGatilhoEdit(error.gatilhoMemoria || "");
    setIsEditingAnalysis(false);
  }, [error]);

  const causaInfo = CAUSA_LABELS[error.causaErro] || CAUSA_LABELS.conceitual;
  const isDominado = error.status === "dominado";

  const handleSaveNotes = () => {
    onUpdateNotes(error.id, notes);
    setIsEditingNotes(false);
    toast.success("Anotação salva!");
  };

  const handleSaveAnalysis = () => {
    if (onUpdateAnalysis) {
      onUpdateAnalysis(error.id, {
        pontoCego: pontoCegoEdit.trim() || error.pontoCego,
        pegadinhaDistrator: pegadinhaEdit.trim(),
        gatilhoMemoria: gatilhoEdit.trim(),
      });
      setIsEditingAnalysis(false);
      toast.success("Diagnóstico atualizado!");
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
    toast.success(`Flashcard adicionado à pasta "${folder.name}"!`, { icon: "🗂️" });
  };

  const handleDelete = () => {
    if (window.confirm("Deseja realmente remover este registro do seu Caderno de Erros?")) {
      onDelete(error.id);
      toast.success("Erro removido.");
    }
  };

  const handleCopyQuestion = () => {
    if (error.originalQuestion?.text) {
      navigator.clipboard.writeText(error.originalQuestion.text);
      setCopiedQuestion(true);
      setTimeout(() => setCopiedQuestion(false), 2000);
      toast.success("Enunciado copiado!");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto">
      {/* 1. Header de Navegação In-Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161822] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700/60"
            title="Voltar ao Caderno de Erros"
          >
            <ArrowLeft size={14} />
            <span>Voltar</span>
          </button>

          {/* Breadcrumb discreto */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 overflow-hidden">
            <span className="hidden sm:inline">Caderno de Erros</span>
            <ChevronRight size={13} className="hidden sm:inline text-slate-300 dark:text-slate-600" />
            <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
              {error.especialidade}
            </span>
            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[240px]">
              {error.subtema}
            </span>
          </div>
        </div>

        {/* Ações Rápidas no Topo */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onToggleDominado(error)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isDominado
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-300"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>{isDominado ? "Dominado" : "Marcar Dominado"}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateFlashcard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-800/60 transition-colors cursor-pointer"
            title="Gerar Flashcard desta regra"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">Criar Flashcard</span>
            <span className="sm:hidden">Card</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
            title="Excluir do Caderno"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 2. Grid de Conteúdo Principal (2 Colunas no Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            COLUNA DA ESQUERDA (7 colunas): DIAGNÓSTICO & FIXAÇÃO
            ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Cartão de Resumo do Tema */}
          <div className="bg-white dark:bg-[#161822] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${causaInfo.bg} ${causaInfo.color} ${causaInfo.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${causaInfo.dot}`} />
                <span>{causaInfo.label}</span>
              </span>

              {error.priority === "alta" && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40">
                  Prioridade Alta
                </span>
              )}

              {error.referenciaFonte && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Origem: <strong className="text-slate-600 dark:text-slate-300">{error.referenciaFonte}</strong>
                </span>
              )}

              {error.createdAt && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 ml-auto">
                  <Clock size={12} />
                  <span>{error.createdAt}</span>
                </span>
              )}
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {error.subtema}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {error.especialidade}
              </p>
            </div>

            {/* Separador sutil */}
            <hr className="border-slate-100 dark:border-slate-800/80" />

            {/* Diagnóstico Clínico do Erro */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Diagnóstico do Erro
                </span>

                {onUpdateAnalysis && !isEditingAnalysis && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAnalysis(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Edit3 size={12} />
                    <span>Editar Análise</span>
                  </button>
                )}
              </div>

              {isEditingAnalysis ? (
                /* Modo de Edição */
                <div className="space-y-3.5 p-4 rounded-xl bg-slate-50 dark:bg-[#10121a] border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ponto Cego (O que faltou saber?)
                    </label>
                    <textarea
                      rows={2}
                      value={pontoCegoEdit}
                      onChange={(e) => setPontoCegoEdit(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161822] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pegadinha / Distrator (Por que a errada parecia certa?)
                    </label>
                    <textarea
                      rows={2}
                      value={pegadinhaEdit}
                      onChange={(e) => setPegadinhaEdit(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161822] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Regra de Bolso (Frase curta para fixação rápida)
                    </label>
                    <input
                      type="text"
                      value={gatilhoEdit}
                      onChange={(e) => setGatilhoEdit(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161822] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingAnalysis(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAnalysis}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Save size={13} />
                      <span>Salvar Análise</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo de Visualização Limpo */
                <div className="space-y-3">
                  {/* Ponto Cego */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#10121a]/70 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Target size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span>O Ponto Cego (Conceito Chave)</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed pl-5">
                      {renderFormattedText(error.pontoCego || "Nenhum ponto cego detalhado.")}
                    </div>
                  </div>

                  {/* Pegadinha / Distrator */}
                  {error.pegadinhaDistrator && (
                    <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#10121a]/70 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span>A Pegadinha / Distrator</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed pl-5">
                        {renderFormattedText(error.pegadinhaDistrator)}
                      </div>
                    </div>
                  )}

                  {/* Regra de Bolso (Gatilho) */}
                  {error.gatilhoMemoria && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <Lightbulb size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Regra de Bolso (Gatilho de Fixação)</span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-emerald-950 dark:text-emerald-100 leading-relaxed pl-5">
                        “{renderFormattedText(error.gatilhoMemoria)}”
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Anotações Pessoais */}
          <div className="bg-white dark:bg-[#161822] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText size={13} className="text-indigo-500" />
                Minhas Anotações
              </span>

              {isEditingNotes ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotes(error.userNotes || "");
                      setIsEditingNotes(false);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Save size={12} />
                    <span>Salvar</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Edit3 size={12} />
                  <span>{error.userNotes ? "Editar" : "+ Adicionar anotação"}</span>
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escreva suas dicas, observações clínicas ou correlações..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#10121a] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            ) : (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {error.userNotes || "Nenhuma anotação pessoal ainda. Clique em Adicionar anotação para registrar observações."}
              </p>
            )}
          </div>
        </div>

        {/* =========================================================================
            COLUNA DA DIREITA (5 colunas): A QUESTÃO DE REFERÊNCIA
            ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {error.originalQuestion ? (
            <div className="bg-white dark:bg-[#161822] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Questão de Referência
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleCopyQuestion}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="Copiar enunciado"
                >
                  {copiedQuestion ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copiedQuestion ? "Copiado" : "Copiar"}</span>
                </button>
              </div>

              {/* Enunciado Limpo */}
              <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {renderFormattedText(error.originalQuestion.text)}
              </div>

              {/* Imagem se houver */}
              {error.originalQuestion.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] p-2 text-center">
                  <img
                    src={error.originalQuestion.imageUrl}
                    alt={error.originalQuestion.imageCaption || "Imagem da questão"}
                    className="max-h-64 mx-auto rounded-lg object-contain shadow-2xs"
                  />
                  {error.originalQuestion.imageCaption && (
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {error.originalQuestion.imageCaption}
                    </p>
                  )}
                </div>
              )}

              {/* Alternativas Formatadas Sem Poluição */}
              {error.originalQuestion.options && error.originalQuestion.options.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Alternativas
                  </span>

                  <div className="space-y-1.5">
                    {error.originalQuestion.options.map((opt) => {
                      const cleanCorrect = (error.originalQuestion.correctAnswer || "").trim().toLowerCase();
                      const cleanUser = (error.originalQuestion.userAnswer || "").trim().toLowerCase();
                      const optId = opt.id.trim().toLowerCase();
                      const optText = opt.text.trim().toLowerCase();

                      const isCorrect =
                        cleanCorrect !== "" &&
                        (optId === cleanCorrect ||
                          cleanCorrect === `(${optId})` ||
                          cleanCorrect === `${optId})` ||
                          cleanCorrect === `${optId}.` ||
                          optText === cleanCorrect);

                      const isUserAnswer =
                        cleanUser !== "" &&
                        (optId === cleanUser ||
                          cleanUser === `(${optId})` ||
                          cleanUser === `${optId})` ||
                          cleanUser === `${optId}.` ||
                          optText === cleanUser);

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-colors ${
                            isCorrect
                              ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100 font-medium"
                              : isUserAnswer
                              ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-800/60 text-rose-950 dark:text-rose-100 font-medium"
                              : "bg-slate-50/40 dark:bg-[#10121a]/50 border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 uppercase ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : isUserAnswer
                                ? "bg-rose-600 text-white"
                                : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {opt.id}
                          </span>

                          <div className="flex-1 leading-relaxed">
                            <span>{renderFormattedText(opt.text)}</span>
                            {isCorrect && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                (Gabarito)
                              </span>
                            )}
                            {isUserAnswer && !isCorrect && (
                              <span className="ml-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                (Sua Escolha)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Explicação da Banca */}
              {error.originalQuestion.explanation && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Comentário da Banca
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#10121a] border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {renderFormattedText(error.originalQuestion.explanation)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sem questão original vinculada */
            <div className="bg-white dark:bg-[#161822] p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <FileText className="mx-auto text-slate-300 dark:text-slate-600" size={24} />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Este erro foi registrado manualmente sem uma questão de referência vinculada.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
