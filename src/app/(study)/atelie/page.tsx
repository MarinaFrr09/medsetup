"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Microscope,
  Upload,
  Sparkles,
  FileText,
  FileCheck,
  Library,
  BookOpen,
  Plus,
  Trash2,
  Search,
  ArrowRight,
  ExternalLink,
  Download,
  X,
  ChevronLeft,
  CheckCircle2,
  Paperclip,
  Stethoscope,
  Eye,
  History,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAppStore, AtelieAnalysis } from "@/stores/useAppStore";
import { normalizeAtelieResult } from "@/lib/atelie";
import dynamic from "next/dynamic";

const AtelieResultView = dynamic(() => import("@/components/atelie/AtelieResultView"), {
  loading: () => (
    <div className="flex items-center justify-center p-12 text-sm text-gray-500">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2.5" />
      Carregando dossiê do Ateliê...
    </div>
  ),
  ssr: false,
});

const ALLOWED_EXTS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

const LOADING_STEPS = [
  "Lendo roteiro da SP e lâminas histológicas...",
  "Mapeando objetivos de aprendizagem e perguntas do roteiro...",
  "Identificando cortes anatômicos e tecidos histológicos...",
  "Analisando hipóteses clínicas, exames e biomarcadores...",
  "Integrando achados com o Caso da Tutoria...",
  "Sintetizando resumo teórico e estruturando dossiê...",
];

