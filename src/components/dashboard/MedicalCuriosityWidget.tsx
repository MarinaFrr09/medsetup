"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  Copy,
  Brain,
  Pill,
  Stethoscope,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  MEDICAL_CURIOSITIES,
  getCuriosityForCurrentHour,
  MedicalCuriosity,
} from "@/data/medicalCuriosities";

export function MedicalCuriosityWidget() {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [customIndex, setCustomIndex] = useState<number | undefined>(undefined);
  const [minutesRemaining, setMinutesRemaining] = useState<number>(60);
  const [copied, setCopied] = useState(false);

  // Carregar do localStorage ou calcular pela hora atual
  useEffect(() => {
    setMounted(true);
    const updateTimeAndIndex = () => {
      const now = new Date();
      setMinutesRemaining(60 - now.getMinutes());
    };

    updateTimeAndIndex();
    const interval = setInterval(updateTimeAndIndex, 60000); // checar a cada minuto
    return () => clearInterval(interval);
  }, []);

  const { curiosity, total, currentIndex } = getCuriosityForCurrentHour(customIndex);

  const handleNextCuriosity = () => {
    const nextIdx = (currentIndex + 1) % total;
    setCustomIndex(nextIdx);
    setIsExpanded(false);
  };

  const handleCopy = () => {
    const fullText = `*${curiosity.title}* (${curiosity.category} - ${curiosity.area})\n\n"${curiosity.shortFact}"\n\n🔬 MECANISMO:\n${curiosity.detailedExplanation.mechanism}\n\n🏥 RELEVÂNCIA CLÍNICA:\n${curiosity.detailedExplanation.clinicalSignificance}\n\n⭐ REGRA DE OURO:\n${curiosity.detailedExplanation.goldenRule}\n\n💡 TAKEAWAY: ${curiosity.keyTakeaway}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("Conhecimento médico copiado com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (category: MedicalCuriosity["category"]) => {
    switch (category) {
      case "Farmacologia":
        return <Pill size={16} />;
      case "Curiosidade":
        return <Brain size={16} />;
      case "Emergência":
        return <Zap size={16} />;
      case "Semiologia":
        return <Stethoscope size={16} />;
      case "Fisiologia":
        return <Lightbulb size={16} />;
      case "Macete de Prova":
        return <BookOpen size={16} />;
      default:
        return <Sparkles size={16} />;
    }
  };

  if (!mounted) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] p-6 shadow-xs animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded-md mb-4" />
        <div className="h-14 w-full bg-gray-100 dark:bg-gray-800/60 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/90 dark:border-[#2a2d3a] bg-gradient-to-b from-white via-white to-gray-50/50 dark:from-[#1A1D27] dark:via-[#1A1D27] dark:to-[#131620] p-6 shadow-sm transition-all hover:shadow-md">
      {/* Glow de fundo sutil temático */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-xs">
            <Sparkles size={18} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Pílula Médica do Dia & Curiosidade
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/30">
                <Clock size={11} />
                Atualiza a cada 1h ({minutesRemaining}m restantes)
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Conhecimento de alto rendimento médico intercalado a cada hora
            </p>
          </div>
        </div>

        {/* Controles de Ação do Topo */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${curiosity.categoryColor.badge} ${curiosity.categoryColor.border}`}
          >
            {getCategoryIcon(curiosity.category)}
            <span>{curiosity.category}</span>
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            title="Copiar pílula de conhecimento"
          >
            {copied ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Copy size={15} />}
          </button>

          <button
            type="button"
            onClick={handleNextCuriosity}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-all cursor-pointer active:scale-95"
            title="Sortear outro conhecimento agora"
          >
            <RefreshCw size={13} className="text-gray-400 group-hover:rotate-180 transition-transform" />
            <span className="hidden sm:inline">Próxima ({currentIndex + 1}/{total})</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: A Frase Curta e Impactante */}
      <div className="relative pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {curiosity.area} • {curiosity.title}
          </span>
          <span className="sm:hidden text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock size={10} /> {minutesRemaining}m
          </span>
        </div>

        <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
          {curiosity.shortFact}
        </p>

        {/* Botão Saber Mais */}
        <div className="flex items-center pt-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs ${
              isExpanded
                ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md hover:scale-[1.02]"
            }`}
          >
            <Lightbulb size={14} className={isExpanded ? "text-amber-500" : "text-amber-300"} />
            <span>{isExpanded ? "Ocultar Explicação" : "Saber mais"}</span>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {/* Explicação Inteligente e Detalhada Logo Abaixo da Frase */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-[#2a2d3a] space-y-3.5 bg-gray-50/70 dark:bg-[#12141c]/60 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800/60">
                {/* 1. Mecanismo Fisiopatológico / Farmacológico */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Brain size={14} />
                    <span>Mecanismo & Porquê Científico</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-5">
                    {curiosity.detailedExplanation.mechanism}
                  </p>
                </div>

                {/* 2. Relevância Prática e Conduta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Stethoscope size={14} />
                    <span>Aplicação Prática no Plantão & Conduta</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-5">
                    {curiosity.detailedExplanation.clinicalSignificance}
                  </p>
                </div>

                {/* 3. Regra de Ouro / Mnemônico de Prova */}
                <div className="space-y-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={14} />
                    <span>Regra de Ouro & Macete de Prova</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed mt-0.5">
                    {curiosity.detailedExplanation.goldenRule}
                  </p>
                </div>

                {/* 4. Conclusão Chave */}
                <div className="flex items-center gap-2 pt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>
                    <strong>Conclusão rápida:</strong> {curiosity.keyTakeaway}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
