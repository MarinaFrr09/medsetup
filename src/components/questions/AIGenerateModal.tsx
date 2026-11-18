"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, X, Loader2, Clock, Paperclip, FileText, Plus, Folder as FolderIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import toast from "react-hot-toast";

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFolderId?: string | null;
  onQuestionsGenerated?: (questions: any[], folderId?: string) => void;
}

export default function AIGenerateModal({
  isOpen,
  onClose,
  defaultFolderId,
  onQuestionsGenerated,
}: AIGenerateModalProps) {
  const { folders } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("all");
  const [type, setType] = useState("multiple_choice");
  const [subject, setSubject] = useState("");
  const [targetFolderId, setTargetFolderId] = useState(defaultFolderId || "folder-geral");

  useEffect(() => {
    if (defaultFolderId) {
      setTargetFolderId(defaultFolderId);
    }
  }, [defaultFolderId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{
      id: string;
      name: string;
      file?: File;
      data?: string;
      mimeType: string;
      size: string;
    }>
  >([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      file,
      mimeType: file.type || "application/pdf",
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${files.length} arquivo(s) adicionado(s) como base das questões!`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Timer while generating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const hasFiles = attachedFiles.length > 0;
    if (!hasFiles && (!prompt || prompt.trim().length < 3)) {
      toast.error("Por favor, descreva o tema ou anexe um ou mais PDFs/documentos.");
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000);

    try {
      const basePrompt =
        prompt.trim() ||
        (hasFiles
          ? `Gere questões com base no conteúdo dos ${attachedFiles.length} documento(s) anexado(s)`
          : "");
      const fullPrompt = subject ? `${basePrompt} (Disciplina: ${subject.trim()})` : basePrompt;

      let res: Response;
      if (hasFiles && attachedFiles.some((f) => f.file)) {
        const formData = new FormData();
        formData.append("prompt", fullPrompt);
        formData.append("count", String(count));
        formData.append("difficulty", difficulty);
        formData.append("type", type);
        attachedFiles.forEach((f) => {
          if (f.file) {
            formData.append("files", f.file);
          }
        });

        res = await fetch("/api/ai/generate-questions", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } else {
        res = await fetch("/api/ai/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            count,
            difficulty,
            type,
            fileAttachments: attachedFiles
              .filter((f) => f.data)
              .map((f) => ({
                name: f.name,
                data: f.data,
                mimeType: f.mimeType,
              })),
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar questões");
      }

      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        toast.success(`${data.questions.length} questões geradas com sucesso!`);
        if (onQuestionsGenerated) {
          onQuestionsGenerated(data.questions, targetFolderId);
        }
        handleClearFiles();
        onClose();
        setPrompt("");
        setSubject("");
      } else {
        throw new Error("Nenhuma questão foi retornada. Tente com um tema mais específico.");
      }
    } catch (error: any) {
      console.error("Erro gerando questões:", error);
      if (error.name === "AbortError") {
        toast.error("A IA demorou mais que o esperado. Tente pedir uma quantidade menor de questões (ex: 5).");
      } else {
        const msg = error instanceof Error ? error.message : "Erro na geração com IA";
        toast.error(msg);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) {
          onClose();
        }
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] overflow-hidden cursor-default"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gerar Questões com IA</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                O que você quer estudar? Descreva o assunto ou direcione a IA:
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white disabled:opacity-60 resize-none transition-all"
                placeholder={
                  attachedFiles.length > 0
                    ? "Opcional: Direcione a IA (ex: Foque nos capítulos 2 e 3, ou formule casos clínicos)..."
                    : "Ex: Sistema Respiratório: trocas gasosas, alvéolos, diafragma e hematose..."
                }
              />
            </div>

            {/* Multiple File Attachments Input (PDF / Doc / Image) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Anexar PDFs / Materiais de Estudo ({attachedFiles.length})
                </label>
                {attachedFiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {attachedFiles.length} arquivo(s) carregado(s)
                    </span>
                    <button
                      type="button"
                      onClick={handleClearFiles}
                      className="text-[10px] text-gray-400 hover:text-red-500 underline cursor-pointer"
                    >
                      Remover todos
                    </button>
                  </div>
                )}
              </div>

              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.ppt,.pptx"
                className="hidden"
              />

              {attachedFiles.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-[#2a2d3a] hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-[#0F1117] text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Clique para adicionar um ou mais PDFs, apostilas ou slides (sem limite)</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {file.size} • Material base para formulação das questões
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
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar mais PDFs ou materiais</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span>Quantidade:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={count}
                      onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                      disabled={isGenerating}
                      className="w-14 px-1.5 py-0.5 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm focus:outline-hidden"
                    />
                    <span className="text-xs text-gray-500">questões</span>
                  </label>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">(até 100)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={isGenerating}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[5, 10, 20, 30, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCount(num)}
                      disabled={isGenerating}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        count === num
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dificuldade
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={isGenerating}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
                >
                  <option value="all">Todas as Dificuldades (Mista / Balanceada)</option>
                  <option value="easy">Fácil</option>
                  <option value="medium">Médio</option>
                  <option value="hard">Difícil</option>
                </select>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                  {difficulty === "all"
                    ? "Gera mix equilibrado de fáceis, médias e difíceis."
                    : `Foca no nível ${difficulty === "easy" ? "fácil" : difficulty === "hard" ? "difícil" : "médio"}.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de Questão
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={isGenerating}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
                >
                  <option value="multiple_choice">Múltipla Escolha (A a E)</option>
                  <option value="true_false">Verdadeiro ou Falso</option>
                  <option value="essay">Dissertativa</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <FolderIcon className="w-3.5 h-3.5 text-blue-500" />
                  Deck / Pasta Destino
                </label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
                >
                  {folders
                    .filter((f) => f.type === "questions")
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Matéria / Disciplina (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Biologia, Medicina, Direito..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isGenerating}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
                />
              </div>
            </div>

            {isGenerating && (
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  A IA está lendo os documentos, formulando os enunciados, gabarito e resolução...
                </span>
                <span className="flex items-center gap-1 font-mono font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {elapsedSeconds}s
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gray-50/50 dark:bg-[#1A1D27]">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && attachedFiles.length === 0)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold text-white transition-all shadow-sm cursor-pointer",
              isGenerating || (!prompt.trim() && attachedFiles.length === 0)
                ? "bg-blue-600/60 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Gerando Questões ({elapsedSeconds}s)...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Gerar Questões
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
