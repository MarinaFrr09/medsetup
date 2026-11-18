"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  NotebookPen,
  Plus,
  Search,
  Folder as FolderIcon,
  FolderPlus,
  Star,
  Pin,
  Trash2,
  Edit3,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  LayoutGrid,
  List as ListIcon,
  Columns2,
  Calendar,
  AlertCircle,
  Bookmark,
  Share2,
  BookOpen,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Stethoscope,
  Pill,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Minus,
  Highlighter,
  ArrowLeft,
  ArrowRight,
  Filter,
  Clock,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Save,
  Tag,
} from "lucide-react";
import {
  useAppStore,
  AnotacaoItem,
  AnotacaoHighlight,
  Folder,
} from "@/stores/useAppStore";
import VerticalFolderSidebar from "@/components/common/VerticalFolderSidebar";
import { SubfoldersGrid } from "@/components/common/FolderCardGrid";
import FolderManagerModal from "@/components/common/FolderManagerModal";
import { renderFormattedText, cleanFlashcardText } from "@/lib/questionUtils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const HIGHLIGHT_COLORS = [
  { id: "yellow", name: "Amarelo (Regra de Ouro)", color: "#F59E0B", bg: "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300" },
  { id: "green", name: "Verde (Tratamento / Conduta)", color: "#10B981", bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300" },
  { id: "pink", name: "Rosa (Alerta / Red Flag)", color: "#F43F5E", bg: "bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300" },
  { id: "blue", name: "Azul (Fisiopatologia)", color: "#3B82F6", bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-300" },
  { id: "purple", name: "Roxo (Diagnóstico)", color: "#8B5CF6", bg: "bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-300" },
] as const;

function AnotacoesContent() {
  const searchParams = useSearchParams();
  const urlNoteId = searchParams.get("id");

  const {
    anotacoes,
    folders,
    addAnotacao,
    updateAnotacao,
    deleteAnotacao,
    togglePinAnotacao,
    toggleFavoriteAnotacao,
    addDeck,
    addQuestion,
  } = useAppStore();

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewAllNotes, setViewAllNotes] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [quickFilter, setQuickFilter] = useState<"all" | "favorites" | "pinned" | "alta" | "media" | "baixa">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "priority">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Editing Note State (null = viewing list, object = studio active)
  const [editingNote, setEditingNote] = useState<AnotacaoItem | null>(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [editorTab, setEditorTab] = useState<"edit" | "preview" | "split">("edit");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Editor Form fields
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolderId, setEditFolderId] = useState<string>("folder-geral");
  const [editMateria, setEditMateria] = useState("");
  const [editSubtema, setEditSubtema] = useState("");
  const [editPriority, setEditPriority] = useState<"alta" | "media" | "baixa">("media");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select note from URL
  useEffect(() => {
    if (urlNoteId) {
      const found = anotacoes.find((a) => a.id === urlNoteId);
      if (found) {
        openEditor(found, false);
      }
    }
  }, [urlNoteId]);

  // Pastas exclusivas de anotações (cada aba é independente)
  const relevantFolders = useMemo(() => folders.filter((f) => f.type === "anotacoes"), [folders]);
  const relevantFolderIds = useMemo(() => new Set(relevantFolders.map((f) => f.id)), [relevantFolders]);

  const activeFolderIds = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === "unassigned") return null;
    const getDescendants = (id: string): string[] => {
      const children = relevantFolders.filter((f) => f.parentId === id).map((f) => f.id);
      return [id, ...children.flatMap(getDescendants)];
    };
    return new Set(getDescendants(selectedFolderId));
  }, [selectedFolderId, relevantFolders]);

  const displayFolders = useMemo(() => {
    const root = relevantFolders.filter((f) => !f.parentId);
    return root.length > 0 ? root : relevantFolders;
  }, [relevantFolders]);

  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    if (selectedFolderId === "unassigned") {
      return {
        id: "unassigned",
        name: "Geral / Sem Pasta",
        color: "#F59E0B",
        type: "anotacoes" as const,
        createdAt: "Hoje",
      };
    }
    return relevantFolders.find((f) => f.id === selectedFolderId) || null;
  }, [relevantFolders, selectedFolderId]);

  const isViewingFolders =
    selectedFolderId === null &&
    !viewAllNotes &&
    !searchQuery.trim() &&
    quickFilter === "all" &&
    sourceFilter === "all";

  // Open note in studio editor
  const openEditor = (note: AnotacaoItem, isNew: boolean = false) => {
    setEditingNote(note);
    setIsNewNote(isNew);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFolderId(note.folderId || selectedFolderId || "folder-geral");
    setEditMateria(note.materia || "");
    setEditSubtema(note.subtema || "");
    setEditPriority(note.priority || "media");
    setEditTags(note.tags || []);
    setIsDirty(false);
  };

  const handleCreateNew = () => {
    const emptyNote: AnotacaoItem = {
      id: Date.now().toString(),
      title: "",
      content: "",
      folderId: selectedFolderId || "folder-geral",
      materia: activeFolder?.name !== "Geral" ? activeFolder?.name || "" : "",
      subtema: "",
      priority: "media",
      tags: [],
      highlights: [],
      createdAt: "Hoje",
      updatedAt: "Agora",
    };
    openEditor(emptyNote, true);
  };

  const closeEditor = () => {
    setEditingNote(null);
    setIsNewNote(false);
    setIsDirty(false);
  };

  // Save current note
  const handleSaveNote = () => {
    if (!editTitle.trim()) {
      toast.error("Por favor, digite um título para a anotação.");
      return;
    }

    if (isNewNote) {
      const created = addAnotacao({
        title: editTitle.trim(),
        content: editContent,
        folderId: editFolderId,
        materia: editMateria.trim(),
        subtema: editSubtema.trim(),
        priority: editPriority,
        tags: editTags,
        highlights: editingNote?.highlights || [],
        source: editingNote?.source,
      });
      setEditingNote(created);
      setIsNewNote(false);
      setIsDirty(false);
      toast.success("Anotação criada com sucesso!");
    } else if (editingNote) {
      updateAnotacao(editingNote.id, {
        title: editTitle.trim(),
        content: editContent,
        folderId: editFolderId,
        materia: editMateria.trim(),
        subtema: editSubtema.trim(),
        priority: editPriority,
        tags: editTags,
      });
      setEditingNote((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              content: editContent,
              folderId: editFolderId,
              materia: editMateria.trim(),
              subtema: editSubtema.trim(),
              priority: editPriority,
              tags: editTags,
            }
          : null
      );
      setIsDirty(false);
      toast.success("Anotação salva!");
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (editingNote) {
          e.preventDefault();
          handleSaveNote();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingNote, editTitle, editContent, editFolderId, editPriority, editMateria, editSubtema, editTags, isNewNote]);

  // Insert formatting snippet at cursor
  const insertSnippet = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = editContent.slice(start, end) || placeholder;
    const replacement = prefix + selected + suffix;

    const newContent = editContent.slice(0, start) + replacement + editContent.slice(end);
    setEditContent(newContent);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + prefix.length + selected.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // Insert Clinical Callouts
  const insertCallout = (type: "dica" | "alerta" | "criterios" | "tratamento") => {
    let snippet = "";
    if (type === "dica") {
      snippet = "\n\n> 💡 **Dica de Prova / Macete de Ouro**\n> Escreva aqui a pegadinha clássica da banca ou o macete mnemônico...\n\n";
    } else if (type === "alerta") {
      snippet = "\n\n> 🚨 **Alerta Clínico / Red Flag**\n> Atenção para os sinais de gravidade, contraindicações e quando encaminhar...\n\n";
    } else if (type === "criterios") {
      snippet = "\n\n> 📋 **Critérios Diagnósticos**\n> 1. Critério A\n> 2. Critério B\n> 3. Critério C\n\n";
    } else if (type === "tratamento") {
      snippet = "\n\n> 💊 **Tratamento de Escolha & Posologia**\n> - 1ª Linha: Medicamento X\n> - Alternativa: Medicamento Y\n\n";
    }
    insertSnippet(snippet);
  };

  // Insert Highlight Span
  const insertHighlight = (color: string) => {
    insertSnippet(`<mark class="hl-${color}">`, "</mark>", "texto destacado");
  };

  // AI Feature: Expand & Explain
  const handleAiExpand = async () => {
    if (!editTitle.trim() && !editContent.trim()) {
      toast.error("Escreva pelo menos o título ou o início do conteúdo.");
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/expand-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${editTitle}\n\n${editContent}`,
          prompt: "Expanda esta anotação médica com resumo de alto rendimento para provas de residência/Revalida. Inclua fisiopatologia concisa, critérios diagnósticos e regras de ouro práticas.",
        }),
      });
      const data = await res.json();
      if (data.expandedText) {
        setEditContent((prev) => prev + "\n\n### 🧠 Aprofundamento Clínico (IA):\n" + data.expandedText);
        setIsDirty(true);
        toast.success("Conteúdo enriquecido com IA!");
      } else {
        toast.error("Não foi possível gerar expansão.");
      }
    } catch {
      toast.error("Erro ao conectar com a IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Feature: Convert Note into Flashcards
  const handleGenerateFlashcards = async () => {
    if (!editContent.trim()) {
      toast.error("A anotação precisa de conteúdo para gerar flashcards.");
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: editTitle || "Anotações Clínicas",
          content: editContent,
          count: 4,
        }),
      });
      const data = await res.json();
      const rawCards = Array.isArray(data.cards) ? data.cards : [];
      if (rawCards.length > 0) {
        const sanitizedCards = rawCards.map((c: any, idx: number) => ({
          id: c.id || `card-anot-${Date.now()}-${idx}`,
          front: cleanFlashcardText(c.front),
          back: cleanFlashcardText(c.back),
        }));

        addDeck({
          id: `deck-${Date.now()}`,
          name: editTitle || "Baralho de Anotações",
          subject: editMateria || "Geral",
          folderId: editFolderId || "folder-geral",
          cards: sanitizedCards,
          cardCount: sanitizedCards.length,
        });
        toast.success(`🎉 ${sanitizedCards.length} Flashcards gerados e salvos na pasta!`);
      } else {
        toast.error("A IA não retornou cartões válidos.");
      }
    } catch {
      toast.error("Erro ao gerar flashcards.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Feature: Generate Question from Note
  const handleGenerateQuestion = async () => {
    if (!editContent.trim()) {
      toast.error("A anotação precisa de conteúdo para formular a questão.");
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editMateria || editTitle || "Clínica Médica",
          sourceText: `${editTitle}\n${editContent}`,
          count: 1,
          difficulty: "Médio",
        }),
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const q = data.questions[0];
        addQuestion({
          id: `q-${Date.now()}`,
          text: q.question || q.text,
          type: "Múltipla Escolha",
          difficulty: "Médio",
          subject: editMateria || editTitle || "Geral",
          folderId: editFolderId || "folder-geral",
          options: q.options || [],
          answer: q.answer || "a",
          explanation: q.explanation || "Elaborada automaticamente a partir da sua anotação.",
          date: "Hoje",
        });
        toast.success("Questão formulada e salva no Banco de Questões!");
      } else {
        toast.error("Não foi possível gerar a questão.");
      }
    } catch {
      toast.error("Erro ao gerar questão.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Add tag
  const handleAddTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !editTags.includes(t)) {
      setEditTags([...editTags, t]);
      setIsDirty(true);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
    setIsDirty(true);
  };

  // Filtered Notes list
  const filteredNotes = useMemo(() => {
    return anotacoes.filter((item) => {
      // Folder filter
      if (selectedFolderId === "unassigned") {
        if (item.folderId && relevantFolderIds.has(item.folderId)) return false;
      } else if (selectedFolderId !== null && activeFolderIds !== null) {
        const eff =
          !item.folderId || item.folderId === "folder-geral" || !relevantFolderIds.has(item.folderId)
            ? "anot-macetes"
            : item.folderId;
        if (!activeFolderIds.has(eff)) return false;
      }

      // Quick filter
      if (quickFilter === "favorites" && !item.isFavorite) return false;
      if (quickFilter === "pinned" && !item.isPinned) return false;
      if (quickFilter === "alta" && item.priority !== "alta") return false;
      if (quickFilter === "media" && item.priority !== "media") return false;
      if (quickFilter === "baixa" && item.priority !== "baixa") return false;

      // Source filter
      if (sourceFilter !== "all") {
        if (item.source?.type !== sourceFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesMateria = (item.materia || "").toLowerCase().includes(q);
        const matchesTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesMateria && !matchesTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "priority") {
        const order = { alta: 0, media: 1, baixa: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      }
      // default: recent
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [anotacoes, selectedFolderId, quickFilter, sourceFilter, searchQuery, sortBy]);

  // Priority color badge
  const renderPriorityBadge = (priority: "alta" | "media" | "baixa") => {
    if (priority === "alta") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Alta Prioridade
        </span>
      );
    }
    if (priority === "media") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Média Prioridade
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Baixa Prioridade
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* 1. TOP HEADER (Unified styling matching app) */}
      {!editingNote && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-[#2a2d3a]">
          <div className="flex items-center gap-3">
            {(selectedFolderId || viewAllNotes || searchQuery.trim() || quickFilter !== "all" || sourceFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderId(null);
                  setViewAllNotes(false);
                  setSearchQuery("");
                  setQuickFilter("all");
                  setSourceFilter("all");
                }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Voltar ao Sistema de Pastas"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <NotebookPen className="text-amber-500 dark:text-amber-400" size={22} />
                <span>
                  {selectedFolderId
                    ? activeFolder?.name || "Pasta de Anotações"
                    : viewAllNotes
                    ? "Todas as Anotações Clínicas"
                    : searchQuery
                    ? `Busca: "${searchQuery}"`
                    : quickFilter !== "all"
                    ? `Filtro: ${quickFilter.toUpperCase()}`
                    : "Pastas de Anotações & Organização"}
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-xs">
                {selectedFolderId
                  ? `Notas e regras de ouro arquivadas na pasta "${activeFolder?.name}"`
                  : isViewingFolders
                  ? "Sistema organizado de pastas, macetes e critérios de prova médica"
                  : "Organize seus macetes, critérios de prova e regras de ouro médicas"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setFolderToEdit(null);
                setIsFolderModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold px-3.5 py-2 text-xs transition-all shadow-xs cursor-pointer"
            >
              <FolderPlus size={15} className="text-amber-500" />
              <span>Nova Pasta</span>
            </button>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 text-xs transition-all shadow-xs cursor-pointer"
            >
              <Plus size={15} />
              <span>Nova Anotação</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MASTER-DETAIL 2-COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Left Column: Vertical Folder Sidebar */}
        <VerticalFolderSidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={(folderId) => {
            setSelectedFolderId(folderId);
            setViewAllNotes(false);
            if (editingNote) closeEditor();
          }}
          onSelectItem={(itemId) => {
            const note = anotacoes.find((n) => n.id === itemId);
            if (note) openEditor(note, false);
          }}
          type="anotacoes"
          className="w-full lg:w-72 xl:w-80 shrink-0"
            extraFilterSlot={
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Filter size={14} className="text-amber-500" />
                    <span>Filtros Rápidos</span>
                  </span>
                  {(quickFilter !== "all" || sourceFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter("all");
                        setSourceFilter("all");
                      }}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Status / Destaques */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setQuickFilter(quickFilter === "pinned" ? "all" : "pinned")}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      quickFilter === "pinned"
                        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Pin size={13} className="text-amber-500" />
                      <span>Fixadas</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {anotacoes.filter((a) => a.isPinned).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickFilter(quickFilter === "favorites" ? "all" : "favorites")}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      quickFilter === "favorites"
                        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Star size={13} className="text-yellow-500 fill-yellow-500" />
                      <span>Favoritas</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {anotacoes.filter((a) => a.isFavorite).length}
                    </span>
                  </button>
                </div>

                {/* Prioridades */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Prioridade de Prova:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "alta", label: "Alta", color: "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40" },
                      { id: "media", label: "Média", color: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40" },
                      { id: "baixa", label: "Baixa", color: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setQuickFilter(quickFilter === p.id ? "all" : (p.id as any))}
                        className={cn(
                          "py-1 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer",
                          quickFilter === p.id
                            ? p.color
                            : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Origem da Anotação */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Origem:
                  </label>
                  <div className="space-y-1">
                    {[
                      { id: "all", label: "Todas as Origens" },
                      { id: "question", label: "Questões Médicas" },
                      { id: "simulado", label: "Simulados" },
                      { id: "manual", label: "Manuais / Próprias" },
                      { id: "atelie", label: "Ateliê / Tutoria" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSourceFilter(s.id)}
                        className={cn(
                          "w-full text-left px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between",
                          sourceFilter === s.id
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        <span>{s.label}</span>
                        {sourceFilter === s.id && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

        {/* Right Column: Content Studio or Notes List */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          {editingNote ? (
            /* ========================================================= */
            /* 3. PROFESSIONAL NOTE STUDIO & WORKSTATION                 */
            /* ========================================================= */
            <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              {/* Studio Header Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs transition-colors cursor-pointer"
                    title="Voltar à lista de anotações"
                  >
                    <ArrowLeft size={14} />
                    <span>Voltar à Lista</span>
                  </button>

                  {/* Destination Folder Selector */}
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-xl text-xs">
                    <FolderIcon size={13} className="text-amber-500" />
                    <select
                      value={editFolderId}
                      onChange={(e) => {
                        setEditFolderId(e.target.value);
                        setIsDirty(true);
                      }}
                      className="bg-transparent text-gray-800 dark:text-gray-200 font-semibold outline-none cursor-pointer text-xs"
                    >
                      {relevantFolders.map((f) => (
                        <option key={f.id} value={f.id} className="dark:bg-[#1A1D27]">
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority, Pin, Favorite & Save Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Priority Selector */}
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#0F1117] p-1 rounded-xl border border-gray-200 dark:border-gray-800">
                    {(["baixa", "media", "alta"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setEditPriority(p);
                          setIsDirty(true);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer",
                          editPriority === p
                            ? p === "alta"
                              ? "bg-rose-500 text-white shadow-2xs"
                              : p === "media"
                              ? "bg-amber-500 text-white shadow-2xs"
                              : "bg-emerald-500 text-white shadow-2xs"
                            : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Pin toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isNewNote && editingNote) {
                        togglePinAnotacao(editingNote.id);
                        setEditingNote((prev) => (prev ? { ...prev, isPinned: !prev.isPinned } : null));
                      }
                    }}
                    className={cn(
                      "p-2 rounded-xl border transition-colors cursor-pointer",
                      editingNote?.isPinned
                        ? "bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-600"
                        : "border-gray-200 dark:border-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                    title={editingNote?.isPinned ? "Desafixar anotação" : "Fixar anotação no topo"}
                  >
                    <Pin size={15} className={editingNote?.isPinned ? "fill-amber-500" : ""} />
                  </button>

                  {/* Favorite toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isNewNote && editingNote) {
                        toggleFavoriteAnotacao(editingNote.id);
                        setEditingNote((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
                      }
                    }}
                    className={cn(
                      "p-2 rounded-xl border transition-colors cursor-pointer",
                      editingNote?.isFavorite
                        ? "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-300 text-yellow-600"
                        : "border-gray-200 dark:border-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                    title={editingNote?.isFavorite ? "Remover dos favoritos" : "Marcar como favorita"}
                  >
                    <Star size={15} className={editingNote?.isFavorite ? "fill-yellow-500" : ""} />
                  </button>

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{isDirty ? "Salvar Alterações" : "Salvo"}</span>
                  </button>
                </div>
              </div>

              {/* Title & Metadata inputs */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Título da Anotação (ex: Critérios de Centor para Faringite)..."
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full text-lg sm:text-2xl font-black text-gray-900 dark:text-white bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 border-b border-gray-200 dark:border-gray-800 pb-2 focus:border-amber-500 dark:focus:border-amber-400 transition-colors"
                />

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0F1117] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                    <Stethoscope size={13} className="text-amber-500" />
                    <input
                      type="text"
                      placeholder="Especialidade (ex: Infectologia)"
                      value={editMateria}
                      onChange={(e) => {
                        setEditMateria(e.target.value);
                        setIsDirty(true);
                      }}
                      className="bg-transparent outline-none text-xs w-36 placeholder:text-gray-400 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0F1117] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                    <FileText size={13} className="text-amber-500" />
                    <input
                      type="text"
                      placeholder="Subtema (ex: Conduta & Diagnóstico)"
                      value={editSubtema}
                      onChange={(e) => {
                        setEditSubtema(e.target.value);
                        setIsDirty(true);
                      }}
                      className="bg-transparent outline-none text-xs w-44 placeholder:text-gray-400 font-medium"
                    />
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {editTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-amber-200 dark:border-amber-800"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-500 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#0F1117] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-800">
                      <Tag size={11} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="+ tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        className="bg-transparent outline-none text-[11px] w-14 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. PRODUCTIVITY RICH TOOLBAR */}
              <div className="bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-gray-800 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2.5">
                {/* Formatting Tools */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertSnippet("# ", "", "Título Principal")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Título H1"
                  >
                    <Heading1 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("## ", "", "Subtítulo H2")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Subtítulo H2"
                  >
                    <Heading2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("### ", "", "Seção H3")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Seção H3"
                  >
                    <Heading3 size={15} />
                  </button>

                  <span className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                  <button
                    type="button"
                    onClick={() => insertSnippet("**", "**", "texto em negrito")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Negrito"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("*", "*", "texto em itálico")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Itálico"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("- ", "", "Item da lista")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Lista com marcadores"
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("1. ", "", "Passo numerado")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Lista numerada"
                  >
                    <ListOrdered size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("- [ ] ", "", "Checklist de estudo")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Checklist / Tarefa"
                  >
                    <CheckSquare size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("\n---\n")}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Linha Divisória"
                  >
                    <Minus size={15} />
                  </button>

                  <span className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                  {/* Medical Callouts dropdown / quick buttons */}
                  <button
                    type="button"
                    onClick={() => insertCallout("dica")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100/70 hover:bg-amber-200/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 transition-colors cursor-pointer"
                    title="Inserir Macete de Prova"
                  >
                    <Lightbulb size={13} />
                    <span>Macete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertCallout("alerta")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100/70 hover:bg-rose-200/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 transition-colors cursor-pointer"
                    title="Inserir Alerta Clínico / Red Flag"
                  >
                    <AlertTriangle size={13} />
                    <span>Red Flag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertCallout("criterios")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100/70 hover:bg-blue-200/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 transition-colors cursor-pointer"
                    title="Inserir Critérios Diagnósticos"
                  >
                    <Bookmark size={13} />
                    <span>Critérios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertCallout("tratamento")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors cursor-pointer"
                    title="Inserir Conduta / Tratamento"
                  >
                    <Pill size={13} />
                    <span>Conduta</span>
                  </button>
                </div>

                {/* Editor View Tabs: Editar, Preview, Split */}
                <div className="flex items-center bg-gray-200/60 dark:bg-gray-800 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                      editorTab === "edit"
                        ? "bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                      editorTab === "preview"
                        ? "bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    Visualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("split")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer hidden md:inline-block",
                      editorTab === "split"
                        ? "bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    Lado a Lado
                  </button>
                </div>
              </div>

              {/* 5. EDITOR & PREVIEW AREA */}
              <div className="min-h-[380px]">
                {editorTab === "edit" && (
                  <textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Escreva sua anotação clínica aqui... Use Markdown, dicas de prova, posologias e critérios diagnósticos."
                    rows={16}
                    className="w-full bg-transparent font-sans text-sm text-gray-800 dark:text-gray-200 leading-relaxed outline-none resize-y p-3 rounded-2xl border border-gray-200 dark:border-gray-800 focus:border-amber-500 dark:focus:border-amber-400 transition-colors"
                  />
                )}

                {editorTab === "preview" && (
                  <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0F1117] min-h-[380px] text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-3">
                    {renderFormattedText(editContent || "*Nenhum conteúdo digitado ainda.*")}
                  </div>
                )}

                {editorTab === "split" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={(e) => {
                        setEditContent(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Editor Markdown..."
                      rows={16}
                      className="w-full bg-transparent font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed outline-none resize-none p-3 rounded-2xl border border-gray-200 dark:border-gray-800 focus:border-amber-500 dark:focus:border-amber-400 transition-colors"
                    />
                    <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0F1117] max-h-[460px] overflow-y-auto text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-3">
                      {renderFormattedText(editContent || "*Prévia formatada aparecerá aqui...*")}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. AI POWERHOUSE ACTIONS ROW */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mr-1">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Ferramentas IA:</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleAiExpand}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Expandir com IA</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateFlashcards}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 font-bold text-xs border border-cyan-200 dark:border-cyan-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Layers size={13} />
                    <span>Criar Flashcards</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateQuestion}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <HelpCircle size={13} />
                    <span>Gerar Questão</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${editTitle}\n\n${editContent}`);
                      toast.success("Conteúdo copiado!");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>Copiar Texto</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isViewingFolders ? (
            /* ========================================================= */
            /* 4A. FOLDER SYSTEM & ORGANIZATION PREVIEW                  */
            /* ========================================================= */
            <div className="space-y-6">
              {/* Executive Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] p-4 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                    <FolderIcon size={14} className="text-amber-500" />
                    <span>Pastas de Estudo</span>
                  </div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {displayFolders.length}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Categorias organizadas</p>
                </div>

                <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] p-4 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                    <NotebookPen size={14} className="text-blue-500" />
                    <span>Total de Anotações</span>
                  </div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {anotacoes.length}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Notas e macetes salvos</p>
                </div>

                <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] p-4 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                    <Pin size={14} className="text-amber-500" />
                    <span>Fixadas & Destaques</span>
                  </div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {anotacoes.filter((a) => a.isPinned).length}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Anotações no topo</p>
                </div>

                <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] p-4 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                    <AlertTriangle size={14} className="text-rose-500" />
                    <span>Alta Prioridade</span>
                  </div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {anotacoes.filter((a) => a.priority === "alta").length}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Regras de ouro de prova</p>
                </div>
              </div>

              {/* Folders System Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <FolderIcon size={16} className="text-amber-500" />
                    <span>Pastas de Anotações Médicas</span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Selecione uma pasta para visualizar suas anotações ou crie uma nova pasta temática.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewAllNotes(true)}
                    className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Ver Todas em Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFolderToEdit(null);
                      setIsFolderModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    <FolderPlus size={14} />
                    <span>Nova Pasta</span>
                  </button>
                </div>
              </div>

              {/* Folders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {displayFolders.map((folder) => {
                  const folderNotes = anotacoes.filter((a) => (a.folderId || "folder-geral") === folder.id);
                  const folderColor = folder.color || "#F59E0B";
                  const pinnedCount = folderNotes.filter((a) => a.isPinned).length;

                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setViewAllNotes(false);
                      }}
                      className="group relative bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-xl p-4 hover:border-amber-400 dark:hover:border-amber-500/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-left"
                    >
                      <div>
                        {/* Top Row: Icon & Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                            style={{
                              backgroundColor: `${folderColor}18`,
                              color: folderColor,
                              border: `1px solid ${folderColor}30`,
                            }}
                          >
                            <FolderIcon size={18} className="fill-current" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            {pinnedCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                                <Pin size={9} className="fill-amber-500" />
                                <span>{pinnedCount}</span>
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              {folderNotes.length} {folderNotes.length === 1 ? "nota" : "notas"}
                            </span>
                          </div>
                        </div>

                        {/* Folder Title */}
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white mt-2.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {folder.name}
                        </h3>
                      </div>

                      {/* Footer: Open action */}
                      <div className="mt-3.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <span>Abrir pasta</span>
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}

                {/* Card Adicionar Pasta */}
                <div
                  onClick={() => {
                    setFolderToEdit(null);
                    setIsFolderModalOpen(true);
                  }}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-gray-50/40 dark:bg-gray-800/20 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 group min-h-[140px]"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                    <Plus size={18} />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    Criar Nova Pasta
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs">
                    Organize suas anotações médicas.
                  </p>
                </div>
              </div>

              {/* Seção Destaques: Anotações Fixadas */}
              {anotacoes.filter((a) => a.isPinned).length > 0 && (
                <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <Pin size={15} className="text-amber-500 fill-amber-500" />
                      <span>Anotações Fixadas & Regras de Ouro</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setViewAllNotes(true)}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Ver Todas as Anotações ({anotacoes.length}) &rarr;
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {anotacoes.filter((a) => a.isPinned).slice(0, 4).map((note) => {
                      const f = folders.find((fld) => fld.id === note.folderId);
                      return (
                        <div
                          key={note.id}
                          onClick={() => openEditor(note, false)}
                          className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400 transition-all cursor-pointer group text-left space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 flex items-center gap-1">
                              <Pin size={10} className="fill-amber-500" />
                              <span>{f?.name || "Geral"}</span>
                            </span>
                            {renderPriorityBadge(note.priority)}
                          </div>
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            {note.title}
                          </h4>
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                            {note.content.replace(/[#*>`]/g, "").slice(0, 110)}...
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* 4B. NOTE CARDS LIST / GRID INSIDE FOLDER                  */
            /* ========================================================= */
            <div className="space-y-4">
              {/* Folder Navigation Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A1D27] p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const parentId = (activeFolder as any)?.parentId || null;
                      setSelectedFolderId(parentId);
                      setViewAllNotes(false);
                      setSearchQuery("");
                      setQuickFilter("all");
                      setSourceFilter("all");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs transition-colors cursor-pointer"
                    title="Voltar ao Sistema de Pastas"
                  >
                    <ArrowLeft size={14} />
                    <span>
                      {(activeFolder as any)?.parentId
                        ? `Voltar para "${relevantFolders.find((f) => f.id === (activeFolder as any).parentId)?.name || "Pasta Anterior"}"`
                        : "Voltar para Pastas"}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {selectedFolderId && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${activeFolder?.color || "#F59E0B"}20`,
                          color: activeFolder?.color || "#F59E0B",
                        }}
                      >
                        <FolderIcon size={15} className="fill-current" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                        {selectedFolderId
                          ? activeFolder?.name || "Pasta de Anotações"
                          : searchQuery
                          ? `Busca: "${searchQuery}"`
                          : quickFilter !== "all"
                          ? `Filtro: ${quickFilter.toUpperCase()}`
                          : "Todas as Anotações"}
                      </h2>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {filteredNotes.length} {filteredNotes.length === 1 ? "anotação encontrada" : "anotações encontradas"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 text-xs transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>{selectedFolderId ? "Nova Anotação nesta Pasta" : "Nova Anotação"}</span>
                </button>
              </div>

              {/* Subpastas no início da pasta aberta */}
              {selectedFolderId && (
                <SubfoldersGrid
                  parentFolderId={selectedFolderId}
                  parentFolderName={activeFolder?.name}
                  folders={relevantFolders}
                  getItemCount={(folderId) => {
                    const getDescendants = (id: string): string[] => {
                      const children = relevantFolders.filter((f) => f.parentId === id).map((f) => f.id);
                      return [id, ...children.flatMap(getDescendants)];
                    };
                    const targetIds = new Set(getDescendants(folderId));
                    return anotacoes.filter((a) => {
                      const eff =
                        !a.folderId || a.folderId === "folder-geral" || !relevantFolderIds.has(a.folderId)
                          ? "anot-macetes"
                          : a.folderId;
                      return targetIds.has(eff);
                    }).length;
                  }}
                  itemLabel={{ singular: "anotação", plural: "anotações" }}
                  onSelectFolder={(subId) => {
                    setSelectedFolderId(subId);
                    setViewAllNotes(false);
                  }}
                />
              )}

              {/* Sub-header Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A1D27] p-3.5 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
                {/* Search */}
                <div className="relative flex-1 w-full max-w-xl">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    placeholder="Pesquisar anotações, macetes, tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-gray-800 text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:border-amber-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Sort & View Mode */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0F1117] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
                    <ArrowUpDown size={12} className="text-gray-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs"
                    >
                      <option value="recent" className="dark:bg-[#1A1D27]">Mais Recentes</option>
                      <option value="priority" className="dark:bg-[#1A1D27]">Prioridade (Alta)</option>
                      <option value="title" className="dark:bg-[#1A1D27]">Título (A-Z)</option>
                    </select>
                  </div>

                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        viewMode === "grid"
                          ? "bg-white dark:bg-[#1A1D27] text-amber-500 shadow-2xs font-bold"
                          : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      )}
                      title="Visualização em Grade"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        viewMode === "list"
                          ? "bg-white dark:bg-[#1A1D27] text-amber-500 shadow-2xs font-bold"
                          : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      )}
                      title="Visualização em Lista Compacta"
                    >
                      <ListIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Note Cards Grid */}
              {filteredNotes.length > 0 ? (
                <div
                  className={cn(
                    "grid gap-3",
                    viewMode === "grid"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                      : "grid-cols-1 max-w-2xl"
                  )}
                >
                  {filteredNotes.map((note) => {
                    const noteFolder = relevantFolders.find((f) => f.id === note.folderId);

                    return (
                      <div
                        key={note.id}
                        onClick={() => openEditor(note, false)}
                        className={cn(
                          "group relative bg-white dark:bg-[#1A1D27] border rounded-xl p-3.5 sm:p-4 transition-all hover:border-amber-400/80 hover:shadow-md cursor-pointer flex flex-col justify-between text-left",
                          note.isPinned
                            ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10"
                            : "border-gray-200 dark:border-[#2a2d3a]"
                        )}
                      >
                        <div className="space-y-2">
                          {/* Top row: Priority, Folder & Action Icons */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              {renderPriorityBadge(note.priority)}
                              {noteFolder && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                  <FolderIcon size={10} className="text-amber-500 shrink-0" />
                                  <span className="truncate">{noteFolder.name}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinAnotacao(note.id);
                                }}
                                className={cn(
                                  "p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                                  note.isPinned ? "text-amber-500" : "text-gray-400 opacity-0 group-hover:opacity-100"
                                )}
                                title={note.isPinned ? "Desafixar" : "Fixar no topo"}
                              >
                                <Pin size={12} className={note.isPinned ? "fill-amber-500" : ""} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteAnotacao(note.id);
                                }}
                                className={cn(
                                  "p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                                  note.isFavorite ? "text-yellow-500" : "text-gray-400 opacity-0 group-hover:opacity-100"
                                )}
                                title={note.isFavorite ? "Favorita" : "Favoritar"}
                              >
                                <Star size={12} className={note.isFavorite ? "fill-yellow-500" : ""} />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {note.title}
                          </h3>

                          {/* Content Snippet */}
                          <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                            {note.content.replace(/[#*>`]/g, "").slice(0, 160)}...
                          </p>

                          {/* Origin Question info if available */}
                          {note.source && (
                            <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/40 flex items-center gap-1 truncate">
                              <HelpCircle size={10} className="shrink-0" />
                              <span className="truncate">Origem: {note.source.title}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Tags & Actions */}
                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2 text-[10px] text-gray-400">
                          <div className="flex flex-wrap items-center gap-1 min-w-0">
                            <span className="font-medium shrink-0">{note.createdAt || "Hoje"}</span>
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {note.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {note.tags.length > 2 && (
                                  <span className="text-[9px] text-gray-400 font-medium">
                                    +{note.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
                                toast.success("Anotação copiada!");
                              }}
                              className="p-1 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                              title="Copiar texto"
                            >
                              <Copy size={12} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnotacao(note.id);
                                toast.success("Anotação enviada para a lixeira.");
                              }}
                              className="p-1 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="bg-white dark:bg-[#1A1D27] border border-dashed border-gray-300 dark:border-[#2a2d3a] rounded-3xl p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center">
                    <NotebookPen size={28} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Nenhuma anotação encontrada
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                      {searchQuery
                        ? "Nenhum resultado para a busca. Tente buscar por outros termos ou limpe o filtro."
                        : "Crie macetes clínicos, regras de ouro e critérios diagnósticos organizados em pastas."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Criar Primeira Anotação</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FolderManagerModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        defaultType="anotacoes"
        folderToEdit={folderToEdit}
        onFolderCreated={(newFolderId) => {
          setSelectedFolderId(newFolderId);
          setViewAllNotes(false);
          toast.success("Pasta criada com sucesso!");
        }}
      />
    </div>
  );
}

export default function AnotacoesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Carregando anotações...</div>}>
      <AnotacoesContent />
    </Suspense>
  );
}
