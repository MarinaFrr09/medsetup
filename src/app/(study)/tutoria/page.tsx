"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  BookOpenCheck,
  Upload,
  FileText,
  BookOpen,
  Library,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  X,
  Search,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCheck,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  Clock,
  History,
} from "lucide-react";
import { useAppStore, type TutoriaAnalysis } from "@/stores/useAppStore";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Link from "next/link";

const TutoriaViewer = dynamic(
  () => import("@/components/tutoria/TutoriaViewer").then((m) => m.TutoriaViewer),
  {
    loading: () => (
      <div className="flex items-center justify-center p-12 text-sm text-gray-500">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2.5" />
        Carregando resolução da tutoria...
      </div>
    ),
    ssr: false,
  }
);

export default function TutoriaPage() {
  const {
    books,
    tutoriaAnalyses,
    addTutoriaAnalysis,
    updateTutoriaAnalysis,
    deleteTutoriaAnalysis,
  } = useAppStore();

  const [selectedCaseFiles, setSelectedCaseFiles] = useState<File[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentAnalysis, setCurrentAnalysis] = useState<TutoriaAnalysis | null>(null);

  // PDF Preview Modal State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>("");

  // History Search
  const [historySearch, setHistorySearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer while processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const allowed = [".pdf", ".docx", ".doc", ".txt", ".pptx", ".png", ".jpg", ".jpeg", ".webp", ".jfif", ".bmp"];
    const valid = files.filter((f) => {
      const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
      return allowed.includes(ext) || f.type.includes("pdf") || f.type.startsWith("image/");
    });

    if (valid.length === 0) {
      toast.error("Formato inválido. Envie arquivos PDF, Imagens (fotos/prints/scans), Word (.docx) ou Texto.");
      return;
    }

    setSelectedCaseFiles(valid);
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const handleGenerateTutoria = async () => {
    if (selectedCaseFiles.length === 0) {
      toast.error("Anexe o documento da situação-problema ou caso clínico.");
      return;
    }

    setIsProcessing(true);
    setCurrentAnalysis(null);

    const toastId = toast.loading("Analisando caso clínico e formulando resolução de tutoria...");

    try {
      const formData = new FormData();
      for (const file of selectedCaseFiles) {
        formData.append("files", file);
      }
      formData.append("userNotes", userNotes.trim());

      // Pass selected book paths and titles
      const selectedBooks = books.filter((b) => selectedBookIds.includes(b.id));
      const bookPaths = selectedBooks.map((b) => b.fileUrl);
      const bookTitles = selectedBooks.map((b) => b.title);

      formData.append("bookPaths", JSON.stringify(bookPaths));
      formData.append("bookTitles", JSON.stringify(bookTitles));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos limite

      let res: Response;
      try {
        res = await fetch("/api/ai/generate-tutoria", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const rawText = await res.text().catch(() => "");
        let serverMsg = "";
        try {
          serverMsg = JSON.parse(rawText)?.error || "";
        } catch {}
        if (!serverMsg) {
          serverMsg =
            res.status === 504 || res.status === 408
              ? "O servidor demorou para responder. Tente novamente."
              : `Erro no servidor (${res.status}). Reinicie o app e tente novamente.`;
        }
        throw new Error(serverMsg);
      }

      const data = await res.json();

      const newAnalysis: TutoriaAnalysis = {
        id: `tutoria-${Date.now()}`,
        title: data.title || "Resolução de Tutoria Clínica",
        fileName: selectedCaseFiles[0]?.name || "caso_clinico.pdf",
        date: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        userNotes: userNotes.trim() || undefined,
        detailLevel: "detalhado",
        selectedBookIds,
        selectedBookTitles: bookTitles,
        result: {
          title: data.title,
          caseTranscription: data.caseTranscription || "",
          unknownTerms: data.unknownTerms || [],
          hypothesisAnalysis: data.hypothesisAnalysis || [],
          clinicalConclusion: data.clinicalConclusion || {},
          learningQuestions: data.learningQuestions || [],
          references: data.references || [],
          markdownContent: data.markdownContent || "",
        },
        fileUrl: data.files?.[0]?.url,
        fileSize: selectedCaseFiles[0]?.size,
        fileType: selectedCaseFiles[0]?.type,
        files: data.files || [],
      };

      addTutoriaAnalysis(newAnalysis);
      setCurrentAnalysis(newAnalysis);
      toast.success("Tutoria resolvida com sucesso!", { id: toastId, icon: "🎓" });
    } catch (err: any) {
      console.error("Erro Tutoria:", err);
      let errMsg = err?.message || "Falha ao processar a tutoria com a IA.";
      if (err?.name === "AbortError") {
        errMsg = "O tempo limite de processamento foi atingido. Tente novamente.";
      } else if (err?.name === "TypeError" && errMsg === "Failed to fetch") {
        errMsg = "Não foi possível conectar ao servidor. Verifique sua conexão de rede.";
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEditedContent = (newMarkdown: string) => {
    if (!currentAnalysis) return;
    const updated = {
      ...currentAnalysis,
      customMarkdown: newMarkdown,
    };
    updateTutoriaAnalysis(currentAnalysis.id, { customMarkdown: newMarkdown });
    setCurrentAnalysis(updated);
  };

  const handleDeleteTutoria = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTutoriaAnalysis(id);
    if (currentAnalysis?.id === id) {
      setCurrentAnalysis(null);
    }
    toast.success("Tutoria movida para a lixeira.");
  };

  const openPdfViewer = (url?: string, name?: string) => {
    if (!url) return;
    setPreviewPdfUrl(url);
    setPreviewPdfName(name || "Documento Anexo");
  };

  const filteredHistory = tutoriaAnalyses.filter((item) => {
    if (!historySearch.trim()) return true;
    const query = historySearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.fileName.toLowerCase().includes(query) ||
      (item.selectedBookTitles &&
        item.selectedBookTitles.some((t) => t.toLowerCase().includes(query)))
    );
  });

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shadow-sm">
              <BookOpenCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Tutoria
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
              onClick={() => setCurrentAnalysis(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Nova Tutoria
            </button>
          </div>

          <TutoriaViewer
            title={currentAnalysis.title}
            markdownContent={currentAnalysis.customMarkdown || currentAnalysis.result.markdownContent}
            selectedBookTitles={currentAnalysis.selectedBookTitles}
            fileUrl={currentAnalysis.fileUrl}
            fileName={currentAnalysis.fileName}
            onSaveContent={handleSaveEditedContent}
            onViewPdf={() => openPdfViewer(currentAnalysis.fileUrl, currentAnalysis.fileName)}
            analysis={currentAnalysis}
            onUpdateAnalysis={(updates) => {
              updateTutoriaAnalysis(currentAnalysis.id, updates);
              setCurrentAnalysis((prev) => (prev ? { ...prev, ...updates } : null));
            }}
          />
        </div>
      ) : (
        /* Main Grid: Form (Left) + Reference Books & History Sidebar (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Case Upload & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Dropzone */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Situação-Problema / Caso Clínico Anexado
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Envie o PDF, documento Word ou texto contendo a narrativa do caso clínico e as questões.
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.pptx,.png,.jpg,.jpeg,.webp,.jfif,.bmp,image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedCaseFiles.length > 0 ? (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-gray-950 dark:text-white truncate">
                        {selectedCaseFiles[0].name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(selectedCaseFiles[0].size / (1024 * 1024)).toFixed(2)} MB • Pronto para processamento
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const file = selectedCaseFiles[0];
                        const url = URL.createObjectURL(file);
                        openPdfViewer(url, file.name);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 transition-colors cursor-pointer shadow-xs"
                      title="Visualizar o PDF, imagem ou anexo enviado"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{selectedCaseFiles[0].type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(selectedCaseFiles[0].name) ? "Visualizar Imagem" : "Visualizar PDF"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCaseFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      Trocar Arquivo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/20 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Clique ou arraste o anexo do caso clínico
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                    Formatos suportados: PDF, Imagens (fotos/prints/scans), Word (.docx, .doc), PowerPoint (.pptx) ou TXT.
                  </p>
                </div>
              )}
            </div>

            {/* Optional Personal Notes */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
              <label className="block text-sm font-bold text-gray-900 dark:text-white">
                Direcionamentos ou Dúvidas Específicas do Aluno (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Dar ênfase especial aos mecanismos farmacológicos dos inibidores de SGLT2 e critérios de diagnóstico diferencial de síndrome nefrótica."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Action Submit Button */}
            <div>
              <button
                type="button"
                disabled={isProcessing || selectedCaseFiles.length === 0}
                onClick={handleGenerateTutoria}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resolvendo Tutoria com IA... ({elapsedSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Resolver Tutoria & Questões de Aprendizagem</span>
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
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Biblioteca
                </Link>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                A seleção de livros é <strong>opcional</strong>. Ao selecionar livros da biblioteca, a IA usará o
                conteúdo deles como fonte de conhecimento verídico para responder as questões de aprendizagem.
              </p>

              {books.length > 0 ? (
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
                    <strong>{selectedBookIds.length} livro(s) selecionado(s)</strong> para embasar a resolução das
                    questões de aprendizagem.
                  </span>
                </div>
              )}
            </div>

            {/* Sidebar — Histórico Persistido abaixo de Livros de Referência */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  Tutorias Salvas
                </h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                  {tutoriaAnalyses.length}
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
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setCurrentAnalysis(item)}
                      className="p-4 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer shadow-xs group relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pr-6">
                          {item.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTutoria(item.id, e)}
                          className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Excluir tutoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-emerald-500 shrink-0" />
                        {item.fileName}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.date}
                        </span>
                        {item.detailLevel && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            Nível {item.detailLevel}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                            <BookOpenCheck className="w-3 h-3" /> Tutoria
                          </span>
                          {item.selectedBookTitles && item.selectedBookTitles.length > 0 && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={item.selectedBookTitles.join(", ")}>
                              {item.selectedBookTitles.length} livro(s)
                            </span>
                          )}
                        </div>

                        {item.fileUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPdfViewer(item.fileUrl, item.fileName);
                            }}
                            className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                            title="Visualizar PDF original do caso"
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
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Nenhuma tutoria salva ainda. Envie o PDF da situação-problema para começar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal for Attached Clinical Case */}
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
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {previewPdfName || "Anexo do Caso Clínico"}
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
                  download={previewPdfName || "caso_clinico.pdf"}
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
                  alt={previewPdfName}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={previewPdfUrl}
                  title={previewPdfName}
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
