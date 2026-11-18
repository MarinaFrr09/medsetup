"use client";

import React, { useState, useMemo } from "react";
import {
  BookX,
  Plus,
  Search,
  Folder as FolderIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  X,
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Filter,
  FolderInput,
  FolderPlus,
  BookOpen,
  Sparkles,
} from "lucide-react";
import {
  useAppStore,
  CadernoErrorItem,
  Folder as FolderType,
} from "@/stores/useAppStore";
import VerticalFolderSidebar from "@/components/common/VerticalFolderSidebar";
import FolderCardGrid, { SubfoldersGrid } from "@/components/common/FolderCardGrid";
import FolderManagerModal from "@/components/common/FolderManagerModal";
import { cleanQuestionTitle } from "@/lib/questionUtils";
import toast from "react-hot-toast";

export default function CadernoErrosPage() {
  const {
    folders,
    cadernoErrors,
    addCadernoError,
    updateCadernoError,
    deleteCadernoError,
    moveCadernoErrorToFolder,
  } = useAppStore();

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewAllQuestions, setViewAllQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendente" | "dominado">("all");
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

  // Folder Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FolderType | null>(null);
  const [movingQuestion, setMovingQuestion] = useState<CadernoErrorItem | null>(null);

  // Question Modals
  const [isNewQuestionModalOpen, setIsNewQuestionModalOpen] = useState(false);
  const [editingQuestionNotes, setEditingQuestionNotes] = useState<CadernoErrorItem | null>(null);
  const [editNotesText, setEditNotesText] = useState("");

  // New Question Form
  const [newQFolderId, setNewQFolderId] = useState<string>("");
  const [newQSubject, setNewQSubject] = useState("");
  const [newQText, setNewQText] = useState("");
  const [newQNotes, setNewQNotes] = useState("");
  const [newQCorrectAnswer, setNewQCorrectAnswer] = useState("");
  const [newQUserAnswer, setNewQUserAnswer] = useState("");
  const [newQExplanation, setNewQExplanation] = useState("");

  // Relevant folders for Caderno de Erros
  const cadernoFolders = useMemo(
    () => folders.filter((f) => f.type === "caderno-erros"),
    [folders]
  );

  const cadernoFolderIds = useMemo(
    () => new Set(cadernoFolders.map((f) => f.id)),
    [cadernoFolders]
  );

  // Active folder details
  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    if (selectedFolderId === "unassigned") {
      return {
        id: "unassigned",
        name: "Geral / Sem Pasta",
        color: "#F59E0B",
        type: "caderno-erros" as const,
        createdAt: "Hoje",
      };
    }
    return cadernoFolders.find((f) => f.id === selectedFolderId) || null;
  }, [cadernoFolders, selectedFolderId]);

  // Hierarchical folder ids (including subfolders)
  const activeFolderIds = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === "unassigned") return null;
    const getDescendants = (id: string): string[] => {
      const children = cadernoFolders.filter((f) => f.parentId === id).map((f) => f.id);
      return [id, ...children.flatMap(getDescendants)];
    };
    return new Set(getDescendants(selectedFolderId));
  }, [selectedFolderId, cadernoFolders]);

  // Counts
  const totalCount = cadernoErrors.length;
  const pendentesCount = cadernoErrors.filter((e) => e.status !== "dominado").length;
  const dominadosCount = cadernoErrors.filter((e) => e.status === "dominado").length;

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return cadernoErrors
      .filter((item) => {
        // Folder Filter
        if (selectedFolderId === "unassigned") {
          if (item.folderId && cadernoFolderIds.has(item.folderId)) return false;
        } else if (activeFolderIds !== null) {
          const itemFolder =
            !item.folderId || item.folderId === "folder-geral" || !cadernoFolderIds.has(item.folderId)
              ? "caderno-geral"
              : item.folderId;
          if (!activeFolderIds.has(itemFolder)) return false;
        }

        // Status Filter
        if (statusFilter !== "all") {
          if (statusFilter === "dominado" && item.status !== "dominado") return false;
          if (statusFilter === "pendente" && item.status === "dominado") return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const inSubject = (item.especialidade || "").toLowerCase().includes(q);
          const inSubtema = (item.subtema || "").toLowerCase().includes(q);
          const inText = (item.originalQuestion?.text || "").toLowerCase().includes(q);
          const inNotes = (item.userNotes || "").toLowerCase().includes(q);
          const inPontoCego = (item.pontoCego || "").toLowerCase().includes(q);
          const inGatilho = (item.gatilhoMemoria || "").toLowerCase().includes(q);

          if (!inSubject && !inSubtema && !inText && !inNotes && !inPontoCego && !inGatilho) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [cadernoErrors, activeFolderIds, statusFilter, searchQuery]);

  // Handlers
  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setViewAllQuestions(false);
  };

  const toggleAccordion = (id: string) => {
    setExpandedQuestionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleStatus = (item: CadernoErrorItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isDominado = item.status === "dominado";
    const nextStatus = isDominado ? "pendente" : "dominado";
    updateCadernoError(item.id, {
      status: nextStatus,
      lastReviewedAt: new Date().toISOString(),
    });
    toast.success(isDominado ? "Marcada como pendente de revisão" : "Questão dominada! 🎉");
  };

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm("Deseja remover esta anotação do Caderno de Erros?")) {
      deleteCadernoError(id);
      toast.success("Anotação removida.");
    }
  };

  const handleSaveNotes = () => {
    if (!editingQuestionNotes) return;
    updateCadernoError(editingQuestionNotes.id, {
      userNotes: editNotesText.trim(),
    });
    setEditingQuestionNotes(null);
    setEditNotesText("");
    toast.success("Anotação atualizada!");
  };

  const handleMoveQuestionConfirm = (targetFolderId: string) => {
    if (!movingQuestion) return;
    moveCadernoErrorToFolder(movingQuestion.id, targetFolderId);
    setMovingQuestion(null);
    toast.success("Questão movida de pasta com sucesso!");
  };

  const handleCreateQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      toast.error("Preencha o enunciado ou tema da questão.");
      return;
    }

    const folderTarget = newQFolderId || selectedFolderId || (cadernoFolders[0]?.id || "caderno-geral");

    const newItem: CadernoErrorItem = {
      id: `err-${Date.now()}`,
      folderId: folderTarget,
      origin: "manual",
      originTitle: newQSubject.trim() || "Anotação Manual",
      originalQuestion: {
        text: newQText.trim(),
        userAnswer: newQUserAnswer.trim() || undefined,
        correctAnswer: newQCorrectAnswer.trim() || "Gabarito Oficial",
        explanation: newQExplanation.trim() || undefined,
      },
      pontoCego: newQNotes.trim() || "Revisar conceito-chave desta questão",
      pegadinhaDistrator: "",
      gatilhoMemoria: newQSubject.trim() || "Atenção ao critério diagnóstico",
      especialidade: newQSubject.trim() || activeFolder?.name || "Clínica Médica",
      subtema: "",
      causaErro: "interpretacao",
      userNotes: newQNotes.trim(),
      status: "pendente",
      priority: "alta",
      revisoesCount: 0,
      createdAt: new Date().toISOString(),
    };

    addCadernoError(newItem);
    setIsNewQuestionModalOpen(false);

    // Reset Form
    setNewQText("");
    setNewQSubject("");
    setNewQNotes("");
    setNewQCorrectAnswer("");
    setNewQUserAnswer("");
    setNewQExplanation("");

    toast.success("Questão anotada no Caderno de Erros!");
  };

  const isViewingFolders =
    selectedFolderId === null &&
    !searchQuery.trim() &&
    statusFilter === "all" &&
    !viewAllQuestions;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-[#2a2d3a]">
        <div className="flex items-center gap-3">
          {selectedFolderId && (
            <button
              type="button"
              onClick={() => handleSelectFolder(null)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Voltar ao início de pastas"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <BookX className="text-rose-600 dark:text-rose-400" size={22} />
              <span>{selectedFolderId ? activeFolder?.name || "Pasta" : "Caderno de Erros"}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-xs">
              {selectedFolderId
                ? `Questões arquivadas na pasta "${activeFolder?.name}"`
                : "Tome nota das questões respondidas e acesse-as organizadas por pastas"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFolderToEdit(null);
              setIsFolderModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-[#1A1D27] dark:hover:bg-gray-800 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors shadow-2xs cursor-pointer"
          >
            <FolderPlus size={14} className="text-rose-500" />
            <span>Nova Pasta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewQFolderId(selectedFolderId || cadernoFolders[0]?.id || "");
              setIsNewQuestionModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-sm shadow-rose-500/20 cursor-pointer"
          >
            <Plus size={14} />
            <span>Anotar Questão</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total de Questões</span>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
            <BookOpen size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pendentes de Revisão</span>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendentesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Questões Dominadas</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{dominadosCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* Main 2-Column Master-Detail Layout (Vertical Sidebar ALWAYS on left + Folders/Questions on right) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Left Column: Vertical Folder Sidebar */}
        <VerticalFolderSidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          onSelectItem={(itemId) => {
            const err = cadernoErrors.find((e) => e.id === itemId);
            if (err) setEditingQuestionNotes(err);
          }}
          type="caderno-erros"
          className="w-full lg:w-72 xl:w-80 shrink-0"
          extraFilterSlot={
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Filter size={14} className="text-rose-500" />
                  <span>Filtro de Status</span>
                </span>
                {statusFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-gray-50 dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100"
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pendente")}
                  className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    statusFilter === "pendente"
                      ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-gray-50 dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100"
                  }`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("dominado")}
                  className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    statusFilter === "dominado"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-gray-50 dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100"
                  }`}
                >
                  Dominadas
                </button>
              </div>
            </div>
          }
        />

        {/* Right Column: Folders Grid OR Questions List Area */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          {isViewingFolders ? (
            <FolderCardGrid
              title="Pastas do Caderno de Erros"
              subtitle="Selecione uma pasta para revisar suas questões anotadas ou organize seus erros por especialidade médica."
              folders={cadernoFolders}
              getItemCount={(folderId) => {
                const getDescendants = (id: string): string[] => {
                  const children = cadernoFolders.filter((f) => f.parentId === id).map((f) => f.id);
                  return [id, ...children.flatMap(getDescendants)];
                };
                const targetIds = new Set(getDescendants(folderId));
                return cadernoErrors.filter((e) => {
                  const eff =
                    !e.folderId || e.folderId === "folder-geral" || !cadernoFolderIds.has(e.folderId)
                      ? "caderno-geral"
                      : e.folderId;
                  return targetIds.has(eff);
                }).length;
              }}
              getItemPreviews={(folderId) =>
                cadernoErrors
                  .filter((e) => {
                    const eff =
                      !e.folderId || e.folderId === "folder-geral" || !cadernoFolderIds.has(e.folderId)
                        ? "caderno-geral"
                        : e.folderId;
                    return eff === folderId;
                  })
                  .slice(0, 3)
                  .map((e) => ({
                    id: e.id,
                    title: e.originalQuestion?.text
                      ? cleanQuestionTitle(e.originalQuestion.text)
                      : (e.userNotes || e.pontoCego || "Questão anotada"),
                    subtitle: e.status === "dominado" ? "Dominada" : "Pendente de revisão",
                  }))
              }
              itemLabel={{ singular: "questão", plural: "questões" }}
              onSelectFolder={(folderId) => {
                handleSelectFolder(folderId);
                setViewAllQuestions(false);
              }}
              onCreateFolder={() => {
                setFolderToEdit(null);
                setIsFolderModalOpen(true);
              }}
              onViewAll={() => setViewAllQuestions(true)}
              viewAllLabel="Ver Todas as Questões"
              accentColor="rose"
            />
          ) : (
            <>
            {/* Header Toolbar: Back to folders + Search + Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A1D27] p-3.5 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectFolder(activeFolder?.parentId || null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>
                    {activeFolder?.parentId
                      ? cadernoFolders.find((f) => f.id === activeFolder.parentId)?.name || "Voltar"
                      : "Pastas"}
                  </span>
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                  {selectedFolderId ? activeFolder?.name : "Todas as Questões"}
                </span>
                <span className="text-[11px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {filteredQuestions.length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar questão ou anotação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Subpastas no início da pasta aberta */}
            {selectedFolderId && (
              <SubfoldersGrid
                parentFolderId={selectedFolderId}
                parentFolderName={activeFolder?.name}
                folders={cadernoFolders}
                getItemCount={(folderId) => {
                  const getDescendants = (id: string): string[] => {
                    const children = cadernoFolders.filter((f) => f.parentId === id).map((f) => f.id);
                    return [id, ...children.flatMap(getDescendants)];
                  };
                  const targetIds = new Set(getDescendants(folderId));
                  return cadernoErrors.filter((e) => {
                    const eff =
                      !e.folderId || e.folderId === "folder-geral" || !cadernoFolderIds.has(e.folderId)
                        ? "caderno-geral"
                        : e.folderId;
                    return targetIds.has(eff);
                  }).length;
                }}
                itemLabel={{ singular: "questão", plural: "questões" }}
                onSelectFolder={(subId) => {
                  handleSelectFolder(subId);
                  setViewAllQuestions(false);
                }}
              />
            )}

            {/* Questions Cards List */}
            {filteredQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-[#2a2d3a] text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 mb-3">
                  <BookX size={26} />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">
                  Nenhuma questão encontrada
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-5">
                  {searchQuery || statusFilter !== "all"
                    ? "Tente ajustar seus termos de busca ou remover os filtros."
                    : "Esta pasta ainda não possui anotações de erros registradas."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewQFolderId(selectedFolderId || "");
                    setIsNewQuestionModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  <Plus size={14} />
                  <span>Anotar Primeira Questão</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredQuestions.map((item) => {
                  const isExpanded = !!expandedQuestionIds[item.id];
                  const isDominado = item.status === "dominado";
                  const folderOfItem = cadernoFolders.find((f) => f.id === item.folderId);

                  return (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", String(item.id));
                        e.dataTransfer.setData("application/studyflow-item-id", String(item.id));
                        e.dataTransfer.setData("application/studyflow-item-type", "caderno-erros");
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-all space-y-3 cursor-grab active:cursor-grabbing"
                    >
                      {/* Top Meta Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Status Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(item, e)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isDominado
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            }`}
                            title={isDominado ? "Clique para marcar como pendente" : "Clique para marcar como dominada"}
                          >
                            {isDominado ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                            <span>{isDominado ? "Dominada" : "Pendente"}</span>
                          </button>

                          {/* Folder Tag */}
                          {folderOfItem && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              <FolderIcon size={12} style={{ color: folderOfItem.color || "#EF4444" }} />
                              <span>{folderOfItem.name}</span>
                            </span>
                          )}

                          {/* Especialidade Tag */}
                          {item.especialidade && item.especialidade !== folderOfItem?.name && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {item.especialidade}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Move, Edit Notes, Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setMovingQuestion(item)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Mover para outra pasta"
                          >
                            <FolderInput size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionNotes(item);
                              setEditNotesText(item.userNotes || item.pontoCego || "");
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Editar minhas anotações"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(item.id, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Excluir anotação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Question Text / Statement Preview */}
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed line-clamp-3">
                          {item.originalQuestion?.text || "Enunciado da questão não informado"}
                        </p>
                      </div>

                      {/* Highlight Box: Minhas Anotações / O que errei (Ponto Cego) */}
                      {(item.userNotes || item.pontoCego || item.gatilhoMemoria) && (
                        <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/40 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1">
                            <Lightbulb size={14} className="text-amber-600 shrink-0" />
                            <span>Minha Anotação / Ponto Cego:</span>
                          </div>
                          <p className="text-amber-950/90 dark:text-amber-200 leading-relaxed whitespace-pre-wrap pl-5">
                            {item.userNotes || item.pontoCego || item.gatilhoMemoria}
                          </p>
                        </div>
                      )}

                      {/* Expand/Collapse Accordion for Full Question & Explanation */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleAccordion(item.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer py-1"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <span>{isExpanded ? "Ocultar Gabarito e Detalhes" : "Ver Enunciado Completo e Gabarito"}</span>
                        </button>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 space-y-3 animate-in fade-in duration-150">
                            {/* Full Question Text */}
                            <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                              <span className="font-bold block text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider text-[10px]">
                                Enunciado Completo
                              </span>
                              {item.originalQuestion?.text}
                            </div>

                            {/* Options if present */}
                            {item.originalQuestion?.options && item.originalQuestion.options.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="font-bold block text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wider">
                                  Alternativas
                                </span>
                                {item.originalQuestion.options.map((opt) => {
                                  const isCorrect =
                                    opt.id === item.originalQuestion.correctAnswer ||
                                    opt.text === item.originalQuestion.correctAnswer;
                                  const isUserAns =
                                    opt.id === item.originalQuestion.userAnswer ||
                                    opt.text === item.originalQuestion.userAnswer;

                                  let optClass = "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300";
                                  if (isCorrect) {
                                    optClass = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold";
                                  } else if (isUserAns && !isCorrect) {
                                    optClass = "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 line-through";
                                  }

                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${optClass}`}
                                    >
                                      <span>
                                        <strong className="mr-2 uppercase">{opt.id})</strong>
                                        {opt.text}
                                      </span>
                                      {isCorrect && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                          Gabarito Correto
                                        </span>
                                      )}
                                      {isUserAns && !isCorrect && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                                          Minha Resposta (Incorreta)
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Correct Answer / Gabarito summary */}
                            {(!item.originalQuestion?.options || item.originalQuestion.options.length === 0) && (
                              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs">
                                <span className="font-bold text-emerald-900 dark:text-emerald-300">
                                  Gabarito Oficial:{" "}
                                </span>
                                <span className="text-emerald-950 dark:text-emerald-200">
                                  {item.originalQuestion?.correctAnswer || "Não especificado"}
                                </span>
                              </div>
                            )}

                            {/* Official Explanation */}
                            {item.originalQuestion?.explanation && (
                              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-950 dark:text-blue-200">
                                <span className="font-bold block text-blue-900 dark:text-blue-300 mb-1">
                                  Explicação & Comentário do Professor:
                                </span>
                                <p className="leading-relaxed whitespace-pre-wrap">
                                  {item.originalQuestion.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* ────────────────────── MODAL: Gerenciador de Pastas (FolderManagerModal) ────────────────────── */}
      <FolderManagerModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        defaultType="caderno-erros"
        folderToEdit={folderToEdit}
        onFolderCreated={(newId) => {
          setSelectedFolderId(newId);
          setViewAllQuestions(false);
        }}
      />

      {/* ────────────────────── MODAL: Mover Questão para Outra Pasta ────────────────────── */}
      {movingQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setMovingQuestion(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161824] p-5 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FolderInput size={16} className="text-rose-500" />
                <span>Mover Questão de Pasta</span>
              </h3>
              <button
                type="button"
                onClick={() => setMovingQuestion(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selecione a pasta de destino para esta anotação:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {cadernoFolders.map((f) => {
                const isCurrent = movingQuestion.folderId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleMoveQuestionConfirm(f.id)}
                    className={`w-full text-left py-2.5 px-3 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer ${
                      isCurrent
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderIcon size={14} style={{ color: f.color || "#EF4444" }} />
                      <span>{f.name}</span>
                    </div>
                    {isCurrent && <span className="text-[10px] text-rose-500 font-semibold">(Atual)</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMovingQuestion(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── MODAL: Editar Anotações do Aluno ────────────────────── */}
      {editingQuestionNotes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEditingQuestionNotes(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161824] p-5 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 size={16} className="text-amber-500" />
                <span>Editar Minha Anotação / Ponto Cego</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestionNotes(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                O que você precisa lembrar desta questão? (Ponto Cego / Macete):
              </label>
              <textarea
                rows={5}
                value={editNotesText}
                onChange={(e) => setEditNotesText(e.target.value)}
                placeholder="Ex: Não esquecer que na insuficiência cardíaca descompensada com hipotensão o betabloqueador deve ser suspenso temporariamente..."
                className="w-full p-3 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingQuestionNotes(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-sm"
              >
                Salvar Anotação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── MODAL: Nova Questão / Anotação de Erro ────────────────────── */}
      {isNewQuestionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsNewQuestionModalOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161824] p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <BookX size={18} className="text-rose-500" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Anotar Nova Questão no Caderno de Erros
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewQuestionModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateQuestionSubmit} className="space-y-4">
              {/* Folder Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Pasta de Destino:
                </label>
                <select
                  value={newQFolderId}
                  onChange={(e) => setNewQFolderId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                >
                  {cadernoFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tema / Especialidade */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Matéria / Subtema:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Insuficiência Cardíaca, Pré-Eclâmpsia, Apendicite Aguda..."
                  value={newQSubject}
                  onChange={(e) => setNewQSubject(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Enunciado da Questão */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Enunciado ou Descrição da Questão: *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Cole ou digite aqui o enunciado da questão que você errou ou teve dúvida..."
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Minha Anotação / Por que errei */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1.5">
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-amber-600" />
                  <span>Por que errei? (Minhas anotações / Ponto cego):</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Confundi os critérios de Duke menores com maiores; esqueci que febre > 38°C é menor..."
                  value={newQNotes}
                  onChange={(e) => setNewQNotes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/60 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Resposta Marcada vs Correta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Minha Resposta (Incorreta):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Alternativa B ou o que você marcou"
                    value={newQUserAnswer}
                    onChange={(e) => setNewQUserAnswer(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Gabarito Correto:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Alternativa D ou resposta correta"
                    value={newQCorrectAnswer}
                    onChange={(e) => setNewQCorrectAnswer(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Comentário Adicional */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Comentário / Explicação Oficial (Opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Comentário do professor ou resolução da banca..."
                  value={newQExplanation}
                  onChange={(e) => setNewQExplanation(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsNewQuestionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-sm shadow-rose-500/20"
                >
                  Salvar no Caderno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
