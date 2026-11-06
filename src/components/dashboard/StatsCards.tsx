"use client";

import { motion } from "framer-motion";
import { HelpCircle, Layers, GitBranch, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import Link from "next/link";

export function StatsCards() {
  const { questions, flashcardDecks, mindmaps, audioRecordings } = useAppStore();

  const totalFlashcardsCount = flashcardDecks.reduce(
    (acc, deck) => acc + (deck.cards?.length || deck.cardCount || 0),
    0
  );

  const stats = [
    {
      title: "Total de Questões",
      value: questions.length.toString(),
      icon: HelpCircle,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
      href: "/questions",
    },
    {
      title: "Flashcards",
      value: totalFlashcardsCount.toString(),
      icon: Layers,
      color: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-500",
      href: "/flashcards",
    },
    {
      title: "Mapas Mentais",
      value: mindmaps.length.toString(),
      icon: GitBranch,
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-500",
      href: "/mindmaps",
    },
    {
      title: "Aulas Gravadas",
      value: audioRecordings.length.toString(),
      icon: Mic,
      color: "from-orange-500/20 to-orange-500/5",
      iconColor: "text-orange-500",
      href: "/audio",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Link
          key={i}
          href={stat.href}
          className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] p-5 shadow-xs transition-all hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 group"
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none", stat.color)} />
          <div className="relative flex items-center justify-between">
            <div className={cn("p-2.5 rounded-xl bg-gray-50 dark:bg-[#0F1117] shadow-xs", stat.iconColor)}>
              <stat.icon size={20} />
            </div>
            <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
              Ver todos →
            </span>
          </div>
          <div className="relative mt-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {stat.title}
            </h3>
            <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
