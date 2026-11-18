"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { renderFormattedText } from "@/lib/questionUtils";

interface FlashcardStudyProps {
  cards: any[];
  deckName: string;
  deckId?: string;
  onClose: () => void;
  inline?: boolean;
}

export default function FlashcardStudy({
  cards,
  deckName,
  deckId = "",
  onClose,
  inline = true,
}: FlashcardStudyProps) {
  const { recordFlashcardReview } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [fontSize, setFontSize] = useState<"sm" | "base" | "md">("base");

  const frontTextClass =
    fontSize === "sm"
      ? "text-sm sm:text-base font-medium leading-relaxed"
      : fontSize === "md"
      ? "text-xl sm:text-2xl font-medium leading-relaxed"
      : "text-base sm:text-lg md:text-xl font-medium leading-relaxed";

  const backTextClass =
    fontSize === "sm"
      ? "text-xs sm:text-sm leading-relaxed font-normal"
      : fontSize === "md"
      ? "text-base sm:text-lg leading-relaxed font-normal"
      : "text-sm sm:text-base md:text-lg leading-relaxed font-normal";

  const card = cards[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResults) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < cards.length - 1) {
          setIsFlipped(false);
          setCurrentIndex(currentIndex + 1);
        } else {
          setShowResults(true);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) {
          setIsFlipped(false);
          setCurrentIndex(currentIndex - 1);
        }
      } else if (isFlipped) {
        if (e.key === "1") handleRating("hard");
        if (e.key === "2") handleRating("medium");
        if (e.key === "3") handleRating("easy");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, currentIndex, showResults, cards.length]);

  const handleRating = (rating: "easy" | "medium" | "hard") => {
    setRatings((prev) => ({ ...prev, [currentIndex]: rating }));
    if (deckId) {
      recordFlashcardReview({ deckId, deckName, cardIndex: currentIndex, rating });
    }
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setShowResults(true);
      }
    }, 150);
  };

  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 0;
  const easyCount = Object.values(ratings).filter((r) => r === "easy").length;
  const mediumCount = Object.values(ratings).filter((r) => r === "medium").length;
  const hardCount = Object.values(ratings).filter((r) => r === "hard").length;

  return (
    <div
      className={cn(
        inline
          ? "w-full flex flex-col bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs overflow-hidden"
          : "fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#0F1117]"
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-3 border-b border-gray-200 bg-gray-50/70 dark:bg-gray-800/40 px-5 sm:px-6 py-3.5 dark:border-[#2a2d3a]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors text-xs font-bold cursor-pointer shadow-2xs shrink-0"
            title="Voltar aos Baralhos"
          >
            <ArrowLeft size={14} />
            <span>Voltar aos Baralhos</span>
          </button>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
            {deckName}
          </span>
        </div>

        <div className="flex flex-col items-center justify-self-center">
          <span className="text-xs font-bold text-gray-900 dark:text-white mb-1">
            {showResults ? "Revisão Concluída" : `Card ${currentIndex + 1} de ${cards.length}`}
          </span>
          <div className="w-40 sm:w-52 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end min-w-[120px]">
          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setFontSize((prev) => (prev === "md" ? "base" : "sm"))}
              disabled={fontSize === "sm"}
              className="px-1.5 py-0.5 text-[11px] font-bold rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Diminuir tamanho da fonte"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize((prev) => (prev === "sm" ? "base" : "md"))}
              disabled={fontSize === "md"}
              className="px-1.5 py-0.5 text-[11px] font-bold rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Aumentar tamanho da fonte"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        inline ? "p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center min-h-[440px]" : "flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden"
      )}>
        {!showResults ? (
          <div className="w-full max-w-3xl sm:max-w-[820px] lg:max-w-[860px] flex flex-col items-center perspective-1000 select-none">
            <motion.div
              className="relative w-full min-h-[300px] sm:min-h-[340px] md:min-h-[380px] aspect-[16/10] sm:aspect-[16/9.5] cursor-pointer preserve-3d select-none [&_*]:select-none [&_*]:cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
              animate={{ rotateX: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
            >
              <div
                className={cn(
                  "absolute inset-0 w-full h-full rounded-2xl border-2 border-gray-100 bg-white p-7 sm:p-9 shadow-md dark:border-gray-700 dark:bg-[#1A1D27] backface-hidden flex flex-col items-center justify-center text-center select-none cursor-pointer [&_*]:select-none [&_*]:cursor-pointer",
                  isFlipped ? "pointer-events-none" : ""
                )}
              >
                <div className="absolute top-4 left-4 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 select-none cursor-pointer">
                  Frente
                </div>
                <div className="w-full max-h-[75%] overflow-y-auto px-4 sm:px-6 text-center select-none cursor-pointer">
                  <div className={cn("text-gray-900 dark:text-white select-none cursor-pointer max-w-2xl mx-auto", frontTextClass)}>
                    {renderFormattedText(card?.front)}
                  </div>
                </div>
                <p className="absolute bottom-4 sm:bottom-5 text-xs text-gray-400 dark:text-gray-500 animate-pulse select-none cursor-pointer font-medium">
                  Clique ou aperte Espaço para virar
                </p>
              </div>
              <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-purple-100 bg-white p-7 sm:p-9 shadow-md dark:border-purple-900/30 dark:bg-[#1A1D27] backface-hidden flex flex-col items-center justify-center text-center rotate-x-180 select-none cursor-pointer [&_*]:select-none [&_*]:cursor-pointer">
                <div className="absolute top-4 left-4 rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 select-none cursor-pointer">
                  Verso
                </div>
                <div className="w-full max-h-[78%] overflow-y-auto px-4 sm:px-6 text-center select-none cursor-pointer [&_*]:select-none [&_*]:cursor-pointer">
                  <div className={cn("text-gray-800 dark:text-gray-200 select-none cursor-pointer max-w-2xl mx-auto", backTextClass)}>
                    {renderFormattedText(card?.back)}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mt-6 h-16 w-full flex justify-center">
              <AnimatePresence>
                {isFlipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="flex gap-3 sm:gap-4"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating("hard");
                      }}
                      className="group flex flex-col items-center gap-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 px-5 sm:px-6 py-2 sm:py-2.5 transition-all dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:border-red-900/30 cursor-pointer shadow-2xs hover:scale-105"
                    >
                      <span className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                        Difícil
                      </span>
                      <span className="text-[10px] text-red-500/80 dark:text-red-400/70 font-medium">Atalho: 1</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating("medium");
                      }}
                      className="group flex flex-col items-center gap-1 rounded-xl bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-5 sm:px-6 py-2 sm:py-2.5 transition-all dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 dark:border-yellow-900/30 cursor-pointer shadow-2xs hover:scale-105"
                    >
                      <span className="text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-500">
                        Médio
                      </span>
                      <span className="text-[10px] text-yellow-600/80 dark:text-yellow-400/70 font-medium">
                        Atalho: 2
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating("easy");
                      }}
                      className="group flex flex-col items-center gap-1 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 px-5 sm:px-6 py-2 sm:py-2.5 transition-all dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:border-green-900/30 cursor-pointer shadow-2xs hover:scale-105"
                    >
                      <span className="text-sm sm:text-base font-bold text-green-600 dark:text-green-500">
                        Fácil
                      </span>
                      <span className="text-[10px] text-green-600/80 dark:text-green-400/70 font-medium">
                        Atalho: 3
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Statistics below the flashcard */}
            <div className="mt-4 flex items-center justify-center gap-5 px-3.5 py-1.5 rounded-xl bg-white/70 dark:bg-[#1A1D27]/70 border border-gray-200/80 dark:border-gray-800 backdrop-blur-xs text-xs shadow-2xs">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                {easyCount} {easyCount === 1 ? "fácil" : "fáceis"}
              </span>
              <span className="h-3 w-px bg-gray-200 dark:bg-gray-800" />
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                {mediumCount} {mediumCount === 1 ? "médio" : "médios"}
              </span>
              <span className="h-3 w-px bg-gray-200 dark:bg-gray-800" />
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                {hardCount} {hardCount === 1 ? "difícil" : "difíceis"}
              </span>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Parabéns! 🎉</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              Você revisou {cards.length} cards no deck &quot;{deckName}&quot;.
            </p>
            <div className="flex gap-6 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{easyCount}</div>
                <div className="text-xs text-gray-500">Fáceis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{mediumCount}</div>
                <div className="text-xs text-gray-500">Médios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-500">{hardCount}</div>
                <div className="text-xs text-gray-500">Difíceis</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-purple-600 px-8 py-3 font-medium text-white hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
            >
              Voltar aos Decks
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
