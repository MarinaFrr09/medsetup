"use client";

import { FileText, GitBranch, Loader2, Sparkles, Image as ImageIcon, Layout, FolderOpen, Zap, Timer, Trash2, Search, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ImageUploader from "@/components/image-reader/ImageUploader";
import type { BoardData } from "@/components/image-reader/DigitalBoard";
import { useAppStore, type ImageReadingItem } from "@/stores/useAppStore";
import toast from "react-hot-toast";

const TranscriptionDocumentViewer = dynamic(
  () => import("@/components/transcription/TranscriptionDocumentViewer"),
  { ssr: false }
);

const DigitalBoard = dynamic(
  () => import("@/components/image-reader/DigitalBoard"),
  { ssr: false }
);

const EmbeddedMindMapView = dynamic(
  () => import("@/components/image-reader/EmbeddedMindMapView"),
  { ssr: false }
);

export default function ImageReaderPage() {
  const { imageReadings = [], addImageReading, deleteImageReading } = useAppStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [resultType, setResultType] = useState<"board" | "summary" | "mindmap" | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Unified "Expand" toggle applicable to all 3 modes
  const [expandMode, setExpandMode] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(false);

  // Recupera e sincroniza histórico do backup local caso a hidratação inicial do Zustand ainda não tenha concluído
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const backupRaw = localStorage.getItem("medsetup_image_readings");
      if (backupRaw) {
        const backupItems = JSON.parse(backupRaw);
        if (Array.isArray(backupItems) && backupItems.length > 0) {
          const currentIds = new Set((imageReadings || []).map((r) => r.id));
          const missing = backupItems.filter((b: any) => !currentIds.has(b.id));
          if (missing.length > 0) {
            missing.forEach((item: any) => addImageReading(item));
          }
        }
      }
    } catch (e) {
      console.warn("Falha ao recuperar backup de leituras de imagem:", e);
    }
  }, []);

  const filteredHistory = (imageReadings || []).filter((item) => {
    if (!searchHistory.trim()) return true;
    const q = searchHistory.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q) ||
      (item.type && item.type.toLowerCase().includes(q))
    );
  });

  // Timer while AI is processing the image
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, [selectedFile]);

  const handleProcess = async (type: "board" | "summary" | "mindmap") => {
    if (!selectedFile) {
      toast.error("Por favor, selecione ou envie a foto de um quadro ou anotação primeiro.");
      return;
    }

    setIsProcessing(true);
    setResultType(type);
    setResult(null);
    setResultExpanded(expandMode);

    // 10 minutes (600.000 ms) safety ceiling — handles dense images and expanded modes without timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("mode", type);
      formData.append("expand", expandMode ? "true" : "false");

      const res = await fetch("/api/ai/read-image", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao processar imagem");
      }

      const data = await res.json();
      setResult(data);

      const finalImageUrl = data.imageUrl || previewUrl || undefined;
      if (data.imageUrl) {
        setPreviewUrl(data.imageUrl);
      }

      const cleanResult = data && typeof data === "object" ? { ...data } : data;
      if (cleanResult && cleanResult.imageUrl && typeof cleanResult.imageUrl === "string" && cleanResult.imageUrl.startsWith("data:") && cleanResult.imageUrl.length > 50000) {
        cleanResult.imageUrl = undefined;
      }
      const safeImageUrl = finalImageUrl && finalImageUrl.startsWith("data:") && finalImageUrl.length > 50000 ? undefined : finalImageUrl;

      const newHistoryItem: ImageReadingItem = {
        id: `img_read_${Date.now()}`,
        name: (selectedFile.name || "Leitura de Imagem").replace(/\.[^/.]+$/, "").slice(0, 40),
        date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        type,
        result: cleanResult,
        imageUrl: safeImageUrl,
        imageFileName: selectedFile.name,
        expanded: expandMode,
        createdAt: new Date().toISOString(),
      };
      addImageReading(newHistoryItem);
      setSelectedHistoryId(newHistoryItem.id);

      if (type === "board") {
        toast.success(expandMode ? "Quadro Digital Expandido gerado!" : "Quadro Digital gerado!");
      } else if (type === "summary") {
        toast.success(expandMode ? "Resumo Aprofundado gerado!" : "Resumo textual gerado!");
      } else {
        toast.success(expandMode ? "Mapa Mental Expandido extraído!" : "Mapa mental extraído!");
      }
    } catch (error: any) {
      console.error("Erro na leitura de imagem:", error);
      if (error.name === "AbortError") {
        toast.error("O processamento excedeu o limite máximo de tempo.");
      } else {
        const msg = error instanceof Error ? error.message : "Erro no processamento da imagem";
        toast.error(msg);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <ImageIcon className="text-blue-600 dark:text-blue-400 w-8 h-8" />
          Leitura de Imagem e Gerador de Estudos
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Envie fotos de quadros brancos, esquemas clínicos ou cadernos para gerar quadros digitais em folhas A4, resumos textuais ou mapas mentais com exportação em PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <ImageUploader onFileSelected={(file) => setSelectedFile(file)} />

          {/* Unified "Expand" Toggle — Applicable to all 3 options */}
          {selectedFile && (
            <div
              onClick={() => setExpandMode((v) => !v)}
              className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                expandMode
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500 shadow-xs"
                  : "border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] hover:border-amber-300 dark:hover:border-amber-700"
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  expandMode ? "border-amber-500 bg-amber-500" : "border-gray-400 bg-transparent"
                }`}
              >
                {expandMode && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${expandMode ? "text-amber-500" : "text-gray-400"}`} />
                  <span
                    className={`font-bold text-sm ${
                      expandMode ? "text-amber-700 dark:text-amber-400" : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Expandir
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      expandMode
                        ? "bg-amber-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    OPCIONAL
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    expandMode
                      ? "text-amber-700/90 dark:text-amber-400/90 font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {expandMode
                    ? "✅ Ativado para todas as 3 funções — a IA aprofundará as informações com definições completas, contexto clínico/prático, fisiopatologia, exemplos e pontos de prova."
                    : "Ative para aprofundar e enriquecer as informações na geração do Quadro Digital, Resumo em Texto ou Mapa Mental."}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons — dynamically adapt when Expand is active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Quadro Digital */}
            <button
              type="button"
              onClick={() => handleProcess("board")}
              disabled={isProcessing || !selectedFile}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md disabled:opacity-50 cursor-pointer text-white ${
                expandMode
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
              }`}
            >
              {expandMode ? <Zap className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
              <span>{expandMode ? "Gerar Quadro Expandido" : "Gerar Quadro Digital"}</span>
            </button>

            {/* 2. Resumo em Texto */}
            <button
              type="button"
              onClick={() => handleProcess("summary")}
              disabled={isProcessing || !selectedFile}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-xs sm:text-sm transition-all shadow-2xs disabled:opacity-50 cursor-pointer ${
                expandMode
                  ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  : "bg-white dark:bg-[#1A1D27] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2a2d3a]"
              }`}
            >
              <FileText className={`w-4 h-4 ${expandMode ? "text-amber-600" : "text-blue-500"}`} />
              <span>{expandMode ? "Gerar Resumo Expandido (PDF)" : "Resumo em Texto (PDF)"}</span>
            </button>

            {/* 3. Mapa Mental */}
            <button
              type="button"
              onClick={() => handleProcess("mindmap")}
              disabled={isProcessing || !selectedFile}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-xs sm:text-sm transition-all shadow-2xs disabled:opacity-50 cursor-pointer ${
                expandMode
                  ? "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                  : "bg-white dark:bg-[#1A1D27] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2a2d3a]"
              }`}
            >
              <GitBranch className={`w-4 h-4 ${expandMode ? "text-purple-600" : "text-purple-500"}`} />
              <span>{expandMode ? "Gerar Mapa Mental Expandido" : "Gerar Mapa Mental"}</span>
            </button>
          </div>

          {/* Loading Card with Timer */}
          {isProcessing && (
            <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl p-8 shadow-sm text-center">
              <div
                className={`inline-flex p-4 rounded-full mb-3 ${
                  resultExpanded ? "bg-amber-50 dark:bg-amber-950/40" : "bg-blue-50 dark:bg-blue-950/40"
                }`}
              >
                <Loader2 className={`w-8 h-8 animate-spin ${resultExpanded ? "text-amber-600" : "text-blue-600"}`} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {resultType === "board"
                  ? resultExpanded
                    ? "Expandindo e gerando Quadro Digital em folhas A4..."
                    : "Transcrevendo e ilustrando Quadro Digital..."
                  : resultType === "mindmap"
                  ? resultExpanded
                    ? "Construindo Mapa Mental Expandido interativo com árvore de conceitos..."
                    : "Mapeando e organizando Mapa Mental interativo..."
                  : resultExpanded
                  ? "Elaborando Resumo Expandido e aprofundado com IA..."
                  : "Elaborando Resumo Estruturado com IA..."}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                Analisando a imagem em alta resolução. Imagens densas e modos expandidos são processados integralmente sem limites.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono font-medium">
                <Timer className="w-3.5 h-3.5 text-amber-500" />
                <span>Tempo em processamento: {formatElapsed(elapsedSeconds)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Histórico Lateral Persistido */}
        <div>
          <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl overflow-hidden shadow-xs sticky top-6">
            <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3a] bg-gray-50 dark:bg-[#0F1117]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  Histórico de Leituras
                </h3>
                <div className="flex items-center gap-2">
                  {selectedHistoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHistoryId(null);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setResult(null);
                        setResultType(null);
                      }}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Fazer nova leitura de imagem"
                    >
                      <Plus size={12} />
                      <span>Nova</span>
                    </button>
                  )}
                  <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold px-2 py-0.5 rounded-full">
                    {imageReadings.length}
                  </span>
                </div>
              </div>

              {imageReadings.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar leituras salvas..."
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="p-2 divide-y divide-gray-100 dark:divide-gray-800/50 max-h-[500px] overflow-y-auto">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => {
                  const isSelected = selectedHistoryId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedHistoryId(item.id);
                        setResult(item.result);
                        setResultType(item.type);
                        setResultExpanded(!!item.expanded);
                        if (item.imageUrl) setPreviewUrl(item.imageUrl);
                      }}
                      className={`flex items-center justify-between gap-2.5 w-full p-2.5 rounded-xl transition-colors text-left cursor-pointer group ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 shadow-2xs"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-105"
                          }`}
                        >
                          {item.type === "board" ? (
                            item.expanded ? (
                              <Zap size={16} className={isSelected ? "text-amber-300" : "text-amber-500"} />
                            ) : (
                              <Layout size={16} />
                            )
                          ) : item.type === "summary" ? (
                            <FileText size={16} />
                          ) : (
                            <GitBranch size={16} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.type === "board"
                              ? item.expanded
                                ? "Quadro Expandido"
                                : "Quadro Digital"
                              : item.type === "summary"
                              ? item.expanded
                                ? "Resumo Expandido"
                                : "Resumo"
                              : item.expanded
                              ? "Mapa Mental Expandido"
                              : "Mapa Mental"}{" "}
                            • {item.date}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteImageReading(item.id);
                          if (selectedHistoryId === item.id) {
                            setSelectedHistoryId(null);
                            setResult(null);
                            setResultType(null);
                          }
                          toast.success("Leitura de imagem movida para a lixeira.");
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                        title="Excluir leitura"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-xs flex flex-col items-center">
                  <FolderOpen className="w-7 h-7 text-gray-300 dark:text-gray-600 mb-2" />
                  <span>
                    {searchHistory
                      ? "Nenhuma leitura encontrada para a busca."
                      : "Nenhuma imagem processada ainda."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Result View - Full Screen Width for Horizontal / Landscape Whiteboard & Side-by-Side */}
      {result && !isProcessing && (
        <div className="w-full space-y-4 pt-6 border-t border-gray-200 dark:border-[#2a2d3a]">
          {resultExpanded && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>Conteúdo Expandido — informações ricas e aprofundadas adicionadas com sucesso.</span>
            </div>
          )}

          {resultType === "board" ? (
            <DigitalBoard data={result as BoardData} originalImageUrl={previewUrl} />
          ) : resultType === "mindmap" ? (
            <EmbeddedMindMapView data={result} />
          ) : (
            <TranscriptionDocumentViewer
              content={result.summary || "Conteúdo do resumo."}
              title={result.title || "Resumo da Aula / Imagem"}
              editable={true}
              theme="cinza"
              categoryLabel="Quadro"
            />
          )}
        </div>
      )}
    </div>
  );
}
