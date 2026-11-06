"use client";

import { useState } from "react";
import { X, Save, Folder as FolderIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import toast from "react-hot-toast";

interface FlashcardEditorProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFolderId?: string | null;
  onCardSaved?: (card: { front: string; back: string; deckName: string; folderId?: string }) => void;
}

export default function FlashcardEditor({
  isOpen,
  onClose,
  defaultFolderId,
  onCardSaved,
}: FlashcardEditorProps) {
  const { folders, addCardToDeck } = useAppStore();
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [deckName, setDeckName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState(defaultFolderId || "folder-geral");

  if (!isOpen) return null;

  const handleSave = () => {
    if (!frontText.trim() || !backText.trim()) {
      toast.error("Preencha a frente e o verso do flashcard.");
      return;
    }

    const finalDeckName = deckName.trim() || "Geral";
    const finalFolderId = targetFolderId || "folder-geral";

    if (onCardSaved) {
      onCardSaved({
        front: frontText.trim(),
        back: backText.trim(),
        deckName: finalDeckName,
        folderId: finalFolderId,
      });
    } else {
      addCardToDeck(finalDeckName, { front: frontText.trim(), back: backText.trim() }, finalFolderId);
    }

    toast.success("Flashcard salvo com sucesso!");
    onClose();
    setFrontText("");
    setBackText("");
    setDeckName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex w-full max-w-2xl flex-col max-h-[90vh] rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Novo Flashcard</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Nome do Baralho (Deck)
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Ex: Anatomia, Fisiologia, Geral..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FolderIcon className="w-3.5 h-3.5 text-purple-500" />
                Pasta do Baralho
              </label>
              <select
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
              >
                {folders
                  .filter((f) => f.type === "both" || f.type === "flashcards")
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-900 dark:text-white">
                Frente (Pergunta / Conceito)
              </label>
              <textarea
                rows={6}
                value={frontText}
                onChange={(e) => setFrontText(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3.5 text-sm text-gray-900 shadow-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white resize-none"
                placeholder="Ex: O que é mitocôndria e qual sua principal função?"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-900 dark:text-white">
                Verso (Resposta / Explicação)
              </label>
              <textarea
                rows={6}
                value={backText}
                onChange={(e) => setBackText(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3.5 text-sm text-gray-900 shadow-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white resize-none"
                placeholder="Ex: Organela responsável pela respiração celular e produção de energia na forma de ATP."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gray-50/50 dark:bg-[#1A1D27]">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
          >
            <Save size={16} /> Salvar Flashcard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
