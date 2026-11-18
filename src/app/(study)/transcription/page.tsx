"use client";

import {
  FileText,
  UploadCloud,
  Sparkles,
  Zap,
  Timer,
  Trash2,
  Calendar,
  FileUp,
  Copy,
  Check,
  Download,
  History,
  File,
  X,
  Eye,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAppStore, DocumentTranscription } from "@/stores/useAppStore";
import dynamic from "next/dynamic";
import { copyRichText } from "@/lib/notion-export";
import toast from "react-hot-toast";

const TranscriptionDocumentViewer = dynamic(
  () => import("@/components/transcription/TranscriptionDocumentViewer"),
  {
    loading: () => (
      <div className="flex items-center justify-center p-12 text-sm text-gray-500">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2.5" />
        Carregando visualizador de documento...
      </div>
    ),
    ssr: false,
  }
);

export default function TranscriptionPage() {
  const {
    documentTranscriptions,
    addDocumentTranscription,
    updateDocumentTranscription,
    deleteDocumentTranscription,
  } = useAppStore();

  const [activeTranscriptionId, setActiveTranscriptionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandMode, setExpandMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentResult, setCurrentResult] = useState<{
    title: string;
    transcription: string;
    summary?: string;
    keyPoints: string[];
    pageCount: number;
    wordCount: number;
    expanded: boolean;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    fileType?: string;
    files?: Array<{ name: string; url?: string; size?: number; type?: string }>;
  } | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // Helper to get or create a persistent object URL for immediate and reliable PDF viewing
  const getOrCreateBlobUrl = (file: File): string => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (blobUrlsRef.current.has(key)) {
      return blobUrlsRef.current.get(key)!;
    }
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const safeBlob = isPdf && file.type !== "application/pdf"
      ? new Blob([file], { type: "application/pdf" })
      : file;
    const url = URL.createObjectURL(safeBlob);
    blobUrlsRef.current.set(key, url);
    return url;
  };

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  // Close PDF modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewPdfUrl) {
        setPreviewPdfUrl(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPdfUrl]);

  // Timer while AI is processing
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

  const handleFilesSelected = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/rtf",
    ];
    const allowedExts = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".rtf"];

    for (const file of Array.from(files)) {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      if (allowedTypes.includes(file.type) || allowedExts.includes(ext)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      toast.error("Formato não suportado. Envie arquivos PDF, Word (.doc, .docx), PowerPoint ou texto.");
      return;
    }

    setSelectedFiles(validFiles);
  };

  const handleTranscribe = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos um documento para transcrever.");
      return;
    }

    setIsProcessing(true);
    setCurrentResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 min ceiling

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }
      formData.append("expand", expandMode ? "true" : "false");

      const response = await fetch("/api/ai/transcribe-document", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao transcrever o documento.");
      }

      const data = await response.json();
      const uploadedFilesList = data.files || [];
      const primaryFile = selectedFiles[0];
      const primaryUploaded = uploadedFilesList[0];

      // Instant local blob URL for seamless immediate preview
      const localBlobUrl = primaryFile ? getOrCreateBlobUrl(primaryFile) : undefined;
      const activeFileUrl = primaryUploaded?.url || localBlobUrl;

      const fullTranscriptionText = (data.transcription && data.transcription.length >= (data.summary?.length || 0))
        ? data.transcription
        : (data.summary || data.transcription || "");

      const resultObj = {
        ...data,
        transcription: fullTranscriptionText,
        summary: data.summary || fullTranscriptionText,
        fileName: selectedFiles.map((f) => f.name).join(", "),
        fileUrl: activeFileUrl,
        fileSize: primaryFile?.size,
        fileType: primaryFile?.type || "application/pdf",
        files: uploadedFilesList.length > 0 ? uploadedFilesList : selectedFiles.map((f) => ({
          name: f.name,
          url: activeFileUrl,
          size: f.size,
          type: f.type,
        })),
      };
      setCurrentResult(resultObj);

      // Save to store with reliable activeFileUrl
      const newTranscription: DocumentTranscription = {
        id: Date.now().toString(),
        title: data.title || primaryFile?.name || "Documento Transcrito",
        fileName: selectedFiles.map((f) => f.name).join(", "),
        date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        expanded: expandMode,
        content: fullTranscriptionText,
        summary: data.summary || fullTranscriptionText,
        keyPoints: data.keyPoints,
        fileUrl: activeFileUrl,
        fileSize: primaryFile?.size,
        fileType: primaryFile?.type || "application/pdf",
        files: uploadedFilesList.length > 0 ? uploadedFilesList : (activeFileUrl ? [{ name: primaryFile.name, url: activeFileUrl, size: primaryFile.size, type: primaryFile.type }] : []),
      };
      addDocumentTranscription(newTranscription);
      setActiveTranscriptionId(newTranscription.id);

      toast.success(
        expandMode
          ? "Documento transcrito e expandido com informações adicionais!"
          : "Documento transcrito integralmente com sucesso!"
      );
    } catch (error: any) {
      console.error("Erro na transcrição:", error);
      if (error.name === "AbortError") {
        toast.error("O processamento excedeu o limite máximo de 15 minutos.");
      } else {
        toast.error(error.message || "Erro ao transcrever documento.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    if (!currentResult?.transcription) return;
    try {
      const ok = await copyRichText(currentResult.transcription);
      if (ok) {
        setCopied(true);
        toast.success("Transcrição copiada com formatação perfeita para qualquer aplicativo!", { icon: "📋" });
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Erro ao copiar.");
      }
    } catch {
      toast.error("Erro ao copiar texto.");
    }
  };

  const handleDownloadTxt = () => {
    if (!currentResult?.transcription) return;
    const blob = new Blob([currentResult.transcription], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentResult.title || "transcricao"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo .md salvo!");
  };

  const handleDeleteTranscription = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteDocumentTranscription(id);
    toast.success("Transcrição excluída.");
  };

  const handleLoadFromHistory = (item: DocumentTranscription) => {
    setActiveTranscriptionId(item.id);
    const fullText = (item.content && item.content.length >= (item.summary?.length || 0))
      ? item.content
      : (item.summary || item.content || "");

    setCurrentResult({
      title: item.title,
      transcription: fullText,
      summary: item.summary || fullText,
      keyPoints: item.keyPoints || [],
      pageCount: 0,
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      expanded: item.expanded,
      fileName: item.fileName,
      fileUrl: item.fileUrl,
      fileSize: item.fileSize,
      fileType: item.fileType,
      files: item.files || (item.fileName ? [{ name: item.fileName, url: item.fileUrl, size: item.fileSize, type: item.fileType }] : []),
    });
  };

  const handleSaveTranscriptionContent = (newContent: string, mode?: "transcription" | "summary") => {
    if (mode === "summary") {
      setCurrentResult((prev) => (prev ? { ...prev, summary: newContent } : null));
      if (activeTranscriptionId) {
        updateDocumentTranscription(activeTranscriptionId, { summary: newContent });
      }
    } else {
      setCurrentResult((prev) => (prev ? { ...prev, transcription: newContent } : null));
      if (activeTranscriptionId) {
        updateDocumentTranscription(activeTranscriptionId, { content: newContent });
      }
    }
  };

  const handleGenerateSummary = async () => {
    if (!currentResult?.transcription) {
      toast.error("Nenhuma transcrição disponível para sintetizar.");
      return;
    }

    setIsGeneratingSummary(true);
    const toastId = toast.loading("Gerando Resumo Master Elaborado com IA (Padrão ResumoPro)...");

    try {
      const res = await fetch("/api/ai/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentResult.transcription,
          expand: currentResult.expanded,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar o Resumo Master.");
      }

      const data = await res.json();
      setCurrentResult((prev) => (prev ? { ...prev, summary: data.summary } : null));
      if (activeTranscriptionId) {
        updateDocumentTranscription(activeTranscriptionId, { summary: data.summary });
      }
      toast.success("Resumo Master Pro gerado com sucesso!", { id: toastId });
    } catch (err: any) {
      console.error("Erro ao gerar resumo:", err);
      toast.error(err.message || "Erro ao gerar resumo.", { id: toastId });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (ext === "doc" || ext === "docx") return "📝";
    if (ext === "ppt" || ext === "pptx") return "📊";
    if (ext === "txt") return "📃";
    return "📎";
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <FileText className="text-purple-600 w-8 h-8" />
          Transcrição de Documentos
        </h1>
      </div>

      {currentResult && !isProcessing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => {
                setCurrentResult(null);
                setSelectedFiles([]);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Nova Transcrição
            </button>
          </div>

          {currentResult.expanded && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>Conteúdo Expandido — explicações adicionais, definições e contexto prático integrados ao longo da transcrição.</span>
            </div>
          )}

          {/* Quick Stats */}
          {(currentResult.pageCount > 0 || currentResult.wordCount > 0) && (
            <div className="flex items-center gap-3 flex-wrap">
              {currentResult.pageCount > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  ~{currentResult.pageCount} páginas transcritas
                </span>
              )}
              {currentResult.wordCount > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  ~{currentResult.wordCount.toLocaleString("pt-BR")} palavras
                </span>
              )}
            </div>
          )}

          {/* Key Points */}
          {currentResult.keyPoints && currentResult.keyPoints.length > 0 && (
            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Pontos-Chave do Documento
              </h3>
              <ul className="space-y-2">
                {currentResult.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-blue-950 dark:text-blue-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card do Arquivo Anexado / Origem */}
          {(() => {
            const effectiveFileUrl =
              currentResult.fileUrl ||
              (selectedFiles.length > 0 ? getOrCreateBlobUrl(selectedFiles[0]) : null) ||
              (currentResult.fileName ? `/uploads/${encodeURIComponent(currentResult.fileName)}` : null);

            return (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/40">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                          {currentResult.fileName?.toLowerCase().endsWith(".pdf") ? "PDF Anexado" : "Arquivo de Origem"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate mt-0.5" title={currentResult.fileName}>
                        {currentResult.fileName || "Documento Original"}
                      </p>
                      {currentResult.fileSize && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {(currentResult.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const targetUrl = effectiveFileUrl || (currentResult.fileName ? `/uploads/${encodeURIComponent(currentResult.fileName)}` : null);
                        if (targetUrl) {
                          setPreviewPdfUrl(targetUrl);
                          setPreviewPdfName(currentResult.fileName || "Documento Anexado");
                        } else {
                          fileInputRef.current?.click();
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors cursor-pointer shadow-2xs"
                      title="Visualizar PDF original anexado"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Visualizar PDF</span>
                    </button>

                    {effectiveFileUrl && (
                      <a
                        href={effectiveFileUrl}
                        download={currentResult.fileName || "documento.pdf"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Baixar arquivo original"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Original</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Document Transcription View — Full Width Spacious */}
                <TranscriptionDocumentViewer
                  content={currentResult.transcription}
                  summary={currentResult.summary}
                  title={currentResult.title || "Transcrição do Documento"}
                  expanded={currentResult.expanded}
                  editable={true}
                  theme="roxo"
                  categoryLabel="Transcricao"
                  onSaveContent={handleSaveTranscriptionContent}
                  onGenerateSummary={handleGenerateSummary}
                  isGeneratingSummary={isGeneratingSummary}
                  fileUrl={effectiveFileUrl || undefined}
                  fileName={currentResult.fileName}
                  onViewPdf={() => {
                    const targetUrl = effectiveFileUrl || (currentResult.fileName ? `/uploads/${encodeURIComponent(currentResult.fileName)}` : null);
                    if (targetUrl) {
                      setPreviewPdfUrl(targetUrl);
                      setPreviewPdfName(currentResult.fileName || "Documento Anexado");
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                />
              </>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            {/* File Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] bg-white dark:bg-[#1A1D27] text-center relative overflow-hidden ${
              isDragging
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                : selectedFiles.length > 0
                ? "border-purple-300 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-950/10"
                : "border-gray-300 dark:border-[#2a2d3a] hover:border-purple-400 dark:hover:border-purple-600"
            }`}
          >
            {selectedFiles.length > 0 ? (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-purple-600" />
                    {selectedFiles.length} documento{selectedFiles.length > 1 ? "s" : ""} selecionado{selectedFiles.length > 1 ? "s" : ""}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpar
                  </button>
                </div>

                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-[#0F1117] rounded-xl border border-gray-200 dark:border-[#2a2d3a]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">{getFileIcon(file.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            {file.name.split(".").pop()?.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const url = getOrCreateBlobUrl(file);
                        setPreviewPdfUrl(url);
                        setPreviewPdfName(file.name);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors cursor-pointer shrink-0"
                      title="Visualizar documento anexado"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Visualizar PDF</span>
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-xs text-purple-600 dark:text-purple-400 font-medium py-2 hover:underline cursor-pointer"
                >
                  + Adicionar mais documentos
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  Arraste o documento aqui ou clique para selecionar
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Suporta PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx), TXT e RTF
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer shadow-md shadow-purple-500/20"
                >
                  Selecionar Documento
                </button>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesSelected(e.target.files);
                }
              }}
            />
          </div>

          {/* Expand Toggle */}
          {selectedFiles.length > 0 && (
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
                    ? "✅ Ativado — Além da transcrição integral, a IA adicionará explicações complementares, definições de termos técnicos, contexto prático, mecanismos detalhados e pontos de prova ao longo de todo o documento."
                    : "Ative para enriquecer a transcrição com explicações adicionais, definições complementares e contexto prático para cada conceito do documento."}
                </p>
              </div>
            </div>
          )}

              {/* Transcribe Button */}
          {selectedFiles.length > 0 && !isProcessing && (
            <button
              type="button"
              onClick={handleTranscribe}
              className={`w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-bold text-sm transition-all shadow-lg cursor-pointer text-white ${
                expandMode
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25"
              }`}
            >
              {expandMode ? <Zap className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              <span>
                {expandMode ? "Transcrever e Expandir com IA" : "Transcrever Documento Integralmente"}
              </span>
            </button>
          )}

          {/* Loading Card */}
          {isProcessing && (
            <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl p-8 shadow-sm text-center">
              <div
                className={`inline-flex p-4 rounded-full mb-3 ${
                  expandMode ? "bg-amber-50 dark:bg-amber-950/40" : "bg-purple-50 dark:bg-purple-950/40"
                }`}
              >
                <div
                  className={`w-8 h-8 border-3 rounded-full animate-spin ${
                    expandMode ? "border-amber-500 border-t-transparent" : "border-purple-600 border-t-transparent"
                  }`}
                />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {expandMode
                  ? "Transcrevendo e expandindo documento com IA..."
                  : "Transcrevendo documento integralmente..."}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-md mx-auto">
                {expandMode
                  ? "Lendo cada página do documento, transcrevendo fielmente todo o conteúdo e enriquecendo com explicações adicionais, definições e contexto prático."
                  : "Lendo cada página do documento e transcrevendo fielmente todo o conteúdo preservando a estrutura hierárquica de títulos, tópicos e subtópicos."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono font-medium">
                <Timer className="w-3.5 h-3.5 text-purple-600" />
                <span>Tempo em processamento: {formatElapsed(elapsedSeconds)}</span>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar — Histórico Persistido */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Transcrições Salvas
            </h2>
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
              {documentTranscriptions.length}
            </span>
          </div>

          <div className="space-y-3">
            {documentTranscriptions.length > 0 ? (
              documentTranscriptions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadFromHistory(item)}
                  className="p-4 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-[#2a2d3a] hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer shadow-sm group relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors pr-6">
                      {item.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTranscription(e, item.id)}
                      className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Excluir transcrição"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {item.fileName}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Transcrição
                      </span>
                      {item.expanded && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Expandido
                        </span>
                      )}
                    </div>

                    {(item.fileUrl || item.fileName) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetUrl = item.fileUrl || `/uploads/${encodeURIComponent(item.fileName || "")}`;
                          setPreviewPdfUrl(targetUrl);
                          setPreviewPdfName(item.fileName || "Documento PDF");
                        }}
                        className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Visualizar PDF original anexado"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ver PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 bg-white dark:bg-[#1A1D27] rounded-xl border border-dashed border-gray-200 dark:border-[#2a2d3a] text-center">
                <File className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nenhuma transcrição realizada ainda. Envie um documento PDF ou Word para começar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Modal de Pré-visualização do PDF Anexado */}
      {previewPdfUrl && (
        <div
          onClick={() => setPreviewPdfUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-full max-w-5xl h-[88vh] bg-white dark:bg-[#1A1D27] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#12141c]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-md sm:max-w-xl">
                  {previewPdfName || "Documento PDF Anexado"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
                <a
                  href={previewPdfUrl}
                  download={previewPdfName || "documento.pdf"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF iframe viewer */}
            <div className="flex-1 w-full h-full bg-gray-100 dark:bg-[#0F1117] relative">
              <iframe
                src={previewPdfUrl}
                title={previewPdfName}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