export default function AteliePage() {
  const { atelieAnalyses, addAtelieAnalysis, deleteAtelieAnalysis, books } = useAppStore();

  const [historySearch, setHistorySearch] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tutoriaFiles, setTutoriaFiles] = useState<File[]>([]);
  const [useTutoria, setUseTutoria] = useState(false);
  const [tutoriaText, setTutoriaText] = useState("");
  const [notes, setNotes] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [isDraggingSP, setIsDraggingSP] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string | null>(null);

  const spFileInputRef = useRef<HTMLInputElement>(null);
  const tutoriaFileInputRef = useRef<HTMLInputElement>(null);

  // Timer while processing
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    let stepInterval: NodeJS.Timeout;
    if (isProcessing) {
      setElapsedSeconds(0);
      setLoadingStepIdx(0);
      timerInterval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
      stepInterval = setInterval(() => {
        setLoadingStepIdx((i) => (i + 1) % LOADING_STEPS.length);
      }, 5000);
    }
    return () => {
      clearInterval(timerInterval);
      clearInterval(stepInterval);
    };
  }, [isProcessing]);

  const filterFiles = (fileList: FileList | File[]): File[] => {
    const valid: File[] = [];
    for (const file of Array.from(fileList)) {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      if (ALLOWED_EXTS.includes(ext) || file.type.startsWith("image/") || file.type.includes("pdf")) {
        valid.push(file);
      }
    }
    return valid;
  };

  const handleSPFiles = (fileList: FileList | File[]) => {
    const valid = filterFiles(fileList);
    if (valid.length === 0) {
      toast.error("Formato não suportado. Envie PDF, DOCX, PPTX ou imagens.");
      return;
    }
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newlyAdded = valid.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newlyAdded];
    });
  };

  const handleTutoriaFiles = (fileList: FileList | File[]) => {
    const valid = filterFiles(fileList);
    if (valid.length === 0) {
      toast.error("Formato não suportado para o caso da tutoria.");
      return;
    }
    setTutoriaFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newlyAdded = valid.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newlyAdded];
    });
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Anexe pelo menos um arquivo de roteiro da SP para analisar.");
      return;
    }

    setIsProcessing(true);
    setCurrentAnalysisId(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 min

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      if (useTutoria) {
        tutoriaFiles.forEach((file) => formData.append("tutoriaFiles", file));
        if (tutoriaText.trim()) {
          formData.append("tutoriaText", tutoriaText.trim());
        }
      }

      // Build notes including selected reference books
      let finalNotes = notes.trim();
      const selectedBooks = (books || []).filter((b) => selectedBookIds.includes(b.id));
      if (selectedBooks.length > 0) {
        const bookTitles = selectedBooks.map((b) => b.title).join(", ");
        finalNotes = `${
          finalNotes ? finalNotes + "\n\n" : ""
        }LIVROS DE REFERÊNCIA SELECIONADOS PELO ALUNO: Use preferencialmente como embasamento acadêmico a literatura dos livros: ${bookTitles}.`;
      }

      if (finalNotes) {
        formData.append("notes", finalNotes);
      }

      const res = await fetch("/api/ai/analyze-atelie", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro na análise (${res.status})`);
      }

      const rawJson = await res.json();
      const primaryFile = selectedFiles[0];
      const primaryFileName = primaryFile?.name || "Roteiro da SP";
      const uploadedFilesList = rawJson.files || [];
      const primaryUploaded = uploadedFilesList[0];
      const localBlobUrl = primaryFile ? URL.createObjectURL(primaryFile) : undefined;
      const activeFileUrl = primaryUploaded?.url || localBlobUrl;

      const normalizedResult = normalizeAtelieResult(rawJson, primaryFileName);

      const newAnalysis: AtelieAnalysis = {
        id: "atelie-" + Date.now().toString(),
        title: normalizedResult.title || primaryFileName.replace(/\.[^/.]+$/, ""),
        fileName: primaryFileName,
        date: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        tutoriaCase: useTutoria ? tutoriaText.trim() || tutoriaFiles.map((f) => f.name).join(", ") : undefined,
        userNotes: notes.trim() || undefined,
        selectedBookTitles: selectedBooks.map((b) => b.title),
        result: normalizedResult,
        fileUrl: activeFileUrl,
        fileSize: primaryFile?.size,
        fileType: primaryFile?.type,
        files: uploadedFilesList.length > 0 ? uploadedFilesList : selectedFiles.map((f) => ({
          name: f.name,
          url: localBlobUrl,
          size: f.size,
          type: f.type,
        })),
      };

      addAtelieAnalysis(newAnalysis);
      setCurrentAnalysisId(newAnalysis.id);
      toast.success("Roteiro do Ateliê resolvido com sucesso!");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : "Falha ao processar SP";
      console.error("Erro Ateliê:", err);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentAnalysis = atelieAnalyses.find((a) => a.id === currentAnalysisId);

  // Filter history
  const filteredHistory = atelieAnalyses.filter((item) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.fileName.toLowerCase().includes(q) ||
      (item.result?.theme && item.result.theme.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shadow-sm">
              <Microscope className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Ateliê
            </h1>
          </div>
        </div>

      </div>

      {/* Main View Area */}
      {currentAnalysis ? (
        /* Result View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentAnalysisId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Novo Ateliê
            </button>
          </div>

          <AtelieResultView analysis={currentAnalysis} onBack={() => setCurrentAnalysisId(null)} />
        </div>
      ) : (
        /* Main Grid: Form (Left) + Reference Books & History Sidebar (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: SP Upload, Tutoria linkage, and Notes */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Dropzone */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Roteiro da SP & Anexos
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Envie PDFs de roteiro, lâminas histológicas, imagens de anatomia ou slides.
                  </p>
                </div>
                {selectedFiles.length > 0 && (
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {selectedFiles.length} arquivo(s)
                  </span>
                )}
              </div>

              <input
                ref={spFileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                onChange={(e) => e.target.files && handleSPFiles(e.target.files)}
                className="hidden"
              />

              {selectedFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-gray-950 dark:text-white truncate">
                          {selectedFiles[0].name}
                          {selectedFiles.length > 1 && ` (+${selectedFiles.length - 1} arquivo(s))`}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total • Pronto para análise
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const file = selectedFiles[0];
                          setPreviewPdfUrl(URL.createObjectURL(file));
                          setPreviewPdfName(file.name);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 transition-colors cursor-pointer shadow-xs"
                        title="Visualizar o primeiro arquivo / PDF selecionado"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizar Arquivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => spFileInputRef.current?.click()}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                      >
                        Adicionar Mais
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFiles([]);
                          if (spFileInputRef.current) spFileInputRef.current.value = "";
                        }}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Individual chips for selected files */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300"
                      >
                        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="max-w-[160px] truncate font-medium">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewPdfUrl(URL.createObjectURL(file));
                            setPreviewPdfName(file.name);
                          }}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 cursor-pointer"
                          title="Visualizar este anexo"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                          title="Remover anexo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => spFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingSP(true);
                  }}
                  onDragLeave={() => setIsDraggingSP(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingSP(false);
                    if (e.dataTransfer.files) handleSPFiles(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors group ${
                    isDraggingSP
                      ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                      : "border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-gray-800/20"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Clique ou arraste o roteiro da SP e lâminas
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                    Formatos suportados: PDF, Word (.docx, .doc), PowerPoint (.pptx), Imagens ou TXT.
                  </p>
                </div>
              )}
            </div>

            {/* Vincular Caso Clínico da Tutoria (Opcional) */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Vincular Caso Clínico da Tutoria
                    </h3>
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Opcional
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Resolve todo o Ateliê e os exames já aplicando diretamente ao paciente da sua tutoria
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useTutoria}
                    onChange={(e) => setUseTutoria(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {useTutoria && (
                <div className="space-y-3 pt-2">
                  <textarea
                    value={tutoriaText}
                    onChange={(e) => setTutoriaText(e.target.value)}
                    placeholder="Cole aqui a descrição ou história clínica do paciente da Tutoria..."
                    rows={3}
                    className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />

                  <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span>Anexar documento ou imagem do caso da Tutoria</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => tutoriaFileInputRef.current?.click()}
                      className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      Anexar
                    </button>
                    <input
                      ref={tutoriaFileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                      className="hidden"
                      onChange={(e) => e.target.files && handleTutoriaFiles(e.target.files)}
                    />
                  </div>

                  {tutoriaFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tutoriaFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300"
                        >
                          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="max-w-[160px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setTutoriaFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Direcionamentos ou Foco do Professor (Opcional) */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
              <label className="block text-sm font-bold text-gray-900 dark:text-white">
                Direcionamentos ou Foco do Professor (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Focar na identificação histológica em corte transversal e detalhar a ação do biomarcador..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Action Submit Button */}
            <div>
              <button
                type="button"
                disabled={isProcessing || selectedFiles.length === 0}
                onClick={handleAnalyze}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{LOADING_STEPS[loadingStepIdx]} ({elapsedSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Analisar e Resolver Roteiro do Ateliê</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Reference Books Selector */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Library className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Livros de Referência
                  </h3>
                </div>
                <Link
                  href="/livros"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Biblioteca
                </Link>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                A seleção de livros é <strong>opcional</strong>. Ao selecionar livros da biblioteca (ex: Junqueira, Ross, Moore, Robbins), a IA usará o conteúdo deles como base acadêmica para responder o roteiro.
              </p>

              {books && books.length > 0 ? (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {books.map((book) => {
                    const isSelected = selectedBookIds.includes(book.id);

                    return (
                      <div
                        key={book.id}
                        onClick={() => toggleBookSelection(book.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-emerald-50/80 border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800 shadow-xs"
                            : "bg-gray-50/60 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {book.title}
                            </h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {book.author || book.subject || "Manual"}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Você ainda não adicionou nenhum livro à biblioteca.
                  </p>
                  <Link
                    href="/livros"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Livro na aba Livros
                  </Link>
                </div>
              )}

              {selectedBookIds.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>{selectedBookIds.length} livro(s) selecionado(s)</strong> para embasar a resolução da SP.
                  </span>
                </div>
              )}
            </div>

            {/* Sidebar — Histórico Persistido abaixo de Livros de Referência */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  Roteiros Salvos
                </h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                  {atelieAnalyses.length}
                </span>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar no histórico..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setCurrentAnalysisId(item.id)}
                      className="p-4 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer shadow-xs group relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-6">
                          {item.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAtelieAnalysis(item.id);
                            toast.success("Roteiro movido para a lixeira.");
                          }}
                          className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Excluir roteiro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                        {item.fileName}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.date}
                        </span>
                        {item.result?.theme && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                            {item.result.theme}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-1">
                            <Microscope className="w-3 h-3" /> Ateliê
                          </span>
                          {item.selectedBookTitles && item.selectedBookTitles.length > 0 && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={item.selectedBookTitles.join(", ")}>
                              {item.selectedBookTitles.length} livro(s)
                            </span>
                          )}
                        </div>

                        {(item.fileUrl || (item.files && item.files.length > 0)) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = item.fileUrl || item.files?.[0]?.url;
                              if (url) {
                                setPreviewPdfUrl(url);
                                setPreviewPdfName(item.fileName || "Roteiro da SP");
                              }
                            }}
                            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                            title="Visualizar PDF original do roteiro"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 bg-white dark:bg-[#1A1D27] rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                    <Microscope className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Nenhum roteiro salvo ainda. Envie o roteiro da SP para começar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div
          onClick={() => setPreviewPdfUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-full max-w-6xl h-[90vh] bg-white dark:bg-[#1A1D27] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#12141c]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {previewPdfName || "Anexo do Roteiro"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
                <a
                  href={previewPdfUrl}
                  download={previewPdfName || "roteiro_sp.pdf"}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe or Image */}
            <div className="flex-1 w-full h-full bg-gray-100 dark:bg-[#0F1117] relative flex items-center justify-center overflow-auto p-2">
              {previewPdfUrl && (previewPdfUrl.startsWith("data:image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewPdfName || previewPdfUrl)) ? (
                <img
                  src={previewPdfUrl}
                  alt={previewPdfName || "Anexo da SP"}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={previewPdfUrl}
                  title={previewPdfName || "Documento da SP"}
                  className="w-full h-full border-none rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
