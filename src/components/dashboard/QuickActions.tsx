"use client";

import { motion } from "framer-motion";
import { HelpCircle, Layers, GitBranch, Mic } from "lucide-react";
import Link from "next/link";

const actions = [
  {
    title: "Nova Questão",
    description: "Criar ou gerar questões com IA",
    icon: HelpCircle,
    href: "/questions",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30",
  },
  {
    title: "Novo Flashcard",
    description: "Criar baralhos de memorização",
    icon: Layers,
    href: "/flashcards",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30",
  },
  {
    title: "Novo Mapa Mental",
    description: "Organizar ideias e diagramas com IA",
    icon: GitBranch,
    href: "/mindmaps",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30",
  },
  {
    title: "Gravar Aula",
    description: "Ouvir microfone, transcrever e resumir",
    icon: Mic,
    href: "/audio",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/30",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {actions.map((action, i) => (
        <Link key={i} href={action.href} className="block group">
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            whileTap={{ scale: 0.985 }}
            className={`flex flex-col items-start p-5 rounded-xl border bg-white dark:bg-[#1A1D27] shadow-sm hover:shadow-md transition-all ${action.color}`}
          >
            <div className="p-3 rounded-xl mb-3 bg-white dark:bg-[#0F1117] shadow-sm">
              <action.icon size={24} />
            </div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {action.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
