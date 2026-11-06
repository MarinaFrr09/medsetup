"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, X, Loader2, BookOpen, Layers, CheckCircle2, Paperclip, FileText, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import toast from "react-hot-toast";

interface AIFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: string;
  defaultDeckId?: string | null;
  onDeckCreated?: (deck: any) => void;
}

export default function AIFlashcardModal({
  isOpen,
  onClose,
  folderId = "folder-geral",
  defaultDeckId,
  onDeckCreated,
}: AIFlashcardModalProps) {
  const { addDeck, addCardsToDeck, flashcardDecks } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(15);
  const [deckName, setDeckName] = useState("");
  const [subject, setSubject] = useState("");
  const [targetMode, setTargetMode] = useState<"new" | "existing">(
    defaultDeckId ? "existing" : "new"
  );
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    defaultDeckId || (flashcardDecks[0]?.id || "")
  );
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      mimeType: string;
      data: string;
    }>
  >([]);

  // Update selectedDeckId if defaultDeckId changes
  useEffect(() => {
    if (defaultDeckId) {
      setTargetMode("existing");
      setSelectedDeckId(defaultDeckId);
    }
  }, [defaultDeckId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

        if (!deckName.trim()) {
          setDeckName(file.name.replace(/\.[^/.]+$/, ""));
        }
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${files.length} arquivo(s) adicionado(s) como base!`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    const hasFiles = attachedFiles.length > 0;
    const effectivePrompt =
      prompt.trim() ||
      (hasFiles
        ? `Gere flashcards aprofundados baseados no conteúdo dos ${attachedFiles.length} documento(s) anexado(s)`
        : "");

    if (!effectivePrompt && !hasFiles) {
      toast.error("Por favor, descreva o tema ou anexe um ou mais PDFs/documentos.");
      return;
    }

    setIsGenerating(true);
    try {
      const fullPrompt = subject
        ? `${effectivePrompt} (Matéria/Disciplina: ${subject})`
        : effectivePrompt;

      const res = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          count,
          fileAttachments: attachedFiles.map((f) => ({
            data: f.data,
            mimeType: f.mimeType,
            name: f.name,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar flashcards");
      }

      const data = await res.json();
      if (!data.flashcards || data.flashcards.length === 0) {
        throw new Error("Nenhum flashcard gerado pela IA. Tente com um texto mais específico.");
      }

      const generatedCards = data.flashcards.map((c: any, idx: number) => ({
        id: `card-ai-${Date.now()}-${idx}`,
        front: c.front,
        back: c.back,
        interval: 1,
        repetition: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
      }));

      if (targetMode === "existing" && selectedDeckId) {
        addCardsToDeck(selectedDeckId, generatedCards);
        const existingDeck = flashcardDecks.find((d) => d.id === selectedDeckId);
        toast.success(
          `${generatedCards.length} novos flashcards adicionados ao baralho "${existingDeck?.name || 'selecionado'}"!`
        );
      } else {
        const finalName =
          deckName.trim() ||
          (hasFiles ? attachedFiles[0].name.replace(/\.[^/.]+$/, "") : prompt.slice(0, 30));

        const newDeck = {
          id: `deck-${Date.now()}`,
          name: finalName,
          subject: subject.trim() || undefined,
          folderId: folderId || "folder-geral",
          cardCount: generatedCards.length,
          cards: generatedCards,
        };

        addDeck(newDeck);
        if (onDeckCreated) {
          onDeckCreated(newDeck);
        }
        toast.success(`${generatedCards.length} flashcards criados no baralho "${finalName}"!`);
      }

      onClose();
      setPrompt("");
      setDeckName("");
      setSubject("");
      handleClearFiles();
    } catch (error: any) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro na geração com IA");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Criar Baralho com IA</h2>
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
                Sobre o que você quer criar os flashcards?
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white disabled:opacity-60 resize-none"
                placeholder={
                  attachedFiles.length > 0
                    ? "Opcional: Direcione a IA (ex: Foque nos capítulos 2 e 3, sintomas e tratamentos)..."
                    : "Ex: Crie flashcards sobre a Primeira Guerra Mundial com datas, tratados e consequências..."
                }
              />
            </div>

            {/* Multiple File Attachments Input (PDF / Doc / Image) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
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
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-gray-300 dark:border-[#2a2d3a] hover:border-purple-500 dark:hover:border-purple-500 bg-gray-50/50 dark:bg-[#0F1117] text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span>Clique para adicionar um ou mais PDFs, apostilas ou slides (sem limite)</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {file.size} • Material base para IA
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          disabled={isGenerating}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-md cursor-pointer"
                          title="Remover este arquivo"
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

            {/* Target Destination: New Deck vs Existing Deck */}
            {flashcardDecks.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-[#2a2d3a]">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Destino dos Flashcards
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode("new")}
                    disabled={isGenerating}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center",
                      targetMode === "new"
                        ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-2xs"
                        : "border-gray-200 dark:border-[#2a2d3a] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    + Criar Novo Baralho
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMode("existing");
                      if (!selectedDeckId && flashcardDecks.length > 0) {
                        setSelectedDeckId(flashcardDecks[0].id);
                      }
                    }}
                    disabled={isGenerating}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center",
                      targetMode === "existing"
                        ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-2xs"
                        : "border-gray-200 dark:border-[#2a2d3a] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    ⚡ Adicionar a Baralho Existente
                  </button>
                </div>

                {targetMode === "existing" && (
                  <div className="mt-2">
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Selecione o Baralho para receber os novos cards:
                    </label>
                    <select
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      disabled={isGenerating}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
                    >
                      {flashcardDecks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.cards?.length || d.cardCount || 0} cards)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {targetMode === "new" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Nome do Baralho (Deck)
                  </label>
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Ex: História - 1ª Guerra"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Matéria / Disciplina
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Ex: História, Biologia, Direito..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Quantidade de Flashcards: {count}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>
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
              "flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-all shadow-sm cursor-pointer",
              isGenerating || (!prompt.trim() && attachedFiles.length === 0)
                ? "bg-purple-600/60 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Gerando Flashcards...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Gerar Flashcards
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
