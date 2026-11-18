"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  X,
  Loader2,
  GitBranch,
  Layout,
  Palette,
  ArrowRight,
  Layers,
  Network,
  Paperclip,
  FileText,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface CreateMindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (map: any) => void;
  defaultFolderId?: string | null;
}

const LAYOUTS = [
  {
    id: "free",
    name: "Layout Livre (4 Direções)",
    description: "Nó central livre com ramificações orgânicas para os 4 lados (Esquerda, Direita, Cima, Baixo).",
    icon: GitBranch,
  },
  {
    id: "right",
    name: "Árvore Horizontal",
    description: "Da esquerda para direita. Ideal para resumos e estudos conceituais.",
    icon: Network,
  },
  {
    id: "top-down",
    name: "Organograma (Top-Down)",
    description: "Hierarquia de cima para baixo. Excelente para classificações e processos.",
    icon: Layers,
  },
];

const COLOR_PALETTES = [
  {
    id: "blue",
    name: "Oceano Tecnológico",
    colors: ["#2563EB", "#0284C7", "#0D9488", "#6366F1"],
  },
  {
    id: "purple",
    name: "Criativo & Neon",
    colors: ["#7C3AED", "#A855F7", "#EC4899", "#8B5CF6"],
  },
  {
    id: "green",
    name: "Esmeralda & Menta",
    colors: ["#059669", "#10B981", "#14B8A6", "#84CC16"],
  },
  {
    id: "amber",
    name: "Pôr do Sol & Âmbar",
    colors: ["#D97706", "#F59E0B", "#EA580C", "#FB923C"],
  },
  {
    id: "monochrome",
    name: "Minimalista Grafite",
    colors: ["#1E293B", "#334155", "#475569", "#64748B"],
  },
];

