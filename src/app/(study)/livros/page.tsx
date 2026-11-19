"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Library,
  Plus,
  Search,
  BookOpen,
  FileText,
  Trash2,
  Upload,
  ExternalLink,
  Download,
  X,
  Sparkles,
  Bookmark,
  Check,
  AlertCircle,
  FileCheck,
  BookMarked,
  Filter,
} from "lucide-react";
import { useAppStore, type BookItem } from "@/stores/useAppStore";
import toast from "react-hot-toast";
import Link from "next/link";

const SUBJECT_OPTIONS = [
  "Clínica Médica",
  "Fisiologia",
  "Patologia",
  "Farmacologia",
  "Semiologia",
  "Anatomia",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Neurologia & Psiquiatria",
  "Infectologia",
  "Bioquímica & Genética",
  "Outro",
];

const COVER_COLORS = [
  { name: "Azul Médico", bg: "from-blue-600 to-indigo-800", border: "border-blue-400", hex: "#2563EB" },
  { name: "Verde Esmeralda", bg: "from-emerald-600 to-teal-800", border: "border-emerald-400", hex: "#059669" },
  { name: "Roxo Acadêmico", bg: "from-purple-600 to-indigo-900", border: "border-purple-400", hex: "#7C3AED" },
  { name: "Rubro Carmim", bg: "from-rose-600 to-red-900", border: "border-rose-400", hex: "#E11D48" },
  { name: "Âmbar Dourado", bg: "from-amber-500 to-orange-700", border: "border-amber-400", hex: "#D97706" },
  { name: "Ciano Técnico", bg: "from-cyan-600 to-blue-800", border: "border-cyan-400", hex: "#0891B2" },
];

