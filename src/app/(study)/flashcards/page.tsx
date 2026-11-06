"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Sparkles,
  Layers,
  Search,
  Trash2,
  Folder as FolderIcon,
  ArrowLeft,
  Edit3,
  Filter,
} from "lucide-react";
import { useAppStore, Deck } from "@/stores/useAppStore";
import dynamic from "next/dynamic";
import FlashcardDeck from "@/components/flashcards/FlashcardDeck";
import VerticalFolderSidebar from "@/components/common/VerticalFolderSidebar";
import toast from "react-hot-toast";

const FlashcardEditor = dynamic(() => import("@/components/flashcards/FlashcardEditor"), { ssr: false });
const FlashcardStudy = dynamic(() => import("@/components/flashcards/FlashcardStudy"), { ssr: false });
const AIFlashcardModal = dynamic(() => import("@/components/flashcards/AIFlashcardModal"), { ssr: false });
const EditDeckModal = dynamic(() => import("@/components/flashcards/EditDeckModal"), { ssr: false });
const FlashcardsDashboard = dynamic(() => import("@/components/flashcards/FlashcardsDashboard"), { ssr: false });

export default function FlashcardsPage() {
  const {
    flashcardDecks,
    flashcardReviews,
    folders,
    addDeck,
    addCardToDeck,
    deleteDeck,
    moveDeckToFolder,
  } = useAppStore();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiTargetDeckId, setAiTargetDeckId] = useState<string | null>(null);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [studyDeck, setStudyDeck] = useState<Deck | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [movingDeckId, setMovingDeckId] = useState<string | null>(null);

  const handleSelectFolder = (folderId: string | null) => {
    setStudyDeck(null);
    setSelectedFolderId(folderId);
  };

  const handleDeckCreated = (newDeck: any) => {
    let folderId = newDeck.folderId || selectedFolderId;
    const rawSubject = (newDeck.subject || newDeck.name || "").replace(/\s*\(.*?\)\s*/g, "").trim();
    if (!folderId && rawSubject && rawSubject.toLowerCase() !== "geral") {
      const folder = useAppStore.getState().getOrCreateFolder(rawSubject, "flashcards");
      folderId = folder.id;
    }
    addDeck({
      ...newDeck,
      folderId: folderId || "folder-geral",
    });
  };

  const handleCardSaved = (card: {
    front: string;
    back: string;
    deckName: string;
    folderId?: string;
  }) => {
    addCardToDeck(
      card.deckName,
      { front: card.front, back: card.back },
      card.folderId || selectedFolderId || "folder-geral"
    );
  };

  const handleDeleteDeck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteDeck(id);
    toast.success("Baralho movido para a lixeira.");
  };

  const handleMoveDeck = (deckId: string, targetFolderId: string) => {
    moveDeckToFolder(deckId, targetFolderId);
    setMovingDeckId(null);
    toast.success("Baralho movido de pasta!");
  };

  const getDeckDifficulty = (deck: Deck): "Fácil" | "Médio" | "Difícil" => {
    if (deck.difficulty) {
      const d = deck.difficulty.trim().toLowerCase();
      if (d === "fácil" || d === "facil" || d === "easy") return "Fácil";
      if (d === "difícil" || d === "dificil" || d === "hard") return "Difícil";
      return "Médio";
    }
    const deckReviews = flashcardReviews.filter((r) => r.deckId === deck.id);
    if (deckReviews.length > 0) {
      const hard = deckReviews.filter((r) => r.rating === "hard").length;
      const easy = deckReviews.filter((r) => r.rating === "easy").length;
      const medium = deckReviews.filter((r) => r.rating === "medium").length;
      if (hard > easy && hard >= medium) return "Difícil";
      if (easy >= hard && easy >= medium) return "Fácil";
      return "Médio";
    }
    return "Médio";
  };

  const flashcardFolders = useMemo(
    () => folders.filter((f) => f.type === "flashcards"),
    [folders]
  );

  const activeFolderIds = useMemo(() => {
    if (selectedFolderId === null) return null;
    const getDescendants = (id: string): string[] => {
      const children = flashcardFolders.filter((f) => f.parentId === id).map((f) => f.id);
      return [id, ...children.flatMap(getDescendants)];
    };
    return new Set(getDescendants(selectedFolderId));
  }, [selectedFolderId, flashcardFolders]);

  const filteredDecks = useMemo(() => {
    return flashcardDecks.filter((d) => {
      const dFolder = d.folderId || "folder-fc-geral";
      const matchesFolder =
        activeFolderIds === null || activeFolderIds.has(dFolder);
      const matchesSearch =
        !searchQuery.trim() ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.subject &&
          d.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDifficulty =
        !selectedDifficulty || getDeckDifficulty(d) === selectedDifficulty;
      return matchesFolder && matchesSearch && matchesDifficulty;
    });
  }, [flashcardDecks, activeFolderIds, searchQuery, selectedDifficulty, flashcardReviews]);

  const activeFolderName = useMemo(() => {
    if (selectedFolderId === null) return "Todas as Pastas";
    return flashcardFolders.find((f) => f.id === selectedFolderId)?.name || "Pasta";
  }, [flashcardFolders, selectedFolderId]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header - hidden during flashcard study for clean focus */}
      {!studyDeck && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-[#2a2d3a]">
          <div className="flex items-center gap-3">
            {selectedFolderId && (
              <button
                type="button"
                onClick={() => handleSelectFolder(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Voltar ao Dashboard Geral"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="text-purple-600 dark:text-purple-400" size={22} />
                <span>{selectedFolderId ? activeFolderName : "Flashcards"}</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-xs">
                {selectedFolderId
                  ? `Baralhos arquivados na pasta "${activeFolderName}"`
                  : "Organize seus baralhos com repetição espaçada e domine qualquer matéria"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAIOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm shadow-purple-500/20 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Gerar com IA</span>
            </button>
            <button
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>Novo Deck / Card</span>
            </button>
          </div>
        </div>
      )}

      {/* When studying a flashcard deck: Sidebar on left + Flashcard Card in the EXACT horizontal center of the screen */}
      {studyDeck ? (
        <div className="w-full py-1 sm:py-3">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)_288px] xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-6 items-start">
            {/* Left Column: Vertical Folder Sidebar */}
            <div className="w-full">
              <VerticalFolderSidebar
                selectedFolderId={selectedFolderId}
                onSelectFolder={handleSelectFolder}
                type="flashcards"
                className="w-full shrink-0"
              />
            </div>

            {/* Center Column: Flashcard Study Card - Perfectly Centered in the Viewport */}
            <div className="w-full flex justify-center min-w-0">
              <div className="w-full max-w-2xl xl:max-w-3xl">
                <FlashcardStudy
                  cards={studyDeck.cards || []}
                  deckName={studyDeck.name}
                  deckId={studyDeck.id}
                  onClose={() => setStudyDeck(null)}
                  inline
                />
              </div>
            </div>

            {/* Right Column: Symmetrical Balancer ensuring 100% mathematical center */}
            <div className="hidden lg:block w-full pointer-events-none invisible" aria-hidden="true" />
          </div>
        </div>
      ) : (
        /* Main 2-Column Master-Detail Layout */
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* Left Column: Vertical Folder Sidebar */}
          <VerticalFolderSidebar
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            type="flashcards"
            className="w-full lg:w-72 xl:w-80 shrink-0"
            extraFilterSlot={
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Filter size={14} className="text-cyan-500" />
                    <span>Filtros Rápidos</span>
                  </span>
                  {selectedDifficulty && (
                    <button
                      type="button"
                      onClick={() => setSelectedDifficulty("")}
                      className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Dificuldade */}
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block mb-1.5">
                    Dificuldade:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Fácil", "Médio", "Difícil"].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() =>
                          setSelectedDifficulty(
                            selectedDifficulty === diff ? "" : diff
                          )
                        }
                        className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          selectedDifficulty === diff
                            ? diff === "Fácil"
                              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300"
                              : diff === "Médio"
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-gray-50 dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          {/* Right Column: Main Content */}
          <div className="flex-1 min-w-0 space-y-5 w-full">
            {/* Dashboard & Estatísticas Gerais dos Flashcards */}
            {!selectedFolderId && !searchQuery && !selectedDifficulty && (
              <FlashcardsDashboard
                onStudyDeck={(deckId) => {
                  const d = flashcardDecks.find((deck) => deck.id === deckId);
                  if (d) setStudyDeck(d);
                }}
                onOpenAIModal={() => setIsAIOpen(true)}
                onSelectFolder={(fId) => handleSelectFolder(fId)}
                onCreateDeck={() => setIsEditorOpen(true)}
              />
            )}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-gray-200 dark:border-[#2a2d3a] pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>
                    {selectedFolderId
                      ? `Baralhos em "${activeFolderName}"`
                      : searchQuery || selectedDifficulty
                      ? "Resultados da Busca & Filtros"
                      : "Todos os Baralhos de Estudo"}
                  </span>
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {filteredDecks.length}{" "}
                  {filteredDecks.length === 1
                    ? "baralho disponível"
                    : "baralhos disponíveis"}
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder={
                    selectedFolderId
                      ? "Buscar nesta pasta..."
                      : "Buscar baralhos..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 shadow-2xs outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white"
                />
              </div>
            </div>

            {filteredDecks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredDecks.map((deck) => {
                  const currentFolder = folders.find(
                    (f) => f.id === (deck.folderId || "folder-geral")
                  );
                  return (
                    <div key={deck.id} className="relative group">
                      <FlashcardDeck
                        deck={deck}
                        difficulty={getDeckDifficulty(deck)}
                        onClick={() => setStudyDeck(deck)}
                        onEdit={() => setEditingDeck(deck)}
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDeck(deck);
                          }}
                          className="p-1 bg-white dark:bg-gray-800 text-gray-500 hover:text-purple-600 rounded-md shadow-2xs border border-gray-200 dark:border-gray-700 cursor-pointer"
                          title="Editar baralho"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMovingDeckId(
                                movingDeckId === deck.id ? null : deck.id
                              );
                            }}
                            className="p-1 bg-white dark:bg-gray-800 text-gray-500 hover:text-blue-600 rounded-md shadow-2xs border border-gray-200 dark:border-gray-700 cursor-pointer"
                            title="Mover para outra pasta"
                          >
                            <FolderIcon className="w-3 h-3" />
                          </button>
                          {movingDeckId === deck.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-7 w-44 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-xl shadow-xl p-2 z-30 space-y-1"
                            >
                              <p className="text-[10px] font-bold text-gray-400 uppercase px-2 py-0.5">
                                Mover para:
                              </p>
                              {flashcardFolders.map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => handleMoveDeck(deck.id, f.id)}
                                  className="w-full text-left px-2 py-1 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 flex items-center justify-between cursor-pointer"
                                >
                                  <span className="truncate">{f.name}</span>
                                  {(deck.folderId || "folder-geral") === f.id && (
                                    <span className="text-[10px] text-blue-500 font-bold">
                                      Atual
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDeck(e, deck.id)}
                          className="p-1 bg-white dark:bg-gray-800 text-gray-500 hover:text-red-500 rounded-md shadow-2xs border border-gray-200 dark:border-gray-700 cursor-pointer"
                          title="Excluir baralho"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      {currentFolder && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 px-1">
                          <FolderIcon
                            className="w-2.5 h-2.5"
                            style={{
                              color: currentFolder.color || "#2563EB",
                            }}
                          />
                          <span>{currentFolder.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-[#1A1D27] rounded-2xl border border-dashed border-gray-300 dark:border-[#2a2d3a]">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 mb-2">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  {selectedFolderId
                    ? `Nenhum baralho na pasta "${activeFolderName}"`
                    : "Nenhum baralho encontrado com os filtros selecionados"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-xs mb-4">
                  {selectedDifficulty
                    ? `Não encontramos baralhos com a dificuldade "${selectedDifficulty}". Tente limpar o filtro ou gerar novos baralhos.`
                    : "Crie flashcards para esta pasta ou use a IA para gerar dezenas de cartões sobre qualquer matéria."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAIOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Gerar com IA</span>
                  </button>
                  <button
                    onClick={() => setIsEditorOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Criar Manualmente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <FlashcardEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        defaultFolderId={selectedFolderId}
        onCardSaved={handleCardSaved}
      />
      <AIFlashcardModal
        isOpen={isAIOpen}
        onClose={() => {
          setIsAIOpen(false);
          setAiTargetDeckId(null);
        }}
        folderId={selectedFolderId || "folder-geral"}
        defaultDeckId={aiTargetDeckId}
        onDeckCreated={handleDeckCreated}
      />

      <EditDeckModal
        isOpen={!!editingDeck}
        onClose={() => setEditingDeck(null)}
        deck={
          editingDeck
            ? flashcardDecks.find((d) => d.id === editingDeck.id) || editingDeck
            : null
        }
        onOpenAIGenerate={(targetDeckId) => {
          setEditingDeck(null);
          setAiTargetDeckId(targetDeckId);
          setIsAIOpen(true);
        }}
      />
    </div>
  );
}
