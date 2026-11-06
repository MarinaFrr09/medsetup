"use client";

import { motion } from "framer-motion";
import { Clock, FolderOpen } from "lucide-react";
import Link from "next/link";

interface Activity {
  id: string;
  title: string;
  type: string;
  date: string;
}

export function RecentActivity({ activities = [] }: { activities?: Activity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] p-8 text-center flex flex-col items-center justify-center">
        <div className="p-3 bg-gray-50 dark:bg-[#0F1117] rounded-full text-gray-400 dark:text-gray-500 mb-3">
          <Clock size={24} />
        </div>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Nenhuma atividade recente
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
          Suas criações de questões, flashcards, mapas mentais e gravações aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] overflow-hidden shadow-sm">
      <div className="divide-y divide-gray-100 dark:divide-[#2a2d3a]">
        {activities.map((activity, i) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {activity.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{activity.type}</p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{activity.date}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
