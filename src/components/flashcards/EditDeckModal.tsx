"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Save,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  Layers,
  Folder as FolderIcon,
  Check,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, Deck, Flashcard } from "@/stores/useAppStore";
import { renderFormattedText, cleanFlashcardText } from "@/lib/questionUtils";
import toast from "react-hot-toast";

interface EditDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck | null;
  onOpenAIGenerate?: (targetDeckId: string) => void;
}

export default function EditDeckModal({
  isOpen,
  onClose,
  deck,
  onOpenAIGenerate,
}: EditDeckModalProps) {
  const {
    folders,
    updateDeck,
    deleteDeck,
    addCardsToDeck,
    updateFlashcardInDeck,
    deleteCardFromDeck,
  } = useAppStore();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [folderId, setFolderId] = useState("folder-geral");

  // Search in cards
  const [cardSearch, setCardSearch] = useState("");

  // Adding new card manual
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  // Editing existing card
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  useEffect(() => {
    if (deck) {
      setName(deck.name || "");
      setSubject(deck.subject || "");
      setFolderId(deck.folderId || "folder-geral");
      setIsAddingCard(false);
      setEditingCardIndex(null);
      setCardSearch("");
    }
  }, [deck]);

  if (!isOpen || !deck) return null;

  const cards = deck.cards || [];

  const filteredCards = cards.filter((card) => {
    if (!cardSearch.trim()) return true;
    const q = cardSearch.toLowerCase();
    return (
      (card.front && card.front.toLowerCase().includes(q)) ||
      (card.back && card.back.toLowerCase().includes(q))
    );
  });

  const handleSaveDeckMeta = () => {
    if (!name.trim()) {
      toast.error("O nome do baralho não pode ficar vazio.");
      return;
    }

    const updated: Deck = {
      ...deck,
      name: name.trim(),
      subject: subject.trim() || undefined,
      folderId: folderId || "folder-geral",
    };

    updateDeck(updated);
    toast.success("Baralho atualizado com sucesso!");
  };

  const handleAddNewCard = () => {
    const cleanFront = cleanFlashcardText(newFront.trim());
    const cleanBack = cleanFlashcardText(newBack.trim());

    if (!cleanFront || !cleanBack) {
      toast.error("Preencha a frente e o verso do cartão.");
      return;
    }

    const newCard: Flashcard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      front: cleanFront,
      back: cleanBack,
    };

    addCardsToDeck(deck.id, [newCard]);
    toast.success("Cartão adicionado ao baralho!");
    setNewFront("");
    setNewBack("");
    setIsAddingCard(false);
  };

  const handleStartEditCard = (index: number, card: Flashcard) => {
    setEditingCardIndex(index);
    setEditFront(card.front || "");
    setEditBack(card.back || "");
  };

  const handleSaveEditCard = (index: number) => {
    const cleanFront = cleanFlashcardText(editFront.trim());
    const cleanBack = cleanFlashcardText(editBack.trim());

    if (!cleanFront || !cleanBack) {
      toast.error("Frente e verso não podem ficar vazios.");
      return;
    }

    updateFlashcardInDeck(deck.id, index, {
      front: cleanFront,
      back: cleanBack,
    });

    toast.success("Cartão atualizado!");
    setEditingCardIndex(null);
    setEditFront("");
    setEditBack("");
  };

  const handleDeleteCard = (index: number) => {
    deleteCardFromDeck(deck.id, index);
    toast.success("Cartão removido do baralho.");
  };

  const handleDeleteEntireDeck = () => {
    deleteDeck(deck.id);
    toast.success("Baralho movido para a lixeira.");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex w-full max-w-4xl flex-col max-h-[92vh] rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] overflow-hidden my-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gradient-to-r from-purple-50/50 via-indigo-50/30 to-transparent dark:from-purple-950/20 dark:via-indigo-950/10 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Editar Baralho
                <span className="text-xs font-normal text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  {cards.length} {cards.length === 1 ? "card" : "cards"}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gerencie as informações, adicione novos cartões ou gere mais com IA.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Deck Metadata (Renomear, Matéria, Pasta) */}
          <div className="bg-gray-50/70 dark:bg-[#0F1117] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#2a2d3a] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                Informações do Baralho
              </h3>
              <button
                type="button"
                onClick={handleSaveDeckMeta}
                className="flex items-center gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Salvar Nome / Pasta
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Baralho
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do Baralho"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Matéria / Assunto
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Anatomia, Fisiologia"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <FolderIcon className="w-3.5 h-3.5 text-purple-500" />
                  Pasta
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white cursor-pointer"
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
          </div>

          {/* Section 2: Cards Actions & Search Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingCard(!isAddingCard)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Cartão Manual</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenAIGenerate) {
                    onOpenAIGenerate(deck.id);
                  }
                }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                title="Gera mais flashcards com base no tema ou PDF e adiciona a este baralho"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Gerar Mais com IA</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar cartões no baralho..."
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
              />
            </div>
          </div>

          {/* Inline Form to Add New Card */}
          <AnimatePresence>
            {isAddingCard && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Novo Cartão no Baralho
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingCard(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Frente (Pergunta / Conceito)
                    </label>
                    <textarea
                      rows={3}
                      value={newFront}
                      onChange={(e) => setNewFront(e.target.value)}
                      placeholder="Ex: Qual a principal função das mitocôndrias?"
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Verso (Resposta / Definição)
                    </label>
                    <textarea
                      rows={3}
                      value={newBack}
                      onChange={(e) => setNewBack(e.target.value)}
                      placeholder="Ex: Produção de ATP através da respiração celular."
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCard(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewCard}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Cartão
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>Cartões ({filteredCards.length})</span>
              {cardSearch && (
                <span className="text-[11px] font-normal text-purple-600 dark:text-purple-400">
                  Filtrando por "{cardSearch}"
                </span>
              )}
            </h4>

            {filteredCards.length > 0 ? (
              <div className="space-y-2.5">
                {filteredCards.map((card, idx) => {
                  const originalIndex = cards.indexOf(card);
                  const isEditingThis = editingCardIndex === originalIndex;

                  return (
                    <div
                      key={card.id || originalIndex}
                      className="p-3.5 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#0F1117] hover:border-purple-300 dark:hover:border-purple-900/60 transition-all shadow-2xs"
                    >
                      {isEditingThis ? (
                        /* Inline Edit Form for this card */
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Frente do Cartão #{originalIndex + 1}
                              </label>
                              <textarea
                                rows={3}
                                value={editFront}
                                onChange={(e) => setEditFront(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Verso do Cartão #{originalIndex + 1}
                              </label>
                              <textarea
                                rows={3}
                                value={editBack}
                                onChange={(e) => setEditBack(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white resize-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCardIndex(null)}
                              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditCard(originalIndex)}
                              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Salvar Cartão
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal card view */
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-gray-50/80 dark:bg-[#1A1D27] p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-0.5">
                                Frente #{originalIndex + 1}
                              </span>
                              <div className="text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                {renderFormattedText(card.front)}
                              </div>
                            </div>

                            <div className="bg-gray-50/80 dark:bg-[#1A1D27] p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                Verso
                              </span>
                              <div className="text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                {renderFormattedText(card.back)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 pt-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditCard(originalIndex, card)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Editar este cartão"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCard(originalIndex)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Excluir este cartão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200 dark:border-[#2a2d3a] bg-gray-50/50 dark:bg-[#0F1117]">
                <Layers className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cardSearch
                    ? "Nenhum cartão corresponde à busca."
                    : "Este baralho não possui nenhum cartão ainda."}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCard(true)}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    + Adicionar manualmente
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <button
                    type="button"
                    onClick={() => onOpenAIGenerate && onOpenAIGenerate(deck.id)}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    ⚡ Gerar com IA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gray-50/50 dark:bg-[#1A1D27]">
          <button
            type="button"
            onClick={handleDeleteEntireDeck}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir Baralho
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              Concluir
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveDeckMeta();
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" /> Salvar e Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
