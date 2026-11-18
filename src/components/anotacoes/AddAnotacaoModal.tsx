"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  NotebookPen,
  Folder,
  Plus,
  Tag,
  Highlighter,
  Trash2,
  Save,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Flame,
  Zap,
  Leaf,
  Bold,
  List,
  Quote,
} from "lucide-react";
import {
  useAppStore,
  AnotacaoItem,
  AnotacaoHighlight,
  AnotacaoFolder,
} from "@/stores/useAppStore";
import toast from "react-hot-toast";

export interface AnotacaoInitialInput {
  title?: string;
  content?: string;
  folderId?: string;
  materia?: string;
  subtema?: string;
  priority?: "alta" | "media" | "baixa";
  tags?: string[];
  highlights?: Array<{
    text: string;
    color: "yellow" | "green" | "pink" | "blue" | "purple";
    tag?: string;
  }>;
  source?: {
    type: "question" | "simulado" | "atelie" | "flashcard" | "manual";
    title: string;
    originId?: string;
    snippet?: string;
    originalQuestion?: {
      text: string;
      options?: Array<{ id: string; text: string }>;
      userAnswer?: string;
      correctAnswer: string;
      explanation?: string;
    };
  };
}

interface AddAnotacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: AnotacaoInitialInput;
  onSuccess?: (savedItem: AnotacaoItem) => void;
}

const HIGHLIGHT_COLORS: Array<{
  id: "yellow" | "green" | "pink" | "blue" | "purple";
  name: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}> = [
  {
    id: "yellow",
    name: "Amarelo",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-900 dark:text-amber-200",
    dot: "bg-amber-400",
  },
  {
    id: "green",
    name: "Verde",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-900 dark:text-emerald-200",
    dot: "bg-emerald-400",
  },
  {
    id: "pink",
    name: "Rosa",
    bg: "bg-rose-100 dark:bg-rose-950/40",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-900 dark:text-rose-200",
    dot: "bg-rose-400",
  },
  {
    id: "blue",
    name: "Azul",
    bg: "bg-blue-100 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-900 dark:text-blue-200",
    dot: "bg-blue-400",
  },
  {
    id: "purple",
    name: "Roxo",
    bg: "bg-purple-100 dark:bg-purple-950/40",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-900 dark:text-purple-200",
    dot: "bg-purple-400",
  },
];

