"use client";

import { motion } from "framer-motion";
import { Layers, Clock, Play, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardDeckProps {
  deck: {
    id: string;
    name: string;
    cardCount: number;
    progress?: number;
    subject?: string;
    lastStudied?: string;
    cards?: any[];
    difficulty?: string;
  };
  difficulty?: "Fácil" | "Médio" | "Difícil" | string;
  onClick?: () => void;
  onEdit?: () => void;
}

const difficultyColors: Record<string, string> = {
  Fácil: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Médio: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Difícil: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function FlashcardDeck({ deck, difficulty, onClick, onEdit }: FlashcardDeckProps) {
  const cardCount = deck.cards?.length || deck.cardCount || 0;
  const progress = deck.progress || 0;
  const diff = difficulty || deck.difficulty;
  const diffClass = diff ? difficultyColors[diff] || difficultyColors["Médio"] : null;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] p-4 shadow-2xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600 transition-all cursor-pointer overflow-hidden select-none"
      onClick={onClick}
    >
      {/* Top subtle progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div>
        {/* Top Header: Badge & Cards Count */}
        <div className="flex items-center justify-between gap-2 mb-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 shrink-0 shadow-2xs">
              <Layers size={15} />
            </div>
            <span className="rounded-md bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate max-w-[110px]">
              {deck.subject || "Geral"}
            </span>
            {diff && (
              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", diffClass)}>
                {diff}
              </span>
            )}
          </div>

          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/40 shrink-0">
            {cardCount} {cardCount === 1 ? "card" : "cards"}
          </span>
        </div>

        {/* Deck Title */}
        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {deck.name}
        </h3>
      </div>

      {/* Footer: Last seen & actions */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-3 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Clock size={12} />
          <span>{deck.lastStudied || "Hoje"}</span>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
              title="Editar baralho e cartões"
            >
              <Edit3 size={12} />
              <span>Editar</span>
            </button>
          )}

          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-2xs cursor-pointer"
            title="Estudar baralho"
          >
            <Play size={12} className="ml-0.5 fill-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