export default function CreateMindMapModal({
  isOpen,
  onClose,
  onCreated,
  defaultFolderId,
}: CreateMindMapModalProps) {
  const [tab, setTab] = useState<"ai" | "manual">("ai");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedLayout, setSelectedLayout] = useState("free");
  const [selectedPalette, setSelectedPalette] = useState("blue");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandStructure, setExpandStructure] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      mimeType: string;
      data: string;
    }>
  >([]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const newFile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          mimeType: file.type || "application/pdf",
          data: result,
        };

        setAttachedFiles((prev) => [...prev, newFile]);

        // Auto-suggest title based on the first attached document name if currently empty
        if (!title.trim()) {
          const cleanName = file.name.replace(/\.[^/.]+$/, "");
          setTitle(cleanName);
        }
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${files.length} arquivo(s) anexado(s) como base do mapa mental!`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerateWithAI = async () => {
    const hasFiles = attachedFiles.length > 0;
    const query = prompt.trim() || title.trim();

    if (!query && !hasFiles) {
      toast.error("Por favor, descreva o tema ou anexe um documento/PDF.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          layout: selectedLayout,
          colorTheme: selectedPalette,
          expand: expandStructure,
          fileAttachments: attachedFiles.map((f) => ({
            name: f.name,
            data: f.data,
            mimeType: f.mimeType,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar mapa mental");
      }

      const data = await res.json();
      const defaultName = hasFiles
        ? attachedFiles[0].name.replace(/\.[^/.]+$/, "")
        : query || "Mapa Mental";

      const newMap = {
        id: Date.now().toString(),
        name: title.trim() || data.title || defaultName,
        description: hasFiles
          ? `Mapa mental gerado com IA a partir de: ${attachedFiles.map((f) => f.name).join(", ")}`
          : `Mapa mental gerado pela IA no layout ${
              LAYOUTS.find((l) => l.id === selectedLayout)?.name
            }`,
        layout: selectedLayout,
        colorTheme: selectedPalette,
        folderId:
          defaultFolderId && defaultFolderId !== "unassigned"
            ? defaultFolderId
            : "folder-mm-geral",
        date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
        nodes: data.nodes || [],
        edges: data.edges || [],
      };

      onCreated(newMap);
      toast.success("Mapa mental gerado com sucesso a partir do conteúdo!");
      onClose();
    } catch (error: any) {
      console.error("Erro na geração do mapa mental:", error);
      toast.error(error.message || "Erro ao gerar mapa mental");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateBlank = () => {
    const mapTitle = title.trim() || "Novo Mapa Mental";
    const palette = COLOR_PALETTES.find((p) => p.id === selectedPalette)?.colors || ["#2563EB", "#0284C7"];

    // Default template nodes based on layout
    const rootNode = {
      id: "root",
      type: "topic",
      position: { x: selectedLayout === "top-down" ? 400 : 150, y: selectedLayout === "top-down" ? 80 : 300 },
      data: { label: mapTitle, color: palette[0] },
    };

    const sub1 = {
      id: "sub-1",
      type: "subtopic",
      position: selectedLayout === "top-down" ? { x: 250, y: 220 } : { x: 450, y: 200 },
      data: { label: "Subtópico 1", color: palette[1] },
    };

    const sub2 = {
      id: "sub-2",
      type: "subtopic",
      position: selectedLayout === "top-down" ? { x: 550, y: 220 } : { x: 450, y: 400 },
      data: { label: "Subtópico 2", color: palette[2] || palette[1] },
    };

    const newMap = {
      id: Date.now().toString(),
      name: mapTitle,
      description: `Mapa mental manual no layout ${LAYOUTS.find((l) => l.id === selectedLayout)?.name}`,
      layout: selectedLayout,
      colorTheme: selectedPalette,
      folderId:
        defaultFolderId && defaultFolderId !== "unassigned"
          ? defaultFolderId
          : "folder-mm-geral",
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      nodes: [rootNode, sub1, sub2],
      edges: [
        { id: "e-root-1", source: "root", target: "sub-1", type: "smoothstep" },
        { id: "e-root-2", source: "root", target: "sub-2", type: "smoothstep" },
      ],
    };

    onCreated(newMap);
    toast.success("Mapa mental em branco criado!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Criar Mapa Mental
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gere com IA por tema, a partir de documentos anexados (PDF/Word) ou em branco
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="flex border-b border-gray-200 dark:border-[#2a2d3a] px-6 bg-gray-50 dark:bg-[#0F1117]/50">
          <button
            type="button"
            onClick={() => setTab("ai")}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer",
              tab === "ai"
                ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400"
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar com IA / Anexar PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer",
              tab === "manual"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400"
            )}
          >
            <Layout className="w-4 h-4" />
            <span>Criar em Branco</span>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* File Attachment Section in AI Mode */}
          {tab === "ai" && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-purple-500" />
                  <span>Anexar Material de Estudo (PDF, Slides ou Word)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    Opcional
                  </span>
                </label>

                {attachedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFiles}
                    disabled={isGenerating}
                    className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Remover anexos ({attachedFiles.length})
                  </button>
                )}
              </div>

              {attachedFiles.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-gray-300 dark:border-[#2a2d3a] hover:border-purple-500 dark:hover:border-purple-500 bg-gray-50/50 dark:bg-[#0F1117] text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all cursor-pointer group"
                >
                  <FileText className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span>Clique para anexar PDF, apostila ou documento para gerar o mapa mental a partir dele</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {file.size} • Material-base para estruturação do mapa
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          disabled={isGenerating}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-md cursor-pointer"
                          title="Remover este anexo"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-purple-300 dark:border-purple-800 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar mais PDFs ou materiais</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Title / Prompt */}
          {tab === "ai" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  {attachedFiles.length > 0
                    ? "Instruções adicionais ou foco específico (Opcional)"
                    : "Qual assunto você quer estruturar em Mapa Mental?"}
                </label>
                <textarea
                  rows={attachedFiles.length > 0 ? 2 : 3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  placeholder={
                    attachedFiles.length > 0
                      ? "Ex: Foque nos capítulos principais, mecanismos de ação e termos-chave... (Se deixar em branco, todo o documento será sintetizado)"
                      : "Ex: Fisiologia Renal: néfrons, filtração glomerular, reabsorção e hormônios..."
                  }
                  className="w-full rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-gray-50 dark:bg-[#0F1117] p-3.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Nome do Mapa Mental (Opcional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isGenerating}
                  placeholder={
                    attachedFiles.length > 0
                      ? attachedFiles[0]?.name.replace(/\.[^/.]+$/, "")
                      : "Deixe em branco para a IA sugerir"
                  }
                  className="w-full rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-gray-50 dark:bg-[#0F1117] px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
                />
              </div>

              {/* Opção Expandir — Só exibe após anexar arquivo */}
              {attachedFiles.length > 0 && (
                <div
                  onClick={() => setExpandStructure(!expandStructure)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                    expandStructure
                      ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-600"
                      : "border-gray-200 dark:border-[#2a2d3a] bg-gray-50/50 dark:bg-[#0F1117]"
                  )}
                >
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>⚡ Estrutura Aprofundada & Expandida</span>
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                        Mais nós e detalhes
                      </span>
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Gera ramificações mais densas e completas com notas conceituais adicionais a partir do documento anexado.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={expandStructure}
                    onChange={(e) => setExpandStructure(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4 ml-3"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Título do Tema Central
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Anatomia Cardíaca"
                className="w-full rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-gray-50 dark:bg-[#0F1117] px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>
          )}

          {/* 1. Escolha de Layout */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-purple-500" />
              1. Escolha o Formato do Layout
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LAYOUTS.map((lay) => {
                const isSelected = selectedLayout === lay.id;
                return (
                  <button
                    key={lay.id}
                    type="button"
                    onClick={() => setSelectedLayout(lay.id)}
                    className={cn(
                      "p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between",
                      isSelected
                        ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-500 shadow-sm"
                        : "border-gray-200 dark:border-[#2a2d3a] hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-[#1A1D27]"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <lay.icon
                        className={cn(
                          "w-4 h-4",
                          isSelected ? "text-purple-600 dark:text-purple-400" : "text-gray-400"
                        )}
                      />
                      <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                        {lay.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                      {lay.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Escolha de Cores / Paleta */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-blue-500" />
              2. Escolha a Paleta de Cores
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COLOR_PALETTES.map((pal) => {
                const isSelected = selectedPalette === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setSelectedPalette(pal.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-2",
                      isSelected
                        ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-500 shadow-sm"
                        : "border-gray-200 dark:border-[#2a2d3a] hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-[#1A1D27]"
                    )}
                  >
                    <span className="font-semibold text-xs text-gray-900 dark:text-white">
                      {pal.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {pal.colors.map((c, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full shadow-xs"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gray-50/50 dark:bg-[#1A1D27]">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          {tab === "ai" ? (
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isGenerating || (!prompt.trim() && !title.trim() && attachedFiles.length === 0)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {attachedFiles.length > 0 ? "Lendo documento e gerando nós..." : "Gerando Nós com IA..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {attachedFiles.length > 0 ? "Gerar Mapa a partir do Anexo" : "Gerar Mapa Mental"}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateBlank}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors shadow-sm cursor-pointer"
            >
              <span>Abrir no Editor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