export default function AddAnotacaoModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: AddAnotacaoModalProps) {
  const router = useRouter();
  const { anotacaoFolders, addAnotacao, addAnotacaoFolder } = useAppStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState<string>("anot-geral");
  const [materia, setMateria] = useState("");
  const [subtema, setSubtema] = useState("");
  const [priority, setPriority] = useState<"alta" | "media" | "baixa">("media");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [highlights, setHighlights] = useState<AnotacaoHighlight[]>([]);

  // Highlight draft
  const [highlightText, setHighlightText] = useState("");
  const [highlightColor, setHighlightColor] = useState<
    "yellow" | "green" | "pink" | "blue" | "purple"
  >("yellow");
  const [highlightTag, setHighlightTag] = useState("Regra de Ouro");

  // Inline folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#EAB308");

  // Show source details
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setFolderId(initialData.folderId || (anotacaoFolders[0]?.id ?? "anot-geral"));
      setMateria(initialData.materia || "");
      setSubtema(initialData.subtema || "");
      setPriority(initialData.priority || "media");
      setTags(initialData.tags || []);
      if (initialData.highlights && initialData.highlights.length > 0) {
        setHighlights(
          initialData.highlights.map((h, i) => ({
            id: `hl-${Date.now()}-${i}`,
            text: h.text,
            color: h.color,
            tag: h.tag,
            createdAt: "Agora",
          }))
        );
      } else {
        setHighlights([]);
      }
    } else {
      setTitle("");
      setContent("");
      setFolderId(anotacaoFolders[0]?.id ?? "anot-geral");
      setMateria("");
      setSubtema("");
      setPriority("media");
      setTags([]);
      setHighlights([]);
    }

    setHighlightText("");
    setIsCreatingFolder(false);
    setIsSourceExpanded(false);
  }, [isOpen, initialData, anotacaoFolders]);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, "");
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddHighlight = () => {
    if (!highlightText.trim()) return;
    const newHl: AnotacaoHighlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: highlightText.trim(),
      color: highlightColor,
      tag: highlightTag.trim() || undefined,
      createdAt: "Agora",
    };
    setHighlights([...highlights, newHl]);
    setHighlightText("");
  };

  const handleRemoveHighlight = (id: string) => {
    setHighlights(highlights.filter((h) => h.id !== id));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const created = {
      id: `anot-folder-${Date.now()}`,
      name: newFolderName.trim(),
      color: newFolderColor,
      createdAt: "Hoje",
    };
    addAnotacaoFolder(created);
    setFolderId(created.id);
    setNewFolderName("");
    setIsCreatingFolder(false);
    toast.success(`Pasta "${created.name}" criada!`);
  };

  const handleSave = (openTab: boolean = false) => {
    if (!title.trim() && !content.trim()) {
      toast.error("Preencha ao menos o título ou conteúdo da anotação.");
      return;
    }

    const finalTitle = title.trim() || (initialData?.source?.title ? `Nota: ${initialData.source.title}` : "Anotação Sem Título");

    const saved = addAnotacao({
      title: finalTitle,
      content: content.trim(),
      folderId: folderId || undefined,
      materia: materia.trim() || undefined,
      subtema: subtema.trim() || undefined,
      priority,
      tags,
      highlights,
      source: initialData?.source,
      isPinned: false,
      isFavorite: false,
      colorTheme: highlightColor,
    });

    toast.success(
      (t) => (
        <div className="flex items-center gap-2">
          <span>Anotação salva com sucesso!</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              router.push(`/anotacoes?id=${saved.id}`);
            }}
            className="text-xs font-bold text-yellow-600 dark:text-yellow-400 underline cursor-pointer"
          >
            Ver Anotação
          </button>
        </div>
      ),
      { duration: 4000 }
    );

    if (onSuccess) {
      onSuccess(saved);
    }

    onClose();

    if (openTab) {
      router.push(`/anotacoes?id=${saved.id}`);
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    setContent((prev) => prev + `\n${prefix} ` + (suffix ? suffix : ""));
  };

  const hasOriginalQuestion = !!initialData?.source?.originalQuestion;
  const origQ = initialData?.source?.originalQuestion;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1A1D27] rounded-3xl p-5 sm:p-7 max-w-2xl w-full border border-slate-200 dark:border-[#2a2d3a] shadow-2xl relative flex flex-col max-h-[92vh] my-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <NotebookPen size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Nova Anotação Importante</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300">
                  Destaques & Fichas
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Capture ideias, macetes de prova e pontos críticos organizados por pasta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
          {/* Card de Origem Externa (se veio de Questão/Simulado) */}
          {hasOriginalQuestion && origQ && (
            <div className="rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/40 dark:bg-violet-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsSourceExpanded(!isSourceExpanded)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-violet-100/40 dark:hover:bg-violet-900/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-violet-800 dark:text-violet-300">
                  <HelpCircle size={15} />
                  <span>Vinculado a Questão: {initialData?.source?.title || "Questão de Prova"}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                  <span>{isSourceExpanded ? "Recolher" : "Ver Enunciado & Gabarito"}</span>
                  {isSourceExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {isSourceExpanded && (
                <div className="px-4 py-3 border-t border-violet-200/70 dark:border-violet-900/40 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-medium whitespace-pre-wrap leading-relaxed">
                    {origQ.text}
                  </p>
                  {origQ.correctAnswer && (
                    <div className="flex items-center gap-2 pt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={13} />
                      <span>Gabarito Oficial: Alternativa ({origQ.correctAnswer.toUpperCase()})</span>
                    </div>
                  )}
                  {origQ.explanation && (
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-[#10121a]/80 border border-violet-200/50 dark:border-violet-900/40 text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      <strong>Comentário:</strong> {origQ.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Título */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Título da Anotação <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Critérios de Centor / Fisiopatologia do Choque Séptico..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500"
            />
          </div>

          {/* Pasta & Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Seletor de Pasta */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Folder size={13} className="text-yellow-500" />
                  <span>Pasta Organizadora</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Plus size={11} />
                  <span>{isCreatingFolder ? "Fechar" : "Nova Pasta"}</span>
                </button>
              </div>

              {!isCreatingFolder ? (
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 cursor-pointer"
                >
                  {anotacaoFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 p-1 rounded-xl border border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nome da pasta..."
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-[#10121a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  />
                  <input
                    type="color"
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    title="Escolher cor da pasta"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Criar
                  </button>
                </div>
              )}
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nível de Relevância / Prioridade
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPriority("baixa")}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    priority === "baixa"
                      ? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Leaf size={12} className="text-emerald-500" />
                  <span>Baixa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("media")}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    priority === "media"
                      ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Zap size={12} className="text-amber-500" />
                  <span>Média</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("alta")}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    priority === "alta"
                      ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700 font-black"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Flame size={12} className="text-rose-500" />
                  <span>Alta 🔥</span>
                </button>
              </div>
            </div>
          </div>

          {/* Matéria & Subtema */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Especialidade / Matéria
              </label>
              <input
                type="text"
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                placeholder="Ex: Pediatria, Clínica Médica..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Subtema ou Assunto
              </label>
              <input
                type="text"
                value={subtema}
                onChange={(e) => setSubtema(e.target.value)}
                placeholder="Ex: Faringite Estreptocócica..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          {/* Seção Especial: Coisas a Destacar (Highlights Rápidos) */}
          <div className="p-3.5 rounded-2xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/30 dark:bg-yellow-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-1.5">
                <Highlighter size={14} className="text-yellow-500" />
                <span>Coisas a Destacar / Marca-Texto Rápido</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {highlights.length} {highlights.length === 1 ? "destaque" : "destaques"}
              </span>
            </div>

            {/* Lista de Destaques já adicionados */}
            {highlights.length > 0 && (
              <div className="space-y-2">
                {highlights.map((hl) => {
                  const colorConfig =
                    HIGHLIGHT_COLORS.find((c) => c.id === hl.color) || HIGHLIGHT_COLORS[0];
                  return (
                    <div
                      key={hl.id}
                      className={`p-2.5 rounded-xl border ${colorConfig.bg} ${colorConfig.border} flex items-start justify-between gap-2.5`}
                    >
                      <div className="space-y-1 min-w-0">
                        {hl.tag && (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/40 text-slate-800 dark:text-slate-200">
                            {hl.tag}
                          </span>
                        )}
                        <p className={`text-xs font-semibold leading-relaxed ${colorConfig.text}`}>
                          "{hl.text}"
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(hl.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer shrink-0"
                        title="Remover destaque"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input para adicionar novo destaque */}
            <div className="space-y-2 pt-1">
              <textarea
                rows={2}
                value={highlightText}
                onChange={(e) => setHighlightText(e.target.value)}
                placeholder="Digite a frase de ouro, mnemônico ou pegadinha a destacar..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10121a] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Seletores de Cor */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Cor:</span>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setHighlightColor(c.id)}
                      className={`w-5 h-5 rounded-full ${c.dot} transition-transform cursor-pointer ${
                        highlightColor === c.id ? "ring-2 ring-slate-900 dark:ring-white scale-110" : "opacity-70 hover:opacity-100"
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Tag Sugerida */}
                <div className="flex items-center gap-1">
                  {["Regra de Ouro", "Pegadinha", "Mnemônico"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setHighlightTag(t)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                        highlightTag === t
                          ? "bg-yellow-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddHighlight}
                  disabled={!highlightText.trim()}
                  className="px-3 py-1 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Adicionar Destaque</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo Completo da Anotação */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Corpo da Anotação (Suporta Markdown)
              </label>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => insertMarkdown("**", "**")}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                  title="Negrito"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("-")}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                  title="Lista"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown(">")}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                  title="Citação"
                >
                  <Quote size={13} />
                </button>
              </div>
            </div>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva livremente suas anotações, sínteses, fisiopatologia, conduta ou detalhes para fixação..."
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500 leading-relaxed font-mono resize-y"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag size={12} className="text-slate-400" />
              <span>Tags / Palavras-chave (Pressione Enter para adicionar)</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1e2230] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-500 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "Ex: pediatria, conduta, prova-r1..." : "+ tag..."}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400 px-1"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Save size={13} />
              <span>Salvar Nota</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Salvar e Abrir Aba</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