export default function LivrosPage() {
  const { books, addBook, deleteBook } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewBook, setPreviewBook] = useState<BookItem | null>(null);

  useEffect(() => {
    if (previewBook?.id) {
      try {
        localStorage.setItem("medsetup_last_book_id", previewBook.id);
      } catch {}
    }
  }, [previewBook]);

  useEffect(() => {
    if (typeof window === "undefined" || books.length === 0) return;
    const resumeId = new URLSearchParams(window.location.search).get("resumeId");
    if (resumeId) {
      const target = books.find((b) => b.id === resumeId);
      if (target) {
        setPreviewBook(target);
      }
    }
  }, [books]);

  // Form State for Adding Book
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookSubject, setBookSubject] = useState("Clínica Médica");
  const [bookDescription, setBookDescription] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (book.subject && book.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject =
        selectedSubjectFilter === "all" || book.subject === selectedSubjectFilter;

      return matchSearch && matchSubject;
    });
  }, [books, searchQuery, selectedSubjectFilter]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [".pdf", ".docx", ".doc", ".txt", ".epub"];
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!allowed.includes(ext) && !file.type.includes("pdf")) {
      toast.error("Formato não suportado. Por favor, envie arquivos PDF, Word (.docx) ou Texto.");
      return;
    }

    setFileToUpload(file);
    if (!bookTitle) {
      // Suggest clean title from filename
      const clean = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      setBookTitle(clean);
    }
  };

  const handleOpenAddModal = () => {
    setFileToUpload(null);
    setBookTitle("");
    setBookAuthor("");
    setBookSubject("Clínica Médica");
    setBookDescription("");
    setSelectedColorIdx(Math.floor(Math.random() * COVER_COLORS.length));
    setIsAddModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      toast.error("Selecione o arquivo do livro (PDF).");
      return;
    }
    if (!bookTitle.trim()) {
      toast.error("Informe o título do livro.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Enviando e indexando livro na biblioteca...");

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Falha no upload do arquivo.");
      }

      const data = await res.json();

      const newBook: BookItem = {
        id: `book-${Date.now()}`,
        title: bookTitle.trim(),
        author: bookAuthor.trim() || undefined,
        subject: bookSubject,
        description: bookDescription.trim() || undefined,
        fileName: fileToUpload.name,
        fileUrl: data.filePath,
        fileSize: fileToUpload.size,
        fileType: fileToUpload.type || "application/pdf",
        coverColor: COVER_COLORS[selectedColorIdx].hex,
        createdAt: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };

      addBook(newBook);
      toast.success("Livro adicionado com sucesso!", { id: toastId, icon: "📚" });
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao adicionar o livro.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBook = (book: BookItem, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBook(book.id);
    toast.success("Livro movido para a lixeira.");
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shadow-sm">
              <Library className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Biblioteca de Livros & Referências
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/tutoria"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/50 transition-colors shadow-sm"
          >
            <BookMarked className="w-4 h-4" />
            Ir para Tutoria
          </Link>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Adicionar Livro
          </button>
        </div>
      </div>

      {/* Search & Subject Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, autor ou disciplina..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Subject Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs">
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedSubjectFilter === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            Todos ({books.length})
          </button>
          {Array.from(new Set(books.map((b) => b.subject).filter(Boolean))).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubjectFilter(sub!)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedSubjectFilter === sub
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => {
            const colorOption =
              COVER_COLORS.find((c) => c.hex === book.coverColor) || COVER_COLORS[0];

            return (
              <div
                key={book.id}
                onClick={() => setPreviewBook(book)}
                className="group relative bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
              >
                {/* Book Cover Header */}
                <div
                  className={`h-36 bg-gradient-to-br ${colorOption.bg} p-4 flex flex-col justify-between relative overflow-hidden text-white`}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm border border-white/20">
                      {book.subject || "Medicina"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBook(book, e)}
                      title="Excluir livro"
                      className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Decorative book texture */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
                  <div className="absolute left-2 top-0 bottom-0 w-1 bg-white/20 pointer-events-none" />

                  <div className="z-10 mt-auto">
                    <h3 className="font-bold text-base leading-snug line-clamp-2 drop-shadow-sm">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-xs text-white/80 mt-0.5 truncate drop-shadow-sm">
                        {book.author}
                      </p>
                    )}
                  </div>
                </div>

                {/* Book Body */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-white dark:bg-[#1A1D27]">
                  {book.description ? (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {book.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mb-3">
                      Manual de referência pronto para uso na Tutoria.
                    </p>
                  )}

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      {formatFileSize(book.fileSize) || "PDF"}
                    </span>
                    <span>Adicionado em {book.createdAt}</span>
                  </div>

                  {/* Quick Action Button */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewBook(book);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 dark:bg-gray-800/60 dark:hover:bg-blue-900/30 dark:text-gray-300 dark:hover:text-blue-300 text-xs font-semibold transition-colors border border-gray-200/60 dark:border-gray-800 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Abrir Livro
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Library className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {books.length === 0 ? "Sua biblioteca ainda está vazia" : "Nenhum livro encontrado"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            {books.length === 0
              ? "Adicione livros acadêmicos em PDF (como tratados, manuais de fisiologia, patologia ou clínica) para que a IA os utilize como referência verídica na aba Tutoria."
              : "Tente buscar com outros termos ou limpar os filtros de disciplina."}
          </p>
          {books.length === 0 && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Livro
            </button>
          )}
        </div>
      )}

      {/* Add Book Modal */}
      {isAddModalOpen && (
        <div
          onClick={() => !isUploading && setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-full max-w-lg bg-white dark:bg-[#1A1D27] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-scaleUp"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#12141c]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                  <Library className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Adicionar Livro de Referência
                </h3>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBook} className="p-6 space-y-4">
              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Arquivo do Livro (PDF) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {fileToUpload ? (
                  <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {fileToUpload.name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {formatFileSize(fileToUpload.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFileToUpload(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/30"
                  >
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Clique para selecionar o livro em PDF
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Suporta tratados e manuais acadêmicos (PDF, Word)
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Título do Livro / Manual *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tratado de Fisiologia Médica"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Author & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Autor(es) / Organizadores
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Guyton & Hall"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Área / Disciplina
                  </label>
                  <select
                    value={bookSubject}
                    onChange={(e) => setBookSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {SUBJECT_OPTIONS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cover Color Theme */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tema da Capa
                </label>
                <div className="flex items-center gap-2">
                  {COVER_COLORS.map((col, idx) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setSelectedColorIdx(idx)}
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${col.bg} flex items-center justify-center transition-all ${
                        selectedColorIdx === idx ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      title={col.name}
                    >
                      {selectedColorIdx === idx && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Notas de Referência (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: 14ª Edição, foco nos capítulos de sistema cardiovascular e renal."
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? "Enviando Livro..." : "Salvar na Biblioteca"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book PDF Preview Reader Modal */}
      {previewBook && (
        <div
          onClick={() => setPreviewBook(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-full max-w-6xl h-[90vh] bg-white dark:bg-[#1A1D27] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#12141c]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {previewBook.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {previewBook.author || previewBook.subject || "Livro de Referência"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/tutoria"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/50 transition-colors"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Usar na Tutoria</span>
                </Link>

                <a
                  href={previewBook.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>

                <a
                  href={previewBook.fileUrl}
                  download={previewBook.fileName}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewBook(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Iframe */}
            <div className="flex-1 w-full h-full bg-gray-100 dark:bg-[#0F1117] relative">
              <iframe
                src={previewBook.fileUrl}
                title={previewBook.title}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
