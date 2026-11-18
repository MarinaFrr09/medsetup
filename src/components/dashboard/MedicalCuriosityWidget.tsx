"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  CheckCircle2,
  Copy,
  Lightbulb,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getCuriosityForCurrentHour,
  getCuriosityExplanation,
} from "@/data/medicalCuriosities";

export function MedicalCuriosityWidget() {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [customIndex, setCustomIndex] = useState<number | undefined>(undefined);
  const [minutesRemaining, setMinutesRemaining] = useState<number>(60);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setMinutesRemaining(60 - now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const { curiosity, total, currentIndex } = getCuriosityForCurrentHour(customIndex);
  const explanation = getCuriosityExplanation(curiosity);

  const handleNextCuriosity = () => {
    const nextIdx = (currentIndex + 1) % total;
    setCustomIndex(nextIdx);
    setIsExpanded(false);
  };

  const handleCopy = () => {
    const fullText = `"${curiosity.shortFact}"\n\n${explanation}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 shadow-xs animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
        <div className="h-10 w-full bg-gray-100 dark:bg-gray-800/60 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-[#1A1D27] p-4 sm:p-5 shadow-xs transition-all hover:border-gray-300 dark:hover:border-gray-700">
      {/* Cabeçalho Compacto e Minimalista */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Lightbulb size={15} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-900 dark:text-white block leading-tight">
              Curiosidade do dia
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 font-medium mt-0.5">
              <Clock size={10} /> Atualiza em {minutesRemaining}m
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border mr-1 ${curiosity.categoryColor.badge} ${curiosity.categoryColor.border}`}
          >
            {curiosity.category}
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Copiar texto"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>

          <button
            type="button"
            onClick={handleNextCuriosity}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title={`Próxima curiosidade (${currentIndex + 1}/${total})`}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Frase Principal */}
      <p className="text-xs sm:text-[13px] font-medium text-gray-800 dark:text-gray-100 leading-relaxed mt-3">
        {curiosity.shortFact}
      </p>

      {/* Botão Saber Mais */}
      <div className="mt-2.5 flex items-center">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? "Ocultar explicação" : "Saiba mais"}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Apenas um textinho abaixo, sem tópicos */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/60">
              {explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
